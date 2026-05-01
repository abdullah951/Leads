'use client';

import { useRef, useState } from 'react';
import { Spinner } from './Spinner';

type ImportResult = {
  inserted: number;
  skipped: number;
  errors: string[];
};

/**
 * CSV import form for bulk-loading leads into the database.
 * Accepts a WarpLeads-format CSV file and reports insert/skip counts.
 */
export function ImportLeadsForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError('');

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch('/api/admin/import-leads', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Import failed');
        return;
      }
      setResult(data as ImportResult);
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
        <h1 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">Import leads</h1>
        <p className="mb-5 text-sm text-[var(--color-text-muted)]">
          Upload a CSV file with the WarpLeads export format. New job titles, countries, cities,
          industries, and company sizes are created automatically. Rows with duplicate emails or
          phone numbers are skipped.
        </p>

        {/* Expected columns hint */}
        <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Expected columns</p>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            FirstName, LastName, JobTitle, PersonLinkedInUrl, PersonCountry,
            CompanyName, CompanyIndustry, CompanySize, CompanyCity,
            WorkEmail, PersonalEmail, Phone1, Phone2
          </p>
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
            {loading ? 'Importing…' : 'Import CSV'}
          </button>
        </form>

        {/* Result summary */}
        {result && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-brand)]">{result.inserted}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Inserted</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-text-secondary)]">{result.skipped}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Skipped</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <details className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)]">
                  {result.errors.length} row error{result.errors.length !== 1 ? 's' : ''}
                </summary>
                <ul className="max-h-48 overflow-auto border-t border-[var(--color-border)] px-4 py-2">
                  {result.errors.map((e, i) => (
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
