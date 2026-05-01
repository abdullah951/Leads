'use client';

// ─── Imports ──────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl'; // i18n for client components
import { API_ROUTES } from '@/constants/apiRoutes'; // centralised API URL constants

// ─── Types ────────────────────────────────────────────────────────────────────

// Shape of a file record returned by the list API
type UploadedFile = {
  id: number;
  uploadName: string;
  filename: string;
  rowCount: number;
  createdAt: string; // ISO timestamp string
};

// Possible WarpLeads fields a CSV column can be mapped to
// Empty string means "not mapped / ignored"
type ColumnField = '' | 'email' | 'linkedin' | 'company_name' | 'company_website';

// Temporary state held while the user is on the mapping view (before hitting Import).
// The raw File object is kept here so it can be uploaded when Import is clicked.
// No server call is made until the user actually clicks Import.
type PendingUpload = {
  file: File; // raw CSV File — held client-side until Import is clicked
  columns: string[]; // column names parsed client-side (from header row or auto-generated)
  previewRows: string[][]; // up to 100 data rows parsed client-side for preview
  rowCount: number; // total data rows in the file (capped at MAX_ROWS = 2000 client-side for display)
};

// The three views of this wizard
type View = 'upload' | 'mapping' | 'list';

// How many preview rows to display per page in the mapping table
const PREVIEW_PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats an ISO timestamp as "MM-DD-YYYY at H:MM AM/PM".
 * Used to display the upload date in the list view.
 */
function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // convert 0 → 12 for 12 AM
  return `${month}-${day}-${year} at ${hours}:${minutes} ${ampm}`;
}

// Max data rows to count / show in the preview (mirrors the server-side MAX_ROWS limit)
const CLIENT_MAX_ROWS = 2000;

/**
 * Parses raw CSV text into columns + preview rows entirely in the browser.
 * Mirrors the server-side parseCsv logic so the mapping view is accurate.
 *
 * @param text - Raw CSV file content as a string.
 * @param firstRowIsHeader - Whether the first row should be treated as column headers.
 * @returns columns, up to 100 previewRows, and the capped rowCount.
 */
/**
 * Splits a single CSV line into fields using a character-by-character state machine.
 * Correctly handles:
 *   - Quoted fields that contain commas  e.g.  "New York, NY"
 *   - Quoted fields that contain escaped quotes  e.g.  "He said ""hi"""
 *   - Unquoted fields with surrounding whitespace (trimmed)
 *
 * @param line - A single raw CSV line string.
 * @returns Array of field strings with outer quotes removed.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = ''; // characters accumulated for the current field
  let inQuotes = false; // true while inside a "..." quoted field

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead: two consecutive quotes inside a quoted field = escaped literal quote
        if (line[i + 1] === '"') {
          current += '"'; // add one literal quote to the field value
          i++; // skip the second quote character
        } else {
          // Closing quote — exit quoted mode
          inQuotes = false;
        }
      } else {
        // Normal character inside quotes — add as-is (commas are NOT delimiters here)
        current += ch;
      }
    } else {
      if (ch === '"') {
        // Opening quote — enter quoted mode (don't add the quote to the value)
        inQuotes = true;
      } else if (ch === ',') {
        // Comma outside quotes = field delimiter — save current field and start next
        fields.push(current.trim());
        current = '';
      } else {
        // Normal unquoted character
        current += ch;
      }
    }
  }

  // Push the last field (there is no trailing comma to trigger the push above)
  fields.push(current.trim());

  return fields;
}

/**
 * Parses raw CSV text into columns + preview rows entirely in the browser.
 * Uses splitCsvLine so quoted fields containing commas are handled correctly.
 *
 * @param text - Raw CSV file content as a string.
 * @param firstRowIsHeader - Whether the first row should be treated as column headers.
 * @returns columns, up to 100 previewRows, and the capped rowCount.
 */
function parseClientCsv(
  text: string,
  firstRowIsHeader: boolean,
): { columns: string[]; previewRows: string[][]; rowCount: number } {
  // Split text into non-empty lines, then parse each line using the proper field splitter
  const allRows = text
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line => splitCsvLine(line));

  let columns: string[];
  let dataRows: string[][];

  if (firstRowIsHeader && allRows.length > 0) {
    // First row becomes the column names; remaining rows are data
    columns = allRows[0]!;
    dataRows = allRows.slice(1, CLIENT_MAX_ROWS + 1); // cap at 2000 data rows
  } else {
    // No header — generate generic names: Column 1, Column 2, …
    const colCount = allRows[0]?.length ?? 0;
    columns = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    dataRows = allRows.slice(0, CLIENT_MAX_ROWS);
  }

  return {
    columns,
    previewRows: dataRows.slice(0, 100), // show at most 100 rows in the paginated preview table
    rowCount: dataRows.length, // total data rows (capped at CLIENT_MAX_ROWS)
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Manages the three-view Uploaded Files wizard: upload card → column mapping → file list.
 * Views are rendered conditionally based on the `view` state variable.
 */
export function UploadedFilesView() {
  const t = useTranslations('UploadedFilesPage');

  // ── State ────────────────────────────────────────────────────────────────

  const [isDragOver, setIsDragOver] = useState(false); // true while a file is dragged over the drop zone
  const [view, setView] = useState<View>('upload'); // which wizard step is visible
  const [files, setFiles] = useState<UploadedFile[]>([]); // user's uploaded files for the list view
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true); // user's header toggle on upload screen
  const [uploading, setUploading] = useState(false); // true while the CSV upload request is in-flight
  const [pending, setPending] = useState<PendingUpload | null>(null); // data returned by upload API, used in mapping view
  const [uploadName, setUploadName] = useState(''); // editable name for the upload record
  const [columnMappings, setColumnMappings] = useState<ColumnField[]>([]); // one entry per CSV column, tracks what it's mapped to
  const [importing, setImporting] = useState(false); // true while the import (save mappings) request is in-flight
  const [deletingId, setDeletingId] = useState<number | null>(null); // id of file currently being deleted (shows disabled state)
  const [downloadingId, setDownloadingId] = useState<number | null>(null); // id of file currently being downloaded (shows disabled state)
  // dropdownOpen / dropdownRef removed — upload view now uses a direct button click

  // Preview table pagination — tracks which page of the 100 preview rows is visible
  const [previewPage, setPreviewPage] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_dropdownOpen, setDropdownOpen] = useState(false); // true while the file-picker dropdown is open

  const fileInputRef = useRef<HTMLInputElement>(null); // hidden file input triggered by the upload button

  // ── Effects ──────────────────────────────────────────────────────────────

  // Load the user's existing files on first mount
  useEffect(() => {
    loadFiles();
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────

  /**
   * Fetches the user's uploaded files from the list API.
   * If files exist, goes straight to the list view; otherwise shows the upload card.
   */
  function loadFiles() {
    fetch(API_ROUTES.uploadedFiles.list, { method: 'POST', body: '{}' })
      .then(r => r.json())
      .then((data: UploadedFile[]) => {
        setFiles(data);
        // If they already have files, show the list; otherwise show the upload wizard
        setView(data.length > 0 ? 'list' : 'upload');
      })
      .catch(() => {});
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * Called when the user picks a CSV file from their computer.
   * Parses the CSV entirely in the browser — NO server call is made here.
   * The raw File object is stored in `pending` so it can be uploaded when Import is clicked.
   */
  async function handleFileSelected(file: File) {
    setDropdownOpen(false);
    setUploading(true); // brief loading state while file.text() reads the file

    try {
      // Read the file as text in the browser
      const text = await file.text();

      // Parse client-side: get columns, up to 100 preview rows, and the capped row count
      const { columns, previewRows, rowCount } = parseClientCsv(text, firstRowIsHeader);

      // Store the raw File for upload on Import, plus parsed metadata for the mapping view
      setPending({ file, columns, previewRows, rowCount });

      // Default name uses today's date; user can rename it in the mapping view
      setUploadName(`Upload-${new Date().toISOString().split('T')[0]}`);

      // Initialise all column mappings to empty — one slot per CSV column
      setColumnMappings(new Array(columns.length).fill(''));

      // Reset preview pagination to page 1 for each new file
      setPreviewPage(1);

      setView('mapping');
    } catch {}
    finally {
      setUploading(false);
    }
  }

  /**
   * Called when the user clicks Import on the mapping view.
   * Step 1: uploads the CSV file to the server (stores it on disk + creates DB record).
   * Step 2: saves the column mappings against the newly created DB record.
   * On success, reloads the file list and navigates to the list view.
   */
  async function handleImport() {
    if (!pending) return;
    setImporting(true);

    // Find the column index for each WarpLeads field; findIndex returns -1 if not mapped → send null
    const emailCol = columnMappings.findIndex(m => m === 'email');
    const linkedInCol = columnMappings.findIndex(m => m === 'linkedin');
    const companyNameCol = columnMappings.findIndex(m => m === 'company_name');
    const companyWebsiteCol = columnMappings.findIndex(m => m === 'company_website');

    try {
      // ── Step 1: upload the CSV file to get a DB record id ──────────────
      const formData = new FormData();
      formData.append('file', pending.file); // the raw File stored in pending state
      formData.append('firstRowIsHeader', String(firstRowIsHeader));
      formData.append('uploadName', uploadName);

      const uploadRes = await fetch(API_ROUTES.uploadedFiles.upload, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) return; // abort if upload failed

      const uploadData = await uploadRes.json();
      const fileId: number = uploadData.id; // DB record id returned by the upload API

      // ── Step 2: save column mappings against the newly created record ───
      await fetch(API_ROUTES.uploadedFiles.import, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fileId,
          uploadName,
          emailColumn: emailCol >= 0 ? emailCol : null,
          linkedInColumn: linkedInCol >= 0 ? linkedInCol : null,
          companyNameColumn: companyNameCol >= 0 ? companyNameCol : null,
          companyWebsiteColumn: companyWebsiteCol >= 0 ? companyWebsiteCol : null,
        }),
      });

      setPending(null); // clear pending — no longer needed after successful import
      loadFiles(); // re-fetch the file list and navigate to the list view
    } catch {}
    finally {
      setImporting(false);
    }
  }

  /**
   * Deletes a file record from the DB and removes it from local state.
   * If no files remain after deletion, reverts to the upload view.
   */
  async function handleDelete(id: number) {
    setDeletingId(id); // disable the delete button for this row while in-flight
    try {
      await fetch(API_ROUTES.uploadedFiles.delete, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setFiles((prev) => {
        const next = prev.filter(f => f.id !== id);
        // If we just deleted the last file, go back to the upload card
        if (next.length === 0) setView('upload');
        return next;
      });
    } catch {}
    finally {
      setDeletingId(null);
    }
  }

  /**
   * Downloads a CSV file by posting to the download API, which streams the file back.
   * Creates a temporary <a> element with an object URL to trigger the browser's Save As dialog.
   * revokeObjectURL is intentionally delayed so the browser has time to start the download.
   *
   * @param id - DB record id of the file to download.
   * @param filename - Original filename used as the suggested download name.
   */
  async function handleDownload(id: number, filename: string) {
    setDownloadingId(id); // show loading state on the button while request is in-flight
    try {
      const res = await fetch(API_ROUTES.uploadedFiles.download, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        // Surface the server error in the console so it's easy to diagnose
        console.error('Download failed:', res.status, await res.text());
        return;
      }

      // Convert the response body to a Blob, then wrap it in a temporary object URL
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Create a hidden <a> tag and programmatically click it to trigger Save As
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `upload-${id}.csv`; // suggested filename for the Save As dialog
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Delay the revoke so the browser has time to read the object URL and start the download.
      // Revoking immediately (before the download starts) can cause the download to fail silently.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null); // restore button state regardless of success or failure
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  // Import button is disabled until the user maps at least one column
  const hasAnyMapping = columnMappings.some(m => m !== '');

  // Dropdown options for the column mapping <select> elements
  const columnOptions: { value: ColumnField; label: string }[] = [
    { value: '', label: t('col_map_select') },
    { value: 'email', label: t('col_map_email') },
    { value: 'linkedin', label: t('col_map_linkedin') },
    { value: 'company_name', label: t('col_map_company_name') },
    { value: 'company_website', label: t('col_map_company_website') },
  ];

  // ── Preview pagination (mapping view) ─────────────────────────────────────

  // Total pages based on how many preview rows were returned (up to 100)
  const previewTotalPages = pending
    ? Math.ceil(pending.previewRows.length / PREVIEW_PAGE_SIZE)
    : 1;

  // Slice of previewRows visible on the current page
  const visiblePreviewRows = pending
    ? pending.previewRows.slice(
        (previewPage - 1) * PREVIEW_PAGE_SIZE,
        previewPage * PREVIEW_PAGE_SIZE,
      )
    : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── Upload view ──────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === 'upload') {
    return (
      // Layout provides pl-[160px] pt-14 — outer div fills screen, inner div centres content at max-w-6xl
      <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Page heading — top-left, semi-bold Slate-900 ────────────────────── */}
        <h1 className="mb-6 text-lg font-semibold text-[var(--color-text-primary)]">
          {t('import_title')}
        </h1>

        {/* ── Drag-and-drop zone — full-width dashed border container ─────────── */}
        {/* Border switches to Indigo-600 when a file is dragged over */}
        <div
          className={[
            'flex min-h-[320px] w-full flex-col items-center justify-center rounded-[var(--radius-lg)]',
            'border border-dashed transition-colors duration-150',
            isDragOver
              ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'  // indigo active state
              : 'border-[var(--color-border)] bg-[var(--color-surface)]',    // default slate-200
          ].join(' ')}
          // ── Drag-and-drop event handlers ──────────────────────────────────────
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            // Only process the first dropped file, and only .csv files
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) handleFileSelected(file);
          }}
        >
          {/* ── Action stack — vertically centred ──────────────────────────────── */}
          <div className="flex flex-col items-center gap-4">

            {/* Status text */}
            <p className="text-base text-[var(--color-text-muted)]">
              {t('no_files_yet')}
            </p>

            {/* Primary action — solid Indigo-600 "Upload CSV File" button */}
            <button
              type="button"
              disabled={uploading}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {/* Upload arrow-up icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploading ? t('uploading') : t('upload_csv_button')}
            </button>

            {/* ── Secondary controls row — checkbox | divider | sample link ──────── */}
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">

              {/* Custom Indigo checkbox: "First row contains headers" */}
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  className="size-3.5 cursor-pointer accent-[var(--color-brand)]"
                  checked={firstRowIsHeader}
                  onChange={e => setFirstRowIsHeader(e.target.checked)}
                />
                <span className="text-[13px]">{t('first_row_header')}</span>
              </label>

              {/* Vertical pipe divider */}
              <span className="text-[var(--color-border)] select-none">|</span>

              {/* Download sample CSV link — Slate-500, underline on hover */}
              <a
                href="/sample-upload.csv"
                download="sample-upload.csv"
                className="text-[13px] text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
              >
                {t('download_sample')}
              </a>

            </div>
          </div>
        </div>

        {/* Hidden file input — triggered by the "Upload CSV File" button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
            e.target.value = ''; // reset so the same file can be re-selected
          }}
        />
      </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── Mapping view ─────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === 'mapping' && pending) {
    return (
      // Layout already provides pl-[160px] pt-14
      <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Editable upload name — user can rename before importing */}
        <div className="mb-6 max-w-xs">
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            {t('upload_name_label')}
          </label>
          <input
            type="text"
            value={uploadName}
            onChange={e => setUploadName(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        {/* Section header + hints */}
        <h2 className="mb-1 text-base font-bold text-[var(--color-text-primary)]">{t('column_mappings_title')}</h2>
        <p className="mb-1 text-sm text-[var(--color-text-secondary)]">{t('column_mappings_hint')}</p>

        {/* Shows "Showing X of Y rows" so user knows preview is a subset */}
        {/* <p className="mb-4 text-xs text-[var(--color-text-muted)]">
          {t('preview_hint', { preview: pending.previewRows.length, total: pending.rowCount })}
        </p> */}

        {/* ── Column mapping table ─────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              {/* Header row: one <th> per CSV column, each with a mapping <select> below it */}
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
                {pending.columns.map((col, i) => (
                  <th
                    key={i}
                    className="min-w-[160px] border-r border-[var(--color-border)] px-4 py-3 text-left font-semibold text-[var(--color-text-primary)] last:border-r-0"
                  >
                    {/* CSV column name */}
                    <div className="mb-2">{col}</div>

                    {/* Mapping dropdown: choose which WarpLeads field this column maps to */}
                    <select
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                      value={columnMappings[i] ?? ''}
                      onChange={(e) => {
                        const value = e.target.value as ColumnField;
                        const next = [...columnMappings];

                        // If a real field (non-empty) is chosen, clear any other column
                        // that is already mapped to the same field — each WarpLeads field
                        // can only be assigned to one CSV column at a time.
                        if (value !== '') {
                          for (let j = 0; j < next.length; j++) {
                            if (j !== i && next[j] === value) {
                              next[j] = ''; // reset the conflicting column back to "Select"
                            }
                          }
                        }

                        next[i] = value; // set the new value for this column
                        setColumnMappings(next);
                      }}
                    >
                      {columnOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Render only the rows for the current preview page */}
              {visiblePreviewRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--color-border)] last:border-b-0">
                  {pending.columns.map((_, ci) => (
                    <td
                      key={ci}
                      className="border-r border-[var(--color-border)] px-4 py-2.5 text-[var(--color-text-secondary)] last:border-r-0"
                    >
                      {row[ci] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Preview pagination ───────────────────────────────────────────── */}
        {previewTotalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">

            {/* Page indicator e.g. "Page 1 of 10" */}
            <span>
              {t('preview_page', { page: previewPage, total: previewTotalPages })}
            </span>

            {/* Prev / Next buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={previewPage <= 1}
                className="rounded-[var(--radius-md)] px-3 py-1 hover:bg-[var(--color-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPreviewPage(p => p - 1)}
              >
                {t('prev')}
              </button>
              <button
                type="button"
                disabled={previewPage >= previewTotalPages}
                className="rounded-[var(--radius-md)] px-3 py-1 hover:bg-[var(--color-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPreviewPage(p => p + 1)}
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}

        {/* ── Import button ────────────────────────────────────────────────── */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={!hasAnyMapping || importing}
            className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleImport}
          >
            {importing ? t('importing') : t('import_button')}
          </button>
        </div>
      </div>
    </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── List view ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // Layout already provides pl-[160px] pt-14
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Header row: title + "Upload new CSV file" button */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide text-[var(--color-text-primary)]">
            {t('list_title')}
          </h1>
          {/* Upload new — styled to match FavoritesView action buttons */}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
            onClick={() => setView('upload')}
          >
            {/* Upload icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t('upload_new_button')}
          </button>
        </div>

        {/* Files table — rounded border container mirrors FavoritesView */}
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              {/* Headers use font-medium + text-secondary to match FavoritesView */}
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_upload_name')}</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_rows')}</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_date_uploaded')}</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] last:border-b-0">
                  {/* Upload name — slightly emphasised like FavoritesView name cell */}
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{file.uploadName}</td>
                  {/* toLocaleString adds comma separators e.g. 1,500 */}
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{file.rowCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(file.createdAt)}</td>
                  <td className="px-4 py-3">
                  {/* Action buttons — shown side by side */}
                  <div className="flex items-center gap-1">

                    {/* Download button — disabled while this file's download is in-flight */}
                    <button
                      type="button"
                      aria-label={t('download_aria')}
                      disabled={downloadingId === file.id}
                      className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-brand)] disabled:opacity-50"
                      onClick={() => handleDownload(file.id, file.filename)}
                    >
                      {/* Download icon */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>

                    {/* Delete button — disabled while delete request is in-flight for this row */}
                    <button
                      type="button"
                      aria-label={t('delete_aria')}
                      disabled={deletingId === file.id}
                      className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-error-light)] hover:text-[var(--color-error)] disabled:opacity-50"
                      onClick={() => handleDelete(file.id)}
                    >
                      {/* Trash icon */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>{/* end table container */}

      </div>{/* end mx-auto inner column */}
    </div>
  );
}
