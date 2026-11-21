// ============================================================
// TransactionsPage - Transaction History, Search, Filters & Export
// With Category Editing & Split Expense Tracking
// Human-crafted, visually rich design with emojis & decorative timeline
// ============================================================
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { expenseRepo, incomeRepo } from '@/db/repositories';
import { formatCurrency, toMinorUnits, fromMinorUnits, DEFAULT_CURRENCY, convertMinorUnits, getActiveMasterCurrency } from '@/utils/currency';
import { useSettings } from '@/contexts/SettingsContext';
import { formatDate } from '@/utils/date';
import { downloadFile } from '@/utils/helpers';
import { getCategoryEmoji, getPaymentMethodEmoji } from '@/utils/emojis';
import { animateSpringPress, animateHoverLift } from '@/utils/motion';
import { InfoHint } from '@/components/ui/info-hint';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Search, ArrowUpRight, ArrowDownLeft, Trash2, Edit2,
  Download, Plus, X, Calendar, Users, TrendingDown,
  TrendingUp, Wallet, Sparkles, Leaf, Receipt, Clock, Store
} from 'lucide-react';
import type { Expense, Income, ExpenseCategory, IncomeCategory, PaymentMethod, ExpenseClassification } from '@/types';

type CombinedTransaction = (Expense | Income) & {
  type: 'expense' | 'income';
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const masterCurrency = settings?.currency || getActiveMasterCurrency();

  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnClick = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  // Deletion modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'expense' | 'income'>('expense');

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<CombinedTransaction | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPaymentMethodId, setEditPaymentMethodId] = useState('');
  const [editIncomeMode, setEditIncomeMode] = useState('Bank Transfer');
  const [editClassification, setEditClassification] = useState<ExpenseClassification>('necessary');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Load from Dexie reactive queries
  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray()) ?? [];
  const incomeList = useLiveQuery(() => db.income.orderBy('date').reverse().toArray()) ?? [];
  const expenseCategories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];
  const incomeCategories = useLiveQuery(() => db.incomeCategories.toArray()) ?? [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray()) ?? [];

  const catMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory | IncomeCategory>();
    expenseCategories.forEach(c => map.set(c.id, c));
    incomeCategories.forEach(c => map.set(c.id, c));
    return map;
  }, [expenseCategories, incomeCategories]);

  const pmMap = useMemo(() => new Map(paymentMethods.map(p => [p.id, p])), [paymentMethods]);

  // Combine and filter transactions
  const filteredTransactions = useMemo(() => {
    let combined: CombinedTransaction[] = [];

    if (activeTab === 'all' || activeTab === 'expense') {
      combined.push(...expenses.map(e => ({ ...e, type: 'expense' as const })));
    }
    if (activeTab === 'all' || activeTab === 'income') {
      combined.push(...incomeList.map(i => ({ ...i, type: 'income' as const })));
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      combined = combined.filter(t =>
        t.description.toLowerCase().includes(q) ||
        ('merchant' in t && t.merchant?.toLowerCase().includes(q)) ||
        ('notes' in t && t.notes?.toLowerCase().includes(q))
      );
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      combined = combined.filter(t => t.categoryId === selectedCategory);
    }

    // Filter by Classification (expenses only)
    if (selectedClassification !== 'all') {
      combined = combined.filter(t => 'classification' in t && t.classification === selectedClassification);
    }

    // Filter by Date Range
    if (startDate) {
      combined = combined.filter(t => t.date >= startDate);
    }
    if (endDate) {
      combined = combined.filter(t => t.date <= endDate);
    }

    // Sort
    combined.sort((a, b) => {
      if (sortField === 'date') {
        const diff = a.date.localeCompare(b.date);
        return sortOrder === 'desc' ? -diff : diff;
      } else {
        const diff = a.amount - b.amount;
        return sortOrder === 'desc' ? -diff : diff;
      }
    });

    return combined;
  }, [
    expenses, incomeList, activeTab, searchQuery,
    selectedCategory, selectedClassification, startDate, endDate,
    sortField, sortOrder
  ]);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo(
        '.motion-pulse-card',
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }
      );
      gsap.fromTo('.motion-controls', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo(
        '.motion-row',
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, stagger: 0.02, ease: 'power2.out', clearProps: 'all' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Summary Metrics of filtered data
  const metrics = useMemo(() => {
    let spent = 0;
    let received = 0;
    filteredTransactions.forEach(t => {
      const amt = (t.currency && t.currency !== 'INR')
        ? convertMinorUnits(t.amount, t.currency, 'INR')
        : t.amount;
      if (t.type === 'expense') spent += amt;
      else received += amt;
    });
    return {
      spent,
      received,
      net: received - spent,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Group transactions by date for a human timeline feel
  const groupedByDate = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const map = new Map<string, { label: string; subtotal: number; count: number; items: CombinedTransaction[] }>();

    filteredTransactions.forEach(t => {
      const dateKey = t.date;
      if (!map.has(dateKey)) {
        let label = formatDate(dateKey);
        if (dateKey === today) label = 'Today';
        else if (dateKey === yesterday) label = 'Yesterday';

        map.set(dateKey, { label, subtotal: 0, count: 0, items: [] });
      }

      const group = map.get(dateKey)!;
      group.items.push(t);
      group.count += 1;
      const amt = (t.currency && t.currency !== 'INR')
        ? convertMinorUnits(t.amount, t.currency, 'INR')
        : t.amount;
      if (t.type === 'expense') {
        group.subtotal -= amt;
      } else {
        group.subtotal += amt;
      }
    });

    return Array.from(map.entries());
  }, [filteredTransactions]);

  const handleOpenEdit = (t: CombinedTransaction) => {
    setEditingTransaction(t);
    setEditDescription(t.description);
    const convertedMinor = convertMinorUnits(t.amount, t.currency || 'INR', masterCurrency.code);
    setEditAmount(fromMinorUnits(convertedMinor, masterCurrency.decimalPlaces).toString());
    setEditCategoryId(t.categoryId);
    setEditDate(t.date);
    setEditNotes(t.notes || '');

    if (t.type === 'expense' && 'paymentMethodId' in t) {
      setEditPaymentMethodId((t as any).paymentMethodId || '');
      setEditClassification((t as any).classification || 'necessary');
    } else if (t.type === 'income') {
      setEditIncomeMode((t as any).paymentMethod || 'Bank Transfer');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    const amtNum = parseFloat(editAmount);
    if (isNaN(amtNum) || amtNum <= 0 || !editDescription.trim() || !editCategoryId) {
      toast({ title: 'Invalid Inputs', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    const enteredMinor = toMinorUnits(amtNum, masterCurrency.decimalPlaces);
    const minorUnits = convertMinorUnits(enteredMinor, masterCurrency.code, editingTransaction.currency || 'INR');
    try {
      if (editingTransaction.type === 'expense') {
        await expenseRepo.update(editingTransaction.id, {
          description: editDescription.trim(),
          amount: minorUnits,
          categoryId: editCategoryId,
          paymentMethodId: editPaymentMethodId || paymentMethods[0]?.id,
          classification: editClassification,
          date: editDate,
          notes: editNotes.trim(),
        });
        toast({ title: 'Expense Updated', description: 'Category and details saved.' });
      } else {
        await incomeRepo.update(editingTransaction.id, {
          description: editDescription.trim(),
          amount: minorUnits,
          categoryId: editCategoryId,
          paymentMethod: editIncomeMode,
          date: editDate,
          notes: editNotes.trim(),
        });
        toast({ title: 'Income Updated', description: 'Category and details saved.' });
      }
      setEditingTransaction(null);
    } catch (err) {
      toast({ title: 'Error updating transaction', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      if (deleteType === 'expense') {
        await expenseRepo.delete(deleteId);
      } else {
        await incomeRepo.delete(deleteId);
      }
      toast({
        title: 'Transaction Deleted',
        description: 'The record was permanently removed.',
      });
    } catch (err) {
      toast({
        title: 'Error deleting transaction',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const headers = ['Type', 'Date', 'Time', 'Description', 'Amount', 'Category', 'Classification', 'Payment Method', 'Merchant', 'Notes'];
    const rows = filteredTransactions.map(t => {
      const isExp = t.type === 'expense';
      const catName = catMap.get(t.categoryId)?.name || 'General';
      const pmName = isExp && 'paymentMethodId' in t && t.paymentMethodId ? pmMap.get(t.paymentMethodId)?.name || 'Cash' : (t as any).paymentMethod || 'Bank Transfer';
      const classification = isExp && 'classification' in t ? t.classification : 'income';
      const merchant = isExp && 'merchant' in t ? t.merchant || '' : '';
      const notes = t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '';

      return [
        t.type,
        t.date,
        t.time || '',
        `"${t.description.replace(/"/g, '""')}"`,
        (t.amount / 100).toFixed(2),
        `"${catName}"`,
        classification,
        `"${pmName}"`,
        `"${merchant}"`,
        notes,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `transactions_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    toast({ title: 'Export Complete', description: 'Downloaded CSV file successfully.' });
  };

  return (
    <div ref={pageRef} className="space-y-6 pb-12">
      {/* Top Header & Action Controls */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧾</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Transaction Log</h1>
            <InfoHint text="Your chronological financial ledger. Search by merchant, filter by category or date, and export CSV." />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={e => {
              handleBtnClick(e);
              handleExportCSV();
            }}
            className="gap-1.5 shadow-xs cursor-pointer select-none"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            onClick={e => {
              handleBtnClick(e);
              navigate('/add-expense');
            }}
            className="gap-1.5 bg-[#7cf046] hover:bg-[#6ee33a] text-[#082b14] font-extrabold shadow-sm cursor-pointer select-none"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Decorative Summary Pulse Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="motion-pulse-card bg-card border border-border/80 rounded-2xl p-4 shadow-xs hover:border-border transition-[box-shadow,border-color] duration-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outflow</p>
              <span className="bg-[#fee2e2] text-[#b91c1c] text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                ↓ Outflow
              </span>
            </div>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 privacy-blur tabular-nums">
              -{formatCurrency(metrics.spent, masterCurrency)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center text-lg">
            💸
          </div>
        </div>

        <div className="motion-pulse-card bg-card border border-border/80 rounded-2xl p-4 shadow-xs hover:border-border transition-[box-shadow,border-color] duration-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Inflow</p>
              <span className="bg-[#7cf046]/20 text-[#0d5926] border border-[#7cf046]/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                ↑ Inflow
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 privacy-blur tabular-nums">
              +{formatCurrency(metrics.received, masterCurrency)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg">
            💰
          </div>
        </div>

        <div className="motion-pulse-card bg-card border border-border/80 rounded-2xl p-4 shadow-xs hover:border-border transition-[box-shadow,border-color] duration-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Position</p>
              <span className="bg-[#7cf046]/20 text-[#0d5926] border border-[#7cf046]/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                ⚖️ Net
              </span>
            </div>
            <p className={`text-xl font-bold mt-1 privacy-blur tabular-nums ${metrics.net >= 0 ? 'text-primary' : 'text-rose-600'}`}>
              {metrics.net >= 0 ? '+' : ''}{formatCurrency(metrics.net, masterCurrency)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground flex items-center justify-center text-lg">
            📊
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="motion-controls rounded-2xl border-border/80 shadow-xs">
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
              <Input
                placeholder="Search transactions, notes, merchants..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/80 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Type Filter Tabs */}
            <div className="flex rounded-xl border border-border/80 bg-muted/40 p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'all' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setActiveTab('expense')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'expense' ? 'bg-background shadow-xs text-rose-600 dark:text-rose-400 font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                💸 Expenses
              </button>
              <button
                onClick={() => setActiveTab('income')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'income' ? 'bg-background shadow-xs text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                💰 Income
              </button>
            </div>
          </div>

          {/* Secondary Filters: Category with emojis, Needs/Wants, Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {/* Category Select with Emojis */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="all">📁 All Categories</option>
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {getCategoryEmoji(c)} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Classification (Needs / Wants) */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Classification</label>
              <select
                value={selectedClassification}
                onChange={e => setSelectedClassification(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="all">⚖️ All Types</option>
                <option value="necessary">🌿 Needs (Essential)</option>
                <option value="discretionary">✨ Wants (Lifestyle)</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List & Human Date Grouping */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-foreground">
            {filteredTransactions.length} Transaction{filteredTransactions.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Sort:</span>
            <button
              onClick={() => {
                if (sortField === 'date') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortField('date'); setSortOrder('desc'); }
              }}
              className={`font-semibold px-2 py-0.5 rounded-md ${sortField === 'date' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Date {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortField === 'amount') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortField('amount'); setSortOrder('desc'); }
              }}
              className={`font-semibold px-2 py-0.5 rounded-md ${sortField === 'amount' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Amount {sortField === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>

        {groupedByDate.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-muted/60 flex items-center justify-center text-3xl">
                🍃
              </div>
              <p className="text-base font-semibold text-foreground">No matching transactions</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No entries match your search or active filters. Try adjusting the date range or clearing filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedClassification('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="mt-4 text-xs"
              >
                Reset All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          groupedByDate.map(([dateKey, group]) => (
            <div key={dateKey} className="space-y-2">
              {/* Day Header */}
              <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground tracking-wide">{group.label}</span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    · {group.count} {group.count === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <span className={`text-xs font-semibold privacy-blur tabular-nums ${group.subtotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {group.subtotal > 0 ? `+${formatCurrency(group.subtotal, masterCurrency)}` : group.subtotal < 0 ? `-${formatCurrency(Math.abs(group.subtotal), masterCurrency)}` : formatCurrency(0, masterCurrency)}
                </span>
              </div>

              {/* Transactions in this Day */}
              <div className="bg-card rounded-2xl border border-border/80 shadow-xs divide-y divide-border/60 overflow-hidden">
                {group.items.map(t => {
                  const isExp = t.type === 'expense';
                  const cat = catMap.get(t.categoryId);
                  const pm = isExp && 'paymentMethodId' in t && t.paymentMethodId ? pmMap.get(t.paymentMethodId) : null;
                  const catEmoji = cat ? getCategoryEmoji(cat) : (isExp ? '🏷️' : '💰');
                  const pmName = isExp && pm ? pm.name : (t as any).paymentMethod || 'Bank Transfer';
                  const pmEmoji = getPaymentMethodEmoji(pmName);

                  const isSplit = t.tags?.includes('split-bill') || t.description.startsWith('[Split]');
                  const isGoalSavings = t.tags?.includes('goal-savings') || t.description.startsWith('[Goal Contribution]');
                  const isGoalWithdrawal = t.tags?.includes('goal-withdrawal') || t.description.startsWith('[Goal Withdrawal]');

                  return (
                    <div
                      key={t.id}
                      className="motion-row p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors group"
                    >
                      {/* Left: Category Avatar & Details */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* 44x44 Squircle Emoji Container */}
                        <div className="relative shrink-0">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs transition-transform group-hover:scale-105"
                            style={{
                              backgroundColor: cat?.color ? `${cat.color}18` : isExp ? '#fee2e2' : '#dcfce7',
                              border: `1px solid ${cat?.color ? `${cat.color}35` : 'transparent'}`
                            }}
                          >
                            <span>{catEmoji}</span>
                          </div>
                          {/* Flow indicator dot */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold ${
                              isExp ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                            }`}
                          >
                            {isExp ? '↓' : '↑'}
                          </span>
                        </div>

                        {/* Description & Metadata */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">
                              {t.description}
                            </span>

                            {/* Split Badge */}
                            {isSplit && (
                              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold py-0 gap-1 rounded-md">
                                <Users className="w-3 h-3" /> Split
                              </Badge>
                            )}

                            {/* Goal Badges */}
                            {isGoalSavings && (
                              <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold py-0 rounded-md">
                                🎯 Goal
                              </Badge>
                            )}
                            {isGoalWithdrawal && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold py-0 rounded-md">
                                ↩️ Returned
                              </Badge>
                            )}

                            {/* Need / Want Pill */}
                            {isExp && 'classification' in t && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  t.classification === 'necessary'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200/50'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200/50'
                                }`}
                              >
                                {t.classification === 'necessary' ? <Leaf className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                                {t.classification === 'necessary' ? 'Need' : 'Want'}
                              </span>
                            )}
                          </div>

                          {/* Secondary info line with payment emoji, category & merchant */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                            {cat && (
                              <span className="font-medium text-foreground flex items-center gap-1">
                                <span>{catEmoji}</span> {cat.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md text-[11px] font-medium text-foreground">
                              <span>{pmEmoji}</span> {pmName}
                            </span>
                            {isExp && 'merchant' in t && t.merchant && (
                              <span className="flex items-center gap-1">
                                <Store className="w-3 h-3 opacity-60" /> {t.merchant}
                              </span>
                            )}
                            {t.time && (
                              <span className="flex items-center gap-1 opacity-75 text-[11px]">
                                <Clock className="w-2.5 h-2.5" /> {t.time}
                              </span>
                            )}
                          </div>

                          {t.notes && (
                            <p className="text-xs text-muted-foreground/90 italic line-clamp-1">
                              📝 {t.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Quick Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className={`text-base font-bold tabular-nums tracking-tight privacy-blur ${
                            isExp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isExp ? '-' : '+'}{formatCurrency(t.amount, masterCurrency, t.currency || 'INR')}
                          </span>
                          {isExp && 'originalCurrency' in t && (t as any).originalCurrency && (t as any).originalAmount && (t as any).originalCurrency !== (t.currency || 'INR') && (
                            <p className="text-[10px] text-muted-foreground font-semibold flex items-center justify-end gap-1">
                              <span>💱</span>
                              <span className="privacy-blur tabular-nums">
                                {(t as any).originalCurrency} {((t as any).originalAmount / 100).toFixed(2)}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => handleOpenEdit(t)}
                            title="Edit Category & Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            onClick={() => {
                              setDeleteId(t.id);
                              setDeleteType(t.type);
                            }}
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open: boolean) => !open && setEditingTransaction(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>✏️</span> Edit {editingTransaction?.type === 'expense' ? 'Expense' : 'Income'}
            </DialogTitle>
          </DialogHeader>

          {editingTransaction && (
            <div className="space-y-4 py-2">
              {/* Category Selection with Emojis */}
              <div className="space-y-1.5">
                <Label htmlFor="editCat" className="font-semibold text-primary">
                  Category (Change Category) *
                </Label>
                <select
                  id="editCat"
                  value={editCategoryId}
                  onChange={e => setEditCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background rounded-xl border border-input focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  {(editingTransaction.type === 'expense' ? expenseCategories : incomeCategories).map(c => (
                    <option key={c.id} value={c.id}>
                      {getCategoryEmoji(c)} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="editDesc">Description *</Label>
                <Input
                  id="editDesc"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="editAmt">Amount ({masterCurrency.symbol} {masterCurrency.code}) *</Label>
                <Input
                  id="editAmt"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="rounded-xl font-bold"
                />
              </div>

              {/* Payment Method / Mode with Emojis */}
              {editingTransaction.type === 'expense' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="editPm">Payment Method</Label>
                  <select
                    id="editPm"
                    value={editPaymentMethodId}
                    onChange={e => setEditPaymentMethodId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    {paymentMethods.map(p => (
                      <option key={p.id} value={p.id}>
                        {getPaymentMethodEmoji(p.name)} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="editIncMode">Mode of Transaction</Label>
                  <select
                    id="editIncMode"
                    value={editIncomeMode}
                    onChange={e => setEditIncomeMode(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="Bank Transfer">🏦 Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="GPay">📱 GPay</option>
                    <option value="Cash">💵 Cash</option>
                    <option value="Cheque">📜 Cheque</option>
                    <option value="Credit Card">💳 Credit Card</option>
                    <option value="Direct Deposit">💼 Direct Deposit</option>
                    <option value="Other">✨ Other</option>
                  </select>
                </div>
              )}

              {/* Classification for expense */}
              {editingTransaction.type === 'expense' && (
                <div className="space-y-1.5">
                  <Label>Classification</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditClassification('necessary')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        editClassification === 'necessary' ? 'border-blue-500 bg-blue-500/10 text-blue-600' : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Leaf className="w-3.5 h-3.5" /> Necessary (Need)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditClassification('discretionary')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        editClassification === 'discretionary' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Discretionary (Want)
                    </button>
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="editDate">Date</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="editNotes">Notes</Label>
                <Input
                  id="editNotes"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTransaction(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveEdit} className="rounded-xl bg-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Transaction"
        description="Are you sure you want to permanently delete this transaction? This action will immediately adjust your spending totals, budgets, and analytics."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
