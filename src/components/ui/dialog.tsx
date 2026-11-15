import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

function Dialog({ open, onClose, onOpenChange, children, className }: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  const handleClose = React.useCallback(() => {
    onClose?.();
    onOpenChange?.(false);
  }, [onClose, onOpenChange]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [handleClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect && (e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom)) {
      handleClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'relative w-full max-w-lg rounded-xl border bg-card text-card-foreground shadow-xl backdrop:bg-black/60 backdrop:backdrop-blur-sm p-0 m-auto',
        className
      )}
      onClick={handleBackdropClick}
    >
      {children}
    </dialog>
  );
}

function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between border-b px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function DialogDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </p>
  );
}

function DialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

function DialogFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 border-t px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  );
}

export {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogCloseButton,
};
