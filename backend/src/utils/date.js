/**
 * Cac ham xu ly ngay khong phu thuoc thu vien -> nhe va de doc
 */

export const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const formatDate = (d) => {
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const addDays = (d, days) => {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
};

export const addMonths = (d, months) => {
  const date = new Date(d);
  date.setMonth(date.getMonth() + months);
  return date;
};

export const addYears = (d, years) => {
  const date = new Date(d);
  date.setFullYear(date.getFullYear() + years);
  return date;
};

export const startOfMonth = (d = new Date()) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (d = new Date()) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const startOfWeek = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 = CN
  const diff = day === 0 ? -6 : 1 - day; // tuan bat dau thu 2
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const startOfYear = (d = new Date()) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), 0, 1);
};

/**
 * Tinh ngay den han tiep theo dua tren chu ky cua FixedExpense
 */
export const computeNextDueDate = (fromDate, frequency, customIntervalDays = null) => {
  const date = new Date(fromDate);
  switch (frequency) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "monthly":
      return addMonths(date, 1);
    case "yearly":
      return addYears(date, 1);
    case "custom":
      return addDays(date, customIntervalDays || 30);
    default:
      return addMonths(date, 1);
  }
};
