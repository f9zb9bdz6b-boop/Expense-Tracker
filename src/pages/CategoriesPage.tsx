// ============================================================
// CategoriesPage - Customizable Categories with History Drilldown
// Featuring:
// 1. Interactive Category Transaction History Drawer/Modal
// 2. Spending KPIs & Transaction Counts per Category
// 3. Privacy Camouflage Blur on all monetary figures
// 4. Staggered GSAP Motion entrance and spring feedback
// ============================================================
import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { expenseCategoryRepo, incomeCategoryRepo } from '@/db/repositories';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, getActiveMasterCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { getCategoryEmoji, POPULAR_CATEGORY_EMOJIS } from '@/utils/emojis';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Edit2, Trash2, Tag, Layers, Check,
  Search, ArrowRight, ExternalLink, Calendar, Receipt,
  Sparkles, TrendingUp
} from 'lucide-react';
import type { ExpenseCategory, IncomeCategory, Expense, Income } from '@/types';

const PRESET_COLORS = [
  '#15803d', '#10b981', '#059669', '#3b82f6', '#6366f1',
  '#8b5cf6', '#d946ef', '#ec4899', '#f59e0b', '#ef4444',
  '#06b6d4', '#64748b'
];

export default function CategoriesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const masterCurrency = settings?.currency || getActiveMasterCurrency();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Modal states for Create/Edit
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🏷️');
  const [categoryColor, setCategoryColor] = useState('#15803d');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Drilldown History Modal State
  const [selectedCatForHistory, setSelectedCatForHistory] = useState<ExpenseCategory | IncomeCategory | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const expenseCategories = useLiveQuery(() => db.expenseCategories.orderBy('order').toArray()) ?? [];
  const incomeCategories = useLiveQuery(() => db.incomeCategories.orderBy('order').toArray()) ?? [];
  const allExpenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray()) ?? [];
  const allIncome = useLiveQuery(() => db.income.orderBy('date').reverse().toArray()) ?? [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray()) ?? [];
  const pmMap = useMemo(() => new Map(paymentMethods.map(p => [p.id, p.name])), [paymentMethods]);

  // Compute spending per category
  const expenseSpendingMap = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const e of allExpenses) {
      const cur = map.get(e.categoryId) ?? { total: 0, count: 0 };
      map.set(e.categoryId, {
        total: cur.total + e.amount,
        count: cur.count + 1,
      });
    }
    return map;
  }, [allExpenses]);

  const incomeSpendingMap = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const inc of allIncome) {
      const cur = map.get(inc.categoryId) ?? { total: 0, count: 0 };
      map.set(inc.categoryId, {
        total: cur.total + inc.amount,
        count: cur.count + 1,
      });
    }
    return map;
  }, [allIncome]);

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    gsap.fromTo('.motion-header', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'all' });
    gsap.from('.motion-controls', { y: 14, opacity: 0.3, duration: 0.5, ease: 'power2.out', delay: 0.05, clearProps: 'all' });
    gsap.from(
      '.motion-cat-card',
      { y: 18, opacity: 0.3, duration: 0.55, stagger: 0.03, ease: 'power2.out', delay: 0.08, clearProps: 'all' }
    );
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setCategoryName('');
    setCategoryEmoji(activeTab === 'expense' ? '🍔' : '💼');
    setCategoryColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: ExpenseCategory | IncomeCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(cat.id);
    setCategoryName(cat.name);
    setCategoryEmoji(getCategoryEmoji(cat));
    setCategoryColor(cat.color || '#15803d');
    setIsDialogOpen(true);
  };

  const handleDeletePrompt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      toast({ title: 'Validation Error', description: 'Category name is required', variant: 'destructive' });
      return;
    }

    try {
      const finalEmoji = categoryEmoji.trim() || getCategoryEmoji({ name: categoryName });

      if (activeTab === 'expense') {
        if (editingId) {
          await expenseCategoryRepo.update(editingId, {
            name: categoryName.trim(),
            icon: finalEmoji,
            color: categoryColor,
          });
          toast({ title: 'Category Updated!' });
        } else {
          await expenseCategoryRepo.create({
            name: categoryName.trim(),
            icon: finalEmoji,
            color: categoryColor,
            order: expenseCategories.length,
            isDefault: false,
            isArchived: false,
          });
          toast({ title: 'Category Created!' });
        }
      } else {
        if (editingId) {
          await incomeCategoryRepo.update(editingId, {
            name: categoryName.trim(),
            icon: finalEmoji,
            color: categoryColor,
          });
          toast({ title: 'Income Source Updated!' });
        } else {
          await incomeCategoryRepo.create({
            name: categoryName.trim(),
            icon: finalEmoji,
            color: categoryColor,
            order: incomeCategories.length,
            isDefault: false,
            isArchived: false,
          });
          toast({ title: 'Income Source Created!' });
        }
      }

      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error saving category', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      if (activeTab === 'expense') {
        await expenseCategoryRepo.delete(deleteId);
      } else {
        await incomeCategoryRepo.delete(deleteId);
      }
      toast({ title: 'Category Removed' });
    } catch (err) {
      toast({ title: 'Error deleting category', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const currentList = activeTab === 'expense' ? expenseCategories : incomeCategories;
  const currentSpendingMap = activeTab === 'expense' ? expenseSpendingMap : incomeSpendingMap;

  // Filtered transactions for the History Drilldown Modal
  const categoryHistoryItems = useMemo(() => {
    if (!selectedCatForHistory) return [];
    const isExpense = activeTab === 'expense';
    const list = isExpense
      ? allExpenses.filter(e => e.categoryId === selectedCatForHistory.id)
      : allIncome.filter(i => i.categoryId === selectedCatForHistory.id);

    if (!historySearchQuery.trim()) return list;
    const q = historySearchQuery.toLowerCase();
    return list.filter(item =>
      item.description.toLowerCase().includes(q) ||
      (item as Expense).merchant?.toLowerCase().includes(q)
    );
  }, [selectedCatForHistory, activeTab, allExpenses, allIncome, historySearchQuery]);

  const selectedCatStats = selectedCatForHistory
    ? currentSpendingMap.get(selectedCatForHistory.id) ?? { total: 0, count: 0 }
    : { total: 0, count: 0 };

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Categories & Tags</h1>
            <InfoHint
              title="Categories & Drilldown"
              description="Organize your cash flow with emojis. Tap any category card to view its full transaction history!"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap any category card below to inspect its detailed transaction history.
          </p>
        </div>
        <Button
          onClick={(e) => {
            handleBtnPress(e);
            handleOpenAdd();
          }}
          className="gap-2 shadow-sm cursor-pointer rounded-xl bg-[#7cf046] hover:bg-[#6ee33a] text-[#082b14] font-extrabold px-4 py-2"
        >
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {/* Tabs */}
      <div className="motion-controls flex border-b border-border space-x-6">
        <button
          onClick={() => setActiveTab('expense')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'expense'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>💸 Expense Categories</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-bold text-foreground">
            {expenseCategories.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'income'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>💰 Income Sources</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-bold text-foreground">
            {incomeCategories.length}
          </span>
        </button>
      </div>

      {/* Categories Grid with Emojis & Tap to Drilldown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {currentList.map(cat => {
          const stats = currentSpendingMap.get(cat.id) ?? { total: 0, count: 0 };
          const emoji = getCategoryEmoji(cat);

          return (
            <Card
              key={cat.id}
              onClick={() => {
                setSelectedCatForHistory(cat);
                setHistorySearchQuery('');
              }}
              className="motion-cat-card hover:shadow-md transition-all group overflow-hidden border border-border/80 cursor-pointer active:scale-98 select-none"
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Category Emoji Avatar */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-muted/60 border border-border/50 group-hover:scale-105 transition-transform"
                    style={{ borderColor: cat.color ? `${cat.color}40` : undefined }}
                  >
                    {emoji}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="privacy-blur tabular-nums font-semibold">{formatCurrency(stats.total, masterCurrency)}</span> • {stats.count} txn{stats.count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={(e) => handleOpenEdit(cat, e)}
                    title="Edit emoji & name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                    onClick={(e) => handleDeletePrompt(cat.id, e)}
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CATEGORY TRANSACTION HISTORY DRILLDOWN DIALOG */}
      <Dialog open={!!selectedCatForHistory} onOpenChange={() => setSelectedCatForHistory(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {selectedCatForHistory && (
            <>
              {/* Dialog Header with Category Badge & Aggregate Stats */}
              <div className="p-6 pb-4 border-b border-border bg-card space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shrink-0 bg-muted border border-border"
                      style={{ borderColor: selectedCatForHistory.color ? `${selectedCatForHistory.color}60` : undefined }}
                    >
                      {getCategoryEmoji(selectedCatForHistory)}
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                        {selectedCatForHistory.name}
                        <Badge variant="outline" className="text-xs font-bold uppercase">
                          {activeTab}
                        </Badge>
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Historical ledger activity & audit for this category
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-semibold">Total Cumulative</p>
                    <p className="text-xl font-extrabold text-primary privacy-blur tabular-nums">
                      {formatCurrency(selectedCatStats.total, masterCurrency)}
                    </p>
                  </div>
                </div>

                {/* Search Bar & Action within Category */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={`Search in ${selectedCatForHistory.name}...`}
                      value={historySearchQuery}
                      onChange={e => setHistorySearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>
                  {activeTab === 'expense' && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/add-expense?categoryId=${selectedCatForHistory.id}`)}
                      className="gap-1.5 h-9 rounded-xl text-xs font-bold shrink-0 bg-primary text-primary-foreground"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log in this Category
                    </Button>
                  )}
                </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
                {categoryHistoryItems.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Receipt className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
                    <p className="text-sm font-semibold text-foreground">No Transactions Found</p>
                    <p className="text-xs text-muted-foreground">
                      No records match this category yet. Record an expense or income to populate this history.
                    </p>
                  </div>
                ) : (
                  categoryHistoryItems.map(item => {
                    const isExp = 'classification' in item;
                    const exp = item as Expense;
                    const pmName = exp.paymentMethodId ? pmMap.get(exp.paymentMethodId) : null;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground truncate">
                              {item.description}
                            </span>
                            {isExp && exp.classification && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] font-bold uppercase ${
                                  exp.classification === 'necessary'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {exp.classification === 'necessary' ? 'Need' : 'Want'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(item.date)}</span>
                            {exp.merchant && <span>• {exp.merchant}</span>}
                            {pmName && <span>• {pmName}</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-sm font-extrabold privacy-blur tabular-nums ${
                            activeTab === 'expense' ? 'text-rose-600' : 'text-emerald-600 dark:text-[#7cf046]'
                          }`}>
                            {activeTab === 'expense' ? '-' : '+'}{formatCurrency(item.amount, masterCurrency)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-border bg-card flex justify-between items-center text-xs text-muted-foreground px-6">
                <span>Showing {categoryHistoryItems.length} transactions</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedCatForHistory(null)} className="rounded-xl">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Category' : `Create ${activeTab === 'expense' ? 'Expense' : 'Income'} Category`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="catName">Category Name *</Label>
              <Input
                id="catName"
                placeholder="e.g. Dining Out, Groceries, Freelance"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category Emoji</Label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-border bg-muted/40">
                  {categoryEmoji}
                </div>
                <Input
                  value={categoryEmoji}
                  onChange={e => setCategoryEmoji(e.target.value)}
                  className="w-20 text-center text-lg rounded-xl"
                  placeholder="🍔"
                  maxLength={4}
                />
              </div>

              {/* Quick Popular Emojis picker */}
              <div className="flex flex-wrap gap-1 pt-2">
                {POPULAR_CATEGORY_EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setCategoryEmoji(em)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-base transition-colors cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Color Accent</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoryColor(c)}
                    className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {categoryColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl font-bold">
              {editingId ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Category?"
        description="Deleting this category will not delete the associated transactions, but will unlink them."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
