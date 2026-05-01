'use client';

import { useRef, useState } from 'react';
import { Spinner } from './Spinner';

// Shape of the JSON response from POST /api/admin/enrich-leads
type EnrichResult = {
  updated: number;   // rows that had at least one field patched
  notFound: number;  // CSV rows that matched no existing lead
  skipped: number;   // rows with missing match keys or nothing to update
  errors: string[];  // per-row error messages (e.g. DB constraint)
};

/**
 * CSV enrich form for patching missing data on existing leads.
 * Matches rows by firstName + lastName + personalEmail, then fills
 * only NULL columns — never overwrites existing values.
 */
export function EnrichLeadsForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError('');

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch('/api/admin/enrich-leads', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Enrich failed');
        return;
      }
      setResult(data as EnrichResult);
      // Reset file input after a successful run
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <h1 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">Enrich leads</h1>
        <p className="mb-5 text-sm text-[var(--color-text-muted)]">
          Upload a CSV to fill in missing data on existing leads. Each row is matched by
          {' '}<strong>FirstName + LastName + LinkedInUrl</strong>. Only
          {' '}null fields in the database are updated — existing values are never overwritten.
        </p>

        {/* Match key + enrichable column hint */}
        <div className="mb-5 space-y-3">
          {/* Required match key columns */}
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Required match columns
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              FirstName, LastName, PersonalEmail
            </p>
          </div>

          {/* Optional enrichment columns */}
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Optional enrichment columns
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              JobTitle, PersonLinkedInUrl, PersonCountry, CompanyName, CompanyIndustry,
              CompanySize, CompanyCity, WorkEmail, Phone1, Phone2, WebsiteUrl, AvatarUrl
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">CSV file</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              required
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-[var(--color-brand)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
            />
            {file && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {file.name} — {(file.size / 1024).toFixed(1)} KB
              </span>
            )}
          </label>

          {error && (
            <p className="rounded-[var(--radius-md)] bg-[var(--color-error-subtle,#fef2f2)] px-3 py-2 text-sm text-[var(--color-error)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!file || loading}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Spinner size={14} />}
            {loading ? 'Enriching…' : 'Enrich CSV'}
          </button>
        </form>

        {/* Result summary */}
        {result && (
          <div className="mt-5 space-y-3">
            {/* 3-column stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Updated count — green accent */}
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-brand)]">{result.updated}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Updated</p>
              </div>
              {/* Not found count */}
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-text-secondary)]">{result.notFound}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Not found</p>
              </div>
              {/* Skipped count */}
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-text-secondary)]">{result.skipped}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Skipped</p>
              </div>
            </div>

            {/* Per-row errors expandable panel */}
            {result.errors.length > 0 && (
              <details className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)]">
                  {result.errors.length} row error{result.errors.length !== 1 ? 's' : ''}
                </summary>
                <ul className="max-h-48 overflow-auto border-t border-[var(--color-border)] px-4 py-2">
                  {result.errors.map((e, i) => (
                    // Each error shows the row number and the error message
                    <li key={i} className="py-0.5 text-xs text-[var(--color-error)]">{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
