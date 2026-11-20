// ============================================================
// CategoriesPage - Customizable Expense & Income Categories with Emojis
// ============================================================
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { expenseCategoryRepo, incomeCategoryRepo } from '@/db/repositories';
import { formatCurrency } from '@/utils/currency';
import { getCategoryEmoji, POPULAR_CATEGORY_EMOJIS } from '@/utils/emojis';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Edit2, Trash2, Tag, Layers, Check
} from 'lucide-react';
import type { ExpenseCategory, IncomeCategory } from '@/types';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#ec4899', '#64748b'
];

export default function CategoriesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Modal states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🏷️');
  const [categoryColor, setCategoryColor] = useState('#10b981');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const expenseCategories = useLiveQuery(() => db.expenseCategories.orderBy('order').toArray()) ?? [];
  const incomeCategories = useLiveQuery(() => db.incomeCategories.orderBy('order').toArray()) ?? [];
  const allExpenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const allIncome = useLiveQuery(() => db.income.toArray()) ?? [];

  // Compute spending per category
  const expenseSpendingMap = new Map<string, { total: number; count: number }>();
  for (const e of allExpenses) {
    const cur = expenseSpendingMap.get(e.categoryId) ?? { total: 0, count: 0 };
    expenseSpendingMap.set(e.categoryId, {
      total: cur.total + e.amount,
      count: cur.count + 1,
    });
  }

  const incomeSpendingMap = new Map<string, { total: number; count: number }>();
  for (const inc of allIncome) {
    const cur = incomeSpendingMap.get(inc.categoryId) ?? { total: 0, count: 0 };
    incomeSpendingMap.set(inc.categoryId, {
      total: cur.total + inc.amount,
      count: cur.count + 1,
    });
  }

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', clearProps: 'all' });
      gsap.fromTo('.motion-controls', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', delay: 0.08, clearProps: 'all' });
      gsap.fromTo(
        '.motion-cat-card',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.035, ease: 'power3.out', delay: 0.12, clearProps: 'all' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setCategoryName('');
    setCategoryEmoji(activeTab === 'expense' ? '🍔' : '💼');
    setCategoryColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: ExpenseCategory | IncomeCategory) => {
    setEditingId(cat.id);
    setCategoryName(cat.name);
    setCategoryEmoji(getCategoryEmoji(cat));
    setCategoryColor(cat.color || '#10b981');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) return;

    try {
      const finalEmoji = categoryEmoji.trim() || getCategoryEmoji({ name: categoryName });
      if (activeTab === 'expense') {
        if (editingId) {
          await expenseCategoryRepo.update(editingId, {
            name: categoryName.trim(),
            icon: finalEmoji,
            color: categoryColor,
          });
          toast({ title: 'Category Updated', description: `${finalEmoji} ${categoryName.trim()} saved.` });
        } else {
          await expenseCategoryRepo.create({
            name: categoryName.trim(),
            icon: finalEmoji,
            color: categoryColor,
            order: expenseCategories.length,
            isDefault: false,
            isArchived: false,
          });
          toast({ title: 'Expense Category Created', description: `${finalEmoji} ${categoryName.trim()} added.` });
        }
      } else {
        if (editingId) {
          await incomeCategoryRepo.update(editingId, {
            name: categoryName.trim(),
            icon: finalEmoji,
            color: categoryColor,
          });
          toast({ title: 'Income Category Updated', description: `${finalEmoji} ${categoryName.trim()} saved.` });
        } else {
          await incomeCategoryRepo.create({
            name: categoryName.trim(),
            icon: finalEmoji,
            color: categoryColor,
            order: incomeCategories.length,
            isDefault: false,
            isArchived: false,
          });
          toast({ title: 'Income Category Created', description: `${finalEmoji} ${categoryName.trim()} added.` });
        }
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast({
        title: 'Error saving category',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
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
      toast({ title: 'Category Deleted' });
    } catch (err) {
      toast({
        title: 'Cannot Delete Category',
        description: err instanceof Error ? err.message : 'Category is in use by transactions.',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const currentList = activeTab === 'expense' ? expenseCategories : incomeCategories;
  const currentSpendingMap = activeTab === 'expense' ? expenseSpendingMap : incomeSpendingMap;

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories & Tags</h1>
          <InfoHint
            title="Category Management"
            description="Organize expenses and income with expressive emojis, custom color tags, and transaction tracking."
          />
        </div>
        <Button
          onClick={e => {
            handleBtnPress(e);
            handleOpenAdd();
          }}
          className="gap-2 shadow-xs cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {/* Tabs */}
      <div className="motion-controls flex border-b border-border space-x-6">
        <button
          onClick={() => setActiveTab('expense')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'expense'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>💸 Expense Categories</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-normal text-foreground">
            {expenseCategories.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'income'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>💰 Income Categories</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-normal text-foreground">
            {incomeCategories.length}
          </span>
        </button>
      </div>

      {/* Categories Grid with Emojis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {currentList.map(cat => {
          const stats = currentSpendingMap.get(cat.id) ?? { total: 0, count: 0 };
          const emoji = getCategoryEmoji(cat);

          return (
            <Card key={cat.id} className="motion-cat-card hover:shadow-md transition-all group overflow-hidden border border-border">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Category Emoji Avatar */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-muted/60 border border-border/50 group-hover:scale-105 transition-transform">
                    {emoji}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="text-sm font-semibold text-foreground truncate">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatCurrency(stats.total)} • {stats.count} txn{stats.count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => handleOpenEdit(cat)}
                    title="Edit emoji & name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                    onClick={() => setDeleteId(cat.id)}
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

      {/* Create / Edit Dialog with Emoji Customization */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Category' : `Create ${activeTab === 'expense' ? 'Expense' : 'Income'} Category`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Emoji Customization Picker & Preview */}
            <div className="space-y-2">
              <Label>Category Emoji *</Label>
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                <div className="text-4xl w-14 h-14 rounded-xl flex items-center justify-center bg-card border shadow-xs select-none">
                  {categoryEmoji || '🏷️'}
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Type or paste any emoji..."
                    value={categoryEmoji}
                    onChange={e => setCategoryEmoji(e.target.value)}
                    className="text-base"
                    maxLength={4}
                  />
                  <p className="text-[11px] text-muted-foreground">Pick from presets below or type any emoji from your keyboard.</p>
                </div>
              </div>

              {/* Preset Quick-Click Emojis */}
              <div className="space-y-1 pt-1">
                <span className="text-xs text-muted-foreground font-medium">Quick Pick:</span>
                <div className="grid grid-cols-10 gap-1.5 p-2 rounded-lg border bg-card max-h-36 overflow-y-auto">
                  {POPULAR_CATEGORY_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setCategoryEmoji(em)}
                      className={`h-8 w-8 flex items-center justify-center text-lg rounded-md hover:bg-muted transition-transform ${
                        categoryEmoji === em ? 'bg-primary/15 ring-2 ring-primary scale-110' : ''
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Name */}
            <div className="space-y-1.5">
              <Label htmlFor="catName">Category Name *</Label>
              <Input
                id="catName"
                placeholder="e.g. Groceries, Coffee, Gym, SaaS"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!categoryName.trim()}>
              {editingId ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Category"
        description="Are you sure you want to delete this category? Note: Categories currently linked to existing transactions cannot be deleted to protect historical data integrity."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
