// ============================================================
// TransactionsPage - Transaction History, Search, Filters & Export
// ============================================================
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { expenseRepo, incomeRepo } from '@/db/repositories';
import { formatCurrency, DEFAULT_CURRENCY } from '@/utils/currency';
import { formatDate, formatRelativeDate } from '@/utils/date';
import { downloadFile } from '@/utils/helpers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Search, Filter, ArrowUpRight, ArrowDownLeft, Trash2, Edit2,
  Download, Plus, RefreshCw, X, Calendar, Layers, Tag
} from 'lucide-react';
import type { Expense, Income, ExpenseCategory, PaymentMethod } from '@/types';

type CombinedTransaction = (Expense | Income) & {
  type: 'expense' | 'income';
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Deletion modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'expense' | 'income'>('expense');

  // Load from Dexie reactive queries
  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray()) ?? [];
  const incomeList = useLiveQuery(() => db.income.orderBy('date').reverse().toArray()) ?? [];
  const categories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray()) ?? [];

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
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
      const pmName = isExp && 'paymentMethodId' in t ? pmMap.get(t.paymentMethodId)?.name || 'Cash' : 'N/A';
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
    <div className="space-y-6">
      {/* Top Header & Quick Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground text-sm">
            Search, filter, inspect, and export your entire financial history.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/add-expense')} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <Input
                placeholder="Search description, merchant, or notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
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

            {/* Type Filter Buttons */}
            <div className="flex rounded-lg border bg-muted/40 p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('expense')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'expense' ? 'bg-background shadow-sm text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveTab('income')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'income' ? 'bg-background shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Secondary Filters: Category, Needs/Wants, Dates, Sort */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {/* Category Select */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Category</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Classification (Needs / Wants) */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Classification</label>
              <select
                value={selectedClassification}
                onChange={e => setSelectedClassification(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All (Needs & Wants)</option>
                <option value="necessary">Necessary (Needs)</option>
                <option value="discretionary">Discretionary (Wants)</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {filteredTransactions.length} Record{filteredTransactions.length === 1 ? '' : 's'} Found
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Sort by:</span>
            <button
              onClick={() => {
                if (sortField === 'date') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortField('date'); setSortOrder('desc'); }
              }}
              className={`font-semibold ${sortField === 'date' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Date {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortField === 'amount') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortField('amount'); setSortOrder('desc'); }
              }}
              className={`font-semibold ${sortField === 'amount' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Amount {sortField === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">No matching transactions</p>
              <p className="text-xs mt-1">Try clearing filters or search query to see past transactions.</p>
              {(searchQuery || selectedCategory !== 'all' || startDate || endDate) && (
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
                  className="mt-4"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredTransactions.map(t => {
                const isExp = t.type === 'expense';
                const cat = catMap.get(t.categoryId);
                const pm = isExp && 'paymentMethodId' in t ? pmMap.get(t.paymentMethodId) : null;

                return (
                  <div
                    key={t.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 px-3 rounded-xl transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isExp ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {isExp ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{t.description}</p>
                          {isExp && 'classification' in t && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold py-0 ${
                                t.classification === 'necessary' ? 'border-blue-500/40 text-blue-600' : 'border-amber-500/40 text-amber-600'
                              }`}
                            >
                              {t.classification === 'necessary' ? 'Need' : 'Want'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatDate(t.date)}</span>
                          {t.time && <span>• {t.time}</span>}
                          {cat && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </span>
                          )}
                          {isExp && 'merchant' in t && t.merchant && <span>• {t.merchant}</span>}
                          {pm && <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{pm.name}</span>}
                        </div>

                        {t.notes && <p className="text-xs text-muted-foreground italic">{t.notes}</p>}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <span className={`text-base font-bold ${isExp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isExp ? '-' : '+'}{formatCurrency(t.amount)}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => {
                            setDeleteId(t.id);
                            setDeleteType(t.type);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
