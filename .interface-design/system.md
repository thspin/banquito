# Banquito Design System

## Direction & Feel
Banquito is a personal finance management app — a digital wallet that centralizes bank accounts, credit cards, and financial products. The feel is **premium fintech**: dark, confident, precise. Think a blend between Revolut's density and Apple Card's elegance. Not playful, not corporate — calm authority over financial data.

## Intent
- **Who:** Young professionals managing multiple bank accounts and credit cards in Argentina
- **What:** Track balances, register transactions, control credit card debt
- **Feel:** Confident, dark, precise — like checking your portfolio at midnight

## Depth Strategy
**Borders-only** with subtle rgba transparency. No drop shadows on content cards. Glass-morphism (backdrop-blur) reserved for overlays and the sidebar.

## Spacing
- Base unit: **4px**
- Component internal: `p-5` (20px), `p-6` (24px)
- Section gaps: `space-y-6` (24px), `space-y-8` (32px)
- Card grid gaps: `gap-6` (24px)

## Color Palette
- **Canvas:** `#0f172a` (slate-900)
- **Surfaces:** `bg-white/[0.03]` → `bg-white/[0.06]` → `bg-white/10`
- **Borders:** `border-white/[0.06]` (default), `border-white/10` (cards), `border-white/20` (glass)
- **Primary:** Sky blue scale (`primary-400` #38bdf8 → `primary-600` #0284c7)
- **Semantic:** Emerald for income/success, Red for debt/expense, Blue for institutions, Purple for wallets
- **Text:** White (primary), `white/60` (secondary), `white/40` (tertiary), `white/30` (muted)

## Typography
- **Page titles:** `text-4xl font-bold text-white tracking-tight`
- **Section subtitle:** `text-primary-400 font-medium text-sm`
- **Stat labels:** `text-white/50 text-[10px] font-bold uppercase tracking-widest`
- **Stat footnotes:** `text-[10px] text-white/30 font-medium`
- **Stat values:** `text-3xl font-bold text-white`
- **Card titles:** `text-lg font-semibold text-white`
- **List item primary:** `text-white font-medium`
- **List item secondary:** `text-white/40 text-xs`
- **Form labels:** `text-white/60 text-xs font-medium uppercase tracking-wider`
- **Badges:** `text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-white/[0.06] text-white/40`

## Component Patterns

### Stat Cards (Dashboard, Accounts, Transactions)
```
<Card className="relative overflow-hidden group hover:border-{color}-500/30 transition-all duration-300">
  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
    {SVG icon w-10 h-10}
  </div>
  <p label>{LABEL}</p>
  <p value>{VALUE}</p>
  <p footnote>{FOOTNOTE}</p>
</Card>
```

### List Items (Products, Transactions)
```
<div className="group flex items-center gap-4 px-5 py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl transition-all duration-200">
  {icon container w-10 h-10 rounded-xl}
  {content flex-1 min-w-0}
  {value text-right}
  {optional arrow}
</div>
```

### Institution Group Headers
```
<div className="flex items-center gap-3 px-2 mb-3">
  {icon w-10 h-10 rounded-xl bg-{color}-500/10 border border-{color}-500/20}
  {name + subtitle flex-1}
  {total text-right}
</div>
```

### Modals
```
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={close}>
  <div className="glass-card p-6 w-full max-w-md" onClick={stopPropagation}>
    {header with icon + title + subtitle}
    {form with space-y-4}
    {footer with cancel + submit buttons}
  </div>
</div>
```

### Filter Tabs
```
<div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
  <button className={active ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'}>
    {label}
  </button>
</div>
```

### Empty States
```
<Card className="flex flex-col items-center justify-center py-20 text-center border border-white/10 bg-white/[0.01]">
  <div className="w-24 h-24 bg-primary-500/10 rounded-full ...">
    <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
    {SVG icon}
  </div>
  <h3>{title}</h3>
  <p>{description}</p>
  <button className="glass-button-primary px-8 py-3 text-lg hover:scale-105 ...">{CTA}</button>
</Card>
```

### Buttons
- **Primary:** `glass-button-primary` (bg-primary-600 hover:bg-primary-500)
- **Secondary/Cancel:** `bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white`
- **Ghost:** `text-primary-400 hover:text-primary-300 text-xs font-medium`
- **Destructive:** `bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400`

### Action Menus (3-dot menus on list items)
- Trigger: 3-dot icon, opacity-0 on default, opacity-100 on group-hover
- Dropdown: glass-card positioned absolute, z-20, with thin border
- Items: full-width, hover:bg-white/[0.06], destructive items in red

### Confirm Dialogs (Delete)
- Same modal pattern but narrower (max-w-sm)
- Warning icon with red background
- Bold warning text + description
- Cancel (secondary) + Delete (destructive red) buttons

## Interactions
- **Hover on cards:** `hover:border-{color}-500/30` subtle border glow
- **Hover on list items:** `hover:bg-white/[0.06] hover:border-white/[0.12]`
- **Icon scale on hover:** `group-hover:scale-105` or `group-hover:scale-110`
- **Button press:** `hover:scale-105 transition-transform`
- **Transitions:** `transition-all duration-200` consistently
- **Modal backdrop:** `bg-black/60 backdrop-blur-sm`

## Icon Strategy
- SVG stroke icons (Heroicons-style), strokeWidth 1.5 for decorative, 2 for interactive
- Emoji for product types and institution types (🏦💳💵👛📋📄)
- No icon libraries — inline SVGs for control
