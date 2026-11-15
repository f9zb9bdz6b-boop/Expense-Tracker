# 💰 Personal Expense Tracker — Complete Personal Finance Web Application

A modern, comprehensive, local-first personal financial management and expense tracking progressive web application (PWA) built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Dexie.js (IndexedDB)**, and **Recharts**.

---

## 🌟 Key Highlights

- **🔒 100% Privacy & Local-First**: All financial records, receipts, categories, budgets, and goals remain stored securely inside your browser's IndexedDB. No external servers or telemetry.
- **⚡ Offline-First PWA**: Installable as a standalone app on desktop, tablet, and mobile devices with full offline persistence and caching.
- **🧠 Local AI Financial Assistant**: On-device statistical and rule-based intelligence engine that analyzes spending patterns, highlights savings opportunities, and answers natural language financial questions.
- **📊 Interactive Visual Analytics**: Donut category distributions, spending trend area charts, day-of-week analysis, and comparison metrics.
- **🎯 Flexible Budgeting**: Set daily, weekly, or monthly overall or category-specific spending caps with color-coded threshold alerts (50%, 75%, 90%, 100%).
- **🏖️ Special Events & Trips**: Separate unusual event expenses (vacations, weddings, festivals) from everyday living costs without double-counting.
- **🧾 Receipt Scanning & OCR**: Upload or snap photos of receipts with automated merchant and total extraction.
- **🔄 Recurring Transactions**: Monitor subscriptions (Netflix, broadband, rent, gym) and upcoming due dates.
- **🤝 Bill Splitting**: Split group dining and shared apartment bills, track individual shares, and log settlements.
- **💾 Full Backup & Restoration**: Export encrypted/portable JSON backups and CSV reports with duplicate protection.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v20.19+ or v22 LTS)
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/<your-username>/expense-tracker.git
cd expense-tracker

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build
```bash
# Type check and bundle for production
npm run build

# Preview production build locally
npm run preview
```

---

## 📂 Project Structure

```
expense-tracker/
├── .github/workflows/deploy.yml   # GitHub Pages automated CI/CD pipeline
├── public/                        # Static assets & Web Manifest
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/                # Responsive Sidebar, Header, MobileNav, AppLayout
│   │   └── ui/                    # Custom shadcn-style accessible primitives
│   ├── contexts/                  # ThemeContext (Dark/Light) & SettingsContext
│   ├── db/
│   │   ├── database.ts            # Dexie schema versioning & seed default data
│   │   └── repositories.ts        # Typed repository functions for all collections
│   ├── hooks/
│   │   ├── useDashboard.ts        # Live summary calculations from real DB records
│   │   └── useAnalytics.ts        # Statistical computations & highlights
│   ├── pages/                     # 14 Full Application Pages
│   │   ├── DashboardPage.tsx      # Overview & quick metrics
│   │   ├── TransactionsPage.tsx   # Search, filters, sort & CSV export
│   │   ├── AddExpensePage.tsx     # Expense logging with quick category creation
│   │   ├── IncomePage.tsx         # Income logging & source management
│   │   ├── CategoriesPage.tsx     # Category customization with icons & colors
│   │   ├── BudgetsPage.tsx        # Budget management & threshold alerts
│   │   ├── EventsPage.tsx         # Trips & special expenses
│   │   ├── AnalyticsPage.tsx      # Trend charts & spending highlights
│   │   ├── GoalsPage.tsx          # Savings goals & contribution tracker
│   │   ├── AIAssistantPage.tsx    # Conversational on-device AI advisor
│   │   ├── ReceiptsPage.tsx       # Receipt scanner, OCR & attachments
│   │   ├── RecurringPage.tsx      # Subscriptions & recurring bills
│   │   ├── SplitsPage.tsx         # Group bill splitting & settlements
│   │   └── SettingsPage.tsx       # Currency, themes, JSON backup & restore
│   ├── styles/                    # Tailwind CSS globals & theme variables
│   ├── types/                     # Complete TypeScript interfaces
│   ├── utils/                     # Currency (minor units), date & helper functions
│   ├── App.tsx                    # React Router configuration & DB initializer
│   └── main.tsx                   # Application bootstrap
├── ARCHITECTURE.md                # System design & architecture documentation
├── FEATURES.md                    # Detailed feature reference guide
├── DEVELOPMENT.md                 # Development & environment guidelines
├── TESTING.md                     # Verification & testing procedures
└── vite.config.ts                 # Vite & PWA configuration
```

---

## 📜 License
MIT License. Built with ❤️ for private, accessible personal financial independence.
