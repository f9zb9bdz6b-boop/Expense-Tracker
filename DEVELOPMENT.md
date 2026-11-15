# Development Guide

This guide describes how to run, modify, and extend the Personal Expense Tracker application.

---

## 1. Environment Setup

- **Node.js**: v20.19.0 or v22 LTS is required.
- **Package Manager**: `npm` (v10+).

```bash
# Verify versions
node --version
npm --version

# Install dependencies
npm install
```

---

## 2. Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Launches the local Vite development server with Hot Module Replacement (HMR) at `http://localhost:5173`. |
| `npm run build` | Runs full TypeScript static type checking (`tsc`) followed by Vite production bundling to `/dist`. |
| `npm run preview` | Locally serves the production bundle from `/dist` to simulate production environment. |

---

## 3. Extending the Application

### Adding a New Database Store
1. Open `src/types/index.ts` and define your interface extending `BaseEntity`.
2. Open `src/db/database.ts`, register the store in `ExpenseTrackerDB`, and add indexes in the version store configuration.
3. Open `src/db/repositories.ts` and create a dedicated repository object providing typed CRUD operations.

### Adding a New Page Route
1. Create a page component in `src/pages/MyNewPage.tsx`.
2. Add the route in `src/App.tsx` within `<Routes>`.
3. Add the navigation item in `src/components/layout/Sidebar.tsx` and `MobileNav.tsx`.

---

## 4. Coding Conventions

- **Strict TypeScript**: Do not use `any` unless interacting with generic third-party libraries.
- **Integer Amounts**: Stored in minor units (paise/cents). Always use `toMinorUnits(display)` before saving and `formatCurrency(minorUnits)` before displaying.
- **Component Styling**: Always use `cn()` from `@/lib/utils` for merging dynamic Tailwind classes.
