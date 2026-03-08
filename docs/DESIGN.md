# Design System — Orbit

**Version**: 0.1

---

## Design Philosophy

- **Calm by default** — Financial data can be stressful. UI should feel organized, not overwhelming.
- **Information density balanced with breathing room** — Show what matters, hide the noise.
- **Action-oriented** — Every screen should have a clear primary action.
- **Trust through transparency** — Agent actions are always explained. Nothing happens in silence.
- **Mobile-first** — Design for phone first, adapt to desktop.

---

## Component Library

**shadcn/ui** — Copy-paste component primitives built on Radix UI + Tailwind. Full control over styling, zero vendor lock-in.

Component categories used:
- Layout: Card, Separator, Sheet, Dialog
- Forms: Input, Label, Button, Select, Switch
- Data: Table, Badge, Avatar, Progress
- Feedback: Toast, Alert, Skeleton (loading states)
- Navigation: Tabs, NavigationMenu, Breadcrumb

---

## Color System

Using CSS custom properties (Tailwind + shadcn convention):

```css
/* Base (light mode) */
--background: 0 0% 100%;
--foreground: 224 71% 4%;

--card: 0 0% 100%;
--card-foreground: 224 71% 4%;

--primary: 221 83% 53%;        /* Blue — trust, finance */
--primary-foreground: 0 0% 100%;

--secondary: 210 40% 96%;
--secondary-foreground: 224 71% 4%;

--muted: 210 40% 96%;
--muted-foreground: 215 16% 47%;

--accent: 210 40% 96%;
--accent-foreground: 224 71% 4%;

--destructive: 0 72% 51%;      /* Red — negative amounts, warnings */
--destructive-foreground: 0 0% 100%;

--success: 142 71% 45%;        /* Green — positive amounts, completed */
--border: 214 32% 91%;
--ring: 221 83% 53%;
```

### Semantic Color Usage
- **Green**: Positive amounts, earnings, completed actions, Autopilot ON
- **Red**: Negative amounts, warnings, overdue bills
- **Blue (primary)**: CTAs, links, active states
- **Muted**: Secondary text, empty states, metadata
- **Yellow/Amber**: Flagged items, pending actions, warnings

---

## Typography

```css
/* Font stack */
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Scale */
--text-xs: 0.75rem;    /* 12px — metadata, timestamps */
--text-sm: 0.875rem;   /* 14px — body, labels */
--text-base: 1rem;     /* 16px — primary body */
--text-lg: 1.125rem;   /* 18px — section headers */
--text-xl: 1.25rem;    /* 20px — card titles */
--text-2xl: 1.5rem;    /* 24px — page titles */
--text-3xl: 1.875rem;  /* 30px — hero numbers */
```

### Money Formatting
- Large balances: `$4,250.00` — tabular-nums, always 2 decimal places
- Small amounts: `$8.50` — no K/M abbreviations for financial accuracy
- Negative: `-$42.00` (red color)
- Positive delta: `+$12.40` (green color)

---

## Spacing

Tailwind 4-point scale. Common values:
- `p-4` (16px) — card internal padding
- `gap-4` (16px) — list item gaps
- `mb-6` (24px) — section spacing
- `p-6` (24px) — page padding (mobile: `p-4`)

---

## Layout

### Mobile (default)
- Single column
- Bottom navigation (5 tabs max)
- Full-width cards with `p-4` padding
- Sticky header with back navigation

### Desktop
- 2-column: sidebar (240px) + main content
- Sidebar navigation replaces bottom tabs
- Max content width: 1200px, centered

---

## Key Screens

### Dashboard
**Purpose**: Overview of financial health at a glance

Layout:
```
┌─────────────────────────────┐
│  Orbit        [Notif] [Prof]│
├─────────────────────────────┤
│  Net Balance                │
│  $4,250.00                  │
│  +$120 this month  ↑ 2.8%  │
├─────────────────────────────┤
│  [Yield Card]  4.50% APY    │
│  $1,200 earning $4.50/mo   │
├─────────────────────────────┤
│  Upcoming Bills             │
│  • Electric  $87.50  Due 5d │
│  • Internet  $59.99  Due 8d │
│  [See all]                  │
├─────────────────────────────┤
│  Orbit says...              │
│  "You have $1,200 idle.     │
│   Want to put it to work?"  │
│  [Learn more]               │
├─────────────────────────────┤
│ [Home][Bills][Agent][Yield] │
└─────────────────────────────┘
```

### Agent Chat
**Purpose**: Conversational AI interface

- Chat bubble UI: user right, agent left
- Agent messages support markdown (bold, bullet points)
- Action cards: when agent takes/suggests an action, show a card with `[Approve]` / `[Decline]`
- Typing indicator during streaming
- Persistent input bar at bottom

### Bills View
- Sorted by due date (soonest first)
- Color coding: green (>7 days), yellow (3-7 days), red (<3 days / overdue)
- Each bill card: name, amount, due date, [Pay Now] button
- Batch pay option for multiple bills

### Subscriptions View
- Grid of subscription cards with logo (fallback to initials)
- Status badge: Active / Flagged / Cancelled
- Sort options: cost (high→low), last used, next charge date
- Flagged items surfaced at top

### Yield View
- Current balance earning yield
- APY displayed prominently
- Lifetime earnings counter
- Sweep controls: slider or input to move money in/out
- History of sweeps

---

## Motion & Animation

- Transitions: `duration-150 ease-in-out` for state changes
- Number changes: count-up animation for balance updates
- Skeleton loaders for all async content (no spinners)
- Toast notifications slide in from bottom (mobile) or top-right (desktop)
- Agent typing: pulsing dots (3 dots, CSS animation)

---

## Empty States

Every empty state has:
1. Relevant icon
2. Short headline
3. 1-line description
4. Primary CTA

Example (no transactions):
```
     💳
  No transactions yet
  Link an account to see your
  spending activity.
  [Link Account →]
```

---

## Accessibility

- Color is never the only indicator (always paired with text/icon)
- All interactive elements keyboard-navigable
- Focus rings visible (`ring-2 ring-primary`)
- Minimum touch target size: 44x44px (mobile)
- ARIA labels on icon-only buttons
- Screen reader tested for core flows
