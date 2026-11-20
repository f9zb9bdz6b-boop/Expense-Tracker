// ============================================================
// AddExpensePage - Record and Manage Every Expense
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { expenseRepo, merchantRepo, expenseCategoryRepo } from '@/db/repositories';
import { toMinorUnits, DEFAULT_CURRENCY } from '@/utils/currency';
import { getCurrentDate, getCurrentTime } from '@/utils/date';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Check, Sparkles, Tag, Calendar, Clock,
  Store, FileText, ArrowLeft, Layers, Camera
} from 'lucide-react';
import { getCategoryEmoji, getPaymentMethodEmoji, POPULAR_CATEGORY_EMOJIS } from '@/utils/emojis';
import type { ExpenseCategory, PaymentMethod, SpecialEvent, ExpenseClassification } from '@/types';

const expenseSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid positive amount'),
  categoryId: z.string().optional(),
  paymentMethodId: z.string().optional(),
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
  const [newCatEmoji, setNewCatEmoji] = useState('🍔');
  const [newCatColor, setNewCatColor] = useState('#10b981');

  // Load Categories, Payment Methods, and Active Events reactively
  const categories = useLiveQuery(() => db.expenseCategories.orderBy('order').toArray()) ?? [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.orderBy('order').toArray()) ?? [];
  const events = useLiveQuery(() => db.events.where('status').anyOf('planned', 'active').toArray()) ?? [];

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handlePress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', clearProps: 'all' });
      gsap.fromTo('.motion-hero-amount', { y: 26, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.82, ease: 'power3.out', clearProps: 'all' });
      gsap.fromTo('.motion-card', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.08, clearProps: 'all' });
      gsap.fromTo('.motion-category-btn', { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.025, ease: 'back.out(1.4)', delay: 0.16, clearProps: 'all' });
      gsap.fromTo('.motion-payment-btn', { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.025, ease: 'back.out(1.4)', delay: 0.2, clearProps: 'all' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

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

  useEffect(() => {
    if (categories.length > 0 && !watch('categoryId')) {
      setValue('categoryId', categories[0].id, { shouldValidate: true, shouldDirty: true });
    }
  }, [categories, setValue, watch]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !watch('paymentMethodId')) {
      setValue('paymentMethodId', paymentMethods[0].id, { shouldValidate: true, shouldDirty: true });
    }
  }, [paymentMethods, setValue, watch]);

  const watchedCategoryId = watch('categoryId');
  const watchedPaymentMethodId = watch('paymentMethodId');
  const selectedCategoryId = watchedCategoryId || (categories[0]?.id ?? '');
  const selectedPaymentMethodId = watchedPaymentMethodId || (paymentMethods[0]?.id ?? '');
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
      const finalEmoji = newCatEmoji.trim() || getCategoryEmoji({ name: newCatName });
      const created = await expenseCategoryRepo.create({
        name: newCatName.trim(),
        color: newCatColor,
        icon: finalEmoji,
        order: categories.length,
        isDefault: false,
        isArchived: false,
      });
      setValue('categoryId', created.id);
      setShowNewCatDialog(false);
      setNewCatName('');
      toast({
        title: 'Category Created',
        description: `Added "${finalEmoji} ${created.name}" to your categories.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      const minorUnits = toMinorUnits(data.amount);
      const finalCategoryId = data.categoryId || selectedCategoryId || categories[0]?.id;
      const finalPaymentMethodId = data.paymentMethodId || selectedPaymentMethodId || paymentMethods[0]?.id;
      await expenseRepo.create({
        amount: minorUnits,
        currency: DEFAULT_CURRENCY.code,
        categoryId: finalCategoryId,
        paymentMethodId: finalPaymentMethodId,
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

      if (data.merchant?.trim() && finalCategoryId) {
        await merchantRepo.upsert(data.merchant.trim(), minorUnits, finalCategoryId);
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
    <div ref={pageRef} className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="motion-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Record Expense</h1>
          <InfoHint
            title="Fast Expense Entry"
            description="Log an expense with quick tags, split classification (Needs vs Wants), and payment method."
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('categoryId')} />
        <input type="hidden" {...register('paymentMethodId')} />
        {/* Main Card: Amount & Description */}
        <Card className="motion-hero-amount">
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
                  className="w-full pl-12 pr-4 py-3 text-3xl font-semibold bg-background rounded-lg border border-input focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
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
                const emoji = getCategoryEmoji(cat);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={e => {
                      handlePress(e);
                      setValue('categoryId', cat.id, { shouldValidate: true, shouldDirty: true });
                    }}
                    className={`motion-category-btn flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary shadow-xs'
                        : 'border-border/80 hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="text-base shrink-0 select-none">{emoji}</span>
                    <span className="truncate">{cat.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
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
                  const pmEmoji = getPaymentMethodEmoji(pm.name);
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={e => {
                        handlePress(e);
                        setValue('paymentMethodId', pm.id, { shouldValidate: true, shouldDirty: true });
                      }}
                      className={`motion-payment-btn flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'border-border/80 hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="text-sm select-none">{pmEmoji}</span>
                      <span>{pm.name}</span>
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
                  className={`p-3 rounded border text-center transition-all ${
                    classification === 'necessary'
                      ? 'border-primary bg-primary/8 text-primary font-semibold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-sm block">Necessary</span>
                  <span className="text-[11px] opacity-75 font-normal">Essential Living (Needs)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('classification', 'discretionary')}
                  className={`p-3 rounded border text-center transition-all ${
                    classification === 'discretionary'
                      ? 'border-amber-500 bg-amber-500/8 text-amber-700 dark:text-amber-400 font-semibold'
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
              <Label>Category Emoji</Label>
              <div className="flex items-center gap-2">
                <span className="text-3xl w-10 h-10 flex items-center justify-center rounded border bg-muted select-none">
                  {newCatEmoji}
                </span>
                <Input
                  className="w-24 text-center text-lg"
                  value={newCatEmoji}
                  onChange={e => setNewCatEmoji(e.target.value)}
                  maxLength={4}
                />
                <div className="flex gap-1 overflow-x-auto py-1">
                  {POPULAR_CATEGORY_EMOJIS.slice(0, 8).map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCatEmoji(em)}
                      className="w-8 h-8 flex items-center justify-center text-base rounded hover:bg-muted"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
