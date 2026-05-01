'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Spinner } from './Spinner';

// ── CopyCell ──────────────────────────────────────────────────────────────────
// Renders a single revealed contact value (email or phone) with an animated
// copy-to-clipboard UX.
//
// Idle:    text only, copy icon hidden (opacity-0)
// Hover:   subtle bg highlight, copy icon fades in and slides left into view
// Click:   copies to clipboard, icon morphs to green checkmark, "Copied!" tooltip
//          springs up above the text
// Reset:   after 2 s, icon and tooltip revert to idle state
//
// Only rendered for revealed values — caller is responsible for the guard.
// textClassName controls the text colour: brand-blue for emails, secondary for phones.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Animated copy-to-clipboard cell for any revealed contact value.
 * Shows a copy icon on hover (opacity transition + slight slide).
 * On click, morphs the icon to a green check and pops up a "Copied!" tooltip.
 * Resets after 2 seconds.
 *
 * @param value - The text to display and copy (email or phone number).
 * @param textClassName - Tailwind class controlling the text colour.
 */
function CopyCell(props: { value: string; textClassName: string }) {
  // true while the "Copied!" state is active (icon = check, tooltip visible)
  const [copied, setCopied] = useState(false);

  /**
   * Copies the email to the clipboard and activates the feedback animation.
   * Auto-resets back to idle after 2 seconds.
   */
  function handleCopy(e: React.MouseEvent) {
    // Stop the click from bubbling to the mailto link wrapper
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
    // Outer container: relative so the tooltip can be absolutely positioned above it.
    // group class drives hover-state changes on children via Tailwind group-hover: variants.
    <div className="group relative inline-flex max-w-full cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 transition-colors duration-150 hover:bg-[var(--color-surface-subtle)]">

      {/* ── "Copied!" tooltip — springs up above the email on copy ───────────
          Uses CSS scale + opacity transition for the spring-like entrance.
          Positioned absolutely above the cell, horizontally centred.
          pointer-events-none so it never blocks hover on the cell itself. */}
      <span
        className="pointer-events-none absolute bottom-full left-0 mb-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] font-semibold text-white transition-all duration-200"
        style={{
          // Green background matches the check icon colour
          background: '#22c55e',
          // Spring-like entrance: scale from 80% → 100% + fade in
          opacity: copied ? 1 : 0,
          transform: copied ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(4px)',
          transformOrigin: 'bottom left',
        }}
      >
        Copied!
      </span>

      {/* ── Value text — truncated with ellipsis when too long ────────────────
          max-w-[160px] caps the width; overflow-hidden + truncate add the ellipsis.
          textClassName controls colour: brand-blue for emails, secondary for phones. */}
      <span className={`max-w-[160px] truncate font-mono text-xs ${props.textClassName}`}>
        {props.value}
      </span>

      {/* ── Copy / Check icon ─────────────────────────────────────────────────
          Idle + not-hovered:  opacity-0, translated slightly right
          Idle + hovered:      opacity-100, slides left into position (group-hover)
          Copied state:        green check icon, always visible (opacity-100) */}
      <button
        type="button"
        aria-label="Copy email"
        onClick={handleCopy}
        className={[
          // Base: icon sits slightly to the right and is invisible
          // Hover: slides left and fades in via group-hover
          'flex-shrink-0 rounded transition-all duration-200',
          copied
            // Copied: green check, fully visible regardless of hover
            ? 'translate-x-0 opacity-100 text-[#22c55e]'
            // Idle: hidden until parent is hovered
            : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        {copied
          ? (
              // Check icon — green, signals successful copy
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )
          : (
              // Copy icon — shown on hover
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
      </button>
    </div>
  );
}

export type LeadRow = {
  id: number;
  fullName: string;
  jobTitle: string | null;
  companyName: string | null;
  // Industry name from company_industry table — shown between Company and Location
  industry: string | null;
  location: string | null;
  // Reference links — shown as icons in the Reference column (LinkedIn + website)
  linkedIn: string | null;
  websiteUrl: string | null;
  // All four contact fields — each shown on its own line in the Contact column
  workEmail: string | null;
  personalEmail: string | null;
  phone1: string | null;
  phone2: string | null;
  revealed: boolean;
};

type Props = {
  leads: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  revealingId: number | null;
  onReveal: (id: number) => void;
  onPageChange: (page: number) => void;
};


/**
 * Gradient initials avatar — matches the one used in RevealHistoryView.
 * Shows up to two uppercase letters on an indigo-to-violet gradient circle.
 *
 * @param first - First name (or null).
 * @param last - Last name (or null).
 */
function InitialsAvatar(props: { first: string | null; last: string | null }) {
  // Derive one letter from each part; fall back to empty string if null
  const a = (props.first?.[0] ?? '').toUpperCase();
  const b = (props.last?.[0] ?? '').toUpperCase();
  return (
    <span
      className="inline-flex h-7 w-7 flex-shrink-0 select-none items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: 'linear-gradient(135deg, var(--color-brand) 0%, #6366f1 100%)' }}
    >
      {a}{b}
    </span>
  );
}

/**
 * Leads results table with selection, reveal, and pagination.
 * Styled to match the FavoritesView datatable:
 * — rounded+bordered outer container
 * — font-medium column headers
 * — border-b row separators (no zebra stripes)
 * — initials avatar in the Name cell
 * — px-4 cell padding
 */
export function LeadsTable(props: Props) {
  const t = useTranslations('LeadsTable');
  const totalPages = Math.ceil(props.total / props.pageSize);
  const allPageSelected = props.leads.length > 0 && props.leads.every(l => props.selectedIds.has(l.id));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Table wrapper — no border/shadow, flush with parent edges ─────────── */}
      <div className="flex-1 overflow-auto overflow-hidden">
        <table className="w-full min-w-[800px] border-collapse text-sm">

          {/* ── Column headers ─────────────────────────────────────────────────── */}
          <thead>
            <tr className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)]">
              {/* Checkbox — select all / deselect all for current page */}
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={allPageSelected ? props.onClearAll : props.onSelectAll}
                  className="rounded border-[var(--color-border)] accent-[var(--color-brand)]"
                  aria-label={t('select_all_aria')}
                />
              </th>
              {/* font-medium (not bold) to match FavoritesView header style */}
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_name')}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_title')}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_company')}</th>
              {/* Industry column — sourced from company_industry table via lead_data.company_industry_id */}
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_industry')}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_location')}</th>
              {/* Reference column — LinkedIn + website icons */}
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_reference')}</th>
              {/* Contact column — fixed w-48 so long emails truncate with ellipsis */}
              <th className="w-48 px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_contact')}</th>
              <th className="w-24 px-4 py-3 text-center font-medium text-[var(--color-text-secondary)]">{t('col_action')}</th>
            </tr>
          </thead>

          {/* ── Table body ─────────────────────────────────────────────────────── */}
          <tbody>
            {props.loading
              ? (
                  // ── Loading skeleton rows ────────────────────────────────────
                  Array.from({ length: props.pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)]">
                      {/* 9 columns: checkbox, name, title, company, industry, location, reference, contact, action */}
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
                        </td>
                      ))}
                    </tr>
                  ))
                )
              : props.leads.length === 0
                ? (
                    // ── Empty state ──────────────────────────────────────────
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-sm text-[var(--color-text-muted)]">
                        {t('empty_state')}
                      </td>
                    </tr>
                  )
                : props.leads.map(lead => (
                    <tr
                      key={lead.id}
                      className={[
                        // border-b separator between rows — same as FavoritesView
                        'border-b border-[var(--color-border)] transition-colors',
                        props.selectedIds.has(lead.id)
                          // Selected row gets brand highlight
                          ? 'bg-[var(--color-brand-light)]'
                          : 'hover:bg-[var(--color-surface-subtle)]',
                      ].join(' ')}
                    >
                      {/* Checkbox cell */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={props.selectedIds.has(lead.id)}
                          onChange={() => props.onToggleSelect(lead.id)}
                          className="rounded border-[var(--color-border)] accent-[var(--color-brand)]"
                        />
                      </td>

                      {/* ── Name + initials avatar — matches FavoritesView Name cell ── */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Gradient initials avatar — same component as RevealHistoryView */}
                          <InitialsAvatar
                            first={lead.fullName.trim().split(/\s+/)[0] ?? null}
                            last={lead.fullName.trim().split(/\s+/).slice(-1)[0] ?? null}
                          />
                          {/* Full name text */}
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {lead.fullName}
                          </span>
                        </div>
                      </td>

                      {/* Job title */}
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{lead.jobTitle ?? '—'}</td>

                      {/* Company */}
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{lead.companyName ?? '—'}</td>

                      {/* Industry — from company_industry table */}
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{lead.industry ?? '—'}</td>

                      {/* Location */}
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{lead.location ?? '—'}</td>

                      {/* ── Reference — LinkedIn icon and/or website globe icon ─────── */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* LinkedIn icon — only rendered when URL is present */}
                          {lead.linkedIn && (
                            <div className="group relative">
                              {/* Tooltip — appears above on hover */}
                              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-text-primary)] px-1.5 py-0.5 text-[10px] text-[var(--color-surface)] opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100">
                                LinkedIn
                              </span>
                              <a
                                href={lead.linkedIn}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="LinkedIn profile"
                                className="flex items-center text-[#0a66c2] opacity-80 hover:opacity-100"
                              >
                                {/* LinkedIn "in" logo SVG */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                              </a>
                            </div>
                          )}

                          {/* Website globe icon — only shown when URL exists */}
                          {lead.websiteUrl && (
                            <div className="group relative">
                              {/* Tooltip */}
                              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-text-primary)] px-1.5 py-0.5 text-[10px] text-[var(--color-surface)] opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100">
                                Website
                              </span>
                              <a
                                href={lead.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Website"
                                className="flex items-center text-[var(--color-text-secondary)] opacity-80 hover:text-[var(--color-brand)] hover:opacity-100"
                              >
                                {/* Globe SVG */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="2" y1="12" x2="22" y2="12" />
                                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                              </a>
                            </div>
                          )}

                          {/* Dash fallback when neither link is available */}
                          {!lead.linkedIn && !lead.websiteUrl && (
                            <span className="text-[var(--color-text-muted)]">—</span>
                          )}
                        </div>
                      </td>

                      {/* ── Contact — masked until revealed ────────────────────────── */}
                      {/* w-48 + max-w-[192px] constrains the cell so long emails truncate */}
                      <td className="w-48 max-w-[192px] px-4 py-3">
                        {/*
                          When revealed, the `unmask` CSS keyframe (global.css) fades all
                          lines in simultaneously with a subtle slide-up effect.
                        */}
                        <div
                          className="flex flex-col gap-0.5 text-xs"
                          style={lead.revealed ? { animation: 'unmask 0.35s ease forwards' } : undefined}
                        >
                          {lead.revealed
                            ? (
                                // ── Revealed: emails use EmailCopyCell (hover copy icon + tooltip)
                                //             phones render as plain mono text
                                <>
                                  {/* Work email — brand-blue text, copy icon on hover */}
                                  {lead.workEmail && (
                                    <CopyCell value={lead.workEmail} textClassName="text-[var(--color-brand)]" />
                                  )}
                                  {/* Personal email — same brand-blue treatment */}
                                  {lead.personalEmail && (
                                    <CopyCell value={lead.personalEmail} textClassName="text-[var(--color-brand)]" />
                                  )}
                                  {/* Phone 1 — secondary colour, copy icon on hover */}
                                  {lead.phone1 && (
                                    <CopyCell value={lead.phone1} textClassName="text-[var(--color-text-secondary)]" />
                                  )}
                                  {/* Phone 2 — muted colour, copy icon on hover */}
                                  {lead.phone2 && (
                                    <CopyCell value={lead.phone2} textClassName="text-[var(--color-text-muted)]" />
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

                      {/* ── Action column — Capsule Reveal Button ──────────────────
                          Unrevealed: solid brand-colour capsule with eye icon
                          Loading:    spinner replaces icon, button dims
                          Revealed:   ghost capsule with checkmark — non-clickable
                      */}
                      <td className="px-4 py-3 text-center">
                        {lead.revealed
                          ? (
                              // Ghost capsule — contact already unlocked
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                                {/* Checkmark SVG */}
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="2 6 5 9 10 3" />
                                </svg>
                                {/* {t('revealed_button')} */}
                              </span>
                            )
                          : (
                              // Solid brand capsule — click costs 1 credit
                              <button
                                type="button"
                                disabled={props.revealingId === lead.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--color-brand-dark)] hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => props.onReveal(lead.id)}
                              >
                                {/* Spinner while this specific row is loading */}
                                {props.revealingId === lead.id
                                  ? <Spinner size={11} />
                                  : (
                                      // Eye icon
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                      </svg>
                                    )}
                                {t('reveal_button')}
                              </button>
                            )}
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────────── */}
      {!props.loading && props.total > 0 && (
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
          <span className="text-xs text-[var(--color-text-muted)]">
            {t('pagination_total', { total: props.total })}
          </span>
          <div className="flex items-center gap-1">
            {/* Previous page button */}
            <button
              type="button"
              disabled={props.page <= 1}
              className="rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => props.onPageChange(props.page - 1)}
            >
              {t('prev')}
            </button>

            {/* Page number buttons — show up to 7 pages */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  type="button"
                  className={[
                    'min-w-[28px] rounded-[var(--radius-md)] px-2 py-1.5 text-xs',
                    p === props.page
                      ? 'bg-[var(--color-brand)] font-semibold text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]',
                  ].join(' ')}
                  onClick={() => props.onPageChange(p)}
                >
                  {p}
                </button>
              );
            })}

            {/* Ellipsis when there are many pages */}
            {totalPages > 7 && props.page < totalPages - 3 && (
              <span className="px-1 text-xs text-[var(--color-text-muted)]">…</span>
            )}

            {/* Last page button (when > 7 total pages) */}
            {totalPages > 7 && (
              <button
                type="button"
                className={[
                  'min-w-[28px] rounded-[var(--radius-md)] px-2 py-1.5 text-xs',
                  props.page === totalPages
                    ? 'bg-[var(--color-brand)] font-semibold text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]',
                ].join(' ')}
                onClick={() => props.onPageChange(totalPages)}
              >
                {totalPages}
              </button>
            )}

            {/* Next page button */}
            <button
              type="button"
              disabled={props.page >= totalPages}
              className="rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => props.onPageChange(props.page + 1)}
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
