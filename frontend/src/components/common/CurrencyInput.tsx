import * as React from "react";
import { Input } from "@/components/ui/input";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | string | undefined;
  onChange: (value: number) => void;
}

/**
 * Input cho số tiền: hiển thị có dấu phẩy ngăn cách hàng nghìn,
 * onChange trả về số nguyên. Vd: gõ "50000" -> hiển thị "50,000"
 */
export function CurrencyInput({ value, onChange, ...props }: Props) {
  const display = React.useMemo(() => {
    if (value === undefined || value === null || value === "") return "";
    const n = Number(value);
    if (Number.isNaN(n)) return "";
    return new Intl.NumberFormat("vi-VN").format(n);
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        // bo tat ca ki tu khong phai so
        const raw = e.target.value.replace(/\D/g, "");
        onChange(raw ? Number(raw) : 0);
      }}
      {...props}
    />
  );
}
