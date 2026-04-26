"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  type?: ToastType;
  durationMs?: number;
};

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastTypeStyles(type: ToastType) {
  if (type === "success") {
    return {
      icon: CheckCircle2,
      iconClass: "text-brand",
      containerClass: "border-brand/40 bg-brand/10",
    };
  }

  if (type === "error") {
    return {
      icon: XCircle,
      iconClass: "text-destructive",
      containerClass: "border-destructive/40 bg-destructive/10",
    };
  }

  return {
    icon: Info,
    iconClass: "text-foreground/80",
    containerClass: "border-border bg-card",
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, type = "info", durationMs = 3200 }: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, title, description, type }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast]
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(94vw,380px)] flex-col gap-2">
        {toasts.map((toast) => {
          const styles = toastTypeStyles(toast.type);
          const Icon = styles.icon;

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto rounded-xl border p-3 shadow-none ${styles.containerClass}`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.iconClass}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{toast.title}</p>
                  {toast.description ? <p className="mt-1 text-xs text-muted-foreground">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                  aria-label="Dismiss notification"
                  onClick={() => dismissToast(toast.id)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
