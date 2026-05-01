'use client';

// ── UpsellModal ────────────────────────────────────────────────────────────────
// Credit-aware upsell modal shown when a user tries to act on more leads than
// they have credits for. Displays:
//   - A contextual headline based on the action type (export / add-to-list / etc.)
//   - A two-line body explaining how many leads they want vs how many credits remain
//   - A progress bar visualising available vs required credits
//   - An upgrade card with shimmer gradient CTA and context-specific feature bullets
//   - Two escape hatches: "proceed with available N" (if credits > 0) or "Maybe later"
//
// Contexts: export | add-to-list | favourites | sync-to-crm
// ─────────────────────────────────────────────────────────────────────────────

// ── Type exports ─────────────────────────────────────────────────────────────

/**
 * Which bulk action triggered the upsell. Used to customise headlines,
 * body copy, feature bullets, and the partial-proceed button label.
 */
export type UpsellContext = 'export' | 'add-to-list' | 'favourites' | 'sync-to-crm';

// ── Copy helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the modal title for the given context.
 * All titles are uppercase for visual urgency.
 *
 * @param context - Which action triggered the modal.
 * @returns Uppercase title string including rocket emoji prefix.
 */
function getTitle(context: UpsellContext): string {
  // Each context gets a tailored headline to feel relevant to what was blocked.
  switch (context) {
    case 'export':       return '🚀 READY TO SCALE';
    case 'add-to-list':  return '🚀 READY TO SCALE';
    case 'favourites':   return '🚀 READY TO SCALE';
    case 'sync-to-crm':  return '🚀 READY TO SCALE';
  }
}

/**
 * Returns the action verb used in the first body line.
 * e.g. "You are trying to **export** 4 leads."
 *
 * @param context - Which action triggered the modal.
 * @returns Lowercase verb string.
 */
function getActionVerb(context: UpsellContext): string {
  switch (context) {
    case 'export':       return 'export';
    case 'add-to-list':  return 'add';
    case 'favourites':   return 'star';
    case 'sync-to-crm':  return 'sync';
  }
}

/**
 * Returns the label for the partial-proceed ghost button at the bottom.
 * Replaces {n} with the available credit count at render time.
 *
 * @param context - Which action triggered the modal.
 * @param available - Number of credits the user currently has.
 * @returns Button label string.
 */
function getProceedLabel(context: UpsellContext, available: number): string {
  // Each context uses its own verb to match what the button actually does.
  switch (context) {
    case 'export':       return `Export only my remaining ${available} leads`;
    case 'add-to-list':  return `Add only ${available} leads`;
    case 'favourites':   return `Star only ${available} leads`;
    case 'sync-to-crm':  return `Sync only ${available} leads`;
  }
}

/**
 * Returns ordered feature bullet strings for the upgrade card.
 * The most-relevant bullet for the blocked action always comes first.
 *
 * @param context - Which action triggered the modal.
 * @returns Array of feature strings (include emoji checkmarks).
 */
function getFeatureBullets(context: UpsellContext): string[] {
  // First bullet is the one most directly relevant to what was blocked.
  switch (context) {
    case 'export':
      return [
        '✅ Unlimited Exports — 25,000+ leads',
        '✅ Mass Add to List & Favorites',
        '✅ Priority Database Access',
      ];
    case 'add-to-list':
      return [
        '✅ Mass Add to List — no batch limits',
        '✅ Unlimited Exports',
        '✅ Priority Database Access',
      ];
    case 'favourites':
      return [
        '✅ Mass Add to List & Favorites',
        '✅ Unlimited Exports',
        '✅ Priority Database Access',
      ];
    case 'sync-to-crm':
      return [
        '✅ Bulk CRM Sync & Automation',
        '✅ Unlimited Exports',
        '✅ Priority Database Access',
      ];
  }
}

// ── UpsellModal component ─────────────────────────────────────────────────────

/**
 * Full-screen credit-aware upsell modal.
 * Shows a progress bar comparing available vs required credits,
 * a shimmer gradient upgrade CTA, and context-specific copy throughout.
 *
 * @param context - Which bulk action triggered the modal (controls all copy & bullets).
 * @param available - Credits the user currently has remaining.
 * @param required - Credits needed to complete the full action (unrevealed leads count).
 * @param onUpgrade - Called when the user clicks the primary "UPGRADE NOW" button.
 * @param onProceedAvailable - Called when the user clicks "proceed with available N" fallback.
 * @param onClose - Called when the user dismisses ("Maybe later") or clicks the backdrop.
 */
export function UpsellModal(props: {
  context: UpsellContext;
  available: number;
  required: number;
  onUpgrade: () => void;
  onProceedAvailable: () => void;
  onClose: () => void;
}) {
  // ── Derived copy ────────────────────────────────────────────────────────
  // Title changes per context (e.g. "UNLOCK YOUR FULL EXPORT")
  const title = getTitle(props.context);

  // Action verb in body line 1 (e.g. "export", "add", "star", "sync")
  const verb = getActionVerb(props.context);

  // Feature bullets inside the upgrade card — ordered by relevance
  const bullets = getFeatureBullets(props.context);

  // Label for the partial-proceed ghost button ("Export only my remaining 2 leads")
  const proceedLabel = getProceedLabel(props.context, props.available);

  // ── Progress bar calculation ─────────────────────────────────────────────
  // Percentage of credits available vs required — clamped to 0–100.
  // E.g. 2 available / 4 required → 50%
  const filledPct = props.required > 0
    ? Math.min(100, Math.round((props.available / props.required) * 100))
    : 0;

  // ── Body HTML strings — safe because all segments come from our own data ──
  // Line 1: "You are trying to export <strong>4</strong> leads."
  const bodyLine1 = `You are trying to ${verb} <strong>${props.required}</strong> leads.`;
  // Line 2: "You currently have <strong>2</strong> credits remaining."
  const bodyLine2 = `You currently have <strong>${props.available}</strong> credits remaining.`;

  return (
    // ── Full-screen backdrop ───────────────────────────────────────────────
    // Semi-transparent dark overlay; clicking outside the panel dismisses the modal.
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={props.onClose}
    >
      {/* ── Modal panel ─────────────────────────────────────────────────── */}
      {/* Stop propagation so clicks inside the panel don't close the modal. */}
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header section ──────────────────────────────────────────────── */}
        {/* Brand-gradient emoji circle + bold title + two-line body copy */}
        <div className="mb-5 flex flex-col items-center text-center">

          {/* Brand-gradient circle with rocket emoji — attention-grabbing visual anchor */}
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
            style={{
              // Gradient matches the shimmer CTA button for visual consistency
              background: 'linear-gradient(135deg, #6366f1 0%, var(--color-brand) 50%, #06b6d4 100%)',
            }}
          >
            🚀
          </div>

          {/* Context-specific title — ALL CAPS for urgency */}
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
            {title}
          </h2>

          {/* Body line 1: "You are trying to [verb] N leads." */}
          {/* Safe: content is built entirely from our own template strings — no user input. */}
          <p
            className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]"
            dangerouslySetInnerHTML={{ __html: bodyLine1 }}
          />

          {/* Body line 2: "You currently have N credits remaining." */}
          <p
            className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]"
            dangerouslySetInnerHTML={{ __html: bodyLine2 }}
          />
        </div>

        {/* ── Progress bar section ─────────────────────────────────────────── */}
        {/* Visualises available credits vs total required in a coloured track. */}
        <div className="mb-5">

          {/* Label row: left = "Credits available", right = "N / M" */}
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--color-text-secondary)]">
              Credits available
            </span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {props.available} / {props.required} Credits Available
            </span>
          </div>

          {/* Track: full-width rounded pill; filled portion is brand blue */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-subtle)]">
            {/* Blue fill — width represents available / required ratio */}
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${filledPct}%`,
                // Use brand colour (blue) to indicate "what you have"
                background: 'var(--color-brand)',
              }}
            />
          </div>

          {/* Caption: motivational nudge to push the user toward upgrading */}
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            Don't leave data behind. Pro members export 25,000+ leads per month without limits.
          </p>
        </div>

        {/* ── Upgrade card ─────────────────────────────────────────────────── */}
        {/* Subtle gradient card containing feature bullets + shimmer CTA button */}
        <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-subtle)] p-4">

          {/* Card header: "GO UNLIMITED" label + amber "BEST VALUE" pill */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
              ✨ GO UNLIMITED (Best Value)
            </p>

            {/* Amber badge — signals this is the recommended plan tier */}
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              BEST VALUE
            </span>
          </div>

          {/* Context-ordered feature bullets — top bullet is most relevant to blocked action */}
          <ul className="mb-4 space-y-1.5">
            {bullets.map(bullet => (
              <li key={bullet} className="text-xs text-[var(--color-text-secondary)]">
                {bullet}
              </li>
            ))}
          </ul>

          {/* Shimmer gradient CTA button ─────────────────────────────────────
              Uses a CSS keyframe shimmer sweep (defined in <style> below).
              Gradient: indigo → brand → cyan for premium feel. */}
          <div className="animate-pulse">
            <button
              type="button"
              onClick={props.onUpgrade}
              className="shimmer-btn relative w-full overflow-hidden rounded-lg px-4 py-2.5 text-sm font-bold text-white"
              style={{
                // Premium gradient: purple → brand blue → cyan
                background: 'linear-gradient(135deg, #6366f1 0%, var(--color-brand) 50%, #06b6d4 100%)',
              }}
            >
              {/* Shimmer sweep overlay — translates left→right indefinitely via keyframe */}
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/20"
                style={{ animation: 'shimmer-sweep 2s ease-in-out infinite' }}
              />

              {/* Button label — sits above the shimmer overlay */}
              <span className="relative">🚀 UPGRADE NOW</span>
            </button>
          </div>

          {/* Social proof — builds trust below the CTA */}
          <p className="mt-2 text-center text-[10px] text-[var(--color-text-muted)]">
            {/* Used by 1,200+ high-growth sales teams. */}
          </p>
        </div>

        {/* ── Bottom action row ─────────────────────────────────────────────── */}
        {/* Two fallback options: partial proceed (only when credits > 0) or dismiss */}
        <div className="flex items-center gap-2">

          {/* Ghost button: "Export only my remaining N leads" (or equivalent per context)
              Only rendered when the user has at least 1 credit — 0 credits = nothing to proceed with. */}
          {props.available > 0 && (
            <button
              type="button"
              onClick={props.onProceedAvailable}
              className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-subtle)]"
            >
              {proceedLabel}
            </button>
          )}

          {/* "Maybe later" text button — plain dismiss without any action */}
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg px-3 py-2 text-xs text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
          >
            Maybe later
          </button>
        </div>
      </div>

      {/* ── Shimmer keyframe definition ─────────────────────────────────────── */}
      {/* Inline <style> avoids polluting global.css for a single animation. */}
      <style>{`
        @keyframes shimmer-sweep {
          0%   { transform: translateX(-110%) skewX(-20deg); }
          60%  { transform: translateX(110%)  skewX(-20deg); }
          100% { transform: translateX(110%)  skewX(-20deg); }
        }
      `}</style>
    </div>
  );
}
