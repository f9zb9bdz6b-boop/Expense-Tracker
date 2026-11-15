// ============================================================
// GoalsPage - Financial Goals & Savings Progress Tracking
// ============================================================
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { goalRepo } from '@/db/repositories';
import { formatCurrency, toMinorUnits, DEFAULT_CURRENCY } from '@/utils/currency';
import { formatDate } from '@/utils/date';
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
  Target, Plus, CheckCircle2, TrendingUp, Trash2,
  DollarSign, Sparkles, Trophy
} from 'lucide-react';
import type { FinancialGoal, GoalStatus } from '@/types';

export default function GoalsPage() {
  const { toast } = useToast();
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states for Goal creation
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#3b82f6');

  // Deposit state
  const [depositAmount, setDepositAmount] = useState('');

  const goals = useLiveQuery(() => db.financialGoals.toArray()) ?? [];

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

  const handleDeposit = async () => {
    if (!selectedGoalId) return;
    const depNum = parseFloat(depositAmount);
    if (isNaN(depNum) || depNum <= 0) {
      toast({ title: 'Enter valid contribution amount', variant: 'destructive' });
      return;
    }

    try {
      await goalRepo.addContribution(selectedGoalId, toMinorUnits(depNum));
      toast({ title: 'Contribution Added!' });
      setIsDepositOpen(false);
      setDepositAmount('');
    } catch (err) {
      toast({ title: 'Error adding contribution', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Goals</h1>
          <p className="text-muted-foreground text-sm">
            Set savings targets for gadgets, travel, emergency funds, or investments.
          </p>
        </div>
        <Button onClick={() => setIsAddGoalOpen(true)} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-3">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <h3 className="text-base font-semibold">No Savings Goals Set</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Setting specific milestones increases savings discipline. Create an Emergency Fund goal or dream vacation fund today.
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

            return (
              <Card key={g.id} className="hover:shadow-md transition-shadow">
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
                      <p className="text-[11px] text-muted-foreground mt-0.5">Target: {formatDate(g.targetDate)}</p>
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

                  {!isCompleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 gap-1.5 text-xs h-8"
                      onClick={() => {
                        setSelectedGoalId(g.id);
                        setIsDepositOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Contribution
                    </Button>
                  )}
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
                placeholder="e.g. Emergency Fund (6 months), Macbook Pro, Tokyo Trip"
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

      {/* Contribution Dialog */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution to Goal</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepositOpen(false)}>Cancel</Button>
            <Button onClick={handleDeposit} disabled={!depositAmount.trim()}>Confirm Deposit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Goal"
        description="Are you sure you want to delete this financial goal?"
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
