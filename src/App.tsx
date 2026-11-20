import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { seedDefaultData } from '@/db/database';

// Pages
import DashboardPage from '@/pages/DashboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import AddExpensePage from '@/pages/AddExpensePage';
import IncomePage from '@/pages/IncomePage';
import CategoriesPage from '@/pages/CategoriesPage';
import BudgetsPage from '@/pages/BudgetsPage';
import EventsPage from '@/pages/EventsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import GoalsPage from '@/pages/GoalsPage';
import AIAssistantPage from '@/pages/AIAssistantPage';
import SettingsPage from '@/pages/SettingsPage';
import ReceiptsPage from '@/pages/ReceiptsPage';
import RecurringPage from '@/pages/RecurringPage';
import SplitsPage from '@/pages/SplitsPage';

function AppRoutes() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    seedDefaultData()
      .then(() => setDbReady(true))
      .catch((err: unknown) => {
        setDbError(err instanceof Error ? err.message : 'Database initialization failed');
        setDbReady(true); // Still render, some things may work
      });
  }, []);

  if (!dbReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" label="Loading your data..." />
      </div>
    );
  }

  if (dbError) {
    console.error('DB Error:', dbError);
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/add-expense" element={<AddExpensePage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/splits" element={<SplitsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
