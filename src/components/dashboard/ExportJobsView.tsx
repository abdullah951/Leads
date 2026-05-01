'use client';

// ── ExportJobsView ─────────────────────────────────────────────────────────
// Full-page view for the /export-jobs route.
// Lists all background CSV export jobs with status, download, and delete actions.
//
// Layout mirrors FavoritesView:
//   ml-[160px] min-h-screen pt-14  (outer — accounts for nav rail + topbar)
//   mx-auto max-w-6xl px-6 py-8   (inner — centred content column)
//
// Header row:  "Export jobs" title  |  Clear All button (right-aligned)
// Table:       File | Records | Status | Created | Action (download + delete)
// Empty state: dashed border placeholder
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { API_ROUTES } from '@/constants/apiRoutes';

// ── Types ──────────────────────────────────────────────────────────────────

/** Shape returned by POST /api/export-jobs/list */
type ExportJob = {
  jobId: number;
  type: 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl: string | null;
  error: string | null;
  createdAt: string;
};

// ── Status badge colour map ────────────────────────────────────────────────

const STATUS_COLORS: Record<ExportJob['status'], string> = {
  pending: 'text-[var(--color-warning)] bg-[var(--color-amber-light)]',
  processing: 'text-[var(--color-info)] bg-[var(--color-brand-light)]',
  completed: 'text-[var(--color-success)] bg-[#dcfce7]',
  failed: 'text-[var(--color-error)] bg-[#fee2e2]',
};

/**
 * Export jobs page: lists all background CSV export jobs.
 * Layout and button styles mirror FavoritesView for consistency.
 * Header contains a "Clear All" button that removes all jobs + their files.
 */
export function ExportJobsView() {
  const t = useTranslations('ExportJobsView');

  // ── State ────────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  // Which jobId is mid-deletion — disables that row's delete button
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // True while the "Clear All" call is in-flight
  const [clearingAll, setClearingAll] = useState(false);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(API_ROUTES.exportJobs.list, { method: 'POST', body: '{}' })
      .then(r => r.json())
      .then((data: ExportJob[]) => setJobs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * Deletes a single export job row + its file.
   * @param jobId - The numeric ID of the job to delete.
   */
  async function handleDelete(jobId: number) {
    setDeletingId(jobId);
    try {
      const res = await fetch(API_ROUTES.exportJobs.delete, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      // Remove the row from local state optimistically on success
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.jobId !== jobId));
      }
    } catch {
      // Swallow — row stays in list if delete fails
    } finally {
      setDeletingId(null);
    }
  }

  /**
   * Calls DELETE-ALL endpoint, then clears local jobs state.
   * Mirrors the FavoritesView "Clear all" button behaviour.
   */
  async function handleClearAll() {
    if (jobs.length === 0) return;
    setClearingAll(true);
    try {
      await fetch(API_ROUTES.exportJobs.deleteAll, { method: 'POST' });
      // Clear the UI immediately — we trust the API deleted everything
      setJobs([]);
    } catch {
      // Swallow — user can retry by clicking again
    } finally {
      setClearingAll(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Maps API status to the i18n key shown in the badge. */
  function statusLabel(status: ExportJob['status']) {
    // 'completed' maps to 'status_done' to match the existing key naming
    const key = status === 'completed' ? 'status_done' : `status_${status}`;
    return t(key as Parameters<typeof t>[0]);
  }

  /** Formats an ISO date string into a short locale-aware datetime string. */
  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // The ExportJobsLayout already applies pl-[160px] pt-14 on the wrapper div,
  // so ExportJobsView does NOT repeat those offsets (unlike FavoritesView which
  // handles its own ml-[160px] pt-14 because its layout uses a bare <div>).
  return (
    <div className="min-h-screen">
      {/* Inner column — same max-width and padding as FavoritesView */}
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Header row: title + Clear All button ────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide text-[var(--color-text-primary)]">
            {t('title')}
          </h1>

          {/* Clear All — styled to match FavoritesView "Clear all" button */}
          {/* Only shown when there are jobs to clear */}
          {jobs.length > 0 && (
            <button
              type="button"
              disabled={clearingAll || loading}
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-error)] hover:bg-[#fee2e2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* Spinner while clearing, trash icon when idle */}
              {clearingAll
                ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                  )
                : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  )}
              {t('clear_all')}
            </button>
          )}
        </div>

        {/* ── Content: skeleton | empty state | table ─────────────────────── */}
        {loading
          ? (
              /* Loading skeletons — pulse animation while fetching */
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)]"
                  />
                ))}
              </div>
            )
          : jobs.length === 0
            ? (
                /* Empty state — dashed border placeholder */
                <div className="flex h-48 items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-muted)]">{t('empty')}</p>
                </div>
              )
            : (
                /* Jobs table — rounded border container mirrors FavoritesView */
                <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
                  <table className="w-full border-collapse text-sm">

                    {/* Table head */}
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
                        <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_filename')}</th>
                        <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_count')}</th>
                        <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_status')}</th>
                        <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_created')}</th>
                        <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_action')}</th>
                      </tr>
                    </thead>

                    {/* Table body */}
                    <tbody>
                      {jobs.map(job => (
                        <tr
                          key={job.jobId}
                          className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)]"
                        >
                          {/* File column — job ID as identifier (API doesn't return filename) */}
                          <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                            {`Export #${job.jobId}`}
                          </td>

                          {/* Records column — API doesn't return count, show dash */}
                          <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                            —
                          </td>

                          {/* Status badge */}
                          <td className="px-4 py-3">
                            <span
                              className={[
                                'inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium',
                                STATUS_COLORS[job.status],
                              ].join(' ')}
                            >
                              {statusLabel(job.status)}
                            </span>
                          </td>

                          {/* Created at */}
                          <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                            {formatDate(job.createdAt)}
                          </td>

                          {/* ── Action column: download icon + delete icon ──── */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">

                              {/* Download icon — active only when completed + URL exists */}
                              {job.status === 'completed' && job.downloadUrl
                                ? (
                                    <a
                                      href={job.downloadUrl}
                                      download
                                      title={t('download_button')}
                                      className="text-[var(--color-brand)] transition-opacity hover:opacity-70"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                      </svg>
                                    </a>
                                  )
                                : (
                                    // Greyed-out placeholder keeps column alignment stable
                                    <span className="opacity-20 text-[var(--color-text-muted)]">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                      </svg>
                                    </span>
                                  )}

                              {/* Delete icon — always shown; spins while deleting this row */}
                              <button
                                type="button"
                                title="Delete export"
                                disabled={deletingId === job.jobId || clearingAll}
                                onClick={() => handleDelete(job.jobId)}
                                className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)] disabled:opacity-40"
                              >
                                {deletingId === job.jobId
                                  ? (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" />
                                      </svg>
                                    )
                                  : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              )}
      </div>
    </div>
  );
}
