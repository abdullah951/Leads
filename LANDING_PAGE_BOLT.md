# WarpLeads — Landing Page · Claude Code Generation Prompt

---

## ⚡ INSTRUCTION — read before generating any code

You are generating a complete, production-ready Next.js 14 marketing landing page for **WarpLeads** — a B2B lead intelligence SaaS.

### Output format
Output **four separate fenced code blocks**, each preceded by its file path as a comment:
1. `// app/layout.tsx`
2. `// app/globals.css`
3. `// tailwind.config.js`
4. `// app/page.tsx`

### Strict completeness rules — CRITICAL
- **No placeholders.** Do not write `// ...`, `{/* TODO */}`, `className="..."`, or `{/* same as above */}` anywhere. Every component must be fully implemented.
- **No skipped sections.** Every section listed in this spec must appear in the output. Do not summarise or abbreviate.
- **No incomplete JSX.** Every opening tag must have a closing tag. Every array must be fully written out — do not truncate with `// etc`.
- **All imports explicit.** Every Lucide icon used must appear in the import statement at the top of `page.tsx`. Do not use icons without importing them.
- **All data arrays complete.** Write every item in every array — `plans`, `stats`, `testimonials`, `faqs`, `steps`, `rows`, `tools` — fully, with no ellipsis.
- **'use client' at top of page.tsx** — the page uses `useState`, `useEffect`, and `IntersectionObserver`.

### Tech constraints
- Next.js 14 App Router
- Tailwind CSS v3 — use inline `style={{ }}` for gradients (Tailwind v3 cannot express arbitrary gradient stops reliably)
- Lucide React for all icons
- `next/font/google` for Inter
- **No** shadcn, radix, headless UI, or any other component library
- TypeScript strict — no `any`, no implicit `any`

### Design target
Linear / Resend / Raycast quality. Dark hero (`#020617`) with gradient orbs and dot-grid texture, gradient headline text, bento feature grid with mixed cell sizes, infinite CSS ticker, glassmorphism nav, gradient border cards, alternating dark/light section rhythm, polished hover micro-interactions on every interactive element.

---

---

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS v3
- Lucide React
- `next/font/google` — Inter, weights: `['400','500','600','700','800']`, `subsets: ['latin']`
- TypeScript

---

## Brand Tokens

```ts
// Paste into a comment at the top of page.tsx for reference
const TOKENS = {
  // Dark surfaces
  dark950: '#020617',   // hero bg, final CTA bg, footer bg
  dark900: '#0F172A',   // card dark bg
  dark800: '#1E293B',   // border on dark
  dark700: '#334155',   // muted border on dark
  darkIndigo: '#1E1B4B',// indigo-950, card tint on dark

  // Brand
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo400: '#818CF8',
  indigo200: '#A5B4FC',
  indigo100: '#C7D2FE',
  indigo50:  '#EEF2FF',

  // Light surfaces
  white:   '#FFFFFF',
  surface: '#F8FAFC',
  border:  '#E2E8F0',

  // Text on light
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  textFaint:     '#475569',

  // Text on dark
  textOnDark: '#F1F5F9',
  textDim:    '#64748B',
}
```

---

## `tailwind.config.js` additions

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-up':   'fadeUp 0.5s ease-out forwards',
        'fade-in':   'fadeIn 0.4s ease-out forwards',
        'ticker':    'ticker 24s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
}
```

---

## `app/globals.css` additions

```css
/* Dot-grid background — apply via className="dot-grid" */
.dot-grid {
  background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 32px 32px;
}

/* Pause ticker on hover */
.ticker-wrap:hover .ticker-inner {
  animation-play-state: paused;
}
```

---

## `app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'WarpLeads — Verified B2B Contact Intelligence',
  description: 'Search 102 million verified contacts. Reveal emails and phone numbers. Export to your CRM or sequencer. Built for cold emailers, GTM engineers, and email marketers.',
  openGraph: {
    title: 'WarpLeads — Build cold email lists that actually reach the inbox',
    description: 'Search 102M verified contacts by tech stack, job title, and 12 other filters. Sub-2% bounce rate guaranteed.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-[#020617]`}>
        {children}
      </body>
    </html>
  )
}
```

---

## Reusable Patterns (use these exactly — copy-paste into components)

### Eyebrow label
```tsx
// Used above section headlines throughout
function Eyebrow({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 mb-4">
      <span className="w-1 h-4 rounded-full bg-[#4F46E5]" />
      <span className="text-xs font-semibold uppercase tracking-widest text-[#4F46E5]">
        {text}
      </span>
    </div>
  )
}
```

### Gradient text span
```tsx
// Wrap any headline word/phrase in this for the gradient effect
<span className="bg-gradient-to-br from-white via-[#A5B4FC] to-[#818CF8] bg-clip-text text-transparent">
  that actually reach the inbox.
</span>
```

### Gradient border card (dark variant)
```tsx
// Outer = gradient border, inner = dark bg card
<div className="p-px rounded-2xl bg-gradient-to-br from-[#4F46E5]/50 to-[#7C3AED]/20">
  <div className="bg-[#0F172A] rounded-[15px] p-6 h-full">
    {/* card content */}
  </div>
</div>
```

### Primary CTA button
```tsx
import { ArrowRight } from 'lucide-react'
<button className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all"
  style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
  Start free — 20 leads/day <ArrowRight size={14} />
</button>
```

### Scroll-triggered fade-up (IntersectionObserver hook)
```tsx
// hooks/useReveal.ts
import { useEffect, useRef, useState } from 'react'

export function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// Usage — wrap any section:
// const { ref, visible } = useReveal()
// <div ref={ref} className={visible ? 'animate-fade-up' : 'opacity-0'}>
```

### Count-up hook (for Stats section)
```tsx
// hooks/useCountUp.ts
import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 1500, trigger: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!trigger) return
    const start = performance.now()
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setValue(Math.round(easeOut(t) * target))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, trigger])
  return value
}
```

---

## Page Structure

---

### 0. Navbar

```tsx
// Behaviour: transparent on mount, blurred dark on scroll (use window.scrollY > 10)
// Mobile: nav links hidden, show Menu icon — clicking opens a full-width slide-down panel
```

**Style:** `fixed top-0 inset-x-0 z-50 h-[60px]`
**Background:** `bg-[#020617]/80 backdrop-blur-md border-b border-[#1E293B]` (add `transition-colors` for scroll state)
**Inner:** `max-w-6xl mx-auto px-6 h-full flex items-center justify-between`

**Logo (left):**
```tsx
<a href="#" className="flex items-center gap-2">
  <span className="w-6 h-6 rounded-md flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}>
    <Zap size={12} className="text-white" />
  </span>
  <span className="font-bold text-white text-lg">Warp</span>
  <span className="font-bold text-[#818CF8] text-lg -ml-1">Leads</span>
</a>
```

**Nav links (center, hidden on mobile):**
```tsx
<nav className="hidden md:flex gap-8">
  {['Features','How it works','Pricing','FAQ'].map(label => (
    <a key={label} href={`#${label.toLowerCase().replace(/ /g,'-')}`}
      className="text-sm text-[#94A3B8] font-medium hover:text-white transition-colors">
      {label}
    </a>
  ))}
</nav>
```

**Actions (right):**
```tsx
<div className="flex items-center gap-3">
  <a href="/sign-in" className="text-sm text-[#94A3B8] hover:text-white transition-colors hidden md:block">
    Sign in
  </a>
  <a href="/sign-up"
    className="text-sm font-semibold text-white px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
    style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
    Start free
  </a>
  {/* Mobile hamburger — md:hidden */}
  <button className="md:hidden text-[#94A3B8] hover:text-white">
    <Menu size={20} />
  </button>
</div>
```

**Mobile drawer (slides down below nav on menu open):**
- Full-width panel, `bg-[#0F172A] border-b border-[#1E293B] px-6 py-4`
- Stack nav links vertically: same labels, `text-base text-[#94A3B8] py-2 block`
- "Start free" button full-width at bottom of drawer

---

### 1. Hero

**Section:** `id="features"` — `bg-[#020617] relative overflow-hidden pt-32 pb-28`

**Background layers (all `pointer-events-none absolute`):**
```tsx
{/* Radial glow — top center */}
<div className="absolute inset-x-0 top-0 h-[500px]"
  style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(99,102,241,0.3) 0%, transparent 70%)' }} />

{/* Orb left */}
<div className="absolute -left-64 top-32 w-[500px] h-[500px] rounded-full blur-3xl"
  style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)' }} />

{/* Orb right */}
<div className="absolute -right-64 top-64 w-[400px] h-[400px] rounded-full blur-3xl"
  style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 60%)' }} />

{/* Dot grid */}
<div className="absolute inset-0 dot-grid" />
```

**Content:** `relative z-10 max-w-6xl mx-auto px-6 flex flex-col items-center text-center`

**Badge:**
```tsx
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#312E81] bg-[#1E1B4B]/60 backdrop-blur-sm mb-6 animate-fade-in">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
  <span className="text-xs font-medium text-[#A5B4FC]">Powered by VerifyFirst™ — 3-layer email validation before every credit</span>
</div>
```

**Headline:**
```tsx
<h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 max-w-4xl text-white"
  style={{ animationDelay: '100ms' }} >
  Reveal verified contacts.{' '}
  <span className="bg-gradient-to-br from-white via-[#A5B4FC] to-[#818CF8] bg-clip-text text-transparent">
    Protect your sender reputation.
  </span>
</h1>
```

**Subheadline:**
```tsx
<p className="text-lg md:text-xl text-[#94A3B8] max-w-2xl leading-relaxed mb-10"
  style={{ animationDelay: '200ms' }}>
  WarpLeads validates every email before you spend a single credit.
  Search 102 million contacts by tech stack, job title, and 12 other filters —
  then reveal only the people worth reaching.
</p>
```

**CTAs:**
```tsx
<div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-5">
  {/* Primary */}
  <a href="/sign-up"
    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all"
    style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
    Start free — 20 leads/day <ArrowRight size={14} />
  </a>
  {/* Secondary */}
  <a href="#how-it-works"
    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-[#CBD5E1] border border-[#334155] bg-[#0F172A]/60 backdrop-blur-sm hover:border-[#4F46E5]/50 hover:text-white transition-all">
    See how it works <Play size={12} />
  </a>
</div>
```

**Trust line:** `<p className="text-xs text-[#475569]">No credit card required · First reveal in under 3 minutes · Free credits reset every 24 hours</p>`

**Browser mockup:**
```tsx
<div className="relative mt-16 max-w-5xl mx-auto w-full">
  {/* Glow under mockup */}
  <div className="absolute -inset-x-20 -bottom-10 h-40 blur-3xl opacity-30 pointer-events-none"
    style={{ background: 'linear-gradient(90deg, #4F46E5, #7C3AED)' }} />

  {/* Chrome frame */}
  <div className="relative rounded-2xl border border-[#1E293B] bg-[#0F172A] shadow-2xl shadow-black/50 overflow-hidden">
    {/* Title bar */}
    <div className="h-9 bg-[#1E293B] flex items-center px-4 gap-2 border-b border-[#334155]">
      <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
      <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
      <span className="w-3 h-3 rounded-full bg-[#10B981]" />
      <div className="ml-4 flex-1 max-w-xs h-5 bg-[#0F172A] rounded-md flex items-center px-2">
        <span className="text-[10px] text-[#334155]">app.warpleads.com/dashboard</span>
      </div>
    </div>
    {/* Screenshot area */}
    <div className="bg-[#F8FAFC] h-[260px] md:h-[420px] flex items-center justify-center">
      <p className="text-sm text-[#94A3B8]">Product screenshot — leads table with sidebar filters + revealed contact row</p>
    </div>
  </div>
</div>
```

---

### 2. Integration Ticker

**Section:** `bg-[#020617] border-b border-[#1E293B] py-10`

**Eyebrow:** `text-xs font-semibold uppercase tracking-widest text-[#475569] text-center mb-6`
→ `Export and sync with your entire outbound stack`

**Ticker:**
```tsx
// The inner div is exactly 2× its content width — duplicate the list for seamless loop
<div className="ticker-wrap overflow-hidden">
  <div className="ticker-inner inline-flex gap-12 items-center whitespace-nowrap animate-ticker">
    {/* Render list TWICE for seamless loop */}
    {[...tools, ...tools].map((tool, i) => (
      <span key={i} className="text-sm font-semibold text-[#334155] hover:text-[#64748B] transition-colors px-2 cursor-default select-none">
        {tool}
      </span>
    ))}
  </div>
</div>

// tools array:
const tools = ['HubSpot','Salesforce','Pipedrive','Instantly','Smartlead','Apollo','Outreach','Lemlist','Mailshake','Close','Snov.io','Reply.io']
// Add a separator between items: use a · character or a small w-1 h-1 rounded-full bg-[#1E293B] inline-block
```

---

### 3. Stats Bar

**Section:** `bg-white border-y border-[#E2E8F0] py-14` · `id="features"`

**Grid:** `grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto`

```tsx
// Use useCountUp hook + useReveal for scroll-triggered animation
// Sublabel is a second line of context — makes each stat mean something
const stats = [
  { display: '<2%',   raw: null,  label: 'Average bounce rate',        sub: 'vs. 15–30% on bought lists' },
  { display: '500+',  raw: 500,   label: 'Tech stack filters',          sub: 'target by tools they actually run' },
  { display: '102M+', raw: 102,   label: 'Verified contacts',           sub: 'validated before every reveal' },
  { display: '3 min', raw: null,  label: 'Time to first reveal',         sub: 'from signup to verified contact' },
]
```

Each card: `flex flex-col items-center text-center p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]`

Number: `text-4xl font-extrabold bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent`
Label: `text-sm text-[#64748B] mt-1 font-medium`
Sub-label: `text-xs text-[#94A3B8] mt-0.5` — renders the `sub` field in smaller muted text below the label

Each card: `flex flex-col items-center text-center p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]`

Number: `text-4xl font-extrabold bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent`
Label: `text-sm text-[#64748B] mt-1 font-medium`

---

### 3b. Pricing Comparison Table

**Section:** `bg-white border-b border-[#E2E8F0] py-20`

**Eyebrow:** same style → `How we compare`

**Headline:** `text-2xl md:text-3xl font-bold text-[#0F172A] text-center mb-3`
→ `At $149/mo you get 300,000 credits. Or 6,000. Your call.`

**Subheadline:** `text-sm text-[#64748B] text-center mb-12 max-w-md mx-auto`
→ `All pricing based on publicly listed plans as of 2025. Annual billing where applicable.`

**Table data:**
```tsx
// Pricing sources (2025):
// Apollo   — apollo.io/pricing   — Free / Professional $99/mo (annual) / Organization $149/mo (annual)
// ZoomInfo — zoominfo.com        — No public pricing. Minimum ~$15,000/yr on annual contract. No free plan.
// WarpLeads — warpleads.com
//   Free: 20 verified reveals/day
//   Starter $49/mo  → 60,000 credits/mo
//   Growth  $99/mo  → 150,000 credits/mo
//   Scale   $149/mo → 300,000 credits/mo
//
// Apollo — apollo.io/pricing
//   $149/mo → 6,000 credits/mo  (at the same $149 price point as WarpLeads Scale)
//
// ZoomInfo — no public pricing, ~$15,000/yr minimum, annual contract

const rows = [
  {
    label: 'Free plan',
    warpleads: '✓ 20 verified reveals/day — forever',
    apollo:    '✓ Limited (sequences & export restricted)',
    zoominfo:  '✗ No free plan',
  },
  {
    label: 'Entry paid plan',
    // WarpLeads Starter vs Apollo's cheapest comparable tier
    warpleads: '$49 / mo — 60,000 credits',
    apollo:    'No comparable tier at this price',
    zoominfo:  'Quote only — min. ~$15,000 / yr',
  },
  {
    label: 'Credits at $149 / mo',
    // The knockout stat — same dollar amount, 50× more credits
    warpleads: '300,000 credits',
    apollo:    '6,000 credits',
    zoominfo:  'Unknown — not published',
    highlight: true,  // render this row with an indigo-tinted bg + bold values
  },
  {
    label: 'Cost per credit at $149',
    // 300,000 / $149 = $0.0005 · 6,000 / $149 = $0.025 — 50× cheaper
    warpleads: '$0.0005 per credit',
    apollo:    '$0.025 per credit',
    zoominfo:  'Not published',
    highlight: true,
  },
  {
    label: 'Minimum commitment',
    warpleads: 'None — cancel anytime',
    apollo:    'Annual contract for best pricing',
    zoominfo:  'Annual contract, typically 1–3 yr',
  },
  {
    label: 'Email validated before charge',
    warpleads: '✓ Every contact, every time',
    apollo:    '✗ No pre-reveal validation',
    zoominfo:  '✗ No pre-reveal validation',
  },
]
```

**Table JSX:**
```tsx
// Layout: full-width scrollable on mobile, fixed 3-col on md+
// WarpLeads column is highlighted with indigo border + light indigo bg
<div className="max-w-4xl mx-auto overflow-x-auto">
  <table className="w-full border-collapse text-sm">
    <thead>
      <tr>
        {/* Empty label column */}
        <th className="text-left pb-4 pr-6 text-xs font-semibold uppercase tracking-widest text-[#94A3B8] w-40" />

        {/* WarpLeads — highlighted */}
        <th className="pb-4 px-6 text-center">
          <div className="inline-flex flex-col items-center gap-1">
            {/* "Best value" badge */}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] uppercase tracking-widest">
              Best value
            </span>
            <span className="text-base font-bold text-[#0F172A]">WarpLeads</span>
          </div>
        </th>

        {/* Apollo */}
        <th className="pb-4 px-6 text-center">
          <span className="text-base font-semibold text-[#64748B]">Apollo</span>
        </th>

        {/* ZoomInfo */}
        <th className="pb-4 px-6 text-center">
          <span className="text-base font-semibold text-[#64748B]">ZoomInfo</span>
        </th>
      </tr>
    </thead>

    <tbody>
      {rows.map((row, i) => (
        // Highlighted rows (credits at $149 + cost-per-credit) get a stronger indigo tint
        <tr key={i} className={row.highlight ? 'bg-[#EEF2FF]/40' : i % 2 === 0 ? 'bg-[#F8FAFC]' : 'bg-white'}>
          {/* Row label — bold on highlighted rows */}
          <td className={`py-3.5 pr-6 text-xs rounded-l-xl ${row.highlight ? 'font-bold text-[#4F46E5]' : 'font-medium text-[#475569]'}`}>
            {row.label}
            {/* Show "50× more" badge on the credits row */}
            {row.highlight && i === 2 && (
              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4F46E5] text-white">
                50× more credits
              </span>
            )}
          </td>

          {/* WarpLeads cell — highlighted column */}
          <td className={`py-3.5 px-6 text-center text-xs bg-[#EEF2FF]/60 border-x border-[#C7D2FE]/40 ${row.highlight ? 'font-extrabold text-[#4F46E5] text-sm' : 'font-semibold text-[#4F46E5]'}`}>
            {row.warpleads}
          </td>

          {/* Apollo cell */}
          <td className={`py-3.5 px-6 text-center text-xs ${row.highlight ? 'font-bold text-[#EF4444]' : 'text-[#64748B]'}`}>
            {row.apollo}
          </td>

          {/* ZoomInfo cell */}
          <td className={`py-3.5 px-6 text-center text-xs rounded-r-xl ${row.highlight ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
            {row.zoominfo}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Footnote** (below table, right-aligned):
```tsx
<p className="text-[10px] text-[#94A3B8] text-right max-w-4xl mx-auto mt-4 px-1">
  * Apollo pricing: apollo.io/pricing. ZoomInfo pricing: publicly reported ranges, no listed price on zoominfo.com.
  Prices verified March 2025. Annual billing assumed where noted.
</p>
```

---

### 4. Problem → Solution Bridge

**Section:** `bg-white py-24 px-6`
**Layout:** `max-w-4xl mx-auto`

Eyebrow component → `The problem with every other tool`

**Headline (centred):** `text-3xl md:text-4xl font-bold text-[#0F172A] leading-snug mb-4 text-center`
→ `You're not paying for bad data. You're paying with your domain.`

**Subheadline (centred):** `text-base text-[#64748B] text-center max-w-xl mx-auto mb-14`
→ `Most contact databases sell you a snapshot of the internet that was accurate when they scraped it. What it looks like when you hit send is anyone's guess.`

**Before / After two-column block:**
```tsx
// Two cards side by side — left = Before (red tint), right = After (green/indigo tint)
// On mobile: stack vertically
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">

  {/* BEFORE card */}
  <div className="rounded-2xl border border-[#FEE2E2] bg-[#FFF5F5] p-7 flex flex-col gap-4">
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
      <span className="text-xs font-bold uppercase tracking-widest text-[#EF4444]">Before WarpLeads</span>
    </div>
    <ul className="space-y-3">
      {[
        'Buy a list. 20–30% of emails bounce.',
        'Domain flagged after campaign 1.',
        'Sequences paused by your ESP.',
        '6–8 weeks re-warming your domain.',
        'Repeat for every new campaign.',
      ].map(item => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-[#7F1D1D]">
          <X size={14} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>

  {/* AFTER card */}
  <div className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-7 flex flex-col gap-4">
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
      <span className="text-xs font-bold uppercase tracking-widest text-[#4F46E5]">With WarpLeads</span>
    </div>
    <ul className="space-y-3">
      {[
        'VerifyFirst™ validates every email before reveal.',
        'Sub-2% bounce rate. Sender score stays clean.',
        'Sequences run uninterrupted.',
        'Same domain, campaign after campaign.',
        'Only pay for contacts that pass every check.',
      ].map(item => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-[#1E1B4B]">
          <Check size={14} className="text-[#4F46E5] mt-0.5 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>

</div>
```

**Pull-quote** (below the two cards, full-width, large — the strongest line on the page):
```tsx
// Large centred pull-quote — much more prominent than the old blockquote
<div className="text-center py-8 border-t border-[#E2E8F0]">
  <p className="text-xl md:text-2xl font-bold text-[#0F172A] max-w-2xl mx-auto leading-snug">
    "Every tool charges you for data.{' '}
    <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
      WarpLeads is the only one that validates it before you spend a credit.
    </span>"
  </p>
</div>
```

---

### 5. Bento Feature Grid

**Section:** `id="features"` · `bg-[#F8FAFC] border-y border-[#E2E8F0] py-24`

Eyebrow → `What you can do`
Headline: `text-3xl md:text-4xl font-bold text-[#0F172A] text-center mt-2 mb-14`
→ `Built for outbound teams that care about data quality`

**Bento CSS Grid:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
  {/* Cell A — md:col-span-2 */}
  {/* Cell B — md:col-span-1 */}
  {/* Cell C — md:col-span-1 */}
  {/* Cell D — md:col-span-2 */}
  {/* Cell E — md:col-span-3 */}
</div>
```

**Cell A — Tech Stack Targeting** `md:col-span-2`
- Style: `bg-white rounded-2xl border border-[#E2E8F0] p-8 flex flex-col gap-5`
- Tag: `500+ tech filters` (indigo pill)
- Headline: `text-xl font-bold text-[#0F172A]` → `Target by tech stack, not just job title`
- Body: `text-sm text-[#64748B] leading-relaxed` → `Filter 102 million contacts by the tools they run — CRM, automation, analytics, infra, and more. Combine with job title, management level, industry, and company size. Build your exact ICP list in under a minute.`
- Chip cloud visual (inside card, below body):
```tsx
// Two rows of technology name tags
const row1 = ['HubSpot','Salesforce','Marketo','Outreach','Apollo']   // indigo active style
const row2 = ['Segment','Mixpanel','Intercom','Stripe','Zapier']       // slate inactive style
// Active chip: border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5]
// Inactive chip: border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]
// All chips: text-xs px-2.5 py-1 rounded-full border font-medium
```

**Cell B — Verified Emails** `md:col-span-1`
- Use gradient border card (dark variant) — full height
- Icon: `ShieldCheck` (18px) in `text-[#818CF8]` on `bg-[#1E1B4B]` rounded icon container
- Headline (white): `Send to emails that won't bounce`
- Body (dim): `VerifyFirst™ runs syntax check, MX record lookup, and mail server ping on every contact — in that order, before a single credit leaves your account. Only contacts that pass all three cost you anything.`
- Stat accent: `text-3xl font-extrabold text-[#818CF8]` → `<2%` + `text-xs text-[#475569]` → `bounce rate with VerifyFirst™`

**Cell C — Credit System** `md:col-span-1`
- Style: `bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col gap-3`
- Icon: `Coins` in indigo icon container
- Headline: `Pay per reveal, not per list`
- Body: `1 credit = 1 verified contact. Revealed contacts are yours forever — re-export free, always.`
- Credit counter mockup:
```tsx
<div className="inline-flex items-center gap-3 mt-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] w-fit">
  <div className="flex gap-1">
    {Array.from({length:20}).map((_,i) => (
      <span key={i} className={`w-1.5 h-4 rounded-full ${i < 18 ? 'bg-[#4F46E5]' : 'bg-[#E2E8F0]'}`} />
    ))}
  </div>
  <span className="text-xs font-mono font-bold text-[#4F46E5]">18/20</span>
  <span className="text-xs text-[#94A3B8]">credits today</span>
</div>
```

**Cell D — Export & Sync** `md:col-span-2`
- Style: `bg-white rounded-2xl border border-[#E2E8F0] p-8 flex flex-col gap-5`
- Tag: `Export & sync`
- Headline: `Drop lists straight into your sequencer`
- Body: `Export to CSV for Instantly, Smartlead, or Apollo — or push to HubSpot, Salesforce, or Pipedrive via native sync. Your team shares one Reveal History, so no contact is ever paid for twice.`
- CRM row:
```tsx
// 3 buttons representing HubSpot, Salesforce, Pipedrive
const crms = [
  { name: 'HubSpot',    color: '#FF7A59' },
  { name: 'Salesforce', color: '#00A1E0' },
  { name: 'Pipedrive',  color: '#1F9B55' },
]
// Each: flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569]
// Coloured dot: w-2 h-2 rounded-full with the brand color above
```

**Cell E — Full-width dark banner** `md:col-span-3`
```tsx
<div className="md:col-span-3 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
  style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 60%, #1E1B4B 100%)' }}>
  <div>
    <p className="text-white font-bold text-lg">Everything your team reveals is shared and free to re-export.</p>
    <p className="text-sm text-[#94A3B8] mt-1">One Reveal History. No duplicate credits. Works across every plan.</p>
  </div>
  {/* Primary CTA button */}
  <a href="/sign-up"
    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all flex-shrink-0"
    style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
    Start revealing for free <ArrowRight size={14} />
  </a>
</div>
```

---

### 6. "Built for" Persona Row

**Section:** `bg-white border-y border-[#E2E8F0] py-20`

Headline: `text-2xl md:text-3xl font-bold text-[#0F172A] text-center mb-12`
→ `Used by every outbound role on your team`

**Grid:** `grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto`

Each card:
```tsx
<div className="relative rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-7 flex flex-col gap-4 hover:border-[#C7D2FE] hover:shadow-md transition-all">
  {/* Top-right corner accent */}
  <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-3xl rounded-tr-2xl opacity-40"
    style={{ background: 'linear-gradient(135deg, #EEF2FF, #C7D2FE)' }} />
  {/* Tag pill */}
  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] w-fit relative z-10">
    {tag}
  </span>
  <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
  <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
  {/* Feature tags row */}
  <div className="flex flex-wrap gap-1.5 mt-auto">
    {featureTags.map(t => (
      <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#64748B]">{t}</span>
    ))}
  </div>
</div>
```

**Persona 1 — GTM Engineers**
- Tag: `GTM Engineers` · Title: `Your ICP list, built in 40 seconds`
- Body: `You already know your ICP runs HubSpot and has a VP Sales under 500 people. WarpLeads lets you say exactly that — 500+ tech filters plus 13 others. Hit export. Push to your CRM. Done.`
- Feature tags: `Tech stack filters` · `CRM sync` · `CSV export`

**Persona 2 — Cold Email Agencies**
- Tag: `Cold Email Agencies` · Title: `Your clients' domains stay clean`
- Body: `You're responsible for your clients' sender reputations. VerifyFirst™ handles the validation before any credit is spent — sub-2% bounce rates across every campaign you run, for every client.`
- Feature tags: `VerifyFirst™` · `Verified-only credits` · `Unlimited plan`

**Persona 3 — Email Marketers**
- Tag: `Email Marketers` · Title: `Segments so tight they feel hand-picked`
- Body: `Department, management level, education, industry, company size — stack any combination. The CSV you export goes straight into your campaign tool with zero cleanup. What you see in the filter is what you get.`
- Feature tags: `14 filter dimensions` · `Saved searches` · `Lists`

---

### 7. How It Works

**Section:** `id="how-it-works"` · `bg-[#020617] py-24`

Eyebrow (white variant): `text-xs font-semibold uppercase tracking-widest text-[#4F46E5] text-center mb-3`
Headline: `text-3xl md:text-4xl font-bold text-white text-center mb-4` → `From filters to inbox in three steps`
Subheadline: `text-base text-[#64748B] text-center max-w-xl mx-auto mb-16`
→ `No data science degree required. No bloated exports to clean. Just the contacts you actually want.`

**Step grid:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
  {/* Gradient connector line — md only */}
  <div className="hidden md:block absolute top-5 z-0"
    style={{
      left: 'calc(16.5% + 28px)',
      right: 'calc(16.5% + 28px)',
      height: '1px',
      background: 'linear-gradient(90deg, rgba(79,70,229,0.2), rgba(79,70,229,0.6), rgba(79,70,229,0.2))'
    }} />
  {steps.map((step, i) => (
    <div key={i} className="flex flex-col items-center text-center relative z-10">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ring-4 ring-[#1E1B4B]"
        style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
        {String(i+1).padStart(2,'0')}
      </div>
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 mt-4 text-left w-full">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4F46E5] mb-2">Step {String(i+1).padStart(2,'0')}</p>
        <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
        <p className="text-sm text-[#64748B] leading-relaxed">{step.body}</p>
      </div>
    </div>
  ))}
</div>
```

Steps data:
```ts
const steps = [
  {
    title: 'Describe exactly who you want',
    body:  'You set 14 filters — job title, tech stack, company size, location, management level, and more. WarpLeads returns a real-time list of contacts that match every condition, not just one.',
  },
  {
    title: 'VerifyFirst™ clears them before you pay',
    body:  'You click Reveal. VerifyFirst™ runs syntax, MX, and mail server checks on the spot. You get a verified work email, personal email, and phone number — charged only after all three checks pass.',
  },
  {
    title: 'Your sequencer gets clean data',
    body:  'Export to CSV for any sequencer, or push directly to your CRM. Every contact in Reveal History is free to re-export forever — your whole team shares one clean, verified list.',
  },
]
```

---

### 8. Testimonials

**Section:** `bg-white border-y border-[#E2E8F0] py-20`

Eyebrow → `What people say`
Headline: `text-2xl md:text-3xl font-bold text-[#0F172A] text-center mb-4`
→ `Outbound teams that switched to verified data`

**Social proof number bar** (below headline, above cards):
```tsx
// Three quick stats that give testimonials context — renders as a horizontal row of numbers
<div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 py-5 border-y border-[#E2E8F0]">
  {[
    { n: '1,200+', label: 'outbound teams active' },
    { n: '48M+',   label: 'contacts revealed to date' },
    { n: '4.8',    label: 'average rating from users' },
  ].map(({ n, label }) => (
    <div key={label} className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-extrabold bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
        {n}
      </span>
      <span className="text-xs text-[#94A3B8]">{label}</span>
    </div>
  ))}
</div>
```

**Grid:** `grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto`

```tsx
const testimonials = [
  {
    initials: 'MR',
    // Specific numbers + concrete consequence = believable
    quote: "Switched from Apollo to WarpLeads in March. First campaign had a 1.4% bounce rate — our previous one hit 22% and almost got our client's domain blacklisted. Not going back.",
    name: 'Marcus R.',
    role: 'Head of Growth · Series B SaaS',
    metric: '1.4% bounce rate',  // render as a small highlighted pill above the quote
  },
  {
    initials: 'SL',
    // Agency owner — specific client count + the real differentiator (tech stack + title together)
    quote: "I manage outbound for 9 clients. The tech stack filter is the reason I'm here — no one else lets me say 'runs HubSpot, no Outreach yet, VP Sales in fintech under 200 people'. That's my list in 40 seconds.",
    name: 'Sofia L.',
    role: 'Founder · Cold Email Agency',
    metric: '9 clients managed',
  },
  {
    initials: 'AT',
    // GTM engineer — time saved is credible, CSV + CRM sync is the feature hook
    quote: "We were spending 3 days per week building prospect lists. Our GTM engineer automated the whole thing with WarpLeads CSV exports into our sequencer. That time is now spent on copy and testing.",
    name: 'Arjun T.',
    role: 'GTM Lead · PLG Startup',
    metric: '3 days → 2 hours',
  },
]
```

**Metric pill** (above each quote, inside card):
```tsx
// Renders the `metric` field as a small stat above the quote mark
<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] w-fit">
  {metric}
</span>
```

Each card:
```tsx
<div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-7 flex flex-col gap-4">
  <span className="text-4xl text-[#C7D2FE] font-serif leading-none select-none">"</span>
  <p className="text-sm text-[#0F172A] leading-relaxed font-medium flex-1">"{quote}"</p>
  <div className="flex items-center gap-3 pt-4 border-t border-[#E2E8F0]">
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
      {initials}
    </div>
    <div>
      <p className="text-xs font-semibold text-[#0F172A]">{name}</p>
      <p className="text-xs text-[#94A3B8]">{role}</p>
    </div>
  </div>
</div>
```

---

### 9. FAQ

**Section:** `id="faq"` · `bg-[#F8FAFC] border-y border-[#E2E8F0] py-24`
**Layout:** `max-w-2xl mx-auto px-6`

Eyebrow → `FAQ`
Headline: `text-3xl font-bold text-[#0F172A] text-center mb-12`
→ `Questions we hear before people sign up`

```tsx
// State: const [open, setOpen] = useState<number | null>(null)
// Toggle: setOpen(prev => prev === i ? null : i)

const faqs = [
  {
    q: "What's the bounce rate on revealed emails?",
    a: "Under 2% on average. Every email is validated against syntax rules, MX records, and mail server deliverability — before a single credit is spent. You only pay for contacts that pass every check.",
  },
  {
    q: "Can I export directly to Instantly, Smartlead, or Apollo?",
    a: "Yes — export any list as a CSV and import it into any sequencer. Native push to HubSpot, Salesforce, and Pipedrive is available on the Unlimited plan.",
  },
  {
    q: "If I reveal a contact today, can my teammate export them tomorrow for free?",
    a: "Yes. Revealed contacts live permanently in shared Reveal History. Anyone on the team re-exports, copies, or views them at no cost — credits only fire on net-new reveals.",
  },
  {
    q: "How granular are the tech stack filters?",
    a: "500+ individual technologies across CRM, marketing automation, analytics, ad platforms, and infra. Combine with job title and company size to nail your exact ICP.",
  },
]
```

Each row:
```tsx
<div key={i} className="border-b border-[#E2E8F0] last:border-0">
  <button onClick={() => setOpen(open === i ? null : i)}
    className="w-full flex justify-between items-center py-5 text-left group">
    <span className={`text-sm font-semibold transition-colors ${open === i ? 'text-[#4F46E5]' : 'text-[#0F172A] group-hover:text-[#4F46E5]'}`}>
      {q}
    </span>
    <ChevronDown size={16} className={`text-[#94A3B8] flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
  </button>
  <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${open === i ? 'max-h-96' : 'max-h-0'}`}>
    <p className="text-sm text-[#64748B] leading-relaxed pb-5">{a}</p>
  </div>
</div>
```

---

### 10. Pricing

**Section:** `id="pricing"` · `bg-white py-24`

Eyebrow → `Pricing`
Headline: `text-3xl md:text-4xl font-bold text-[#0F172A] text-center mb-3` → `Start free. Scale when you're ready.`
Subheadline: `text-base text-[#64748B] text-center max-w-md mx-auto mb-4`
→ `No trial periods. No hidden limits. Your free plan includes real, verified reveals every day.`

**Price anchor line** (below subheadline, above cards, centred):
```tsx
// Anchors $49 against the real cost of bad data — domain recovery, lost campaigns, wasted send quota
<p className="text-xs text-[#94A3B8] text-center mb-10">
  One blacklisted domain costs more to recover than a year of Unlimited.{' '}
  <span className="text-[#4F46E5] font-semibold">WarpLeads Unlimited is $49/mo — you only pay for contacts that pass validation.</span>
</p>
```

**Grid:** `grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto`
(4 columns on desktop — Free + 3 paid tiers side by side for easy scanning)

---

**Card data array:**
```tsx
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/ mo',
    credits: '20 reveals / day',
    creditsNote: 'resets every 24 hours',
    highlight: false,
    popular: false,
    cta: 'Get started free',
    ctaStyle: 'border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]',
    features: [
      '20 verified reveals/day',
      'All 14 search filters',
      'CSV export up to 20/day',
      'Leads lists + saved searches',
      'Reveal History',
    ],
  },
  {
    name: 'Starter',
    price: '$49',
    period: '/ mo',
    credits: '60,000 credits',
    creditsNote: 'per month',
    highlight: false,
    popular: false,
    cta: 'Start Starter',
    ctaStyle: 'border border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]',
    features: [
      '60,000 verified reveals/mo',
      'All 14 search filters',
      'CSV export up to 25,000/run',
      'HubSpot, Salesforce, Pipedrive sync',
      'Leads lists + saved searches',
    ],
  },
  {
    name: 'Growth',
    price: '$99',
    period: '/ mo',
    credits: '150,000 credits',
    creditsNote: 'per month',
    highlight: true,   // gradient border dark card — "most popular"
    popular: true,
    cta: 'Start Growth',
    ctaStyle: '',      // white bg on dark card
    features: [
      '150,000 verified reveals/mo',
      'All 14 search filters',
      'CSV export up to 25,000/run',
      'HubSpot, Salesforce, Pipedrive sync',
      'Team management + quotas',
      'Priority support',
    ],
  },
  {
    name: 'Scale',
    price: '$149',
    period: '/ mo',
    credits: '300,000 credits',
    creditsNote: 'per month — 50× Apollo at same price',
    highlight: false,
    popular: false,
    cta: 'Start Scale',
    ctaStyle: 'border border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]',
    features: [
      '300,000 verified reveals/mo',
      'All 14 search filters',
      'CSV export up to 25,000/run',
      'HubSpot, Salesforce, Pipedrive sync',
      'Team management + quotas',
      'Priority support',
    ],
  },
]
```

**Light card JSX** (Free, Starter, Scale — `highlight: false`):
```tsx
<div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-7 flex flex-col">
  <p className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">{plan.name}</p>
  <div className="flex items-end gap-1 mb-1">
    <span className="text-4xl font-extrabold text-[#0F172A]">{plan.price}</span>
    <span className="text-sm text-[#94A3B8] font-normal mb-1">{plan.period}</span>
  </div>
  {/* Credit volume — the key differentiator */}
  <div className="mt-2 mb-1">
    <span className="text-sm font-bold text-[#4F46E5]">{plan.credits}</span>
    <span className="text-xs text-[#94A3B8] ml-1">{plan.creditsNote}</span>
  </div>
  <hr className="border-[#E2E8F0] my-5" />
  <ul className="space-y-2.5 flex-1">
    {plan.features.map(f => (
      <li key={f} className="flex items-start gap-2 text-xs text-[#475569]">
        <Check size={13} className="text-[#94A3B8] mt-0.5 flex-shrink-0" />
        {f}
      </li>
    ))}
  </ul>
  <button className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.ctaStyle}`}>
    {plan.cta}
  </button>
</div>
```

**Growth card JSX** (gradient border + dark, `highlight: true`):
```tsx
<div className="p-px rounded-2xl relative" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
  {/* Most popular badge */}
  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold text-white z-10"
    style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
    Most popular
  </div>
  <div className="bg-[#1E1B4B] rounded-[15px] p-7 flex flex-col h-full">
    <p className="text-xs font-semibold uppercase tracking-widest text-[#818CF8] mb-3">Growth</p>
    <div className="flex items-end gap-1 mb-1">
      <span className="text-4xl font-extrabold text-white">$99</span>
      <span className="text-sm text-[#818CF8] font-normal mb-1">/ mo</span>
    </div>
    {/* Credit volume */}
    <div className="mt-2 mb-1">
      <span className="text-sm font-bold text-[#A5B4FC]">150,000 credits</span>
      <span className="text-xs text-[#475569] ml-1">per month</span>
    </div>
    <hr className="border-[#312E81] my-5" />
    <ul className="space-y-2.5 flex-1">
      {[
        '150,000 verified reveals/mo',
        'All 14 search filters',
        'CSV export up to 25,000/run',
        'HubSpot, Salesforce, Pipedrive sync',
        'Team management + quotas',
        'Priority support',
      ].map(f => (
        <li key={f} className="flex items-start gap-2 text-xs text-[#C7D2FE]">
          <Check size={13} className="text-[#818CF8] mt-0.5 flex-shrink-0" />
          {f}
        </li>
      ))}
    </ul>
    <button className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold text-[#4F46E5] bg-white hover:bg-indigo-50 transition-colors">
      Start Growth
    </button>
  </div>
</div>
```

**Scale card callout** — add this note inside the Scale card below the credits line:
```tsx
// Small indigo badge that makes the Apollo comparison impossible to miss
<span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] mt-1">
  50× more credits than Apollo at the same price
</span>
```

---

### 11. Final CTA

**Section:** `bg-[#020617] relative overflow-hidden py-28`
Same background layers as Hero (gradient glow + orbs + dot grid)

**Content:** `relative z-10 max-w-3xl mx-auto text-center px-6`

Headline:
```tsx
<h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5 text-white">
  Your next campaign list{' '}
  <span className="bg-gradient-to-br from-white via-[#A5B4FC] to-[#818CF8] bg-clip-text text-transparent">
    is already built. Go get it.
  </span>
</h2>
```

Body: `text-lg text-[#64748B] max-w-md mx-auto mb-10`
→ `Sign up in 90 seconds. Your 20 free credits are waiting right now — they reset at midnight whether you use them or not.`

**CTA button:**
```tsx
<a href="/sign-up"
  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all"
  style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
  Claim my 20 free reveals <ArrowRight size={14} />
</a>
```

**Risk reversal block** (below CTA, `flex flex-col items-center gap-1 mt-5`):
```tsx
// Three stacked micro-trust signals — each removes a specific objection
<p className="text-xs text-[#334155]">No credit card required. Free plan stays free — no bait-and-switch.</p>
<p className="text-xs text-[#334155]">Credits only spent on contacts that pass full email validation.</p>
<p className="text-xs text-[#334155]">Cancel anytime in one click. No cancellation flow, no dark patterns.</p>
```

---

### 12. Footer

**Section:** `bg-[#020617] border-t border-[#1E293B] py-10`
**Inner:** `max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6`

**Left:** Logo (same as nav) + `text-xs text-[#334155] mt-1` → `© 2025 WarpLeads. All rights reserved.`

**Center:** `hidden md:flex gap-8` — Features · Pricing · FAQ · Sign in
— `text-xs text-[#475569] hover:text-[#94A3B8] transition-colors`

**Right:** `flex gap-6` — Privacy · Terms · Contact
— `text-xs text-[#475569] hover:text-[#94A3B8] transition-colors`

---

## Animation Schedule

| Element | Trigger | Class / delay |
|---------|---------|---------------|
| Navbar | immediate | `animate-fade-in` |
| Hero badge | mount | `animate-fade-up delay-0` |
| Hero headline | mount | `animate-fade-up delay-100` |
| Hero subheadline | mount | `animate-fade-up delay-200` |
| Hero CTAs | mount | `animate-fade-up delay-300` |
| Hero trust line | mount | `animate-fade-up delay-400` |
| Hero mockup | mount | `animate-fade-up delay-500` |
| Ticker | continuous | CSS `animate-ticker` |
| Stats cards | scroll-enter | `useReveal` + stagger 80ms |
| Bento cells | scroll-enter | `useReveal` + stagger 100ms |
| Persona cards | scroll-enter | stagger 100ms |
| Step cards | scroll-enter | stagger 150ms |
| Testimonial cards | scroll-enter | stagger 100ms |
| Pricing cards | scroll-enter | stagger 100ms |
| FAQ rows | no animation | accordion `max-h` transition |

---

## Responsive Rules
- **Mobile first** throughout
- `md:` = 768px — all grids switch here
- **Bento:** all cells `col-span-1` on mobile, Cell E stacks vertically
- **Nav:** links + sign-in hidden; Menu icon → slide-down drawer
- **Hero headline:** `text-5xl` → `text-7xl`
- **Browser mockup:** `h-[260px]` → `h-[420px]`
- **Ticker:** active on all widths
- **Pricing cards:** single column stacked on mobile, gap-10

---

## Required imports for `app/page.tsx`

Add this exact import block at the top of `page.tsx`. Do not omit any icon — they are all used:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowRight, Play, Menu, X, Check, Zap,
  SlidersHorizontal, ShieldCheck, Coins, ChevronDown,
} from 'lucide-react'
```

The `useReveal` and `useCountUp` hooks should be defined as regular functions **inside `page.tsx`** before the component definitions — do not split into separate files.

---

## Final generation checklist — verify before finishing

Every item below must be present and fully implemented in your output. Do not submit until all are complete:

- [x] `app/layout.tsx` — metadata, Inter font, `antialiased`, `bg-[#020617]` on body
- [x] `app/globals.css` — `.dot-grid`, `.ticker-wrap:hover .ticker-inner` pause rule, `@keyframes` not needed (handled via `tailwind.config.js`)
- [x] `tailwind.config.js` — `fadeUp`, `fadeIn`, `ticker` animations + keyframes
- [x] `app/page.tsx` — `'use client'`, all imports, `useReveal`, `useCountUp`, all 13 section components, `export default function Page()`
- [x] `<Navbar />` — scroll-triggered blur, mobile drawer with `useState`
- [x] `<Hero />` — 3 background orbs + dot-grid, badge, gradient headline, subheadline, 2 CTAs, trust line, browser chrome mockup with glow
- [x] `<Ticker />` — duplicated `tools` array, `animate-ticker`, hover pause via CSS class
- [x] `<Stats />` — 4 cards, `useReveal` + `useCountUp`, sub-labels
- [x] `<PricingComparison />` — 6-row table, WarpLeads/Apollo/ZoomInfo columns, `highlight` rows in indigo+red, `50× more` badge, footnote
- [x] `<ProblemBridge />` — headline, subheadline, Before/After 2-col grid (red card + indigo card with X/Check lists), pull-quote with gradient text
- [x] `<BentoFeatures />` — Cell A (2-col, chip cloud), Cell B (gradient border dark, VerifyFirst™), Cell C (credit bar), Cell D (2-col, CRM buttons), Cell E (full-width dark banner with CTA)
- [x] `<PersonaRow />` — 3 cards with corner accent, tag pill, feature tags, hover border
- [x] `<HowItWorks />` — dark bg, gradient connector line, 3 step cards with numbered circles
- [x] `<Testimonials />` — social proof bar (3 numbers), 3 quote cards with metric pills + initials avatars
- [x] `<FAQ />` — 4 items, `useState` for open index, `max-h` transition
- [x] `<Pricing />` — 4-col grid, Free/Starter/Scale as light cards, Growth as gradient-border dark card with "Most popular" badge, Scale with "50×" badge
- [x] `<FinalCTA />` — dark bg, same orbs as Hero, gradient headline, body, full CTA button, 3-line risk reversal
- [x] `<Footer />` — dark, logo left, nav center, links right
