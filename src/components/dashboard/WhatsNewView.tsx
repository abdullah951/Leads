'use client';

// ── WhatsNewView ──────────────────────────────────────────────────────────────
// Editorial changelog page at /whats-new.
//
// Layout:
//   - Two-column body: left timeline + right sticky version navigator
//   - Latest release → Hero card with gradient bg, large typography, "Try it now"
//   - Older releases → compact timeline cards connected by a vertical line
//     grouped v1.3.x collapsed into "Archive" section
//   - Each card: type badge (gradient pill), emoji reactions row, "Show me how" link
//   - Major releases trigger a one-time CSS confetti burst on mount
//
// Category badges:
//   major       — purple→blue gradient  🚀
//   feature     — brand blue            ✨
//   fix         — amber/grey            🛠
//   improvement — green                 ⚡
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/constants/apiRoutes';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Controls the badge style and icon for a release. */
type ReleaseType = 'major' | 'feature' | 'fix' | 'improvement';

/** A single change entry within a release */
type ChangeEntry = {
  category: string;
  description: string;
};

/** A full release record */
type Release = {
  version: string;
  date: string;
  type: ReleaseType;
  headline: string;
  changes: ChangeEntry[];
  /** App route the "Show me how" button links to */
  showMeHref?: string;
};

// ── Badge definitions ─────────────────────────────────────────────────────────

type BadgeDef = {
  /** Rendered in the badge */
  emoji: string;
  /** Human label */
  label: string;
  /** Inline style for the gradient/solid pill */
  style: React.CSSProperties;
  /** Text colour class */
  textClass: string;
};

const BADGE: Record<ReleaseType, BadgeDef> = {
  major: {
    emoji: '🚀',
    label: 'Major Release',
    // Purple → brand blue gradient — premium signal
    style: { background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #2563eb 100%)' },
    textClass: 'text-white',
  },
  feature: {
    emoji: '✨',
    label: 'New Feature',
    style: { background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)' },
    textClass: 'text-white',
  },
  fix: {
    emoji: '🛠',
    label: 'Bug Fix',
    style: { background: '#F3F4F6', border: '1px solid #E5E7EB' },
    textClass: 'text-[#6B7280]',
  },
  improvement: {
    emoji: '⚡',
    label: 'Improvement',
    style: { background: '#dcfce7', border: '1px solid #bbf7d0' },
    textClass: 'text-[#15803d]',
  },
};

// ── Emoji reaction definitions ────────────────────────────────────────────────

const REACTIONS = ['❤️', '🚀', '👍'] as const;

// ── Release data ──────────────────────────────────────────────────────────────
// Index 0 = latest hero. index 1 onwards = timeline archive.

const RELEASES: Release[] = [
  {
    version: '1.4.0',
    date: 'March 14, 2026',
    type: 'major',
    headline: 'Credit-aware upsell system & copy-to-clipboard contacts',
    showMeHref: '/dashboard',
    changes: [
      {
        category: 'Credits',
        description:
          'Introduced a credit-aware upsell modal that shows exactly how many credits you have vs. how many you need — with a visual progress bar and a "proceed with available N" fallback.',
      },
      {
        category: 'Contacts',
        description:
          'Revealed emails and phone numbers in the leads table now have a one-click copy-to-clipboard button with an animated "Copied!" confirmation tooltip.',
      },
      {
        category: 'Export',
        description:
          'Export, Add to List, and Favourites actions now gate on real credit balance instead of a fixed batch limit.',
      },
      {
        category: 'Leads Lists',
        description:
          'Empty lists now show a context-aware state with quick-action buttons to find or import leads directly.',
      },
      {
        category: 'UI',
        description:
          'Consistent inner-column layout applied across Export Jobs, Reveal History, and Uploaded Files pages.',
      },
    ],
  },
  {
    version: '1.3.2',
    date: 'March 7, 2026',
    type: 'fix',
    headline: 'Reveal History pagination and layout fixes',
    showMeHref: '/reveal-history',
    changes: [
      {
        category: 'Reveal History',
        description:
          'Fixed double left-margin caused by layout offset being applied twice.',
      },
      {
        category: 'Reveal History',
        description:
          'Pagination controls now appear inside the content column.',
      },
      {
        category: 'Export Jobs',
        description: 'Fixed "Clear All" button showing when there are no jobs to clear.',
      },
    ],
  },
  {
    version: '1.3.0',
    date: 'February 28, 2026',
    type: 'feature',
    headline: 'Export Jobs: Clear All + background CSV export',
    showMeHref: '/export-jobs',
    changes: [
      {
        category: 'Export Jobs',
        description:
          'Added a "Clear All" button that deletes all export jobs from the database and removes associated files from storage.',
      },
      {
        category: 'Export Jobs',
        description:
          'Large exports (>500 leads) are now processed as background jobs — shows a download link when ready.',
      },
      {
        category: 'API',
        description: 'New POST /api/export-jobs/delete-all endpoint.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: 'February 14, 2026',
    type: 'feature',
    headline: 'Uploaded Files — CSV import with column mapping',
    showMeHref: '/uploaded-files',
    changes: [
      {
        category: 'Uploaded Files',
        description:
          'Upload a CSV and map its columns to WarpLeads fields before importing.',
      },
      {
        category: 'Uploaded Files',
        description: 'File list shows upload date, row count, and a delete action.',
      },
      {
        category: 'Navigation',
        description: 'Uploaded Files and Reveal History added to the left nav rail.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: 'January 31, 2026',
    type: 'feature',
    headline: 'Leads Lists, Favourites & Reveal History',
    showMeHref: '/leads-lists',
    changes: [
      {
        category: 'Leads Lists',
        description: 'Create named lists, add/remove leads, rename and delete lists.',
      },
      {
        category: 'Favourites',
        description: 'Star individual leads to save them for quick access.',
      },
      {
        category: 'Reveal History',
        description: 'Chronological log of every contact revealed, with search and export.',
      },
      {
        category: 'Credits',
        description: 'Credits counter updates in real time after each reveal.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: 'January 15, 2026',
    type: 'major',
    headline: 'WarpLeads launches — search, reveal & export 25 M+ contacts',
    showMeHref: '/dashboard',
    changes: [
      {
        category: 'Search',
        description: 'Lead search with 10 filter dimensions: job title, location, industry, tech, skills, management, department, company size, education, and name.',
      },
      {
        category: 'Reveal',
        description: 'Verify email and phone for any lead. Free: 20 credits/day. Pro: unlimited.',
      },
      {
        category: 'Export',
        description: 'Export leads to CSV. Free: 20/day. Pro: 25,000/month.',
      },
      {
        category: 'Billing',
        description: 'Stripe-powered subscription checkout with Pro upgrade flow.',
      },
    ],
  },
];

// ── Confetti particle ─────────────────────────────────────────────────────────

/** Shape of a single confetti particle used by the burst animation */
type ConfettiParticle = {
  id: number;
  /** Left start position as vw percentage */
  x: number;
  /** Horizontal drift in px */
  dx: number;
  /** Final Y travel in px */
  dy: number;
  /** Rotation in degrees */
  rotate: number;
  /** Animation duration in seconds */
  duration: number;
  /** Hue for the particle colour */
  hue: number;
  /** Particle width in px */
  size: number;
};

/**
 * Generates an array of random confetti particles for the burst effect.
 * Called once on mount for major releases.
 *
 * @param count - Number of particles to generate.
 * @returns Array of ConfettiParticle objects.
 */
function generateConfetti(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    // Start spread across 60–80% of the viewport width (above the hero card)
    x: 20 + Math.random() * 60,
    // Horizontal drift: ±80px from start position
    dx: (Math.random() - 0.5) * 160,
    // Fall 300–600px downward
    dy: 300 + Math.random() * 300,
    // Spin 180–720 degrees
    rotate: 180 + Math.random() * 540,
    // Fall over 1.5–3 seconds
    duration: 1.5 + Math.random() * 1.5,
    // Mix of brand blues, purples, greens, and yellows
    hue: [220, 260, 140, 50, 200][Math.floor(Math.random() * 5)] as number,
    size: 6 + Math.random() * 6,
  }));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/**
 * Gradient/solid type badge with emoji prefix.
 *
 * @param type - Release type key.
 */
function TypeBadge(props: { type: ReleaseType }) {
  const def = BADGE[props.type];
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold',
        def.textClass,
      ].join(' ')}
      style={def.style}
    >
      {def.emoji} {def.label}
    </span>
  );
}

// ── useReactions hook ─────────────────────────────────────────────────────────

/**
 * Fetches reaction counts and the current user's reactions for all versions,
 * and exposes a toggle function that calls the API and optimistically updates state.
 *
 * @param versions - Array of release version strings to load reactions for.
 * @returns counts, mine, and a toggle function.
 */
function useReactions(versions: string[]) {
  // counts[version][emoji] = total reaction count from DB
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});
  // mine[version] = array of emoji strings the current user has reacted with
  const [mine, setMine] = useState<Record<string, string[]>>({});
  // Which (version+emoji) pairs are mid-flight — prevents double-clicks
  const [pending, setPending] = useState<Set<string>>(new Set());

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (versions.length === 0) return;
    fetch(API_ROUTES.releaseReactions.list, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versions }),
    })
      .then(r => r.json())
      .then((data: { counts: typeof counts; mine: typeof mine }) => {
        setCounts(data.counts ?? {});
        setMine(data.mine ?? {});
      })
      .catch(() => {
        // Silently fail — reactions are non-critical; counts stay at 0
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount; versions list is stable

  // ── Toggle handler ─────────────────────────────────────────────────────────
  const toggle = useCallback(async (version: string, emoji: string) => {
    const key = `${version}:${emoji}`;
    // Prevent concurrent requests for the same (version, emoji)
    if (pending.has(key)) return;

    // ── Optimistic update ────────────────────────────────────────────────────
    const wasReacted = mine[version]?.includes(emoji) ?? false;

    setMine(prev => {
      const prevList = prev[version] ?? [];
      return {
        ...prev,
        [version]: wasReacted
          ? prevList.filter(e => e !== emoji)           // un-react
          : [...prevList, emoji],                        // react
      };
    });

    setCounts(prev => {
      const prevCount = prev[version]?.[emoji] ?? 0;
      return {
        ...prev,
        [version]: {
          ...(prev[version] ?? {}),
          [emoji]: Math.max(0, prevCount + (wasReacted ? -1 : 1)),
        },
      };
    });

    // ── API call ─────────────────────────────────────────────────────────────
    setPending(prev => new Set(prev).add(key));
    try {
      const res = await fetch(API_ROUTES.releaseReactions.toggle, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, emoji }),
      });

      if (res.ok) {
        // Replace optimistic count with authoritative server value
        const data = await res.json() as { count: number; userReacted: boolean };
        setCounts(prev => ({
          ...prev,
          [version]: { ...(prev[version] ?? {}), [emoji]: data.count },
        }));
        setMine(prev => {
          const prevList = (prev[version] ?? []).filter(e => e !== emoji);
          return {
            ...prev,
            [version]: data.userReacted ? [...prevList, emoji] : prevList,
          };
        });
      } else {
        // Revert optimistic update on failure
        setMine(prev => {
          const prevList = prev[version] ?? [];
          return {
            ...prev,
            [version]: wasReacted
              ? [...prevList, emoji]                     // restore the removed emoji
              : prevList.filter(e => e !== emoji),       // remove the added emoji
          };
        });
        setCounts(prev => {
          const current = prev[version]?.[emoji] ?? 0;
          return {
            ...prev,
            [version]: {
              ...(prev[version] ?? {}),
              [emoji]: Math.max(0, current + (wasReacted ? 1 : -1)),
            },
          };
        });
      }
    } catch {
      // Network error — optimistic state stays (acceptable for non-critical feature)
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [mine, pending]);

  return { counts, mine, toggle };
}

// ── ReactionRow ───────────────────────────────────────────────────────────────

/**
 * Emoji reaction row for a single release card.
 * Receives live counts and user state from the parent's useReactions hook.
 *
 * @param version - The release version this row belongs to.
 * @param counts - Map of emoji → total count for this version.
 * @param mine - Array of emoji strings the current user has reacted with.
 * @param onToggle - Called with (version, emoji) when the user clicks a reaction.
 * @param variant - 'dark' renders white-tinted buttons (for the gradient hero card).
 */
function ReactionRow(props: {
  version: string;
  counts: Record<string, number>;
  mine: string[];
  onToggle: (version: string, emoji: string) => void;
  variant?: 'light' | 'dark';
}) {
  const { version, counts, mine, onToggle, variant = 'light' } = props;

  return (
    <div className={[
      'flex items-center gap-2',
      variant === 'dark'
        ? 'border-t border-white/20 pt-4 mt-5'
        : 'border-t border-[#E5E7EB] pt-3 mt-4',
    ].join(' ')}>
      <span className={[
        'mr-1 text-[10px]',
        variant === 'dark' ? 'text-white/50' : 'text-[#9CA3AF]',
      ].join(' ')}>
        Reactions
      </span>

      {REACTIONS.map(r => {
        const reacted = mine.includes(r);
        const count = counts[r] ?? 0;

        return (
          <button
            key={r}
            type="button"
            onClick={() => onToggle(version, r)}
            className={[
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
              variant === 'dark'
                // On gradient hero: white-tinted glass style
                ? reacted
                  ? 'scale-105 bg-white/30 text-white'
                  : 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25'
                // On white card: brand-light style
                : reacted
                  ? 'scale-105 bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                  : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[var(--color-brand-light)] hover:text-[var(--color-brand)]',
            ].join(' ')}
          >
            {r} {count}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Confetti burst overlay — renders animated particles above the hero card.
 * Only shown once (on mount) for major releases.
 *
 * @param particles - Pre-generated confetti particle array.
 */
function ConfettiBurst(props: { particles: ConfettiParticle[] }) {
  return (
    // Absolutely positioned, pointer-events-none so it doesn't block card interaction
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {props.particles.map(p => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: `hsl(${p.hue}, 80%, 60%)`,
            // CSS custom properties fed into the keyframe below
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rotate' as string]: `${p.rotate}deg`,
            animation: `confetti-fall ${p.duration}s ease-in forwards`,
          }}
        />
      ))}

      {/* Keyframe definition — inline to avoid polluting global.css */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateX(0) translateY(-20px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(var(--dx)) translateY(var(--dy)) rotate(var(--rotate)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/** Shared reaction props threaded from the useReactions hook down into each card */
type ReactionProps = {
  counts: Record<string, number>;
  mine: string[];
  onToggle: (version: string, emoji: string) => void;
};

/**
 * Hero card for the latest (index 0) release.
 * Features: gradient background, large editorial headline, "Try it now" CTA,
 * optional confetti burst, and DB-backed reaction row.
 *
 * @param release - The most-recent release object.
 * @param reactions - Live reaction data from the useReactions hook.
 */
function HeroCard(props: { release: Release; reactions: ReactionProps }) {
  const { release, reactions } = props;
  const router = useRouter();

  // Generate confetti once on mount for major releases — stored in ref so it
  // doesn't regenerate on re-renders (stable particles)
  const confettiRef = useRef<ConfettiParticle[] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Only burst confetti for major releases, and only once per page load
    if (release.type === 'major') {
      confettiRef.current = generateConfetti(60);
      setShowConfetti(true);
      // Remove particles from DOM after longest possible animation (3s) + buffer
      const t = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(t);
    }
    // Non-major releases: no confetti, nothing to clean up
    return undefined;
  }, [release.type]);

  return (
    // Hero card: white bg, stronger border + shadow to signal "latest"; relative scopes confetti overlay
    <div className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.07)]">
      {/* Confetti burst — only rendered while showConfetti is true */}
      {showConfetti && confettiRef.current && (
        <ConfettiBurst particles={confettiRef.current} />
      )}

      {/* ── Type badge + "Latest" pill + date ────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Type badge uses the standard gradient pill */}
        <TypeBadge type={release.type} />

        {/* "Latest" pill — brand coloured */}
        <span className="rounded-full bg-[var(--color-brand)] px-2.5 py-0.5 text-[11px] font-semibold text-white">
          Latest
        </span>
        <span className="flex-1" />
        <span className="text-xs text-[#9CA3AF]">{release.date}</span>
      </div>

      {/* ── Version + headline ────────────────────────────────────────────── */}
      {/* Version watermark in muted text for editorial feel */}
      <p className="mb-1 font-mono text-4xl font-black text-[#E5E7EB]">
        v{release.version}
      </p>
      <h2 className="mb-4 text-xl font-bold leading-snug text-[var(--color-text-primary)]">
        {release.headline}
      </h2>

      {/* ── Change list ───────────────────────────────────────────────────── */}
      <ul className="mb-6 space-y-2">
        {release.changes.map((change, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {/* Brand-coloured dot bullet */}
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)] opacity-50" />
            <span>
              <span className="font-semibold text-[var(--color-text-primary)]">{change.category}: </span>
              {change.description}
            </span>
          </li>
        ))}
      </ul>

      {/* ── "Try it now" CTA — solid brand button on white ───────────────── */}
      {release.showMeHref && (
        <button
          type="button"
          onClick={() => router.push(release.showMeHref!)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-150 hover:bg-[var(--color-brand-dark)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.4)]"
        >
          Try it now →
        </button>
      )}

      {/* ── DB-backed reaction row (light variant — white card) ──────────── */}
      <ReactionRow
        version={release.version}
        counts={reactions.counts}
        mine={reactions.mine}
        onToggle={reactions.onToggle}
        variant="light"
      />
    </div>
  );
}

/**
 * Compact timeline card for non-hero releases.
 * Connected to the vertical timeline line via an absolute left dot.
 *
 * @param release - The release object.
 * @param isLast - When true, hides the bottom connector segment.
 * @param reactions - Live reaction data from the useReactions hook.
 */
function TimelineCard(props: { release: Release; isLast: boolean; reactions: ReactionProps }) {
  const { release, reactions } = props;
  const router = useRouter();

  return (
    // Row: left = dot + line, right = card content
    <div className="relative flex gap-5">

      {/* ── Timeline dot + vertical connector ───────────────────────────── */}
      <div className="flex flex-col items-center">
        {/* Dot — coloured by type */}
        <span
          className="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow"
          style={{
            // Use the badge colour logic: major/feature get brand, fix gets grey, improvement gets green
            backgroundColor:
              release.type === 'major' ? '#6366f1'
              : release.type === 'feature' ? '#3b82f6'
              : release.type === 'improvement' ? '#22c55e'
              : '#9CA3AF',
          }}
        />
        {/* Vertical line segment below dot — hidden on last card */}
        {!props.isLast && (
          <div className="w-px flex-1 bg-[#E5E7EB]" style={{ minHeight: '100%' }} />
        )}
      </div>

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 min-w-0 flex-1 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">

        {/* Header row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Version — monospace, muted */}
          <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
            v{release.version}
          </span>

          {/* Type badge */}
          <TypeBadge type={release.type} />

          <span className="flex-1" />
          <span className="text-[11px] text-[#9CA3AF]">{release.date}</span>
        </div>

        {/* Headline */}
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
          {release.headline}
        </h3>

        {/* Change list */}
        <ul className="space-y-1.5">
          {release.changes.map((change, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)] opacity-40" />
              <span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {change.category}:{' '}
                </span>
                {change.description}
              </span>
            </li>
          ))}
        </ul>

        {/* ── Footer: "Show me how" + reaction row ────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-[#E5E7EB] pt-3">

          {/* Show me how button — routes to the relevant page */}
          {release.showMeHref && (
            <button
              type="button"
              onClick={() => router.push(release.showMeHref!)}
              className="text-[11px] font-semibold text-[var(--color-brand)] hover:underline"
            >
              Show me how →
            </button>
          )}

          {/* DB-backed reaction row */}
          <ReactionRow
            version={release.version}
            counts={reactions.counts}
            mine={reactions.mine}
            onToggle={reactions.onToggle}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Sticky version navigator shown in the right column on lg+ screens.
 * Clicking a version scrolls the page to that release card.
 *
 * @param versions - Array of version strings to list.
 * @param activeVersion - The version string currently in the viewport.
 */
function VersionNav(props: { versions: string[]; activeVersion: string }) {
  function scrollTo(version: string) {
    const el = document.getElementById(`release-${version}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  return (
    // Sticky: top-[72px] clears the 56px fixed topbar + gap; self-start prevents stretch
    <div className="sticky top-[72px] hidden w-36 shrink-0 self-start lg:block">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
        Versions
      </p>
      <nav className="flex flex-col gap-0.5">
        {props.versions.map((v, i) => (
          <button
            key={v}
            type="button"
            onClick={() => scrollTo(v)}
            className={[
              'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left font-mono text-[11px] font-semibold transition-colors duration-150',
              props.activeVersion === v
                ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {/* Dot indicator — filled for active */}
            <span
              className={[
                'h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-150',
                props.activeVersion === v ? 'bg-[var(--color-brand)]' : 'bg-[#D1D5DB]',
              ].join(' ')}
            />
            v{v}
            {/* "Latest" label for the first version */}
            {i === 0 && (
              <span className="ml-auto rounded-full bg-[var(--color-brand)] px-1.5 py-0.5 text-[9px] text-white">
                new
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * What's New editorial changelog page.
 * Hero card for the latest release, vertical timeline for archived ones,
 * sticky version navigator, confetti burst on major release load.
 */
export function WhatsNewView() {
  // ── Active version tracking via IntersectionObserver ─────────────────────
  const [activeVersion, setActiveVersion] = useState(RELEASES[0]!.version);

  // ── DB-backed reactions — single hook for all versions ────────────────────
  // Load all versions at once so one API call serves every card on the page
  const allVersions = RELEASES.map(r => r.version);
  const { counts: allCounts, mine: allMine, toggle } = useReactions(allVersions);

  /**
   * Builds the ReactionProps slice for a single release version.
   * Extracts the version-specific counts and mine arrays from the shared maps.
   *
   * @param version - The release version string.
   * @returns ReactionProps object for that version.
   */
  function reactionPropsFor(version: string): ReactionProps {
    return {
      counts: allCounts[version] ?? {},
      mine: allMine[version] ?? [],
      onToggle: toggle,
    };
  }

  useEffect(() => {
    // Observe each release section and update active version when in view
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // ID format: "release-1.4.0" → strip prefix to get version
            const version = entry.target.id.replace('release-', '');
            setActiveVersion(version);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    // Find all release anchor elements and observe them
    for (const release of RELEASES) {
      const el = document.getElementById(`release-${release.version}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  // Ordered list of all version strings for the nav
  const versionList = RELEASES.map(r => r.version);

  // Hero = first release; archive = remaining
  const [hero, ...archiveReleases] = RELEASES;

  return (
    // No background override — inherits the app surface colour
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-lg font-semibold tracking-wide text-[var(--color-text-primary)]">
            What&apos;s New
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Release notes and product updates — most recent first.
          </p>
        </div>

        {/* ── Two-column body: content + version nav ────────────────────────── */}
        <div className="flex gap-8">

          {/* ── Left: timeline content ────────────────────────────────────── */}
          <div className="min-w-0 flex-1">

            {/* ── Hero card (latest release) ─────────────────────────────── */}
            {/* Anchor element for intersection observer + version nav scroll */}
            <div id={`release-${hero!.version}`} className="mb-8">
              <HeroCard release={hero!} reactions={reactionPropsFor(hero!.version)} />
            </div>

            {/* ── Archive timeline ──────────────────────────────────────── */}
            {/* "Archive" divider label */}
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                Archive
              </span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            {/* Timeline cards — each wrapped in an anchor div */}
            <div>
              {archiveReleases.map((release, i) => (
                <div key={release.version} id={`release-${release.version}`}>
                  <TimelineCard
                    release={release}
                    isLast={i === archiveReleases.length - 1}
                    reactions={reactionPropsFor(release.version)}
                  />
                </div>
              ))}
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <p className="mt-4 text-center text-xs text-[#9CA3AF]">
              Have a feature request or found a bug?{' '}
              <a href="/feedback" className="font-medium text-[var(--color-brand)] hover:underline">
                Send feedback
              </a>
            </p>
          </div>

          {/* ── Right: sticky version navigator ──────────────────────────── */}
          <VersionNav versions={versionList} activeVersion={activeVersion} />
        </div>
      </div>
    </div>
  );
}
