// ============================================================
// AIAssistantPage - Intelligent Conversational Financial Assistant
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { answerFinancialQuestion, generateSmartInsights, calculateFinancialHealth } from '@/utils/ai-engine';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, Send, Bot, User, Zap, Lightbulb,
  ShieldCheck, AlertCircle, HelpCircle, ArrowRight
} from 'lucide-react';
import type { AIChatMessage } from '@/types';

const INITIAL_MESSAGES: AIChatMessage[] = [
  {
    id: 'msg-init-1',
    role: 'assistant',
    content: "👋 Hello! I'm your local AI Financial Assistant. I analyze your recorded expenses, budgets, and income in real-time to uncover savings opportunities and help you stay on budget. How can I help you today?",
    timestamp: Date.now(),
  }
];

const QUICK_QUESTIONS = [
  "Where did most of my money go?",
  "How can I cut expenses and save more?",
  "Am I staying within my budget limits?",
  "What is my current net balance?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<AIChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load real records
  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const income = useLiveQuery(() => db.income.toArray()) ?? [];
  const categories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) ?? [];
  const goals = useLiveQuery(() => db.financialGoals.toArray()) ?? [];

  // Compute insights and score
  const insights = generateSmartInsights(expenses, income, categories, budgets);
  const healthScore = calculateFinancialHealth(expenses, income, budgets, goals);

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

    // Simulate instant intelligent response from local rule engine
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
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            AI Financial Assistant <Sparkles className="w-5 h-5 text-indigo-500" />
          </h1>
          <p className="text-muted-foreground text-sm">
            Private, 100% on-device intelligent financial analysis and conversational advisory.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-500/30 w-fit">
          <Zap className="w-3.5 h-3.5" /> Local Intelligence Engine Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Chat Window */}
        <Card className="lg:col-span-2 flex flex-col h-[600px] shadow-sm">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Financial Advisory Chat</CardTitle>
                <p className="text-[11px] text-muted-foreground">Answers grounded strictly in your financial transactions</p>
              </div>
            </div>
          </CardHeader>

          {/* Messages scroll area */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(m => {
              const isBot = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isBot ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
                    }`}
                  >
                    {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                      isBot
                        ? 'bg-muted/50 text-foreground border border-border/50'
                        : 'bg-primary text-primary-foreground font-medium'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic pl-11">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Analyzing your spending records...
              </div>
            )}
            <div ref={chatBottomRef} />
          </CardContent>

          {/* Quick Questions & Input Footer */}
          <div className="p-3 border-t bg-card/60 space-y-2">
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
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
                placeholder="Ask about spending, budgets, savings..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!inputText.trim() || isTyping}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Right Col: Financial Health Score & Smart Insights */}
        <div className="space-y-6">
          {/* Health Score Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Financial Health Indicator</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </CardTitle>
              <CardDescription className="text-xs">Based on savings, budgets, and discretionary ratio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-foreground">{healthScore.overall}</span>
                <span className="text-xs font-semibold text-muted-foreground">out of 100</span>
              </div>
              <Progress value={healthScore.overall} className="h-2.5" />

              <div className="space-y-2.5 pt-2 text-xs text-muted-foreground border-t">
                <div className="flex justify-between">
                  <span>Savings Rate Adherence</span>
                  <strong className="text-foreground">{healthScore.savingsRate}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Budget Compliance</span>
                  <strong className="text-foreground">{healthScore.budgetAdherence}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Discretionary Control</span>
                  <strong className="text-foreground">{healthScore.discretionaryControl}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Goal Progress</span>
                  <strong className="text-foreground">{healthScore.emergencyFundProgress}%</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Insights Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" /> Automated Smart Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map(ins => (
                <div
                  key={ins.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    ins.type === 'warning'
                      ? 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-300'
                      : ins.type === 'recommendation'
                      ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-primary/5 border-primary/20 text-foreground'
                  }`}
                >
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    {ins.title}
                  </p>
                  <p className="text-muted-foreground leading-normal">{ins.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
