# Quality Assurance & Testing Specifications

This document outlines verification procedures and automated validation checks for the Personal Expense Tracker application.

---

## 1. Type Verification & Build Validation

The codebase enforces strict TypeScript type checking without ignoring errors or warnings:

```bash
# Verify TypeScript integrity
npx tsc --noEmit

# Verify production build compilation
npm run build
```

---

## 2. Manual Test Matrix & Acceptance Criteria

| Feature | Action Tested | Expected Outcome | Verified |
|---|---|---|---|
| **Add Expense** | Fill form, choose Category, select Need/Want, click Save | Record persists in IndexedDB, merchant upserted, redirected to `/transactions`. | ✅ |
| **Add Income** | Enter source, amount, category, save | Income total increases, chart updates immediately. | ✅ |
| **Categories** | Create category with custom color, attempt delete of category with records | Blocked with warning to prevent orphan transactions. | ✅ |
| **Budgets** | Create 1,000 budget; record 850 expense in category | Progress shows 85%, badge turns amber (Warning). | ✅ |
| **Special Events** | Create "Trip", log expense associated with event | Event spent increments; dashboard shows total without double counting. | ✅ |
| **AI Assistant** | Ask "Where did my money go?" | Summarizes top categories from real DB records. | ✅ |
| **Receipt Scanner** | Upload bill image | Scanned image previews, OCR extracts merchant/amount, converts to expense. | ✅ |
| **Recurring** | Create monthly subscription, click Pause | Status changes to Paused, schedule halts. | ✅ |
| **Splits** | Create bill split among 3 friends, click Mark Paid | Settlement badge increments from 1/3 to 2/3. | ✅ |
| **Data Protection** | Export JSON backup, clear database, restore JSON | Full database accurately restored, balances recalculated. | ✅ |
| **PWA & Offline** | Disconnect internet / toggle offline in DevTools | App loads from Service Worker cache; allows adding transactions offline. | ✅ |

---

## 3. Financial Calculation Accuracy

- Mathematical precision is verified using integer arithmetic in minor units:
  - `addAmounts(1050, 2025) === 3075` (e.g. ₹10.50 + ₹20.25 = ₹30.75 without floating point artifacts like `30.749999999999996`).
  - Currency conversion factors are preserved with original amounts.
