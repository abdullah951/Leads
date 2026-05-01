'use client';

// ── FavoritesView ─────────────────────────────────────────────────────────────
// Full-page view for the /favorites route.
// Shows all leads the user has starred, grouped or filterable by colour-coded tag.
//
// Layout:
//   Header row: "FAVORITES" title + Export All + Clear All buttons
//   Quick filters: glassmorphism tag pills (All | each tag)
//   Table: Name (+ revealed badge) | Job Title | Company | Tag | Action
//   Empty state: illustrated star prompt
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/constants/apiRoutes';
import { Spinner } from './Spinner';
// Import the shared generic upsell modal (replaces the old inline UpsellModal below)
import { UpsellModal } from './UpsellModal';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape returned by POST /api/favorites/list */
type FavoriteLead = {
  favoriteId: number;
  tagName: string;
  tagColor: string;
  favoritedAt: string;
  id: number;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  linkedinUrl: string | null;
  avatarUrl: string | null;
  companyName: string | null;
  jobTitle: string | null;
  city: string | null;
  industry: string | null;
  companySize: string | null;
  // Revealed contact data — null until the user has clicked Reveal
  revealed: boolean;
  workEmail: string | null;
  personalEmail: string | null;
  phone1: string | null;
};

// ── Empty state ───────────────────────────────────────────────────────────────

/** Shown when the user has no favourited leads yet */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-24 text-center">
      {/* Large stylised star icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--color-text-muted)] opacity-30"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <p className="text-base font-semibold text-[var(--color-text-primary)]">
        Your goldmine is empty.
      </p>
      <p className="max-w-xs text-sm text-[var(--color-text-muted)]">
        Start starring leads to build your priority list.
        Select leads in Search and click{' '}
        <span className="font-medium text-[var(--color-text-secondary)]">Favourite</span>
        {' '}to tag them here.
      </p>
    </div>
  );
}

// ── Tag badge ─────────────────────────────────────────────────────────────────

/** Glassmorphism-style tag badge — semi-transparent bg with bright text */
function TagBadge(props: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm"
      style={{
        // Semi-transparent version of the tag colour as background
        backgroundColor: `${props.color}22`,
        // Solid bright text in the tag colour
        color: props.color,
        // Subtle border in the same colour
        border: `1px solid ${props.color}44`,
      }}
    >
      {props.name}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Renders the full favorites page.
 * Fetches favorites on mount, shows glassmorphism tag filter pills,
 * and a table of starred leads with revealed badges + action icons.
 */
export function FavoritesView() {
  const [favorites, setFavorites] = useState<FavoriteLead[]>([]);
  const [loading, setLoading] = useState(true);
  // The currently active tag filter — null means "All"
  const [activeTag, setActiveTag] = useState<string | null>(null);
  // Which favoriteId is mid-deletion
  const [removingId, setRemovingId] = useState<number | null>(null);
  // Which lead id is currently being revealed (shows spinner on that row)
  const [revealingId, setRevealingId] = useState<number | null>(null);
  // Whether the Export All operation is in-flight (disables the button)
  const [exporting, setExporting] = useState(false);
  // Upsell modal state — null = hidden.
  // When set, contains the credit figures needed to render the modal's progress bar and copy.
  // Shape: { available: credits user has, required: unrevealed leads count that need credits }
  const [upsell, setUpsell] = useState<{ available: number; required: number } | null>(null);

  // ── Fetch favorites on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetch(API_ROUTES.favorites.list, { method: 'POST', body: '{}' })
      .then(r => r.json())
      .then((data: FavoriteLead[]) => setFavorites(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derive the unique set of tags present in the user's favorites ─────────
  // Used to render the quick-filter pills dynamically.
  const uniqueTags = Array.from(
    new Map(favorites.map(f => [f.tagName, { name: f.tagName, color: f.tagColor }])).values(),
  );

  // ── Filter the visible rows by the active tag pill ────────────────────────
  const visibleRows = activeTag === null
    ? favorites
    : favorites.filter(f => f.tagName === activeTag);

  // ── Remove a favourite row ────────────────────────────────────────────────
  async function handleRemove(favoriteId: number) {
    setRemovingId(favoriteId);
    try {
      const res = await fetch(API_ROUTES.favorites.remove, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteId }),
      });
      if (res.ok) {
        setFavorites(prev => prev.filter(f => f.favoriteId !== favoriteId));
      }
    } catch {
      // Swallow — row stays in list
    } finally {
      setRemovingId(null);
    }
  }

  // ── Clear all favourites ──────────────────────────────────────────────────
  // Removes all rows via individual API calls in parallel
  async function handleClearAll() {
    const ids = visibleRows.map(f => f.favoriteId);
    await Promise.allSettled(
      ids.map(id =>
        fetch(API_ROUTES.favorites.remove, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favoriteId: id }),
        }),
      ),
    );
    // Remove cleared rows from state
    setFavorites(prev => prev.filter(f => !ids.includes(f.favoriteId)));
  }

  // ── Reveal handler ────────────────────────────────────────────────────────
  // Reuses POST /api/leads/reveal — same endpoint as LeadsTable/LeadsDashboard.
  // On success, patches the revealed contact fields in local state so the row
  // updates immediately without a full re-fetch.
  async function handleReveal(leadId: number) {
    // Mark row as loading
    setRevealingId(leadId);
    try {
      const res = await fetch(API_ROUTES.leads.reveal, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // API expects selectedPersons array — same shape as LeadsDashboard
        body: JSON.stringify({ selectedPersons: [leadId] }),
      });

      if (!res.ok) return; // silently fail — no credits toast here

      // API returns array of revealed contact objects
      const contacts: {
        personId: number;
        workEmail: string | null;
        personalEmail: string | null;
        phone1: string | null;
        phone2: string | null;
      }[] = await res.json();

      // Patch the matching row in local state — flip revealed flag + fill contact fields
      setFavorites(prev =>
        prev.map((fav) => {
          const contact = contacts.find(c => c.personId === fav.id);
          if (!contact) return fav;
          return {
            ...fav,
            revealed: true,
            workEmail: contact.workEmail,
            personalEmail: contact.personalEmail,
            phone1: contact.phone1,
          };
        }),
      );
    } catch {
      // Swallow network errors — row stays unrevealed
    } finally {
      setRevealingId(null);
    }
  }

  // ── Core export helper ────────────────────────────────────────────────────
  // Calls POST /api/leads/export with the given person IDs.
  // If the export is synchronous it triggers a browser download immediately.
  async function doExport(personIds: number[]) {
    if (personIds.length === 0) return;
    const res = await fetch(API_ROUTES.leads.export, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedPersons: personIds }),
    });
    if (!res.ok) return;
    const data = await res.json() as { downloadUrl?: string; jobId?: number };
    if (data.downloadUrl) {
      // Trigger browser file download for synchronous exports
      const a = document.createElement('a');
      a.href = data.downloadUrl;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    // Async jobs (data.jobId) appear in Export Jobs page — no extra action needed
  }

  // ── Reveal + export helper ────────────────────────────────────────────────
  // Reveals the given unrevealed leads (deducting credits), then re-fetches the
  // favorites list so revealed data appears in the table, then exports all rows.
  async function revealThenExport(unrevealedIds: number[], allIds: number[]) {
    // Step 1: Reveal unrevealed leads — deducts credits
    if (unrevealedIds.length > 0) {
      const revRes = await fetch(API_ROUTES.leads.reveal, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPersons: unrevealedIds }),
      });
      if (revRes.ok) {
        // Patch revealed contacts into local state so table updates immediately
        const contacts: {
          personId: number;
          workEmail: string | null;
          personalEmail: string | null;
          phone1: string | null;
        }[] = await revRes.json();
        setFavorites(prev =>
          prev.map((fav) => {
            const c = contacts.find(x => x.personId === fav.id);
            if (!c) return fav;
            return { ...fav, revealed: true, workEmail: c.workEmail, personalEmail: c.personalEmail, phone1: c.phone1 };
          }),
        );
      }
    }
    // Step 2: Export all leads (now fully revealed)
    await doExport(allIds);
  }

  // ── Export All handler ────────────────────────────────────────────────────
  // Credit-aware export flow:
  //   1. Count unrevealed leads in visibleRows (each costs 1 credit)
  //   2. Fetch current credit balance
  //   3a. If unrevealed <= available credits → reveal all + export (happy path)
  //   3b. If unrevealed > available credits → show UpsellModal (blocks full export)
  async function handleExportAll() {
    const allIds = visibleRows.map(f => f.id);
    if (allIds.length === 0) return;

    // Count leads that still need revealing (cost 1 credit each)
    const unrevealedIds = visibleRows.filter(f => !f.revealed).map(f => f.id);

    setExporting(true);
    try {
      // ── No unrevealed leads — just export for free ──────────────────────
      if (unrevealedIds.length === 0) {
        await doExport(allIds);
        return;
      }

      // ── Fetch credit balance before deciding ────────────────────────────
      const creditRes = await fetch(API_ROUTES.credits.balance, { method: 'POST', body: '{}' });
      const creditData = await creditRes.json() as { remaining: number };
      const available = creditData.remaining ?? 0;

      if (unrevealedIds.length <= available) {
        // ── Enough credits — reveal all unrevealed leads then export ───────
        await revealThenExport(unrevealedIds, allIds);
      } else {
        // ── Not enough credits — show the upsell modal ──────────────────
        // Pass both available credits and required count so the modal can render
        // its progress bar and body copy with the real credit figures.
        setUpsell({ available, required: unrevealedIds.length });
      }
    } catch {
      // Swallow network errors silently
    } finally {
      setExporting(false);
    }
  }

  // ── Partial export (from upsell modal) ───────────────────────────────────
  // Reveals only the first `available` unrevealed leads (consuming all remaining credits),
  // then exports those plus all already-revealed leads.
  // Called when the user clicks "Export only my remaining N leads" in the UpsellModal.
  async function handleExportPartial() {
    // Guard: should never be called when upsell is null, but be safe
    if (!upsell) return;
    // Capture available count before clearing the modal state
    const availableCount = upsell.available;
    // Close the modal immediately so the UI feels responsive
    setUpsell(null);
    // Collect leads that still need revealing (each costs 1 credit)
    const unrevealedIds = visibleRows.filter(f => !f.revealed).map(f => f.id);
    // Only reveal as many as the user has credits for (slice to available count)
    const toReveal = unrevealedIds.slice(0, availableCount);
    // Already-revealed leads export for free — collect their IDs
    const alreadyRevealedIds = visibleRows.filter(f => f.revealed).map(f => f.id);
    // Reveal the affordable subset then export everything that will be revealed
    await revealThenExport(toReveal, [...alreadyRevealedIds, ...toReveal]);
  }

  // ── Upgrade handler (from upsell modal) ──────────────────────────────────
  // Starts a Stripe checkout session for the unlimited plan.
  async function handleUpgrade() {
    // Dismiss the upsell modal before redirecting to Stripe
    setUpsell(null);
    try {
      const res = await fetch(API_ROUTES.stripe.checkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json() as { url?: string };
        if (data.url) window.location.href = data.url;
      }
    } catch {
      // Swallow — user can retry from pricing page
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="ml-[160px] min-h-screen pt-14">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Header row ────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide text-[var(--color-text-primary)]">
            Favorites
          </h1>

          {!loading && favorites.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Export All — calls POST /api/leads/export with all visible lead IDs.
                  Disabled while export is in-flight to prevent double-clicks. */}
              <button
                type="button"
                onClick={handleExportAll}
                disabled={exporting}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Download icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {/* Show "Exporting…" label while in-flight */}
                {exporting ? 'Exporting…' : 'Export All'}
              </button>

              {/* Clear All — removes all currently-visible rows */}
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-error)] hover:bg-[#fee2e2]"
              >
                {/* Trash icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* ── Loading skeleton ───────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)]" />
            ))}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!loading && favorites.length === 0 && <EmptyState />}

        {/* ── Tag quick-filters + table ───────────────────────────────────── */}
        {!loading && favorites.length > 0 && (
          <>
            {/* Quick filter pills — glassmorphism style */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                Quick filters:
              </span>

              {/* "All" pill */}
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={[
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 backdrop-blur-sm',
                  activeTag === null
                    ? 'bg-[var(--color-brand)] text-white shadow-[0_0_10px_2px_var(--color-brand)] scale-[1.04]'
                    : 'border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:scale-[1.02]',
                ].join(' ')}
              >
                ⭐ All ({favorites.length})
              </button>

              {/* One pill per unique tag */}
              {uniqueTags.map(tag => {
                const count = favorites.filter(f => f.tagName === tag.name).length;
                const isActive = activeTag === tag.name;
                return (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => setActiveTag(isActive ? null : tag.name)}
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 backdrop-blur-sm hover:scale-[1.02]"
                    style={{
                      // Glassmorphism: semi-transparent colour fill + bright text
                      backgroundColor: isActive ? tag.color : `${tag.color}22`,
                      color: isActive ? 'white' : tag.color,
                      border: `1px solid ${tag.color}44`,
                      boxShadow: isActive ? `0 0 10px 2px ${tag.color}55` : undefined,
                      transform: isActive ? 'scale(1.04)' : undefined,
                    }}
                  >
                    {tag.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* ── Results table ────────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">Job Title</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">Company</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">Tag</th>
                    {/* Contact column — mirrors LeadsTable contact column (email + phone) */}
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(fav => (
                    <tr
                      key={fav.favoriteId}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)]"
                    >
                      {/* ── Name + revealed badge ──────────────────────────── */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Avatar or initials fallback */}
                          {fav.avatarUrl
                            ? (
                                <img
                                  src={fav.avatarUrl}
                                  alt=""
                                  className="h-7 w-7 rounded-full object-cover"
                                />
                              )
                            : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-[10px] font-semibold text-[var(--color-brand)]">
                                  {(fav.firstName?.[0] ?? '') + (fav.lastName?.[0] ?? '')}
                                </div>
                              )}

                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[var(--color-text-primary)]">
                                {fav.fullName || '—'}
                              </span>
                              {/* Revealed badge — green checkmark so user knows no credits needed */}
                              {fav.revealed && (
                                <span
                                  title="Already revealed — no credits needed"
                                  className="flex h-4 w-4 items-center justify-center rounded-full bg-[#dcfce7]"
                                >
                                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            {/* City under the name */}
                            {fav.city && (
                              <span className="text-[11px] text-[var(--color-text-muted)]">{fav.city}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ── Job Title ─────────────────────────────────────── */}
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {fav.jobTitle ?? '—'}
                      </td>

                      {/* ── Company ───────────────────────────────────────── */}
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {fav.companyName ?? '—'}
                      </td>

                      {/* ── Tag badge ─────────────────────────────────────── */}
                      <td className="px-4 py-3">
                        <TagBadge name={fav.tagName} color={fav.tagColor} />
                      </td>

                      {/* ── Contact column ────────────────────────────────────
                          Mirrors LeadsTable: masked preview when unrevealed,
                          full clickable email + phone lines when revealed.
                          Uses the same `unmask` CSS animation from global.css. */}
                      <td className="px-4 py-3">
                        <div
                          className="flex flex-col gap-0.5 text-xs"
                          style={fav.revealed ? { animation: 'unmask 0.35s ease forwards' } : undefined}
                        >
                          {fav.revealed
                            ? (
                                // ── Revealed: show all non-null contact fields ────────
                                <>
                                  {fav.workEmail && (
                                    <a
                                      href={`mailto:${fav.workEmail}`}
                                      className="font-mono text-[var(--color-brand)] hover:underline"
                                    >
                                      {fav.workEmail}
                                    </a>
                                  )}
                                  {fav.personalEmail && (
                                    <a
                                      href={`mailto:${fav.personalEmail}`}
                                      className="font-mono text-[var(--color-brand)] hover:underline"
                                    >
                                      {fav.personalEmail}
                                    </a>
                                  )}
                                  {fav.phone1 && (
                                    <span className="font-mono text-[var(--color-text-secondary)]">
                                      {fav.phone1}
                                    </span>
                                  )}
                                </>
                              )
                            : (
                                // ── Unrevealed: asterisk placeholder — signals locked data
                                <span className="select-none font-mono text-xs tracking-widest text-[var(--color-text-muted)]">
                                  *********
                                </span>
                              )}
                        </div>
                      </td>

                      {/* ── Action: Reveal + Remove ───────────────────────── */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">

                          {/* Reveal button — same capsule style as LeadsTable.
                              Revealed state: ghost capsule with checkmark (non-clickable).
                              Unrevealed state: solid brand capsule with eye icon + spinner. */}
                          {fav.revealed
                            ? (
                                // Ghost capsule — contact already unlocked, no action needed
                                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="2 6 5 9 10 3" />
                                  </svg>
                                  {/* Revealed */}
                                </span>
                              )
                            : (
                                // Solid brand capsule — click costs 1 credit
                                <button
                                  type="button"
                                  disabled={revealingId === fav.id}
                                  onClick={() => handleReveal(fav.id)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--color-brand-dark)] hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {/* Show spinner while this row's reveal is in-flight */}
                                  {revealingId === fav.id
                                    ? <Spinner size={11} />
                                    : (
                                        // Eye icon — signals "unlock & view contact"
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                          <circle cx="12" cy="12" r="3" />
                                        </svg>
                                      )}
                                  {/* Reveal */}
                                </button>
                              )}

                          {/* Remove from favourites — trash icon */}
                          <button
                            type="button"
                            title="Remove from favourites"
                            disabled={removingId === fav.favoriteId}
                            onClick={() => handleRemove(fav.favoriteId)}
                            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)] disabled:opacity-40"
                          >
                            {removingId === fav.favoriteId
                              ? (
                                  // Spinner while removing
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                  </svg>
                                )
                              : (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                  </svg>
                                )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Upsell modal — rendered outside the scroll container so it overlays everything.
          Uses the shared generic UpsellModal with the 'favourites' context.
          selectedCount = number of unrevealed leads the user tried to export.
          onProceedLimited = export only already-revealed leads (handleExportPartial).
          onClose = dismiss without any action. */}
      {/* ── Upsell modal — rendered outside the scroll container so it overlays everything.
          Only shown when upsell state is non-null (i.e. a credit check determined the user
          doesn't have enough credits).
          available = credits the user has; required = unrevealed leads they tried to export.
          onProceedAvailable = reveal only the affordable subset then export (handleExportPartial).
          onClose = dismiss without any action. */}
      {upsell !== null && (
        <UpsellModal
          context="export"
          available={upsell.available}
          required={upsell.required}
          onUpgrade={handleUpgrade}
          onProceedAvailable={handleExportPartial}
          onClose={() => setUpsell(null)}
        />
      )}
    </div>
  );
}
