import { Op, fn, col, literal } from "sequelize";
import env from "../config/env.js";
import {
  Wallet,
  Category,
  Transaction,
  FinancialGoal,
  Debt,
  FixedExpense,
  sequelize,
} from "../models/index.js";
import { AppError } from "../utils/errors.js";
import { formatDate, addDays, today, startOfMonth, endOfMonth } from "../utils/date.js";
import { calculateBudgetsSummary } from "./budgetService.js";
import { createTransactionWithBalance } from "./transactionService.js";

const toNumber = (value) => Number(value || 0);
const money = (value) => Math.round(toNumber(value));
const percent = (part, total) => {
  const n = toNumber(total);
  if (!n) return 0;
  return Math.round((toNumber(part) / n) * 100);
};

const daysUntil = (date) => {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const current = today();
  current.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
};

const summarizeByCategory = async (userId, fromDate, toDate) => {
  const rows = await Transaction.findAll({
    attributes: [
      "type",
      [col("Category.name"), "categoryName"],
      [fn("SUM", col("Transaction.amount")), "total"],
      [fn("COUNT", col("Transaction.id")), "count"],
    ],
    include: [{ model: Category, attributes: [] }],
    where: {
      userId,
      transactionDate: { [Op.between]: [fromDate, toDate] },
    },
    group: ["Transaction.type", "Category.id", "Category.name"],
    order: [[literal("total"), "DESC"]],
    raw: true,
    limit: 12,
  });

  return rows.map((row) => ({
    type: row.type,
    category: row.categoryName || "Không có danh mục",
    total: money(row.total),
    count: Number(row.count || 0),
  }));
};

const summarizeCashflow = async (userId, fromDate, toDate) => {
  const rows = await Transaction.findAll({
    attributes: ["type", [fn("SUM", col("amount")), "total"], [fn("COUNT", col("id")), "count"]],
    where: {
      userId,
      transactionDate: { [Op.between]: [fromDate, toDate] },
    },
    group: ["type"],
    raw: true,
  });

  const result = { income: 0, expense: 0, transactionCount: 0 };
  rows.forEach((row) => {
    result[row.type] = money(row.total);
    result.transactionCount += Number(row.count || 0);
  });
  result.net = result.income - result.expense;
  return result;
};

export const getFinancialContext = async (userId) => {
  const end = formatDate(today());
  const start30 = formatDate(addDays(today(), -29));
  const start90 = formatDate(addDays(today(), -89));

  const [wallets, categories, budgets, goals, debts, fixedExpenses, recentTransactions] =
    await Promise.all([
      Wallet.findAll({
        where: { userId },
        attributes: ["id", "name", "type", "balance", "currency", "isActive", "excludeFromTotal"],
        order: [["balance", "DESC"]],
        raw: true,
      }),
      Category.findAll({
        where: { userId },
        attributes: ["id", "name", "type", "parentId"],
        raw: true,
      }),
      calculateBudgetsSummary(userId),
      FinancialGoal.findAll({
        where: { userId },
        attributes: ["id", "name", "targetAmount", "currentAmount", "targetDate", "status"],
        raw: true,
      }),
      Debt.findAll({
        where: { userId },
        attributes: ["id", "personName", "type", "amount", "paidAmount", "dueDate", "status"],
        raw: true,
      }),
      FixedExpense.findAll({
        where: { userId },
        attributes: ["id", "name", "amount", "frequency", "nextDueDate", "isActive"],
        raw: true,
      }),
      Transaction.findAll({
        where: { userId },
        include: [
          { model: Category, attributes: ["name", "type"] },
          { model: Wallet, attributes: ["name"] },
        ],
        attributes: ["id", "type", "amount", "description", "transactionDate", "transactionTime"],
        order: [["transactionDate", "DESC"], ["createdAt", "DESC"]],
        limit: 30,
      }),
    ]);

  const [cashflow30, cashflow90, categoryBreakdown30] = await Promise.all([
    summarizeCashflow(userId, start30, end),
    summarizeCashflow(userId, start90, end),
    summarizeByCategory(userId, start30, end),
  ]);

  const normalizedWallets = wallets.map((wallet) => ({
    ...wallet,
    balance: money(wallet.balance),
  }));

  const totalBalance = normalizedWallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const activeWallets = normalizedWallets.filter((wallet) => wallet.isActive !== false);
  const spend30 = cashflow30.expense;
  const avgDailySpend30 = spend30 ? Math.round(spend30 / 30) : 0;
  const runwayDays = avgDailySpend30 ? Math.floor(totalBalance / avgDailySpend30) : null;
  const monthlyFixedExpenseEstimate = fixedExpenses.reduce((sum, item) => {
    const amount = money(item.amount);
    if (item.isActive === false) return sum;
    if (item.frequency === "weekly") return sum + amount * 4;
    if (item.frequency === "yearly") return sum + Math.round(amount / 12);
    if (item.frequency === "daily") return sum + amount * 30;
    return sum + amount;
  }, 0);

  const budgetRisks = budgets
    .filter((budget) => budget.isExceeded || budget.isWarning || Number(budget.usedPercent || 0) >= 75)
    .slice(0, 6)
    .map((budget) => ({
      id: budget.id,
      name: budget.name,
      usedPercent: Number(budget.usedPercent || 0),
      remaining: money(budget.remaining),
      spent: money(budget.spent),
      amount: money(budget.amount),
      status: budget.isExceeded ? "exceeded" : budget.isWarning ? "warning" : "watch",
    }));

  const debtRisks = debts
    .map((debt) => ({
      id: debt.id,
      personName: debt.personName,
      type: debt.type,
      remaining: money(debt.amount) - money(debt.paidAmount),
      dueDate: debt.dueDate,
      daysUntilDue: daysUntil(debt.dueDate),
      status: debt.status,
    }))
    .filter((debt) => debt.remaining > 0)
    .sort((a, b) => (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999))
    .slice(0, 6);

  const topExpenseCategories30 = categoryBreakdown30
    .filter((item) => item.type === "expense")
    .slice(0, 5)
    .map((item) => ({ ...item, shareOfExpense: percent(item.total, spend30) }));

  return {
    generatedAt: new Date().toISOString(),
    range: { last30Days: { from: start30, to: end }, last90Days: { from: start90, to: end } },
    totals: {
      totalBalance,
      cashflow30,
      cashflow90,
      savingRate30: percent(cashflow30.net, cashflow30.income),
      avgDailySpend30,
      runwayDays,
      monthlyFixedExpenseEstimate,
      activeWalletCount: activeWallets.length,
    },
    wallets: normalizedWallets,
    categories,
    budgets: budgets.map((budget) => ({
      id: budget.id,
      name: budget.name,
      period: budget.period,
      category: budget.Category?.name || null,
      amount: money(budget.amount),
      spent: money(budget.spent),
      remaining: money(budget.remaining),
      usedPercent: Number(budget.usedPercent || 0),
      isExceeded: Boolean(budget.isExceeded),
      isWarning: Boolean(budget.isWarning),
      periodFrom: budget.periodFrom,
      periodTo: budget.periodTo,
    })),
    goals: goals.map((goal) => ({
      ...goal,
      targetAmount: money(goal.targetAmount),
      currentAmount: money(goal.currentAmount),
      remaining: money(goal.targetAmount) - money(goal.currentAmount),
    })),
    debts: debts.map((debt) => ({
      ...debt,
      amount: money(debt.amount),
      paidAmount: money(debt.paidAmount),
      remaining: money(debt.amount) - money(debt.paidAmount),
    })),
    fixedExpenses: fixedExpenses.map((item) => ({ ...item, amount: money(item.amount) })),
    categoryBreakdown30,
    aiSignals: {
      topExpenseCategories30,
      budgetRisks,
      debtRisks,
      negativeWallets: activeWallets.filter((wallet) => wallet.balance < 0),
      lowBalanceWallets: activeWallets
        .filter((wallet) => wallet.balance >= 0 && wallet.balance < avgDailySpend30 * 3)
        .slice(0, 5),
    },
    recentTransactions: recentTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: money(tx.amount),
      description: tx.description,
      date: tx.transactionDate,
      time: tx.transactionTime,
      category: tx.Category?.name || null,
      wallet: tx.Wallet?.name || null,
    })),
  };
};

const modePrompts = {
  advisor: "Tư vấn tổng thể: phân tích sức khỏe tài chính, hành vi chi tiêu, ưu tiên hành động.",
  forecast: "Dự báo: ước lượng cuối tháng/quý dựa trên dòng tiền hiện có và nêu giả định.",
  risk: "Kiểm tra rủi ro: tìm khoản bất thường, ngân sách vượt mức, nợ đến hạn, ví âm hoặc dòng tiền xấu.",
  budget: "Lập kế hoạch: đề xuất ngân sách, mục tiêu tiết kiệm và hành động theo tuần.",
  transaction_parser:
    "Nếu người dùng mô tả giao dịch bằng ngôn ngữ tự nhiên, hãy trích xuất type, amount, category, wallet, date, description và nêu chỗ còn thiếu.",
};

const buildPrompt = ({ context, message, mode }) => `
Bạn là AI tài chính cá nhân trong ứng dụng Money Manager.

Quy tắc:
- Chỉ dùng dữ liệu JSON được cung cấp, không bịa số liệu.
- Trả lời bằng tiếng Việt, rõ ràng, thực dụng.
- Không đưa lời khuyên đầu tư rủi ro cao. Nếu nói về đầu tư, chỉ nói ở mức nguyên tắc quản lý tiền.
- Nếu thiếu dữ liệu, nói rõ cần thêm dữ liệu nào.
- Ưu tiên con số cụ thể, mốc thời gian cụ thể và hành động cụ thể.

Chế độ: ${modePrompts[mode] || modePrompts.advisor}

Định dạng trả lời:
1. Tóm tắt 3-5 gạch đầu dòng.
2. Phân tích chi tiết theo dữ liệu.
3. Cảnh báo/rủi ro nếu có.
4. Kế hoạch hành động 7 ngày tới.

Dữ liệu tài chính của user:
${JSON.stringify(context)}

Câu hỏi của user:
${message}
`;

const extractGeminiText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text).filter(Boolean).join("\n").trim();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getGeminiModels = () => [
  ...new Set([env.GEMINI_MODEL, ...(env.GEMINI_FALLBACK_MODELS || [])].filter(Boolean)),
];

const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const parseMoneyFromText = (text) => {
  const normalized = normalizeText(text).replace(/,/g, ".").replace(/\s+/g, " ");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(trieu|tr|m|k|nghin|ngan|dong|vnd)?/);
  if (!match) return 0;
  const raw = Number(match[1]);
  if (!raw) return 0;
  const unit = match[2] || "";
  if (["trieu", "tr", "m"].includes(unit)) return Math.round(raw * 1_000_000);
  if (["k", "nghin", "ngan"].includes(unit)) return Math.round(raw * 1_000);
  return Math.round(raw);
};

const resolveNaturalDate = (text) => {
  const normalized = normalizeText(text);
  if (normalized.includes("hom qua")) return formatDate(addDays(today(), -1));
  if (normalized.includes("ngay mai")) return formatDate(addDays(today(), 1));
  const dateMatch = normalized.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const year = dateMatch[3]
      ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3])
      : today().getFullYear();
    return formatDate(new Date(year, month - 1, day));
  }
  return formatDate(today());
};

const inferType = (text) => {
  const normalized = normalizeText(text);
  const incomeWords = ["luong", "thu nhap", "nhan", "duoc tra", "thu tien", "bonus", "thuong"];
  return incomeWords.some((word) => normalized.includes(word)) ? "income" : "expense";
};

const classifyByKeywords = (text, categories) => {
  const normalized = normalizeText(text);
  const dictionary = [
    { keys: ["an", "com", "bun", "pho", "cafe", "tra sua", "nha hang"], names: ["an", "food", "uong"] },
    { keys: ["xang", "grab", "taxi", "xe", "bus"], names: ["di lai", "xang", "xe", "transport"] },
    { keys: ["dien", "nuoc", "mang", "internet", "wifi", "nha"], names: ["hoa don", "nha", "bill"] },
    { keys: ["luong", "salary"], names: ["luong", "salary"] },
    { keys: ["thuong", "bonus"], names: ["thuong", "bonus"] },
    { keys: ["mua", "shopee", "quan ao", "do"], names: ["mua", "shopping"] },
    { keys: ["hoc", "khoa hoc", "sach"], names: ["hoc", "giao duc", "education"] },
  ];

  for (const group of dictionary) {
    if (!group.keys.some((key) => normalized.includes(key))) continue;
    const found = categories.find((category) => {
      const name = normalizeText(category.name);
      return group.names.some((key) => name.includes(key));
    });
    if (found) return found;
  }

  return (
    categories.find((category) => normalized.includes(normalizeText(category.name))) ||
    categories[0] ||
    null
  );
};

export const classifyTransactionText = async (userId, text, type = inferType(text)) => {
  const categories = await Category.findAll({
    where: { userId, type },
    attributes: ["id", "name", "type", "icon", "color"],
    order: [["sortOrder", "ASC"], ["name", "ASC"]],
    raw: true,
  });
  const category = classifyByKeywords(text, categories);
  return {
    type,
    category,
    confidence: category ? 0.78 : 0.2,
    reason: category
      ? `Phân loại theo từ khóa và tên danh mục gần nhất: ${category.name}`
      : "Chưa có danh mục phù hợp để phân loại.",
  };
};

export const createTransactionFromNaturalText = async (userId, text) => {
  const amount = parseMoneyFromText(text);
  if (!amount) throw new AppError("Chưa nhận diện được số tiền trong câu nhập giao dịch", 400);

  const type = inferType(text);
  const transactionDate = resolveNaturalDate(text);
  const [wallets, classification] = await Promise.all([
    Wallet.findAll({
      where: { userId, isActive: true },
      attributes: ["id", "name", "type", "balance"],
      order: [["id", "ASC"]],
      raw: true,
    }),
    classifyTransactionText(userId, text, type),
  ]);

  const normalized = normalizeText(text);
  const wallet =
    wallets.find((item) => normalized.includes(normalizeText(item.name))) ||
    wallets[0];
  if (!wallet) throw new AppError("Bạn cần tạo ít nhất một ví trước khi nhập giao dịch", 400);

  const tx = await sequelize.transaction((dbTx) =>
    createTransactionWithBalance(
      userId,
      {
        walletId: wallet.id,
        categoryId: classification.category?.id || null,
        type,
        amount,
        description: text,
        note: "Tạo từ chatbot AI",
        transactionDate,
        metadata: {
          source: "ai_chatbot",
          classificationConfidence: classification.confidence,
        },
      },
      dbTx,
      { allowNegative: true }
    )
  );

  const full = await Transaction.findByPk(tx.id, {
    include: [
      { model: Wallet, attributes: ["id", "name", "icon", "color", "type"] },
      { model: Category, attributes: ["id", "name", "icon", "color", "type"] },
    ],
  });

  return {
    transaction: full,
    parsed: {
      amount,
      type,
      transactionDate,
      wallet,
      category: classification.category,
      confidence: classification.confidence,
    },
  };
};

export const getSpendingTotal = async (userId, { fromDate, toDate } = {}) => {
  const from = fromDate || formatDate(startOfMonth());
  const to = toDate || formatDate(endOfMonth());
  const rows = await Transaction.findAll({
    attributes: [
      [fn("SUM", col("amount")), "total"],
      [fn("COUNT", col("id")), "count"],
    ],
    where: {
      userId,
      type: "expense",
      transactionDate: { [Op.between]: [from, to] },
    },
    raw: true,
  });
  return {
    fromDate: from,
    toDate: to,
    total: money(rows[0]?.total),
    count: Number(rows[0]?.count || 0),
  };
};

export const analyzeThisMonth = async (userId) =>
  askFinancialAssistant(userId, {
    mode: "advisor",
    message:
      "Phân tích tháng này thật cụ thể: tổng thu, tổng chi, dòng tiền ròng, danh mục chi nhiều nhất, rủi ro và 5 hành động nên làm.",
  });

export const suggestSavings = async (userId) =>
  askFinancialAssistant(userId, {
    mode: "budget",
    message:
      "Hãy gợi ý cách tiết kiệm thực tế dựa trên dữ liệu của tôi. Ưu tiên khoản có thể cắt giảm ngay trong 7 ngày tới.",
  });

export const createAiReport = async (userId) =>
  askFinancialAssistant(userId, {
    mode: "advisor",
    message:
      "Tạo báo cáo tài chính AI cho tháng này gồm: tóm tắt điều hành, thu/chi, danh mục chi chính, ngân sách, nợ, mục tiêu, rủi ro và kế hoạch hành động.",
  });

const smartModePrompts = {
  advisor:
    "Cố vấn tổng thể: đánh giá sức khỏe tài chính, ưu tiên hành động và giải thích trade-off.",
  forecast:
    "Dự báo: ước lượng dòng tiền cuối tháng/quý dựa trên dữ liệu hiện có, luôn nêu giả định.",
  risk:
    "Kiểm tra rủi ro: tìm ví âm, ngân sách vượt mức, nợ đến hạn, dòng tiền xấu và chi tiêu bất thường.",
  budget:
    "Lập kế hoạch: đề xuất ngân sách, mức chi mỗi ngày, mục tiêu tiết kiệm và việc cần làm trong tuần.",
  transaction_parser:
    "Tách giao dịch: trích xuất type, amount, category, wallet, date, description; nêu rõ trường còn thiếu.",
};

const buildConversationContext = (history = []) =>
  history
    .slice(-8)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n");

const buildSmartPrompt = ({ context, message, mode, history }) => `
Bạn là chatbot AI tài chính cá nhân cao cấp trong Money Manager. Bạn vừa là chuyên gia phân tích dữ liệu, vừa là cố vấn hành động hằng ngày.

Nguyên tắc bắt buộc:
- Chỉ dựa vào JSON tài chính và lịch sử hội thoại bên dưới; không bịa số liệu.
- Trả lời bằng tiếng Việt tự nhiên, ngắn gọn nhưng đủ chi tiết để người dùng làm theo ngay.
- Luôn ưu tiên: dòng tiền, khả năng thanh toán, nợ, ngân sách, chi tiêu lớn, mục tiêu tiết kiệm.
- Nếu dữ liệu ít hoặc thiếu, nói rõ độ tin cậy thấp và cần thêm dữ liệu nào.
- Không đưa lời khuyên đầu tư rủi ro cao, không cam kết lợi nhuận. Chỉ nêu nguyên tắc quản lý tiền.
- Nếu câu hỏi là follow-up như "vậy làm sao", "chi tiết hơn", hãy dùng lịch sử hội thoại để hiểu ngữ cảnh.
- Khi có thể, hãy đưa con số cụ thể: VND, %, số ngày, khoản mục, ví, danh mục.

Chế độ hiện tại: ${smartModePrompts[mode] || smartModePrompts.advisor}

Cách trả lời thông minh:
1. Nếu người dùng hỏi nhanh: trả lời trực tiếp trước, sau đó mới phân tích.
2. Nếu có rủi ro: đặt phần "Cần chú ý" lên gần đầu.
3. Nếu lập kế hoạch: đưa checklist 3-7 việc làm được ngay.
4. Nếu tách giao dịch: trả JSON dễ đọc và giải thích các trường còn thiếu.
5. Kết thúc bằng 1 câu hỏi tiếp theo phù hợp để tiếp tục hội thoại.

Lịch sử hội thoại gần nhất:
${buildConversationContext(history) || "Chưa có lịch sử."}

Dữ liệu tài chính dạng JSON:
${JSON.stringify(context)}

Câu hỏi hiện tại:
${message}
`;

export const askFinancialAssistant = async (userId, { message, mode = "advisor", history = [] }) => {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("Chưa cấu hình GEMINI_API_KEY trong backend/.env", 500);
  }

  const context = await getFinancialContext(userId);
  const prompt = buildSmartPrompt({ context, message, mode, history });

  let smartPayload = null;
  let usedModel = env.GEMINI_MODEL;
  let lastError = null;

  for (const model of getGeminiModels()) {
    usedModel = model;
    const smartUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const smartResponse = await fetch(smartUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: mode === "transaction_parser" ? 0.15 : 0.28,
            topP: 0.85,
            maxOutputTokens: 2200,
          },
        }),
      });

      smartPayload = await smartResponse.json().catch(() => ({}));
      if (smartResponse.ok) {
        lastError = null;
        break;
      }

      const messageFromApi =
        smartPayload?.error?.message || "Gemini API không phản hồi thành công";
      lastError = new AppError(messageFromApi, smartResponse.status);

      if (![429, 500, 502, 503, 504].includes(smartResponse.status)) break;
      await sleep(700 * (attempt + 1));
    }

    if (!lastError) break;
    if (![429, 500, 502, 503, 504].includes(lastError.statusCode)) break;
  }

  if (lastError) throw lastError;

  const smartAnswer = extractGeminiText(smartPayload);
  if (!smartAnswer) {
    throw new AppError("Gemini không trả về nội dung phân tích", 502);
  }

  return {
    answer: smartAnswer,
    mode,
    model: usedModel,
    usage: smartPayload.usageMetadata || null,
    contextSnapshot: {
      generatedAt: context.generatedAt,
      totalBalance: context.totals.totalBalance,
      last30Days: context.totals.cashflow30,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: mode === "transaction_parser" ? 0.15 : 0.28,
        topP: 0.85,
        maxOutputTokens: 2200,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const messageFromApi = payload?.error?.message || "Gemini API không phản hồi thành công";
    throw new AppError(messageFromApi, response.status);
  }

  const answer = extractGeminiText(payload);
  if (!answer) {
    throw new AppError("Gemini không trả về nội dung phân tích", 502);
  }

  return {
    answer,
    mode,
    model: env.GEMINI_MODEL,
    usage: payload.usageMetadata || null,
    contextSnapshot: {
      generatedAt: context.generatedAt,
      totalBalance: context.totals.totalBalance,
      last30Days: context.totals.cashflow30,
    },
  };
};
