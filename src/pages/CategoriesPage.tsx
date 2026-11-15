// ============================================================
// CategoriesPage - Customizable Expense & Income Categories
// ============================================================
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { expenseCategoryRepo, incomeCategoryRepo } from '@/db/repositories';
import { formatCurrency } from '@/utils/currency';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Edit2, Trash2, Tag, Layers, Check, ShoppingBag,
  Utensils, Car, Film, GraduationCap, Heart, Home, Zap,
  Plane, CreditCard, Sparkles, Gift, MoreHorizontal
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
  const [categoryColor, setCategoryColor] = useState('#3b82f6');
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

  const handleOpenAdd = () => {
    setEditingId(null);
    setCategoryName('');
    setCategoryColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: ExpenseCategory | IncomeCategory) => {
    setEditingId(cat.id);
    setCategoryName(cat.name);
    setCategoryColor(cat.color);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) return;

    try {
      if (activeTab === 'expense') {
        if (editingId) {
          await expenseCategoryRepo.update(editingId, {
            name: categoryName.trim(),
            color: categoryColor,
          });
          toast({ title: 'Category Updated' });
        } else {
          await expenseCategoryRepo.create({
            name: categoryName.trim(),
            color: categoryColor,
            icon: 'Tag',
            order: expenseCategories.length,
            isDefault: false,
            isArchived: false,
          });
          toast({ title: 'Expense Category Created' });
        }
      } else {
        if (editingId) {
          await incomeCategoryRepo.update(editingId, {
            name: categoryName.trim(),
            color: categoryColor,
          });
          toast({ title: 'Income Category Updated' });
        } else {
          await incomeCategoryRepo.create({
            name: categoryName.trim(),
            color: categoryColor,
            icon: 'Tag',
            order: incomeCategories.length,
            isDefault: false,
            isArchived: false,
          });
          toast({ title: 'Income Category Created' });
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Category Management</h1>
          <p className="text-muted-foreground text-sm">
            Customize and organize categories for accurate spending and income breakdown.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6">
        <button
          onClick={() => setActiveTab('expense')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'expense'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Expense Categories ({expenseCategories.length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'income'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Income Categories ({incomeCategories.length})
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {currentList.map(cat => {
          const stats = currentSpendingMap.get(cat.id) ?? { total: 0, count: 0 };
          return (
            <Card key={cat.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
              <div
                className="absolute top-0 left-0 w-1.5 h-full"
                style={{ backgroundColor: cat.color }}
              />
              <CardContent className="p-4 pl-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <h3 className="text-sm font-semibold text-foreground truncate max-w-[160px]">{cat.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.total)} • {stats.count} transaction{stats.count === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenEdit(cat)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                    onClick={() => setDeleteId(cat.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
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
                placeholder="e.g. Groceries, Gym, SaaS, Dividends"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Category Color</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoryColor(c)}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-transform ${
                      categoryColor === c ? 'scale-110 ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {categoryColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="color"
                  value={categoryColor}
                  onChange={e => setCategoryColor(e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">{categoryColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!categoryName.trim()}>
              {editingId ? 'Update' : 'Create'}
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
