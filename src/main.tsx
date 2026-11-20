import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { Toaster } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import App from './App';
import '@/styles/globals.css';

function Root() {
  const { toasts, dismiss } = useToast();
  return (
    <ErrorBoundary>
      <App />
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <Root />
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>
);
