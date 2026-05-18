import { memo, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  Bot,
  Brain,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  Clock,
  Copy,
  FileText,
  PiggyBank,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { aiService, type AiChatSession, type AiMode } from "@/services/aiService";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: AiMode;
  model?: string;
  timestamp?: Date;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Xin chào! Tôi là **AI Tài chính** của bạn, được hỗ trợ bởi **Gemini**.\n\nTôi có thể:\n- 📊 Phân tích dòng tiền, thu/chi, ngân sách\n- ⚠️ Phát hiện rủi ro và chi tiêu bất thường\n- 📅 Lập kế hoạch tiết kiệm và dự báo tài chính\n- 🧾 Tạo giao dịch từ câu nói tự nhiên\n- 📝 Tạo báo cáo tài chính AI\n\nHãy bắt đầu bằng cách chọn một phân tích nhanh hoặc đặt câu hỏi bất kỳ!",
  mode: "advisor",
  timestamp: new Date(),
};

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);

const isNaturalTransactionIntent = (text: string) =>
  /\d/.test(text) &&
  /(ăn|an|uống|uong|mua|trả|tra|chi|tiêu|tieu|xăng|xang|cafe|cà phê|luong|lương|thu|nhận|nhan|grab|taxi|shopee)/i.test(text);

const isTotalSpendingQuestion = (text: string) =>
  /(tổng|tong).*(chi|tiêu|tieu)|chi.*bao nhiêu|chi.*bao nhieu/i.test(text);

const ANALYSIS_CARDS = [
  { id: "report", label: "Báo cáo tháng", icon: FileText, color: "text-blue-500", serviceKey: "report" as const, desc: "Phân tích toàn diện thu/chi tháng này" },
  { id: "anomaly", label: "Chi tiêu bất thường", icon: AlertTriangle, color: "text-red-500", serviceKey: "anomaly" as const, desc: "Phát hiện giao dịch lạ và rủi ro" },
  { id: "monthlyAnalysis", label: "Dự báo tháng", icon: ChartNoAxesCombined, color: "text-purple-500", serviceKey: "monthlyAnalysis" as const, desc: "Ước tính dòng tiền cuối tháng" },
  { id: "savings", label: "Gợi ý tiết kiệm", icon: PiggyBank, color: "text-green-500", serviceKey: "savings" as const, desc: "Khoản có thể cắt giảm ngay" },
  { id: "weeklyDigest", label: "Tổng kết tuần", icon: CalendarDays, color: "text-orange-500", serviceKey: "weeklyDigest" as const, desc: "Top danh mục + việc cần làm" },
  { id: "risk", label: "Kiểm tra rủi ro", icon: ShieldAlert, color: "text-yellow-500", mode: "risk" as const, desc: "Ví âm, nợ đến hạn, ngân sách vượt" },
];

const QUICK_MODES: Array<{ id: AiMode; label: string; icon: typeof Brain }> = [
  { id: "advisor", label: "Cố vấn", icon: Brain },
  { id: "forecast", label: "Dự báo", icon: ChartNoAxesCombined },
  { id: "risk", label: "Rủi ro", icon: ShieldAlert },
  { id: "budget", label: "Kế hoạch", icon: PiggyBank },
  { id: "transaction_parser", label: "Tách GD", icon: Wand2 },
];

// Render markdown
const MarkdownContent = memo(function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 break-words">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <p className="mb-1 text-base font-bold text-foreground">{children}</p>,
        h2: ({ children }) => <p className="mb-1 text-sm font-semibold text-foreground">{children}</p>,
        h3: ({ children }) => <p className="mb-0.5 text-sm font-medium text-foreground">{children}</p>,
        code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground">{children}</blockquote>,
        hr: () => <hr className="my-3 border-border" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
});

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground transition-colors"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Đã sao chép" : "Sao chép"}
    </button>
  );
}

const MessageBubble = memo(function MessageBubble({ msg }: { msg: ChatMessage }) {
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
          <p className="text-sm leading-relaxed break-words">{msg.content}</p>
          {time && <p className="mt-1 text-right text-[10px] opacity-60">{time}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Bot className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm border bg-muted/30 px-4 py-3">
          <div className="text-sm leading-relaxed text-foreground/90">
            <MarkdownContent text={msg.content} />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <CopyBtn text={msg.content} />
          {msg.model && <span className="text-[10px] text-muted-foreground/40">{msg.model}</span>}
          {time && <span className="text-[10px] text-muted-foreground/40">{time}</span>}
        </div>
      </div>
    </div>
  );
});

export default function AiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AiMode>("advisor");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await aiService.listSessions(1, 30);
      setSessions(data.items);
    } catch { /* ignore */ }
    finally { setSessionsLoading(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const newChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    setInput("");
  }, []);

  const loadSession = useCallback(async (id: number) => {
    try {
      const detail = await aiService.getSession(id);
      setSessionId(id);
      setMessages([
        WELCOME_MESSAGE,
        ...detail.messages.map((m) => ({ role: m.role, content: m.content, timestamp: new Date(m.createdAt) })),
      ]);
    } catch { toast.error("Không tải được phiên chat"); }
  }, []);

  const deleteSession = useCallback(async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await aiService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) newChat();
      toast.success("Đã xóa phiên chat");
    } catch { toast.error("Xóa thất bại"); }
  }, [sessionId, newChat]);

  const pushMsg = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const submit = useCallback(async (text = input, selectedMode: AiMode = mode) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput("");
    setMode(selectedMode);
    pushMsg({ role: "user", content: clean, mode: selectedMode, timestamp: new Date() });
    setLoading(true);

    try {
      if (isNaturalTransactionIntent(clean)) {
        const data = await aiService.naturalTransaction(clean);
        pushMsg({
          role: "assistant",
          content: [
            "✅ **Đã tạo giao dịch thành công!**",
            `- **Loại:** ${data.parsed.type === "income" ? "Thu nhập" : "Chi tiêu"}`,
            `- **Số tiền:** ${formatVnd(data.parsed.amount)}`,
            `- **Ngày:** ${data.parsed.transactionDate}`,
            `- **Ví:** ${data.parsed.wallet?.name || "Ví mặc định"}`,
            `- **Danh mục:** ${data.parsed.category?.name || "Chưa phân loại"} *(tin cậy ${Math.round((data.parsed.confidence || 0) * 100)}%)*`,
          ].join("\n"),
          mode: selectedMode,
          timestamp: new Date(),
        });
        return;
      }
      if (isTotalSpendingQuestion(clean)) {
        const data = await aiService.spendingTotal();
        pushMsg({
          role: "assistant",
          content: `**Tổng chi tiêu** ${data.fromDate} → ${data.toDate}:\n- Số tiền: **${formatVnd(data.total)}**\n- Số giao dịch: **${data.count}**`,
          mode: selectedMode,
          timestamp: new Date(),
        });
        return;
      }
      const data = await aiService.chat(clean, selectedMode, sessionId);
      if (data.sessionId) {
        setSessionId(data.sessionId);
        loadSessions();
      }
      pushMsg({ role: "assistant", content: data.answer, mode: selectedMode, model: data.model, timestamp: new Date() });
    } catch (err) {
      toast.error(getErrorMessage(err, "AI chưa phản hồi"));
      pushMsg({ role: "assistant", content: "⚠️ Không gọi được Gemini. Kiểm tra GEMINI_API_KEY và kết nối backend.", mode: selectedMode, timestamp: new Date() });
    } finally {
      setLoading(false);
    }
  }, [input, loading, mode, sessionId, pushMsg, loadSessions]);

  const runCard = useCallback(async (card: (typeof ANALYSIS_CARDS)[number]) => {
    if (loading) return;
    const cardMode = card.mode || "advisor";
    setMode(cardMode);
    pushMsg({ role: "user", content: `[${card.label}]`, mode: cardMode, timestamp: new Date() });
    setLoading(true);
    try {
      let data;
      if (card.serviceKey) {
        data = await (aiService[card.serviceKey] as () => Promise<{ answer: string; sessionId?: number | null; model?: string }>)();
      } else {
        data = await aiService.chat(card.desc, cardMode, sessionId);
      }
      if ("sessionId" in data && data.sessionId) { setSessionId(data.sessionId as number); loadSessions(); }
      pushMsg({ role: "assistant", content: data.answer, mode: cardMode, model: data.model, timestamp: new Date() });
    } catch (err) {
      toast.error(getErrorMessage(err, "AI lỗi"));
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, pushMsg, loadSessions]);

  return (
    <div className="flex h-[calc(100dvh-5rem)] gap-4 lg:h-[calc(100dvh-2rem)]">
      {/* Sidebar sessions — hidden on mobile */}
      <aside className="hidden w-56 shrink-0 flex-col gap-2 lg:flex">
        <Button variant="outline" size="sm" onClick={newChat} className="w-full gap-2">
          <Plus className="size-4" />
          Hội thoại mới
        </Button>
        <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-1">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Lịch sử</p>
          {sessionsLoading && <p className="px-2 py-1 text-xs text-muted-foreground">Đang tải...</p>}
          {!sessionsLoading && sessions.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">Chưa có phiên nào</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSession(s.id)}
              className={cn(
                "flex w-full items-center justify-between gap-1.5 rounded-md px-2 py-2 text-left transition hover:bg-muted/60",
                sessionId === s.id && "bg-primary/10 text-primary"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium leading-snug">{s.title || "Không tiêu đề"}</p>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="size-2.5" />
                  {new Date(s.updatedAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => deleteSession(e, s.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </button>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Analysis cards — shown when no chat yet */}
        {messages.length <= 1 && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ANALYSIS_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                disabled={loading}
                onClick={() => runCard(card)}
                className="flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition hover:bg-muted/60 hover:shadow-sm disabled:opacity-50"
              >
                <card.icon className={cn("mt-0.5 size-5 shrink-0", card.color)} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{card.label}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{card.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div
          ref={listRef}
          className={cn(
            "flex-1 overflow-y-auto space-y-4 pr-1",
            messages.length > 1 && "mb-4"
          )}
        >
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 animate-bounce rounded-full bg-primary" />
                  <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:0.15s]" />
                  <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:0.3s]" />
                  <span className="ml-1 text-xs text-muted-foreground">Gemini đang phân tích...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          {/* Mode selector */}
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {QUICK_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                  mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-muted"
                )}
              >
                <m.icon className="size-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Quick action chips */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {ANALYSIS_CARDS.slice(0, 4).map((card) => (
              <button
                key={card.id}
                type="button"
                disabled={loading}
                onClick={() => runCard(card)}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/80 disabled:opacity-50"
              >
                <Sparkles className="size-3" />
                {card.label}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              placeholder="Hỏi về tài chính, hoặc nhập giao dịch tự nhiên như 'ăn trưa 45k hôm nay'..."
              className="max-h-40 min-h-13 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
            />
            <Button size="icon" onClick={() => submit()} disabled={!input.trim() || loading} aria-label="Gửi">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
