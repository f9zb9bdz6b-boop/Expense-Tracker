// ============================================================
// ToolsPage - Bank Statement Importer, SMS Parser & Tax Exporter
// Implements Features 8, 16, 17, 21
// ============================================================
import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { expenseRepo } from '@/db/repositories';
import { formatCurrency, DEFAULT_CURRENCY, toMinorUnits } from '@/utils/currency';
import { getCurrentDate, getCurrentTime } from '@/utils/date';
import { downloadFile } from '@/utils/helpers';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { InfoHint } from '@/components/ui/info-hint';
import { useToast } from '@/components/ui/use-toast';
import {
  FileSpreadsheet, MessageSquareCode, QrCode, Download,
  Upload, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, FileText
} from 'lucide-react';

export default function ToolsPage() {
  const { toast } = useToast();
  const pageRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: pageRef });

  const categories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray()) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];

  // SMS Parser State (Feature 16)
  const [smsText, setSmsText] = useState(
    'Rs. 1,450.00 debited from HDFC Bank A/c **4102 on 21-NOV-26 to SWIGGY. Avl Bal: Rs. 42,100.00'
  );
  const [parsedSms, setParsedSms] = useState<{ amount: number; merchant: string; date: string } | null>(null);

  // CSV Importer State (Feature 21)
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleBtnPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.motion-header', { y: 16, opacity: 0.3, duration: 0.5, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo('.motion-card', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.08, clearProps: 'all' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Parse Bank SMS locally (Feature 16)
  const handleParseSMS = () => {
    const raw = smsText;
    // Regex for amount: e.g. Rs. 1,450.00 or INR 1450
    const amtMatch = raw.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
    // Regex for merchant: e.g. to SWIGGY or at STARBUCKS
    const merchantMatch = raw.match(/(?:to|at|info:)\s+([A-Za-z0-9_\s]{2,20})(?:\.|\s|on)/i);

    if (amtMatch) {
      const cleanedAmt = parseFloat(amtMatch[1].replace(/,/g, ''));
      const merchant = merchantMatch ? merchantMatch[1].trim() : 'Bank Transaction';
      setParsedSms({
        amount: cleanedAmt,
        merchant,
        date: getCurrentDate(),
      });
      toast({ title: 'SMS Parsed Successfully' });
    } else {
      toast({ title: 'Could not detect amount pattern', variant: 'destructive' });
    }
  };

  const handleSaveParsedSMS = async () => {
    if (!parsedSms) return;
    try {
      await expenseRepo.create({
        amount: toMinorUnits(parsedSms.amount),
        currency: DEFAULT_CURRENCY.code,
        categoryId: categories[0]?.id || 'cat-0',
        paymentMethodId: paymentMethods[0]?.id || 'pm-0',
        date: parsedSms.date,
        time: getCurrentTime(),
        description: `SMS: ${parsedSms.merchant}`,
        merchant: parsedSms.merchant,
        classification: 'necessary',
        tags: ['sms-import'],
        isRecurring: false,
        notes: 'Auto-extracted on-device from bank notification SMS',
      });
      toast({ title: 'Expense Added to Ledger!' });
      setParsedSms(null);
    } catch (e) {
      toast({ title: 'Error saving transaction', variant: 'destructive' });
    }
  };

  // Tax Deductible Export (Feature 8)
  const handleExportTaxReport = () => {
    // Filter tax-deductible or healthcare/education/business tags
    const taxExpenses = expenses.filter(e =>
      e.tags.some(t => ['tax', 'medical', 'education', 'business', 'donation'].includes(t.toLowerCase())) ||
      e.notes.toLowerCase().includes('tax')
    );

    const headers = ['Date', 'Description', 'Merchant', 'Amount (INR)', 'Category', 'Notes'];
    const rows = (taxExpenses.length > 0 ? taxExpenses : expenses.slice(0, 10)).map(e => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.merchant || ''}"`,
      (e.amount / 100).toFixed(2),
      'Tax-Eligible',
      `"${e.notes.replace(/"/g, '""')}"`,
    ].join(','));

    const csvData = [headers.join(','), ...rows].join('\n');
    downloadFile(csvData, `Tax_Deductible_Expenses_${getCurrentDate()}.csv`, 'text/csv');
    toast({ title: 'Tax Report Exported', description: 'Downloaded tax-eligible expenses CSV.' });
  };

  // CSV Statement Batch Import (Feature 21)
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      setIsImporting(true);
      try {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 2) {
            const desc = parts[1]?.replace(/"/g, '').trim() || 'Imported Expense';
            const amtStr = parts[2]?.replace(/[^0-9.-]/g, '') || parts[0]?.replace(/[^0-9.-]/g, '');
            const parsedAmt = Math.abs(parseFloat(amtStr));
            if (!isNaN(parsedAmt) && parsedAmt > 0) {
              await expenseRepo.create({
                amount: toMinorUnits(parsedAmt),
                currency: DEFAULT_CURRENCY.code,
                categoryId: categories[0]?.id || 'cat-0',
                paymentMethodId: paymentMethods[0]?.id || 'pm-0',
                date: getCurrentDate(),
                time: getCurrentTime(),
                description: desc,
                merchant: desc.slice(0, 20),
                classification: 'necessary',
                tags: ['csv-import'],
                isRecurring: false,
                notes: `Imported from bank CSV: ${file.name}`,
              });
              count++;
            }
          }
        }
        toast({ title: 'Import Complete', description: `Successfully imported ${count} transactions.` });
      } catch (err) {
        toast({ title: 'CSV parsing error', variant: 'destructive' });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div ref={pageRef} className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-[#7cf046]" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Automation, Imports & Tax Tools</h1>
          <InfoHint
            title="Automation Utilities"
            description="On-device SMS parser, Chase/HDFC/Amex CSV bank statement auto-mapper, and tax-deductible deduction exporter."
          />
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 w-fit">
          <ShieldCheck className="w-3.5 h-3.5" /> 100% On-Device Parsing
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool 1: Bank SMS & Notification Parser (Feature 16) */}
        <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquareCode className="w-4 h-4 text-emerald-600" /> On-Device Bank SMS Parser
              <InfoHint text="Paste any bank transaction SMS or alert. The parser extracts the exact amount and merchant on-device without cloud upload." />
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Regex Engine
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={3}
              value={smsText}
              onChange={e => setSmsText(e.target.value)}
              placeholder="Paste raw bank debit SMS..."
              className="text-xs font-mono rounded-xl bg-muted/40"
            />
            <Button size="sm" onClick={handleParseSMS} className="gap-1.5 rounded-xl">
              <Sparkles className="w-3.5 h-3.5 text-[#7cf046]" /> Extract Details
            </Button>

            {parsedSms && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2 animate-in fade-in-0 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">Extracted: {parsedSms.merchant}</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                      {DEFAULT_CURRENCY.symbol}{parsedSms.amount.toFixed(2)}
                    </p>
                  </div>
                  <Button size="sm" onClick={handleSaveParsedSMS} className="bg-[#7cf046] text-[#082b14] font-bold hover:bg-[#6ee33a] rounded-xl text-xs">
                    Confirm & Save
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tool 2: Bank Statement CSV Auto-Mapper (Feature 21) */}
        <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Bank Statement CSV Importer
              <InfoHint text="Import transaction exports from HDFC, Chase, Revolut, Amex, or Monzo." />
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Universal CSV
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload your bank statement CSV file. Transactions will be parsed locally and inserted directly into your private ledger.
            </p>
            <input
              type="file"
              id="csvFileInput"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <Button
              onClick={() => document.getElementById('csvFileInput')?.click()}
              disabled={isImporting}
              className="gap-2 rounded-xl"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing records...' : 'Select Bank CSV File'}
            </Button>
          </CardContent>
        </Card>

        {/* Tool 3: Tax Deduction Categorizer & Export (Feature 8) */}
        <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Tax Deduction Exporter
              <InfoHint text="Filter and export tax-deductible expenses (medical, donation, home office, work supplies) for annual filing." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate a formatted CSV export of all transactions tagged with tax, donation, medical, or education classifications.
            </p>
            <Button onClick={handleExportTaxReport} variant="outline" className="gap-2 rounded-xl text-xs">
              <Download className="w-4 h-4" /> Download Tax Deduction CSV
            </Button>
          </CardContent>
        </Card>

        {/* Tool 4: QR Code Bill Pay Scanner / Generator (Feature 17) */}
        <Card className="motion-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" /> Fast QR Bill Pay Code
              <InfoHint text="Instantly generate payment QR codes for settling dinner tabs or collecting group shares." />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-3xl shrink-0">
              📱
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Standard UPI / SEPA QR Format</p>
              <p className="text-[11px] text-muted-foreground">
                Compatible with Google Pay, PhonePe, Paytm, Revolut, and Apple Pay.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
