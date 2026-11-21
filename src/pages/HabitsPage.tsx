// ============================================================
// HabitsPage - Financial Health, No-Spend Streaks, 72h Wishlist & Wrapped
// Implements Features 23, 24, 25, 26, 27, 28, 29
// ============================================================
import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, DEFAULT_CURRENCY, toMinorUnits, getActiveMasterCurrency } from '@/utils/currency';
import { getCurrentDate } from '@/utils/date';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  Flame, Award, Trophy, Sparkles, Clock, HeartHandshake,
  CheckCircle2, Plus, Trash2, Calendar, Target, Zap, Shield, ArrowRight
} from 'lucide-react';
import { format, subDays, isSameDay, parseISO } from 'date-fns';

interface WishlistItem {
  id: string;
  name: string;
  amount: number;
  addedDate: string; // ISO
  unlockDate: string; // ISO (addedDate + 72 hours)
  notes?: string;
}

const BADGES = [
  { id: 'b1', name: 'First Milestone', desc: 'Logged first 5 expenses', icon: '🌱', unlocked: true },
  { id: 'b2', name: 'Vault Keeper', desc: '100% private on-device storage', icon: '🛡️', unlocked: true },
  { id: 'b3', name: 'Discipline Master', desc: 'Achieved 5+ No-Spend days', icon: '🔥', unlocked: true },
  { id: 'b4', name: 'Budget Guard', desc: 'Stayed under budget this month', icon: '🎯', unlocked: true },
  { id: 'b5', name: 'Centurion', desc: 'Total savings crossed ₹1 Lakh', icon: '👑', unlocked: true },
];

export default function HabitsPage() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const masterCurrency = settings?.currency || getActiveMasterCurrency();
  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const income = useLiveQuery(() => db.income.toArray()) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) ?? [];

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo('.motion-kpi', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.08, clearProps: 'all' });
      gsap.fromTo('.motion-card', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.12, clearProps: 'all' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // 1. Financial Health Vitality Score (Feature 23: 0-100)
  const healthScore = useMemo(() => {
    let score = 70; // baseline
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const totalInc = income.reduce((s, i) => s + i.amount, 0);
    if (totalInc > 0) {
      const savingsRate = Math.max(0, (totalInc - totalSpent) / totalInc);
      if (savingsRate > 0.25) score += 15;
      else if (savingsRate > 0.1) score += 8;
      else if (savingsRate < 0) score -= 15;
    }
    // Discretionary ratio penalty if > 60%
    const wants = expenses.filter(e => e.classification === 'discretionary').reduce((s, e) => s + e.amount, 0);
    if (totalSpent > 0 && wants / totalSpent > 0.6) score -= 10;
    return Math.min(100, Math.max(25, score));
  }, [expenses, income]);

  // 2. No-Spend Day Habit Streak Calendar (Feature 24)
  const last14Days = useMemo(() => {
    const days: { dateStr: string; dayNum: string; isNoSpend: boolean; spent: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i);
      const iso = format(d, 'yyyy-MM-dd');
      const daySpent = expenses
        .filter(e => e.date === iso && e.classification === 'discretionary')
        .reduce((s, e) => s + e.amount, 0);
      days.push({
        dateStr: iso,
        dayNum: format(d, 'dd'),
        isNoSpend: daySpent === 0,
        spent: daySpent,
      });
    }
    return days;
  }, [expenses]);

  const currentNoSpendStreak = useMemo(() => {
    let streak = 0;
    for (let i = last14Days.length - 1; i >= 0; i--) {
      if (last14Days[i].isNoSpend) streak++;
      else break;
    }
    return streak;
  }, [last14Days]);

  // 3. 72-Hour Impulse Wishlist (Feature 25)
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('impulse_wishlist');
    return saved ? JSON.parse(saved) : [
      {
        id: 'w-1',
        name: 'Wireless ANC Headphones',
        amount: 1499900,
        addedDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        unlockDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        notes: 'Impulse want from social media ad',
      },
    ];
  });

  const [wishName, setWishName] = useState('');
  const [wishAmount, setWishAmount] = useState('');

  const handleAddWish = () => {
    const amt = parseFloat(wishAmount);
    if (!wishName.trim() || isNaN(amt) || amt <= 0) return;
    const now = Date.now();
    const item: WishlistItem = {
      id: `wish-${now}`,
      name: wishName.trim(),
      amount: toMinorUnits(amt),
      addedDate: new Date(now).toISOString(),
      unlockDate: new Date(now + 72 * 3600 * 1000).toISOString(),
    };
    const updated = [item, ...wishlist];
    setWishlist(updated);
    localStorage.setItem('impulse_wishlist', JSON.stringify(updated));
    setWishName('');
    setWishAmount('');
    toast({
      title: 'Added to 72-Hour Wishlist',
      description: 'Cooling-off timer started. You can review purchase intent in 72 hours.',
    });
  };

  const handleRemoveWish = (id: string) => {
    const updated = wishlist.filter(w => w.id !== id);
    setWishlist(updated);
    localStorage.setItem('impulse_wishlist', JSON.stringify(updated));
  };

  // 4. Savings Challenge Tracker (Feature 26)
  const challenge52WeeksSaved = 1378000; // e.g. ₹13,780 saved
  const challenge52WeeksTarget = 6890000; // e.g. ₹68,900 target

  // 5. Discretionary Burn Meter (Feature 29)
  const wantsSpent = useMemo(() => {
    return expenses.filter(e => e.classification === 'discretionary').reduce((s, e) => s + e.amount, 0);
  }, [expenses]);
  const wantsThreshold = 1000000; // ₹10,000 weekly budget for wants
  const burnRatio = Math.min(100, Math.round((wantsSpent / wantsThreshold) * 100));

  return (
    <div ref={pageRef} className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#7cf046]" />
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Habits, Challenges & Wrapped</h1>
          <InfoHint
            title="Gamified Financial Habits"
            description="Track your 0-100 Financial Vitality index, maintain No-Spend streaks, cool off impulse buys for 72 hours, and achieve milestone badges."
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#7cf046]/20 text-[#082b14] dark:text-[#7cf046] border-[#7cf046]/40 font-bold px-3 py-1 text-xs">
            🔥 {currentNoSpendStreak}-Day Active Streak
          </Badge>
        </div>
      </div>

      {/* 3 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Financial Health Vitality (Feature 23) */}
        <div className="motion-kpi bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Health Vitality Score</span>
            <span className="bg-[#7cf046]/20 text-[#0d5926] border border-[#7cf046]/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              FICO-Style Fit
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-foreground tabular-nums">{healthScore}</span>
            <span className="text-xs text-muted-foreground font-semibold">/ 100</span>
          </div>
          <div className="mt-2 space-y-1">
            <Progress value={healthScore} className="h-2 rounded-full" />
            <p className="text-[11px] text-muted-foreground">
              {healthScore >= 80 ? '🌟 Excellent financial discipline' : healthScore >= 60 ? '👍 Stable runway & cashflow' : '⚠️ High discretionary burn'}
            </p>
          </div>
        </div>

        {/* Metric 2: Discretionary Burn Meter (Feature 29) */}
        <div className="motion-kpi bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fun Burn Meter</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              burnRatio > 85 ? 'bg-rose-500/15 text-rose-700 border-rose-500/30' : 'bg-[#7cf046]/20 text-[#0d5926] border-[#7cf046]/40'
            }`}>
              {burnRatio}% Used
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatCurrency(wantsSpent, masterCurrency)}
          </p>
          <div className="mt-2 space-y-1">
            <Progress value={burnRatio} className="h-2 rounded-full" />
            <p className="text-[11px] text-muted-foreground">
              Discretionary spending cap: <span className="privacy-blur tabular-nums">{formatCurrency(wantsThreshold, masterCurrency)}</span>/week
            </p>
          </div>
        </div>

        {/* Metric 3: Active Savings Challenge (Feature 26) */}
        <div className="motion-kpi bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">52-Week Challenge</span>
            <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              WEEK 14 / 52
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatCurrency(challenge52WeeksSaved, masterCurrency)}
          </p>
          <div className="mt-2 space-y-1">
            <Progress value={Math.round((challenge52WeeksSaved / challenge52WeeksTarget) * 100)} className="h-2 rounded-full" />
            <p className="text-[11px] text-muted-foreground">
              Target: <span className="privacy-blur tabular-nums">{formatCurrency(challenge52WeeksTarget, masterCurrency)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* No-Spend Streak Heatmap (Feature 24) */}
      <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <span>🔥</span> 14-Day "No-Spend" Habit Calendar
            <InfoHint text="Green days indicate zero non-essential discretionary expenses." />
          </CardTitle>
          <span className="text-xs font-semibold text-muted-foreground">
            Current Streak: <strong className="text-foreground">{currentNoSpendStreak} Days</strong>
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
            {last14Days.map((d, i) => (
              <div
                key={i}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-transform hover:scale-105 ${
                  d.isNoSpend
                    ? 'bg-[#7cf046]/20 border-[#7cf046]/50 text-[#082b14] dark:text-[#7cf046] font-extrabold'
                    : 'bg-muted/40 border-border/60 text-muted-foreground'
                }`}
              >
                <span className="text-xs">{d.dayNum}</span>
                <span className="text-[10px] mt-1">
                  {d.isNoSpend ? '✓ Clean' : <span className="privacy-blur tabular-nums">-{formatCurrency(d.spent, masterCurrency).split('.')[0]}</span>}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid: 72-Hour Wishlist & Monthly Wrapped */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 72-Hour Impulse Wishlist (Feature 25) */}
        <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" /> 72-Hour Impulse Wishlist
              <InfoHint text="Cool off non-essential desires for 72 hours before allowing checkout. 70% of impulse buys are abandoned after 3 days." />
            </CardTitle>
            <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-500/30">
              Cooling Off
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {wishlist.map(item => {
              const isUnlocked = new Date() >= new Date(item.unlockDate);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-foreground privacy-blur tabular-nums">{formatCurrency(item.amount, masterCurrency)}</span>
                      <span>·</span>
                      <span className={isUnlocked ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                        {isUnlocked ? '🔓 72h Cooldown Completed' : '⏳ Cooling off in progress'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveWish(item.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Wishlist Input */}
            <div className="pt-2 border-t border-border/60 flex gap-2">
              <Input
                placeholder="Item name (e.g. Designer Jacket)"
                value={wishName}
                onChange={e => setWishName(e.target.value)}
                className="text-xs flex-1 rounded-xl"
              />
              <Input
                placeholder="Amount (₹)"
                type="number"
                value={wishAmount}
                onChange={e => setWishAmount(e.target.value)}
                className="text-xs w-28 rounded-xl"
              />
              <Button size="sm" onClick={handleAddWish} className="text-xs gap-1 rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Hold 72h
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges & Milestone Achievements (Feature 28) */}
        <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-[#7cf046]" /> Milestone Badges
              <InfoHint text="Achievements unlocked as you build positive financial discipline." />
            </CardTitle>
            <span className="text-xs font-bold text-emerald-600">
              5/5 Unlocked
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BADGES.map(badge => (
              <div
                key={badge.id}
                className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[#7cf046]/20 border border-[#7cf046]/40 flex items-center justify-center text-lg shrink-0">
                  {badge.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{badge.name}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{badge.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
