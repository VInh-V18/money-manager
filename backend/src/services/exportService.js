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
  sequelize,
} from "../models/index.js";
import { badRequest } from "../utils/errors.js";
import { getReportByRange } from "./reportService.js";
import { createTransactionWithBalance } from "./transactionService.js";

const formatVND = (n) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0)) + " d";

const csvEscape = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const parseCsvLine = (line) => {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const parseCsv = (text) => {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    return headers.reduce(
      (row, header, col) => {
        row[header] = cells[col] ?? "";
        return row;
      },
      { __line: index + 2 }
    );
  });
};

const parseTransactionType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["income", "thu", "thu nhap", "thu nhập"].includes(normalized)) return "income";
  if (["expense", "chi", "chi tieu", "chi tiêu"].includes(normalized)) return "expense";
  return null;
};

const parseAmount = (value) => {
  const raw = String(value || "").replace(/[^\d,.-]/g, "");
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

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

export const exportTransactionsToCsv = async (userId, fromDate, toDate) => {
  const txs = await Transaction.findAll({
    where: {
      userId,
      transactionDate: { [Op.between]: [fromDate, toDate] },
    },
    include: [
      { model: Wallet, attributes: ["id", "name"] },
      { model: Category, attributes: ["id", "name", "type"] },
    ],
    order: [
      ["transactionDate", "DESC"],
      ["id", "DESC"],
    ],
  });

  const headers = [
    "transactionDate",
    "transactionTime",
    "type",
    "amount",
    "wallet",
    "category",
    "description",
    "note",
    "tags",
  ];
  const rows = txs.map((tx) => [
    tx.transactionDate,
    tx.transactionTime || "",
    tx.type,
    Number(tx.amount),
    tx.Wallet?.name || "",
    tx.Category?.name || "",
    tx.description || "",
    tx.note || "",
    Array.isArray(tx.metadata?.tags) ? tx.metadata.tags.join(";") : "",
  ]);
  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");
};

export const importTransactionsFromCsv = async (userId, text) => {
  const rows = parseCsv(text);
  if (rows.length === 0) throw badRequest("File CSV khong co du lieu");
  if (rows.length > 1000) throw badRequest("Chi duoc import toi da 1000 dong moi lan");

  const [wallets, categories] = await Promise.all([
    Wallet.findAll({ where: { userId, isActive: true } }),
    Category.findAll({ where: { userId } }),
  ]);
  const walletByName = new Map(wallets.map((w) => [String(w.name).toLowerCase(), w]));
  const categoryByName = new Map(categories.map((c) => [`${c.type}:${String(c.name).toLowerCase()}`, c]));

  const errors = [];
  let imported = 0;

  for (const row of rows) {
    const type = parseTransactionType(row.type || row.loai);
    const amount = parseAmount(row.amount || row["so tien"] || row["số tiền"]);
    const transactionDate = row.transactiondate || row.date || row.ngay || row["ngày"];
    const walletName = row.wallet || row.vi || row["ví"];
    const categoryName = row.category || row["danh muc"] || row["danh mục"];
    const tags = String(row.tags || row.tag || "")
      .split(/[;,]/)
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
    const wallet = walletByName.get(String(walletName || "").trim().toLowerCase());
    const category = categoryName
      ? categoryByName.get(`${type}:${String(categoryName).trim().toLowerCase()}`)
      : null;

    if (!type || !amount || !transactionDate || !wallet) {
      errors.push({
        line: row.__line,
        reason: "Thieu type/amount/date/wallet hoac gia tri khong hop le",
      });
      continue;
    }
    if (categoryName && !category) {
      errors.push({ line: row.__line, reason: "Danh muc khong ton tai hoac sai loai" });
      continue;
    }

    try {
      await sequelize.transaction((dbTx) =>
        createTransactionWithBalance(
          userId,
          {
            walletId: wallet.id,
            categoryId: category?.id || null,
            type,
            subType: "regular",
            amount,
            description: row.description || row["mo ta"] || row["mô tả"] || "",
            note: row.note || row["ghi chu"] || row["ghi chú"] || "",
            transactionDate,
            transactionTime: row.transactiontime || row.time || null,
            metadata: tags.length ? { tags } : null,
          },
          dbTx,
          { allowNegative: true }
        )
      );
      imported++;
    } catch (err) {
      errors.push({ line: row.__line, reason: err.message || "Khong import duoc" });
    }
  }

  return { imported, failed: errors.length, errors: errors.slice(0, 50) };
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

const pickFields = (source, fields, extra = {}) => {
  const output = { ...extra };
  for (const field of fields) {
    if (source?.[field] !== undefined) output[field] = source[field];
  }
  return output;
};

const WALLET_FIELDS = [
  "name",
  "type",
  "balance",
  "initialBalance",
  "currency",
  "color",
  "icon",
  "note",
  "isActive",
  "excludeFromTotal",
];
const CATEGORY_FIELDS = ["name", "type", "icon", "color", "monthlyBudget", "note", "isSystem", "sortOrder"];
const TRANSACTION_FIELDS = [
  "type",
  "subType",
  "amount",
  "description",
  "note",
  "transactionDate",
  "transactionTime",
  "receiptUrl",
  "metadata",
];
const BUDGET_FIELDS = [
  "name",
  "amount",
  "period",
  "startDate",
  "endDate",
  "warnThreshold",
  "strictMode",
  "isActive",
  "note",
];
const GOAL_FIELDS = [
  "name",
  "targetAmount",
  "currentAmount",
  "targetDate",
  "startDate",
  "icon",
  "color",
  "status",
  "note",
];
const DEBT_FIELDS = [
  "type",
  "personName",
  "personPhone",
  "amount",
  "paidAmount",
  "borrowedDate",
  "dueDate",
  "status",
  "note",
];
const FIXED_EXPENSE_FIELDS = [
  "name",
  "amount",
  "frequency",
  "customIntervalDays",
  "dayOfMonth",
  "dayOfWeek",
  "startDate",
  "endDate",
  "nextDueDate",
  "lastGeneratedDate",
  "autoDeduct",
  "remindDaysBefore",
  "isActive",
  "note",
];
const TEMPLATE_FIELDS = [
  "name",
  "defaultAmount",
  "type",
  "icon",
  "color",
  "defaultNote",
  "isPinned",
  "sortOrder",
  "usageCount",
];

export const restoreUserBackupJson = async (userId, backup) => {
  if (!backup || backup.app !== "money-manager" || !backup.data) {
    throw badRequest("File backup không hợp lệ");
  }

  const data = backup.data;
  const sourceWallets = Array.isArray(data.wallets) ? data.wallets : [];
  const sourceCategories = Array.isArray(data.categories) ? data.categories : [];
  const sourceTransactions = Array.isArray(data.transactions) ? data.transactions : [];
  const sourceBudgets = Array.isArray(data.budgets) ? data.budgets : [];
  const sourceGoals = Array.isArray(data.goals) ? data.goals : [];
  const sourceDebts = Array.isArray(data.debts) ? data.debts : [];
  const sourceFixedExpenses = Array.isArray(data.fixedExpenses) ? data.fixedExpenses : [];
  const sourceTemplates = Array.isArray(data.templates) ? data.templates : [];

  return sequelize.transaction(async (dbTx) => {
    const walletIdMap = new Map();
    const categoryIdMap = new Map();

    for (const wallet of sourceWallets) {
      const created = await Wallet.create(
        pickFields(wallet, WALLET_FIELDS, { userId }),
        { transaction: dbTx }
      );
      walletIdMap.set(Number(wallet.id), created.id);
    }

    const pendingCategoryParents = [];
    for (const category of sourceCategories) {
      const created = await Category.create(
        pickFields(category, CATEGORY_FIELDS, { userId, parentId: null }),
        { transaction: dbTx }
      );
      categoryIdMap.set(Number(category.id), created.id);
      if (category.parentId) {
        pendingCategoryParents.push({ created, oldParentId: Number(category.parentId) });
      }
    }
    for (const item of pendingCategoryParents) {
      const mappedParentId = categoryIdMap.get(item.oldParentId);
      if (mappedParentId) {
        await item.created.update({ parentId: mappedParentId }, { transaction: dbTx });
      }
    }

    let transactions = 0;
    for (const tx of sourceTransactions) {
      const walletId = walletIdMap.get(Number(tx.walletId));
      if (!walletId) continue;
      await Transaction.create(
        pickFields(tx, TRANSACTION_FIELDS, {
          userId,
          walletId,
          categoryId: tx.categoryId ? categoryIdMap.get(Number(tx.categoryId)) || null : null,
        }),
        { transaction: dbTx }
      );
      transactions++;
    }

    let budgets = 0;
    for (const budget of sourceBudgets) {
      await Budget.create(
        pickFields(budget, BUDGET_FIELDS, {
          userId,
          categoryId: budget.categoryId ? categoryIdMap.get(Number(budget.categoryId)) || null : null,
        }),
        { transaction: dbTx }
      );
      budgets++;
    }

    let goals = 0;
    for (const goal of sourceGoals) {
      await FinancialGoal.create(
        pickFields(goal, GOAL_FIELDS, {
          userId,
          walletId: goal.walletId ? walletIdMap.get(Number(goal.walletId)) || null : null,
        }),
        { transaction: dbTx }
      );
      goals++;
    }

    let debts = 0;
    for (const debt of sourceDebts) {
      await Debt.create(
        pickFields(debt, DEBT_FIELDS, {
          userId,
          walletId: debt.walletId ? walletIdMap.get(Number(debt.walletId)) || null : null,
        }),
        { transaction: dbTx }
      );
      debts++;
    }

    let fixedExpenses = 0;
    for (const fixedExpense of sourceFixedExpenses) {
      const walletId = fixedExpense.walletId ? walletIdMap.get(Number(fixedExpense.walletId)) || null : null;
      if (!walletId) continue;
      await FixedExpense.create(
        pickFields(fixedExpense, FIXED_EXPENSE_FIELDS, {
          userId,
          walletId,
          categoryId: fixedExpense.categoryId
            ? categoryIdMap.get(Number(fixedExpense.categoryId)) || null
            : null,
        }),
        { transaction: dbTx }
      );
      fixedExpenses++;
    }

    let templates = 0;
    for (const template of sourceTemplates) {
      await ExpenseTemplate.create(
        pickFields(template, TEMPLATE_FIELDS, {
          userId,
          walletId: template.walletId ? walletIdMap.get(Number(template.walletId)) || null : null,
          categoryId: template.categoryId ? categoryIdMap.get(Number(template.categoryId)) || null : null,
        }),
        { transaction: dbTx }
      );
      templates++;
    }

    return {
      wallets: walletIdMap.size,
      categories: categoryIdMap.size,
      transactions,
      budgets,
      goals,
      debts,
      fixedExpenses,
      templates,
    };
  });
};
