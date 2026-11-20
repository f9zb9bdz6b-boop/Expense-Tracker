// ============================================================
// GoalsPage - Financial Goals & Savings Progress Tracking
// ============================================================
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { goalRepo } from '@/db/repositories';
import { formatCurrency, toMinorUnits, DEFAULT_CURRENCY } from '@/utils/currency';
import { formatDate, getCurrentDate } from '@/utils/date';
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
  Target, Plus, Minus, CheckCircle2, TrendingUp, Trash2,
  DollarSign, Sparkles, Trophy, ChevronDown, ChevronUp, History, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import type { FinancialGoal, SavingsContribution } from '@/types';

const CONTRIBUTION_SOURCES = [
  'Current Savings / General Balance',
  'Salary Allocation',
  'Bonus / Gift',
  'Side Income',
  'Fixed Deposit / Investment',
  'Other',
];

const WITHDRAWAL_REASONS = [
  'Return to Normal Savings',
  'Needed for Emergency',
  'Transferred to Special Event',
  'Purchased Target Milestone',
  'Other',
];

export default function GoalsPage() {
  const { toast } = useToast();
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // Form states for Goal creation
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#3b82f6');

  // Contribution Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(getCurrentDate());
  const [depositSource, setDepositSource] = useState(CONTRIBUTION_SOURCES[0]);
  const [customDepositSource, setCustomDepositSource] = useState('');
  const [deductFromSavings, setDeductFromSavings] = useState(true);
  const [depositNotes, setDepositNotes] = useState('');

  // Withdrawal Form states
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(getCurrentDate());
  const [withdrawReason, setWithdrawReason] = useState(WITHDRAWAL_REASONS[0]);
  const [customWithdrawReason, setCustomWithdrawReason] = useState('');
  const [returnToSavings, setReturnToSavings] = useState(true);
  const [withdrawNotes, setWithdrawNotes] = useState('');

  const goals = useLiveQuery(() => db.financialGoals.toArray()) ?? [];
  const contributions = useLiveQuery(() => db.savingsContributions.toArray()) ?? [];

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo(
        '.motion-goal-card',
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

  const handleCreateGoal = async () => {
    const targetNum = parseFloat(targetAmount);
    if (!name.trim() || isNaN(targetNum) || targetNum <= 0) {
      toast({ title: 'Validation Error', description: 'Enter valid goal name and target amount.', variant: 'destructive' });
      return;
    }

    try {
      await goalRepo.create({
        name: name.trim(),
        description: description.trim(),
        targetAmount: toMinorUnits(targetNum),
        currentAmount: 0,
        currency: DEFAULT_CURRENCY.code,
        targetDate: targetDate || undefined,
        status: 'active',
        icon: 'Target',
        color,
        notes: '',
      });
      toast({ title: 'Goal Created!' });
      setIsAddGoalOpen(false);
      setName('');
      setDescription('');
      setTargetAmount('');
      setTargetDate('');
    } catch (err) {
      toast({ title: 'Error creating goal', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleOpenDeposit = (goal: FinancialGoal) => {
    setSelectedGoal(goal);
    setDepositAmount('');
    setDepositDate(getCurrentDate());
    setDepositSource(CONTRIBUTION_SOURCES[0]);
    setCustomDepositSource('');
    setDeductFromSavings(true);
    setDepositNotes('');
    setIsDepositOpen(true);
  };

  const handleDeposit = async () => {
    if (!selectedGoal) return;
    const depNum = parseFloat(depositAmount);
    if (isNaN(depNum) || depNum <= 0) {
      toast({ title: 'Enter valid contribution amount', variant: 'destructive' });
      return;
    }

    const resolvedSource = depositSource === 'Other' && customDepositSource.trim()
      ? customDepositSource.trim()
      : depositSource;

    try {
      await goalRepo.addContribution(selectedGoal.id, toMinorUnits(depNum), {
        source: resolvedSource,
        notes: depositNotes.trim(),
        deductFromSavings,
        date: depositDate,
      });
      toast({
        title: 'Contribution Added!',
        description: deductFromSavings
          ? `${formatCurrency(toMinorUnits(depNum))} deducted from savings & added to ${selectedGoal.name}`
          : `${formatCurrency(toMinorUnits(depNum))} added to ${selectedGoal.name}`,
      });
      setIsDepositOpen(false);
    } catch (err) {
      toast({ title: 'Error adding contribution', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleOpenWithdraw = (goal: FinancialGoal) => {
    setSelectedGoal(goal);
    setWithdrawAmount('');
    setWithdrawDate(getCurrentDate());
    setWithdrawReason(WITHDRAWAL_REASONS[0]);
    setCustomWithdrawReason('');
    setReturnToSavings(true);
    setWithdrawNotes('');
    setIsWithdrawOpen(true);
  };

  const handleWithdraw = async () => {
    if (!selectedGoal) return;
    const withNum = parseFloat(withdrawAmount);
    if (isNaN(withNum) || withNum <= 0) {
      toast({ title: 'Enter valid withdrawal amount', variant: 'destructive' });
      return;
    }

    const minorUnits = toMinorUnits(withNum);
    if (minorUnits > selectedGoal.currentAmount) {
      toast({ title: 'Amount exceeds current savings', description: `Maximum available to withdraw is ${formatCurrency(selectedGoal.currentAmount)}.`, variant: 'destructive' });
      return;
    }

    const resolvedReason = withdrawReason === 'Other' && customWithdrawReason.trim()
      ? customWithdrawReason.trim()
      : withdrawReason;

    try {
      await goalRepo.withdrawContribution(selectedGoal.id, minorUnits, {
        reason: resolvedReason,
        returnToSavings,
        date: withdrawDate,
      });
      toast({
        title: 'Contribution Withdrawn!',
        description: returnToSavings
          ? `${formatCurrency(minorUnits)} returned to normal savings/balance & recorded in Transactions.`
          : `${formatCurrency(minorUnits)} removed from ${selectedGoal.name}.`,
      });
      setIsWithdrawOpen(false);
    } catch (err) {
      toast({ title: 'Error withdrawing contribution', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await goalRepo.delete(deleteId);
      toast({ title: 'Goal Removed' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Goals & Savings</h1>
          <p className="text-muted-foreground text-sm">
            Set savings targets, track source of contributions, withdraw funds when needed, and sync with transactions.
          </p>
        </div>
        <Button
          onClick={e => {
            handleBtnPress(e);
            setIsAddGoalOpen(true);
          }}
          className="gap-2 shadow-sm cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-3">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <h3 className="text-base font-semibold">No Savings Goals Set</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Setting milestones increases financial discipline. Allocate money from savings to specific targets with full transaction history.
            </p>
            <Button onClick={() => setIsAddGoalOpen(true)} className="mt-2">
              Set Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const isCompleted = g.currentAmount >= g.targetAmount;
            const goalContribs = contributions.filter(c => c.goalId === g.id);
            const isExpanded = expandedGoalId === g.id;

            return (
              <Card key={g.id} className="motion-goal-card hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">{g.name}</CardTitle>
                      {isCompleted && (
                        <Badge className="bg-emerald-500 text-white gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </Badge>
                      )}
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                    {g.targetDate && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Target Date: {formatDate(g.targetDate)}</p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                    onClick={() => setDeleteId(g.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">{Math.round(pct)}% achieved</span>
                      <span className="text-muted-foreground">
                        {isCompleted ? 'Goal Reached!' : `Remaining: ${formatCurrency(remaining)}`}
                      </span>
                    </div>
                    <Progress value={Math.min(100, pct)} className="h-2.5" />
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 border-t">
                    <span>Saved: <strong className="text-foreground">{formatCurrency(g.currentAmount)}</strong></span>
                    <span>Target: <strong className="text-foreground">{formatCurrency(g.targetAmount)}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-xs h-8"
                      onClick={() => handleOpenDeposit(g)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Contribution
                    </Button>
                    {g.currentAmount > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => handleOpenWithdraw(g)}
                        title="Withdraw or reallocate funds"
                      >
                        <Minus className="w-3.5 h-3.5" /> Withdraw
                      </Button>
                    )}
                  </div>

                  {/* Contribution & Withdrawal Activity */}
                  <div className="pt-2 border-t">
                    <button
                      onClick={() => setExpandedGoalId(isExpanded ? null : g.id)}
                      className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline w-full justify-between"
                    >
                      <span className="flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Activity & Sources ({goalContribs.length})
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 space-y-2">
                        {goalContribs.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No contributions recorded yet.</p>
                        ) : (
                          <div className="divide-y text-xs max-h-48 overflow-y-auto">
                            {goalContribs.map(c => {
                              const isPositive = c.amount >= 0;
                              return (
                                <div key={c.id} className="py-2 flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-1.5 font-medium">
                                      {isPositive ? (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500 text-emerald-600">
                                          + Contribution
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500 text-amber-600">
                                          - Withdrawal
                                        </Badge>
                                      )}
                                      <span className="text-foreground">{c.source || 'Direct Deposit'}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {formatDate(c.date)}
                                      {c.deductFromSavings && ' • Deducted from balance'}
                                      {c.notes && ` • "${c.notes}"`}
                                    </p>
                                  </div>
                                  <span className={`font-semibold shrink-0 ml-2 ${isPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {isPositive ? '+' : ''}{formatCurrency(c.amount)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Financial Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="goalName">Goal Name *</Label>
              <Input
                id="goalName"
                placeholder="e.g. Emergency Fund, Laptop, Vacation"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goalTarget">Target Amount ({DEFAULT_CURRENCY.symbol}) *</Label>
              <Input
                id="goalTarget"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goalDate">Target Date (Optional)</Label>
              <Input id="goalDate" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goalDesc">Description (Optional)</Label>
              <Input
                id="goalDesc"
                placeholder="e.g. Save 10,000 every month towards this"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddGoalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGoal} disabled={!name.trim() || !targetAmount.trim()}>Create Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Contribution Dialog */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution to {selectedGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="depAmt">Contribution Amount ({DEFAULT_CURRENCY.symbol}) *</Label>
              <Input
                id="depAmt"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="depDate">Date</Label>
              <Input
                id="depDate"
                type="date"
                value={depositDate}
                onChange={e => setDepositDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="depSource">Where did this money come from? (Source)</Label>
              <select
                id="depSource"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={depositSource}
                onChange={e => setDepositSource(e.target.value)}
              >
                {CONTRIBUTION_SOURCES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {depositSource === 'Other' && (
              <div className="space-y-1.5">
                <Label htmlFor="customSource">Specify Source</Label>
                <Input
                  id="customSource"
                  placeholder="e.g. Sold old gadget, Freelance project"
                  value={customDepositSource}
                  onChange={e => setCustomDepositSource(e.target.value)}
                />
              </div>
            )}

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={deductFromSavings}
                  onChange={e => setDeductFromSavings(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-foreground leading-snug">
                  <strong>Deduct from normal savings / general balance</strong>
                  <br />
                  <span className="text-muted-foreground text-[11px]">
                    Records this contribution as a transaction in your Transaction history so your total account balance stays accurate.
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="depNotes">Additional Details / Notes (Optional)</Label>
              <Input
                id="depNotes"
                placeholder="e.g. Transferred from HDFC Bank, 1st installment"
                value={depositNotes}
                onChange={e => setDepositNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepositOpen(false)}>Cancel</Button>
            <Button onClick={handleDeposit} disabled={!depositAmount.trim()}>Confirm Contribution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal / Remove Contribution Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds from {selectedGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <p className="text-xs text-muted-foreground">
              Currently saved in goal: <strong>{selectedGoal ? formatCurrency(selectedGoal.currentAmount) : ''}</strong>
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="withAmt">Withdraw Amount ({DEFAULT_CURRENCY.symbol}) *</Label>
              <Input
                id="withAmt"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="withDate">Date</Label>
              <Input
                id="withDate"
                type="date"
                value={withdrawDate}
                onChange={e => setWithdrawDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="withReason">Reason / Destination of Funds</Label>
              <select
                id="withReason"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={withdrawReason}
                onChange={e => setWithdrawReason(e.target.value)}
              >
                {WITHDRAWAL_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {withdrawReason === 'Other' && (
              <div className="space-y-1.5">
                <Label htmlFor="customWithReason">Specify Reason</Label>
                <Input
                  id="customWithReason"
                  placeholder="e.g. Urgent car repair, reallocation"
                  value={customWithdrawReason}
                  onChange={e => setCustomWithdrawReason(e.target.value)}
                />
              </div>
            )}

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={returnToSavings}
                  onChange={e => setReturnToSavings(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-foreground leading-snug">
                  <strong>Return to normal savings / general balance</strong>
                  <br />
                  <span className="text-muted-foreground text-[11px]">
                    Records this reclaimed amount as income in your Transactions so your active balance is restored.
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="withNotes">Notes (Optional)</Label>
              <Input
                id="withNotes"
                placeholder="e.g. Funds needed for urgent bill"
                value={withdrawNotes}
                onChange={e => setWithdrawNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>Cancel</Button>
            <Button onClick={handleWithdraw} disabled={!withdrawAmount.trim()} variant="destructive">
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Goal"
        description="Are you sure you want to delete this financial goal? Previous transactions will remain preserved."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
