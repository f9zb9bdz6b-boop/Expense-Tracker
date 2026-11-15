// ============================================================
// EventsPage - Special Expenses & Events Module (Trips, Parties, Weddings)
// ============================================================
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { eventRepo, expenseRepo } from '@/db/repositories';
import { formatCurrency, toMinorUnits, DEFAULT_CURRENCY } from '@/utils/currency';
import { formatDate, getCurrentDate } from '@/utils/date';
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
  Calendar, Plus, Layers, MapPin, PartyPopper, Plane,
  Trash2, Edit2, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';
import type { SpecialEvent, EventStatus, Expense } from '@/types';

export default function EventsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState<EventStatus>('planned');
  const [color, setColor] = useState('#6366f1');

  // Load events & all expenses
  const events = useLiveQuery(() => db.events.orderBy('startDate').reverse().toArray()) ?? [];
  const allExpenses = useLiveQuery(() => db.expenses.where('eventId').above('').toArray()) ?? [];

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

  const handleSave = async () => {
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Special Expenses & Events</h1>
          <p className="text-muted-foreground text-sm">
            Isolate vacations, weddings, renovation projects and parties from day-to-day spending.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 shadow-sm">
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
              <Card key={ev.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: ev.color }}>
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
                        Spent: {formatCurrency(totalSpent)} of {formatCurrency(ev.budget)} ({Math.round(pct)}%)
                      </span>
                      <span className="text-muted-foreground">
                        Remaining: {formatCurrency(remaining)}
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
                          <p className="text-xs text-muted-foreground italic">
                            No expenses linked to this event yet. Select this event when adding an expense.
                          </p>
                        ) : (
                          <div className="divide-y text-xs">
                            {eventExpenses.map(e => (
                              <div key={e.id} className="py-2 flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-foreground">{e.description}</span>
                                  <span className="text-muted-foreground ml-2">({formatDate(e.date)})</span>
                                </div>
                                <span className="font-semibold text-rose-600 dark:text-rose-400">
                                  {formatCurrency(e.amount)}
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

      {/* Create Dialog */}
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

            <div className="space-y-1.5">
              <Label htmlFor="evDesc">Description (Optional)</Label>
              <Input
                id="evDesc"
                placeholder="e.g. Flight, hotel, and dining budget"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evBudget">Total Event Budget ({DEFAULT_CURRENCY.symbol}) *</Label>
              <Input
                id="evBudget"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={budget}
                onChange={e => setBudget(e.target.value)}
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
              <Label htmlFor="evStatus">Status</Label>
              <select
                id="evStatus"
                value={status}
                onChange={e => setStatus(e.target.value as EventStatus)}
                className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="planned">Planned</option>
                <option value="active">Active (Ongoing)</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !budget.trim()}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Special Event"
        description="Are you sure you want to delete this event? The associated expenses will remain intact as regular expenses."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
