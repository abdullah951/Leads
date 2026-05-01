'use client';

// ─────────────────────────────────────────────────────────────────────────────
// LandingPage.tsx — WarpLeads marketing landing page
//
// Sections (top → bottom):
//   0. Navbar          — glassmorphism, scroll-blur, mobile drawer
//   1. Hero            — dark, gradient orbs, dot-grid, browser mockup
//   2. Ticker          — infinite CSS scroll of integration names
//   3. Stats           — 4-card bar, count-up on scroll
//   3b. PricingComparison — 6-row table vs Apollo / ZoomInfo
//   4. ProblemBridge   — Before/After cards + pull-quote
//   5. BentoFeatures   — mixed-size bento grid
//   6. PersonaRow      — 3 persona cards
//   7. HowItWorks      — dark, numbered steps
//   8. Testimonials    — 3 quote cards + social proof numbers
//   9. FAQ             — accordion, 4 items
//  10. Pricing         — 4-col grid (Free/Starter/Growth/Scale)
//  11. FinalCTA        — dark, same orbs as Hero
//  12. Footer          — dark, links
//
// Tech notes:
//   - Tailwind v4 in this project → no tailwind.config.js
//   - Custom keyframes (.animate-ticker, .animate-fade-up, .animate-fade-in,
//     .dot-grid, .ticker-wrap:hover) are defined in global.css
//   - Use inline style={{ }} for gradients (Tailwind cannot express them cleanly)
//   - All hooks (useReveal, useCountUp) are defined inline before use
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Play,
  Menu,
  X,
  Check,
  Zap,
  ShieldCheck,
  Coins,
  ChevronDown,
} from 'lucide-react';

// ─── Brand token reference (inline style values) ─────────────────────────────
// dark950: '#020617'  — hero bg, final CTA bg, footer bg
// dark900: '#0F172A'  — card dark bg
// dark800: '#1E293B'  — border on dark
// indigo600: '#4F46E5' — primary brand
// indigo700: '#4338CA' — hover
// indigo400: '#818CF8' — accent on dark
// indigo200: '#A5B4FC' — gradient via
// indigo100: '#C7D2FE' — muted accent
// ─────────────────────────────────────────────────────────────────────────────

// ─── Hook: useReveal ─────────────────────────────────────────────────────────
// Triggers `visible` = true when the attached ref element enters the viewport.
// Disconnects the observer once visible to avoid redundant callbacks.
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ─── Hook: useCountUp ────────────────────────────────────────────────────────
// Animates a number from 0 → `target` over `duration` ms using easeOut cubic.
// Only starts when `trigger` becomes true (use with useReveal).
function useCountUp(target: number, duration = 1500, trigger: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) {
      return;
    }

    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round(easeOut(t) * target));
      if (t < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [target, duration, trigger]);

  return value;
}

// ─── Reusable: Eyebrow ───────────────────────────────────────────────────────
// Small labelled indicator used above section headlines throughout the page.
function Eyebrow(props: { text: string; dark?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1.5 mb-4">
      {/* Indigo accent bar */}
      <span className="w-1 h-4 rounded-full bg-[#4F46E5]" />
      <span
        className={`text-xs font-semibold uppercase tracking-widest ${
          props.dark ? 'text-[#4F46E5]' : 'text-[#4F46E5]'
        }`}
      >
        {props.text}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 0 — Navbar
// ─────────────────────────────────────────────────────────────────────────────
function Navbar() {
  // Scroll state: true = blurred dark background; false = transparent
  const [scrolled, setScrolled] = useState(false);
  // Mobile drawer: true = open
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = ['Features', 'How it works', 'Pricing', 'FAQ'];

  return (
    <>
      {/* Fixed top bar */}
      <header
        className={`fixed top-0 inset-x-0 z-50 h-[60px] transition-colors duration-300 ${
          scrolled
            ? 'bg-[#020617]/90 backdrop-blur-md border-b border-[#1E293B]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">

          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}
            >
              <Zap size={12} className="text-white" />
            </span>
            <span className="font-bold text-white text-lg">Warp</span>
            <span className="font-bold text-[#818CF8] text-lg -ml-1">Leads</span>
          </a>

          {/* Desktop nav links — hidden on mobile */}
          <nav className="hidden md:flex gap-8">
            {navLinks.map(label => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm text-[#94A3B8] font-medium hover:text-white transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Sign in — desktop only */}
            <a
              href="/sign-in"
              className="text-sm text-[#94A3B8] hover:text-white transition-colors hidden md:block"
            >
              Sign in
            </a>

            {/* Primary CTA */}
            <a
              href="/sign-up"
              className="text-sm font-semibold text-white px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            >
              Start free
            </a>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-[#94A3B8] hover:text-white"
              onClick={() => setDrawerOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-down drawer */}
      {drawerOpen && (
        <div className="fixed top-[60px] inset-x-0 z-40 bg-[#0F172A] border-b border-[#1E293B] px-6 py-4 md:hidden">
          {/* Stacked nav links */}
          {navLinks.map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              className="text-base text-[#94A3B8] py-2 block hover:text-white transition-colors"
              onClick={() => setDrawerOpen(false)}
            >
              {label}
            </a>
          ))}

          {/* Full-width CTA at bottom of drawer */}
          <a
            href="/sign-up"
            className="mt-4 block w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            Start free — 20 leads/day
          </a>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Hero
// ─────────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="bg-[#020617] relative overflow-hidden pt-32 pb-28">

      {/* ── Background layers — all pointer-events-none ── */}

      {/* Radial glow — large top-center indigo bloom */}
      <div
        className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(99,102,241,0.3) 0%, transparent 70%)',
        }}
      />

      {/* Orb left — soft indigo orb behind hero content */}
      <div
        className="absolute -left-64 top-32 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)',
        }}
      />

      {/* Orb right — soft violet orb behind hero content */}
      <div
        className="absolute -right-64 top-64 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 60%)',
        }}
      />

      {/* Dot-grid texture overlay */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* ── Content — centred column ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col items-center text-center">

        {/* VerifyFirst™ badge — fades in on mount */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#312E81] bg-[#1E1B4B]/60 backdrop-blur-sm mb-6 animate-fade-in">
          {/* Live green dot */}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-[#A5B4FC]">
            Powered by VerifyFirst™ — 3-layer email validation before every credit
          </span>
        </div>

        {/* Headline — gradient text on second line */}
        <h1
          className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 max-w-4xl text-white animate-fade-up"
          style={{ animationDelay: '100ms' }}
        >
          Reveal verified contacts.{' '}
          <span className="bg-gradient-to-br from-white via-[#A5B4FC] to-[#818CF8] bg-clip-text text-transparent">
            Protect your sender reputation.
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg md:text-xl text-[#94A3B8] max-w-2xl leading-relaxed mb-10 animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          WarpLeads validates every email before you spend a single credit.
          Search 102 million contacts by tech stack, job title, and 12 other filters —
          then reveal only the people worth reaching.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-5 animate-fade-up"
          style={{ animationDelay: '300ms' }}
        >
          {/* Primary */}
          <a
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:scale-[1.02] transition-all"
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              boxShadow: '0 8px 30px rgba(79,70,229,0.25)',
            }}
          >
            Start free — 20 leads/day <ArrowRight size={14} />
          </a>

          {/* Secondary — ghost glass button */}
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-[#CBD5E1] border border-[#334155] bg-[#0F172A]/60 backdrop-blur-sm hover:border-[#4F46E5]/50 hover:text-white transition-all"
          >
            See how it works <Play size={12} />
          </a>
        </div>

        {/* Trust microcopy */}
        <p
          className="text-xs text-[#475569] animate-fade-up"
          style={{ animationDelay: '400ms' }}
        >
          No credit card required · First reveal in under 3 minutes · Free credits reset every 24 hours
        </p>

        {/* Browser chrome mockup */}
        <div
          className="relative mt-16 max-w-5xl mx-auto w-full animate-fade-up"
          style={{ animationDelay: '500ms' }}
        >
          {/* Glow beneath the mockup */}
          <div
            className="absolute -inset-x-20 -bottom-10 h-40 blur-3xl opacity-30 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, #4F46E5, #7C3AED)' }}
          />

          {/* Chrome frame */}
          <div className="relative rounded-2xl border border-[#1E293B] bg-[#0F172A] shadow-2xl overflow-hidden">

            {/* Title bar with traffic-light dots */}
            <div className="h-9 bg-[#1E293B] flex items-center px-4 gap-2 border-b border-[#334155]">
              <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              {/* URL bar */}
              <div className="ml-4 flex-1 max-w-xs h-5 bg-[#0F172A] rounded-md flex items-center px-2">
                <span className="text-[10px] text-[#334155]">app.warpleads.com/dashboard</span>
              </div>
            </div>

            {/* Screenshot placeholder — swap with <Image> once screenshot exists */}
            <div className="bg-[#F8FAFC] h-[260px] md:h-[420px] flex items-center justify-center">
              <p className="text-sm text-[#94A3B8]">
                Product screenshot — leads table with sidebar filters + revealed contact row
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Integration Ticker
// ─────────────────────────────────────────────────────────────────────────────

// Integration names that scroll across the ticker
const tools = [
  'HubSpot', 'Salesforce', 'Pipedrive', 'Instantly', 'Smartlead',
  'Apollo', 'Outreach', 'Lemlist', 'Mailshake', 'Close', 'Snov.io', 'Reply.io',
];

function Ticker() {
  return (
    <section className="bg-[#020617] border-b border-[#1E293B] py-10">
      {/* Eyebrow label — centred */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] text-center mb-6">
        Export and sync with your entire outbound stack
      </p>

      {/* Scrolling ticker — outer .ticker-wrap enables hover-pause via CSS */}
      <div className="ticker-wrap overflow-hidden">
        {/* .ticker-inner contains the list twice for a seamless loop */}
        <div className="ticker-inner inline-flex gap-12 items-center whitespace-nowrap animate-ticker">
          {[...tools, ...tools].map((tool, i) => (
            <span
              key={i}
              className="text-sm font-semibold text-[#334155] hover:text-[#64748B] transition-colors px-2 cursor-default select-none"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Stats Bar
// ─────────────────────────────────────────────────────────────────────────────

// Each stat card; `raw` is the count-up target (null = display value is static text)
const stats = [
  { display: '<2%',   raw: null, label: 'Average bounce rate',  sub: 'vs. 15–30% on bought lists' },
  { display: '500+',  raw: 500,  label: 'Tech stack filters',   sub: 'target by tools they actually run' },
  { display: '102M+', raw: 102,  label: 'Verified contacts',    sub: 'validated before every reveal' },
  { display: '3 min', raw: null, label: 'Time to first reveal', sub: 'from signup to verified contact' },
];

// Individual stat card — uses its own count-up when `visible` is true
function StatCard(props: { stat: typeof stats[0]; visible: boolean; delay: number }) {
  const count = useCountUp(props.stat.raw ?? 0, 1500, props.visible && props.stat.raw !== null);

  // Format the animated number: append '+' for 500, 'M+' for 102
  const displayValue = () => {
    if (!props.visible || props.stat.raw === null) {
      return props.stat.display;
    }
    if (props.stat.raw === 500) {
      return `${count}+`;
    }
    if (props.stat.raw === 102) {
      return `${count}M+`;
    }
    return `${count}`;
  };

  return (
    <div
      className={`flex flex-col items-center text-center p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all duration-500 ${
        props.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${props.delay}ms` }}
    >
      {/* Large gradient number */}
      <span
        className="text-4xl font-extrabold bg-clip-text text-transparent"
        style={{ backgroundImage: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
      >
        {displayValue()}
      </span>

      {/* Label */}
      <span className="text-sm text-[#64748B] mt-1 font-medium">{props.stat.label}</span>

      {/* Sub-label — extra context under the label */}
      <span className="text-xs text-[#94A3B8] mt-0.5">{props.stat.sub}</span>
    </div>
  );
}

function Stats() {
  const { ref, visible } = useReveal(0.2);

  return (
    <section className="bg-white border-y border-[#E2E8F0] py-14" id="features">
      <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto px-6">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} visible={visible} delay={i * 80} />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3b — Pricing Comparison Table
// ─────────────────────────────────────────────────────────────────────────────

// Table rows — pricing sources verified March 2025
// Apollo: apollo.io/pricing — $149/mo = 6,000 credits
// ZoomInfo: no public price, ~$15,000/yr minimum
// WarpLeads: $49/mo = 60k · $99/mo = 150k · $149/mo = 300k
const rows = [
  {
    label: 'Free plan',
    warpleads: '✓ 20 verified reveals/day — forever',
    apollo: '✓ Limited (sequences & export restricted)',
    zoominfo: '✗ No free plan',
    highlight: false,
  },
  {
    label: 'Entry paid plan',
    warpleads: '$49 / mo — 60,000 credits',
    apollo: 'No comparable tier at this price',
    zoominfo: 'Quote only — min. ~$15,000 / yr',
    highlight: false,
  },
  {
    // Key row — same dollar amount, 50× more credits
    label: 'Credits at $149 / mo',
    warpleads: '300,000 credits',
    apollo: '6,000 credits',
    zoominfo: 'Unknown — not published',
    highlight: true,
  },
  {
    // Cost-per-credit comparison — makes the gap concrete
    label: 'Cost per credit at $149',
    warpleads: '$0.0005 per credit',
    apollo: '$0.025 per credit',
    zoominfo: 'Not published',
    highlight: true,
  },
  {
    label: 'Minimum commitment',
    warpleads: 'None — cancel anytime',
    apollo: 'Annual contract for best pricing',
    zoominfo: 'Annual contract, typically 1–3 yr',
    highlight: false,
  },
  {
    label: 'Email validated before charge',
    warpleads: '✓ Every contact, every time',
    apollo: '✗ No pre-reveal validation',
    zoominfo: '✗ No pre-reveal validation',
    highlight: false,
  },
];

function PricingComparison() {
  const { ref, visible } = useReveal(0.1);

  return (
    <section className="bg-white border-b border-[#E2E8F0] py-20 px-6">
      <div
        ref={ref}
        className={`max-w-4xl mx-auto transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Eyebrow + headline */}
        <div className="flex flex-col items-center mb-12">
          <Eyebrow text="How we compare" />
          <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] text-center mb-3">
            At $149/mo you get 300,000 credits. Or 6,000. Your call.
          </h2>
          <p className="text-sm text-[#64748B] text-center max-w-md">
            All pricing based on publicly listed plans as of 2025. Annual billing where applicable.
          </p>
        </div>

        {/* Scrollable on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {/* Empty label column */}
                <th className="text-left pb-4 pr-6 text-xs font-semibold uppercase tracking-widest text-[#94A3B8] w-40" />

                {/* WarpLeads — highlighted column */}
                <th className="pb-4 px-6 text-center">
                  <div className="inline-flex flex-col items-center gap-1">
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
                <tr
                  key={i}
                  className={
                    row.highlight
                      ? 'bg-[#EEF2FF]/40'
                      : i % 2 === 0
                        ? 'bg-[#F8FAFC]'
                        : 'bg-white'
                  }
                >
                  {/* Row label — bold + indigo on highlighted rows */}
                  <td
                    className={`py-3.5 pr-6 text-xs rounded-l-xl ${
                      row.highlight
                        ? 'font-bold text-[#4F46E5]'
                        : 'font-medium text-[#475569]'
                    }`}
                  >
                    {row.label}
                    {/* "50× more credits" badge on the credits row */}
                    {row.highlight && i === 2 && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4F46E5] text-white">
                        50× more credits
                      </span>
                    )}
                  </td>

                  {/* WarpLeads cell — highlighted column */}
                  <td
                    className={`py-3.5 px-6 text-center text-xs bg-[#EEF2FF]/60 border-x border-[#C7D2FE]/40 ${
                      row.highlight
                        ? 'font-extrabold text-[#4F46E5] text-sm'
                        : 'font-semibold text-[#4F46E5]'
                    }`}
                  >
                    {row.warpleads}
                  </td>

                  {/* Apollo cell */}
                  <td
                    className={`py-3.5 px-6 text-center text-xs ${
                      row.highlight ? 'font-bold text-[#EF4444]' : 'text-[#64748B]'
                    }`}
                  >
                    {row.apollo}
                  </td>

                  {/* ZoomInfo cell */}
                  <td
                    className={`py-3.5 px-6 text-center text-xs rounded-r-xl ${
                      row.highlight ? 'text-[#94A3B8]' : 'text-[#64748B]'
                    }`}
                  >
                    {row.zoominfo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footnote — pricing sources */}
        <p className="text-[10px] text-[#94A3B8] text-right mt-4 px-1">
          * Apollo pricing: apollo.io/pricing. ZoomInfo pricing: publicly reported ranges, no listed price on zoominfo.com.
          Prices verified March 2025. Annual billing assumed where noted.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Problem → Solution Bridge
// ─────────────────────────────────────────────────────────────────────────────
function ProblemBridge() {
  const { ref, visible } = useReveal(0.1);

  return (
    <section className="bg-white py-24 px-6">
      <div
        ref={ref}
        className={`max-w-4xl mx-auto transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Eyebrow + headline */}
        <div className="flex flex-col items-center mb-8">
          <Eyebrow text="The problem with every other tool" />
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] leading-snug mb-4 text-center">
            You're not paying for bad data. You're paying with your domain.
          </h2>
          <p className="text-base text-[#64748B] text-center max-w-xl">
            Most contact databases sell you a snapshot of the internet that was accurate when they
            scraped it. What it looks like when you hit send is anyone's guess.
          </p>
        </div>

        {/* Before / After two-column block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 mt-8">

          {/* BEFORE card — red tint */}
          <div className="rounded-2xl border border-[#FEE2E2] bg-[#FFF5F5] p-7 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#EF4444]">
                Before WarpLeads
              </span>
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

          {/* AFTER card — indigo tint */}
          <div className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-7 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#4F46E5]">
                With WarpLeads
              </span>
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

        {/* Pull-quote — the strongest line on the page, full-width gradient text */}
        <div className="text-center py-8 border-t border-[#E2E8F0]">
          <p className="text-xl md:text-2xl font-bold text-[#0F172A] max-w-2xl mx-auto leading-snug">
            {"\"Every tool charges you for data. "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
              }}
            >
              WarpLeads is the only one that validates it before you spend a credit.
            </span>
            {'"'}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Bento Feature Grid
// ─────────────────────────────────────────────────────────────────────────────

// Tech stack chip data — two rows of tools shown in Cell A
const row1Chips = ['HubSpot', 'Salesforce', 'Marketo', 'Outreach', 'Apollo'];
const row2Chips = ['Segment', 'Mixpanel', 'Intercom', 'Stripe', 'Zapier'];

// CRM integration buttons in Cell D
const crms = [
  { name: 'HubSpot',    color: '#FF7A59' },
  { name: 'Salesforce', color: '#00A1E0' },
  { name: 'Pipedrive',  color: '#1F9B55' },
];

function BentoFeatures() {
  const { ref, visible } = useReveal(0.1);

  return (
    <section className="bg-[#F8FAFC] border-y border-[#E2E8F0] py-24 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Section header */}
        <div className="flex flex-col items-center mb-14">
          <Eyebrow text="What you can do" />
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] text-center mt-2">
            Built for outbound teams that care about data quality
          </h2>
        </div>

        {/* Bento grid — 3-column on md, all cells single column on mobile */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >

          {/* ── Cell A — Tech Stack Targeting (2 cols) ── */}
          <div
            className={`md:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-8 flex flex-col gap-5 transition-all duration-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Tag pill */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] w-fit">
              500+ tech filters
            </span>

            <h3 className="text-xl font-bold text-[#0F172A]">
              Target by tech stack, not just job title
            </h3>

            <p className="text-sm text-[#64748B] leading-relaxed">
              Filter 102 million contacts by the tools they run — CRM, automation, analytics, infra, and more.
              Combine with job title, management level, industry, and company size.
              Build your exact ICP list in under a minute.
            </p>

            {/* Chip cloud — two rows of technology tags */}
            <div className="flex flex-col gap-2">
              {/* Active chips — indigo */}
              <div className="flex flex-wrap gap-2">
                {row1Chips.map(chip => (
                  <span
                    key={chip}
                    className="text-xs px-2.5 py-1 rounded-full border font-medium border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              {/* Inactive chips — slate */}
              <div className="flex flex-wrap gap-2">
                {row2Chips.map(chip => (
                  <span
                    key={chip}
                    className="text-xs px-2.5 py-1 rounded-full border font-medium border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Cell B — Verified Emails (1 col, dark gradient border) ── */}
          <div
            className={`md:col-span-1 p-px rounded-2xl transition-all duration-700 delay-100 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.5), rgba(124,58,237,0.2))',
            }}
          >
            <div className="bg-[#0F172A] rounded-[15px] p-6 h-full flex flex-col gap-4">
              {/* Icon container */}
              <div className="w-10 h-10 rounded-lg bg-[#1E1B4B] flex items-center justify-center">
                <ShieldCheck size={18} className="text-[#818CF8]" />
              </div>

              <h3 className="text-base font-bold text-white">
                Send to emails that won't bounce
              </h3>

              <p className="text-sm text-[#64748B] leading-relaxed">
                VerifyFirst™ runs syntax check, MX record lookup, and mail server ping on every contact —
                in that order, before a single credit leaves your account.
                Only contacts that pass all three cost you anything.
              </p>

              {/* Big accent stat */}
              <div className="mt-auto">
                <span className="text-3xl font-extrabold text-[#818CF8]">&lt;2%</span>
                <span className="block text-xs text-[#475569] mt-0.5">bounce rate with VerifyFirst™</span>
              </div>
            </div>
          </div>

          {/* ── Cell C — Credit System (1 col, light) ── */}
          <div
            className={`md:col-span-1 bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col gap-3 transition-all duration-700 delay-200 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Icon container */}
            <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <Coins size={18} className="text-[#4F46E5]" />
            </div>

            <h3 className="text-base font-bold text-[#0F172A]">
              Pay per reveal, not per list
            </h3>

            <p className="text-sm text-[#64748B] leading-relaxed">
              1 credit = 1 verified contact. Revealed contacts are yours forever —
              re-export free, always.
            </p>

            {/* Credit bar mockup — 18/20 credits consumed */}
            <div className="inline-flex items-center gap-3 mt-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] w-fit">
              <div className="flex gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-4 rounded-full ${i < 18 ? 'bg-[#4F46E5]' : 'bg-[#E2E8F0]'}`}
                  />
                ))}
              </div>
              <span className="text-xs font-mono font-bold text-[#4F46E5]">18/20</span>
              <span className="text-xs text-[#94A3B8]">credits today</span>
            </div>
          </div>

          {/* ── Cell D — Export & Sync (2 cols, light) ── */}
          <div
            className={`md:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-8 flex flex-col gap-5 transition-all duration-700 delay-300 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Tag pill */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] w-fit">
              Export &amp; sync
            </span>

            <h3 className="text-xl font-bold text-[#0F172A]">
              Drop lists straight into your sequencer
            </h3>

            <p className="text-sm text-[#64748B] leading-relaxed">
              Export to CSV for Instantly, Smartlead, or Apollo — or push to HubSpot, Salesforce, or
              Pipedrive via native sync. Your team shares one Reveal History, so no contact is ever
              paid for twice.
            </p>

            {/* CRM integration buttons */}
            <div className="flex flex-wrap gap-3">
              {crms.map(crm => (
                <div
                  key={crm.name}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569]"
                >
                  {/* Brand-coloured dot */}
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: crm.color }}
                  />
                  {crm.name}
                </div>
              ))}
            </div>
          </div>

          {/* ── Cell E — Full-width dark banner (3 cols) ── */}
          <div
            className={`md:col-span-3 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-700 delay-400 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 60%, #1E1B4B 100%)',
            }}
          >
            <div>
              <p className="text-white font-bold text-lg">
                Everything your team reveals is shared and free to re-export.
              </p>
              <p className="text-sm text-[#94A3B8] mt-1">
                One Reveal History. No duplicate credits. Works across every plan.
              </p>
            </div>

            {/* Primary CTA button */}
            <a
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white hover:scale-[1.02] transition-all flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                boxShadow: '0 8px 30px rgba(79,70,229,0.25)',
              }}
            >
              Start revealing for free <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — "Built for" Persona Row
// ─────────────────────────────────────────────────────────────────────────────

// Three persona cards — one for each key buyer persona
const personas = [
  {
    tag: 'GTM Engineers',
    title: 'Your ICP list, built in 40 seconds',
    body: 'You already know your ICP runs HubSpot and has a VP Sales under 500 people. WarpLeads lets you say exactly that — 500+ tech filters plus 13 others. Hit export. Push to your CRM. Done.',
    featureTags: ['Tech stack filters', 'CRM sync', 'CSV export'],
  },
  {
    tag: 'Cold Email Agencies',
    title: "Your clients' domains stay clean",
    body: "You're responsible for your clients' sender reputations. VerifyFirst™ handles the validation before any credit is spent — sub-2% bounce rates across every campaign you run, for every client.",
    featureTags: ['VerifyFirst™', 'Verified-only credits', 'Unlimited plan'],
  },
  {
    tag: 'Email Marketers',
    title: 'Segments so tight they feel hand-picked',
    body: 'Department, management level, education, industry, company size — stack any combination. The CSV you export goes straight into your campaign tool with zero cleanup. What you see in the filter is what you get.',
    featureTags: ['14 filter dimensions', 'Saved searches', 'Lists'],
  },
];

function PersonaRow() {
  const { ref, visible } = useReveal(0.1);

  return (
    <section className="bg-white border-y border-[#E2E8F0] py-20 px-6">
      <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] text-center mb-12">
        Used by every outbound role on your team
      </h2>

      <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {personas.map((persona, i) => (
          <div
            key={persona.tag}
            className={`relative rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-7 flex flex-col gap-4 hover:border-[#C7D2FE] hover:shadow-md transition-all duration-500 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            {/* Corner accent — top-right gradient shape */}
            <div
              className="absolute top-0 right-0 w-16 h-16 rounded-bl-3xl rounded-tr-2xl opacity-40 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #EEF2FF, #C7D2FE)' }}
            />

            {/* Tag pill */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] w-fit relative z-10">
              {persona.tag}
            </span>

            <h3 className="text-base font-semibold text-[#0F172A]">{persona.title}</h3>
            <p className="text-sm text-[#64748B] leading-relaxed">{persona.body}</p>

            {/* Feature tags row */}
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {persona.featureTags.map(t => (
                <span
                  key={t}
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#64748B]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — How It Works
// ─────────────────────────────────────────────────────────────────────────────

// Three steps with outcome-first titles
const steps = [
  {
    title: 'Describe exactly who you want',
    body: 'You set 14 filters — job title, tech stack, company size, location, management level, and more. WarpLeads returns a real-time list of contacts that match every condition, not just one.',
  },
  {
    title: 'VerifyFirst™ clears them before you pay',
    body: 'You click Reveal. VerifyFirst™ runs syntax, MX, and mail server checks on the spot. You get a verified work email, personal email, and phone number — charged only after all three checks pass.',
  },
  {
    title: 'Your sequencer gets clean data',
    body: 'Export to CSV for any sequencer, or push directly to your CRM. Every contact in Reveal History is free to re-export forever — your whole team shares one clean, verified list.',
  },
];

function HowItWorks() {
  const { ref, visible } = useReveal(0.1);

  return (
    <section id="how-it-works" className="bg-[#020617] py-24 px-6">
      {/* Section header */}
      <div className="flex flex-col items-center mb-16">
        <Eyebrow text="How it works" dark />
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          From filters to inbox in three steps
        </h2>
        <p className="text-base text-[#64748B] text-center max-w-xl">
          No data science degree required. No bloated exports to clean.
          Just the contacts you actually want.
        </p>
      </div>

      {/* Step cards grid with gradient connector line */}
      <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">

        {/* Gradient horizontal connector — desktop only */}
        <div
          className="hidden md:block absolute top-5 z-0"
          style={{
            left: 'calc(16.5% + 28px)',
            right: 'calc(16.5% + 28px)',
            height: '1px',
            background:
              'linear-gradient(90deg, rgba(79,70,229,0.2), rgba(79,70,229,0.6), rgba(79,70,229,0.2))',
          }}
        />

        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex flex-col items-center text-center relative z-10 transition-all duration-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: `${i * 150}ms` }}
          >
            {/* Numbered circle */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ring-4 ring-[#1E1B4B]"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>

            {/* Step card */}
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 mt-4 text-left w-full">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4F46E5] mb-2">
                Step {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 8 — Testimonials
// ─────────────────────────────────────────────────────────────────────────────

// Three testimonials with specific numbers for credibility
const testimonials = [
  {
    initials: 'MR',
    quote:
      "Switched from Apollo to WarpLeads in March. First campaign had a 1.4% bounce rate — our previous one hit 22% and almost got our client's domain blacklisted. Not going back.",
    name: 'Marcus R.',
    role: 'Head of Growth · Series B SaaS',
    metric: '1.4% bounce rate',
  },
  {
    initials: 'SL',
    quote:
      "I manage outbound for 9 clients. The tech stack filter is the reason I'm here — no one else lets me say 'runs HubSpot, no Outreach yet, VP Sales in fintech under 200 people'. That's my list in 40 seconds.",
    name: 'Sofia L.',
    role: 'Founder · Cold Email Agency',
    metric: '9 clients managed',
  },
  {
    initials: 'AT',
    quote:
      'We were spending 3 days per week building prospect lists. Our GTM engineer automated the whole thing with WarpLeads CSV exports into our sequencer. That time is now spent on copy and testing.',
    name: 'Arjun T.',
    role: 'GTM Lead · PLG Startup',
    metric: '3 days → 2 hours',
  },
];

function Testimonials() {
  const { ref, visible } = useReveal(0.1);

  return (
    <section className="bg-white border-y border-[#E2E8F0] py-20 px-6">
      {/* Section header */}
      <div className="flex flex-col items-center mb-6">
        <Eyebrow text="What people say" />
        <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] text-center mb-4">
          Outbound teams that switched to verified data
        </h2>
      </div>

      {/* Social proof number bar — 3 aggregate stats above testimonial cards */}
      <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 py-5 border-y border-[#E2E8F0]">
        {[
          { n: '1,200+', label: 'outbound teams active' },
          { n: '48M+',   label: 'contacts revealed to date' },
          { n: '4.8',    label: 'average rating from users' },
        ].map(({ n, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span
              className="text-2xl font-extrabold bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            >
              {n}
            </span>
            <span className="text-xs text-[#94A3B8]">{label}</span>
          </div>
        ))}
      </div>

      {/* Testimonial cards */}
      <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className={`bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-7 flex flex-col gap-4 transition-all duration-500 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            {/* Metric pill — key stat above the quote */}
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] w-fit">
              {t.metric}
            </span>

            {/* Large decorative quote mark */}
            <span className="text-4xl text-[#C7D2FE] font-serif leading-none select-none">&quot;</span>

            {/* Quote text */}
            <p className="text-sm text-[#0F172A] leading-relaxed font-medium flex-1">
              &quot;{t.quote}&quot;
            </p>

            {/* Author row */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#E2E8F0]">
              {/* Initials avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              >
                {t.initials}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">{t.name}</p>
                <p className="text-xs text-[#94A3B8]">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 9 — FAQ
// ─────────────────────────────────────────────────────────────────────────────

// 4 FAQ items that address the most common pre-signup objections
const faqs = [
  {
    q: "What's the bounce rate on revealed emails?",
    a: 'Under 2% on average. Every email is validated against syntax rules, MX records, and mail server deliverability — before a single credit is spent. You only pay for contacts that pass every check.',
  },
  {
    q: 'Can I export directly to Instantly, Smartlead, or Apollo?',
    a: 'Yes — export any list as a CSV and import it into any sequencer. Native push to HubSpot, Salesforce, and Pipedrive is available on the Unlimited plan.',
  },
  {
    q: 'If I reveal a contact today, can my teammate export them tomorrow for free?',
    a: 'Yes. Revealed contacts live permanently in shared Reveal History. Anyone on the team re-exports, copies, or views them at no cost — credits only fire on net-new reveals.',
  },
  {
    q: 'How granular are the tech stack filters?',
    a: '500+ individual technologies across CRM, marketing automation, analytics, ad platforms, and infra. Combine with job title and company size to nail your exact ICP.',
  },
];

function FAQ() {
  // Index of the currently open FAQ item; null = all closed
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-[#F8FAFC] border-y border-[#E2E8F0] py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <Eyebrow text="FAQ" />
          <h2 className="text-3xl font-bold text-[#0F172A] text-center">
            Questions we hear before people sign up
          </h2>
        </div>

        {/* Accordion items */}
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-[#E2E8F0] last:border-0">
            {/* Question row — toggles on click */}
            <button
              onClick={() => setOpen(prev => prev === i ? null : i)}
              className="w-full flex justify-between items-center py-5 text-left group"
            >
              <span
                className={`text-sm font-semibold transition-colors ${
                  open === i
                    ? 'text-[#4F46E5]'
                    : 'text-[#0F172A] group-hover:text-[#4F46E5]'
                }`}
              >
                {faq.q}
              </span>
              {/* Chevron rotates 180° when open */}
              <ChevronDown
                size={16}
                className={`text-[#94A3B8] flex-shrink-0 transition-transform duration-200 ${
                  open === i ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Answer — max-h transition for smooth accordion */}
            <div
              className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                open === i ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <p className="text-sm text-[#64748B] leading-relaxed pb-5">{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 10 — Pricing
// ─────────────────────────────────────────────────────────────────────────────

// Four pricing tiers: Free / Starter / Growth (featured) / Scale
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
    highlight: true,  // gradient border dark card
    popular: true,
    cta: 'Start Growth',
    ctaStyle: '',  // white on dark
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
];

function Pricing() {
  const { ref, visible } = useReveal(0.1);

  return (
    <section id="pricing" className="bg-white py-24 px-6">
      {/* Section header */}
      <div className="flex flex-col items-center mb-4">
        <Eyebrow text="Pricing" />
        <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] text-center mb-3">
          Start free. Scale when you're ready.
        </h2>
        <p className="text-base text-[#64748B] text-center max-w-md mb-4">
          No trial periods. No hidden limits. Your free plan includes real, verified reveals every day.
        </p>

        {/* Price anchor — cost-of-bad-data framing */}
        <p className="text-xs text-[#94A3B8] text-center mb-10 max-w-lg">
          One blacklisted domain costs more to recover than a year of Unlimited.{' '}
          <span className="text-[#4F46E5] font-semibold">
            WarpLeads Unlimited is $49/mo — you only pay for contacts that pass validation.
          </span>
        </p>
      </div>

      {/* 4-column pricing grid */}
      <div ref={ref} className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {plans.map((plan, i) => {
          // Growth card uses the gradient-border dark variant
          if (plan.highlight) {
            return (
              <div
                key={plan.name}
                className={`p-px rounded-2xl relative transition-all duration-700 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  transitionDelay: `${i * 100}ms`,
                }}
              >
                {/* Most popular badge — floats above the card */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold text-white z-10"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                >
                  Most popular
                </div>

                {/* Dark inner card */}
                <div className="bg-[#1E1B4B] rounded-[15px] p-7 flex flex-col h-full">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#818CF8] mb-3">
                    Growth
                  </p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-white">$99</span>
                    <span className="text-sm text-[#818CF8] font-normal mb-1">/ mo</span>
                  </div>
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
            );
          }

          // Light cards — Free, Starter, Scale
          return (
            <div
              key={plan.name}
              className={`bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-7 flex flex-col transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
                {plan.name}
              </p>

              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold text-[#0F172A]">{plan.price}</span>
                <span className="text-sm text-[#94A3B8] font-normal mb-1">{plan.period}</span>
              </div>

              {/* Credit volume — key differentiator */}
              <div className="mt-2 mb-1">
                <span className="text-sm font-bold text-[#4F46E5]">{plan.credits}</span>
                <span className="text-xs text-[#94A3B8] ml-1">{plan.creditsNote}</span>
              </div>

              {/* Scale card — show 50× Apollo badge */}
              {plan.name === 'Scale' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] mt-1 w-fit">
                  50× more credits than Apollo at the same price
                </span>
              )}

              <hr className="border-[#E2E8F0] my-5" />

              <ul className="space-y-2.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#475569]">
                    <Check size={13} className="text-[#94A3B8] mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 11 — Final CTA
// ─────────────────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="bg-[#020617] relative overflow-hidden py-28">

      {/* Same background layers as Hero */}
      <div
        className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(99,102,241,0.3) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -left-64 top-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)',
        }}
      />
      <div
        className="absolute -right-64 top-32 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 60%)',
        }}
      />
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center px-6">

        {/* Gradient headline */}
        <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5 text-white">
          Your next campaign list{' '}
          <span className="bg-gradient-to-br from-white via-[#A5B4FC] to-[#818CF8] bg-clip-text text-transparent">
            is already built. Go get it.
          </span>
        </h2>

        <p className="text-lg text-[#64748B] max-w-md mx-auto mb-10">
          Sign up in 90 seconds. Your 20 free credits are waiting right now —
          they reset at midnight whether you use them or not.
        </p>

        {/* Primary CTA button */}
        <a
          href="/sign-up"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white hover:scale-[1.02] transition-all"
          style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            boxShadow: '0 8px 30px rgba(79,70,229,0.25)',
          }}
        >
          Claim my 20 free reveals <ArrowRight size={14} />
        </a>

        {/* Risk reversal block — three stacked micro-trust signals */}
        <div className="flex flex-col items-center gap-1 mt-5">
          <p className="text-xs text-[#334155]">
            No credit card required. Free plan stays free — no bait-and-switch.
          </p>
          <p className="text-xs text-[#334155]">
            Credits only spent on contacts that pass full email validation.
          </p>
          <p className="text-xs text-[#334155]">
            Cancel anytime in one click. No cancellation flow, no dark patterns.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 12 — Footer
// ─────────────────────────────────────────────────────────────────────────────
function Footer() {
  const footerNavLinks = ['Features', 'Pricing', 'FAQ', 'Sign in'];
  const legalLinks = ['Privacy', 'Terms', 'Contact'];

  return (
    <footer className="bg-[#020617] border-t border-[#1E293B] py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">

        {/* Left — logo + copyright */}
        <div className="flex flex-col items-center md:items-start gap-1">
          {/* Logo — mirrors Navbar */}
          <a href="#" className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}
            >
              <Zap size={12} className="text-white" />
            </span>
            <span className="font-bold text-white text-lg">Warp</span>
            <span className="font-bold text-[#818CF8] text-lg -ml-1">Leads</span>
          </a>
          <p className="text-xs text-[#334155]">© 2025 WarpLeads. All rights reserved.</p>
        </div>

        {/* Center — nav links (desktop only) */}
        <nav className="hidden md:flex gap-8">
          {footerNavLinks.map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right — legal links */}
        <div className="flex gap-6">
          {legalLinks.map(label => (
            <a
              key={label}
              href="#"
              className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — composes all sections in order
// ─────────────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* 0 — Navbar (fixed, z-50) */}
      <Navbar />

      {/* 1 — Hero */}
      <Hero />

      {/* 2 — Integration ticker */}
      <Ticker />

      {/* 3 — Stats bar */}
      <Stats />

      {/* 3b — Pricing comparison table */}
      <PricingComparison />

      {/* 4 — Problem → Solution bridge */}
      <ProblemBridge />

      {/* 5 — Bento feature grid */}
      <BentoFeatures />

      {/* 6 — Persona row */}
      <PersonaRow />

      {/* 7 — How it works */}
      <HowItWorks />

      {/* 8 — Testimonials */}
      <Testimonials />

      {/* 9 — FAQ accordion */}
      <FAQ />

      {/* 10 — Pricing cards */}
      <Pricing />

      {/* 11 — Final CTA */}
      <FinalCTA />

      {/* 12 — Footer */}
      <Footer />
    </div>
  );
}
