import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { feedbackService } from "@/services/feedbackService";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/utils";
import type { Feedback } from "@/types";

const TYPE_LABELS: Record<Feedback["type"], string> = {
  feedback: "Góp ý",
  bug: "Báo lỗi",
  feature_request: "Đề xuất chức năng",
};

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "feedback" as Feedback["type"],
    title: "",
    message: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await feedbackService.list(1, 20);
      setItems(data.items);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await feedbackService.create(form);
      setItems((current) => [created, ...current]);
      setForm({ type: "feedback", title: "", message: "" });
      toast.success("Đã gửi phản hồi");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Góp ý & báo lỗi" description="Gửi phản hồi để cải thiện ứng dụng" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Gửi phản hồi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Loại phản hồi</Label>
                <Select
                  value={form.type}
                  onValueChange={(type) => setForm((current) => ({ ...current, type: type as Feedback["type"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feedback">Góp ý</SelectItem>
                    <SelectItem value="bug">Báo lỗi</SelectItem>
                    <SelectItem value="feature_request">Đề xuất chức năng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tiêu đề</Label>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  minLength={3}
                  maxLength={150}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nội dung</Label>
                <Textarea
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  minLength={10}
                  maxLength={5000}
                  rows={7}
                  required
                />
              </div>
              <Button type="submit" loading={submitting} className="w-full">
                Gửi phản hồi
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phản hồi đã gửi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            ) : items.length === 0 ? (
              <EmptyState icon={MessageSquarePlus} title="Chưa có phản hồi" />
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {TYPE_LABELS[item.type]} · {item.status}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
