import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { IconBubble } from "@/components/common/IconBubble";
import { categoryService } from "@/services/walletService";
import { getErrorMessage } from "@/lib/axios";
import type { Category } from "@/types";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  icon: z.string().min(1),
  color: z.string(),
});
type FormData = z.infer<typeof schema>;

const COLORS = ["#EF4444", "#F97316", "#F59E0B", "#10B981", "#14B8A6", "#3B82F6", "#A855F7", "#EC4899", "#6B7280"];
const ICONS = [
  "utensils", "car", "home", "book", "music", "shopping-cart", "heart-pulse",
  "users", "credit-card", "briefcase", "gift", "clock", "laptop", "shopping-bag",
];

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "expense", icon: "folder", color: COLORS[0] },
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await categoryService.list();
      setCategories(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openForm = (cat: Category | null) => {
    setEditing(cat);
    if (cat) {
      reset({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color });
    } else {
      reset({ name: "", type: activeTab, icon: ICONS[0], color: COLORS[0] });
    }
    setFormOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editing) {
        // khong cho doi type
        const { type: _t, ...rest } = data;
        await categoryService.update(editing.id, rest);
        toast.success("Đã cập nhật danh mục");
      } else {
        await categoryService.create(data);
        toast.success("Đã tạo danh mục");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await categoryService.remove(deleting.id);
      toast.success("Đã xoá danh mục");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const filtered = categories.filter((c) => c.type === activeTab);

  return (
    <div>
      <PageHeader
        title="Danh mục"
        description="Phân loại thu chi của bạn"
        action={
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4" /> Thêm danh mục
          </Button>
        }
      />

      {/* Tabs */}
      <div className="inline-flex bg-muted rounded-lg p-1 mb-4">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === t ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "expense" ? "Chi tiêu" : "Thu nhập"}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><CardContent className="p-8">Đang tải...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Chưa có danh mục"
          action={<Button onClick={() => openForm(null)}><Plus className="size-4" /> Thêm</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {filtered.map((c) => (
                <li key={c.id} className="flex items-center gap-4 p-4">
                  <IconBubble icon={c.icon} color={c.color} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{c.name}</p>
                    {c.isSystem && <Badge variant="outline" className="mt-1 text-xs">Hệ thống</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => openForm(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDeleting(c)}
                      disabled={c.isSystem}
                      className="text-destructive hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa danh mục" : "Tạo danh mục mới"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên danh mục</Label>
              <Input {...register("name")} placeholder="VD: Ăn uống" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {!editing && (
              <div className="space-y-2">
                <Label>Loại</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Chi tiêu</SelectItem>
                        <SelectItem value="income">Thu nhập</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Icon</Label>
              <Controller
                control={control}
                name="icon"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => field.onChange(ic)}
                        className={`p-2 rounded-lg border transition ${
                          field.value === ic ? "border-primary bg-primary/10" : "border-border"
                        }`}
                      >
                        <IconBubble icon={ic} color="#6B7280" size="sm" />
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Màu</Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => field.onChange(c)}
                        className={`size-8 rounded-full ring-offset-2 ${
                          field.value === c ? "ring-2 ring-foreground" : ""
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Huỷ</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? "Cập nhật" : "Tạo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Xoá danh mục?"
        description={`Bạn có chắc muốn xoá "${deleting?.name}"? Không thể xoá nếu đã có giao dịch hoặc danh mục con.`}
        loading={delLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
