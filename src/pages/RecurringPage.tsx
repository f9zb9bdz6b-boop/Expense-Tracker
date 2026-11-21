// ============================================================
// RecurringPage - Subscriptions & Recurring Transactions
// ============================================================
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { recurringRepo } from '@/db/repositories';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, toMinorUnits, DEFAULT_CURRENCY, getActiveMasterCurrency } from '@/utils/currency';
import { formatDate, getCurrentDate } from '@/utils/date';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  Repeat, Plus, Calendar, Clock, Trash2, Pause, Play,
  CreditCard, CheckCircle2, AlertCircle
} from 'lucide-react';
import type { RecurringTransaction, RecurrenceFrequency, TransactionType } from '@/types';

export default function RecurringPage() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const masterCurrency = settings?.currency || getActiveMasterCurrency();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');

  const recurringList = useLiveQuery(() => db.recurringTransactions.toArray()) ?? [];
  const categories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];
  const catMap = new Map(categories.map(c => [c.id, c]));

  const totalMonthlyCommitment = recurringList
    .filter(r => r.isActive && r.type === 'expense')
    .reduce((s, r) => {
      if (r.frequency === 'yearly') return s + Math.round(r.amount / 12);
      if (r.frequency === 'weekly') return s + Math.round(r.amount * 4.33);
      if (r.frequency === 'daily') return s + (r.amount * 30);
      return s + r.amount;
    }, 0);

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo(
        '.motion-card',
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.08, clearProps: 'all' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const handleOpenAdd = () => {
    setDescription('');
    setAmount('');
    setType('expense');
    setFrequency('monthly');
    setStartDate(getCurrentDate());
    setCategoryId(categories[0]?.id || '');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const amtNum = parseFloat(amount);
    if (!description.trim() || isNaN(amtNum) || amtNum <= 0) {
      toast({ title: 'Validation Error', description: 'Enter description and valid amount.', variant: 'destructive' });
      return;
    }

    try {
      await recurringRepo.create({
        type,
        amount: toMinorUnits(amtNum),
        currency: DEFAULT_CURRENCY.code,
        categoryId: categoryId || categories[0]?.id || 'cat-exp-0',
        description: description.trim(),
        frequency,
        interval: 1,
        startDate,
        nextDueDate: startDate,
        isActive: true,
        notes: notes.trim(),
        tags: ['recurring'],
      });
      toast({ title: 'Recurring Schedule Created!' });
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error creating recurring transaction', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (item: RecurringTransaction) => {
    try {
      await recurringRepo.update(item.id, { isActive: !item.isActive });
      toast({
        title: item.isActive ? 'Subscription Paused' : 'Subscription Resumed',
      });
    } catch (err) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await recurringRepo.delete(deleteId);
      toast({ title: 'Recurring item removed' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Recurring Bills & Subscriptions</h1>
          <InfoHint
            title="Recurring Commitments"
            description="Monitor repeating commitments like Netflix, Rent, Broadband, and recurring income schedules."
          />
        </div>
        <Button
          onClick={(e) => {
            handleBtnPress(e);
            handleOpenAdd();
          }}
          className="gap-2 bg-[#7cf046] hover:bg-[#6ee33a] text-[#082b14] font-extrabold shadow-sm rounded-xl px-4 py-2 cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" /> Add Recurring
        </Button>
      </div>

      {recurringList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card className="motion-card p-4 border-border/80">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Commitment</span>
            <p className="text-2xl font-extrabold text-foreground mt-1 privacy-blur tabular-nums">
              {formatCurrency(totalMonthlyCommitment, masterCurrency)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Recurring monthly obligations</p>
          </Card>
          <Card className="motion-card p-4 border-border/80">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Services</span>
            <p className="text-2xl font-extrabold text-primary mt-1">
              <span className="privacy-blur tabular-nums">{recurringList.filter(r => r.isActive).length}</span> active
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Automated tracking enabled</p>
          </Card>
          <Card className="motion-card p-4 border-border/80">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Annualized Drain</span>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 privacy-blur tabular-nums">
              {formatCurrency(totalMonthlyCommitment * 12, masterCurrency)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Annual recurring outflow</p>
          </Card>
        </div>
      )}

      {recurringList.length === 0 ? (
        <Card className="motion-card py-16 text-center">
          <CardContent className="space-y-3">
            <Repeat className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <h3 className="text-base font-semibold">No Recurring Transactions Set</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Never miss a renewal. Add your monthly rent, gym membership, or streaming subscriptions.
            </p>
            <Button
              onClick={(e) => {
                handleBtnPress(e);
                handleOpenAdd();
              }}
              className="mt-2 transition-transform"
            >
              Add Recurring Bill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recurringList.map(item => {
            const cat = catMap.get(item.categoryId);
            return (
              <Card
                key={item.id}
                className="motion-card hover:shadow-md transition-all duration-200"
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">{item.description}</CardTitle>
                      <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-[10px] capitalize">
                        {item.isActive ? item.frequency : 'Paused'}
                      </Badge>
                    </div>
                    {cat && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-transform active:scale-90"
                      onClick={(e) => {
                        handleBtnPress(e);
                        handleToggleStatus(item);
                      }}
                    >
                      {item.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 transition-transform active:scale-90"
                      onClick={(e) => {
                        handleBtnPress(e);
                        setDeleteId(item.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Amount:</span>
                    <span className="text-lg font-bold text-foreground">
                      <span className="privacy-blur tabular-nums">{formatCurrency(item.amount, masterCurrency)}</span> <span className="text-xs font-normal text-muted-foreground">/{item.frequency}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Next Due:
                    </span>
                    <strong className="text-foreground">{formatDate(item.nextDueDate)}</strong>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recurring Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="recDesc">Description *</Label>
              <Input
                id="recDesc"
                placeholder="e.g. Netflix, Gym, Apartment Rent, Salary"
                value={description}
                onChange={e => setDescription(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recAmount">Amount ({DEFAULT_CURRENCY.symbol}) *</Label>
              <Input
                id="recAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="recType">Type</Label>
                <select
                  id="recType"
                  value={type}
                  onChange={e => setType(e.target.value as TransactionType)}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recFreq">Frequency</Label>
                <select
                  id="recFreq"
                  value={frequency}
                  onChange={e => setFrequency(e.target.value as RecurrenceFrequency)}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recDate">Next Due Date</Label>
              <Input id="recDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recNotes">Notes</Label>
              <Input id="recNotes" placeholder="Optional notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!description.trim() || !amount.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Recurring Schedule"
        description="Are you sure you want to remove this recurring schedule?"
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
