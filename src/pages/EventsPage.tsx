// ============================================================
// EventsPage - Special Expenses & Events Module (Trips, Parties, Weddings)
// ============================================================
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { eventRepo, expenseRepo } from '@/db/repositories';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, toMinorUnits, DEFAULT_CURRENCY, getActiveMasterCurrency } from '@/utils/currency';
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
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar, Plus, Layers, MapPin, PartyPopper, Plane,
  Trash2, Edit2, ChevronDown, ChevronUp, ArrowRight, Receipt
} from 'lucide-react';
import type { SpecialEvent, EventStatus, Expense, ExpenseClassification } from '@/types';

export default function EventsPage() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const masterCurrency = settings?.currency || getActiveMasterCurrency();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Form states for Event creation/edit
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState<EventStatus>('planned');
  const [color, setColor] = useState('#6366f1');

  // Direct Expense to Event modal states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedEventForExpense, setSelectedEventForExpense] = useState<SpecialEvent | null>(null);
  const [expAmount, setExpAmount] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expPaymentMethodId, setExpPaymentMethodId] = useState('');
  const [expDate, setExpDate] = useState(getCurrentDate());
  const [expClassification, setExpClassification] = useState<ExpenseClassification>('discretionary');
  const [expNotes, setExpNotes] = useState('');

  // Load events, categories, payment methods & all expenses
  const events = useLiveQuery(() => db.events.orderBy('startDate').reverse().toArray()) ?? [];
  const allExpenses = useLiveQuery(() => db.expenses.where('eventId').above('').toArray()) ?? [];
  const categories = useLiveQuery(() => db.expenseCategories.where('isArchived').equals(0).sortBy('order')) ?? [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.where('isArchived').equals(0).sortBy('order')) ?? [];

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo(
        '.motion-event-card',
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.08, clearProps: 'all' }
      );
      gsap.fromTo(
        '.motion-meter',
        { scaleX: 0, transformOrigin: 'left' },
        { scaleX: 1, duration: 0.95, stagger: 0.06, ease: 'power2.out', delay: 0.2, clearProps: 'transformOrigin' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setStartDate(getCurrentDate());
    setEndDate(getCurrentDate());
    setBudget('');
    setStatus('planned');
    setColor('#6366f1');
    setIsDialogOpen(true);
  };

  const handleOpenAddExpense = (ev: SpecialEvent) => {
    setSelectedEventForExpense(ev);
    setExpAmount('');
    setExpDescription('');
    setExpCategoryId(categories[0]?.id || '');
    setExpPaymentMethodId(paymentMethods[0]?.id || '');
    setExpDate(getCurrentDate());
    setExpClassification('discretionary');
    setExpNotes('');
    setIsAddExpenseOpen(true);
  };

  const handleSaveEvent = async () => {
    const budgetNum = parseFloat(budget);
    if (!name.trim() || isNaN(budgetNum) || budgetNum < 0) {
      toast({ title: 'Validation Error', description: 'Please provide an event name and valid budget.', variant: 'destructive' });
      return;
    }

    try {
      const minorUnits = toMinorUnits(budgetNum);
      if (editingId) {
        await eventRepo.update(editingId, {
          name: name.trim(),
          description: description.trim(),
          startDate,
          endDate,
          budget: minorUnits,
          status,
          color,
        });
        toast({ title: 'Event Updated' });
      } else {
        await eventRepo.create({
          name: name.trim(),
          description: description.trim(),
          startDate,
          endDate,
          budget: minorUnits,
          currency: DEFAULT_CURRENCY.code,
          status,
          notes: '',
          color,
          icon: 'Layers',
        });
        toast({ title: 'Special Event Created' });
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error saving event', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleSaveExpenseToEvent = async () => {
    if (!selectedEventForExpense) return;
    const amtNum = parseFloat(expAmount);
    if (isNaN(amtNum) || amtNum <= 0 || !expDescription.trim() || !expCategoryId || !expPaymentMethodId) {
      toast({ title: 'Validation Error', description: 'Please fill amount, description, category and payment mode.', variant: 'destructive' });
      return;
    }

    try {
      await expenseRepo.create({
        amount: toMinorUnits(amtNum),
        currency: DEFAULT_CURRENCY.code,
        categoryId: expCategoryId,
        paymentMethodId: expPaymentMethodId,
        date: expDate,
        time: new Date().toTimeString().slice(0, 5),
        description: expDescription.trim(),
        merchant: selectedEventForExpense.name,
        classification: expClassification,
        eventId: selectedEventForExpense.id,
        notes: expNotes.trim() ? `[Event: ${selectedEventForExpense.name}] ${expNotes.trim()}` : `[Event: ${selectedEventForExpense.name}]`,
        tags: ['event-expense', selectedEventForExpense.id],
        isRecurring: false,
      });

      toast({
        title: 'Expense Added to Event',
        description: `${formatCurrency(toMinorUnits(amtNum))} added to ${selectedEventForExpense.name}`,
      });
      setIsAddExpenseOpen(false);
      setExpandedEventId(selectedEventForExpense.id); // automatically expand to show new expense
    } catch (err) {
      toast({ title: 'Error logging expense', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await eventRepo.delete(deleteId);
      toast({ title: 'Event Deleted' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Special Expenses & Events</h1>
          <InfoHint
            title="Special Events"
            description="Isolate vacations, weddings, renovation projects and parties from day-to-day spending."
          />
        </div>
        <Button
          onClick={e => {
            handleBtnPress(e);
            handleOpenAdd();
          }}
          className="gap-2 bg-[#7cf046] hover:bg-[#6ee33a] text-[#082b14] font-extrabold shadow-sm rounded-xl px-4 py-2 cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" /> New Event
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-3">
            <Plane className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <h3 className="text-base font-semibold">No Special Events</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Keep vacation or party spending neatly grouped without distorting regular household budgets.
            </p>
            <Button onClick={handleOpenAdd} className="mt-2">
              Create an Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map(ev => {
            const eventExpenses = allExpenses.filter(e => e.eventId === ev.id);
            const totalSpent = eventExpenses.reduce((s, e) => s + e.amount, 0);
            const pct = ev.budget > 0 ? (totalSpent / ev.budget) * 100 : 0;
            const remaining = Math.max(0, ev.budget - totalSpent);
            const isExpanded = expandedEventId === ev.id;

            return (
              <Card key={ev.id} className="motion-event-card overflow-hidden border-l-4" style={{ borderLeftColor: ev.color }}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">{ev.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {ev.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ev.startDate)} to {formatDate(ev.endDate)}
                      {ev.description && ` • ${ev.description}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => handleOpenAddExpense(ev)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Transaction
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                      onClick={() => setDeleteId(ev.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Spent: {formatCurrency(totalSpent, masterCurrency)} of {formatCurrency(ev.budget, masterCurrency)} ({Math.round(pct)}%)
                      </span>
                      <span className="text-muted-foreground">
                        Remaining: {formatCurrency(remaining, masterCurrency)}
                      </span>
                    </div>
                    <Progress value={Math.min(100, pct)} className="h-2" />
                  </div>

                  {/* Toggle associated expenses */}
                  <div className="pt-1">
                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                      className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Hide' : 'View'} Associated Expenses ({eventExpenses.length})
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {eventExpenses.length === 0 ? (
                          <div className="py-2 text-center">
                            <p className="text-xs text-muted-foreground italic mb-2">
                              No expenses logged for this event yet.
                            </p>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-7 gap-1"
                              onClick={() => handleOpenAddExpense(ev)}
                            >
                              <Plus className="w-3 h-3" /> Log First Expense
                            </Button>
                          </div>
                        ) : (
                          <div className="divide-y text-xs">
                            {eventExpenses.map(e => (
                              <div key={e.id} className="py-2 flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-foreground">{e.description}</span>
                                  <span className="text-muted-foreground ml-2">({formatDate(e.date)})</span>
                                  {e.notes && <p className="text-[11px] text-muted-foreground">{e.notes}</p>}
                                </div>
                                <span className="font-semibold text-rose-600 dark:text-rose-400">
                                  {formatCurrency(e.amount, masterCurrency)}
                                </span>
                              </div>
                            ))}
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

      {/* Create Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Special Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="evName">Event Name *</Label>
              <Input
                id="evName"
                placeholder="e.g. Goa Trip, Sister's Wedding, Living Room Redo"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evStart">Start Date</Label>
                <Input id="evStart" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evEnd">End Date</Label>
                <Input id="evEnd" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evBudget">Budget Limit ({DEFAULT_CURRENCY.symbol}) *</Label>
              <Input
                id="evBudget"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evDesc">Description / Destination</Label>
              <Input
                id="evDesc"
                placeholder="e.g. 5-day holiday with college friends"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evStatus">Status</Label>
              <select
                id="evStatus"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={status}
                onChange={e => setStatus(e.target.value as EventStatus)}
              >
                <option value="planned">Planned</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEvent} disabled={!name.trim() || !budget.trim()}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Directly to Event Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense to {selectedEventForExpense?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="evExpAmt">Amount ({DEFAULT_CURRENCY.symbol}) *</Label>
              <Input
                id="evExpAmt"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evExpDesc">Description / Item *</Label>
              <Input
                id="evExpDesc"
                placeholder="e.g. Flight tickets, Hotel booking, Group dinner"
                value={expDescription}
                onChange={e => setExpDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evExpCat">Category *</Label>
                <select
                  id="evExpCat"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={expCategoryId}
                  onChange={e => setExpCategoryId(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="evExpPm">Payment Method *</Label>
                <select
                  id="evExpPm"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={expPaymentMethodId}
                  onChange={e => setExpPaymentMethodId(e.target.value)}
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evExpDate">Date</Label>
                <Input
                  id="evExpDate"
                  type="date"
                  value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="evExpClass">Classification</Label>
                <select
                  id="evExpClass"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={expClassification}
                  onChange={e => setExpClassification(e.target.value as ExpenseClassification)}
                >
                  <option value="necessary">Necessary (Need)</option>
                  <option value="discretionary">Discretionary (Want)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evExpNotes">Notes (Optional)</Label>
              <Input
                id="evExpNotes"
                placeholder="e.g. Paid by me, shared with 3 others"
                value={expNotes}
                onChange={e => setExpNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveExpenseToEvent} disabled={!expAmount.trim() || !expDescription.trim()}>
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Event"
        description="Are you sure you want to delete this special event? All tracked expenses will remain in your transaction history."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
