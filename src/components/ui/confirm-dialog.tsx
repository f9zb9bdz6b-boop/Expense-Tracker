import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogCloseButton } from './dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

function ConfirmDialog({
  open,
  onClose,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  const finalConfirmLabel = confirmText || confirmLabel || 'Confirm';

  return (
    <Dialog open={open} onClose={handleClose} onOpenChange={onOpenChange} className="max-w-sm">
      <DialogHeader>
        <div className="flex items-center gap-3">
          {variant === 'destructive' && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          )}
          <DialogTitle>{title}</DialogTitle>
        </div>
        <DialogCloseButton onClose={handleClose} />
      </DialogHeader>
      {description && (
        <DialogContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogContent>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          onClick={onConfirm}
          loading={loading}
        >
          {finalConfirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export { ConfirmDialog };
