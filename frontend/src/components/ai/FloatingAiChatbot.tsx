import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Brain,
  ChartNoAxesCombined,
  Maximize2,
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
import { aiService, type AiMode } from "@/services/aiService";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: AiMode;
}

const MAX_MESSAGES = 60;

const trimMessages = (msgs: ChatMessage[]): ChatMessage[] =>
  msgs.length > MAX_MESSAGES ? [WELCOME_MESSAGE, ...msgs.slice(-(MAX_MESSAGES - 1))] : msgs;

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Tôi là AI tài chính của bạn. Tôi có thể phân tích dòng tiền, ngân sách, nợ, mục tiêu, rủi ro và biến câu nói hằng ngày thành dữ liệu giao dịch.",
  mode: "advisor",
};

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const isNaturalTransactionIntent = (text: string) => {
  const normalized = text.toLowerCase();
  return (
    /\d/.test(normalized) &&
    /(ăn|an|uống|uong|mua|trả|tra|chi|tiêu|tieu|xăng|xang|cafe|cà phê|luong|lương|thu|nhận|nhan)/i.test(
      normalized
    )
  );
};

const isTotalSpendingQuestion = (text: string) => {
  const normalized = text.toLowerCase();
  return /(tổng|tong).*(chi|tiêu|tieu)|chi.*bao nhiêu|chi.*bao nhieu/i.test(normalized);
};

const QUICK_ACTIONS: Array<{
  id: AiMode;
  label: string;
  icon: typeof Brain;
  prompt: string;
}> = [
  {
    id: "advisor",
    label: "Tổng quan",
    icon: Brain,
    prompt:
      "Phân tích toàn bộ tình hình tài chính hiện tại của tôi. Hãy nêu 3 điểm tốt, 3 điểm cần sửa và ưu tiên hành động.",
  },
  {
    id: "risk",
    label: "Rủi ro",
    icon: ShieldAlert,
    prompt:
      "Kiểm tra rủi ro tài chính của tôi: ví âm, nợ đến hạn, ngân sách vượt mức, dòng tiền xấu và khoản chi bất thường.",
  },
  {
    id: "forecast",
    label: "Dự báo",
    icon: ChartNoAxesCombined,
    prompt:
      "Dự báo dòng tiền cuối tháng của tôi. Hãy nêu giả định, mức còn lại ước tính và các kịch bản tốt/xấu.",
  },
  {
    id: "budget",
    label: "Kế hoạch",
    icon: PiggyBank,
    prompt:
      "Lập kế hoạch chi tiêu 7 ngày tới cho tôi, gồm mức chi mỗi ngày, khoản nên cắt giảm và mục tiêu tiết kiệm.",
  },
  {
    id: "transaction_parser",
    label: "Tách giao dịch",
    icon: Wand2,
    prompt:
      "Tách câu sau thành dữ liệu giao dịch có cấu trúc: ăn trưa 45k bằng ví tiền mặt hôm nay.",
  },
];

function AnswerText({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-6">
      {text.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        const isList = trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\./.test(trimmed);
        return (
          <p
            key={index}
            className={cn(
              "break-words",
              isList ? "pl-3 text-muted-foreground" : "text-muted-foreground"
            )}
          >
            {trimmed}
          </p>
        );
      })}
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
  const listRef = useRef<HTMLDivElement>(null);

  const activeAction = useMemo(
    () => QUICK_ACTIONS.find((item) => item.id === mode) || QUICK_ACTIONS[0],
    [mode]
  );

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const submit = async (message = input, selectedMode: AiMode = mode) => {
    const clean = message.trim();
    if (!clean || loading) return;

    setOpen(true);
    setInput("");
    setMode(selectedMode);
    setMessages((items) => [...items, { role: "user", content: clean, mode: selectedMode }]);
    setLoading(true);

    try {
      if (isNaturalTransactionIntent(clean)) {
        const data = await aiService.naturalTransaction(clean);
        setMessages((items) => [
          ...items,
          {
            role: "assistant",
            content: [
              "Đã tạo giao dịch từ câu bạn nhập.",
              `- Loại: ${data.parsed.type === "income" ? "Thu nhập" : "Chi tiêu"}`,
              `- Số tiền: ${formatVnd(data.parsed.amount)}`,
              `- Ngày: ${data.parsed.transactionDate}`,
              `- Ví: ${data.parsed.wallet?.name || "Ví mặc định"}`,
              `- Danh mục AI tự phân loại: ${data.parsed.category?.name || "Chưa phân loại"}`,
            ].join("\n"),
            mode: selectedMode,
          },
        ]);
        return;
      }

      if (isTotalSpendingQuestion(clean)) {
        const data = await aiService.spendingTotal();
        setMessages((items) => [
          ...items,
          {
            role: "assistant",
            content: `Tổng chi tiêu từ ${data.fromDate} đến ${data.toDate} là ${formatVnd(
              data.total
            )} với ${data.count} giao dịch chi tiêu.`,
            mode: selectedMode,
          },
        ]);
        return;
      }

      const data = await aiService.chat(clean, selectedMode, sessionId);
      setSessionId(data.sessionId);
      setMessages((items) =>
        trimMessages([...items, { role: "assistant", content: data.answer, mode: selectedMode }])
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "AI chưa phản hồi được"));
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          content:
            "Tôi chưa gọi được Gemini. Hãy kiểm tra backend, GEMINI_API_KEY và kết nối mạng rồi thử lại.",
          mode: selectedMode,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: (typeof QUICK_ACTIONS)[number]) => {
    if (loading) return;
    setOpen(true);
    setMode(action.id);
    setMessages((items) => [...items, { role: "user", content: action.prompt, mode: action.id }]);
    setLoading(true);
    try {
      const data =
        action.id === "forecast"
          ? await aiService.monthlyAnalysis()
          : action.id === "budget"
            ? await aiService.savings()
            : action.id === "advisor"
              ? await aiService.report()
              : await aiService.chat(action.prompt, action.id, sessionId);
      if ("sessionId" in data && data.sessionId) setSessionId(data.sessionId);
      setMessages((items) => [
        ...items,
        { role: "assistant", content: data.answer, mode: action.id },
      ]);
    } catch (err) {
      toast.error(getErrorMessage(err, "AI chưa phản hồi được"));
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setMode("advisor");
    setInput("");
    setSessionId(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open ? (
        <section className="flex h-[min(700px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-background shadow-2xl sm:w-[440px]">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">AI tài chính</p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeAction.label} · nhớ ngữ cảnh hội thoại
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={resetChat} aria-label="Xóa hội thoại AI">
                <Trash2 className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Đóng chatbot">
                <X className="size-4" />
              </Button>
            </div>
          </header>

          <div className="border-b px-3 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_ACTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
                    mode === item.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                disabled={loading}
                onClick={() => submit("Tổng chi tiêu tháng này là bao nhiêu?", "advisor")}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
              >
                <Sparkles className="size-3.5" />
                Tổng chi
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[88%] rounded-lg border px-3 py-2",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted/40"
                )}
              >
                {message.role === "assistant" ? (
                  <AnswerText text={message.content} />
                ) : (
                  <p className="break-words text-sm leading-6">{message.content}</p>
                )}
              </div>
            ))}
            {loading && (
              <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                Gemini đang phân tích dữ liệu và ngữ cảnh...
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <div className="mb-2 flex flex-wrap gap-2">
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
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                placeholder="Hỏi tiếp, nhờ lập kế hoạch, kiểm tra rủi ro hoặc nhập giao dịch tự nhiên..."
                className="max-h-32 min-h-[52px] resize-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
              />
              <Button size="icon" onClick={() => submit()} loading={loading} aria-label="Gửi câu hỏi">
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <Button
          size="lg"
          className="h-14 rounded-full px-4 shadow-xl"
          onClick={() => setOpen(true)}
          aria-label="Mở chatbot AI"
        >
          <Bot className="size-5" />
          <span className="hidden sm:inline">AI tài chính</span>
          <Maximize2 className="size-4 opacity-80" />
        </Button>
      )}
    </div>
  );
}
