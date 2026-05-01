'use client';

// ── DocumentationView ─────────────────────────────────────────────────────────
// In-app documentation hub at /documentation.
//
// Layout:
//   - Full-width "Command Center" hero header with live search
//   - Two-column body: scrollable content (left) + sticky TOC (right, desktop only)
//   - Horizontal stepper for Quick Start
//   - Bento Grid for Feature Reference (icon cards, hover lift)
//   - Interactive accordion FAQ with thumbs-up/down helpfulness votes
//
// All sections have `id` anchors so the TOC links scroll-jump to them.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A feature card shown in the Bento Grid */
type FeatureCard = {
  /** Card title */
  title: string;
  /** Short description (1–2 sentences) */
  description: string;
  /** Accent colour used for the icon background tint */
  color: string;
  /** Icon component to render */
  icon: React.ReactNode;
  /** If true the card spans 2 columns on md+ screens */
  wide?: boolean;
  /** If set, forces this card to start at the given column on md+ (1-based). Used to centre cards in a row. */
  colStartMd?: number;
};

/** A documentation section group in the Bento Grid */
type BentoSection = {
  /** Rendered section ID for anchor links */
  id: string;
  /** Section heading */
  title: string;
  /** Cards within this group */
  cards: FeatureCard[];
};

/** A step in the Quick Start horizontal stepper */
type QuickStep = {
  step: number;
  title: string;
  body: string;
  /** Short emoji label shown on the thumbnail placeholder */
  emoji: string;
};

/** A single FAQ entry */
type FaqEntry = {
  question: string;
  answer: string;
};

// ── Icon components ────────────────────────────────────────────────────────────
// 20×20 Lucide-style stroke SVGs — slightly larger than nav icons for cards.

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="18" height="20" rx="1" /><path d="M9 22V12h6v10" /><path d="M9 7h1" /><path d="M14 7h1" /><path d="M9 12h1" /><path d="M14 12h1" />
    </svg>
  );
}
function IconChip() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="6" height="6" /><path d="M15 9V5h-2M9 9V5h2M9 15v4h2M15 15v4h-2M9 9H5v2M9 15H5v-2M15 9h4v2M15 15h4v-2" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function IconGradCap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconList() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconPlug() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function IconCreditCard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconChevronUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

// ── Quick Start data ───────────────────────────────────────────────────────────

const QUICK_STEPS: QuickStep[] = [
  {
    step: 1,
    emoji: '✉️',
    title: 'Create your account',
    body: 'Sign up with your work email. You get 20 free credits per day immediately — no credit card required.',
  },
  {
    step: 2,
    emoji: '🔍',
    title: 'Search for leads',
    body: 'Use the Filters panel to narrow by job title, location, industry, tech stack, company size, and more.',
  },
  {
    step: 3,
    emoji: '📧',
    title: 'Reveal contacts',
    body: 'Select leads and click Reveal. Each reveal costs 1 credit. Already-revealed contacts are always free.',
  },
  {
    step: 4,
    emoji: '📤',
    title: 'Export or save',
    body: 'Export to CSV for your CRM, or add leads to a named List for targeted follow-up campaigns.',
  },
];

// ── Bento Grid data ────────────────────────────────────────────────────────────

const BENTO_SECTIONS: BentoSection[] = [
  {
    id: 'search-filters',
    title: 'Search & Filters',
    cards: [
      // ── Row 1: Job Title, Location, Industry, Technology Stack (all normal width) ──
      {
        title: 'Job Title',
        description: 'Partial-match keyword search — finds "VP of Sales", "Senior Engineer", or any role fragment.',
        color: '#ede9fe',
        icon: <IconBriefcase />,
      },
      {
        title: 'Location',
        description: 'Filter by city, state, or country. Stack multiple locations to widen your search.',
        color: '#dbeafe',
        icon: <IconGlobe />,
      },
      {
        title: 'Industry',
        description: '20+ categories including Technology, Finance, Healthcare, and Education.',
        color: '#dcfce7',
        icon: <IconBuilding />,
      },
      {
        // Moved from row 2; wide removed so it matches the other cards in this row
        title: 'Technology Stack',
        description: 'Target companies that actively use Salesforce, React, AWS, HubSpot, and 500+ other tools.',
        color: '#fef3c7',
        icon: <IconChip />,
      },
      // ── Row 2: Management Level, Company Size, Department (2-col wide) ──────────
      {
        title: 'Management Level',
        description: 'C-Level, VP, Director, Manager, or Individual Contributor — zero in on decision-makers.',
        color: '#fee2e2',
        icon: <IconUsers />,
      },
      {
        title: 'Company Size',
        description: 'Headcount buckets: 1–10, 11–50, 51–200, 201–500, 500+.',
        color: '#f3e8ff',
        icon: <IconBarChart />,
      },
      {
        // Moved up; made wide (2 cols) to fill the remaining 2 columns in row 2
        title: 'Department',
        description: 'Engineering, Sales, Marketing, HR, Operations — scope to the function that matters.',
        color: '#e0f2fe',
        icon: <IconTag />,
        wide: true,
      },
      // ── Row 3: Skills + Education centred (col-start-2 pushes them to middle) ──
      {
        title: 'Skills',
        description: 'Filter by specific professional skills listed on public profiles.',
        color: '#fce7f3',
        icon: <IconZap />,
        // Skills spans 2 cols so it reads as a prominent filter alongside Education
        wide: true,
      },
      {
        title: 'Education',
        description: 'Target by academic major or degree level for highly specific audiences.',
        color: '#dcfce7',
        icon: <IconGradCap />,
      },
      // ── Row 4: Saved Searches (single col) ───────────────────────────────────
      {
        title: 'Saved Searches',
        description: 'Save any filter combination and re-run it in one click from the Filter Actions menu.',
        color: '#fef9c3',
        icon: <IconSearch />,
        // No wide — single card width
      },
    ],
  },
  {
    id: 'contacts-export',
    title: 'Contacts & Export',
    cards: [
      {
        title: 'Reveal Contacts',
        description: 'Unlock verified email and phone for any lead. Free: 20 credits/day. Pro: unlimited.',
        color: '#ede9fe',
        icon: <IconEye />,
        wide: true,
      },
      {
        title: 'Export to CSV',
        description: 'Export selected leads. Free: 20/day. Pro: up to 25,000 leads per export.',
        color: '#dbeafe',
        icon: <IconDownload />,
      },
      {
        title: 'Leads Lists',
        description: 'Organise leads into named lists for targeted campaigns. Add, rename, or delete anytime.',
        color: '#dcfce7',
        icon: <IconList />,
      },
      {
        title: 'Favourites',
        description: 'Star individual leads for quick personal bookmarking and one-click access.',
        color: '#fee2e2',
        icon: <IconHeart />,
      },
      {
        title: 'CSV Import',
        description: 'Upload your own contact list. Map columns to WarpLeads fields and enrich missing data.',
        color: '#fef3c7',
        icon: <IconUpload />,
      },
    ],
  },
  {
    id: 'integrations-billing',
    title: 'Integrations & Billing',
    cards: [
      {
        title: 'CRM & Zapier',
        description: 'Native integrations with Salesforce, HubSpot, and Pipedrive. Zapier for 1,000+ other apps.',
        color: '#dbeafe',
        icon: <IconPlug />,
        wide: true,
      },
      {
        title: 'Billing & Plans',
        description: 'Free: 20 reveals/day. Pro: unlimited reveals, 25k exports/month, priority access.',
        color: '#dcfce7',
        icon: <IconCreditCard />,
        wide: true,
      },
    ],
  },
];

// ── FAQ data ───────────────────────────────────────────────────────────────────

const FAQ: FaqEntry[] = [
  {
    question: 'How accurate is the contact data?',
    answer: 'WarpLeads uses a multi-source verification pipeline. Emails are validated for syntax, MX records, and deliverability. Phone numbers are carrier-validated. We publish a rolling 30-day deliverability rate on the Status page.',
  },
  {
    question: 'Do credits roll over to the next day?',
    answer: 'No. Free-plan credits reset to 20 every day at midnight UTC and do not accumulate. Unused credits expire at the end of each day.',
  },
  {
    question: 'I already revealed a contact — will I be charged again?',
    answer: 'No. Once a contact is revealed, their details are stored in your account permanently. Re-exporting or re-viewing the same contact is always free regardless of your plan.',
  },
  {
    question: 'Can I share lists with teammates?',
    answer: 'List sharing is available on the Team plan. Add members in Team Management and assign view or edit access to any of your lists.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer: 'Go to Account / Billing and click "Cancel Plan". Access continues until the end of the current billing period. We do not offer pro-rated refunds for partial months.',
  },
  {
    question: 'What CSV format should I upload for imports?',
    answer: 'Standard UTF-8 encoded CSV with a header row. Any column order is supported — you map columns to WarpLeads fields after upload. Maximum file size is 50 MB.',
  },
  {
    question: 'Is there a REST API?',
    answer: 'Yes. A REST API is available on the Pro plan. Generate your API key in Settings → API Keys. The full API reference is in the documentation above.',
  },
];

// ── TOC sections ───────────────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'search-filters', label: 'Search & Filters' },
  { id: 'contacts-export', label: 'Contacts & Export' },
  { id: 'integrations-billing', label: 'Integrations & Billing' },
  { id: 'faq', label: 'FAQ' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

/**
 * Horizontal Quick Start stepper.
 * Shows 4 step cards in a row with a connector line between them.
 * Each card has an emoji thumbnail placeholder with a "Watch" play hint.
 *
 * @param steps - Ordered array of step data.
 */
function QuickStartStepper(props: { steps: QuickStep[] }) {
  return (
    // Outer container: relative so the connector line can be absolutely positioned
    <div className="relative">

      {/* ── Connector line across the top of the step number circles ───────── */}
      {/* Sits at 28px from top (center of the 56px emoji box) and spans
          from the second to the last card to connect them */}
      <div
        className="absolute left-[calc(12.5%+16px)] right-[calc(12.5%+16px)] top-[27px] h-px bg-[var(--color-border)]"
        aria-hidden="true"
      />

      {/* Step cards in a row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {props.steps.map(step => (
          <div
            key={step.step}
            className="flex flex-col items-center text-center"
          >
            {/* ── Emoji thumbnail with step number badge ──────────────────── */}
            <div className="relative mb-3">

              {/* Thumbnail box — light surface, rounded, shows the emoji */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                {step.emoji}
              </div>

              {/* Step number circle — overlapping top-right corner */}
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand)] text-[10px] font-bold text-white shadow">
                {step.step}
              </span>
            </div>

            {/* Title */}
            <p className="mb-1 text-xs font-semibold text-[var(--color-text-primary)]">
              {step.title}
            </p>

            {/* Body */}
            <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders a single Bento card with icon, title, description, and hover lift.
 *
 * @param card - The FeatureCard data to render.
 */
function BentoCard(props: { card: FeatureCard }) {
  const { card } = props;
  return (
    // Card: light tint bg so cards stand out against the white page background
    <div
      className={[
        'group rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
        // Wide cards span 2 columns on md+
        card.wide ? 'md:col-span-2' : '',
        // colStartMd forces the card to start at a specific grid column on md+ (centres pairs etc.)
        card.colStartMd ? `md:col-start-${card.colStartMd}` : '',
      ].join(' ')}
    >
      {/* Icon tinted circle — background uses the card's accent colour;
          icon uses a darkened version of that colour for readable contrast */}
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: card.color }}
      >
        {/* Icon colour is derived by mixing the card tint toward black (60% opacity) */}
        <span style={{ opacity: 0.75 }} className="text-[var(--color-text-primary)]">
          {card.icon}
        </span>
      </div>

      {/* Title */}
      <p className="mb-1 text-xs font-semibold text-[var(--color-text-primary)]">
        {card.title}
      </p>

      {/* Description */}
      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        {card.description}
      </p>
    </div>
  );
}

/**
 * Renders one accordion FAQ item with smooth expand/collapse.
 * Shows a "Was this helpful?" vote row after the answer is expanded.
 *
 * @param entry - FAQ question and answer.
 * @param isOpen - Whether this item is currently expanded.
 * @param onToggle - Called when the header is clicked.
 */
function AccordionItem(props: {
  entry: FaqEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { entry, isOpen, onToggle } = props;

  // Tracks per-item vote: null = not voted, 'up' = helpful, 'down' = not helpful
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]"> {/* Light tint bg so accordion items stand out on the white page */}

      {/* ── Accordion header ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-[#F3F4F6]"
      >
        {/* Question text */}
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          {entry.question}
        </span>

        {/* Chevron flips when open */}
        <span className="shrink-0 text-[var(--color-text-muted)] transition-transform duration-200">
          {isOpen ? <IconChevronUp /> : <IconChevronDown />}
        </span>
      </button>

      {/* ── Expandable answer panel ───────────────────────────────────────── */}
      {/* Height transitions via max-height trick — CSS grid trick gives smooth animation */}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#E5E7EB] px-5 pb-4 pt-3">

            {/* Answer body */}
            <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              {entry.answer}
            </p>

            {/* ── Helpfulness vote row ──────────────────────────────────── */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Was this helpful?
              </span>

              {/* Thumbs up */}
              <button
                type="button"
                onClick={() => setVote(v => v === 'up' ? null : 'up')}
                className={[
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors duration-150',
                  vote === 'up'
                    ? 'bg-[#dcfce7] text-[var(--color-success)]'
                    : 'bg-[#F3F4F6] text-[var(--color-text-muted)] hover:bg-[#dcfce7] hover:text-[var(--color-success)]',
                ].join(' ')}
              >
                👍 Yes
              </button>

              {/* Thumbs down */}
              <button
                type="button"
                onClick={() => setVote(v => v === 'down' ? null : 'down')}
                className={[
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors duration-150',
                  vote === 'down'
                    ? 'bg-[#fee2e2] text-[var(--color-error)]'
                    : 'bg-[#F3F4F6] text-[var(--color-text-muted)] hover:bg-[#fee2e2] hover:text-[var(--color-error)]',
                ].join(' ')}
              >
                👎 No
              </button>

              {/* Thank-you confirmation — shown only when voted */}
              {vote && (
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  Thanks for your feedback!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sticky floating Table of Contents for desktop.
 * Highlights the section currently in the viewport.
 *
 * @param activeId - The section ID currently in view.
 * @param onNavigate - Called with the target section ID when a link is clicked.
 */
function TableOfContents(props: {
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    // Sticky: top-[72px] = below 56px topbar + 16px gap; self-start = no stretch; lg:block
    <div className="sticky top-[72px] hidden w-44 shrink-0 self-start lg:block">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        On this page
      </p>

      {/* TOC links */}
      <nav className="flex flex-col gap-1">
        {TOC_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => props.onNavigate(item.id)}
            className={[
              'w-full rounded-lg px-3 py-1.5 text-left text-[11px] font-medium transition-colors duration-150',
              props.activeId === item.id
                // Active: brand tint bg + brand text
                ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                : 'text-[var(--color-text-muted)] hover:bg-[#F3F4F6] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {/* Tiny active indicator dot */}
            {props.activeId === item.id && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
            )}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Documentation hub with:
 *   - Command-center hero search bar
 *   - Horizontal Quick Start stepper
 *   - Bento Grid feature reference (hover-lift cards with icons)
 *   - Interactive accordion FAQ with helpfulness votes
 *   - Sticky floating Table of Contents (desktop only)
 */
export function DocumentationView() {
  // ── Search state ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');

  // ── FAQ accordion — only one item open at a time ──────────────────────────
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ── TOC active section tracking ───────────────────────────────────────────
  // Defaults to quick-start; updated by IntersectionObserver as user scrolls
  const [activeSection, setActiveSection] = useState('quick-start');

  // Ref map used to register section elements for IntersectionObserver
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Register section element into the ref map
  const registerSection = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  // ── IntersectionObserver — tracks which section is in viewport ─────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        // Pick the first visible section as active
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      // Trigger when section top crosses 30% from the top
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );

    // Observe each registered section element
    for (const el of Object.values(sectionRefs.current)) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  // ── TOC smooth scroll ─────────────────────────────────────────────────────
  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      // 80px offset accounts for the fixed topbar (56px) + small gap
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // ── Search highlight — filters FAQ and section titles ─────────────────────
  // Returns true if the text loosely matches the search query
  const matches = useCallback(
    (text: string) => text.toLowerCase().includes(query.toLowerCase()),
    [query],
  );

  // ── Filtered FAQ entries based on search query ────────────────────────────
  const filteredFaq = query
    ? FAQ.filter(e => matches(e.question) || matches(e.answer))
    : FAQ;

  // ── Filtered bento sections based on search query ─────────────────────────
  // When searching: only show sections that have at least one matching card
  const filteredBento = query
    ? BENTO_SECTIONS.map(s => ({
        ...s,
        cards: s.cards.filter(c => matches(c.title) || matches(c.description)),
      })).filter(s => s.cards.length > 0 || matches(s.title))
    : BENTO_SECTIONS;

  return (
    // Outer shell — plain white background; cards use a light tint to pop
    <div className="min-h-screen bg-white">

      {/* ── Command-center hero header ──────────────────────────────────────── */}
      {/* Plain white surface with a bottom border — no coloured background tint */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-10 text-center">
        <h1 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
          Documentation
        </h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Everything you need to get the most out of WarpLeads.
        </p>

        {/* ── Search bar — Cmd+K style ─────────────────────────────────── */}
        <div className="relative mx-auto max-w-xl">

          {/* Magnifying glass icon inside the input */}
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            <IconSearch />
          </span>

          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='How do I…? Search filters, billing, integrations…'
            className="w-full rounded-2xl border border-[#D1D5DB] bg-[#F9FAFB] py-3 pl-11 pr-24 text-sm text-[var(--color-text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] placeholder:text-[var(--color-text-muted)] focus:border-[#9CA3AF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5E7EB]"
          />

          {/* Kbd hint — hidden when user is typing */}
          {!query && (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-[#E5E7EB] bg-[#F3F4F6] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
              ⌘K
            </span>
          )}

          {/* Clear button — shown when there is a query */}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Quick result count hint when searching */}
        {query && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Showing results for &ldquo;<span className="font-medium text-[var(--color-text-primary)]">{query}</span>&rdquo;
          </p>
        )}
      </div>

      {/* ── Body: content column + sticky TOC ──────────────────────────────────── */}
      <div className="mx-auto flex max-w-5xl gap-8 px-6 py-8">

        {/* ── Main content column ─────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">

          {/* ── Quick Start section ──────────────────────────────────────── */}
          {/* Hidden when searching — search focuses on feature cards and FAQ */}
          {!query && (
            <section
              id="quick-start"
              ref={registerSection('quick-start')}
              className="mb-10"
            >
              {/* Section label */}
              <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                Quick Start
              </h2>

              {/* Stepper component */}
              <QuickStartStepper steps={QUICK_STEPS} />
            </section>
          )}

          {/* ── Feature Reference (Bento Grid) ───────────────────────────── */}
          {filteredBento.length > 0
            ? filteredBento.map(section => (
                <section
                  key={section.id}
                  id={section.id}
                  ref={registerSection(section.id)}
                  className="mb-10"
                >
                  {/* Section label */}
                  <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                    {section.title}
                  </h2>

                  {/* Bento grid — 2 cols on mobile, 4 cols on md+ */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {section.cards.map(card => (
                      <BentoCard key={card.title} card={card} />
                    ))}
                  </div>
                </section>
              ))
            : query && (
                // No feature results found state
                <div className="mb-10 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] py-12 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">No feature results found.</p>
                </div>
              )}

          {/* ── FAQ section (accordion) ──────────────────────────────────── */}
          <section
            id="faq"
            ref={registerSection('faq')}
            className="mb-10"
          >
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Frequently Asked Questions
            </h2>

            {filteredFaq.length > 0
              ? (
                  <div className="flex flex-col gap-2">
                    {filteredFaq.map((entry, i) => (
                      <AccordionItem
                        key={i}
                        entry={entry}
                        isOpen={openFaq === i}
                        onToggle={() => setOpenFaq(prev => prev === i ? null : i)}
                      />
                    ))}
                  </div>
                )
              : (
                  // No FAQ results
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] py-10 text-center">
                    <p className="text-sm text-[var(--color-text-muted)]">No FAQ results found.</p>
                  </div>
                )}
          </section>

          {/* ── Footer links ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--color-text-muted)]">
            <span>Still need help?</span>
            <a href="/feedback" className="font-medium text-[var(--color-brand)] hover:underline">
              Send feedback
            </a>
            <a href="/whats-new" className="font-medium text-[var(--color-brand)] hover:underline">
              What&apos;s New
            </a>
          </div>
        </div>

        {/* ── Sticky Table of Contents (xl+ only) ────────────────────────── */}
        {/* Always rendered — stays fixed at top-right while scrolling.
            Active section is highlighted even when the user is in search mode. */}
        <TableOfContents
          activeId={activeSection}
          onNavigate={scrollToSection}
        />
      </div>
    </div>
  );
}
