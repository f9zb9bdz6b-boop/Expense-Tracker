import * as React from 'react';
import { cn } from '@/lib/utils';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url("data:image/svg+xml,%3csvg%20xmlns%3d%27http%3a%2f%2fwww.w3.org%2f2000%2fsvg%27%20fill%3d%27none%27%20viewBox%3d%270%200%2020%2020%27%3e%3cpath%20stroke%3d%27%236b7280%27%20stroke-linecap%3d%27round%27%20stroke-linejoin%3d%27round%27%20stroke-width%3d%271.5%27%20d%3d%27m6%208%204%204%204-4%27%2f%3e%3c%2fsvg%3e")] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat pr-10',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };
