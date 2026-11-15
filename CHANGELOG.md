# Changelog

All notable changes to the Personal Expense Tracker project are documented here.

---

## [1.0.0] - 2026-11-15

### Initial Production Release
- **Core Engine & Architecture**:
  - Implemented local-first architecture using Dexie.js (IndexedDB).
  - Seeded default categories, payment methods, and user settings.
  - Minor currency units representation for zero floating-point calculation errors.
- **Transactions & Incomes**:
  - Complete expense and income tracking modules with custom tagging.
  - Multi-filtering, search, and bidirectional sorting.
  - CSV report export utility.
- **Budgeting & Categories**:
  - Flexible multi-period budgets with visual threshold alerts.
  - Custom categories with color swatch picker and referential integrity protection.
- **Analytics & Visualizations**:
  - Recharts integration: Area charts, Donut category breakdown, Needs vs Wants distribution.
  - Automatic spending highlights (peak spending day, largest purchase, daily averages).
- **Special Events & Trips**:
  - Event-specific budgeting and expense isolation.
- **AI Financial Assistant**:
  - Local rule-based and statistical intelligence engine.
  - Natural language Q&A chat grounded in real user data.
  - Automated insights and Financial Health Score (0-100).
- **Receipt OCR & Scanning**:
  - Image compression and local OCR text extraction.
  - One-click receipt-to-expense conversion.
- **Recurring Transactions**:
  - Subscription management with due dates, pause, and resume capabilities.
- **Bill Splitting**:
  - Shared expense division with custom or equal shares and settlement toggles.
- **Data Protection & PWA**:
  - Full JSON export and schema-validated restore.
  - Progressive Web App manifest and offline service worker caching via Workbox.
  - GitHub Actions automated CI/CD deployment workflow.
