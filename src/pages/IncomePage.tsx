// ============================================================
// IncomePage - Income Tracking, Sources & Summaries
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { incomeRepo, incomeCategoryRepo } from '@/db/repositories';
import { toMinorUnits, formatCurrency, DEFAULT_CURRENCY } from '@/utils/currency';
import { getCurrentDate, getCurrentTime, formatDate } from '@/utils/date';
import { getCategoryEmoji, getPaymentMethodEmoji } from '@/utils/emojis';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, Plus, ArrowDownLeft, Trash2, Calendar,
  Briefcase, DollarSign, Wallet, CreditCard
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const incomeSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid amount'),
  categoryId: z.string().optional(),
  paymentMethod: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  source: z.string().min(1, 'Source is required'),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
});

type IncomeFormValues = z.infer<typeof incomeSchema>;

export default function IncomePage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const categories = useLiveQuery(() => db.incomeCategories.orderBy('order').toArray()) ?? [];
  const incomeList = useLiveQuery(() => db.income.orderBy('date').reverse().toArray()) ?? [];

  const totalIncome = incomeList.reduce((s, i) => s + i.amount, 0);

  // Group by category for chart
  const catMap = new Map(categories.map(c => [c.id, c]));
  const catTotals = new Map<string, number>();
  for (const inc of incomeList) {
    catTotals.set(inc.categoryId, (catTotals.get(inc.categoryId) ?? 0) + inc.amount);
  }
  const categoryChartData = [...catTotals.entries()].map(([id, amt]) => {
    const cat = catMap.get(id);
    return {
      name: cat?.name || 'General',
      value: amt,
      color: cat?.color || '#22c55e',
    };
  });

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.motion-header', { y: -16, opacity: 0, duration: 0.5, ease: 'power3.out' });
      gsap.from('.motion-hero-card', { y: 20, opacity: 0, scale: 0.98, duration: 0.55, ease: 'back.out(1.2)' });
      gsap.from('.motion-card', { y: 20, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.1 });
      gsap.from('.motion-row', { x: -12, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out', delay: 0.25, clearProps: 'transform,opacity' });
    }, pageRef);
    return () => ctx.revert();
  }, [incomeList.length]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: '',
      categoryId: categories[0]?.id || '',
      paymentMethod: 'Bank Transfer',
      date: getCurrentDate(),
      time: getCurrentTime(),
      source: '',
      description: '',
      notes: '',
    }
  });

  useEffect(() => {
    if (categories.length > 0 && !watch('categoryId')) {
      setValue('categoryId', categories[0].id, { shouldValidate: true });
    }
  }, [categories, setValue, watch]);

  const selectedCategoryId = watch('categoryId') || (categories[0]?.id ?? '');

  const onSubmit = async (data: IncomeFormValues) => {
    setIsSubmitting(true);
    try {
      const finalCategoryId = data.categoryId || selectedCategoryId || categories[0]?.id;
      await incomeRepo.create({
        amount: toMinorUnits(data.amount),
        currency: DEFAULT_CURRENCY.code,
        categoryId: finalCategoryId,
        paymentMethod: data.paymentMethod || 'Bank Transfer',
        date: data.date,
        time: data.time,
        source: data.source.trim(),
        description: data.description.trim(),
        notes: data.notes?.trim() || '',
        isRecurring: false,
        tags: [],
      });

      toast({
        title: 'Income Logged!',
        description: `Recorded ${DEFAULT_CURRENCY.symbol}${data.amount} from "${data.source}".`,
      });

      reset({
        amount: '',
        categoryId: categories[0]?.id || '',
        paymentMethod: 'Bank Transfer',
        date: getCurrentDate(),
        time: getCurrentTime(),
        source: '',
        description: '',
        notes: '',
      });
    } catch (err) {
      toast({
        title: 'Error saving income',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await incomeRepo.delete(deleteId);
      toast({ title: 'Income record deleted' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Income & Inflows</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track salaries, freelance, investments and other cash inflows.
          </p>
        </div>
        <div className="motion-hero-card bg-card border border-border/80 rounded-2xl px-5 py-3 shadow-xs text-right">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Received</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatCurrency(totalIncome)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card: Record Inflow */}
        <Card className="motion-card lg:col-span-1 shadow-xs rounded-2xl border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Record Income
            </CardTitle>
            <CardDescription className="text-xs">Add an incoming payment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs uppercase text-muted-foreground font-semibold">
                  Amount ({DEFAULT_CURRENCY.symbol}) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  className="text-lg font-bold"
                />
                {errors.amount && <p className="text-xs text-rose-500">{errors.amount.message}</p>}
              </div>

              {/* Source & Description */}
              <div className="space-y-1.5">
                <Label htmlFor="source">Source / Payer *</Label>
                <Input
                  id="source"
                  placeholder="e.g. Acme Corp, Client X, Dividend"
                  {...register('source')}
                />
                {errors.source && <p className="text-xs text-rose-500">{errors.source.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  placeholder="e.g. Monthly salary, Milestone 2, Gift"
                  {...register('description')}
                />
                {errors.description && <p className="text-xs text-rose-500">{errors.description.message}</p>}
              </div>

              {/* Category & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Income Category *</Label>
                  <select
                    id="categoryId"
                    {...register('categoryId')}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {getCategoryEmoji(c)} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Mode of Transaction</Label>
                  <select
                    id="paymentMethod"
                    {...register('paymentMethod')}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="Bank Transfer">🏦 Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="GPay">📱 GPay</option>
                    <option value="Cash">💵 Cash</option>
                    <option value="Cheque">📜 Cheque</option>
                    <option value="Credit Card">💳 Credit Card</option>
                    <option value="Direct Deposit">💼 Direct Deposit</option>
                    <option value="Other">✨ Other</option>
                  </select>
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-xs">Date</Label>
                  <Input id="date" type="date" {...register('date')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time" className="text-xs">Time</Label>
                  <Input id="time" type="time" {...register('time')} />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
                <Textarea id="notes" placeholder="Any extra details..." rows={2} {...register('notes')} />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? 'Saving...' : 'Add Income'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History and Distribution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart card */}
          {categoryChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Income Distribution by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      paddingAngle={4}
                    >
                      {categoryChartData.map((e, idx) => (
                        <Cell key={`cell-${idx}`} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Income History List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Income Logs</CardTitle>
              <span className="text-xs text-muted-foreground">{incomeList.length} records</span>
            </CardHeader>
            <CardContent>
              {incomeList.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-500" />
                  <p className="text-sm font-medium">No income records yet</p>
                  <p className="text-xs mt-1">Use the form to log your first incoming payment.</p>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto pr-1">
                  {incomeList.map(item => {
                    const cat = catMap.get(item.categoryId);
                    return (
                      <div key={item.id} className="motion-row py-3 flex items-center justify-between hover:bg-muted/30 px-2 rounded-xl group transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 text-lg shadow-xs">
                            <span>{cat ? getCategoryEmoji(cat) : '💰'}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{item.description}</p>
                              <span className="inline-flex items-center gap-1 bg-muted/60 text-foreground px-2 py-0.5 rounded-md text-[10px] font-medium">
                                <span>{getPaymentMethodEmoji(item.paymentMethod || 'Bank Transfer')}</span>
                                {item.paymentMethod || 'Bank Transfer'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(item.date)} • <span className="font-medium text-foreground">{item.source}</span>
                              {cat && <span> • {getCategoryEmoji(cat)} {cat.name}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(item.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Income Record"
        description="Are you sure you want to delete this income record? Total balance will adjust accordingly."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
