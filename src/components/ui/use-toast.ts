import * as React from 'react';
import { type Toast } from './toast';

type ToastInput = Omit<Toast, 'id'>;

interface ToastState {
  toasts: Toast[];
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'DISMISS'; id: string };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return { toasts: [...state.toasts, action.toast] };
    case 'DISMISS':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

let toastCount = 0;
function genId() {
  return `toast-${++toastCount}`;
}

type ToastDispatch = React.Dispatch<ToastAction>;

// Module-level dispatch registry so external callers can use toast()
const dispatchers = new Set<ToastDispatch>();

function toast(input: ToastInput) {
  const t: Toast = { ...input, id: genId() };
  dispatchers.forEach((d) => d({ type: 'ADD', toast: t }));
  return t.id;
}

toast.success = (title: string, description?: string) =>
  toast({ title, description, variant: 'success' });

toast.error = (title: string, description?: string) =>
  toast({ title, description, variant: 'destructive' });

toast.warning = (title: string, description?: string) =>
  toast({ title, description, variant: 'warning' });

function useToast() {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] });

  React.useEffect(() => {
    dispatchers.add(dispatch);
    return () => { dispatchers.delete(dispatch); };
  }, []);

  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: 'DISMISS', id });
  }, []);

  return { toasts: state.toasts, toast, dismiss };
}

export { useToast, toast };
