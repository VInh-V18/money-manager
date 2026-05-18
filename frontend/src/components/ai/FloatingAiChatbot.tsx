import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  History,
  MessageCircle,
  PiggyBank,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wand2,
  X,
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
}

const MAX_MESSAGES = 60;

const trimMessages = (msgs: ChatMessage[]): ChatMessage[] =>
  msgs.length > MAX_MESSAGES ? [WELCOME_MESSAGE, ...msgs.slice(-(MAX_MESSAGES - 1))] : msgs;

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Tôi là AI tài chính của bạn. Tôi có thể **phân tích dòng tiền**, **phát hiện rủi ro**, **lập kế hoạch tiết kiệm** và biến câu nói hằng ngày thành dữ liệu giao dịch.\n\nHãy hỏi tôi bất cứ điều gì về tài chính của bạn!",
  mode: "advisor",
};

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);

const isNaturalTransactionIntent = (text: string) =>
  /\d/.test(text) &&
  /(ăn|an|uống|uong|mua|trả|tra|chi|tiêu|tieu|xăng|xang|cafe|cà phê|luong|lương|thu|nhận|nhan|grab|taxi|shopee)/i.test(text);

const isTotalSpendingQuestion = (text: string) =>
  /(tổng|tong).*(chi|tiêu|tieu)|chi.*bao nhiêu|chi.*bao nhieu/i.test(text);

const QUICK_ACTIONS: Array<{ id: string; label: string; icon: typeof Brain; prompt?: string; serviceKey?: keyof typeof aiService }> = [
  {
    id: "advisor",
    label: "Tổng quan",
    icon: Brain,
    serviceKey: "report",
  },
  {
    id: "risk",
    label: "Rủi ro",
    icon: ShieldAlert,
    serviceKey: "anomaly",
  },
  {
    id: "forecast",
    label: "Dự báo",
    icon: ChartNoAxesCombined,
    serviceKey: "monthlyAnalysis",
  },
  {
    id: "budget",
    label: "Kế hoạch",
    icon: PiggyBank,
    serviceKey: "savings",
  },
  {
    id: "weekly",
    label: "Tuần này",
    icon: CalendarDays,
    serviceKey: "weeklyDigest",
  },
  {
    id: "transaction_parser",
    label: "Tách GD",
    icon: Wand2,
    prompt: "Tách câu sau thành dữ liệu giao dịch: ăn trưa 45k bằng ví tiền mặt hôm nay.",
  },
];

const BUBBLE_SIZE = 56;
const BUBBLE_PADDING = 8;

// Render markdown với style phù hợp chat
const MarkdownContent = memo(function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0 break-words">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
        h1: ({ children }) => <p className="font-bold text-foreground">{children}</p>,
        h2: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
        h3: ({ children }) => <p className="font-medium text-foreground">{children}</p>,
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/40 pl-2 italic text-muted-foreground">{children}</blockquote>
        ),
        hr: () => <hr className="my-2 border-border" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      type="button"
      onClick={copy}
      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      title="Sao chép"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Đã sao chép" : "Sao chép"}
    </button>
  );
}

const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div
      className={cn(
        "max-w-[88%] rounded-lg border px-3 py-2",
        message.role === "user"
          ? "ml-auto bg-primary text-primary-foreground"
          : "bg-muted/40"
      )}
    >
      {message.role === "assistant" ? (
        <>
          <div className="text-sm leading-6 text-muted-foreground">
            <MarkdownContent text={message.content} />
          </div>
          <CopyButton text={message.content} />
          {message.model && (
            <span className="mt-0.5 block text-xs text-muted-foreground/40">{message.model}</span>
          )}
        </>
      ) : (
        <p className="break-words text-sm leading-6">{message.content}</p>
      )}
    </div>
  );
});

// Dropdown session history
function SessionHistory({
  onLoad,
}: {
  onLoad: (sessionId: number, messages: { role: "user" | "assistant"; content: string }[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await aiService.listSessions(1, 15);
      setSessions(data.items);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleOpen = useCallback(() => {
    setOpen((v) => !v);
    if (!open) load();
  }, [open, load]);

  const handleSelect = useCallback(
    async (id: number) => {
      try {
        const detail = await aiService.getSession(id);
        onLoad(
          id,
          detail.messages.map((m) => ({ role: m.role, content: m.content }))
        );
        setOpen(false);
      } catch {
        toast.error("Không tải được phiên chat");
      }
    },
    [onLoad]
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      try {
        await aiService.deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success("Đã xóa phiên chat");
      } catch {
        toast.error("Xóa thất bại");
      }
    },
    []
  );

  return (
    <div className="relative">
      <Button variant="ghost" size="icon-sm" onClick={handleOpen} title="Lịch sử hội thoại">
        <History className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-64 rounded-lg border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Phiên chat gần đây</span>
            <button type="button" onClick={() => setOpen(false)}>
              <X className="size-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {loading && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Đang tải...</p>
            )}
            {!loading && sessions.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Chưa có phiên nào</p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{s.title || "Không tiêu đề"}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-2.5" />
                    {new Date(s.updatedAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, s.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FloatingAiChatbot() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AiMode>("advisor");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);

  const bubblePosRef = useRef({ top: 0, left: 0 });
  const dragRef = useRef({ startPX: 0, startPY: 0, startTop: 0, startLeft: 0, moved: false });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const top = H - (W >= 1024 ? 24 : 80) - BUBBLE_SIZE;
    const left = W - (W >= 1024 ? 24 : 16) - BUBBLE_SIZE;
    bubblePosRef.current = { top, left };
    setBubblePos({ top, left });
  }, []);

  const activeAction = useMemo(
    () => QUICK_ACTIONS.find((item) => item.id === mode) || QUICK_ACTIONS[0],
    [mode]
  );

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const handleBubblePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startPX: e.clientX,
      startPY: e.clientY,
      startTop: bubblePosRef.current.top,
      startLeft: bubblePosRef.current.left,
      moved: false,
    };
  }, []);

  const handleBubblePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const dx = e.clientX - dragRef.current.startPX;
    const dy = e.clientY - dragRef.current.startPY;
    if (!dragRef.current.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      dragRef.current.moved = true;
    }
    if (!dragRef.current.moved) return;
    const newTop = Math.max(BUBBLE_PADDING, Math.min(window.innerHeight - BUBBLE_SIZE - BUBBLE_PADDING, dragRef.current.startTop + dy));
    const newLeft = Math.max(BUBBLE_PADDING, Math.min(window.innerWidth - BUBBLE_SIZE - BUBBLE_PADDING, dragRef.current.startLeft + dx));
    bubblePosRef.current = { top: newTop, left: newLeft };
    setBubblePos({ top: newTop, left: newLeft });
  }, []);

  const handleBubblePointerUp = useCallback(() => {
    if (!dragRef.current.moved) setOpen(true);
  }, []);

  const submit = useCallback(async (message = input, selectedMode: AiMode = mode) => {
    const clean = message.trim();
    if (!clean || loading) return;

    setOpen(true);
    setInput("");
    setMode(selectedMode);
    setMessages((prev) => [...prev, { role: "user", content: clean, mode: selectedMode }]);
    setLoading(true);

    try {
      if (isNaturalTransactionIntent(clean)) {
        const data = await aiService.naturalTransaction(clean);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: [
              "✅ **Đã tạo giao dịch từ câu bạn nhập.**",
              `- **Loại:** ${data.parsed.type === "income" ? "Thu nhập" : "Chi tiêu"}`,
              `- **Số tiền:** ${formatVnd(data.parsed.amount)}`,
              `- **Ngày:** ${data.parsed.transactionDate}`,
              `- **Ví:** ${data.parsed.wallet?.name || "Ví mặc định"}`,
              `- **Danh mục:** ${data.parsed.category?.name || "Chưa phân loại"} (độ tin cậy: ${Math.round((data.parsed.confidence || 0) * 100)}%)`,
            ].join("\n"),
            mode: selectedMode,
          },
        ]);
        return;
      }

      if (isTotalSpendingQuestion(clean)) {
        const data = await aiService.spendingTotal();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `**Tổng chi tiêu** từ ${data.fromDate} đến ${data.toDate}:\n- Số tiền: **${formatVnd(data.total)}**\n- Số giao dịch: **${data.count}**`,
            mode: selectedMode,
          },
        ]);
        return;
      }

      const data = await aiService.chat(clean, selectedMode, sessionId);
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) =>
        trimMessages([...prev, { role: "assistant", content: data.answer, mode: selectedMode, model: data.model }])
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "AI chưa phản hồi được"));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Tôi chưa gọi được Gemini. Hãy kiểm tra backend, GEMINI_API_KEY và kết nối mạng rồi thử lại.",
          mode: selectedMode,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, mode, sessionId]);

  const runAction = useCallback(async (action: (typeof QUICK_ACTIONS)[number]) => {
    if (loading) return;
    setOpen(true);
    setMode(action.id as AiMode);
    setMessages((prev) => [...prev, { role: "user", content: `[${action.label}]`, mode: action.id as AiMode }]);
    setLoading(true);
    try {
      let data;
      if (action.serviceKey && typeof aiService[action.serviceKey] === "function") {
        data = await (aiService[action.serviceKey] as () => Promise<{ answer: string; sessionId?: number | null; model?: string }>)();
      } else if (action.prompt) {
        data = await aiService.chat(action.prompt, action.id as AiMode, sessionId);
      } else {
        data = await aiService.chat(`Hãy thực hiện: ${action.label}`, action.id as AiMode, sessionId);
      }
      if ("sessionId" in data && data.sessionId) setSessionId(data.sessionId as number);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, mode: action.id as AiMode, model: data.model },
      ]);
    } catch (err) {
      toast.error(getErrorMessage(err, "AI chưa phản hồi được"));
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId]);

  const resetChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setMode("advisor");
    setInput("");
    setSessionId(null);
  }, []);

  const loadSession = useCallback(
    (id: number, msgs: { role: "user" | "assistant"; content: string }[]) => {
      setSessionId(id);
      setMessages([
        WELCOME_MESSAGE,
        ...msgs.map((m) => ({ role: m.role, content: m.content })),
      ]);
    },
    []
  );

  return (
    <>
      {!open && bubblePos && (
        <button
          type="button"
          onPointerDown={handleBubblePointerDown}
          onPointerMove={handleBubblePointerMove}
          onPointerUp={handleBubblePointerUp}
          aria-label="Mở AI tài chính"
          style={{ top: bubblePos.top, left: bubblePos.left }}
          className="fixed z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-primary/20 touch-none select-none cursor-grab active:cursor-grabbing transition-shadow hover:shadow-2xl"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6">
          <section className="flex h-[min(720px,calc(100dvh-9rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-background shadow-2xl sm:w-[440px] lg:h-[min(720px,calc(100dvh-4rem))]">
            {/* Header */}
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">AI Tài chính</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {activeAction.label} · Gemini · nhớ ngữ cảnh
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <SessionHistory onLoad={loadSession} />
                <Button variant="ghost" size="icon-sm" onClick={resetChat} title="Xóa hội thoại">
                  <Trash2 className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} title="Đóng">
                  <X className="size-4" />
                </Button>
              </div>
            </header>

            {/* Mode tabs */}
            <div className="border-b px-3 py-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {QUICK_ACTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id as AiMode)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
                      mode === item.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="size-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((message, index) => (
                <MessageBubble key={`${message.role}-${index}`} message={message} />
              ))}
              {loading && (
                <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  <span className="size-2 animate-pulse rounded-full bg-primary" />
                  <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:0.2s]" />
                  <span className="size-1 animate-pulse rounded-full bg-primary [animation-delay:0.4s]" />
                  Gemini đang phân tích...
                </div>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="border-t px-3 pt-2.5">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={loading}
                    onClick={() => runAction(item)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
                  >
                    <Sparkles className="size-3.5" />
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => submit("Tổng chi tiêu tháng này là bao nhiêu?", "advisor")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
                >
                  <ChartNoAxesCombined className="size-3.5" />
                  Tổng chi
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => submit("Phát hiện chi tiêu bất thường của tôi", "risk")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
                >
                  <AlertTriangle className="size-3.5" />
                  Bất thường
                </button>
              </div>

              {/* Input */}
              <div className="flex items-end gap-2 pb-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                  placeholder="Hỏi về tài chính, hoặc nhập giao dịch như 'ăn trưa 45k hôm nay'..."
                  className="max-h-32 min-h-[52px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
                <Button size="icon" onClick={() => submit()} loading={loading} aria-label="Gửi">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
