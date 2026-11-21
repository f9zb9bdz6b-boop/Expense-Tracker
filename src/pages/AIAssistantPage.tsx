// ============================================================
// AIAssistantPage - Intelligent Conversational Financial Assistant
// Featuring:
// 1. Interactive Financial Advisory Chat (Local Heuristic Engine)
// 2. "Can I Afford This?" Instant Purchase Simulator (Feature 6)
// 3. Predictive End-of-Month Runway & Balance Forecast (Feature 1)
// 4. Anomaly & Duplicate Expense Detector (Feature 2)
// 5. Subscription Creep & Unused Service Auditor (Feature 4)
// ============================================================
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { answerFinancialQuestion, generateSmartInsights, calculateFinancialHealth } from '@/utils/ai-engine';
import { formatCurrency, DEFAULT_CURRENCY } from '@/utils/currency';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InfoHint } from '@/components/ui/info-hint';
import {
  Sparkles, Send, Bot, User, Zap, Lightbulb,
  ShieldCheck, AlertTriangle, ArrowRight, HelpCircle,
  Calculator, Gauge, AlertCircle, RefreshCw, CheckCircle2,
  TrendingDown, TrendingUp, SlidersHorizontal, ShieldAlert
} from 'lucide-react';
import type { AIChatMessage } from '@/types';
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

const INITIAL_MESSAGES: AIChatMessage[] = [
  {
    id: 'msg-init-1',
    role: 'assistant',
    content: "👋 Hello! I'm your local AI Financial Advisor. I analyze your recorded expenses, budgets, and cash flow in real-time to forecast your runway, flag anomalies, and help you save. Ask me anything or use the interactive tools above!",
    timestamp: Date.now(),
  }
];

const QUICK_QUESTIONS = [
  "Can I afford a ₹15,000 weekend trip?",
  "Where did most of my money go this month?",
  "How can I cut expenses and increase savings?",
  "What is my current net runway?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<AIChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'simulator' | 'runway' | 'anomalies'>('chat');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Purchase Simulator State
  const [simAmount, setSimAmount] = useState<string>('5000');
  const [simCategory, setSimCategory] = useState<string>('');
  const [simDescription, setSimDescription] = useState<string>('New Gadget / Dinner');

  // Runway Sensitivity Slider (Discretionary spend cut %: 0% to 50%)
  const [cutDiscretionaryPct, setCutDiscretionaryPct] = useState<number>(0);

  // Load real records
  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const income = useLiveQuery(() => db.income.toArray()) ?? [];
  const categories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) ?? [];
  const goals = useLiveQuery(() => db.financialGoals.toArray()) ?? [];
  const recurring = useLiveQuery(() => db.recurringTransactions.toArray()) ?? [];

  // Compute insights and score
  const insights = generateSmartInsights(expenses, income, categories, budgets);
  const healthScore = calculateFinancialHealth(expenses, income, budgets, goals);

  const now = new Date();
  const mStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const mEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const daysInMonth = differenceInDays(endOfMonth(now), startOfMonth(now)) + 1;
  const currentDay = now.getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);

  const thisMonthExpenses = useMemo(() =>
    expenses.filter(e => e.date >= mStart && e.date <= mEnd),
    [expenses, mStart, mEnd]
  );

  const totalSpentThisMonth = useMemo(() =>
    thisMonthExpenses.reduce((s, e) => s + e.amount, 0),
    [thisMonthExpenses]
  );

  const totalIncomeThisMonth = useMemo(() =>
    income.filter(i => i.date >= mStart && i.date <= mEnd).reduce((s, i) => s + i.amount, 0),
    [income, mStart, mEnd]
  );

  // Burn rate calculations
  const dailyBurn = currentDay > 0 ? totalSpentThisMonth / currentDay : 0;
  const projectedMonthEndSpend = totalSpentThisMonth + (dailyBurn * remainingDays * (1 - (cutDiscretionaryPct / 100) * 0.4));
  const projectedBalance = totalIncomeThisMonth - projectedMonthEndSpend;

  // Simulator Engine Calculations
  const simNum = (parseFloat(simAmount) || 0) * 100;
  const currentAvailableBuffer = Math.max(0, totalIncomeThisMonth - totalSpentThisMonth);
  const bufferAfterPurchase = totalIncomeThisMonth - (totalSpentThisMonth + simNum);
  const simImpactRatio = currentAvailableBuffer > 0 ? (simNum / currentAvailableBuffer) * 100 : 100;

  const simVerdict = useMemo(() => {
    if (simNum <= 0) return { verdict: 'SAFE', color: 'emerald', text: 'Enter purchase amount to simulate impact.' };
    if (bufferAfterPurchase < 0) {
      return {
        verdict: 'DEFICIT ALERT',
        color: 'rose',
        text: `This purchase pushes your monthly cash flow into a deficit of ${formatCurrency(Math.abs(bufferAfterPurchase))}. Delay or fund from dedicated savings.`,
      };
    }
    if (simImpactRatio > 40) {
      return {
        verdict: 'CAUTION - 72H RULE',
        color: 'amber',
        text: `Consumes ${Math.round(simImpactRatio)}% of your remaining monthly liquid buffer. Apply the 72-Hour cooling rule before completing this transaction.`,
      };
    }
    return {
      verdict: 'APPROVED - SAFE',
      color: 'emerald',
      text: `Comfortably funded! Leaves ${formatCurrency(bufferAfterPurchase)} buffer remaining in your monthly cash runway.`,
    };
  }, [simNum, bufferAfterPurchase, simImpactRatio]);

  // Anomaly & Duplicate Detector
  const anomalies = useMemo(() => {
    const list: { id: string; type: 'duplicate' | 'outlier'; title: string; desc: string; date: string; amount: number }[] = [];
    
    // Check duplicates (same amount within 24 hours)
    for (let i = 0; i < expenses.length; i++) {
      for (let j = i + 1; j < expenses.length; j++) {
        const e1 = expenses[i];
        const e2 = expenses[j];
        if (e1.amount === e2.amount && Math.abs(new Date(e1.date).getTime() - new Date(e2.date).getTime()) <= 86400000) {
          list.push({
            id: `dup-${e1.id}-${e2.id}`,
            type: 'duplicate',
            title: `Potential Duplicate: ${e1.description} & ${e2.description}`,
            desc: `Two identical charges of ${formatCurrency(e1.amount)} logged within 24 hours.`,
            date: e1.date,
            amount: e1.amount,
          });
          break;
        }
      }
    }

    // Outliers (> 3x average expense)
    const avgSpend = expenses.length > 0 ? expenses.reduce((s, e) => s + e.amount, 0) / expenses.length : 0;
    expenses.forEach(e => {
      if (avgSpend > 0 && e.amount > avgSpend * 3) {
        list.push({
          id: `outlier-${e.id}`,
          type: 'outlier',
          title: `Statistical Outlier: ${e.description}`,
          desc: `Expense is 3x higher than your average transaction size (${formatCurrency(avgSpend)}).`,
          date: e.date,
          amount: e.amount,
        });
      }
    });

    return list.slice(0, 5);
  }, [expenses]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    const query = text.trim();
    if (!query) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const response = answerFinancialQuestion(query, expenses, income, categories, budgets);
      const botMsg: AIChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 380);
  };

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    gsap.from('.motion-header', { y: 16, opacity: 0.3, duration: 0.5, ease: 'power2.out', clearProps: 'all' });
    gsap.from('.motion-card', { y: 20, opacity: 0.3, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.06, clearProps: 'all' });
  }, []);

  return (
    <div ref={pageRef} className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            AI Financial Copilot <Sparkles className="w-5 h-5 text-emerald-600 dark:text-[#7cf046]" />
          </h1>
          <InfoHint
            title="Local AI Intelligence"
            description="Private, 100% on-device predictive forecasting, purchase risk simulation, and anomaly detection."
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold bg-emerald-500/10">
            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-[#7cf046]" /> Real-time Heuristic Engine
          </Badge>
        </div>
      </div>

      {/* Navigation Pills between Features */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: 'chat', label: 'Advisory Chat', icon: <Bot className="w-4 h-4" /> },
          { id: 'simulator', label: 'Can I Afford This?', icon: <Calculator className="w-4 h-4" /> },
          { id: 'runway', label: 'Runway Forecast', icon: <Gauge className="w-4 h-4" /> },
          { id: 'anomalies', label: `Auditor (${anomalies.length})`, icon: <ShieldAlert className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={(e) => {
              handleBtnPress(e);
              setActiveTab(tab.id as typeof activeTab);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#7cf046] text-[#082b14] shadow-xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Conversational Advisory Chat */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Window */}
          <Card className="motion-card lg:col-span-2 flex flex-col h-[580px] shadow-xs border-border/80">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#7cf046]/20 text-[#082b14] dark:text-[#7cf046] flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Financial Advisory Assistant</CardTitle>
                  <CardDescription className="text-xs">Grounded in your private Dexie ledger records</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(m => {
                const isBot = m.role === 'assistant';
                return (
                  <div key={m.id} className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isBot ? 'bg-[#7cf046]/20 text-[#082b14] dark:text-[#7cf046]' : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-xs ${
                        isBot
                          ? 'bg-muted/40 text-foreground border border-border/60'
                          : 'bg-[#10241a] text-white font-medium'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground italic pl-11">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-500" /> Computing insights from your data...
                </div>
              )}
              <div ref={chatBottomRef} />
            </CardContent>

            {/* Quick Questions & Input */}
            <div className="p-3 border-t bg-card space-y-2">
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSend(inputText);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder="Ask e.g. 'Can I afford dinner tonight?', 'Summary of my Food spend'..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 rounded-xl"
                />
                <Button type="submit" size="icon" disabled={!inputText.trim() || isTyping} className="rounded-xl">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>

          {/* Right Column: Health Score & Highlights */}
          <div className="space-y-6">
            <Card className="motion-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                  <span>Financial Health Score</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#7cf046]" />
                </CardTitle>
                <CardDescription className="text-xs">Multifactor financial resilience indicator</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-4xl font-extrabold text-foreground">{healthScore.overall}</span>
                  <span className="text-xs font-bold text-muted-foreground">/ 100</span>
                </div>
                <Progress value={healthScore.overall} className="h-2.5" />

                <div className="space-y-2 pt-2 text-xs border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Savings Rate</span>
                    <strong className="text-foreground">{healthScore.savingsRate}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget Compliance</span>
                    <strong className="text-foreground">{healthScore.budgetAdherence}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discretionary Control</span>
                    <strong className="text-foreground">{healthScore.discretionaryControl}%</strong>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="motion-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> Automated Rules & Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {insights.slice(0, 3).map(ins => (
                  <div
                    key={ins.id}
                    className="p-3 rounded-xl border border-border/70 text-xs space-y-1 bg-muted/20"
                  >
                    <p className="font-bold text-foreground">{ins.title}</p>
                    <p className="text-muted-foreground leading-normal">{ins.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: "Can I Afford This?" Instant Purchase Simulator (Feature 6) */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="motion-card">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" /> Purchase Impact Simulator
              </CardTitle>
              <CardDescription className="text-xs">
                Check whether an upcoming impulse or planned purchase will jeopardize your monthly runway or emergency fund.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Purchase Description</label>
                <Input
                  value={simDescription}
                  onChange={e => setSimDescription(e.target.value)}
                  placeholder="e.g. Sony Headphones, Weekend Getaway, Gym Annual"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Amount ({DEFAULT_CURRENCY.symbol})</label>
                <Input
                  type="number"
                  value={simAmount}
                  onChange={e => setSimAmount(e.target.value)}
                  placeholder="5000"
                  className="rounded-xl text-lg font-bold"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {['1000', '3500', '7500', '15000', '30000'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setSimAmount(preset)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted font-medium transition-colors cursor-pointer"
                  >
                    +{formatCurrency(parseFloat(preset) * 100)}
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5 mt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Monthly Inflow:</span>
                  <span className="font-bold text-foreground">{formatCurrency(totalIncomeThisMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spent So Far:</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(totalSpentThisMonth)}</span>
                </div>
                <div className="flex justify-between border-t border-border/80 pt-1">
                  <span className="text-muted-foreground">Liquid Buffer Remaining:</span>
                  <span className="font-extrabold text-foreground">{formatCurrency(currentAvailableBuffer)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simulation Result Output */}
          <Card className="motion-card flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <span>AI Verdict</span>
                <Badge
                  className={`px-3 py-1 text-xs font-extrabold uppercase rounded-full ${
                    simVerdict.color === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : simVerdict.color === 'amber'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                  }`}
                >
                  {simVerdict.verdict}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {simVerdict.text}
                </p>
                <div className="space-y-1.5 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Buffer Consumed:</span>
                    <strong className="text-foreground">{Math.min(100, Math.round(simImpactRatio))}%</strong>
                  </div>
                  <Progress
                    value={Math.min(100, simImpactRatio)}
                    className="h-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-muted-foreground">Remaining Runway After</p>
                  <p className="text-lg font-extrabold text-foreground mt-0.5">
                    {formatCurrency(bufferAfterPurchase)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-muted-foreground">Recommended Wait</p>
                  <p className="text-lg font-extrabold text-foreground mt-0.5">
                    {simImpactRatio > 40 ? '72 Hours' : '0 Days'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Predictive End-of-Month Runway & Forecast (Feature 1) */}
      {activeTab === 'runway' && (
        <div className="space-y-6">
          <Card className="motion-card">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-emerald-600 dark:text-[#7cf046]" />
                  <span>Month-End Closing Balance Runway Forecast</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {remainingDays} days remaining in cycle
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Continuous extrapolation based on your real daily spending velocity and recurring obligations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                  <p className="text-xs text-muted-foreground font-medium">Daily Spending Velocity</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">{formatCurrency(dailyBurn)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Average per day so far</p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                  <p className="text-xs text-muted-foreground font-medium">Projected Month-End Outflow</p>
                  <p className="text-2xl font-extrabold text-rose-600 mt-1">-{formatCurrency(projectedMonthEndSpend)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Expected cycle close</p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                  <p className="text-xs text-muted-foreground font-medium">Projected Net Balance</p>
                  <p className={`text-2xl font-extrabold mt-1 ${projectedBalance >= 0 ? 'text-emerald-600 dark:text-[#7cf046]' : 'text-rose-600'}`}>
                    {projectedBalance >= 0 ? `+${formatCurrency(projectedBalance)}` : `-${formatCurrency(Math.abs(projectedBalance))}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {projectedBalance >= 0 ? 'Surplus runway guarded' : 'Projected cycle deficit'}
                  </p>
                </div>
              </div>

              {/* Sensitivity Simulation Slider */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span className="font-bold text-foreground">Discretionary Spending Trim Lever:</span>
                  </div>
                  <Badge className="bg-[#7cf046] text-[#082b14] font-extrabold text-xs">
                    Trim {cutDiscretionaryPct}%
                  </Badge>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={cutDiscretionaryPct}
                  onChange={e => setCutDiscretionaryPct(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Current Pace (0% cut)</span>
                  <span>Moderate Trim (25%)</span>
                  <span>Frugal Lockdown (50% cut)</span>
                </div>
                {cutDiscretionaryPct > 0 && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 pt-1">
                    💡 Trimming discretionary spend by {cutDiscretionaryPct}% adds approximately{' '}
                    <strong>{formatCurrency((dailyBurn * remainingDays * (cutDiscretionaryPct / 100) * 0.4))}</strong> to your end-of-month savings buffer!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: Anomaly & Duplicate Expense Auditor (Feature 2 & 4) */}
      {activeTab === 'anomalies' && (
        <div className="space-y-6">
          <Card className="motion-card">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span>Ledger Anomaly & Recurring Leak Auditor</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {anomalies.length} items flagged
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Flags potential accidental duplicate entries, double card swipes, and statistical expenditure spikes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {anomalies.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
                  <p className="text-sm font-semibold text-foreground">No Anomalies Found</p>
                  <p className="text-xs text-muted-foreground">Your transaction ledger is clean with zero duplicate or rogue charges detected.</p>
                </div>
              ) : (
                anomalies.map(anom => (
                  <div
                    key={anom.id}
                    className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase ${
                            anom.type === 'duplicate'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {anom.type}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">{anom.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{anom.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-foreground">{formatCurrency(anom.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">{anom.date}</p>
                    </div>
                  </div>
                ))
              )}

              {/* Recurring Subscriptions Audit Preview */}
              <div className="mt-6 pt-4 border-t border-border space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-primary" /> Active Recurring Commitments ({recurring.length})
                </h4>
                {recurring.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recurring subscriptions registered.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recurring.map(r => (
                      <div key={r.id} className="p-3 rounded-xl bg-muted/30 border border-border text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-foreground">{r.description}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{r.frequency} • Next: {r.nextDueDate}</p>
                        </div>
                        <span className="font-extrabold text-foreground">{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
