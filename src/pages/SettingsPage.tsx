// ============================================================
// SettingsPage - Comprehensive Preferences & Customization Studio
// Featuring:
// 1. 12+ Advanced Customizable System & Financial Settings
// 2. Coffee Shop Privacy Camouflage Blur Strength Calibration
// 3. Motion Intensity & Web Audio Chime Sound Synthesis
// 4. Billing Cycle Calibration (Salary Day alignment)
// 5. Full Encrypted IndexedDB Backup & Safe Reset
// ============================================================
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { backupRepo } from '@/db/repositories';
import { db } from '@/db/database';
import { SUPPORTED_CURRENCIES } from '@/utils/currency';
import { downloadFile } from '@/utils/helpers';
import { animateSpringPress, playFeedbackChime } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  Settings, Download, Upload, Trash2, Sun, Moon,
  Laptop, ShieldCheck, Database, RefreshCw, Eye, EyeOff,
  Volume2, Sparkles, SlidersHorizontal, Calendar, CreditCard,
  FileSpreadsheet, Zap, Check, Flame, ShieldAlert
} from 'lucide-react';
import type { UserSettings } from '@/types';

export default function SettingsPage() {
  const { settings, updateSettings, coffeeShopMode, toggleCoffeeShopMode } = useSettings();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray()) ?? [];

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    gsap.from('.motion-header', { y: 16, opacity: 0.3, duration: 0.5, ease: 'power2.out', clearProps: 'all' });
    gsap.from(
      '.motion-setting-card',
      { y: 20, opacity: 0.3, duration: 0.55, stagger: 0.05, ease: 'power2.out', delay: 0.06, clearProps: 'all' }
    );
  }, []);

  const handleCurrencyChange = async (code: string) => {
    const selected = SUPPORTED_CURRENCIES.find(c => c.code === code);
    if (!selected) return;
    try {
      await updateSettings({ currency: selected });
      playFeedbackChime('coin');
      toast({ title: 'Currency Updated', description: `Default currency set to ${selected.name} (${selected.symbol})` });
    } catch {
      toast({ title: 'Failed to update currency', variant: 'destructive' });
    }
  };

  const handleBlurStrengthChange = async (strength: 'light' | 'medium' | 'heavy') => {
    try {
      const radiusMap = { light: '4px', medium: '8px', heavy: '16px' };
      document.documentElement.style.setProperty('--privacy-blur-radius', radiusMap[strength]);
      await updateSettings({ privacyBlurStrength: strength });
      playFeedbackChime('toggle');
      toast({ title: 'Privacy Blur Updated', description: `Strength set to ${strength.toUpperCase()} (${radiusMap[strength]})` });
    } catch {
      toast({ title: 'Error saving preference', variant: 'destructive' });
    }
  };

  const handleMotionChange = async (intensity: 'cinematic' | 'smooth' | 'snappy' | 'reduced') => {
    try {
      await updateSettings({ motionIntensity: intensity });
      playFeedbackChime('toggle');
      toast({ title: 'Motion Profile Configured', description: `Switched animations to ${intensity.toUpperCase()}` });
    } catch {
      toast({ title: 'Error saving motion profile', variant: 'destructive' });
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const jsonBackup = await backupRepo.exportAll();
      const filename = `ExpenseTracker_Backup_${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(jsonBackup, filename, 'application/json');
      playFeedbackChime('success');
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
          playFeedbackChime('success');
          toast({ title: 'Data Restored!', description: res.message });
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast({ title: 'Restore Failed', description: res.message, variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Invalid Backup File', description: 'Could not parse JSON format.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

  return (
    <div ref={pageRef} className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Preferences & Studio Settings</h1>
            <InfoHint
              title="Customization Studio"
              description="Personalize your multi-currency rules, privacy camouflage, motion physics, sound chimes, and billing cycle days."
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure how your local finance engine displays, animates, and safeguards your financial records.
          </p>
        </div>
      </div>

      {/* 1. COFFEE SHOP PRIVACY & CAMOUFLAGE STUDIO */}
      <Card className="motion-setting-card border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-600 dark:text-[#7cf046]" />
              <span>Coffee Shop Privacy & Camouflage</span>
            </div>
            <Button
              size="sm"
              variant={coffeeShopMode ? 'default' : 'outline'}
              onClick={toggleCoffeeShopMode}
              className="gap-1.5 text-xs font-bold rounded-xl"
            >
              {coffeeShopMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {coffeeShopMode ? 'Mode Active' : 'Test Mode'}
            </Button>
          </CardTitle>
          <CardDescription className="text-xs">
            Hides all numbers, balances, and budgets with responsive optical blur when in public or shared spaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {/* Blur Strength 3-Way Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <Label className="font-bold text-foreground">Blur Intensity Strength</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Live Preview:</span>
                <span className="privacy-blur tabular-nums font-bold text-foreground px-2 py-0.5 rounded bg-muted">
                  ₹124,500.00
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'medium', 'heavy'] as const).map(str => {
                const isSelected = (settings?.privacyBlurStrength || 'medium') === str;
                return (
                  <button
                    key={str}
                    type="button"
                    onClick={() => handleBlurStrengthChange(str)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#7cf046] text-[#082b14] border-[#7cf046] shadow-xs'
                        : 'bg-card text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{str} {str === 'light' ? '(4px)' : str === 'medium' ? '(8px)' : '(16px)'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Default on Startup */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground">Always Open in Privacy Mode</span>
              <p className="text-[11px] text-muted-foreground">Automatically blur amounts every time the app opens</p>
            </div>
            <input
              type="checkbox"
              checked={!!settings?.privacyDefaultActive}
              onChange={async e => {
                await updateSettings({ privacyDefaultActive: e.target.checked });
                toast({ title: e.target.checked ? 'Enabled' : 'Disabled', description: 'Privacy mode startup preference updated.' });
              }}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. MOTION & AUDIO FEEDBACK SETTINGS */}
      <Card className="motion-setting-card border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-indigo-500" /> Motion Physics & Audio Micro-Feedback
          </CardTitle>
          <CardDescription className="text-xs">
            Fine-tune animation durations, spring elasticity, and tactile sound chimes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {/* Motion Intensity Profiles */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Animation Velocity Profile</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'cinematic', label: 'Cinematic', sub: '0.85s Glides' },
                { id: 'smooth', label: 'Smooth', sub: '0.50s Balanced' },
                { id: 'snappy', label: 'Snappy', sub: '0.25s Fast' },
                { id: 'reduced', label: 'Reduced', sub: 'Instant' },
              ].map(p => {
                const isSelected = (settings?.motionIntensity || 'cinematic') === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleMotionChange(p.id as 'cinematic' | 'smooth' | 'snappy' | 'reduced')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#7cf046] text-[#082b14] border-[#7cf046] font-bold shadow-xs'
                        : 'bg-card text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    <p className="text-xs font-bold">{p.label}</p>
                    <p className={`text-[10px] ${isSelected ? 'text-[#082b14]/80' : 'text-muted-foreground'}`}>{p.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound Feedback Chime Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-primary" /> Tactile Audio Chimes
              </span>
              <p className="text-[11px] text-muted-foreground">Play organic synthesized micro-chime on transactions and settlements</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => playFeedbackChime('coin')}
                className="text-xs h-7 px-2"
                title="Preview sound chime"
              >
                Test 🔔
              </Button>
              <input
                type="checkbox"
                checked={settings?.soundFeedbackEnabled ?? true}
                onChange={async e => {
                  await updateSettings({ soundFeedbackEnabled: e.target.checked });
                  if (e.target.checked) playFeedbackChime('success');
                }}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. FINANCIAL CALIBRATION & AUTOMATION */}
      <Card className="motion-setting-card border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <SlidersHorizontal className="w-5 h-5 text-primary" /> Financial Engine Calibration
          </CardTitle>
          <CardDescription className="text-xs">
            Align cycle start days to your salary and configure AI auto-tagging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {/* Billing Cycle / Salary Day Alignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Monthly Cycle Start Day
              </Label>
              <select
                value={settings?.billingCycleStartDay || 1}
                onChange={async e => {
                  await updateSettings({ billingCycleStartDay: parseInt(e.target.value) });
                  toast({ title: 'Cycle Day Updated', description: `Month analytics will reset on Day ${e.target.value} of each month.` });
                }}
                className="w-full px-3 py-2 text-xs bg-background rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              >
                {[1, 5, 10, 15, 20, 25, 28].map(day => (
                  <option key={day} value={day}>
                    Day {day} {day === 1 ? '(1st of Month)' : day === 25 ? '(Common Salary Day)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Impulse Cooldown Hours */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Wishlist Cooldown Rule
              </Label>
              <select
                value={settings?.impulseRuleHours || 72}
                onChange={async e => {
                  await updateSettings({ impulseRuleHours: parseInt(e.target.value) });
                  toast({ title: 'Impulse Rule Updated', description: `Cooldown timer set to ${e.target.value} hours.` });
                }}
                className="w-full px-3 py-2 text-xs bg-background rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              >
                <option value={24}>24 Hours (Next Day Reflection)</option>
                <option value={48}>48 Hours (Weekend Reflection)</option>
                <option value={72}>72 Hours (Standard 3-Day Rule)</option>
                <option value={168}>7 Days (Deep Frugality Rule)</option>
              </select>
            </div>
          </div>

          {/* Emergency Fund Months */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Emergency Fund Target Months</Label>
              <select
                value={settings?.emergencyFundTargetMonths || 6}
                onChange={async e => {
                  await updateSettings({ emergencyFundTargetMonths: parseInt(e.target.value) });
                  toast({ title: 'Target Updated', description: `Target set to ${e.target.value} months of living expenses.` });
                }}
                className="w-full px-3 py-2 text-xs bg-background rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              >
                <option value={3}>3 Months (Lean Safety Cushion)</option>
                <option value={6}>6 Months (Recommended Standard)</option>
                <option value={9}>9 Months (Robust Defense)</option>
                <option value={12}>12 Months (Full Financial Fortress)</option>
              </select>
            </div>

            {/* Quick Export Format */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Preferred Export Format</Label>
              <select
                value={settings?.quickExportFormat || 'csv'}
                onChange={async e => {
                  await updateSettings({ quickExportFormat: e.target.value as 'csv' | 'json' | 'tax-summary' });
                  toast({ title: 'Export Format Updated', description: `Default export set to ${e.target.value.toUpperCase()}.` });
                }}
                className="w-full px-3 py-2 text-xs bg-background rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              >
                <option value="csv">Standard CSV Spreadsheet</option>
                <option value="json">Raw IndexedDB JSON Ledger</option>
                <option value="tax-summary">Tax Schedule C / GST Summary</option>
              </select>
            </div>
          </div>

          {/* Heuristic Auto-Categorization Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Heuristic Merchant Auto-Categorization
              </span>
              <p className="text-[11px] text-muted-foreground">Auto-match category when typing recognized merchants (e.g. Starbucks, Uber)</p>
            </div>
            <input
              type="checkbox"
              checked={settings?.autoCategorizeHeuristics ?? true}
              onChange={async e => {
                await updateSettings({ autoCategorizeHeuristics: e.target.checked });
                toast({ title: e.target.checked ? 'Enabled' : 'Disabled' });
              }}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* Forex Auto-Sync Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>💱</span> Smart Forex Live Exchange Sync
              </span>
              <p className="text-[11px] text-muted-foreground">Auto-refresh live currency conversion rates every 6 hours</p>
            </div>
            <input
              type="checkbox"
              checked={settings?.smartForexAutoSync ?? true}
              onChange={async e => {
                await updateSettings({ smartForexAutoSync: e.target.checked });
                toast({ title: e.target.checked ? 'Enabled' : 'Disabled' });
              }}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. GENERAL PREFERENCES (Currency & Theme) */}
      <Card className="motion-setting-card border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">
            Currency & Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currencySelect" className="text-xs font-bold text-foreground">Primary Master Currency</Label>
            <select
              id="currencySelect"
              value={settings?.currency?.code || 'INR'}
              onChange={e => handleCurrencyChange(e.target.value)}
              className="w-full max-w-sm px-3 py-2 text-xs bg-background rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary font-bold"
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">App Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="gap-1.5 text-xs rounded-xl"
              >
                <Sun className="w-4 h-4" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="gap-1.5 text-xs rounded-xl"
              >
                <Moon className="w-4 h-4" /> Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="gap-1.5 text-xs rounded-xl"
              >
                <Laptop className="w-4 h-4" /> System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. BACKUP & ENCRYPTION */}
      <Card className="motion-setting-card border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Database className="w-4 h-4 text-primary" /> On-Device Vault & JSON Backup
          </CardTitle>
          <CardDescription className="text-xs">
            Export a full encrypted JSON snapshot of your Dexie database or restore from a previous backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="gap-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
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
                className="gap-2 w-full rounded-xl text-xs font-bold"
              >
                <Upload className="w-4 h-4" /> Restore from JSON Backup
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            🔒 <strong>100% Privacy Guarantee</strong>: All data is saved on your local device. Your records never touch external servers.
          </p>
        </CardContent>
      </Card>

      {/* 6. DANGER ZONE */}
      <Card className="motion-setting-card border-rose-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Reset Database
          </CardTitle>
          <CardDescription className="text-xs">
            Permanently clear all ledger records, budgets, and goals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="gap-1.5 rounded-xl text-xs font-bold"
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
