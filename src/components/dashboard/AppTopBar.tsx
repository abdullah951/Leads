'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_ROUTES } from '@/constants/apiRoutes';
import { CLIENT_ROUTES } from '@/constants/clientRoutes';
import { Link } from '@/libs/I18nNavigation';
import { WarpLeadsLogo } from './WarpLeadsLogo';

type CreditsState = {
  remaining: number;
  dailyLimit: number;
  resetsAt: string | null;
  // Plan tier returned by the balance API — used to highlight current plan in pricing modal
  plan?: string;
};

// Shape of each job returned by POST /api/export-jobs/list
type ExportJob = {
  jobId: number;
  type: 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  downloadUrl: string | null;
  createdAt: string;
};

type Props = {
  /** Active nav item — used to highlight the current page link. */
  // Extended to include all pages that have their own layout + AppTopBar
  activePage: 'dashboard' | 'leads-lists' | 'uploaded-files' | 'export-jobs' | 'favorites' | 'reveal-history' | 'integrations' | 'team' | 'feedback' | 'settings' | 'documentation' | 'whats-new';
  userEmail: string;
};

/* ── HUD icon components ────────────────────────────────────────────────────
   4 visual states for the export status indicator in the topbar:
   idle       → grey thin-line Download icon (no jobs, links to /export-jobs)
   processing → blue spinning arc (indeterminate, jobs running)
   success    → green checkmark ring (auto-resets to idle after 10 s)
   failed     → red X ring (stays until user clicks)
*/

/**
 * Idle state icon — thin-line Download arrow.
 * Neutral grey, signals "click to see your export history".
 */
function IdleDownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Tray/inbox base */}
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      {/* Down arrow shaft */}
      <line x1="12" y1="3" x2="12" y2="15" />
      {/* Arrow head */}
      <polyline points="7 10 12 15 17 10" />
    </svg>
  );
}

/** Processing state — blue spinning arc (indeterminate). */
function SpinningRing() {
  return (
    // Outer wrapper spins at 1 revolution/sec
    <svg width="22" height="22" viewBox="0 0 22 22" className="animate-spin" style={{ animationDuration: '1.2s' }}>
      {/* Faint background track */}
      <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      {/* Spinning arc — ~75% of circumference */}
      <circle
        cx="11"
        cy="11"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="42 56.5"
        strokeLinecap="round"
        transform="rotate(-90 11 11)"
      />
    </svg>
  );
}

/**
 * Success state — green checkmark ring.
 * @param ping - When true, applies a brief scale-bounce to signal a fresh completion.
 */
function DoneRing(props: { ping: boolean }) {
  return (
    // Scale-bounce on `ping` using CSS animation via an inline style
    <span
      style={props.ping ? { animation: 'hud-ping 0.4s ease-out' } : undefined}
      className="inline-flex"
    >
      <svg width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <polyline points="7 11 10 14 15 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Keyframe for the one-shot bounce — defined inline to avoid global CSS changes */}
      <style>{`
        @keyframes hud-ping {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

/** Failed state — red X ring. Stays until user opens and acknowledges. */
function FailedRing() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M8 8l6 6M14 8l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Fuel Gauge helper components ──────────────────────────────────────────
   These are small presentational components used only inside AppTopBar.
   Kept here (not in separate files) since they share no state with anything else.
*/

/**
 * Battery-style icon with 4 fill segments.
 * @param pct - Fill ratio 0–1, or null for unknown/loading (renders grey).
 */
function FuelBatteryIcon(props: { pct: number | null }) {
  // How many of the 4 segments to fill (round to nearest)
  const filled = props.pct === null ? 0 : Math.round(props.pct * 4);

  // Derive fill colour from level
  const colour = props.pct === null
    ? 'var(--color-text-muted)'
    : props.pct < 0.25
      ? '#ef4444'   // red — critically low
      : props.pct < 0.5
        ? '#f59e0b' // amber — getting low
        : 'var(--color-brand)'; // brand green — healthy

  return (
    // Battery body + nub
    <svg width="24" height="14" viewBox="0 0 24 14" fill="none" aria-hidden="true">
      {/* Outer body */}
      <rect x="0.5" y="0.5" width="20" height="13" rx="2.5" stroke={colour} strokeWidth="1.2" />
      {/* Battery nub on the right */}
      <rect x="21" y="4" width="2.5" height="6" rx="1" fill={colour} />

      {/* 4 inner fill segments — each 3.5 px wide with 1 px gap */}
      {[0, 1, 2, 3].map(i => (
        <rect
          key={i}
          // x: left padding 2 + (segmentWidth 3.5 + gap 1) * i
          x={2 + i * 4.5}
          y={2}
          width={3.5}
          height={10}
          rx={0.8}
          fill={i < filled ? colour : 'transparent'}
          // Dim empty segments as a ghost outline
          stroke={colour}
          strokeWidth={i < filled ? 0 : 0.6}
          opacity={i < filled ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

/**
 * Horizontally-segmented fuel bar — 20 equal blocks.
 * Filled blocks use the given colour; empty blocks are a dim surface.
 * @param pct - Fill ratio 0–1.
 * @param colour - CSS colour string for filled blocks.
 */
function SegmentedBar(props: { pct: number; colour: string }) {
  const SEGMENTS = 20;
  // How many segments to fill (at least 1 if there are any credits at all)
  const filled = props.pct > 0
    ? Math.max(1, Math.round(props.pct * SEGMENTS))
    : 0;

  return (
    // Flex row of 20 thin blocks with tiny gaps
    <div className="flex h-3 gap-[2px]">
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-[2px] transition-all duration-500"
          style={{
            background: i < filled ? props.colour : 'var(--color-surface-subtle)',
            // Subtle scale-down on empty blocks so filled ones look raised
            transform: i < filled ? 'scaleY(1)' : 'scaleY(0.7)',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Fixed top bar shared across dashboard, leads-lists, and export-jobs pages.
 * Credits balance is fetched lazily — only when the user opens the credits popover.
 * Active Tasks HUD polls export jobs every 4 s while any job is pending/processing.
 */
export function AppTopBar(props: Props) {
  const t = useTranslations('AppTopBar');

  // ── Credits fuel gauge ─────────────────────────────────────────────────────
  // Starts as 'loading' so the battery icon renders in grey until the first fetch resolves
  const [credits, setCredits] = useState<CreditsState | 'loading' | null>('loading');
  const [creditsOpen, setCreditsOpen] = useState(false);

  // ── Pricing modal — opened by "View plans" button in credits popover ───────
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  // Loading state while redirecting to Stripe Checkout
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ── Notifications popover ──────────────────────────────────────────────────
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // ── User menu ──────────────────────────────────────────────────────────────
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // ── Active Tasks HUD ───────────────────────────────────────────────────────
  // All export jobs for this user (most recent first)
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  // Whether the tasks mini-dashboard popover is open
  const [hudOpen, setHudOpen] = useState(false);
  // Polling interval ref — cleared when no active jobs remain
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Auto-reset timer ref — clears jobs list 10 s after success so icon returns to idle
  const successResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether to play the ping animation on the DoneRing (fires once on new success)
  const [successPing, setSuccessPing] = useState(false);
  // Tracks whether we observed an active (processing) job during this session.
  // Prevents showing the success-tick on mount when old completed jobs are fetched.
  // Only transitions to success state after we've seen at least one active job.
  const seenActiveRef = useRef(false);

  // Refs for outside-click handling
  const creditsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  /* ── Outside-click: close credits ──────────────────────────────────────── */
  useEffect(() => {
    if (!creditsOpen) return;
    function handler(e: MouseEvent) {
      if (creditsRef.current && !creditsRef.current.contains(e.target as Node)) setCreditsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [creditsOpen]);

  /* ── Outside-click: close notifications ────────────────────────────────── */
  useEffect(() => {
    if (!notificationsOpen) return;
    function handler(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setNotificationsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

  /* ── Outside-click: close HUD ──────────────────────────────────────────── */
  useEffect(() => {
    if (!hudOpen) return;
    function handler(e: MouseEvent) {
      if (hudRef.current && !hudRef.current.contains(e.target as Node)) setHudOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [hudOpen]);

  /* ── Job fetcher ────────────────────────────────────────────────────────── */

  /**
   * Fetches the latest export jobs list and updates state.
   * If all jobs are in a terminal state (completed/failed), stops polling.
   */
  const fetchJobs = useCallback(() => {
    fetch(API_ROUTES.exportJobs.list, { method: 'POST', body: '{}' })
      .then(r => r.json())
      .then((data: ExportJob[]) => {
        setJobs(data);

        // If any job is currently active, mark this session as having seen active work.
        // This flag gates the success-tick so it only shows after a real in-session export.
        const hasActiveNow = data.some(j => j.status === 'pending' || j.status === 'processing');
        if (hasActiveNow) seenActiveRef.current = true;

        // Stop polling once every job has reached a terminal state
        if (!hasActiveNow && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      })
      .catch(() => {});
  }, []);

  /* ── Start polling on mount; re-fetch whenever HUD opens ───────────────── */
  useEffect(() => {
    // Initial fetch on mount so the ring shows immediately if jobs exist
    fetchJobs();

    // Start polling every 4 seconds — fetchJobs itself stops the interval
    // once all active jobs settle.
    pollRef.current = setInterval(fetchJobs, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchJobs]);

  // Re-start polling when the HUD is opened (user may re-open after all jobs settled)
  useEffect(() => {
    if (!hudOpen) return;
    fetchJobs(); // immediate refresh on open
    if (!pollRef.current) {
      pollRef.current = setInterval(fetchJobs, 4000);
    }
  }, [hudOpen, fetchJobs]);

  /* ── Derived HUD state ──────────────────────────────────────────────────── */

  // Jobs to show in the popover (most recent 8 — keeps the HUD compact)
  const recentJobs = jobs.slice(0, 8);

  // Any job that is still running (drives the spinning ring)
  const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing');

  // The most recent job — used to drive the HUD icon state
  const latestJob = jobs[0] ?? null;
  const latestStatus = latestJob?.status ?? null;

  /**
   * 4-state HUD state machine:
   *   idle       — no jobs in state (default, after success reset or on first load)
   *   processing — at least one job is pending/processing
   *   success    — all jobs settled, latest succeeded
   *   failed     — all jobs settled, latest failed
   */
  type HudState = 'idle' | 'processing' | 'success' | 'failed';
  const hudState: HudState = (() => {
    // No jobs at all → idle (Download icon)
    if (jobs.length === 0) return 'idle';
    // Jobs are still running → processing (spinner)
    if (hasActive) return 'processing';
    // Jobs settled but we never saw them run in this session (e.g. page navigation
    // while a previous export was already done) → show idle so no false success tick.
    if (!seenActiveRef.current) return 'idle';
    // We watched jobs go from active → done in this session
    if (latestStatus === 'failed') return 'failed';
    return 'success';
  })();

  // Colour applied to the icon element based on current state
  const hudColour = hudState === 'idle'
    ? 'text-[#94a3b8]'              // neutral slate grey — unobtrusive
    : hudState === 'processing'
      ? 'text-[var(--color-brand)]'  // brand blue — "working"
      : hudState === 'success'
        ? 'text-[#22c55e]'           // green — done
        : 'text-[#ef4444]';          // red — failed

  /* ── Auto-reset: success → idle after 10 seconds ────────────────────────
     When the state transitions into success, start a 10 s timer to clear jobs
     so the icon smoothly returns to the idle Download icon.
     The ping animation also plays once on entry to success.                */
  useEffect(() => {
    // Clear any pending reset from a previous cycle
    if (successResetRef.current) {
      clearTimeout(successResetRef.current);
      successResetRef.current = null;
    }

    if (hudState !== 'success') return;

    // Trigger the one-shot ping bounce animation
    setSuccessPing(true);
    // Clear ping flag after animation duration (0.4 s)
    const pingTimer = setTimeout(() => setSuccessPing(false), 400);
    // Schedule reset to idle after 10 s
    successResetRef.current = setTimeout(() => {
      setJobs([]);  // clears state → hudState → 'idle'
      successResetRef.current = null;
    }, 10000);

    return () => {
      clearTimeout(pingTimer);
      if (successResetRef.current) clearTimeout(successResetRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hudState]);

  /* ── Credits fetch helper ────────────────────────────────────────────────── */

  /** Fetches the credits balance and updates state. Called on mount and on popover open. */
  function fetchCredits() {
    fetch(API_ROUTES.credits.balance, { method: 'POST', body: '{}' })
      .then(r => r.json())
      .then((data: CreditsState) => setCredits(data))
      .catch(() => setCredits(null));
  }

  /* ── Fetch credits on mount so compact bar shows a real value immediately ── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCredits(); }, []);

  /* ── Listen for reveal events from LeadsDashboard to refresh credits live ── */
  // LeadsDashboard dispatches 'wl:credits-changed' after each successful reveal
  // so the credit count updates in real-time without requiring a page reload.
  useEffect(() => {
    function handleCreditsChanged() { fetchCredits(); }
    window.addEventListener('wl:credits-changed', handleCreditsChanged);
    return () => window.removeEventListener('wl:credits-changed', handleCreditsChanged);
  // fetchCredits is stable (defined in component body, no changing deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Credits toggle ─────────────────────────────────────────────────────── */

  function handleCreditsToggle() {
    const nextOpen = !creditsOpen;
    setCreditsOpen(nextOpen);
    // Re-fetch on every open so the popover always shows the latest value
    if (nextOpen) fetchCredits();
  }

  /**
   * Opens the pricing modal and closes the credits popover.
   * Called when user clicks "View plans" in the credits popover.
   */
  function handleOpenPricingModal() {
    setCreditsOpen(false);
    setPricingModalOpen(true);
  }

  /**
   * Starts a Stripe Checkout session for the given plan tier.
   * Redirects the browser to Stripe's hosted checkout page.
   *
   * @param planTier - The plan to purchase: 'starter' | 'pro' | 'enterprise'.
   */
  async function handleCheckout(planTier: 'starter' | 'pro' | 'enterprise') {
    setCheckoutLoading(true);
    try {
      const res = await fetch(API_ROUTES.stripe.checkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier }),
      });
      const d = await res.json() as { url?: string; message?: string };
      if (!res.ok) throw new Error(d.message ?? 'Checkout failed');
      if (d.url) window.location.href = d.url;
    } catch {
      // Error is swallowed — button returns to non-loading state
    } finally {
      setCheckoutLoading(false);
    }
  }

  /* ── Helpers ────────────────────────────────────────────────────────────── */


  /** Formats an ISO timestamp into "Mar 13, 14:05". */
  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /* ── Nav items (referenced by the commented-out center nav — kept for reference) */
  // const navItems = [...] — nav is now in NavRail; definition removed to avoid lint warning

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    // Fragment wraps header + pricing modal so both can be returned from one component
    <>
    <header
      className="fixed inset-x-0 top-0 z-[var(--z-topbar)] flex h-14 items-center border-b border-[var(--color-topbar-border)] bg-[var(--color-topbar-bg)] px-4"
      style={{ zIndex: 'var(--z-topbar)' }}
    >
      {/* Left: logo + name */}
      <Link href={CLIENT_ROUTES.dashboard} className="flex shrink-0 items-center gap-2 font-semibold text-[var(--color-text-primary)]">
        <WarpLeadsLogo />
        <span className="text-sm">Leads</span>
      </Link>

      {/* Center: nav — kept here as fallback; primary nav is now NavRail (left sidebar) */}
      {/* <nav className="mx-auto flex items-center gap-1">
        {navItems.map(item => (
          <Link
            key={item.key}
            href={item.href}
            className={[
              'rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors',
              props.activePage === item.key
                ? 'bg-[var(--color-surface-subtle)] font-medium text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {item.label}
          </Link>
        ))}
      </nav> */}
      {/* Spacer so right-side controls stay flush right */}
      <div className="flex-1" />

      {/* Right: HUD + notification bell + credits + Go Unlimited + user menu */}
      <div className="flex shrink-0 items-center gap-3">

        {/* ── Export Status HUD (always visible) ───────────────────────────
            4 states:
              idle       → grey Download icon → click navigates to /export-jobs
              processing → blue SpinningRing  → click opens popover
              success    → green DoneRing     → click opens popover, auto-resets in 10 s
              failed     → red FailedRing     → click opens popover with error details
        */}
        <div ref={hudRef} className="relative">
          {/* Single button for all 4 states — always opens the popover.
              Icon morphs: Download (idle) → SpinningRing (processing) →
              DoneRing (success, 10 s then back to idle) → FailedRing (failed). */}
          <button
            type="button"
            aria-label={
              hudState === 'idle'         ? 'Export history'
              : hudState === 'processing' ? 'Exporting leads…'
              : hudState === 'success'    ? 'Export complete — click to view'
              : 'Export failed — click for details'
            }
            title={
              hudState === 'idle'         ? 'Export history'
              : hudState === 'processing' ? 'Exporting leads…'
              : hudState === 'success'    ? 'Export complete — click to download'
              : 'Export failed — click for details'
            }
            onClick={() => setHudOpen(prev => !prev)}
            className={[
              'flex items-center justify-center rounded-[var(--radius-md)] p-1.5 transition-colors hover:bg-[var(--color-surface-subtle)]',
              hudColour,
            ].join(' ')}
          >
            {/* Icon morphs based on current state */}
            {hudState === 'idle'       && <IdleDownloadIcon />}
            {hudState === 'processing' && <SpinningRing />}
            {hudState === 'success'    && <DoneRing ping={successPing} />}
            {hudState === 'failed'     && <FailedRing />}

            {/* Pulsing brand dot while jobs are running — draws the eye */}
            {hudState === 'processing' && (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-[var(--color-brand)] ring-2 ring-[var(--color-topbar-bg)]" />
            )}
          </button>

            {/* ── HUD Glass Task-Hub popover ───────────────────────────────
                Glassmorphism container: semi-transparent bg + backdrop-blur.
                Soft status pills, ghost download button, "New" badge,
                success glow row animation, indeterminate progress bar on active jobs.
            */}
            {hudOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
                style={{
                  // Glassmorphism: blurred, semi-transparent surface
                  background: 'rgba(255,255,255,0.82)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderColor: 'rgba(0,0,0,0.08)',
                }}
              >
                {/* ── Popover header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                      Background Tasks
                    </span>
                    {/* Active count badge — shows how many jobs are still running */}
                    {hasActive && (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-brand-light)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-brand)]">
                        {jobs.filter(j => j.status === 'pending' || j.status === 'processing').length} running
                      </span>
                    )}
                  </div>
                  {/* Refresh button — minimal icon style */}
                  <button
                    type="button"
                    aria-label="Refresh"
                    onClick={fetchJobs}
                    className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-black/5 hover:text-[var(--color-text-primary)]"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M8 16H3v5" />
                    </svg>
                  </button>
                </div>

                {/* ── Job rows ───────────────────────────────────────────────── */}
                <ul className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.1) transparent' }}>
                  {recentJobs.map((job, idx) => {
                    // "New" = completed/failed within the last 30 seconds
                    const ageMs = Date.now() - new Date(job.createdAt).getTime();
                    const isNew = (job.status === 'completed' || job.status === 'failed') && ageMs < 30_000;
                    // Success glow: completed + very recent (< 5 s) → brief green tint
                    const isGlowing = job.status === 'completed' && ageMs < 5_000;
                    const isActive = job.status === 'pending' || job.status === 'processing';

                    return (
                      <li
                        key={job.jobId}
                        className="relative px-4 py-3 transition-colors hover:bg-black/[0.03]"
                        style={{
                          // Subtle separator — 10% opacity border between rows
                          borderTop: idx > 0 ? '1px solid rgba(0,0,0,0.06)' : undefined,
                          // Success glow: soft green background on fresh completions
                          background: isGlowing ? 'rgba(34,197,94,0.07)' : undefined,
                        }}
                      >
                        <div className="flex items-center gap-3">

                          {/* ── Status pill badge ──────────────────────────────
                              Soft coloured pill replaces the bare ring icon.
                              Active: blue pill with spinner. Done: green pill. Failed: red pill. */}
                          <div className="shrink-0">
                            {isActive
                              ? (
                                  // Blue pill with mini spinning ring
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-brand)]">
                                    {/* Tiny spinner */}
                                    <svg width="9" height="9" viewBox="0 0 16 16" className="animate-spin" style={{ animationDuration: '1s' }}>
                                      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
                                      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="20 31.4" strokeLinecap="round" transform="rotate(-90 8 8)" />
                                    </svg>
                                    Running
                                  </span>
                                )
                              : job.status === 'completed'
                                ? (
                                    // Soft green pill
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]">
                                      {/* Check icon */}
                                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                      Done
                                    </span>
                                  )
                                : (
                                    // Soft red pill
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-semibold text-[#dc2626]">
                                      {/* X icon */}
                                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                      Failed
                                    </span>
                                  )}
                          </div>

                          {/* ── Job details ────────────────────────────────────── */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
                                Export CSV
                              </p>
                              {/* "New" pulsing dot — shown when job finished while user was away */}
                              {isNew && (
                                <span className="relative flex size-2 shrink-0">
                                  {/* Animated ping ring */}
                                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-brand)] opacity-60" style={{ animationDuration: '1.5s' }} />
                                  {/* Solid centre dot */}
                                  <span className="relative inline-flex size-2 rounded-full bg-[var(--color-brand)]" />
                                </span>
                              )}
                            </div>
                            {/* Timestamp in muted small text */}
                            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                              {formatDate(job.createdAt)}
                            </p>
                          </div>

                          {/* ── Download ghost button / error label ────────────── */}
                          <div className="shrink-0">
                            {job.status === 'completed' && job.downloadUrl
                              ? (
                                  // Ghost button: subtle border + icon, turns brand-blue on hover
                                  <a
                                    href={job.downloadUrl}
                                    download
                                    onClick={() => setHudOpen(false)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white/60 px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-light)] hover:text-[var(--color-brand)]"
                                  >
                                    {/* Download arrow icon */}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="7 10 12 15 17 10" />
                                      <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Save
                                  </a>
                                )
                              : job.status === 'failed'
                                ? (
                                    // Error label — clicking could show details (no-op for now)
                                    <span className="text-[10px] font-medium text-[#dc2626]">
                                      {job.error ? 'See error' : 'Failed'}
                                    </span>
                                  )
                                : null}
                          </div>
                        </div>

                        {/* ── Indeterminate progress bar for active jobs ──────────
                            A thin animated bar at the bottom of each running job row.
                            Uses a sliding gradient to signal ongoing activity. */}
                        {isActive && (
                          <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-brand-light)]">
                            <div
                              className="h-full w-1/2 rounded-full bg-[var(--color-brand)]"
                              style={{ animation: 'progress-slide 1.6s ease-in-out infinite' }}
                            />
                          </div>
                        )}

                        {/* Inline keyframe for the indeterminate progress slide */}
                        {isActive && (
                          <style>{`
                            @keyframes progress-slide {
                              0%   { transform: translateX(-100%); }
                              100% { transform: translateX(300%); }
                            }
                          `}</style>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* ── Footer — centred "View all" secondary button ────────────── */}
                <div
                  className="px-4 py-3 text-center"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <Link
                    href={CLIENT_ROUTES.exportJobs}
                    onClick={() => setHudOpen(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white/50 px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-light)] hover:text-[var(--color-brand)]"
                  >
                    View all export jobs
                    {/* Arrow icon */}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
        </div>

        {/* Notification bell button + popover */}
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(prev => !prev)}
            className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
            aria-label={t('notification_bell_label')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          {/* Notifications popover */}
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t('notifications_title')}</span>
              </div>
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p className="text-xs text-[var(--color-text-muted)]">{t('notifications_empty')}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Fuel Gauge Credits widget ──────────────────────────────────────
            Always-visible compact bar in the topbar.
            Click opens a popover with full breakdown + Go Unlimited CTA.
        */}
        <div ref={creditsRef} className="relative">
          <button
            type="button"
            onClick={handleCreditsToggle}
            aria-label="Credits"
            className="group flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 hover:bg-[var(--color-surface-subtle)] transition-colors"
          >
            {/* Battery icon — segments light up based on fill level */}
            <FuelBatteryIcon pct={
              credits === 'loading' || credits === null
                ? null // unknown — show grey
                : credits.remaining === Infinity
                  ? 1   // unlimited → full
                  : credits.dailyLimit > 0
                    ? credits.remaining / credits.dailyLimit
                    : 0
            }
            />

            {/* Compact text: "240 / 5,000" or "∞" for unlimited */}
            <span className="hidden text-[11px] font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] sm:block">
              {credits === 'loading' || credits === null
                ? '…'
                : credits.remaining === Infinity
                  ? '∞'
                  : `${credits.remaining.toLocaleString()} / ${credits.dailyLimit.toLocaleString()}`}
            </span>
          </button>

          {/* ── Credits popover ──────────────────────────────────────────────── */}
          {creditsOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">

              {/* Header */}
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">Daily credits</span>
              </div>

              {/* Body */}
              <div className="px-4 py-4">
                {credits === 'loading' || credits === null
                  ? (
                      // Loading skeleton
                      <div className="space-y-2">
                        <div className="h-3 w-40 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
                        <div className="h-4 w-full animate-pulse rounded-full bg-[var(--color-surface-subtle)]" />
                      </div>
                    )
                  : credits.remaining === Infinity
                    ? (
                        // Unlimited plan — full solid bar
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-[var(--color-brand)]">Unlimited plan active</p>
                          {/* Full bar in brand colour */}
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-subtle)]">
                            <div className="h-full w-full rounded-full bg-[var(--color-brand)]" />
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)]">No credit limit on reveals or exports</p>
                        </div>
                      )
                    : (() => {
                        // Free plan — calculate fill % and derive colour
                        const pct = credits.dailyLimit > 0 ? credits.remaining / credits.dailyLimit : 0;
                        // Red below 20%, amber below 50%, brand green otherwise
                        const barColour = pct < 0.2
                          ? '#ef4444'
                          : pct < 0.5
                            ? '#f59e0b'
                            : 'var(--color-brand)';

                        // Format reset time
                        const resetsAt = credits.resetsAt
                          ? new Date(credits.resetsAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })
                          : null;

                        return (
                          <div className="space-y-3">

                            {/* Count row */}
                            <div className="flex items-baseline justify-between">
                              <span
                                className="text-2xl font-bold tabular-nums"
                                style={{ color: barColour }}
                              >
                                {credits.remaining.toLocaleString()}
                              </span>
                              <span className="text-xs text-[var(--color-text-muted)]">
                                of {credits.dailyLimit.toLocaleString()} credits
                              </span>
                            </div>

                            {/* Segmented fuel bar */}
                            <SegmentedBar pct={pct} colour={barColour} />

                            {/* Low-credit warning */}
                            {pct < 0.2 && (
                              <p className="flex items-center gap-1 text-xs font-medium text-[#ef4444]">
                                {/* Warning triangle icon */}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                Running low — upgrade to never run out
                              </p>
                            )}

                            {/* Resets at */}
                            {resetsAt && (
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                Resets daily at {resetsAt}
                              </p>
                            )}
                          </div>
                        );
                      })()}
              </div>

              {/* "View plans" CTA — only shown when user is not on enterprise */}
              {credits !== 'loading' && credits !== null && credits.remaining !== Infinity && (
                <div className="border-t border-[var(--color-border)] px-4 py-3">
                  <button
                    type="button"
                    onClick={handleOpenPricingModal}
                    className="w-full rounded-[var(--radius-md)] bg-[var(--color-brand)] py-2 text-xs font-semibold text-white hover:bg-[var(--color-brand-dark)] transition-colors"
                  >
                    {t('go_unlimited_button')} — view plans
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User email + avatar dropdown */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
            onClick={() => setUserMenuOpen(prev => !prev)}
          >
            {/* Avatar circle with initials */}
            <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-xs font-semibold text-[var(--color-brand-dark)]">
              {props.userEmail.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[160px] truncate sm:block">{props.userEmail}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-md)]">
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  {t('sign_out')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* ── Pricing modal ────────────────────────────────────────────────────────
        Full-screen overlay with 3 plan cards.
        Opened by "View plans" button in the credits popover.
        User can upgrade from any plan to any other plan.
    ───────────────────────────────────────────────────────────────────────── */}
    {pricingModalOpen && (
      <div
        // Backdrop — click outside to close
        onClick={() => setPricingModalOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Modal panel — stop click propagation so clicking inside doesn't close */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            padding: 32,
            width: '100%',
            maxWidth: 780,
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Choose a plan
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                All plans include CSV export, lead search, and full dashboard access.
              </p>
            </div>
            {/* Close button */}
            <button
              type="button"
              onClick={() => setPricingModalOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* 3 pricing cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {(
              [
                {
                  tier: 'starter' as const,
                  label: 'Starter',
                  price: '$49',
                  credits: '60,000 reveals/mo',
                  features: ['60k monthly credits', 'Resets on 1st of month', 'CSV export', 'Email support'],
                  accent: '#10b981',
                  accentBg: '#10b98112',
                  accentBorder: '#10b98144',
                },
                {
                  tier: 'pro' as const,
                  label: 'Pro',
                  price: '$79',
                  credits: '150,000 reveals/mo',
                  features: ['150k monthly credits', 'Resets on 1st of month', 'CSV export', 'Priority support'],
                  accent: '#6366f1',
                  accentBg: '#6366f112',
                  accentBorder: '#6366f144',
                },
                {
                  tier: 'enterprise' as const,
                  label: 'Enterprise',
                  price: '$99',
                  credits: 'Unlimited reveals',
                  features: ['Unlimited monthly credits', 'No reset needed', 'CSV export', 'Dedicated support'],
                  accent: '#ec4899',
                  accentBg: '#ec489912',
                  accentBorder: '#ec489944',
                },
              ] as const
            ).map(plan => {
              // Highlight the user's current plan
              const isCurrent = credits !== 'loading' && credits !== null && credits.plan === plan.tier;
              return (
                <div
                  key={plan.tier}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    padding: 20,
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isCurrent ? plan.accentBorder : 'var(--color-border)'}`,
                    backgroundColor: isCurrent ? plan.accentBg : 'var(--color-surface)',
                    position: 'relative',
                  }}
                >
                  {/* "Current plan" pill */}
                  {isCurrent && (
                    <span style={{
                      position: 'absolute',
                      top: -11,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 10px',
                      borderRadius: 9999,
                      backgroundColor: plan.accent,
                      color: '#fff',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>
                      Current plan
                    </span>
                  )}

                  {/* Plan name + credit summary */}
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: isCurrent ? plan.accent : 'var(--color-text-primary)', margin: 0 }}>
                      {plan.label}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                      {plan.credits}
                    </p>
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary)' }}>{plan.price}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>/mo</span>
                  </div>

                  {/* Feature list */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent
                    ? (
                        <div style={{ padding: '9px 0', textAlign: 'center', fontSize: 13, fontWeight: 600, color: plan.accent, borderTop: `1px solid ${plan.accentBorder}` }}>
                          ✓ Active
                        </div>
                      )
                    : (
                        <button
                          type="button"
                          onClick={() => handleCheckout(plan.tier)}
                          disabled={checkoutLoading}
                          style={{
                            padding: '10px 0',
                            backgroundColor: plan.accent,
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: checkoutLoading ? 'wait' : 'pointer',
                            opacity: checkoutLoading ? 0.7 : 1,
                            transition: 'opacity 0.15s',
                            width: '100%',
                          }}
                        >
                          {checkoutLoading ? 'Redirecting…' : `Get ${plan.label}`}
                        </button>
                      )}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p style={{ margin: '20px 0 0', fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            All plans are billed monthly. Cancel anytime from Settings → Subscription.
          </p>
        </div>
      </div>
    )}
  </>
  );
}
