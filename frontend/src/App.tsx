import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage"));

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const TransactionPage = lazy(() => import("./pages/TransactionPage"));
const BudgetPage = lazy(() => import("./pages/BudgetPage"));
const FixedExpensePage = lazy(() => import("./pages/FixedExpensePage"));
const GoalPage = lazy(() => import("./pages/GoalPage"));
const DebtPage = lazy(() => import("./pages/DebtPage"));
const TemplatePage = lazy(() => import("./pages/TemplatePage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const NotificationPage = lazy(() => import("./pages/NotificationPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AiPage = lazy(() => import("./pages/AiPage"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Đang tải...
  </div>
);

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/transactions" element={<TransactionPage />} />
                  <Route path="/wallets" element={<WalletPage />} />
                  <Route path="/categories" element={<CategoryPage />} />
                  <Route path="/budgets" element={<BudgetPage />} />
                  <Route path="/fixed-expenses" element={<FixedExpensePage />} />
                  <Route path="/goals" element={<GoalPage />} />
                  <Route path="/debts" element={<DebtPage />} />
                  <Route path="/templates" element={<TemplatePage />} />
                  <Route path="/reports" element={<ReportPage />} />
                  <Route path="/ai" element={<AiPage />} />
                  <Route path="/notifications" element={<NotificationPage />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </>
  );
}

export default App;
