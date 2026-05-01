'use client';

// ── RevealHistoryView ──────────────────────────────────────────────────────────
// Full-page view for /reveal-history.
//
// Features:
//   • Paginated, searchable table of every contact the user has revealed
//   • Checkbox selection → Floating Action Bar (Export CSV / Add to List / HubSpot)
//   • Email deliverability status icons (green ✓ / yellow ⚠ / red ✗)
//   • Credit refund badge "+1 ⚡ Refunded" on undeliverable rows
//   • One-click LinkedIn icon + copy-to-clipboard for emails & phones
//   • "Just Now" blue dot for reveals made within 30 s of page load
//   • Header stat: total credits spent (net of refunds)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { API_ROUTES } from '@/constants/apiRoutes';
import { SyncToCrmButton } from './SyncToCrmButton';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Email verification status values (nullable = never checked) */
type EmailStatus = 'deliverable' | 'risky' | 'undeliverable' | null | undefined;

/** Shape of one row returned by POST /api/reveal-history/list */
type RevealItem = {
  id: number;
  personId: number;
  revealedAt: string;            // ISO-8601 string
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  city: string | null;
  country: string | null;
  linkedIn: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  phone1: string | null;
  phone2: string | null;
  workEmailStatus: EmailStatus;
  personalEmailStatus: EmailStatus;
  creditRefunded: boolean;
};

/** Shape of the API response */
type HistoryResponse = {
  items: RevealItem[];
  total: number;
  totalCreditsSpent: number;
};

/** Shape of one list option for the Add-to-List modal */
type UserList = {
  id: number;
  label: string;
  count: number;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ── Small helper components ────────────────────────────────────────────────────

/** LinkedIn icon (16×16 monochrome) */
function IconLinkedIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      {/* LinkedIn "in" logo path */}
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}


/** Download/export icon */
function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/** List-plus icon for add-to-list */
function IconListPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6" />
    </svg>
  );
}

/** Search icon */
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/** Lightning bolt icon for credits */
function IconBolt() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ── EmailStatusDot ─────────────────────────────────────────────────────────────
// Renders a coloured dot + tooltip for email verification status.

function EmailStatusDot(props: { status: EmailStatus; label: string }) {
  const [show, setShow] = useState(false);

  // Colour by status — null/undefined = neutral grey (not yet verified)
  const dotClass
    = props.status === 'deliverable' ? 'bg-[var(--color-success)]'
    : props.status === 'risky' ? 'bg-[var(--color-warning)]'
    : props.status === 'undeliverable' ? 'bg-[var(--color-error)]'
    : 'bg-[var(--color-border)]';  // unknown

  if (!props.status) {
    // Don't render anything for emails with no status recorded
    return null;
  }

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {/* Coloured status dot */}
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass} flex-shrink-0`} />
      {/* Hover tooltip */}
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium text-white bg-gray-800 shadow-md pointer-events-none"
          style={{ zIndex: 'var(--z-tooltip)' }}
        >
          {props.label}
        </span>
      )}
    </span>
  );
}

// ── CopyCell ───────────────────────────────────────────────────────────────────
// Matches the LeadsTable CopyCell pattern:
//   Idle:   text only, copy icon hidden (opacity-0, translated right)
//   Hover:  subtle bg highlight, copy icon fades in and slides into view
//   Click:  copies to clipboard, icon morphs to green check, "Copied!" tooltip
//           springs up above the text
//   Reset:  after 2 s reverts to idle
//
// textClassName controls the text colour (brand for emails, secondary for phones).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Animated copy-to-clipboard row for a single revealed contact value.
 * Mirrors the LeadsTable CopyCell — hover-reveal icon + spring tooltip.
 *
 * @param value - The text to display and copy.
 * @param textClassName - Tailwind class controlling the text colour.
 */
function CopyCell(props: { value: string; textClassName: string }) {
  // true while the green check + "Copied!" tooltip are visible
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    // Prevent any parent click handlers from firing
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(props.value).then(() => {
      setCopied(true);
      // Auto-reset after 2 s
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable — silently ignore
    });
  }

  return (
    // group drives hover-state changes on children; relative anchors the tooltip
    <div className="group relative inline-flex max-w-full cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 transition-colors duration-150 hover:bg-[var(--color-surface-subtle)]">

      {/* ── "Copied!" tooltip — springs up above the value on copy ───────────
          pointer-events-none so it never blocks hover on the cell itself */}
      <span
        className="pointer-events-none absolute bottom-full left-0 mb-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] font-semibold text-white transition-all duration-200"
        style={{
          background: '#22c55e',
          // Spring entrance: scale 80% → 100% + fade in
          opacity: copied ? 1 : 0,
          transform: copied ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(4px)',
          transformOrigin: 'bottom left',
        }}
      >
        Copied!
      </span>

      {/* Value text — mono font, truncated with ellipsis */}
      <span className={`max-w-[180px] truncate font-mono text-xs ${props.textClassName}`}>
        {props.value}
      </span>

      {/* ── Copy / Check icon ─────────────────────────────────────────────────
          Idle + not-hovered:  opacity-0, translated right
          Idle + hovered:      slides left and fades in
          Copied:              green check, always visible */}
      <button
        type="button"
        aria-label="Copy"
        onClick={handleCopy}
        className={[
          'flex-shrink-0 rounded transition-all duration-200',
          copied
            ? 'translate-x-0 opacity-100 text-[#22c55e]'
            : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        {copied
          ? (
              // Check icon — signals successful copy
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )
          : (
              // Copy icon — revealed on hover
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
      </button>
    </div>
  );
}

// ── DateLabel ──────────────────────────────────────────────────────────────────
// Formats a reveal timestamp. Shows "Oct 14 · 10:45 AM" style.

function DateLabel(props: { iso: string }) {
  const d = new Date(props.iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return (
    <span className="text-[var(--color-text-secondary)] text-xs leading-snug">
      <span className="block font-medium text-[var(--color-text-primary)]">{date}</span>
      <span className="block opacity-60">{time}</span>
    </span>
  );
}

// ── InitialsAvatar ─────────────────────────────────────────────────────────────
// Small 28×28 gradient circle with two-letter initials.

function InitialsAvatar(props: { first: string | null; last: string | null }) {
  const a = (props.first?.[0] ?? '').toUpperCase();
  const b = (props.last?.[0] ?? '').toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold flex-shrink-0 select-none"
      style={{ background: 'linear-gradient(135deg, var(--color-brand) 0%, #6366f1 100%)' }}
    >
      {a}{b}
    </span>
  );
}

// ── AddToListModal ─────────────────────────────────────────────────────────────
// Simple sheet-modal that lets the user pick an existing list to add selected leads.

function AddToListModal(props: {
  personIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations('RevealHistoryView');
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedList, setSelectedList] = useState<number | null>(null);

  // Fetch all user lists on mount
  useEffect(() => {
    fetch(API_ROUTES.lists.all, { method: 'POST', body: '{}' })
      .then(r => r.json())
      .then((data: UserList[]) => setLists(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!selectedList) return;
    setSaving(true);
    try {
      await fetch(API_ROUTES.lists.addLeads, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: selectedList, leadIds: props.personIds }),
      });
      props.onSuccess();
    } catch {
      // Swallow — parent handles toast
    } finally {
      setSaving(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center"
      style={{ zIndex: 'var(--z-modal)', background: 'rgba(0,0,0,0.4)' }}
      onClick={props.onClose}
    >
      {/* Modal panel — stop click propagation so backdrop click closes */}
      <div
        className="w-full max-w-sm bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
          {t('fab_add_to_list')}
        </h3>

        {/* List of choices */}
        <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
          {loading && (
            <p className="text-xs text-[var(--color-text-muted)] py-2">{t('loading')}</p>
          )}
          {!loading && lists.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] py-2">No lists yet.</p>
          )}
          {lists.map(list => (
            <button
              key={list.id}
              type="button"
              onClick={() => setSelectedList(list.id)}
              className={[
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors duration-[var(--duration-fast)]',
                selectedList === list.id
                  ? 'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)] font-medium'
                  : 'hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              <span>{list.label}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{list.count}</span>
            </button>
          ))}
        </div>

        {/* Action row */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] transition-colors duration-[var(--duration-fast)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedList || saving}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-[var(--color-brand)] text-white font-medium hover:bg-[var(--color-brand-dark)] disabled:opacity-40 transition-colors duration-[var(--duration-fast)]"
          >
            {saving ? 'Adding…' : t('fab_add_to_list')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Reveal History page — shows every contact the user has ever revealed,
 * with bulk selection, export, add-to-list, and email status indicators.
 *
 * @param props.recentPersonIds - Person IDs revealed in the same browser session
 *   (passed from BulkToolbar via URL or sessionStorage). Used to show "Just Now"
 *   badges for 30 seconds after reveal.
 */
export function RevealHistoryView(props: { recentPersonIds?: number[] }) {
  const t = useTranslations('RevealHistoryView');

  // ── Data state ───────────────────────────────────────────────────────────
  const [items, setItems] = useState<RevealItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCreditsSpent, setTotalCreditsSpent] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Pagination + search ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  // Debounced search input — search is fired 350 ms after the user stops typing
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Selection state ──────────────────────────────────────────────────────
  // Set of selected personIds
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // ── Clipboard copy tracking ──────────────────────────────────────────────
  // Not needed per-item — CopyButton handles its own state

  // ── "Just Now" badge state ────────────────────────────────────────────────
  // Page-load timestamp — any reveal within 30 s of page load gets the badge
  const pageLoadTime = useRef(Date.now());

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showAddToList, setShowAddToList] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch data ────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    fetch(API_ROUTES.revealHistory.list, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, pageSize: PAGE_SIZE, search }),
    })
      .then(r => r.json())
      .then((data: HistoryResponse) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalCreditsSpent(data.totalCreditsSpent);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search]);

  // ── Search debounce ───────────────────────────────────────────────────────

  function handleSearchChange(value: string) {
    setSearchInput(value);
    // Clear previous debounce timer
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearch(value.trim());
      setPage(1); // reset to first page on new search
      setSelected(new Set()); // clear selection when search changes
    }, 350);
  }

  // ── Checkbox helpers ──────────────────────────────────────────────────────

  function toggleAll() {
    if (selected.size === items.length) {
      // Deselect all
      setSelected(new Set());
    } else {
      // Select all visible items
      setSelected(new Set(items.map(i => i.personId)));
    }
  }

  function toggleOne(personId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }

  // ── FAB actions ───────────────────────────────────────────────────────────

  async function handleExportCsv() {
    try {
      const res = await fetch(API_ROUTES.leads.export, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPersons: Array.from(selected) }),
      });
      const data = await res.json() as { downloadUrl?: string; jobId?: number };
      if (data.downloadUrl) {
        // Trigger download immediately for synchronous export
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      showToast(t('export_success'));
    } catch {
      showToast(t('export_error'), false);
    }
  }

  // ── "Just Now" helper ─────────────────────────────────────────────────────
  // Returns true if the item was revealed within 30 s of this page load,
  // OR if the personId is in the recentPersonIds list passed from the reveal action.

  function isJustNow(item: RevealItem): boolean {
    // Check passed-in recent IDs (from BulkToolbar session)
    if (props.recentPersonIds?.includes(item.personId)) return true;
    // Check timestamp: within 30 seconds of page load
    const revealedMs = new Date(item.revealedAt).getTime();
    return Date.now() - revealedMs < 30_000 && revealedMs >= pageLoadTime.current - 5_000;
  }

  // ── Pagination helpers ────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // Layout wrapper — RevealHistoryLayout already applies pl-[160px] pt-14
    <div className="min-h-screen">
      {/* ── Inner column — same max-width and padding as FavoritesView ─────── */}
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Header row: title + credits stat | search + export all ───────── */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            {/* Page title */}
            <h1 className="text-lg font-semibold tracking-wide text-[var(--color-text-primary)]">
              {t('page_title')}
            </h1>
            {/* Credits-spent stat — shows total net credits consumed by reveals */}
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-amber)]"><IconBolt /></span>
              {t('stat_credits_spent', { count: totalCreditsSpent.toLocaleString() })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search box */}
            <div className="relative">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-[var(--color-text-muted)] pointer-events-none">
                <IconSearch />
              </span>
              <input
                type="text"
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={t('search_placeholder')}
                className="pl-8 pr-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] w-56 transition-shadow duration-[var(--duration-fast)]"
              />
            </div>

            {/* Export All button — matches FavoritesView style */}
            <button
              type="button"
              onClick={() => {
                // Select all loaded items then export
                const allIds = new Set(items.map(i => i.personId));
                setSelected(allIds);
                // Small delay so state updates before export fires
                setTimeout(handleExportCsv, 50);
              }}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
            >
              <IconDownload />
              {t('export_all_button')}
            </button>
          </div>
        </div>

        {/* ── Table — rounded border container mirrors FavoritesView ─────── */}
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
        <table className="w-full text-sm border-collapse">
          {/* Column headers */}
          <thead>
            <tr className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)]">
              {/* Select-all checkbox */}
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-[var(--color-border)] accent-[var(--color-brand)] cursor-pointer"
                />
              </th>
              {/* Date column */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide whitespace-nowrap">
                {t('col_date')}
              </th>
              {/* Name + title */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                {t('col_name_title')}
              </th>
              {/* Company */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                {t('col_company')}
              </th>
              {/* Revealed contact data */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                {t('col_revealed_data')}
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Loading skeleton rows */}
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--color-border)] animate-pulse">
                <td className="px-4 py-3"><span className="block w-3.5 h-3.5 rounded bg-gray-200" /></td>
                <td className="px-4 py-3"><span className="block w-16 h-8 rounded bg-gray-200" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="block w-7 h-7 rounded-full bg-gray-200" />
                    <div className="space-y-1">
                      <span className="block w-28 h-3 rounded bg-gray-200" />
                      <span className="block w-20 h-3 rounded bg-gray-100" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="block w-24 h-3 rounded bg-gray-200" /></td>
                <td className="px-4 py-3"><span className="block w-40 h-3 rounded bg-gray-200" /></td>
              </tr>
            ))}

            {/* Empty state */}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-16 text-[var(--color-text-muted)] text-sm">
                  {search
                    ? t('empty_state_search', { query: search })
                    : t('empty_state')}
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading && items.map(item => {
              const isSelected = selected.has(item.personId);
              const justNow = isJustNow(item);
              const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ') || '—';

              return (
                <tr
                  key={item.id}
                  className={[
                    'border-b border-[var(--color-border)] transition-colors duration-[var(--duration-fast)]',
                    // Highlight selected rows with a very subtle brand tint
                    isSelected
                      ? 'bg-[var(--color-brand-light)]'
                      : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]',
                  ].join(' ')}
                >
                  {/* ── Checkbox ────────────────────────────────────────── */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(item.personId)}
                      className="w-3.5 h-3.5 rounded border-[var(--color-border)] accent-[var(--color-brand)] cursor-pointer"
                    />
                  </td>

                  {/* ── Date ────────────────────────────────────────────── */}
                  <td className="px-4 py-3 whitespace-nowrap align-middle">
                    <DateLabel iso={item.revealedAt} />
                  </td>

                  {/* ── Name + title ─────────────────────────────────────── */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Initials avatar */}
                      <InitialsAvatar first={item.firstName} last={item.lastName} />

                      <div className="min-w-0">
                        {/* Name row + "Just Now" pulse dot + LinkedIn icon */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[var(--color-text-primary)] text-sm truncate">
                            {fullName}
                          </span>

                          {/* "Just Now" animated blue dot — fades after 30 s */}
                          {justNow && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                              {/* Pulsing dot */}
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] animate-pulse" />
                              {t('just_now')}
                            </span>
                          )}

                          {/* LinkedIn icon — opens profile in new tab */}
                          {item.linkedIn && (
                            <a
                              href={item.linkedIn.startsWith('http') ? item.linkedIn : `https://${item.linkedIn}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0a66c2] hover:opacity-80 transition-opacity duration-[var(--duration-fast)] flex-shrink-0"
                              title="View LinkedIn profile"
                            >
                              <IconLinkedIn />
                            </a>
                          )}
                        </div>

                        {/* Job title */}
                        {item.jobTitle && (
                          <span className="text-xs text-[var(--color-text-secondary)] truncate block">
                            {item.jobTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ── Company + location ────────────────────────────────── */}
                  <td className="px-4 py-3 align-middle">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] block">
                      {item.companyName ?? '—'}
                    </span>
                    {(item.city || item.country) && (
                      <span className="text-xs text-[var(--color-text-muted)] block">
                        {[item.city, item.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </td>

                  {/* ── Revealed contact data ─────────────────────────────── */}
                  <td className="px-4 py-3 align-middle">
                    <div className="space-y-1">
                      {/* Credit refunded badge — shown when a bad email triggered a refund */}
                      {item.creditRefunded && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-amber-light)] text-[var(--color-amber)]">
                          <IconBolt />
                          {t('credit_refunded_badge')}
                        </span>
                      )}

                      {/* Work email — status dot + animated CopyCell (matches LeadsTable) */}
                      {item.workEmail && (
                        <div className="flex items-center gap-1">
                          <EmailStatusDot
                            status={item.workEmailStatus}
                            label={
                              item.workEmailStatus === 'deliverable' ? t('email_status_deliverable')
                              : item.workEmailStatus === 'risky' ? t('email_status_risky')
                              : t('email_status_undeliverable')
                            }
                          />
                          {/* CopyCell: hover reveals copy icon, click shows spring "Copied!" tooltip */}
                          <CopyCell
                            value={item.workEmail}
                            textClassName="text-[var(--color-brand)]"
                          />
                        </div>
                      )}

                      {/* Personal email — same pattern, secondary colour */}
                      {item.personalEmail && (
                        <div className="flex items-center gap-1">
                          <EmailStatusDot
                            status={item.personalEmailStatus}
                            label={
                              item.personalEmailStatus === 'deliverable' ? t('email_status_deliverable')
                              : item.personalEmailStatus === 'risky' ? t('email_status_risky')
                              : t('email_status_undeliverable')
                            }
                          />
                          <CopyCell
                            value={item.personalEmail}
                            textClassName="text-[var(--color-text-secondary)]"
                          />
                        </div>
                      )}

                      {/* Phone 1 */}
                      {item.phone1 && (
                        <CopyCell
                          value={item.phone1}
                          textClassName="text-[var(--color-text-secondary)]"
                        />
                      )}

                      {/* Phone 2 */}
                      {item.phone2 && (
                        <CopyCell
                          value={item.phone2}
                          textClassName="text-[var(--color-text-muted)]"
                        />
                      )}

                      {/* Fallback if nothing was revealed */}
                      {!item.workEmail && !item.personalEmail && !item.phone1 && !item.phone2 && (
                        <span className="text-xs text-[var(--color-text-muted)]">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>{/* end rounded table container */}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            {t('page_of', { page, total: totalPages })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] disabled:opacity-40 transition-colors duration-[var(--duration-fast)]"
            >
              {t('prev')}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] disabled:opacity-40 transition-colors duration-[var(--duration-fast)]"
            >
              {t('next')}
            </button>
          </div>
        </div>
        )}{/* end pagination */}

      </div>{/* end mx-auto max-w-6xl inner column */}

      {/* ── Floating Action Bar ────────────────────────────────────────────
           Slides up from the bottom when one or more rows are selected.
           Contains: selected count / Export CSV / Add to List / HubSpot
      ──────────────────────────────────────────────────────────────────── */}
      <div
        className={[
          'fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-[var(--duration-base)]',
          selected.size > 0
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none',
        ].join(' ')}
        style={{ zIndex: 'var(--z-modal)' }}
      >
        {/* Selected count badge */}
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]">
          {t('fab_selected', { count: selected.size })}
        </span>

        {/* Divider */}
        <span className="w-px h-5 bg-[var(--color-border)]" />

        {/* Export CSV */}
        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] transition-colors duration-[var(--duration-fast)]"
        >
          <IconDownload />
          {t('fab_export_csv')}
        </button>

        {/* Add to list */}
        <button
          type="button"
          onClick={() => setShowAddToList(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors duration-[var(--duration-fast)]"
        >
          <IconListPlus />
          {t('fab_add_to_list')}
        </button>

        {/* Sync to CRM — unified tray with Ghost & Glow logic */}
        <SyncToCrmButton
          selectedPersonIds={Array.from(selected)}
          className="border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors duration-[var(--duration-fast)]"
        />

        {/* Clear selection */}
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-sm leading-none"
          title="Clear selection"
        >
          ✕
        </button>
      </div>

      {/* ── Add to List modal ───────────────────────────────────────────── */}
      {showAddToList && (
        <AddToListModal
          personIds={Array.from(selected)}
          onClose={() => setShowAddToList(false)}
          onSuccess={() => {
            setShowAddToList(false);
            showToast(t('add_to_list_success'));
          }}
        />
      )}

      {/* ── Toast notification ──────────────────────────────────────────── */}
      {toast && (
        <div
          className={[
            'fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white pointer-events-none',
            toast.ok ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]',
          ].join(' ')}
          style={{ zIndex: 'var(--z-toast)' }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
