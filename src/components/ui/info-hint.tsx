import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoHintProps {
  text?: string;
  title?: string;
  description?: string;
  className?: string;
  side?: 'top' | 'bottom' | 'right' | 'left';
}

/**
 * Fancy interactive InfoHint component.
 * Replaces static helper text with a floating glassmorphism popup
 * triggered by mouse hover or keyboard focus (Tab key navigation).
 */
export function InfoHint({ text, title, description, className, side = 'bottom' }: InfoHintProps) {
  const [isOpen, setIsOpen] = useState(false);
  const content = text || description || '';

  return (
    <div className={cn('relative inline-flex items-center align-middle', className)}>
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="w-4 h-4 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-emerald-700 hover:bg-emerald-500/15 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all duration-200 cursor-help"
        aria-label="Section information"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Floating Animated Balloon Tooltip */}
      {isOpen && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-1.5 text-xs font-medium text-white bg-[#0e2417]/95 backdrop-blur-md rounded-xl shadow-xl border border-emerald-500/30 w-max max-w-xs animate-in fade-in-0 zoom-in-95 duration-200 pointer-events-none',
            side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
            side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2'
          )}
        >
          {title && <div className="font-semibold text-emerald-300 text-[11px] mb-0.5">{title}</div>}
          <div>{content}</div>
          {/* Subtle Pointer Notch */}
          <div
            className={cn(
              'absolute w-2 h-2 bg-[#0e2417] border-emerald-500/30 rotate-45',
              side === 'bottom' && '-top-1 left-1/2 -translate-x-1/2 border-t border-l',
              side === 'top' && '-bottom-1 left-1/2 -translate-x-1/2 border-b border-r'
            )}
          />
        </div>
      )}
    </div>
  );
}
