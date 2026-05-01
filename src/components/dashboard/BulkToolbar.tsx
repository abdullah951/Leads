'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { API_ROUTES } from '@/constants/apiRoutes';
import type { FilterState } from '@/hooks/useFilterState';
import { Spinner } from './Spinner';
import { SyncToCrmButton } from './SyncToCrmButton';
// Import the shared generic upsell modal and its context type
import { UpsellModal } from './UpsellModal';
import type { UpsellContext } from './UpsellModal';

// 'save-search' replaced with 'favourite' — colour-tagged bookmarking modal
type DialogType = 'export' | 'add-to-list' | 'favourite' | null;

// ── Free plan per-action batch limit ─────────────────────────────────────────
// Users on the free plan may not bulk-act on more than this many leads at once.
// Matches the limit shown in UpsellModal and enforced by the backend.
const FREE_LIMIT = 20;

type Props = {
  selectedIds: number[];
  totalFiltered: number;
  filters: FilterState;
  onClearSelection: () => void;
  onExportComplete: () => void;
  /** Called after a new list is successfully created so the sidebar can refresh its list. */
  onListCreated: () => void;
};

type UserList = { id: number; label: string };

/**
 * Sticky toolbar that appears when leads are selected.
 * Provides bulk export, add-to-list, favourite, and CRM sync actions.
 * On the free plan, actions on more than FREE_LIMIT leads show an upsell modal.
 */
export function BulkToolbar(props: Props) {
  const t = useTranslations('BulkToolbar');

  // ── Dialog state ──────────────────────────────────────────────────────────
  // Which inner dialog (export / add-to-list / favourite) is currently open
  const [dialog, setDialog] = useState<DialogType>(null);

  // ── Upsell state ──────────────────────────────────────────────────────────
  // Non-null when the upsell modal should be shown.
  // `context` determines the copy; `available` and `required` drive the progress bar.
  // `onProceedAvailable` is called when the user clicks the partial-proceed button.
  const [upsell, setUpsell] = useState<{
    context: UpsellContext;
    available: number;        // credits the user currently has
    required: number;         // credits needed (leads count)
    onProceedAvailable: () => void; // called when user picks the partial path
  } | null>(null);

  // ── Plan check cache ──────────────────────────────────────────────────────
  // null = not yet fetched. true = paid plan, false = free plan.
  // Cached so we only hit the API once per toolbar mount.
  const [isPaid, setIsPaid] = useState<boolean | null>(null);

  // ── Limited-ids state ─────────────────────────────────────────────────────
  // When the user clicks "Limit this batch to FREE_LIMIT" from the upsell modal
  // we store the sliced ids here so dialogs use the limited set instead of all.
  // null means "use all selectedIds".
  const [limitedIds, setLimitedIds] = useState<number[] | null>(null);

  // ── checkPlan helper ──────────────────────────────────────────────────────
  /**
   * Fetches the user's credit balance to determine if they are on a paid plan.
   * Result is cached in `isPaid` state so subsequent calls skip the network.
   *
   * @returns True if paid/unlimited plan, false if on the free plan.
   */
  async function checkPlan(): Promise<boolean> {
    // Return the cached value if we've already checked
    if (isPaid !== null) return isPaid;

    try {
      const res = await fetch(API_ROUTES.credits.balance, { method: 'POST', body: '{}' });
      const data = await res.json() as { remaining: number | null; dailyLimit: number | null };
      // Unlimited plan indicators: remaining is null (no cap) or Infinity
      const paid = data.remaining === null || data.remaining === Infinity || data.dailyLimit === Infinity;
      setIsPaid(paid);
      return paid;
    } catch {
      // If the request fails, treat as free to be safe (conservative)
      setIsPaid(false);
      return false;
    }
  }

  // ── handleUpgrade helper ──────────────────────────────────────────────────
  /**
   * Closes the upsell modal and starts a Stripe checkout session.
   * Redirects the browser to the Stripe-hosted checkout page.
   */
  async function handleUpgrade() {
    // Dismiss the modal before navigating away
    setUpsell(null);
    try {
      const res = await fetch(API_ROUTES.stripe.checkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) {
        const data = await res.json() as { url?: string };
        // Redirect to Stripe's hosted checkout page
        if (data.url) window.location.href = data.url;
      }
    } catch {
      // Swallow — user can find the upgrade link elsewhere
    }
  }

  if (props.selectedIds.length === 0) return null;

  return (
    <>
      {/* ── Floating action bar — styled to match RevealHistoryView's FAB ─── */}
      <div
        className="fixed bottom-6 left-1/2 z-[var(--z-modal)] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-lg"
      >
        {/* Selected count badge — brand-tinted pill matching RevealHistory */}
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]">
          {t('selected_count', { count: props.selectedIds.length })}
        </span>

        {/* Divider */}
        <span className="w-px h-5 bg-[var(--color-border)]" />

        {/* Export CSV — filled brand button (matches RevealHistory's export btn).
            Gated: if free plan and >FREE_LIMIT selected, shows upsell modal first. */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] transition-colors duration-150"
          onClick={async () => {
            // Fetch current credit balance to determine available credits for this export
            const res = await fetch(API_ROUTES.credits.balance, { method: 'POST', body: '{}' });
            const data = await res.json() as { remaining: number | null; dailyLimit: number | null };
            // Unlimited plan: remaining is null (no cap) or Infinity; dailyLimit Infinity = enterprise
            const isPaidPlan = data.remaining === null || data.remaining === Infinity || data.dailyLimit === Infinity;

            if (isPaidPlan) {
              // Paid users always get full access — skip upsell and open export dialog
              setLimitedIds(null);
              setDialog('export');
              return;
            }

            // Free plan: check if user has enough credits for all selected leads
            const available = data.remaining ?? 0;
            if (props.selectedIds.length > available) {
              // Not enough credits — show the credit-aware upsell modal.
              // onProceedAvailable: proceed with only the first `available` leads
              setUpsell({
                context: 'export',
                available,
                required: props.selectedIds.length,
                onProceedAvailable: () => {
                  // Slice selectedIds to the affordable count and open export dialog
                  setLimitedIds(props.selectedIds.slice(0, available));
                  setDialog('export');
                  setUpsell(null);
                },
              });
              return;
            }

            // Enough credits for all selected leads — proceed normally
            setLimitedIds(null);
            setDialog('export');
          }}
        >
          {/* Download icon */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {t('export_button')}
        </button>

        {/* Add to list — outlined button (matches RevealHistory).
            Gated: if free plan and >FREE_LIMIT selected, shows upsell modal first. */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors duration-150"
          onClick={async () => {
            // Check plan before allowing bulk add-to-list
            const paid = await checkPlan();
            if (!paid && props.selectedIds.length > FREE_LIMIT) {
              // Free plan exceeded — show upsell with count-based available/required
              setUpsell({
                context: 'add-to-list',
                available: FREE_LIMIT,
                required: props.selectedIds.length,
                onProceedAvailable: () => {
                  // Proceed with only FREE_LIMIT leads
                  setLimitedIds(props.selectedIds.slice(0, FREE_LIMIT));
                  setDialog('add-to-list');
                  setUpsell(null);
                },
              });
              return;
            }
            // Within free limit or paid plan — proceed with all leads
            setLimitedIds(null);
            setDialog('add-to-list');
          }}
        >
          {/* List-plus icon */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6" />
          </svg>
          {t('add_to_list_button')}
        </button>

        {/* Favourite — star icon outlined button.
            Gated: if free plan and >FREE_LIMIT selected, shows upsell modal first. */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors duration-150"
          onClick={async () => {
            // Check plan before allowing bulk favourite
            const paid = await checkPlan();
            if (!paid && props.selectedIds.length > FREE_LIMIT) {
              // Free plan exceeded — show upsell with count-based available/required
              setUpsell({
                context: 'favourites',
                available: FREE_LIMIT,
                required: props.selectedIds.length,
                onProceedAvailable: () => {
                  // Proceed with only FREE_LIMIT leads
                  setLimitedIds(props.selectedIds.slice(0, FREE_LIMIT));
                  setDialog('favourite');
                  setUpsell(null);
                },
              });
              return;
            }
            // Within free limit or paid plan — proceed with all leads
            setLimitedIds(null);
            setDialog('favourite');
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Favourite
        </button>

        {/* Sync to CRM — unified integration tray.
            Passes an onUpsell callback so SyncToCrmButton can gate the action
            before opening its provider tray. */}
        <SyncToCrmButton
          selectedPersonIds={props.selectedIds}
          className="border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
          onUpsell={async () => {
            // Fetch credit balance to determine if user can afford the CRM sync
            const res = await fetch(API_ROUTES.credits.balance, { method: 'POST', body: '{}' });
            const data = await res.json() as { remaining: number | null; dailyLimit: number | null };
            // Paid plan check — same logic as export button above
            const isPaidPlan = data.remaining === null || data.remaining === Infinity || data.dailyLimit === Infinity;
            // Paid users: return without setting upsell so SyncToCrmButton opens normally
            if (isPaidPlan) return;

            const available = data.remaining ?? 0;
            if (props.selectedIds.length > available) {
              // Show credit-aware upsell for CRM sync context
              setUpsell({
                context: 'sync-to-crm',
                available,
                required: props.selectedIds.length,
                onProceedAvailable: () => {
                  // For CRM sync we don't control the tray's flow internally,
                  // so just close the modal — user can manually reduce selection
                  setUpsell(null);
                },
              });
            }
            // If within credits, return void and SyncToCrmButton will open normally
          }}
        />

        {/* Clear selection — × button */}
        <button
          type="button"
          className="ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-sm leading-none"
          onClick={props.onClearSelection}
          aria-label={t('clear_selection_aria')}
        >
          ✕
        </button>
      </div>

      {/* ── Action dialogs ─────────────────────────────────────────────────
          Each dialog receives `limitedIds ?? props.selectedIds` so that when the
          user accepted the "Limit this batch to FREE_LIMIT" option from the upsell
          modal, the dialog only operates on the sliced subset. */}
      {dialog !== null && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40"
          onClick={() => setDialog(null)}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)]"
            onClick={e => e.stopPropagation()}
          >
            {dialog === 'export' && (
              <ExportDialog
                // Use limited ids when the user chose the "proceed limited" path from upsell
                selectedIds={limitedIds ?? props.selectedIds}
                filters={props.filters}
                onClose={() => { setDialog(null); setLimitedIds(null); }}
                onComplete={props.onExportComplete}
              />
            )}
            {dialog === 'add-to-list' && (
              <AddToListDialog
                selectedIds={limitedIds ?? props.selectedIds}
                onClose={() => { setDialog(null); setLimitedIds(null); }}
                onListCreated={props.onListCreated}
              />
            )}
            {/* Favourite dialog — tag picker for selected leads */}
            {dialog === 'favourite' && (
              <FavouriteDialog
                selectedIds={limitedIds ?? props.selectedIds}
                onClose={() => { setDialog(null); setLimitedIds(null); }}
                onComplete={props.onClearSelection}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Upsell modal ────────────────────────────────────────────────────
          Rendered outside the floating bar so it overlays everything (z-[300]).
          Shown when a free-plan user tries to act on more than FREE_LIMIT leads. */}
      {/* ── Upsell modal ────────────────────────────────────────────────────
          Shown when a free-plan user exceeds their credit balance for any bulk action.
          available/required drive the progress bar and body copy in the modal.
          onProceedAvailable is stored on the upsell state and varies per action context:
            - export: opens ExportDialog with sliced ids
            - add-to-list: opens AddToListDialog with sliced ids
            - favourites: opens FavouriteDialog with sliced ids
            - sync-to-crm: just closes the modal */}
      {upsell !== null && (
        <UpsellModal
          context={upsell.context}
          available={upsell.available}
          required={upsell.required}
          onUpgrade={handleUpgrade}
          onProceedAvailable={upsell.onProceedAvailable}
          onClose={() => setUpsell(null)}
        />
      )}
    </>
  );
}

/* ── Export Dialog ─────────────────────────────────────────────────── */

function ExportDialog(props: {
  selectedIds: number[];
  filters: FilterState;
  onClose: () => void;
  onComplete: () => void;
}) {
  const t = useTranslations('BulkToolbar');
  const [mode, setMode] = useState<'selected' | 'all'>('selected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  async function submit() {
    setLoading(true);
    setError('');
    try {
      let body: Record<string, unknown>;

      if (mode === 'selected') {
        // Sync export: specific person IDs — returns downloadUrl immediately
        body = { selectedPersons: props.selectedIds };
      } else {
        // Background export: apply current filters, cap at 25,000 leads
        // The API queues a background job and returns { jobId, status: 'pending' }
        body = {
          export: true,
          limit: 25000,
          filters: buildFilterPayload(props.filters),
        };
      }

      const res = await fetch(API_ROUTES.leads.export, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? t('export_error'));
        return;
      }

      if (data.downloadUrl) {
        // Sync export finished immediately — show download link
        setDownloadUrl(data.downloadUrl);
      } else {
        // Background job queued — close dialog; HUD in the topbar will track progress
        props.onComplete();
        props.onClose();
      }
    } catch {
      setError(t('export_error'));
    } finally {
      setLoading(false);
    }
  }

  if (downloadUrl) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('export_ready_title')}</h2>
        <a
          href={downloadUrl}
          download
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)]"
          onClick={() => { props.onClose(); props.onComplete(); }}
        >
          {t('download_button')}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('export_title')}</h2>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
          <input
            type="radio"
            name="export-mode"
            value="selected"
            checked={mode === 'selected'}
            onChange={() => setMode('selected')}
            className="accent-[var(--color-brand)]"
          />
          {t('export_mode_selected', { count: props.selectedIds.length })}
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
          <input
            type="radio"
            name="export-mode"
            value="all"
            checked={mode === 'all'}
            onChange={() => setMode('all')}
            className="accent-[var(--color-brand)]"
          />
          {/* Fixed label: always exports up to 25,000 leads matching current filters */}
          Export 25,000 leads
        </label>
      </div>

      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          onClick={props.onClose}
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-60"
          onClick={submit}
        >
          {loading && <Spinner size={13} />}
          {loading ? t('exporting') : t('export_confirm')}
        </button>
      </div>
    </div>
  );
}

/* ── Add to List Dialog ────────────────────────────────────────────── */

function AddToListDialog(props: { selectedIds: number[]; onClose: () => void; onListCreated: () => void }) {
  const t = useTranslations('BulkToolbar');
  const [lists, setLists] = useState<UserList[]>([]);
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load lists on mount
  useEffect(() => {
    fetch(API_ROUTES.lists.all, { method: 'POST', body: '{}' })
      .then(r => r.json())
      .then((data: UserList[]) => setLists(data))
      .catch(() => {});
  }, []);

  async function addToList(listId: number) {
    setLoading(true);
    setError('');
    try {
      // API expects { lists: number[], selectedPersons: number[] }
      const res = await fetch(API_ROUTES.lists.addLeads, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: [listId], selectedPersons: props.selectedIds }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message ?? t('list_error'));
        return;
      }
      setSuccess(true);
      setTimeout(props.onClose, 1000);
    } catch {
      setError(t('list_error'));
    } finally {
      setLoading(false);
    }
  }

  async function createAndAdd() {
    // Show a visible error instead of silently doing nothing when name is empty
    if (!newListName.trim()) {
      setError(t('name_required'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const createRes = await fetch(API_ROUTES.lists.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName: newListName.trim() }),
      });
      if (!createRes.ok) {
        const d = await createRes.json();
        setError(d.message ?? t('list_error'));
        return;
      }
      // Server returns { listId, listName } — read listId to pass to addToList
      const { listId } = await createRes.json();
      await addToList(listId);
      // Notify the parent so it can increment listVersion and trigger a Sidebar re-fetch
      props.onListCreated();
    } catch {
      setError(t('list_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('add_to_list_title')}</h2>

      {success
        ? (
            <p className="text-sm text-[var(--color-success)]">{t('list_success')}</p>
          )
        : (
            <>
              {lists.length > 0 && (
                <ul className="max-h-48 overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
                  {lists.map(list => (
                    <li key={list.id}>
                      <button
                        type="button"
                        disabled={loading}
                        className="w-full px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
                        onClick={() => addToList(list.id)}
                      >
                        {list.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder={t('new_list_placeholder')}
                  className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <button
                  type="button"
                  disabled={loading || !newListName.trim()}
                  className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-60"
                  onClick={createAndAdd}
                >
                  {t('create_and_add')}
                </button>
              </div>

              {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                  onClick={props.onClose}
                >
                  {t('cancel')}
                </button>
              </div>
            </>
          )}
    </div>
  );
}

/* ── Favourite Dialog ──────────────────────────────────────────────── */

// Preset colour-coded tags the user can pick from
const PRESET_TAGS = [
  { name: 'High Priority', color: '#ef4444', emoji: '🔥' },
  { name: 'Follow Up', color: '#3b82f6', emoji: '⏳' },
  { name: 'Hot Lead', color: '#f97316', emoji: '⚡' },
  { name: 'Interested', color: '#22c55e', emoji: '✅' },
  { name: 'Long Term', color: '#8b5cf6', emoji: '📅' },
  { name: 'No Contact', color: '#6b7280', emoji: '🚫' },
] as const;

/**
 * Modal shown when the user clicks "Favourite" in the BulkToolbar.
 * Lets the user pick a colour-coded tag, then POSTs to /api/favorites/add.
 * After success, clears the selection and closes the modal.
 */
function FavouriteDialog(props: {
  selectedIds: number[];
  onClose: () => void;
  onComplete: () => void;
}) {
  // The currently selected tag index (null = none picked yet)
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // When true (single-lead flow), shows "already in favourites" instead of "added"
  const [alreadyExists, setAlreadyExists] = useState(false);

  async function save() {
    if (selectedTag === null) return;
    const tag = PRESET_TAGS[selectedTag]!;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ROUTES.favorites.add, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: props.selectedIds,
          tagName: tag.name,
          tagColor: tag.color,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message ?? 'Failed to add to favourites');
        return;
      }

      const data = await res.json() as { added: number; skipped: number; alreadyExists: boolean };

      // Single-lead: if already favourited with this tag, show special message
      // Multi-lead: silently succeed (new leads were added, duplicates skipped)
      if (props.selectedIds.length === 1 && data.alreadyExists) {
        setAlreadyExists(true);
        setSuccess(true);
        // Keep the dialog open a bit longer so user can read the message
        setTimeout(() => { props.onClose(); }, 2000);
      } else {
        setAlreadyExists(false);
        setSuccess(true);
        setTimeout(() => { props.onComplete(); props.onClose(); }, 1000);
      }
    } catch {
      setError('Failed to add to favourites');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Add to Favourites
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {props.selectedIds.length} lead{props.selectedIds.length !== 1 ? 's' : ''} selected — pick a tag
        </p>
      </div>

      {success
        ? (
            // Success / already-exists feedback banner
            <div
              className={[
                'flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2',
                // Use amber tint when the lead was already favourited, green for a fresh add
                alreadyExists
                  ? 'bg-[#fef9c3]'   // amber-100 tint
                  : 'bg-[#dcfce7]',  // green-100 tint
              ].join(' ')}
            >
              <span className={alreadyExists ? 'text-[#b45309]' : 'text-[var(--color-success)]'}>
                {alreadyExists ? '★' : '✓'}
              </span>
              <p className={`text-sm ${alreadyExists ? 'text-[#b45309]' : 'text-[var(--color-success)]'}`}>
                {/* Single-lead duplicate → informational message; otherwise success */}
                {alreadyExists ? 'Lead already added to Favourites' : 'Added to favourites!'}
              </p>
            </div>
          )
        : (
            <>
              {/* Tag picker grid — glassmorphism style pills */}
              <div className="grid grid-cols-2 gap-2">
                {PRESET_TAGS.map((tag, i) => {
                  const isSelected = selectedTag === i;
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => setSelectedTag(i)}
                      className={[
                        // Base: semi-transparent background with coloured border
                        'flex items-center gap-2 rounded-[var(--radius-lg)] border px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isSelected
                          // Selected: solid colour fill + white text
                          ? 'border-transparent text-white shadow-[0_0_12px_2px] scale-[1.02]'
                          // Unselected: very light tinted bg, coloured text
                          : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] hover:scale-[1.01]',
                      ].join(' ')}
                      style={{
                        // Active: use the tag colour as background + glow
                        backgroundColor: isSelected ? tag.color : undefined,
                        boxShadow: isSelected ? `0 0 12px 2px ${tag.color}55` : undefined,
                        // Unselected: faint tint of the tag colour as background
                        ...(!isSelected ? { backgroundColor: `${tag.color}18` } : {}),
                      }}
                    >
                      <span>{tag.emoji}</span>
                      <span style={{ color: isSelected ? 'white' : tag.color }}>{tag.name}</span>
                    </button>
                  );
                })}
              </div>

              {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                  onClick={props.onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading || selectedTag === null}
                  className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-60"
                  onClick={save}
                >
                  {loading && <Spinner size={13} />}
                  {loading ? 'Saving…' : 'Add to Favourites'}
                </button>
              </div>
            </>
          )}
    </div>
  );
}

/* ── Helper ─────────────────────────────────────────────────────────── */

function buildFilterPayload(filters: FilterState) {
  return {
    jobTitleIds: filters.jobTitles.map(f => f.id),
    locationIds: filters.locations.map(f => f.id),
    industryIds: filters.industries.map(f => f.id),
    technologyIds: filters.technologies.map(f => f.id),
    skillIds: filters.skills.map(f => f.id),
    managementLevelIds: filters.managementLevels.map(f => f.id),
    departmentIds: filters.departments.map(f => f.id),
    companySizeIds: filters.companySizes.map(f => f.id),
    companies: filters.companies.map(f => f.label),
    educationMajorIds: filters.educationMajors.map(f => f.id),
    listId: filters.listId,
  };
}
