import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

function DropdownMenu({ trigger, items, align = 'right', className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen((o) => !o)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 min-w-[180px] rounded-md border bg-card shadow-lg py-1',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none',
                  item.destructive && 'text-destructive hover:text-destructive'
                )}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.icon && <span className="h-4 w-4 shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function DropdownMenuTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {children}
      <ChevronDown className="h-4 w-4 opacity-60" />
    </div>
  );
}

export { DropdownMenu, DropdownMenuTrigger };
export type { DropdownMenuItem };
