'use client';

// ─── Imports ─────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner'; // toast notifications for API errors
import { useTranslations } from 'next-intl'; // i18n hook for client components
import { useFilterState } from '@/hooks/useFilterState'; // all sidebar filter state + setters
import type { FilterState } from '@/hooks/useFilterState';
import { API_ROUTES } from '@/constants/apiRoutes'; // centralised API URL constants
import { Sidebar } from './Sidebar'; // left-hand filter panel (fixed position)
import { LeadsTable } from './LeadsTable'; // paginated results table with reveal/select
import type { LeadRow } from './LeadsTable';
import { BulkToolbar } from './BulkToolbar'; // bottom bar: export / add-to-list / save-search

// ─── Types ────────────────────────────────────────────────────────────────────

// Shape returned by POST /api/leads/search
type SearchResponse = {
  leads: LeadRow[];
  total: number; // total matching rows in DB (used for pagination)
};

/**
 * Main client-side dashboard shell: sidebar filters + results table + bulk toolbar.
 * Owns all search state (leads, total, loading) and selection state (selectedIds).
 * Re-fetches whenever the `filters` object from useFilterState changes.
 */
export function LeadsDashboard() {
  // i18n for the LeadsTable namespace (also used for the empty-state + banner strings)
  const t = useTranslations('LeadsTable');

  // Pull every filter value + setter from the shared filter state hook
  const {
    filters,
    setMulti, // update a multi-select filter (array of { id, label })
    setBool, // update a boolean filter (hasWorkEmail, hasPhone, etc.)
    setString, // update the fullName text filter
    setNullableId, // update nullable-id filters (listId)
    setListId, // update the listId filter
    setPage, // change the current page
    resetFilters, // clear all filters back to defaults
    hasActiveFilters, // true when at least one filter is set (used by Sidebar's "clear" button)
  } = useFilterState();

  // ─── Local state ─────────────────────────────────────────────────────────

  const [leads, setLeads] = useState<LeadRow[]>([]); // current page of lead rows
  const [total, setTotal] = useState(0); // total matching leads (across all pages)
  const [loading, setLoading] = useState(true); // true while a search request is in-flight
  // false until the very first fetch resolves — prevents the empty-state from flashing
  // for a frame during client-side navigation before the first useEffect fires
  const [hasFetched, setHasFetched] = useState(false);
  const [revealingId, setRevealingId] = useState<number | null>(null); // id of the lead currently being revealed (shows spinner)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set()); // ids of rows with checkboxes ticked
  // Incremented each time a new list is created so the Sidebar re-fetches its "My lists" section
  const [listVersion, setListVersion] = useState(0);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Converts the current FilterState into the JSON body expected by POST /api/leads/search.
   * Maps multi-select options to plain id arrays, passes booleans and strings directly.
   * undefined values are omitted from the request body (API ignores absent keys).
   */
  function buildPayload(f: FilterState) {
    return {
      // Multi-select filters — send only the numeric IDs
      jobTitleIds: f.jobTitles.map(x => x.id),
      locationIds: f.locations.map(x => x.id),
      industryIds: f.industries.map(x => x.id),
      technologyIds: f.technologies.map(x => x.id),
      skillIds: f.skills.map(x => x.id),
      managementLevelIds: f.managementLevels.map(x => x.id),
      // Also send the label strings so the API can do ILIKE keyword search on job_title.title.
      // e.g. checking "Director" will match "Sales Director", "Director of Engineering", etc.
      managementLevelKeywords: f.managementLevels.length > 0 ? f.managementLevels.map(x => String(x.label)) : undefined,
      departmentIds: f.departments.map(x => x.id),
      // Same keyword search for department labels on job_title.title
      departmentKeywords: f.departments.length > 0 ? f.departments.map(x => String(x.label)) : undefined,
      companySizeIds: f.companySizes.map(x => x.id),
      // Send integer IDs — the search API filters by lead_data.company_id FK (normalised company table)
      companies: f.companies.length > 0 ? f.companies.map(x => Number(x.id)) : undefined,
      educationMajorIds: f.educationMajors.map(x => x.id),
      countryIds: f.selectedCountries.map(x => x.id),

      // Saved-list filter — filter leads that belong to a specific user list
      listId: f.listId,

      // Pagination
      page: f.page,
      pageSize: f.pageSize,

      // Boolean "has contact info" filters
      hasWorkEmail: f.hasWorkEmail,
      hasPersonalEmail: f.hasPersonalEmail,
      hasPhone: f.hasPhone,

      // Education degree filters
      haveBachelor: f.haveBachelor,
      haveMaster: f.haveMaster,
      haveAssociate: f.haveAssociate,
      haveDoctorate: f.haveDoctorate,

      // Free-text name search — skip if empty string
      fullName: f.fullName || undefined,

      // Email file filters — send arrays of file IDs (OR logic across files)
      // undefined when empty so the key is omitted from the request body
      includeEmailFileIds: f.includeEmailFiles.length > 0 ? f.includeEmailFiles.map(x => Number(x.id)) : undefined,
      excludeEmailFileIds: f.excludeEmailFiles.length > 0 ? f.excludeEmailFiles.map(x => Number(x.id)) : undefined,
      // LinkedIn file filters — same pattern
      includeLinkedInFileIds: f.includeLinkedInFiles.length > 0 ? f.includeLinkedInFiles.map(x => Number(x.id)) : undefined,
      excludeLinkedInFileIds: f.excludeLinkedInFiles.length > 0 ? f.excludeLinkedInFiles.map(x => Number(x.id)) : undefined,
    };
  }

  // ─── Search effect ────────────────────────────────────────────────────────

  /**
   * Re-runs every time `filters` changes.
   * Uses AbortController so an in-flight request is cancelled when filters change quickly
   * (prevents stale responses from overwriting newer results).
   */
  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);

    fetch(API_ROUTES.leads.search, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(filters)),
      signal: controller.signal, // tied to the abort controller above
    })
      .then(r => r.json())
      .then((data: SearchResponse) => {
        // Replace current page of leads and update the total count for pagination
        setLeads(data.leads);
        setTotal(data.total);
      })
      .catch(() => {
        // Silently ignore AbortError (request was cancelled) and network errors
      })
      .finally(() => {
        // Skip state updates for aborted requests — the cleanup function cancelled this
        // fetch because filters changed; the new fetch will update state when it resolves.
        // Without this guard, .finally() would set loading=false + hasFetched=true with
        // stale total=0, causing the empty-state to flash between the shimmer and results.
        if (controller.signal.aborted) return;
        setLoading(false);
        // Mark that at least one fetch has completed — unblocks the empty-state render
        setHasFetched(true);
      });

    // Cleanup: cancel the fetch when the effect re-runs (i.e. filters changed)
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // only depend on filters; buildPayload is a pure fn with no outside deps

  // ─── Reveal handler ───────────────────────────────────────────────────────

  /**
   * Calls POST /api/leads/reveal for a single lead.
   * On success, patches that lead's email + phone in local state so the row
   * updates without a full re-fetch. Tracks revealingId so the row shows a spinner.
   */
  const handleReveal = useCallback(async (leadId: number) => {
    setRevealingId(leadId); // show spinner on the Reveal button for this row

    try {
      const res = await fetch(API_ROUTES.leads.reveal, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPersons: [leadId] }),
      });

      if (!res.ok) {
        // Show the server's error message as a toast if one is provided
        const body = await res.json().catch(() => ({}));
        if (body?.message) toast.warning(body.message);
        return;
      }

      // API returns a bare array of revealed contacts with separate work/personal fields
      const contacts: {
        personId: number;
        workEmail: string | null;
        personalEmail: string | null;
        phone1: string | null;
        phone2: string | null;
      }[] = await res.json();

      // Notify AppTopBar to re-fetch credits so the balance updates immediately
      window.dispatchEvent(new CustomEvent('wl:credits-changed'));

      // Patch only the revealed row; leave the rest untouched
      setLeads(prev =>
        prev.map((l) => {
          // Match by personId returned from the reveal API
          const contact = contacts.find(c => c.personId === l.id);
          if (!contact) return l;
          // Patch all four contact fields individually so the Contact column shows each line
          return {
            ...l,
            workEmail: contact.workEmail,
            personalEmail: contact.personalEmail,
            phone1: contact.phone1,
            phone2: contact.phone2,
            revealed: true,
          };
        }),
      );
    } catch {
      // Swallow errors — reveal failures are non-critical
    } finally {
      setRevealingId(null); // always clear the spinner
    }
  }, []);

  // ─── Selection handlers ───────────────────────────────────────────────────

  /**
   * Toggles the checkbox for a single lead row.
   * Creates a new Set each time to trigger a React re-render.
   */
  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id); // uncheck
      } else {
        next.add(id); // check
      }
      return next;
    });
  }, []);

  /**
   * Adds all leads on the current page to the existing selection.
   * Preserves selections from other pages so navigating pages accumulates ids.
   * Called when the header checkbox is checked.
   */
  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      // Merge current-page ids into the existing set — don't wipe other pages
      const next = new Set(prev);
      leads.forEach(l => next.add(l.id));
      return next;
    });
  }, [leads]);

  /**
   * Clears all selected leads.
   * Called when the header checkbox is unchecked, or after a bulk action completes.
   */
  const handleClearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    // Full-height wrapper; pt-14 is now handled by the layout wrapper (DashboardLayout)
    <div className="flex min-h-screen flex-col">

      {/* ── Sidebar (fixed left panel, 256px wide) ─────────────────────── */}
      <Sidebar
        filters={filters}
        onMultiChange={setMulti}
        onBoolChange={setBool}
        onStringChange={setString}
        onNullableIdChange={setNullableId}
        onListIdChange={setListId}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        listVersion={listVersion}
      />

      {/* ── Main content: ml-[220px] = 160px NavRail + 60px filter icon strip ── */}
      <main className="ml-[220px] flex flex-1 flex-col">

        {/* Thin progress bar at the top — animated while a search is loading */}
        <div className="h-0.5 w-full bg-[var(--color-border)]">
          {loading && (
            <div className="h-full animate-[progress_1.2s_ease-in-out_infinite] bg-[var(--color-brand)]" />
          )}
        </div>

        

        {/*
          Empty state vs results table:
          - Show empty state when the search has finished (!loading) AND returned 0 results.
            This covers both "no filters selected" (API returns 0 early) and
            "filters active but no matches" cases.
          - Show LeadsTable otherwise — it handles its own loading skeleton rows
            internally when loading=true, so transitions are smooth.
        */}
        {!loading && hasFetched && total === 0
          ? (
              // ── Empty state ────────────────────────────────────────────────
              // Two variants:
              //   No filters selected → show arrow + marketing banner ("use the sidebar")
              //   Filters active but no matches → show plain "modify filters" message
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">

                {!hasActiveFilters
                  ? (
                      // ── No filters selected: guide the user toward the sidebar ──
                      <>
                        {/* Marketing banner */}
                        <div className="flex items-center justify-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-2 text-xs text-[var(--color-text-secondary)]">
                          <span>🔒</span>
                          <span>{t('unlock_banner')}</span>
                        </div>

                        {/* Hand-drawn curved arrow pointing left toward the sidebar */}
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 64 64"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-[var(--color-text-muted)]"
                        >
                          {/* Arrow body: cubic bezier curving from top-right down to bottom-left */}
                          <path
                            d="M 50 12 C 35 8 8 28 18 50"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            fill="none"
                          />
                          {/* Arrowhead: two lines forming a V at the tip */}
                          <path
                            d="M 12 44 L 18 52 L 26 46"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>

                        {/* Prompt to select a filter */}
                        <p className="text-sm text-[var(--color-text-secondary)]">{t('no_results_title')}</p>
                      </>
                    )
                  : (
                      // ── Filters active but no matches: tell the user to adjust them ──
                      <p className="text-sm text-[var(--color-text-secondary)]">{t('empty_state')}</p>
                    )}
              </div>
            )
          : (
              // ── Results table ────────────────────────────────────────────
              // LeadsTable shows skeleton rows internally while loading=true
              <LeadsTable
                leads={leads}
                total={total}
                page={filters.page}
                pageSize={filters.pageSize}
                loading={loading}
                revealingId={revealingId}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onClearAll={handleClearAll}
                onReveal={handleReveal}
                onPageChange={setPage}
              />
            )}
      </main>

      {/*
        BulkToolbar — floats at the bottom of the screen.
        Visible only when selectedIds.length > 0 (handled inside the component).
        Receives totalFiltered so it knows how many leads match current filters
        (used for "export all filtered" logic).
      */}
      <BulkToolbar
        selectedIds={[...selectedIds]}
        totalFiltered={total}
        filters={filters}
        onClearSelection={handleClearAll}
        onExportComplete={handleClearAll}
        onListCreated={() => setListVersion(v => v + 1)}
      />
    </div>
  );
}
