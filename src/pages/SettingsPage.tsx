// ============================================================
// SettingsPage - Preferences, Currency, Backup & Restore
// ============================================================
import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { backupRepo } from '@/db/repositories';
import { db } from '@/db/database';
import { SUPPORTED_CURRENCIES } from '@/utils/currency';
import { downloadFile } from '@/utils/helpers';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  Settings, Download, Upload, Trash2, Sun, Moon,
  Laptop, ShieldCheck, Database, RefreshCw, Info, DollarSign
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleCurrencyChange = async (code: string) => {
    const selected = SUPPORTED_CURRENCIES.find(c => c.code === code);
    if (!selected) return;
    try {
      await updateSettings({ currency: selected });
      toast({ title: 'Currency Updated', description: `Default currency set to ${selected.name} (${selected.symbol})` });
    } catch (err) {
      toast({ title: 'Failed to update currency', variant: 'destructive' });
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const jsonBackup = await backupRepo.exportAll();
      const filename = `ExpenseTracker_Backup_${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(jsonBackup, filename, 'application/json');
      toast({ title: 'Backup Downloaded', description: 'Saved encrypted JSON backup file to your downloads.' });
    } catch (err) {
      toast({ title: 'Backup failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const res = await backupRepo.restore(content, 'replace');
        if (res.success) {
          toast({ title: 'Data Restored!', description: res.message });
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast({ title: 'Restore Failed', description: res.message, variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Invalid Backup File', description: 'Could not parse JSON format.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      await Promise.all([
        db.expenses.clear(),
        db.income.clear(),
        db.budgets.clear(),
        db.events.clear(),
        db.recurringTransactions.clear(),
        db.financialGoals.clear(),
        db.savingsContributions.clear(),
        db.expenseSplits.clear(),
        db.merchants.clear(),
      ]);
      toast({ title: 'All records cleared', description: 'Application database reset successfully.' });
      setTimeout(() => window.location.reload(), 800);
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', clearProps: 'all' });
      gsap.fromTo(
        '.motion-card',
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.08, clearProps: 'all' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Settings & Preferences</h1>
          <InfoHint
            title="Application Settings"
            description="Customize currency, themes, offline local storage, data backup and restore."
          />
        </div>
      </div>

      {/* General Preferences */}
      <Card className="motion-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            General Preferences
            <InfoHint text="Select your primary currency and appearance theme." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Currency Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="currencySelect">Primary Currency</Label>
            <select
              id="currencySelect"
              value={settings?.currency?.code || 'INR'}
              onChange={e => handleCurrencyChange(e.target.value)}
              className="w-full max-w-sm px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2">
            <Label>App Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="gap-1.5"
              >
                <Sun className="w-4 h-4" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="gap-1.5"
              >
                <Moon className="w-4 h-4" /> Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="gap-1.5"
              >
                <Laptop className="w-4 h-4" /> System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup and Restore */}
      <Card className="motion-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Data Protection & Backup
            <InfoHint text="Export a full JSON backup of your records or restore from an existing file." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Generating...' : 'Download Full Backup (JSON)'}
            </Button>

            <div className="relative">
              <input
                type="file"
                id="restoreFileInput"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('restoreFileInput')?.click()}
                className="gap-2 w-full"
              >
                <Upload className="w-4 h-4" /> Restore from JSON Backup
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            🔒 <strong>Privacy Guarantee</strong>: All data is saved inside your browser's IndexedDB. Your financial data is never sent to any external server.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="motion-card border-rose-500/20">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            Danger Zone
            <InfoHint text="Irreversible data operations. Clears all IndexedDB ledger entries." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Clear All Transactions & Budgets
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={(open: boolean) => setShowClearConfirm(open)}
        title="Clear All Financial Records?"
        description="This will permanently delete all your expenses, income logs, budgets, goals, and event records. Make sure to download a backup first if you want to keep them."
        onConfirm={handleClearAllData}
        confirmText="Yes, Delete Everything"
        variant="destructive"
      />
    </div>
  );
}
