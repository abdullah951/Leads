'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilterOption } from '@/hooks/useFilterState';
import { Spinner } from './Spinner';

type Props = {
  label?: string;
  placeholder: string;
  /** If provided, fetches options from this URL with `{ query }` body on open + typing. */
  fetchUrl?: string;
  /** If provided, uses these static options (no network call). */
  staticOptions?: FilterOption[];
  selected: FilterOption[];
  onChange: (value: FilterOption[]) => void;
  /**
   * When true, renders only the input + chips without the collapsible section wrapper.
   * Use when embedding inside a parent section.
   */
  inlineMode?: boolean;
  /**
   * When this value changes, the dropdown is closed immediately.
   * Pass the parent's active section ID so switching sections closes any open dropdown.
   */
  closeSignal?: unknown;
};

/**
 * Multi-select filter with remote autocomplete.
 * - On focus/click: immediately calls the API with empty query to load the full list.
 * - On typing: debounces 300ms then calls the API with the typed query.
 * - On close: resets the query so the next open starts fresh.
 */
export function FilterMultiSelect(props: Props) {
  // Whether the collapsible section is expanded (non-inline mode only)
  const [sectionOpen, setSectionOpen] = useState(true);

  // Text typed into the search input
  const [query, setQuery] = useState('');

  // Options returned from the last API call or filtered from staticOptions
  const [options, setOptions] = useState<FilterOption[]>([]);

  // Whether the dropdown list is visible
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Whether an API call is in flight
  const [fetching, setFetching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ref to hold the debounce timer so we can cancel it on unmount / new keypress
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to hold the current AbortController so we can cancel in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  /* ── Outside-click detection: close dropdown ────────────────────────── */

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Close dropdown whenever the parent signals a section change ─────── */
  // Runs when closeSignal changes (e.g. openSection in Sidebar switches to a different id).
  // Skips the initial mount (no signal value yet) by only reacting to actual changes.
  useEffect(() => {
    closeDropdown();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.closeSignal]);

  /* ── Static options: filter client-side on query change ─────────────── */

  useEffect(() => {
    if (!props.staticOptions) return;
    const q = query.toLowerCase();
    setOptions(
      q
        ? props.staticOptions.filter(o => o.label.toLowerCase().includes(q))
        : props.staticOptions,
    );
  }, [props.staticOptions, query]);

  /* ── Remote fetch helper ─────────────────────────────────────────────── */

  /**
   * Calls the remote fetchUrl with the given search string.
   * Cancels any in-flight request before starting a new one.
   *
   * @param searchQuery - The string to pass as `{ query }` in the POST body.
   */
  const fetchOptions = useCallback((searchQuery: string) => {
    if (!props.fetchUrl) return;

    // Cancel any previous in-flight request to avoid stale results overwriting newer ones
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setFetching(true);

    fetch(props.fetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then((data: FilterOption[]) => setOptions(data))
      .catch(() => {}) // ignore abort errors
      .finally(() => setFetching(false));
  }, [props.fetchUrl]);

  /* ── Open: fetch immediately with empty/current query ───────────────── */

  /**
   * Opens the dropdown and immediately fires an API call with the current query.
   * Clears stale options first so the user sees a spinner instead of old data.
   */
  function openDropdown() {
    if (dropdownOpen) return; // already open
    // Clear stale results so a spinner shows instead of old data
    setOptions([]);
    setDropdownOpen(true);
    // Fetch immediately — no debounce on first open
    fetchOptions(query);
  }

  /* ── Close: reset query + options ───────────────────────────────────── */

  /** Closes the dropdown and resets query so the next open starts fresh. */
  function closeDropdown() {
    setDropdownOpen(false);
    setQuery('');
    setOptions([]);
    // Cancel any pending debounce or in-flight request
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }

  /* ── Query change: debounced API call ───────────────────────────────── */

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!props.fetchUrl) return;

    // Cancel previous debounce timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Wait 300ms after the user stops typing before hitting the API
    debounceRef.current = setTimeout(() => {
      fetchOptions(value);
    }, 300);
  }

  /* ── Selection helpers ───────────────────────────────────────────────── */

  const selectedIds = new Set(props.selected.map(s => s.id));

  function toggle(option: FilterOption) {
    if (selectedIds.has(option.id)) {
      props.onChange(props.selected.filter(s => s.id !== option.id));
    } else {
      props.onChange([...props.selected, option]);
    }
  }

  function remove(id: FilterOption['id']) {
    props.onChange(props.selected.filter(s => s.id !== id));
  }

  // Hide already-selected options from the dropdown
  const visibleOptions = options.filter(o => !selectedIds.has(o.id));

  /* ── Input + dropdown block ──────────────────────────────────────────── */

  const inputBlock = (
    // Outer container — used for outside-click detection and dropdown positioning
    <div className="relative" ref={containerRef}>

      {/* Combined chip + input box */}
      <div
        className="flex min-h-[32px] flex-wrap items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 focus-within:border-[var(--color-brand)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)] cursor-text"
        // Clicking anywhere in the box opens the dropdown + focuses the input
        onClick={() => { openDropdown(); inputRef.current?.focus(); }}
      >
        {/* Selected option chips */}
        {props.selected.map(s => (
          <span
            key={s.id}
            className="flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-brand-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand-dark)]"
          >
            {s.label}
            <button
              type="button"
              className="flex items-center leading-none opacity-60 hover:opacity-100 hover:text-[var(--color-error)]"
              aria-label={`Remove ${s.label}`}
              onClick={(e) => {
                e.stopPropagation(); // don't re-open the dropdown
                remove(s.id);
              }}
            >
              ×
            </button>
          </span>
        ))}

        {/* Search input — grows to fill remaining space */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={props.selected.length === 0 ? props.placeholder : ''}
          className="min-w-[60px] flex-1 bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          // onFocus: open dropdown + immediately fetch (handles keyboard tab-in)
          onFocus={() => openDropdown()}
          onChange={e => handleQueryChange(e.target.value)}
        />

        {/* Inline loading spinner while fetching */}
        {fetching && (
          <span className="pointer-events-none text-[var(--color-text-muted)]">
            <Spinner size={12} />
          </span>
        )}
      </div>

      {/* Dropdown — shown when open, whether fetching (shows spinner) or has results */}
      {dropdownOpen && (fetching || visibleOptions.length > 0) && (
        <ul className="absolute left-0 right-0 top-full z-[var(--z-modal)] mt-1 max-h-48 overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
          {/* Loading state — single centered spinner row */}
          {fetching && visibleOptions.length === 0 && (
            <li className="flex items-center justify-center py-3">
              <Spinner size={14} />
            </li>
          )}

          {/* Option rows */}
          {visibleOptions.map(option => (
            <li key={option.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
                onMouseDown={(e) => {
                  // preventDefault keeps the input focused so the dropdown stays open
                  e.preventDefault();
                  toggle(option);
                  // Keep query so the user can keep filtering and selecting more
                  inputRef.current?.focus();
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Empty state — only shown once fetching is done and no results came back */}
      {dropdownOpen && !fetching && visibleOptions.length === 0 && query.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[var(--z-modal)] mt-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)] shadow-[var(--shadow-md)]">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );

  if (props.inlineMode) {
    return inputBlock;
  }

  return (
    <div className="border-b border-[var(--color-border)] py-3">
      {/* Section header with chevron toggle */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
        onClick={() => setSectionOpen(prev => !prev)}
      >
        {props.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-[var(--duration-fast)] ${sectionOpen ? '' : '-rotate-90'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {sectionOpen && (
        <div className="mt-2 px-4">
          {inputBlock}
        </div>
      )}
    </div>
  );
}
