export const TRANSACTIONS_CHANGED_EVENT = "money-manager:transactions-changed";

export type TransactionsChangedAction =
  | "create"
  | "update"
  | "delete"
  | "bulk-delete";

export interface TransactionsChangedDetail {
  action: TransactionsChangedAction;
  ids?: number[];
}

export const notifyTransactionsChanged = (detail: TransactionsChangedDetail) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRANSACTIONS_CHANGED_EVENT, { detail }));
};

export const onTransactionsChanged = (handler: (detail: TransactionsChangedDetail) => void) => {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    handler((event as CustomEvent<TransactionsChangedDetail>).detail);
  };

  window.addEventListener(TRANSACTIONS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(TRANSACTIONS_CHANGED_EVENT, listener);
};
