// ============================================================
// BudgetsPage - Flexible Budgeting System with Real-Time Alerts
// ============================================================
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { budgetRepo } from '@/db/repositories';
import { formatCurrency, toMinorUnits, DEFAULT_CURRENCY } from '@/utils/currency';
import { getCurrentDate } from '@/utils/date';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Target, Plus, AlertTriangle, CheckCircle2, Trash2,
  Edit2, TrendingUp, ShieldAlert, Sparkles
} from 'lucide-react';
import type { Budget, BudgetPeriod } from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function BudgetsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Load active budgets, expenses and categories
  const budgets = useLiveQuery(() => db.budgets.toArray()) ?? [];
  const categories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const monthExpenses = useLiveQuery(() =>
    db.expenses.where('date').between(monthStart, monthEnd, true, true).toArray()
  ) ?? [];

  const catMap = new Map(categories.map(c => [c.id, c]));

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo(
        '.motion-budget-card',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out', delay: 0.08, clearProps: 'all' }
      );
      gsap.fromTo(
        '.motion-meter',
        { scaleX: 0, transformOrigin: 'left' },
        { scaleX: 1, duration: 0.75, stagger: 0.06, ease: 'power2.out', delay: 0.2, clearProps: 'transformOrigin' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setPeriod('monthly');
    setCategoryId('');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setEditingId(b.id);
    setName(b.name);
    setAmount((b.amount / 100).toString());
    setPeriod(b.period);
    setCategoryId(b.categoryId || '');
    setNotes(b.notes || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Invalid Input', description: 'Please enter a valid budget name and amount.', variant: 'destructive' });
      return;
    }

    try {
      const minorUnits = toMinorUnits(parsedAmount);
      if (editingId) {
        await budgetRepo.update(editingId, {
          name: name.trim(),
          amount: minorUnits,
          period,
          categoryId: categoryId || undefined,
          notes: notes.trim(),
        });
        toast({ title: 'Budget Updated' });
      } else {
        await budgetRepo.create({
          name: name.trim(),
          amount: minorUnits,
          period,
          categoryId: categoryId || undefined,
          startDate: getCurrentDate(),
          isActive: true,
          alertThresholds: [50, 75, 90, 100],
          currency: DEFAULT_CURRENCY.code,
          notes: notes.trim(),
        });
        toast({ title: 'Budget Created' });
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error saving budget', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await budgetRepo.delete(deleteId);
      toast({ title: 'Budget Removed' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budget Management</h1>
          <p className="text-muted-foreground text-sm">
            Set and monitor overall or category-specific spending caps with real-time alerts.
          </p>
        </div>
        <Button
          onClick={e => {
            handleBtnPress(e);
            handleOpenAdd();
          }}
          className="gap-2 shadow-sm cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" /> Create Budget
        </Button>
      </div>

      {/* Budgets Grid */}
      {budgets.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-3">
            <Target className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <h3 className="text-base font-semibold">No Budgets Configured</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Setting budgets helps you avoid overspending. Create your first budget for general expenses or specific categories like Dining Out or Entertainment.
            </p>
            <Button onClick={handleOpenAdd} className="mt-2">
              Create Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => {
            let spent = 0;
            if (b.categoryId) {
              spent = monthExpenses
                .filter(e => e.categoryId === b.categoryId)
                .reduce((s, e) => s + e.amount, 0);
            } else {
              spent = monthExpenses.reduce((s, e) => s + e.amount, 0);
            }

            const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
            const remaining = Math.max(0, b.amount - spent);
            const isExceeded = spent > b.amount;
            const isWarning = pct >= 80 && !isExceeded;
            const cat = b.categoryId ? catMap.get(b.categoryId) : null;

            return (
              <Card key={b.id} className="motion-budget-card hover:shadow-md transition-shadow relative overflow-hidden">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">{b.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {b.period}
                      </Badge>
                    </div>
                    {cat ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                        Category: {cat.name}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Overall Spending Limit</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(b)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                      onClick={() => setDeleteId(b.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">
                        {Math.round(pct)}% used
                      </span>
                      <span className={`font-semibold ${isExceeded ? 'text-rose-600' : 'text-muted-foreground'}`}>
                        {isExceeded ? `Over by ${formatCurrency(spent - b.amount)}` : `Remaining: ${formatCurrency(remaining)}`}
                      </span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`motion-meter h-full transition-all rounded-full ${
                          isExceeded
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Spent: <strong className="text-foreground">{formatCurrency(spent)}</strong></span>
                    <span>Cap: <strong className="text-foreground">{formatCurrency(b.amount)}</strong></span>
                  </div>

                  {isExceeded && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Budget exceeded! Cut back discretionary spending.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bName">Budget Name *</Label>
              <Input
                id="bName"
                placeholder="e.g. Monthly Grocery Cap, Overall Dining Limit"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bAmount">Budget Amount ({DEFAULT_CURRENCY.symbol}) *</Label>
              <Input
                id="bAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bPeriod">Period</Label>
              <select
                id="bPeriod"
                value={period}
                onChange={e => setPeriod(e.target.value as BudgetPeriod)}
                className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bCategory">Category (Optional)</Label>
              <select
                id="bCategory"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Overall Spending (All Categories)</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bNotes">Notes (Optional)</Label>
              <Input
                id="bNotes"
                placeholder="e.g. Avoid ordering delivery during weekdays"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !amount.trim()}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Budget"
        description="Are you sure you want to delete this budget limit?"
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
