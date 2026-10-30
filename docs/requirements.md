# MoneyFlow — Product Requirements Document (PRD)

> Version: 1.0 | Status: Ready for implementation | Language: Thai | Currency: THB

## 1. Product overview
MoneyFlow is a responsive personal finance web application for recording income and expenses, managing custom categories and budgets, and comparing monthly food spending. The primary user is an individual tracking their own finances. Build a functional mock-data MVP first, then connect MySQL and authentication.

### Goals
- Record a transaction in under 30 seconds on mobile or desktop.
- Explain monthly income, expenses, net cash flow, and food-spending trends at a glance.
- Compare food spending across months using both monetary and percentage measures.
- Allow users to customize categories, subcategories, and monthly budgets.

### Out of scope for MVP
Bank synchronization, AI recommendations, OCR receipts, family/shared accounts, multi-currency accounting, and investment tracking.

## 2. User roles and navigation
- MVP role: personal user. Mock mode uses a demo user; production requires authentication and per-user authorization.
- Pages: Dashboard `/dashboard`, Transactions `/transactions`, Food Analytics `/analytics/food`, Monthly Analytics `/analytics/monthly`, Budgets `/budgets`, Categories `/categories`, Accounts `/accounts`, Settings `/settings`.
- Later pages: Recurring `/recurring`, Savings `/goals`, Reports `/reports`.

## 3. MVP functional requirements

### FR-01 Dashboard (P0)
- Select month and year; default to current local month (Asia/Bangkok).
- Cards: income, expenses, net cash flow (income minus expenses), food spending, food share of income.
- Charts: last six months income vs expenses; spending by category; food spending trend.
- List five most recent transactions. Show loading, empty, and error states.
- Clearly label mock data. Do not imply the demo values are real.

### FR-02 Transactions (P0)
- Create, read, update, delete income and expense transactions.
- Required: type, amount > 0, date, account, category; optional: description, subcategory, tags, notes.
- Search by description; filter by month, type, account, category; sort by date and amount.
- Show confirmation before deletion and an undo opportunity in mock mode.
- Use decimal money representation (integer satang in client state or a decimal library; DECIMAL(15,2) in database). Never calculate money using unrounded binary floating-point sums.

### FR-03 Categories (P0)
- Seed income categories: Salary, Freelance, Other Income.
- Seed expense categories: Food & Drinks, Housing, Transport, Shopping, Health, Entertainment, Education, Other.
- Allow creation, renaming, icon/color assignment, nested subcategories, reordering, and archiving.
- Do not hard-delete categories referenced by transactions; preserve historical reporting.
- Food Analytics uses a stable `is_food` flag or canonical food group, not a display-name string match.

### FR-04 Food Analytics (P0)
- Display monthly food amount, share of income, share of all expenses, month-over-month (MoM) amount change, and percentage-point (pp) change in food/income share.
- Show a month-by-month comparison table and trend chart, with optional subcategory breakdown (meals, coffee, delivery, groceries).
- Date range: at least previous 12 months; select any two months for comparison.
- Show a 'month-to-date' label for an incomplete month; optional comparable-day comparison.
- Formulas in section 4 must be implemented consistently and unit-tested.

### FR-05 Budgets (P0)
- Set a monthly overall budget and per-expense-category budgets.
- Show used amount, remaining amount, percentage used, and over-budget amount.
- Default warning at >= 80%, reached at 100%, over budget at > 100%; make thresholds configurable later.
- Budget edits must not modify historical transactions.

### FR-06 Accounts (P1)
- Support Cash, Bank, e-Wallet, and Credit Card accounts with opening balance.
- Transfer between accounts must affect balances but must NOT count as income or expense.
- Credit-card purchases and settlements must not be double-counted.

### FR-07 Recurring, savings, export (P1)
- Recurring rules: daily, weekly, monthly, yearly; start/end dates; optional confirmation before posting.
- Savings goals: target, due date, progress, contributions; moving funds is not automatically an expense.
- Export filtered transactions to CSV; Excel/PDF later.

### FR-08 Smart insights (P2)
- Rule-based alerts for food spending spikes, budget overrun, and savings opportunities.
- Insights must show calculation basis and avoid unsupported claims.

## 4. Calculation specification
Let `food(m)` = sum of expense amounts in food categories for month m; `income(m)` = sum of income amounts; `expenses(m)` = sum of all expense amounts.

- Food share of income (%) = `food(m) / income(m) * 100`, only if income(m) > 0; otherwise display `N/A`.
- Food share of expenses (%) = `food(m) / expenses(m) * 100`, only if expenses(m) > 0; otherwise `N/A`.
- Food MoM (%) = `(food(m) - food(m-1)) / food(m-1) * 100`, only if food(m-1) > 0; otherwise `N/A` (if prior=0 and current>0, say 'new spending', not infinite percent).
- Food-share change (pp) = `food(m)/income(m)*100 - food(m-1)/income(m-1)*100` when both incomes > 0; otherwise `N/A`.
- Net cash flow = income - expenses. Distinguish it from the total account balance.
- Budget used (%) = `category_expenses / category_budget * 100` when budget > 0; otherwise `N/A`.
- Display two decimal places for percentages and Thai-formatted THB currency; round only at presentation boundaries.
- Refunds reverse or offset the original expense according to a documented policy. Transfers are excluded from expense/income totals.
- Filter transaction dates using the user's chosen timezone (default `Asia/Bangkok`) and calendar month boundaries.

**Acceptance example:** previous food ฿6,000, current food ฿7,200, previous income ฿30,000, current income ฿35,000 => MoM +20.00%; current share of income 20.57%; previous share 20.00%; change +0.57 pp.

## 5. Data model (logical)
- `users(id, name, email, password_hash?, created_at)`
- `accounts(id, user_id, name, type, opening_balance, currency, archived_at?)`
- `categories(id, user_id?, parent_id?, kind, name, icon, color, is_food, archived_at?)`
- `transactions(id, user_id, account_id, category_id, kind, amount, transaction_date, description?, notes?, created_at, updated_at)`
- `transfers(id, user_id, source_account_id, destination_account_id, amount, transfer_date)` (or linked double-entry records; choose one consistent design)
- `budgets(id, user_id, category_id?, year, month, amount)`
- P1: `recurring_rules`, `savings_goals`, `goal_contributions`, `notifications`, `audit_logs`.

Database requirements: MySQL 8, Prisma ORM, `DECIMAL(15,2)` monetary fields, indexes on `(user_id, transaction_date)` and category/account lookups, foreign keys, uniqueness for one budget per user/category/month, and user-scoped queries. Never trust a client-supplied user ID.

## 6. API contracts (target for backend phase)
- `GET /api/dashboard/summary?month=YYYY-MM`
- `GET /api/transactions?month=YYYY-MM&type=expense&categoryId=...&page=1`
- `POST /api/transactions`; `PATCH /api/transactions/:id`; `DELETE /api/transactions/:id`
- `GET /api/categories`; `POST /api/categories`; `PATCH /api/categories/:id`
- `GET /api/analytics/food?from=YYYY-MM&to=YYYY-MM`
- `GET /api/analytics/monthly?from=YYYY-MM&to=YYYY-MM`
- `GET /api/budgets?month=YYYY-MM`; `PUT /api/budgets/:id`
- P1: account and transfer endpoints, recurring rules, export.

API responses must have stable shapes, explicit error codes, pagination where needed, and server-side validation using Zod. Mock repositories must use the same TypeScript domain interfaces as the eventual API.

## 7. Technical architecture
- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Recharts, React Hook Form + Zod, TanStack Query.
- Backend: Next.js Route Handlers, Prisma, MySQL 8; session authentication in production (e.g., Auth.js).
- Start with a modular monolith and mock data repository; do not connect to a real database during the initial UI milestone.
- Suggested folders: `src/app`, `src/components/ui`, `src/components/layout`, `src/features/{dashboard,transactions,analytics,budgets,categories}`, `src/lib`, `src/types`, `src/data/mock`.
- Environment variables in `.env.local`; commit only `.env.example`.

## 8. Non-functional requirements
- Responsive at 390, 768, 1024, and 1440px; keyboard navigable, visible focus states, meaningful labels, and WCAG AA contrast targets.
- Thai UI by default; support THB and Thai date formatting; optional English language later.
- Provide light and dark themes, loading skeletons, empty states, and error/retry UI.
- Production: HTTPS, HttpOnly/Secure cookies, authorization per resource, CSRF protections where applicable, rate limits, validation, backup/restore testing, and audit logs for sensitive changes.
- Performance target: dashboard p95 <= 2 seconds under an explicitly defined test dataset and network profile.

## 9. User flows
1. First visit -> dashboard with demo data -> choose month -> inspect category/food charts.
2. Add expense -> select food category -> enter amount and date -> save -> dashboard and food analytics refresh.
3. Edit a past expense -> analytics for the affected month recalculates.
4. Set a food budget -> view progress -> see threshold warning when spending crosses 80%.
5. Create custom category -> use it in a new transaction -> see it in category breakdown.

## 10. MVP acceptance criteria
- [ ] Transaction CRUD works and validation rejects zero/negative/invalid amounts.
- [ ] All dashboard totals reconcile to transactions for the selected month.
- [ ] Food metrics match the formulas, including zero denominators and past-month edits.
- [ ] Custom categories can be created and archived without breaking historical data.
- [ ] Monthly budgets display correct remaining/over-budget states.
- [ ] Responsive layouts work on desktop and mobile.
- [ ] Empty, loading, and error states are present.
- [ ] Automated tests cover percentage math, refund/transfer handling, date boundaries, and user authorization when backend is added.

## 11. Delivery phases
1. **UI prototype**: design system, navigation, dashboard, transactions, food analytics, budgets with mock data.
2. **Data layer**: MySQL schema, Prisma migrations, CRUD APIs, authentication and authorization.
3. **Expansion**: accounts/transfers, recurring rules, savings goals, exports, notifications.
4. **Polish**: accessibility audit, responsive QA, performance, monitoring, production deployment.

## 12. Implementation instructions for AI coding agents
Read `docs/requirements.md` and `docs/design-system.md` before generating code. Build phase 1 first. Use realistic, internally consistent demo data and clearly label it as demo. Do not claim data persistence before implementing it. Implement calculations as pure tested functions. After each milestone run lint, typecheck, and tests, and explain what remains incomplete.
