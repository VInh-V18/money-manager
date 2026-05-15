import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Op } from "sequelize";
import {
  Transaction,
  Wallet,
  Category,
  Budget,
  FinancialGoal,
  Debt,
  FixedExpense,
  ExpenseTemplate,
  WalletTransfer,
  Notification,
  ActivityLog,
  LoginHistory,
  WalletBalanceHistory,
} from "../models/index.js";
import { getReportByRange } from "./reportService.js";

const formatVND = (n) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0)) + " d";

/**
 * Xuat Excel: 1 sheet danh sach giao dich + 1 sheet tong hop
 */
export const exportTransactionsToExcel = async (userId, fromDate, toDate) => {
  const txs = await Transaction.findAll({
    where: {
      userId,
      transactionDate: { [Op.between]: [fromDate, toDate] },
    },
    include: [
      { model: Wallet, attributes: ["id", "name"] },
      { model: Category, attributes: ["id", "name", "type"] },
    ],
    order: [["transactionDate", "DESC"]],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Money Manager";
  wb.created = new Date();

  // ===== Sheet 1: Danh sach =====
  const ws = wb.addWorksheet("Giao dich");
  ws.columns = [
    { header: "Ngay", key: "date", width: 12 },
    { header: "Loai", key: "type", width: 10 },
    { header: "Mo ta", key: "desc", width: 40 },
    { header: "Danh muc", key: "category", width: 20 },
    { header: "Vi", key: "wallet", width: 20 },
    { header: "So tien", key: "amount", width: 18 },
    { header: "Ghi chu", key: "note", width: 30 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B82F6" },
  };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  txs.forEach((tx) => {
    ws.addRow({
      date: tx.transactionDate,
      type: tx.type === "income" ? "Thu" : "Chi",
      desc: tx.description || "",
      category: tx.Category?.name || "",
      wallet: tx.Wallet?.name || "",
      amount: Number(tx.amount),
      note: tx.note || "",
    });
  });

  ws.getColumn("amount").numFmt = '#,##0" d"';

  // ===== Sheet 2: Tong hop =====
  const sumSheet = wb.addWorksheet("Tong hop");
  const report = await getReportByRange(userId, fromDate, toDate);
  sumSheet.columns = [
    { header: "Chi tieu", key: "k", width: 30 },
    { header: "Gia tri", key: "v", width: 25 },
  ];
  sumSheet.getRow(1).font = { bold: true };
  sumSheet.addRows([
    { k: "Khoang thoi gian", v: `${fromDate} - ${toDate}` },
    { k: "Tong thu", v: report.summary.income },
    { k: "Tong chi", v: report.summary.expense },
    { k: "Con lai", v: report.summary.net },
    { k: "Ty le tiet kiem (%)", v: report.summary.savingRate },
    { k: "So GD thu", v: report.summary.incomeCount },
    { k: "So GD chi", v: report.summary.expenseCount },
  ]);

  return wb.xlsx.writeBuffer();
};

/**
 * Xuat PDF bao cao tom tat
 */
export const exportReportToPDF = async (userId, fromDate, toDate) => {
  const report = await getReportByRange(userId, fromDate, toDate);
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  // gom buffer cua stream
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // ===== Header =====
  doc.fontSize(20).text("BAO CAO TAI CHINH", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#666").text(`Tu ${fromDate} den ${toDate}`, { align: "center" });
  doc.moveDown(2);

  // ===== Tong quat =====
  doc.fillColor("black").fontSize(14).text("Tong quat", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  const lines = [
    ["Tong thu", formatVND(report.summary.income)],
    ["Tong chi", formatVND(report.summary.expense)],
    ["Con lai", formatVND(report.summary.net)],
    ["Ty le tiet kiem", `${report.summary.savingRate}%`],
    ["So giao dich thu", String(report.summary.incomeCount)],
    ["So giao dich chi", String(report.summary.expenseCount)],
  ];
  lines.forEach(([k, v]) => {
    doc.text(`${k}: `, { continued: true }).font("Helvetica-Bold").text(v).font("Helvetica");
  });

  doc.moveDown(1.5);

  // ===== Theo danh muc =====
  doc.fontSize(14).text("Chi tiet theo danh muc", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  const expenseCats = report.byCategory.filter((c) => c.type === "expense");
  if (expenseCats.length === 0) {
    doc.fillColor("#999").text("(Khong co du lieu)").fillColor("black");
  } else {
    expenseCats.forEach((c) => {
      const name = c.category?.name || "(khong)";
      doc.text(`- ${name}: `, { continued: true })
        .font("Helvetica-Bold")
        .text(formatVND(c.total))
        .font("Helvetica")
        .text(` (${c.count} GD)`, { continued: false });
    });
  }

  doc.moveDown(1.5);

  // ===== Top giao dich lon =====
  doc.fontSize(14).text("Top 5 khoan chi lon nhat", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  if (report.topTransactions.length === 0) {
    doc.fillColor("#999").text("(Khong co du lieu)").fillColor("black");
  } else {
    report.topTransactions.forEach((t, i) => {
      doc.text(`${i + 1}. ${t.description || "(khong mo ta)"}: `, { continued: true })
        .font("Helvetica-Bold")
        .text(formatVND(t.amount))
        .font("Helvetica")
        .text(` - ${t.transactionDate}`);
    });
  }

  doc.moveDown(2);
  doc.fontSize(9).fillColor("#999")
    .text(`Tao boi Money Manager | ${new Date().toLocaleString("vi-VN")}`, { align: "center" });

  doc.end();
  return done;
};

/**
 * Backup JSON du lieu ca nhan cua user. Khong bao gom password/token/OTP.
 */
export const exportUserBackupJson = async (user) => {
  const userId = user.id;
  const [
    wallets,
    categories,
    transactions,
    budgets,
    goals,
    debts,
    fixedExpenses,
    templates,
    walletTransfers,
    notifications,
    activityLogs,
    loginHistory,
    walletBalanceHistories,
  ] = await Promise.all([
    Wallet.findAll({ where: { userId }, paranoid: false, order: [["id", "ASC"]] }),
    Category.findAll({ where: { userId }, paranoid: false, order: [["id", "ASC"]] }),
    Transaction.findAll({ where: { userId }, paranoid: false, order: [["transactionDate", "DESC"], ["id", "DESC"]] }),
    Budget.findAll({ where: { userId }, paranoid: false, order: [["id", "ASC"]] }),
    FinancialGoal.findAll({ where: { userId }, paranoid: false, order: [["id", "ASC"]] }),
    Debt.findAll({ where: { userId }, paranoid: false, order: [["id", "ASC"]] }),
    FixedExpense.findAll({ where: { userId }, paranoid: false, order: [["id", "ASC"]] }),
    ExpenseTemplate.findAll({ where: { userId }, paranoid: false, order: [["id", "ASC"]] }),
    WalletTransfer.findAll({ where: { userId }, order: [["id", "ASC"]] }),
    Notification.findAll({ where: { userId }, order: [["id", "ASC"]] }),
    ActivityLog.findAll({ where: { userId }, order: [["id", "ASC"]] }),
    LoginHistory.findAll({ where: { userId }, order: [["id", "ASC"]] }),
    WalletBalanceHistory.findAll({ where: { userId }, order: [["id", "ASC"]] }),
  ]);

  const safeUser = user.toJSON();
  delete safeUser.hashedPassword;
  delete safeUser.failedLoginCount;
  delete safeUser.lockedUntil;

  return {
    version: 1,
    app: "money-manager",
    exportedAt: new Date().toISOString(),
    user: safeUser,
    data: {
      wallets,
      categories,
      transactions,
      budgets,
      goals,
      debts,
      fixedExpenses,
      templates,
      walletTransfers,
      notifications,
      activityLogs,
      loginHistory,
      walletBalanceHistories,
    },
  };
};
