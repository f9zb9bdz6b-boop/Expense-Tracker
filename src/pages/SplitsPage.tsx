// ============================================================
// SplitsPage - Expense Splitting, Settlement & Debt Minimization
// Featuring:
// 1. Multi-way Group Bill Splitting (Equal & Custom)
// 2. Smart Debt Minimization (Simplifier) (Feature 30)
// 3. Shareable UPI & Payment Deep-Links (Feature 32)
// 4. Polite WhatsApp / SMS Reminder Nudge Generator (Feature 36)
// ============================================================
import React, { useState, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { splitRepo, expenseRepo } from '@/db/repositories';
import { formatCurrency, toMinorUnits, DEFAULT_CURRENCY } from '@/utils/currency';
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
  Users, Plus, CheckCircle2, Clock, Trash2,
  DollarSign, UserCheck, ArrowRight, Share2,
  MessageCircle, QrCode, Shuffle, Sparkles, Copy
} from 'lucide-react';
import type { ExpenseSplit, SplitParticipant } from '@/types';

interface ParticipantEntry {
  name: string;
  share: string;
}

export default function SplitsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSimplifierOpen, setIsSimplifierOpen] = useState(false);
  const [nudgeModalData, setNudgeModalData] = useState<{
    name: string;
    amount: number;
    description: string;
  } | null>(null);
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

  useGSAP(() => {
    gsap.from('.motion-header', { y: 16, opacity: 0.3, duration: 0.5, ease: 'power2.out', clearProps: 'all' });
    gsap.from('.motion-card', { y: 20, opacity: 0.3, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.06, clearProps: 'all' });
  }, []);

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
      const splitMinor = toMinorUnits(totalNum);
      const split = await splitRepo.create({
        expenseId: `exp-${Date.now()}`,
        description: description.trim(),
        totalAmount: splitMinor,
        currency: DEFAULT_CURRENCY.code,
        isSettled: false,
        notes: '',
      });

      // Save each participant
      for (const p of validParticipants) {
        const isMe = p.name.trim().toLowerCase() === 'me';
        const sAmt = toMinorUnits(parseFloat(p.share));
        await splitRepo.addParticipant({
          splitId: split.id,
          name: p.name.trim(),
          shareAmount: sAmt,
          paidAmount: isMe ? sAmt : 0,
          isSettled: isMe, // Creator "Me" is settled by default since they paid upfront
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
      toast({ title: 'Error creating split', variant: 'destructive' });
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

  // Feature 30: Smart Debt Simplification Algorithm
  // Aggregates net owed balances across all active splits to reduce transaction count
  const debtSimplification = useMemo(() => {
    const netBalances: Record<string, number> = {};

    allParticipants.forEach(p => {
      if (p.name.toLowerCase() === 'me') return;
      if (!p.isSettled) {
        // They owe "Me" this amount
        netBalances[p.name] = (netBalances[p.name] || 0) + p.shareAmount;
      }
    });

    const entries = Object.entries(netBalances).filter(([_, amt]) => amt > 0);
    const totalOwedToMe = entries.reduce((s, [_, amt]) => s + amt, 0);

    return {
      entries,
      totalOwedToMe,
      transactionCount: entries.length,
    };
  }, [allParticipants]);

  const handleCopyNudge = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to Clipboard!', description: 'Ready to paste into WhatsApp, Telegram, or SMS.' });
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Expense Splitting & Groups</h1>
            <InfoHint
              title="Group Bill Splitting"
              description="Divide restaurant tabs, group trips, or shared rent. Track who has settled and generate friendly reminders."
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total currently owed to you: <strong className="text-emerald-600 dark:text-[#7cf046] privacy-blur tabular-nums">{formatCurrency(debtSimplification.totalOwedToMe)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {debtSimplification.entries.length > 0 && (
            <Button
              variant="outline"
              onClick={(e) => {
                handleBtnPress(e);
                setIsSimplifierOpen(true);
              }}
              className="gap-2 text-xs font-bold rounded-xl"
            >
              <Shuffle className="w-3.5 h-3.5 text-primary" /> Simplify Debts
            </Button>
          )}
          <Button
            onClick={(e) => {
              handleBtnPress(e);
              setIsDialogOpen(true);
            }}
            className="gap-2 shadow-xs cursor-pointer rounded-xl bg-primary text-primary-foreground font-bold"
          >
            <Plus className="w-4 h-4" /> New Split
          </Button>
        </div>
      </div>

      {splits.length === 0 ? (
        <Card className="motion-card py-16 text-center border-border/80">
          <CardContent className="space-y-3">
            <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <h3 className="text-base font-bold text-foreground">No Expense Splits Recorded</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Split shared restaurant dinners, apartment utilities, or group holidays easily without awkward calculations.
            </p>
            <Button
              onClick={(e) => {
                handleBtnPress(e);
                setIsDialogOpen(true);
              }}
              className="mt-2 rounded-xl font-bold"
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
                className="motion-card hover:shadow-sm border-border/80 transition-[box-shadow,border-color] duration-200"
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">{split.description}</CardTitle>
                    <p className="text-sm font-extrabold text-primary mt-0.5">
                      Total: <span className="privacy-blur tabular-nums">{formatCurrency(split.totalAmount)}</span>
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
                    <Badge variant={isAllSettled ? 'default' : 'secondary'} className="text-[10px] font-bold">
                      {isAllSettled ? 'All Settled' : `${settledCount}/${participantsForSplit.length} Settled`}
                    </Badge>
                  </div>

                  <div className="space-y-2 border-t border-border pt-2">
                    {participantsForSplit.map(p => {
                      const isMe = p.name.toLowerCase() === 'me';
                      return (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1">
                          <span className="font-semibold text-foreground">{p.name} {isMe && '(Payer)'}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-foreground privacy-blur tabular-nums">{formatCurrency(p.shareAmount)}</span>
                            
                            {!isMe && !p.isSettled && (
                              <button
                                onClick={() => setNudgeModalData({
                                  name: p.name,
                                  amount: p.shareAmount,
                                  description: split.description
                                })}
                                title="Send Reminder Nudge"
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600" /> Nudge
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                handleBtnPress(e);
                                handleToggleSettle(p.id, p.isSettled);
                              }}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                                p.isSettled
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20'
                              }`}
                            >
                              {p.isSettled ? 'Settled' : 'Mark Paid'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feature 30: Debt Simplification Modal */}
      <Dialog open={isSimplifierOpen} onOpenChange={setIsSimplifierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" /> Smart Debt Minimizer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Consolidates all unsettled amounts across different bills into a single net settlement per person.
            </p>

            <div className="space-y-2">
              {debtSimplification.entries.map(([person, amount]) => (
                <div key={person} className="p-3 rounded-xl bg-card border border-border flex justify-between items-center text-sm shadow-xs">
                  <div>
                    <span className="font-bold text-foreground">{person}</span>
                    <p className="text-[11px] text-muted-foreground">Owes you across active splits</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-primary text-base privacy-blur tabular-nums">{formatCurrency(amount)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between items-center font-bold">
              <span className="text-emerald-800 dark:text-emerald-200">Total Net Receivables</span>
              <span className="text-emerald-800 dark:text-emerald-200 text-sm privacy-blur tabular-nums">{formatCurrency(debtSimplification.totalOwedToMe)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSimplifierOpen(false)} className="w-full rounded-xl">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature 36: Friendly Reminder Nudge Modal */}
      {nudgeModalData && (
        <Dialog open={!!nudgeModalData} onOpenChange={() => setNudgeModalData(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" /> Share Settlement Reminder
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">
                Polite, copy-paste ready reminder template for <strong>{nudgeModalData.name}</strong> for {formatCurrency(nudgeModalData.amount)}.
              </p>

              {(() => {
                const politeMsg = `Hey ${nudgeModalData.name}! 👋 Quick reminder about your share of ${formatCurrency(nudgeModalData.amount)} for "${nudgeModalData.description}". Thanks so much! 😊`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(politeMsg)}`;

                return (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs leading-relaxed font-medium text-foreground">
                      {politeMsg}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleCopyNudge(politeMsg)}
                        className="flex-1 gap-1.5 text-xs rounded-xl"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Message
                      </Button>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button className="w-full gap-1.5 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                          <MessageCircle className="w-3.5 h-3.5" /> Send WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
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
                className="rounded-xl"
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
                  className="text-xs h-6 px-2 text-primary font-bold"
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
                className="rounded-xl text-lg font-bold"
              />
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <Label className="text-xs font-bold text-foreground">Participants & Shares</Label>
              {participants.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Name"
                    value={p.name}
                    disabled={idx === 0} // "Me" is locked
                    onChange={e => handleParticipantChange(idx, 'name', e.target.value)}
                    className="flex-1 rounded-xl text-xs"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {DEFAULT_CURRENCY.symbol}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={p.share}
                      onChange={e => handleParticipantChange(idx, 'share', e.target.value)}
                      className="pl-6 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  {idx > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParticipant(idx)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddParticipant}
                className="w-full text-xs gap-1 mt-1 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Person
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveSplit} className="rounded-xl font-bold">Save Split</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Split Bill?"
        description="This will remove the split bill and all participant settlement records."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteSplit}
      />
    </div>
  );
}
