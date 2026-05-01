## Uploaded Files — CSV Import UI (Implementation Steps)

Add the following implementation steps for the uploaded CSV import UI described in the attachments (Images 1–5). This is a spec-only addition; do not implement yet.

- **Route**: Add a client page at `/uploaded-files` (`app/uploaded-files/page.tsx`) that lists uploaded CSV files and provides an `Upload new CSV file` action (see Image 5).
- **Upload card**: Implement an `UploadCsvCard` component matching Image 1. It should include:
  - `First row contain header` checkbox.
  - `Select CSV File` primary button to open a native `.csv` file picker (Image 2).
  - `Download Sample File` link.
- **File selection & parsing**:
  - When a CSV is selected, parse it client-side or server-side (see questions below) and render a preview table (Image 3).
  - Enforce a hard limit of 2000 rows — ignore rows after the limit and show a non-blocking notice in the preview.
  - If `First row contain header` is checked, use the first row as column headings; otherwise generate `Column 1`, `Column 2`, etc.
- **Preview + mappings**:
  - Render the first N preview rows and a dropdown above each column for mapping.
  - Dropdown options: `Select`, `FirstName`, `LastName`, `Email`, `LinkedIn Url`, `Company Name`, `Company Website` (Image 4).
  - Dropdowns default to `Select`.
- **Mapping overwrite rule**:
  - Selecting a mapping assigns that mapping to the column.
  - If a mapping is already assigned elsewhere, clear the previous assignment so the new selection overwrites the earlier one (later selection wins).
  - UI must update immediately to reflect overwritten mappings.
- **Import validation & toast**:
  - `Import` is allowed only when at least one column is mapped.
  - If the user clicks `Import` with no mapped columns, show a toast message. "Please select column first" and do not proceed.
- **Import action & post-import listing**:
  - On valid import, construct a payload mapping CSV columns → chosen fields and include parsed rows; call the agreed API endpoint (placeholder `POST /api/uploaded-files/import`).
  - Show progress and success/error toasts; on success add the uploaded file entry to the `/uploaded-files` list with upload name and date uploaded; include a delete action (`POST /api/uploaded-files/delete`).
- **Edge cases & accessibility**:
  - Trim whitespace, handle empty cells gracefully, and optionally flag invalid email formats in preview (warning only).
  - Ensure keyboard accessibility and proper aria attributes for inputs, dropdowns and buttons.

### Questions / Clarifications

1. Should CSV parsing happen client-side (e.g. `papaparse`) or server-side (upload file, server returns preview)?
it will be client side.
2. Confirm mapping keys to expose: `FirstName`, `LastName`, `Email`, `LinkedIn Url`, `Company Name`, `Company Website`. Any additions or different labels?
only these labels
3. For duplicate mapping choices, confirm that the later selection should overwrite earlier assignments (clear previous). Is that correct?
4. Which API endpoints should be used for import/list/delete (if different from `API_ROUTES.files.uploaded`)?
5. Should deduplication (e.g., by email) happen client-side before import, or leave to the backend?
6. Persist uploaded-file metadata server-side or is in-memory/session persistence acceptable for initial UI?

Reply with your choices and I will prepare the implementation tasks when you say "implement".
