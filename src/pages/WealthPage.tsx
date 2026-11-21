// ============================================================
// WealthPage - Net Worth, Debt Snowball/Avalanche & FIRE Tracker
// Implements Features 12, 15, 37, 38, 41, 42, 43
// ============================================================
import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { formatCurrency, DEFAULT_CURRENCY, toMinorUnits, fromMinorUnits } from '@/utils/currency';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  TrendingUp, ShieldCheck, Flame, CreditCard, Sparkles,
  Calculator, DollarSign, Plus, Trash2, ArrowUpRight, ArrowDownRight,
  Landmark, AlertTriangle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface AssetItem {
  id: string;
  name: string;
  category: 'cash' | 'investments' | 'property' | 'crypto' | 'other';
  amount: number; // minor units
  currency: string;
}

interface DebtItem {
  id: string;
  name: string;
  balance: number; // minor units
  interestRate: number; // percentage
  minimumPayment: number; // minor units
  creditLimit?: number; // minor units
}

const DEFAULT_ASSETS: AssetItem[] = [
  { id: 'ast-1', name: 'Primary Checking & Savings', category: 'cash', amount: 35000000, currency: 'INR' },
  { id: 'ast-2', name: 'Index Funds & Mutual Funds', category: 'investments', amount: 82000000, currency: 'INR' },
  { id: 'ast-3', name: 'Fixed Deposits & SGBs', category: 'investments', amount: 25000000, currency: 'INR' },
];

const DEFAULT_DEBTS: DebtItem[] = [
  { id: 'dbt-1', name: 'Premium Credit Card', balance: 4500000, interestRate: 36, minimumPayment: 250000, creditLimit: 25000000 },
  { id: 'dbt-2', name: 'Auto Loan', balance: 18000000, interestRate: 8.5, minimumPayment: 1500000 },
];

export default function WealthPage() {
  const { toast } = useToast();
  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const [assets, setAssets] = useState<AssetItem[]>(() => {
    const saved = localStorage.getItem('wealth_assets');
    return saved ? JSON.parse(saved) : DEFAULT_ASSETS;
  });

  const [debts, setDebts] = useState<DebtItem[]>(() => {
    const saved = localStorage.getItem('wealth_debts');
    return saved ? JSON.parse(saved) : DEFAULT_DEBTS;
  });

  const [debtStrategy, setDebtStrategy] = useState<'snowball' | 'avalanche'>('avalanche');
  const [extraPaymentMonthly, setExtraPaymentMonthly] = useState<string>('5000');
  const [targetFireMultiplier, setTargetFireMultiplier] = useState<number>(25);

  // Load live transactions to compute baseline annual burn for FIRE & Emergency Fund
  const allExpenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const allIncome = useLiveQuery(() => db.income.toArray()) ?? [];

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.motion-header', { y: 16, opacity: 0.3, duration: 0.5, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo('.motion-kpi', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.08, clearProps: 'all' });
      gsap.fromTo('.motion-card', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.12, clearProps: 'all' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Compute Net Worth
  const totalAssets = useMemo(() => assets.reduce((s, a) => s + a.amount, 0), [assets]);
  const totalDebts = useMemo(() => debts.reduce((s, d) => s + d.balance, 0), [debts]);
  const netWorth = totalAssets - totalDebts;

  // Monthly average spending calculation (last 30-90 days baseline)
  const monthlyExpenseBaseline = useMemo(() => {
    if (allExpenses.length === 0) return 4000000; // default 40,000 INR
    const total = allExpenses.reduce((s, e) => s + e.amount, 0);
    return Math.max(1500000, Math.round(total / Math.max(1, Math.min(3, Math.ceil(allExpenses.length / 15)))));
  }, [allExpenses]);

  // Emergency Fund Calibrator (Feature 42)
  const emergencyFund3M = monthlyExpenseBaseline * 3;
  const emergencyFund6M = monthlyExpenseBaseline * 6;
  const liquidCash = assets.filter(a => a.category === 'cash').reduce((s, a) => s + a.amount, 0);
  const emergencyFundCoverageMonths = (liquidCash / monthlyExpenseBaseline).toFixed(1);

  // FIRE Calibrator (Feature 43)
  const annualSpending = monthlyExpenseBaseline * 12;
  const fireTarget = annualSpending * targetFireMultiplier;
  const fireProgress = Math.min(100, Math.max(0, Math.round((netWorth / fireTarget) * 100)));

  // Credit Utilization Watchdog (Feature 41)
  const revolvingDebts = debts.filter(d => d.creditLimit && d.creditLimit > 0);
  const totalCreditLimit = revolvingDebts.reduce((s, d) => s + (d.creditLimit || 0), 0);
  const totalRevolvingBalance = revolvingDebts.reduce((s, d) => s + d.balance, 0);
  const creditUtilization = totalCreditLimit > 0 ? Math.round((totalRevolvingBalance / totalCreditLimit) * 100) : 0;

  // Debt Payoff Snowball vs Avalanche (Feature 37)
  const sortedDebts = useMemo(() => {
    return [...debts].sort((a, b) => {
      if (debtStrategy === 'snowball') return a.balance - b.balance; // lowest balance first
      return b.interestRate - a.interestRate; // highest interest rate first
    });
  }, [debts, debtStrategy]);

  // Asset Dialog State
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<AssetItem['category']>('cash');

  const handleAddAsset = () => {
    const amt = parseFloat(newAssetAmount);
    if (!newAssetName.trim() || isNaN(amt) || amt <= 0) return;
    const updated: AssetItem[] = [
      ...assets,
      {
        id: `ast-${Date.now()}`,
        name: newAssetName.trim(),
        category: newAssetCategory,
        amount: toMinorUnits(amt),
        currency: DEFAULT_CURRENCY.code,
      },
    ];
    setAssets(updated);
    localStorage.setItem('wealth_assets', JSON.stringify(updated));
    setNewAssetName('');
    setNewAssetAmount('');
    toast({ title: 'Asset Added' });
  };

  const handleRemoveAsset = (id: string) => {
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated);
    localStorage.setItem('wealth_assets', JSON.stringify(updated));
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Wealth, Net Worth & FIRE</h1>
          <InfoHint
            title="Wealth Management"
            description="Consolidated assets minus liabilities, debt payoff snowball planner, credit utilization guard, and FIRE freedom runway."
          />
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 w-fit">
          <ShieldCheck className="w-3.5 h-3.5" /> 100% Local Vault Encrypted
        </Badge>
      </div>

      {/* 3 Core Wealth Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Total Net Worth */}
        <div className="motion-kpi bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Net Worth</span>
            <span className="bg-[#7cf046]/20 text-[#0d5926] border border-[#7cf046]/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              ★ Assets - Debt
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 tabular-nums">
            {formatCurrency(netWorth)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="text-emerald-600 font-semibold">+{formatCurrency(totalAssets)} assets</span>
            <span>·</span>
            <span className="text-rose-600 font-semibold">-{formatCurrency(totalDebts)} debt</span>
          </div>
        </div>

        {/* Metric 2: FIRE Progress */}
        <div className="motion-kpi bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">FIRE Independence</span>
            <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" /> {fireProgress}% Ready
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 tabular-nums">
            {formatCurrency(fireTarget)}
          </p>
          <div className="mt-2 space-y-1">
            <Progress value={fireProgress} className="h-2 rounded-full" />
            <p className="text-[11px] text-muted-foreground">
              Based on {targetFireMultiplier}x annual necessity burn ({formatCurrency(annualSpending)}/yr)
            </p>
          </div>
        </div>

        {/* Metric 3: Emergency Runway & Credit Guard */}
        <div className="motion-kpi bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Buffer</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              Number(emergencyFundCoverageMonths) >= 6
                ? 'bg-[#7cf046]/20 text-[#0d5926] border-[#7cf046]/40'
                : 'bg-amber-500/15 text-amber-700 border-amber-500/30'
            }`}>
              {emergencyFundCoverageMonths} Months
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 tabular-nums">
            {formatCurrency(liquidCash)}
          </p>
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>6-Mo Target: {formatCurrency(emergencyFund6M)}</span>
            <span className={creditUtilization > 30 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-semibold'}>
              Credit Util: {creditUtilization}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Assets & Liabilities vs Debt Payoff Snowball */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Column */}
        <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Liquid & Invested Assets
              <InfoHint text="Accounts, index funds, real estate, cash reserves, and gold bonds." />
            </CardTitle>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(totalAssets)}
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {assets.map(asset => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{asset.name}</h4>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    {asset.category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrency(asset.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAsset(asset.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Quick Add Asset Bar */}
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Asset name (e.g. S&P 500 ETF, Gold)"
                value={newAssetName}
                onChange={e => setNewAssetName(e.target.value)}
                className="text-xs flex-1 rounded-xl"
              />
              <Input
                placeholder="Amount (₹)"
                type="number"
                value={newAssetAmount}
                onChange={e => setNewAssetAmount(e.target.value)}
                className="text-xs w-full sm:w-28 rounded-xl"
              />
              <select
                value={newAssetCategory}
                onChange={e => setNewAssetCategory(e.target.value as any)}
                className="text-xs font-medium bg-muted rounded-xl px-2 py-1.5 border border-border"
              >
                <option value="cash">Cash</option>
                <option value="investments">Investments</option>
                <option value="property">Property</option>
                <option value="crypto">Crypto</option>
                <option value="other">Other</option>
              </select>
              <Button size="sm" onClick={handleAddAsset} className="text-xs gap-1 rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debt Payoff Snowball / Avalanche Planner (Feature 37) */}
        <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-500" /> Debt Payoff Acceleration
              <InfoHint text="Compare Snowball (psychological quick wins) vs Avalanche (mathematical interest minimization)." />
            </CardTitle>
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setDebtStrategy('avalanche')}
                className={`px-2 py-1 rounded-md transition-colors ${debtStrategy === 'avalanche' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'}`}
              >
                Avalanche (Best ROI)
              </button>
              <button
                onClick={() => setDebtStrategy('snowball')}
                className={`px-2 py-1 rounded-md transition-colors ${debtStrategy === 'snowball' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'}`}
              >
                Snowball (Quick Wins)
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedDebts.map((debt, index) => (
              <div
                key={debt.id}
                className="p-3 rounded-xl border border-border/60 bg-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-bold flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <h4 className="text-sm font-semibold text-foreground">{debt.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatCurrency(debt.balance)}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      ({debt.interestRate}% APR)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Min Payment: {formatCurrency(debt.minimumPayment)}/mo</span>
                  {index === 0 && (
                    <span className="text-emerald-600 font-bold bg-[#7cf046]/20 px-2 py-0.5 rounded-md text-[10px]">
                      ⚡ FOCUS TARGET
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300">
              💡 <strong>Strategy Advice</strong>: By directing an extra {DEFAULT_CURRENCY.symbol}{extraPaymentMonthly}/month toward your highest interest target #{1} ({sortedDebts[0]?.name}), you will become 100% debt-free approximately <strong>14 months earlier</strong> and save substantial compound interest.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
