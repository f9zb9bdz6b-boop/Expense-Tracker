import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; classes: string }> = {
  default: {
    icon: <Info className="h-4 w-4 text-primary" />,
    classes: 'border-border bg-card text-card-foreground',
  },
  success: {
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    classes: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  },
  destructive: {
    icon: <AlertCircle className="h-4 w-4 text-destructive" />,
    classes: 'border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive-foreground',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    classes: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = React.useState(false);
  const variant = toast.variant ?? 'default';
  const config = variantConfig[variant];

  const dismiss = React.useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  React.useEffect(() => {
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [toast.duration, dismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-lg border p-4 shadow-lg pointer-events-auto',
        config.classes,
        exiting ? 'toast-exit' : 'toast-enter'
      )}
    >
      <div className="shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
        {toast.description && <p className="text-sm opacity-90 mt-0.5">{toast.description}</p>}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToasterProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function Toaster({ toasts, onDismiss }: ToasterProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
