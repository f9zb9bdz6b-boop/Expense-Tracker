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
import { toMinorUnits, DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/utils/currency';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchLiveExchangeRates, getExchangeRate, FALLBACK_RATES } from '@/utils/exchangeRates';
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
  const { settings } = useSettings();
  const masterCurrency = settings?.currency || DEFAULT_CURRENCY;
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(masterCurrency.code);
  const [fxRates, setFxRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [tags, setTags] = useState<string[]>([]);
  const [naturalInput, setNaturalInput] = useState('');
  const [isTaxDeductible, setIsTaxDeductible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🍔');
  const [newCatColor, setNewCatColor] = useState('#10b981');

  // Load live currency rates on mount
  useEffect(() => {
    fetchLiveExchangeRates().then(data => {
      setFxRates(data.rates);
    });
  }, []);

  useEffect(() => {
    if (masterCurrency?.code && selectedCurrencyCode === DEFAULT_CURRENCY.code) {
      setSelectedCurrencyCode(masterCurrency.code);
    }
  }, [masterCurrency]);

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
    gsap.from('.motion-header', { y: 16, opacity: 0.3, duration: 0.5, ease: 'power2.out', clearProps: 'all' });
    gsap.from('.motion-hero-amount', { y: 16, opacity: 0.3, scale: 0.98, duration: 0.55, ease: 'power2.out', clearProps: 'all' });
    gsap.from('.motion-card', { y: 20, opacity: 0.3, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.05, clearProps: 'all' });
    gsap.from('.motion-category-btn', { scale: 0.92, opacity: 0.3, duration: 0.4, stagger: 0.02, ease: 'back.out(1.4)', delay: 0.1, clearProps: 'all' });
    gsap.from('.motion-payment-btn', { scale: 0.92, opacity: 0.3, duration: 0.4, stagger: 0.02, ease: 'back.out(1.4)', delay: 0.12, clearProps: 'all' });
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

  const handleParseNaturalInput = () => {
    const raw = naturalInput.trim();
    if (!raw) return;

    // 1. Extract Amount (e.g. $45, 450, 12.50, ₹1200)
    const amountMatch = raw.match(/(?:[$€£₹¥]|INR|USD|EUR|GBP|AUD|CAD)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (amountMatch && amountMatch[1]) {
      setValue('amount', amountMatch[1], { shouldValidate: true, shouldDirty: true });
    }

    // 2. Extract Currency if specified
    if (raw.includes('$') || /USD/i.test(raw)) setSelectedCurrencyCode('USD');
    else if (raw.includes('€') || /EUR/i.test(raw)) setSelectedCurrencyCode('EUR');
    else if (raw.includes('£') || /GBP/i.test(raw)) setSelectedCurrencyCode('GBP');
    else if (raw.includes('₹') || /INR/i.test(raw)) setSelectedCurrencyCode('INR');

    // 3. Category heuristics
    const lower = raw.toLowerCase();
    let matchedCat = categories.find(c => {
      const cName = c.name.toLowerCase();
      if (cName.includes('food') && (lower.includes('coffee') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('starbucks') || lower.includes('food') || lower.includes('pizza') || lower.includes('burger') || lower.includes('cafe'))) return true;
      if (cName.includes('transport') && (lower.includes('uber') || lower.includes('cab') || lower.includes('taxi') || lower.includes('metro') || lower.includes('flight') || lower.includes('fuel') || lower.includes('gas'))) return true;
      if (cName.includes('grocer') && (lower.includes('grocer') || lower.includes('supermarket') || lower.includes('walmart') || lower.includes('target') || lower.includes('milk'))) return true;
      if (cName.includes('subscri') && (lower.includes('netflix') || lower.includes('spotify') || lower.includes('gym') || lower.includes('prime') || lower.includes('youtube'))) return true;
      if (cName.includes('shop') && (lower.includes('amazon') || lower.includes('clothes') || lower.includes('shoes') || lower.includes('zara'))) return true;
      return false;
    });

    if (matchedCat) {
      setValue('categoryId', matchedCat.id, { shouldValidate: true, shouldDirty: true });
    }

    // 4. Description & Merchant
    const merchantMatch = raw.match(/\bat\s+([a-zA-Z0-9\s]+?)(?:\s+yesterday|\s+today|\s+for|$)/i);
    if (merchantMatch && merchantMatch[1]) {
      setValue('merchant', merchantMatch[1].trim(), { shouldValidate: true });
    }

    // Strip numbers and currency to form a clean description
    const cleanedDesc = raw
      .replace(/(?:[$€£₹¥]|INR|USD|EUR|GBP|AUD|CAD)?\s*[0-9]+(?:\.[0-9]{1,2})?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    setValue('description', cleanedDesc || raw, { shouldValidate: true, shouldDirty: true });

    toast({
      title: 'Auto-Filled from Natural Text! ✨',
      description: `Parsed: ${amountMatch ? amountMatch[1] : ''} ${matchedCat ? '(' + matchedCat.name + ')' : ''}`,
    });
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

  const activeCurrencyConfig = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrencyCode) || masterCurrency;
  const isForeign = selectedCurrencyCode !== masterCurrency.code;
  const exchangeRate = isForeign ? getExchangeRate(selectedCurrencyCode, masterCurrency.code, fxRates) : 1.0;
  const enteredAmountVal = watch('amount');
  const enteredAmountNum = parseFloat(enteredAmountVal || '0');
  const convertedMasterAmount = enteredAmountNum * exchangeRate;

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      const finalCategoryId = data.categoryId || selectedCategoryId || categories[0]?.id;
      const finalPaymentMethodId = data.paymentMethodId || selectedPaymentMethodId || paymentMethods[0]?.id;

      let masterMinorUnits: number;
      let originalMinorUnits: number | undefined;

      if (isForeign) {
        originalMinorUnits = toMinorUnits(data.amount, activeCurrencyConfig.decimalPlaces);
        masterMinorUnits = toMinorUnits(convertedMasterAmount, masterCurrency.decimalPlaces);
      } else {
        masterMinorUnits = toMinorUnits(data.amount, masterCurrency.decimalPlaces);
      }

      const notesContent = isForeign
        ? `${data.notes ? data.notes.trim() + ' | ' : ''}Foreign expense: ${activeCurrencyConfig.symbol}${data.amount} ${selectedCurrencyCode} @ ${exchangeRate.toFixed(4)}`
        : (data.notes?.trim() || '');

      const finalTags = [...tags];
      if (isTaxDeductible && !finalTags.includes('tax-deductible')) {
        finalTags.push('tax-deductible');
      }

      await expenseRepo.create({
        amount: masterMinorUnits,
        currency: masterCurrency.code,
        originalAmount: isForeign ? originalMinorUnits : undefined,
        originalCurrency: isForeign ? selectedCurrencyCode : undefined,
        exchangeRate: isForeign ? exchangeRate : undefined,
        categoryId: finalCategoryId,
        paymentMethodId: finalPaymentMethodId,
        date: data.date,
        time: data.time,
        description: data.description.trim(),
        merchant: data.merchant?.trim() || '',
        classification: data.classification,
        detailedClassification: data.classification === 'necessary' ? 'needs' : 'wants',
        eventId: data.eventId || undefined,
        notes: notesContent,
        tags: finalTags,
        isRecurring: false,
      });

      if (data.merchant?.trim() && finalCategoryId) {
        await merchantRepo.upsert(data.merchant.trim(), masterMinorUnits, finalCategoryId);
      }

      toast({
        title: 'Expense Recorded!',
        description: isForeign
          ? `Added ${activeCurrencyConfig.symbol}${data.amount} ${selectedCurrencyCode} (≈ ${masterCurrency.symbol}${convertedMasterAmount.toFixed(2)} ${masterCurrency.code}) for "${data.description}".`
          : `Successfully added ${masterCurrency.symbol}${data.amount} for "${data.description}".`,
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
            description="Log an expense with multi-currency support, live FX sync, tags, and Needs vs Wants classification."
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('categoryId')} />
        <input type="hidden" {...register('paymentMethodId')} />

        {/* Feature 7: Natural Language Quick Entry Input */}
        <div className="motion-card p-3 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#7cf046]/20 text-[#082b14] dark:text-[#7cf046] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <Input
            placeholder="✨ Quick Entry: e.g. '450 coffee at Starbucks' or '$25 groceries yesterday'..."
            value={naturalInput}
            onChange={e => setNaturalInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleParseNaturalInput();
              }
            }}
            className="border-0 shadow-none focus-visible:ring-0 text-sm bg-transparent flex-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleParseNaturalInput}
            className="rounded-xl text-xs font-bold shrink-0 bg-primary text-primary-foreground"
          >
            Auto-Fill
          </Button>
        </div>
        {/* Main Card: Amount & Description */}
        <Card className="motion-hero-amount">
          <CardContent className="pt-6 space-y-4">
            {/* Amount & Currency Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  Amount
                  <InfoHint text="Switch to any foreign currency; it will automatically convert and sync to your master currency at current live exchange rates." />
                </Label>

                {/* Currency Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">Currency:</span>
                  <select
                    value={selectedCurrencyCode}
                    onChange={(e) => setSelectedCurrencyCode(e.target.value)}
                    className="text-xs font-bold bg-muted/80 text-foreground border border-border rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-muted"
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-4 text-3xl font-bold text-muted-foreground pointer-events-none">
                  {activeCurrencyConfig.symbol}
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

              {/* Real-Time Live FX Sync Banner when Foreign Currency is Chosen */}
              {isForeign && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1 animate-in fade-in-0 duration-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">💱</span>
                      <span className="font-semibold text-foreground">
                        1 {selectedCurrencyCode} = {exchangeRate.toFixed(4)} {masterCurrency.code}
                      </span>
                      <span className="text-[10px] bg-[#7cf046] text-[#082b14] font-extrabold px-1.5 py-0.5 rounded-full">
                        LIVE FX SYNC
                      </span>
                    </div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300">
                      {enteredAmountNum > 0 ? (
                        <span>≈ {masterCurrency.symbol}{convertedMasterAmount.toFixed(2)} {masterCurrency.code} in master ledger</span>
                      ) : (
                        <span>Synced to master {masterCurrency.code} ledger</span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    All charts, active budgets, and net balance will automatically track this amount in your primary {masterCurrency.code} currency.
                  </p>
                </div>
              )}
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

            {/* Feature 8: Tax Deduction Flag */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>💼</span> Tax-Deductible Business Expense
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Tag for automated Schedule C / GST write-off export in Tools
                </p>
              </div>
              <input
                type="checkbox"
                checked={isTaxDeductible}
                onChange={e => setIsTaxDeductible(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

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
