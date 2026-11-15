// ============================================================
// AddExpensePage - Record and Manage Every Expense
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { expenseRepo, merchantRepo, expenseCategoryRepo } from '@/db/repositories';
import { toMinorUnits, DEFAULT_CURRENCY } from '@/utils/currency';
import { getCurrentDate, getCurrentTime } from '@/utils/date';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Check, Sparkles, Tag, Calendar, Clock,
  Store, FileText, ArrowLeft, Layers, Camera
} from 'lucide-react';
import type { ExpenseCategory, PaymentMethod, SpecialEvent, ExpenseClassification } from '@/types';

const expenseSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid positive amount'),
  categoryId: z.string().min(1, 'Please select a category'),
  paymentMethodId: z.string().min(1, 'Please select a payment method'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional(),
  classification: z.enum(['necessary', 'discretionary']),
  eventId: z.string().optional(),
  notes: z.string().optional(),
  tagInput: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function AddExpensePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId') || '';
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');

  // Load Categories, Payment Methods, and Active Events reactively
  const categories = useLiveQuery(() => db.expenseCategories.orderBy('order').toArray()) ?? [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.orderBy('order').toArray()) ?? [];
  const events = useLiveQuery(() => db.events.where('status').anyOf('planned', 'active').toArray()) ?? [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: '',
      categoryId: categories[0]?.id || '',
      paymentMethodId: paymentMethods[0]?.id || '',
      date: getCurrentDate(),
      time: getCurrentTime(),
      description: '',
      merchant: '',
      classification: 'necessary',
      eventId: urlEventId,
      notes: '',
      tagInput: '',
    }
  });

  useEffect(() => {
    if (urlEventId) {
      setValue('eventId', urlEventId);
    }
  }, [urlEventId, setValue]);

  const selectedCategoryId = watch('categoryId') || (categories[0]?.id ?? '');
  const selectedPaymentMethodId = watch('paymentMethodId') || (paymentMethods[0]?.id ?? '');
  const classification = watch('classification');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = watch('tagInput')?.trim().replace('#', '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setValue('tagInput', '');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const created = await expenseCategoryRepo.create({
        name: newCatName.trim(),
        color: newCatColor,
        icon: 'Tag',
        order: categories.length,
        isDefault: false,
        isArchived: false,
      });
      setValue('categoryId', created.id);
      setShowNewCatDialog(false);
      setNewCatName('');
      toast({
        title: 'Category Created',
        description: `Added "${created.name}" to your expense categories.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      const minorUnits = toMinorUnits(data.amount);
      await expenseRepo.create({
        amount: minorUnits,
        currency: DEFAULT_CURRENCY.code,
        categoryId: data.categoryId || categories[0]?.id,
        paymentMethodId: data.paymentMethodId || paymentMethods[0]?.id,
        date: data.date,
        time: data.time,
        description: data.description.trim(),
        merchant: data.merchant?.trim() || '',
        classification: data.classification,
        eventId: data.eventId || undefined,
        notes: data.notes?.trim() || '',
        tags,
        isRecurring: false,
      });

      if (data.merchant?.trim()) {
        await merchantRepo.upsert(data.merchant.trim(), minorUnits, data.categoryId);
      }

      toast({
        title: 'Expense Recorded!',
        description: `Successfully added ${DEFAULT_CURRENCY.symbol}${data.amount} for "${data.description}".`,
      });

      navigate('/transactions');
    } catch (error) {
      toast({
        title: 'Error saving expense',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Record Expense</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Card: Amount & Description */}
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            {/* Amount Input */}
            <div className="space-y-1.5 text-center sm:text-left">
              <Label htmlFor="amount" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Amount ({DEFAULT_CURRENCY.symbol})
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-3xl font-bold text-muted-foreground pointer-events-none">
                  {DEFAULT_CURRENCY.symbol}
                </span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  autoFocus
                  {...register('amount')}
                  className="w-full pl-12 pr-4 py-3 text-3xl font-extrabold bg-muted/40 rounded-xl border border-input focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
              {errors.amount && <p className="text-xs text-rose-500 font-medium">{errors.amount.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g. Dinner with team, Weekly groceries, Fuel"
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-rose-500 font-medium">{errors.description.message}</p>}
            </div>

            {/* Merchant / Recipient */}
            <div className="space-y-1.5">
              <Label htmlFor="merchant" className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-muted-foreground" /> Merchant or Recipient (Optional)
              </Label>
              <Input
                id="merchant"
                placeholder="e.g. Walmart, Starbucks, Swiggy, Uber"
                {...register('merchant')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Category Selection */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Category</CardTitle>
              <CardDescription className="text-xs">Select or add a new category</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewCatDialog(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
              {categories.map(cat => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setValue('categoryId', cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary text-foreground font-semibold'
                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-primary ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
            {errors.categoryId && <p className="text-xs text-rose-500 font-medium mt-2">{errors.categoryId.message}</p>}
          </CardContent>
        </Card>

        {/* Payment Method & Classification */}
        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Payment Method</Label>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map(pm => {
                  const isSelected = selectedPaymentMethodId === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setValue('paymentMethodId', pm.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'border-border hover:bg-muted text-foreground'
                      }`}
                    >
                      {pm.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Classification Toggle: Needs vs Wants */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Classification</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue('classification', 'necessary')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    classification === 'necessary'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold ring-1 ring-blue-500'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-sm block">Necessary</span>
                  <span className="text-[11px] opacity-75 font-normal">Essential Living (Needs)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('classification', 'discretionary')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    classification === 'discretionary'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold ring-1 ring-amber-500'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-sm block">Discretionary</span>
                  <span className="text-[11px] opacity-75 font-normal">Lifestyle & Joy (Wants)</span>
                </button>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Date
                </Label>
                <Input id="date" type="date" {...register('date')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time" className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Time
                </Label>
                <Input id="time" type="time" {...register('time')} />
              </div>
            </div>

            {/* Special Event Association */}
            {events.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="eventId" className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Associate with Special Event (Optional)
                </Label>
                <select
                  id="eventId"
                  {...register('eventId')}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">None (Regular Expense)</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.startDate} to {ev.endDate})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tags Input */}
            <div className="space-y-1.5">
              <Label htmlFor="tagInput" className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" /> Tags (Press Enter to add)
              </Label>
              <Input
                id="tagInput"
                placeholder="e.g. food, trip, tax-deductible"
                {...register('tagInput')}
                onKeyDown={handleAddTag}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {tags.map(t => (
                    <Badge key={t} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTag(t)}>
                      #{t} &times;
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Additional details or receipt context..."
                rows={2}
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? 'Saving...' : 'Save Expense'}
          </Button>
        </div>
      </form>

      {/* Quick Add Category Dialog */}
      <Dialog open={showNewCatDialog} onOpenChange={setShowNewCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="catName">Category Name</Label>
              <Input
                id="catName"
                placeholder="e.g. Pet Care, Books, Coffee"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={e => setNewCatColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">{newCatColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCatDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={!newCatName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
