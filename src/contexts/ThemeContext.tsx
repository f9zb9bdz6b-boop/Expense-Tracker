import * as React from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('expense-tracker-theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {}
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('expense-tracker-theme') as Theme | null;
      const t = stored ?? 'system';
      return t === 'system' ? getSystemTheme() : t;
    } catch {
      return 'light';
    }
  });

  // Apply on mount & theme change
  React.useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);
  }, [theme]);

  // Listen for system preference changes
  React.useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = applyTheme('system');
      setResolvedTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('expense-tracker-theme', newTheme);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
