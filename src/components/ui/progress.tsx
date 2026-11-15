import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  colorClass?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indeterminate = false, colorClass, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            colorClass ?? 'bg-primary',
            indeterminate && 'progress-indeterminate absolute w-1/3'
          )}
          style={indeterminate ? undefined : { width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
