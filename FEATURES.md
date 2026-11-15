# Feature Catalog & Functional Specifications

This catalog provides an overview of all functional modules implemented in the Personal Expense Tracker application.

---

## 1. Dashboard (`/`)
- Real-time financial statistics: Total Incomes, Total Expenses, Net Surplus/Deficit.
- Active month spending comparison with daily and weekly metrics.
- Needs vs Wants (Essential vs Discretionary) balance bar.
- Interactive category spending Donut chart.
- Quick action triggers for adding expenses, logging income, and opening AI chat.
- Active budget progress meters with threshold warnings.
- Savings goals progress cards.
- Recent transaction logs with instant navigation.

## 2. Transactions (`/transactions`)
- Global text search across descriptions, merchants, and notes.
- Multi-dimensional filters: Type (All, Expenses, Income), Category, Needs vs Wants, and Date Range.
- Bidirectional sorting by Date and Amount.
- Formatted currency presentation in local symbols.
- Quick inline deletion with modal confirmation.
- One-click CSV report export.

## 3. Add Expense (`/add-expense`)
- Large numeric keypad-friendly amount input.
- Interactive category selection grid with icon badges.
- Quick inline category creation modal without leaving the form.
- Merchant tracking with auto-upsert in the merchant repository.
- Classification switch: Necessary (Needs) vs Discretionary (Wants).
- Optional Special Event association (e.g., Vacation, Wedding).
- Custom tags (press Enter to tag).
- Timestamp auto-fill with manual edit capability.

## 4. Income Management (`/income`)
- Inflow logging with custom sources (Salary, Freelance, Dividends, Gifts).
- Category assignment and notes.
- Income distribution pie chart.
- Complete income history logs with delete action.

## 5. Category Management (`/categories`)
- Separate management for Expense and Income categories.
- Color swatch picker for category tagging.
- Spending total and transaction counter per category.
- Referential integrity check: prevents accidental deletion of categories linked to transactions.

## 6. Budget Management (`/budgets`)
- Period options: Monthly, Weekly, Daily, Yearly.
- Overall spending cap or Category-specific caps.
- Visual progress bar with color-coded alerts (Safe, Warning, Exceeded).
- Over-budget warning banners.

## 7. Special Expenses & Events (`/events`)
- Isolate non-routine high-expense events (Vacations, Parties, Renovations) from ordinary budgets.
- Target event budget vs current spent progress.
- Collapsible list of associated transaction records.

## 8. Analytics & Financial Insights (`/analytics`)
- Timeframe toggles: Last 30 Days, This Month, All Time.
- Daily spending trend area chart.
- Category breakdown pie chart with percentage shares.
- Spending highlights: Peak spending day, largest single purchase, average daily expense, discretionary percentage.

## 9. Financial Goals (`/goals`)
- Create milestone savings goals (Emergency Fund, Travel, Tech).
- Progress percentage and remaining balance calculator.
- Dedicated "Add Contribution" modal.

## 10. AI Financial Assistant (`/ai-assistant`)
- 100% on-device local intelligence engine.
- Interactive chat interface with quick pre-composed queries.
- Instant analysis of actual database records (top categories, savings tips, budget checks).
- Financial Health Score meter (0-100) assessing savings rate, budget compliance, and discretionary control.
- Automated insight alerts (Positive cash flow, high discretionary spend, budget breaches).

## 11. Receipt Scanner & OCR (`/receipts`)
- Upload receipt images or capture directly via mobile camera.
- Image compression for fast client-side storage.
- Intelligent heuristic extraction of Merchant, Amount, and Date.
- Review modal before converting receipts directly into transaction entries.

## 12. Recurring Transactions (`/recurring`)
- Track subscriptions (broadband, streaming, rent, memberships).
- Daily, Weekly, Monthly, and Yearly recurrence schedules.
- Next due date tracking.
- One-click Pause and Resume status toggles.

## 13. Expense Splitting (`/splits`)
- Split group dining bills or shared apartment expenses.
- Add participants with custom shares or one-click "Split Equally".
- Individual settlement status toggle ("Mark Paid").

## 14. Settings & Data Protection (`/settings`)
- Currency selector supporting INR (₹), USD ($), EUR (€), GBP (£), JPY (¥), AUD, CAD, SGD, AED.
- Theme selector: Light, Dark, or System mode.
- One-click JSON backup export.
- JSON backup restoration with validation.
- Complete database reset utility in Danger Zone.
