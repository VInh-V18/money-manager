import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";

import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

import DashboardPage from "./pages/DashboardPage";
import WalletPage from "./pages/WalletPage";
import CategoryPage from "./pages/CategoryPage";
import TransactionPage from "./pages/TransactionPage";
import BudgetPage from "./pages/BudgetPage";
import FixedExpensePage from "./pages/FixedExpensePage";
import GoalPage from "./pages/GoalPage";
import DebtPage from "./pages/DebtPage";
import TemplatePage from "./pages/TemplatePage";
import ReportPage from "./pages/ReportPage";
import NotificationPage from "./pages/NotificationPage";
import SettingsPage from "./pages/SettingsPage";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected */}
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
              <Route path="/notifications" element={<NotificationPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
