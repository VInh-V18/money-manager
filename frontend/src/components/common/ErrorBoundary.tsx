import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircle className="size-10 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Đã xảy ra lỗi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.error?.message || "Vui lòng thử tải lại trang"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.reset}>
            <RefreshCw className="mr-2 size-4" />
            Thử lại
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
