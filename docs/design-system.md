# MoneyFlow — UI Design System

> Version 1.0 | Product: Personal Finance Tracker | Default language: Thai | Design direction: Modern Minimal Fintech

## 1. Design principles
1. **Clarity over decoration**: financial totals and comparisons must be easy to scan.
2. **Calm and modern**: light neutral surfaces, restrained teal accents, rounded cards, generous spacing.
3. **Data is the hero**: readable numbers, consistent currency formats, accessible chart labels.
4. **Fast capture**: prominent Add Transaction action, minimal required fields.
5. **Accessible and responsive**: keyboard, contrast, reduced motion, and mobile-first behavior.

## 2. Visual identity
- Working product name: **MoneyFlow**. Do not mix with `MoneyNote` shown in an early visual concept.
- Primary: teal `#0D9488`; primary hover `#0F766E`; primary subtle `#CCFBF1`.
- Positive/income: green `#059669`; negative/expense: coral `#E05A64`; warning `#D97706`; information `#2563EB`.
- Light: background `#F8FAFC`, surface `#FFFFFF`, subtle surface `#F1F5F9`, border `#E2E8F0`, text `#0F172A`, secondary text `#64748B`.
- Dark: background `#0B1220`, surface `#111C2E`, subtle surface `#1B2A40`, border `#334155`, text `#F8FAFC`, secondary text `#CBD5E1`.
- Avoid relying on color alone to convey positive/negative changes; include arrows and text labels.

### CSS variable tokens
```css
:root {
  --background: #f8fafc;
  --surface: #ffffff;
  --surface-muted: #f1f5f9;
  --foreground: #0f172a;
  --muted-foreground: #64748b;
  --border: #e2e8f0;
  --primary: #0d9488;
  --primary-hover: #0f766e;
  --positive: #059669;
  --negative: #e05a64;
  --warning: #d97706;
  --radius-card: 16px;
}
.dark {
  --background: #0b1220;
  --surface: #111c2e;
  --surface-muted: #1b2a40;
  --foreground: #f8fafc;
  --muted-foreground: #cbd5e1;
  --border: #334155;
}
```
Use semantic Tailwind/shadcn theme tokens rather than scattering hex colors in components. Validate contrast for actual text/background pairs before release.

## 3. Typography
- Thai: `IBM Plex Sans Thai`, fallback `Noto Sans Thai`, `sans-serif`.
- Latin and numeric: `Inter`, fallback `sans-serif`.
- H1 30/38px weight 700; H2 24/32px weight 700; H3 20/28px weight 600; body 14–16px line-height 1.5; labels 12–14px weight 500; KPI 28–36px weight 700.
- Use tabular numerals for amounts, percentages, and table columns (`font-variant-numeric: tabular-nums`).
- Currency: `฿35,000.00` where cents matter, otherwise `฿35,000`; percentages use 2 decimals in analysis and optionally 1 decimal in compact KPI cards.

## 4. Spacing and geometry
- Base spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Desktop page horizontal padding 32px; tablet 24px; mobile 16px.
- Card padding 20–24px desktop, 16px mobile. Card radius 16px; button/input radius 10–12px; pill radius 9999px.
- Minimum touch target 44×44px on mobile. Inputs 44–48px high.
- Borders: 1px subtle; shadows very soft, never heavy neumorphism.

## 5. Breakpoints and grids
- Mobile `<640px`: single-column cards; fixed bottom navigation or accessible drawer; floating Add button.
- Tablet `640–1023px`: two-column KPI grid; collapsed sidebar.
- Desktop `>=1024px`: 240–256px left sidebar, flexible content; four KPI cards across when space allows.
- Design frames: desktop 1440×900; tablet 768×1024; mobile 390×844.
- Charts must reflow and provide scroll or a compact table alternative where labels would overlap.

## 6. App shell
- Desktop sidebar: logo, Dashboard, Transactions, Analytics, Budgets, Categories, Accounts, Settings; active item uses pale teal fill and strong teal text.
- Topbar: page title, month selector where applicable, search shortcut, theme toggle, user menu, Add Transaction CTA.
- Mobile: topbar with title and month switcher; bottom navigation Dashboard, Transactions, Analytics, Budgets, More; Add CTA prominent.
- Use consistent navigation labels in Thai: ภาพรวม, รายการ, วิเคราะห์, งบประมาณ, หมวดหมู่, บัญชี, ตั้งค่า.

## 7. Component inventory
| Component | Variants / states | Notes |
|---|---|---|
| Button | primary, secondary, ghost, destructive; loading/disabled | 44px target on mobile |
| KPI Card | income, expense, balance, food | label, amount, comparison, icon |
| Transaction Row | income, expense, transfer | icon, category, description, date, amount |
| Category Chip | default, selected, archived | icon/color + label |
| Month Picker | default, open, disabled | previous/next and month/year selection |
| Budget Progress | normal, warning, reached, exceeded | textual used/remaining amount |
| Chart Card | loading, populated, empty, error | heading, date range, chart, accessible data table |
| Form Field | default, focus, invalid, disabled | label, hint, error |
| Modal/Drawer | add, edit, delete confirm | modal on desktop, bottom sheet on mobile |
| Toast | success, error, warning | brief feedback; no false success |
| Skeleton/Empty State | per module | actionable empty-state CTA |

## 8. Screen specifications

### Dashboard `/dashboard`
- Header: 'ภาพรวมการเงิน', month selector, Add Transaction.
- Row 1: Income, Expenses, Net Cash Flow, Food Share KPI cards.
- Row 2: Income vs Expense six-month grouped bar chart (wide), Expense Category donut (narrow).
- Row 3: Food Trend line chart, Recent Transactions, Budget Snapshot.
- Food trend labels must distinguish food amount MoM (%) from food/income share (%).

### Transactions `/transactions`
- Search, month/type/category/account filters; tabular transaction list.
- Floating or top-right Add button; transaction editor with type toggle, amount, category, account, date, description.
- Destructive actions require confirmation; show empty-state CTA.

### Food Analytics `/analytics/food`
- KPI row: food amount, % of income, % of expenses, MoM %.
- Trend line chart for 6–12 months; comparison table including monthly income, food amount, % income, MoM, pp change.
- Food subcategory breakdown; selectable months; `N/A` for undefined ratios.
- Use explicit labels for `+20.00%` versus `+0.57 pp`.

### Budgets `/budgets`
- Overall monthly budget summary and category progress list.
- Progress colors: normal teal, >=80% amber, >100% coral; labels must always show numbers.
- Create/edit budget modal and month switcher.

### Categories `/categories`
- Income/expense tabs, category cards, nested subcategories, icon/color selector, archive action.

### Accounts `/accounts` (P1)
- Account cards, balance and transfer flow; transfers never affect expense totals.

## 9. Interaction and motion
- Hover/focus: 150–200ms ease; page transitions subtle; no essential information only in animations.
- Respect `prefers-reduced-motion`.
- Chart tooltips show category/month, THB value, and precise percentage where applicable.
- Save flow: client validation -> pending -> success toast only after successful save; failure keeps entered data.
- Keyboard: Escape closes modal, Tab traverses controls, Enter submits only when valid.

## 10. Sample mock data contract
```ts
type TransactionKind = 'income' | 'expense';
type Transaction = {
  id: string;
  kind: TransactionKind;
  amountSatang: number;
  date: string; // YYYY-MM-DD in user's timezone
  categoryId: string;
  accountId: string;
  description?: string;
};
type Category = {
  id: string;
  name: string;
  kind: TransactionKind;
  isFood: boolean;
  icon: string;
  color: string;
  parentId?: string;
};
```
Use a deterministic fixture spanning 12 months. Reconcile fixture totals to dashboard/chart displays; do not hardcode contradictory numbers in separate cards.

## 11. Figma organization and handoff
Suggested Figma pages:
1. `00 — Foundations` (colors, type, spacing, icons)
2. `01 — Components` (variants and states)
3. `02 — Desktop Screens`
4. `03 — Mobile Screens`
5. `04 — Flows & Prototype`
6. `05 — Developer Handoff`

Use Auto Layout throughout; name layers semantically (`KPI/Income`, `Chart/FoodTrend`, `Form/Amount`); use color/text variables and reusable components. Create light/dark variants and desktop/mobile variants for core elements. Provide interaction notes, empty/error states, and exportable icons only when necessary.

## 12. Definition of done for UI milestone
- [ ] All P0 screens use the same tokens and components.
- [ ] Dashboard totals and charts agree with mock transaction data.
- [ ] Light/dark mode works without contrast regressions.
- [ ] Mobile at 390px has no horizontal page overflow.
- [ ] Keyboard focus is visible; forms have labels/errors; charts have accessible summaries.
- [ ] All primary interactions work in mock mode; no fake backend-success claims.
- [ ] Screenshot review at 390px, 768px, and 1440px.
