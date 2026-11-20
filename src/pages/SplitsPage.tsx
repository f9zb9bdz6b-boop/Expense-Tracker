// ============================================================
// SplitsPage - Expense Splitting & Settlement Tracking
// ============================================================
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { splitRepo, expenseRepo } from '@/db/repositories';
import { formatCurrency, toMinorUnits, DEFAULT_CURRENCY } from '@/utils/currency';
import { animateSpringPress, animateHoverLift } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Users, Plus, CheckCircle2, Clock, Trash2,
  DollarSign, UserCheck, ArrowRight
} from 'lucide-react';
import type { ExpenseSplit, SplitParticipant } from '@/types';

interface ParticipantEntry {
  name: string;
  share: string;
}

export default function SplitsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [participants, setParticipants] = useState<ParticipantEntry[]>([
    { name: 'Me', share: '' },
    { name: '', share: '' },
  ]);

  const splits = useLiveQuery(() => db.expenseSplits.toArray()) ?? [];
  const allParticipants = useLiveQuery(() => db.splitParticipants.toArray()) ?? [];

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  const handleCardHover = contextSafe((e: React.MouseEvent<HTMLElement>, isEntering: boolean) => {
    animateHoverLift(e.currentTarget, isEntering);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.motion-header', { y: -16, opacity: 0, duration: 0.5, ease: 'power3.out' });
      gsap.from('.motion-card', { y: 22, opacity: 0, scale: 0.96, duration: 0.45, stagger: 0.08, ease: 'back.out(1.3)', delay: 0.1 });
    }, pageRef);
    return () => ctx.revert();
  }, [splits.length]);

  const handleAddParticipant = () => {
    setParticipants([...participants, { name: '', share: '' }]);
  };

  const handleParticipantChange = (index: number, field: 'name' | 'share', value: string) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 2) return;
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSplitEqually = () => {
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0 || participants.length === 0) return;
    const splitVal = (total / participants.length).toFixed(2);
    setParticipants(participants.map(p => ({ ...p, share: splitVal })));
  };

  const handleSaveSplit = async () => {
    const totalNum = parseFloat(totalAmount);
    if (!description.trim() || isNaN(totalNum) || totalNum <= 0) {
      toast({ title: 'Validation Error', description: 'Enter description and valid total amount.', variant: 'destructive' });
      return;
    }

    const validParticipants = participants.filter(p => p.name.trim() && parseFloat(p.share) > 0);
    if (validParticipants.length < 2) {
      toast({ title: 'Minimum 2 participants with shares required', variant: 'destructive' });
      return;
    }

    try {
      const categories = await db.expenseCategories.toArray();
      const pms = await db.paymentMethods.toArray();
      const expense = await expenseRepo.create({
        amount: toMinorUnits(totalNum),
        currency: DEFAULT_CURRENCY.code,
        categoryId: categories[0]?.id || 'cat-exp-0',
        paymentMethodId: pms[0]?.id || 'pm-0',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        description: `[Split] ${description.trim()}`,
        merchant: 'Split Bill',
        classification: 'discretionary',
        notes: `Split among: ${validParticipants.map(p => `${p.name} (${DEFAULT_CURRENCY.symbol}${p.share})`).join(', ')}`,
        tags: ['split-bill'],
        isRecurring: false,
      });

      const split = await splitRepo.create({
        expenseId: expense.id,
        totalAmount: toMinorUnits(totalNum),
        currency: DEFAULT_CURRENCY.code,
        description: description.trim(),
        isSettled: false,
        notes: '',
      });

      for (const p of validParticipants) {
        await splitRepo.addParticipant({
          splitId: split.id,
          name: p.name.trim(),
          shareAmount: toMinorUnits(parseFloat(p.share)),
          paidAmount: p.name.toLowerCase() === 'me' ? toMinorUnits(totalNum) : 0,
          isSettled: p.name.toLowerCase() === 'me',
        });
      }

      toast({ title: 'Split Bill Created!' });
      setIsDialogOpen(false);
      setDescription('');
      setTotalAmount('');
      setParticipants([
        { name: 'Me', share: '' },
        { name: '', share: '' },
      ]);
    } catch (err) {
      toast({ title: 'Error saving split', variant: 'destructive' });
    }
  };

  const handleToggleSettle = async (participantId: string, currentStatus: boolean) => {
    try {
      await db.splitParticipants.update(participantId, {
        isSettled: !currentStatus,
        updatedAt: Date.now(),
      });
      toast({ title: !currentStatus ? 'Marked as Settled' : 'Marked as Unsettled' });
    } catch (err) {
      toast({ title: 'Error updating settlement', variant: 'destructive' });
    }
  };

  const handleDeleteSplit = async () => {
    if (!deleteId) return;
    try {
      await db.expenseSplits.delete(deleteId);
      await db.splitParticipants.where('splitId').equals(deleteId).delete();
      toast({ title: 'Split deleted' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Splitting</h1>
          <p className="text-muted-foreground text-sm">
            Divide group bills, dinner tabs, or shared rent with roommates and track settlements.
          </p>
        </div>
        <Button
          onClick={(e) => {
            handleBtnPress(e);
            setIsDialogOpen(true);
          }}
          className="gap-2 shadow-sm transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Split
        </Button>
      </div>

      {splits.length === 0 ? (
        <Card className="motion-card py-16 text-center">
          <CardContent className="space-y-3">
            <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <h3 className="text-base font-semibold">No Expense Splits</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Split shared restaurant bills or vacation apartments easily without awkward calculation.
            </p>
            <Button
              onClick={(e) => {
                handleBtnPress(e);
                setIsDialogOpen(true);
              }}
              className="mt-2 transition-transform"
            >
              Split a Bill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {splits.map(split => {
            const participantsForSplit = allParticipants.filter(p => p.splitId === split.id);
            const settledCount = participantsForSplit.filter(p => p.isSettled).length;
            const isAllSettled = participantsForSplit.length > 0 && settledCount === participantsForSplit.length;

            return (
              <Card
                key={split.id}
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
                className="motion-card hover:shadow-md transition-all duration-200"
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{split.description}</CardTitle>
                    <p className="text-sm font-bold text-primary mt-0.5">
                      Total: {formatCurrency(split.totalAmount)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 transition-transform active:scale-90"
                    onClick={(e) => {
                      handleBtnPress(e);
                      setDeleteId(split.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Participants ({participantsForSplit.length}):</span>
                    <Badge variant={isAllSettled ? 'default' : 'secondary'} className="text-[10px]">
                      {isAllSettled ? 'All Settled' : `${settledCount}/${participantsForSplit.length} Settled`}
                    </Badge>
                  </div>

                  <div className="space-y-2 border-t pt-2">
                    {participantsForSplit.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-foreground">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatCurrency(p.shareAmount)}</span>
                          <button
                            onClick={(e) => {
                              handleBtnPress(e);
                              handleToggleSettle(p.id, p.isSettled);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150 active:scale-95 cursor-pointer ${
                              p.isSettled
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                            }`}
                          >
                            {p.isSettled ? 'Settled' : 'Mark Paid'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Split Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Split Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="spDesc">Description *</Label>
              <Input
                id="spDesc"
                placeholder="e.g. Italian Dinner, Airbnb Goa, Team Pizza"
                value={description}
                onChange={e => setDescription(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="spAmt">Total Bill Amount ({DEFAULT_CURRENCY.symbol}) *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSplitEqually}
                  className="text-xs h-6 px-2 text-primary"
                >
                  Split Equally
                </Button>
              </div>
              <Input
                id="spAmt"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Participants & Shares</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {participants.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Person ${idx + 1}`}
                      value={p.name}
                      onChange={e => handleParticipantChange(idx, 'name', e.target.value)}
                      className="text-xs"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Share"
                      value={p.share}
                      onChange={e => handleParticipantChange(idx, 'share', e.target.value)}
                      className="text-xs w-28 shrink-0"
                    />
                    {participants.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                        onClick={() => handleRemoveParticipant(idx)}
                      >
                        &times;
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddParticipant}
                className="w-full text-xs h-8"
              >
                + Add Another Person
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSplit} disabled={!description.trim() || !totalAmount.trim()}>
              Save Split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Expense Split"
        description="Are you sure you want to delete this split record?"
        onConfirm={handleDeleteSplit}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
