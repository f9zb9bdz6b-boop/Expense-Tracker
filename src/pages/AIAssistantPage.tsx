// ============================================================
// AIAssistantPage - Quantitative Financial Intelligence Suite
// Featuring:
// 1. Interactive Conversational Heuristic Advisory Copilot
// 2. "Can I Afford This?" Instant Purchase Simulator (Feature 6)
// 3. "Cost-in-Life-Hours" Time vs Money Life Energy Converter
// 4. Deterministic Macro Stress-Testing Lab (Income drop, emergency shock)
// 5. 100+ Quantitative Heuristic Signals & Resilience Radar
// 6. 100% On-Device, Privacy-Preserving, Zero Cloud Dependency
// ============================================================
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { answerFinancialQuestion, generateSmartInsights } from '@/utils/ai-engine';
import {
  runComprehensiveAIAnalysis,
  calculateLifeHours,
  simulateScenario
} from '@/utils/ai-quant-engine';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, DEFAULT_CURRENCY, toMinorUnits, getActiveMasterCurrency } from '@/utils/currency';
import { animateSpringPress, playFeedbackChime } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InfoHint } from '@/components/ui/info-hint';
import {
  Sparkles, Send, Bot, User, Zap, Lightbulb,
  ShieldCheck, AlertTriangle, ArrowRight, HelpCircle,
  Calculator, Gauge, AlertCircle, RefreshCw, CheckCircle2,
  TrendingDown, TrendingUp, SlidersHorizontal, ShieldAlert,
  Clock, Hourglass, Activity, Flame, Shield, DollarSign
} from 'lucide-react';
import type { AIChatMessage } from '@/types';
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

const INITIAL_MESSAGES: AIChatMessage[] = [
  {
    id: 'msg-init-1',
    role: 'assistant',
    content: "👋 Hello! I am your 100% on-device AI Quantitative Financial Advisor. I monitor 100+ logical financial heuristics across your cash flow, burn rate, impulse leaks, and FI/RE runway in real time. Ask me anything or explore the interactive simulators above!",
    timestamp: Date.now(),
  }
];

const QUICK_QUESTIONS = [
  "Can I afford a ₹15,000 weekend trip?",
  "How much life energy does my dining spend cost me?",
  "What is my probability of an end-of-month deficit?",
  "Stress-test my finances if income drops 30%",
];

export default function AIAssistantPage() {
  const { settings } = useSettings();
  const masterCurrency = settings?.currency || getActiveMasterCurrency();
  const [messages, setMessages] = useState<AIChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'simulator' | 'lifehours' | 'stresstest' | 'quant100'>('chat');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Purchase Simulator State
  const [simAmount, setSimAmount] = useState<string>('5000');
  const [simDescription, setSimDescription] = useState<string>('New Gadget / Dinner');

  // Life Hours State
  const [lifePrice, setLifePrice] = useState<string>('12000');
  const [hourlyWage, setHourlyWage] = useState<string>('600');

  // Stress Test Selected Scenario
  const [selectedScenario, setSelectedScenario] = useState<'income_shock_30' | 'emergency_shock_50k' | 'frugal_lockdown_40'>('income_shock_30');

  // Load real records
  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const income = useLiveQuery(() => db.income.toArray()) ?? [];
  const categories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) ?? [];
  const goals = useLiveQuery(() => db.financialGoals.toArray()) ?? [];
  const recurring = useLiveQuery(() => db.recurringTransactions.toArray()) ?? [];

  // Compute 100-Signal AI Quantitative Engine Report
  const quantReport = useMemo(() =>
    runComprehensiveAIAnalysis(expenses, income, budgets, goals, recurring),
    [expenses, income, budgets, goals, recurring]
  );

  const insights = useMemo(() =>
    generateSmartInsights(expenses, income, categories, budgets),
    [expenses, income, categories, budgets]
  );

  // Life Hours Calculations
  const lifeHoursResult = useMemo(() => {
    const pMinor = toMinorUnits(parseFloat(lifePrice) || 0);
    const wage = parseFloat(hourlyWage) || 500;
    return calculateLifeHours(pMinor, wage);
  }, [lifePrice, hourlyWage]);

  // Scenario Stress Test Calculations
  const scenarioResult = useMemo(() => {
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const totalInc = income.reduce((s, i) => s + i.amount, 0);
    const liquid = Math.max(0, totalInc - totalSpent);
    return simulateScenario(selectedScenario, totalSpent, totalInc, liquid);
  }, [selectedScenario, expenses, income]);

  // Simulator Calculations
  const now = new Date();
  const mStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const mEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const thisMonthExpenses = useMemo(() => expenses.filter(e => e.date >= mStart && e.date <= mEnd), [expenses, mStart, mEnd]);
  const thisMonthIncome = useMemo(() => income.filter(i => i.date >= mStart && i.date <= mEnd), [income, mStart, mEnd]);
  const totalSpentThisMonth = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncomeThisMonth = thisMonthIncome.reduce((s, i) => s + i.amount, 0);

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
        text: `Consumes ${Math.round(simImpactRatio)}% of your remaining monthly buffer. Apply the 72-Hour cooling rule before completing this transaction.`,
      };
    }
    return {
      verdict: 'APPROVED - SAFE',
      color: 'emerald',
      text: `Comfortably funded! Leaves ${formatCurrency(bufferAfterPurchase)} buffer remaining in your monthly cash runway.`,
    };
  }, [simNum, bufferAfterPurchase, simImpactRatio]);

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
      playFeedbackChime('tap');
    }, 380);
  };

  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
    playFeedbackChime('tap');
  });

  useGSAP(() => {
    gsap.fromTo('.motion-header', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'all' });
    gsap.from('.motion-card', { y: 18, opacity: 0.3, duration: 0.55, stagger: 0.05, ease: 'power2.out', delay: 0.06, clearProps: 'all' });
  }, []);

  return (
    <div ref={pageRef} className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header with Resilience Score */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              AI Quantitative Financial Copilot <Sparkles className="w-5 h-5 text-emerald-600 dark:text-[#7cf046]" />
            </h1>
            <InfoHint
              title="100+ AI Financial Signals"
              description="Mathematical, 100% on-device heuristic engine evaluating 100 personal finance parameters: runway, stress tests, life hours, and behavioral deflections."
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time quantitative risk models, deterministic stress-testing, and behavioral heuristics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="px-3 py-1 gap-1.5 text-xs text-[#082b14] bg-[#7cf046] font-extrabold border-0 shadow-xs">
            <Zap className="w-3.5 h-3.5" /> 100 AI Signals Active
          </Badge>
        </div>
      </div>

      {/* Navigation Pills between AI Modules */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: 'chat', label: 'Advisory Chat', icon: <Bot className="w-4 h-4" /> },
          { id: 'simulator', label: 'Can I Afford This?', icon: <Calculator className="w-4 h-4" /> },
          { id: 'lifehours', label: 'Cost in Life-Hours', icon: <Clock className="w-4 h-4" /> },
          { id: 'stresstest', label: 'Stress-Testing Lab', icon: <ShieldAlert className="w-4 h-4" /> },
          { id: 'quant100', label: `100 AI Heuristics (${quantReport.overallHealthScore}/100)`, icon: <Activity className="w-4 h-4" /> },
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
          <Card className="motion-card lg:col-span-2 flex flex-col h-[580px] shadow-xs border-border/80">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#7cf046]/20 text-[#082b14] dark:text-[#7cf046] flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Quantitative Financial Assistant</CardTitle>
                  <CardDescription className="text-xs">Grounded strictly in your private local Dexie ledger</CardDescription>
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
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-500" /> Calculating mathematical financial advice...
                </div>
              )}
              <div ref={chatBottomRef} />
            </CardContent>

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

          <div className="space-y-6">
            <Card className="motion-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                  <span>AI Financial Resilience</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#7cf046]" />
                </CardTitle>
                <CardDescription className="text-xs">Composite score across 100 quantitative heuristics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-4xl font-extrabold text-foreground privacy-blur tabular-nums">
                    {quantReport.overallHealthScore}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">/ 100</span>
                </div>
                <Progress value={quantReport.overallHealthScore} className="h-2.5" />

                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs border-t border-border">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <p className="font-extrabold text-emerald-700 dark:text-emerald-300 privacy-blur tabular-nums">{quantReport.optimalCount}</p>
                    <p className="text-[10px] text-muted-foreground">Optimal</p>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <p className="font-extrabold text-amber-700 dark:text-amber-300 privacy-blur tabular-nums">{quantReport.cautionCount}</p>
                    <p className="text-[10px] text-muted-foreground">Caution</p>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10">
                    <p className="font-extrabold text-rose-700 dark:text-rose-300 privacy-blur tabular-nums">{quantReport.criticalCount}</p>
                    <p className="text-[10px] text-muted-foreground">Critical</p>
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
                  <div key={ins.id} className="p-3 rounded-xl border border-border/70 text-xs space-y-1 bg-muted/20">
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
                Check whether an upcoming planned or impulse buy will breach your monthly runway or emergency buffer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Item or Experience</label>
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
                  <span className="text-muted-foreground">Monthly Inflow:</span>
                  <span className="font-bold text-foreground privacy-blur tabular-nums">{formatCurrency(totalIncomeThisMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spent So Far:</span>
                  <span className="font-bold text-rose-600 privacy-blur tabular-nums">-{formatCurrency(totalSpentThisMonth)}</span>
                </div>
                <div className="flex justify-between border-t border-border/80 pt-1">
                  <span className="text-muted-foreground">Liquid Buffer Remaining:</span>
                  <span className="font-extrabold text-foreground privacy-blur tabular-nums">{formatCurrency(currentAvailableBuffer)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="motion-card flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <span>AI Mathematical Verdict</span>
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
                    <strong className="text-foreground privacy-blur tabular-nums">{Math.min(100, Math.round(simImpactRatio))}%</strong>
                  </div>
                  <Progress value={Math.min(100, simImpactRatio)} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-muted-foreground">Remaining Runway After</p>
                  <p className="text-lg font-extrabold text-foreground mt-0.5 privacy-blur tabular-nums">
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

      {/* TAB 3: "Cost-in-Life-Hours" Time vs Money Converter */}
      {activeTab === 'lifehours' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="motion-card">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" /> Cost in Life Energy Calculator
              </CardTitle>
              <CardDescription className="text-xs">
                Every rupee spent is life energy traded at your wage rate. Discover how many hours of work a purchase truly demands.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Purchase Price ({DEFAULT_CURRENCY.symbol})</Label>
                <Input
                  type="number"
                  value={lifePrice}
                  onChange={e => setLifePrice(e.target.value)}
                  placeholder="12000"
                  className="rounded-xl text-lg font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Your Hourly Take-Home Wage ({DEFAULT_CURRENCY.symbol}/hr)</Label>
                <Input
                  type="number"
                  value={hourlyWage}
                  onChange={e => setHourlyWage(e.target.value)}
                  placeholder="600"
                  className="rounded-xl font-bold"
                />
                <p className="text-[11px] text-muted-foreground">
                  (e.g., Monthly salary of ₹1,00,000 / 160 work hours = ≈ ₹625/hr)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {['2000', '10000', '25000'].map(p => (
                  <button
                    key={p}
                    onClick={() => setLifePrice(p)}
                    className="p-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted text-center cursor-pointer transition-colors"
                  >
                    ₹{parseInt(p).toLocaleString()}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Life Hours Output Card */}
          <Card className="motion-card flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <span>Life Energy Required</span>
                <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs font-bold">
                  Work Equivalency
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-1">
                <p className="text-xs text-indigo-900 dark:text-indigo-200 font-semibold uppercase tracking-wider">
                  You Must Trade
                </p>
                <p className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-300 privacy-blur tabular-nums">
                  {lifeHoursResult.hours}h {lifeHoursResult.minutes}m
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  Equivalent to <strong className="text-foreground">{lifeHoursResult.workDays} Full Work Days</strong> of your finite life
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> Compounding Opportunity Cost
                </span>
                <p className="text-muted-foreground leading-normal">
                  If this amount was deposited into an index wealth fund earning 10% CAGR instead:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                    <p className="text-[10px] text-muted-foreground">Value in 10 Years</p>
                    <p className="text-base font-extrabold text-foreground privacy-blur tabular-nums">
                      ₹{lifeHoursResult.invested10Y.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                    <p className="text-[10px] text-muted-foreground">Value in 20 Years</p>
                    <p className="text-base font-extrabold text-primary privacy-blur tabular-nums">
                      ₹{lifeHoursResult.invested20Y.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: Deterministic Scenario Stress-Testing Lab */}
      {activeTab === 'stresstest' && (
        <div className="space-y-6">
          <Card className="motion-card">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span>Macro Financial Stress-Testing Lab</span>
                </div>
                <Badge variant="outline" className="text-xs">Deterministic Solvency Model</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Simulate catastrophic income shocks, medical emergencies, or aggressive frugal lockdown scenarios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scenario Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'income_shock_30', title: 'Sudden 30% Pay Drop', desc: 'Layoff / Salary reduction shock' },
                  { id: 'emergency_shock_50k', title: '₹50,000 Emergency Bill', desc: 'Sudden medical or vehicle repair' },
                  { id: 'frugal_lockdown_40', title: '40% Frugal Lockdown', desc: 'Max savings surplus simulation' },
                ].map(sc => {
                  const isSelected = selectedScenario === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => setSelectedScenario(sc.id as typeof selectedScenario)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7cf046] text-[#082b14] border-[#7cf046] font-bold shadow-xs'
                          : 'bg-card text-muted-foreground hover:text-foreground border-border'
                      }`}
                    >
                      <p className="text-xs font-bold">{sc.title}</p>
                      <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-[#082b14]/80' : 'text-muted-foreground'}`}>{sc.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Stress Test Simulation Output */}
              <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">{scenarioResult.title}</h3>
                  <Badge
                    className={`px-3 py-1 text-xs font-extrabold uppercase rounded-full ${
                      scenarioResult.verdict === 'SOLVENT' || scenarioResult.verdict === 'ABSORBED' || scenarioResult.verdict === 'HIGH SURPLUS'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {scenarioResult.verdict}
                  </Badge>
                </div>

                <p className="text-sm text-foreground font-medium leading-relaxed">
                  {scenarioResult.advice}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-muted-foreground">Post-Shock Balance</p>
                    <p className={`text-lg font-extrabold mt-0.5 privacy-blur tabular-nums ${
                      scenarioResult.netDelta >= 0 ? 'text-emerald-600 dark:text-[#7cf046]' : 'text-rose-600'
                    }`}>
                      {scenarioResult.netDelta >= 0 ? `+${formatCurrency(scenarioResult.netDelta)}` : `-${formatCurrency(Math.abs(scenarioResult.netDelta))}`}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-muted-foreground">Reserves Survival Buffer</p>
                    <p className="text-lg font-extrabold text-foreground mt-0.5 privacy-blur tabular-nums">
                      {scenarioResult.runwayMonths >= 90 ? 'Indefinite' : `${scenarioResult.runwayMonths} Months`}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border col-span-2 sm:col-span-1">
                    <p className="text-muted-foreground">Recommended Stance</p>
                    <p className="text-lg font-extrabold text-primary mt-0.5">
                      {scenarioResult.verdict === 'DEFICIT ALERT' ? 'Defensive' : 'Resilient'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: 100+ Quantitative Signals Audit */}
      {activeTab === 'quant100' && (
        <div className="space-y-6">
          <Card className="motion-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <span>100 AI Quantitative Signals Audit</span>
                </div>
                <Badge className="bg-primary text-primary-foreground font-bold text-xs">
                  Resilience Score: {quantReport.overallHealthScore}/100
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Comprehensive evaluation across Cash Flow, Anomalies, Behavioral Biases, Budgets, and FI/RE Runway.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {quantReport.signals.map(sig => (
                  <div
                    key={sig.id}
                    className="p-3.5 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {sig.pillar}
                        </span>
                        <h4 className="text-sm font-bold text-foreground mt-0.5">{sig.title}</h4>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-extrabold uppercase shrink-0 ${
                          sig.status === 'optimal'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : sig.status === 'caution'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : sig.status === 'critical'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {sig.status}
                      </Badge>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/30 border border-border text-xs flex justify-between items-center">
                      <span className="text-muted-foreground">Observed Signal:</span>
                      <strong className="text-foreground privacy-blur tabular-nums">{sig.metric}</strong>
                    </div>

                    <p className="text-xs text-muted-foreground leading-normal">
                      {sig.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
