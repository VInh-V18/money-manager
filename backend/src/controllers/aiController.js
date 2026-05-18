import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import {
  analyzeThisMonth,
  askFinancialAssistant,
  classifyTransactionText,
  createAiReport,
  createTransactionFromNaturalText,
  getFinancialContext,
  getSpendingTotal,
  suggestSavings,
  weeklyDigest,
  detectAnomalies,
  listChatSessions,
  getChatSession,
  deleteChatSession,
} from "../services/aiService.js";

export const chat = asyncHandler(async (req, res) => {
  const { message, mode, sessionId } = req.body;
  const data = await askFinancialAssistant(req.user.id, { message, mode, sessionId });
  return ok(res, data);
});

// ===== Chat Sessions =====
export const listSessions = asyncHandler(async (req, res) => {
  const data = await listChatSessions(req.user.id, req.query);
  return ok(res, data);
});

export const getSession = asyncHandler(async (req, res) => {
  const data = await getChatSession(req.user.id, Number(req.params.id));
  return ok(res, data);
});

export const deleteSession = asyncHandler(async (req, res) => {
  const data = await deleteChatSession(req.user.id, Number(req.params.id));
  return ok(res, data, "Đã xóa phiên chat");
});

export const context = asyncHandler(async (req, res) => {
  const data = await getFinancialContext(req.user.id);
  return ok(res, data);
});

export const classify = asyncHandler(async (req, res) => {
  const data = await classifyTransactionText(req.user.id, req.body.text, req.body.type);
  return ok(res, data);
});

export const naturalTransaction = asyncHandler(async (req, res) => {
  const data = await createTransactionFromNaturalText(req.user.id, req.body.text);
  return ok(res, data, "Đã tạo giao dịch từ chatbot AI");
});

export const spendingTotal = asyncHandler(async (req, res) => {
  const data = await getSpendingTotal(req.user.id, req.query);
  return ok(res, data);
});

export const monthlyAnalysis = asyncHandler(async (req, res) => {
  const data = await analyzeThisMonth(req.user.id);
  return ok(res, data);
});

export const savings = asyncHandler(async (req, res) => {
  const data = await suggestSavings(req.user.id);
  return ok(res, data);
});

export const report = asyncHandler(async (req, res) => {
  const data = await createAiReport(req.user.id);
  return ok(res, data);
});

export const weekly = asyncHandler(async (req, res) => {
  const data = await weeklyDigest(req.user.id);
  return ok(res, data);
});

export const anomaly = asyncHandler(async (req, res) => {
  const data = await detectAnomalies(req.user.id);
  return ok(res, data);
});
