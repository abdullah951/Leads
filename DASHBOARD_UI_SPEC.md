# Dashboard UI Specification

> **Status:** Ready for implementation — all open questions resolved, all API contracts defined.

---

## Layout Overview

The dashboard is a full-viewport layout with:
- A **fixed top bar** (spans full width)
- A **fixed left sidebar** (filter panel, scrollable independently)
- A **main content area** (right of sidebar, scrollable)

---

## 1. Top Bar

### Structure (left → right)

| Slot | Content |
|---|---|
| Left | App logo / name |
| Center nav | Leads Lists · Uploaded Files · Export Jobs |
| Right | Notification bell · Credits counter · Go Unlimited button · User email + avatar dropdown |

### Notes
- Center nav items: **Uploaded Files** is a non-functional placeholder. **Leads Lists** is functional — navigates to `/leads-lists`. **Export Jobs** is functional — navigates to `/export-jobs`.
- **Credits counter is functional** — calls `POST /api/credits/balance` on dashboard page load; decrements client-side after each reveal; server is source of truth on next load.
- Notification bell and Go Unlimited button are placeholders for now.
- User email shown from JWT payload (already available via `access_token` cookie).
- Exact styling to match WarpLeads reference (white background, subtle bottom border).

---

## 2. Sidebar — Filters Panel

### Header
- Title: **"Filters"**
- Right side: **"Filter actions ▾"** dropdown button — clicking opens a menu with three options:

| Option | Behavior |
|---|---|
| Load Filters | Calls `POST /api/saved-searches/list` → opens a picker showing all saved searches for this user → selecting one parses its `searchJson` and applies every filter value to the filter state, then fires `POST /api/leads/search` |
| Save Filters | Opens the Save Search dialog |
| Clear all filters | Resets all filters to defaults: Has Company Email ✅, Has Personal Email ✅, Has Phone ☐, all other filters empty. Fires `POST /api/leads/search` with the reset state. |

#### Save Search dialog

```
┌─ Save Search ──────────────────────── × ─┐
│                                           │
│  Save search name                         │
│  [ Enter a name...                    ]   │
│                                           │
├───────────────────────────────────────────┤
│                                [ Save ]   │
└───────────────────────────────────────────┘
```

- Header: "Save Search" (left) · X close (right)
- Label: "Save search name"
- Text input (required, non-empty)
- Divider above footer
- **Save** button (primary, bottom-right) — calls `POST /api/saved-searches/save` with `{ name, searchJson: JSON.stringify(currentFilterState) }`; closes dialog on success; shows success toast "Filter set saved"

#### Load Filters — picker behavior

- `POST /api/saved-searches/list` fires immediately when "Load Filters" is clicked
- Response (see Section 8.5): list of `{ savedSearchId, savedSearchName }` items
- Shown as a simple dropdown list or small modal listing saved search names
- Clicking a name: parses `searchJson`, overwrites all filter state values (IDs + `selected*` display labels), fires `POST /api/leads/search`



### Always-visible checkboxes (no expand/collapse)

| Checkbox | Default |
|---|---|
| Has Company Email | ✅ checked |
| Has Personal Email | ✅ checked |
| Has Phone | ☐ unchecked |

Toggling any of these checkboxes immediately fires `POST /api/leads/search` with the full current filter state in the request body.

---

### Collapsible Filter Sections

Each section has a **`> Label`** header that toggles expand/collapse.
When expanded it shows **`v Label`**.
Active/selected filters highlight the label in **orange/amber** (matching WarpLeads).

---

#### 2.1 Name, Email, LinkedIn Url

**Expand behavior:** Opens inline below the header.

| Element | Behavior |
|---|---|
| Text input `Enter persons name search...` | On `Enter` key → fires `POST /api/leads/search` with full filter body including `fullName` field |
| **— Emails —** section label | Static divider |
| `Include leads` link + `Select uploaded files...` | UI slot — if a user upload file in Uploaded files in top bar and then clicks search for uploaded files it will appear here |
| `Exclude leads` link + `Select uploaded files...` | if a user upload file in Uploaded files in top bar and then clicks search for uploaded files it will appear here |
| **— LinkedIn Urls —** section label | Static divider |
| `Include leads` link + `Select uploaded files...` | if a user upload file in Uploaded files in top bar and then clicks search for uploaded files it will appear here |
| `Exclude leads` link + `Select uploaded files...` | if a user upload file in Uploaded files in top bar and then clicks search for uploaded files it will appear here |

In the search api, selected files id will be send and the csv filew will be parsed. If user select the file in Email URl in Include leads in the datatable only those leads will be shown which emails are included in the file 
likewise for LinkedIn Urls Included leads section

In the search api, selected files id will be send and the csv file will be parsed. If user select the file in Emal URl in Excluded leads in the datatable only those leads will be shown which emails are Excluded in the file 
likewise for LinkedIn Urls Excluded leads section
---

#### 2.2 Job Title

**Expand behavior:** Opens inline.

| Element | Behavior |
|---|---|
| Search input `Search for a job title...` | On type → fires `POST /api/job-titles` with `{ q }` body → shows autocomplete dropdown |
| Autocomplete dropdown | Shows matching job titles from `job_title` table (e.g. manager, teacher, owner...) |
| Selecting an item | Adds a removable chip (e.g. `Manager ×`) and fires `POST /api/leads/search` with full filter body |
| Removing a chip | Removes value and fires `POST /api/leads/search` |
| Multiple selections | Supported — chips stack in the input |

**Management Levels** (sub-section, always visible when Job Title is expanded):

Loaded from `POST /api/filters/management-levels` on dashboard mount. Each item has `{ id: number, label: string }`.

| Item | Behavior |
|---|---|
| `+ C-Suite (9)` | Clicking `+` expands to show C-Suite sub-checkboxes; `–` collapses |
| C-Suite checkboxes | Executive · Finance Executive · Human Resource Executive · IT Executive · Legal Executive · Marketing Executive · Medical & Health Executive · Operations Executive · Sales Executive |
| Individual level checkboxes | Founder · Owner · Director · Manager · Head · VP · Partner · Senior |
| Toggling any checkbox | Fires `POST /api/leads/search` with full filter body |

**Departments** (sub-section below Management Levels):

Loaded from `POST /api/filters/departments` on dashboard mount. Each item has `{ id: number, label: string }`.

Checkboxes (flat list — no expand):
Engineering · Consulting · Education · Arts And Design · Healthcare Services · Finance · Human Resources · Information Technology · Legal · Marketing · Operations · Sales

Toggling any department checkbox fires `POST /api/leads/search` with full filter body.

---

#### 2.3 Location

**Expand behavior:** Opens inline.

Label: **"City, State or Country"**

| Element | Behavior |
|---|---|
| Search input `Search for location...` | On type → fires `POST /api/locations` with `{ q }` body → shows city/country dropdown |
| Selecting a location | Adds a removable chip (e.g. `Maastricht, Limburg ×`) and fires `POST /api/leads/search` |
| Removing a chip | Removes value and fires `POST /api/leads/search` |
| Multiple selections | Supported — chips stack in the input |

**Region groups** (expand individually with `+`/`–`):

| Region | Count | Countries |
|---|---|---|
| North America | 42 | Select All(When it is selected all states will be selected),United States, Canada, Mexico, Puerto Rico, Honduras, El Salvador, Bermuda, Trinidad And Tobago, Jamaica, Dominican Republic, Netherlands Antilles, Costa Rica, Cayman Islands, Belize, British Virgin Islands, Panama, Guadeloupe, Cuba, Haiti, Guatemala
,Barbados,Bahamas,Antigua And Barbuda,Nicaragua,Grenada,Aruba,Martinique
,U.S. Virgin Islands,Turks And Caicos Islands,Anguilla,Saint Lucia,
Saint Kitts And Nevis,Montserrat,Greenland,Dominica,Curaçao,
Saint Vincent And The Grenadines,Saint Pierre And Miquelon
,Saint Helena.Saint Barthélemy,Caribbean Netherlands,Saint Martin |
| South America | 14 | Select All(When it is selected all states will be selected), Brazil,Argentina,Peru,Chile,Colombia,Uruguay,Bolivia
,Venezuela,Ecuador,Paraguay,Suriname,French Guiana,Guyana
Falkland Islands |
| Europe | 53 | Select All(When it is selected all states will be selected), Netherlands,United Kingdom,Guernsey,Germany,Switzerland
,Ireland,Hungary,Italy,Ukraine,Belgium,Czechia,Portugal,Denmark
,Spain,France,Sweden,Poland,Finland,Romania,Luxembourg,Norway
,Austria,Estonia,Malta,Russia,Croatia,Cyprus,Greece,Montenegro
,Bosnia And Herzegovina,Slovakia,Latvia,Moldova,Monaco,Belarus,Bulgaria
,Serbia,Macedonia,Slovenia,Gibraltar,Liechtenstein,Lithuania,Iceland
,Faroe Islands,Albania,Jersey,Isle Of Man,Åland Islands,Kosovo,Vatican City
,San Marino,Andorra,Svalbard And Jan Mayen|
| Asia | 53 | Select All(When it is selected all states will be selected), Afghanistan,Turkey,Japan,India,China,Israel,Singapore,Oman,Thailand,Malaysia,Philippines,Pakistan,United Arab Emirates,Saudi Arabia
,South Korea,Bahrain,Kuwait,Lebanon,Indonesia,Taiwan,Qatar,Nepal
,Iran,Jordan,Myanmar,Macau,Syria,Hong Kong,Vietnam,Bangladesh,Mongolia
,Sri Lanka,Kazakhstan,Azerbaijan,Georgia,Iraq,Palestine,Cambodia,Maldives
,Armenia,Brunei,Laos,Yemen,Bhutan,Turkmenistan,Uzbekistan,Kyrgyzstan
,Timor-Leste,Tajikistan,British Indian Ocean Territory,Christmas Island
,São Tomé And Príncipe,North Korea |
| Africa | 58 | Select All(When it is selected all states will be selected), Kenya,Togo,South Africa,Ghana,Morocco,Nigeria,Botswana
,Niger,Côte D’Ivoire,Egypt,Angola,Zimbabwe,Algeria,Mauritius
,Djibouti,Tanzania,Cameroon,Burkina Faso,Gabon,Tunisia,Uganda,Ethiopia
,Senegal,Swaziland,Libya,Malawi,Seychelles,Zambia,
Democratic Republic Of The Congo,Madagascar,Sudan,Rwanda,
Mozambique,Eritrea,Mali,Namibia,Lesotho,Sierra Leone,Benin,
Mauritania,Somalia,Chad,Gambia,Equatorial Guinea,
Republic Of The Congo,Guinea-Bissau,Guinea,Réunion,Liberia,
Comoros,Central African Republic,Burundi,Mayotte,South Sudan
,Cape Verde,Western Sahara |
| Oceania | 26 | Select All(When it is selected all states will be selected), Australia,New Zealand,Guam,Papua New Guinea,
Fiji,Tuvalu,Northern Mariana Islands,New Caledonia,Norfolk Island,
Vanuatu,French Polynesia,American Samoa,Micronesia,Marshall Islands
,Pitcairn,Nauru,Cocos (Keeling) Islands,Samoa,Palau,Tonga,Solomon Islands
,Cook Islands,Kiribati,Wallis And Futuna,Niue,Tokelau |

Each region expands to show:
- `Select all` checkbox
- Individual country checkboxes

Checking or unchecking any country or "Select all" fires `POST /api/leads/search` with full filter body.

The region → country mapping is **hardcoded in the UI**. The counts (42, 14, 53...) are static — total countries per region, not live lead counts. The API receives `countries: number[]` (country IDs) in the search payload.

---

#### 2.4 Company

**Expand behavior:** Opens inline.

| Element | Behavior |
|---|---|
| Search input `Search by Company Name...` | On type → fires `POST /api/leads/companies` with `{ q }` body → shows autocomplete dropdown |
| Selecting a company | Adds a removable chip and fires `POST /api/leads/search` |
| Removing a chip | Removes value and fires `POST /api/leads/search` |
| **— Company Names —** divider | Static |
| `Include companies` + `Select uploaded files...` | Same uploaded-files pattern as Name/Email section |
| `Exclude companies` + `Select uploaded files...` | Same |
| **— Company Websites —** divider | Static |
| `Include companies` + `Select uploaded files...` | Same |
| `Exclude companies` + `Select uploaded files...` | Same |

---

#### 2.5 Industry

**Expand behavior:** Opens inline.

| Element | Behavior |
|---|---|
| Text input `Enter Industry...` | On type → fires `POST /api/industries` with `{ q }` body → autocomplete from `company_industry` table |
| Selecting an industry | Adds a removable chip and fires `POST /api/leads/search` |
| Removing a chip | Removes value and fires `POST /api/leads/search` |

---

#### 2.6 Employee Count

**Expand behavior:** Shows flat checkbox list.

Checkboxes loaded from `POST /api/filters/company-sizes` on dashboard mount. Each item has `{ id: number, label: string }` (e.g. `{ id: 1, label: "1-10" }`). Labels displayed in the UI; IDs sent in `companySizes` payload field.

Expected labels: 1-10 · 11-50 · 51-200 · 201-500 · 501-1000 · 1001-5000 · 5001-10000 · 10000+

Toggling any range checkbox fires `POST /api/leads/search` with full filter body.

---

#### 2.7 Technology

**Expand behavior:** Opens inline.

| Element | Behavior |
|---|---|
| Text input `Enter technology name...` | On type → fires `POST /api/technologies` with `{ q }` body → shows autocomplete dropdown |
| Selecting a technology | Adds a removable chip and fires `POST /api/leads/search` |
| Removing a chip | Removes value and fires `POST /api/leads/search` |

---

#### 2.8 Skills

**Expand behavior:** Opens inline.

| Element | Behavior |
|---|---|
| Text input `Enter skill name...` | On type → fires `POST /api/skills` with `{ q }` body → shows autocomplete dropdown |
| Selecting a skill | Adds a removable chip and fires `POST /api/leads/search` |
| Removing a chip | Removes value and fires `POST /api/leads/search` |

---

#### 2.9 Education

**Expand behavior:** Opens inline.

**Degree** sub-section (flat checkboxes — hardcoded):
- Bachelor
- Master
- Associate
- Doctorate

Toggling any degree checkbox fires `POST /api/leads/search` with full filter body.

**Major** sub-section (autocomplete — like Job Title):

| Element | Behavior |
|---|---|
| Search input `Enter major...` | On type → fires `POST /api/education/majors` with `{ q }` body → shows autocomplete dropdown |
| Selecting a major | Adds a removable chip (e.g. `Computer Science ×`) and fires `POST /api/leads/search` |
| Removing a chip | Removes value and fires `POST /api/leads/search` |
| Multiple selections | Supported — chips stack in the input |

---

#### 2.10 Lists

**Expand behavior:** Opens inline.

Allows the user to include or exclude leads that belong to specific saved lists.

| Element | Behavior |
|---|---|
| **— Include lists —** label | Static divider |
| Search input `Search for lists...` | On type (300 ms debounce) → fires `POST /api/lists` with `{ search }` → shows matching list names |
| Selecting a list | Adds a removable chip and fires `POST /api/leads/search` |
| Removing a chip | Removes value and fires `POST /api/leads/search` |
| **— Exclude lists —** label | Static divider |
| Search input `Search for lists...` | Same pattern as Include — results fire `POST /api/leads/search` with `excludedLists` |

---

## 3. Main Content Area

### 3.1 Empty State (no filters active)

Shows a centered illustration with the text **"Apply filters to begin your search"**. No table, no count, no actions.

---

### 3.2 Results Table

Displayed as soon as at least one filter is applied and a leads search response arrives.

#### Table columns

| Column | Content |
|---|---|
| Checkbox | Row selection checkbox |
| Lead | Avatar (initials fallback) + full name |
| Title / Company | Job title · employer name |
| Location | City, Country |
| Contact | Company email icon · Personal email icon · Phone icon. See reveal behavior below. |

#### Contact reveal behavior

Each contact field (company email, personal email, phone) is shown as a **locked icon** until revealed.

| State | Appearance | Action |
|---|---|---|
| Not revealed | Greyed icon (🔒 or dimmed envelope/phone) | Clicking calls `POST /api/leads/reveal` with `{ selectedPersons: [personId] }`, deducts 1 credit, then shows the actual value inline |
| Already revealed | Full-color icon + actual value shown inline | No action, no credit charge — value is always visible |

- If `revealedWorkEmail` (or personal/phone equivalent) is non-null in the `LeadRow`, the value is shown immediately without a reveal call.
- If the user has 0 credits remaining, clicking a locked icon shows an inline "No credits remaining" message which is received in api call.
- There is **no confirmation step** before revealing — the click is immediate. Credits are shown in the top bar under Usage (button) so the user is always aware of their balance before clicking.

#### Results count

Above the table on the left: **"[N] leads found"** — updates on every search response (uses `total` from `LeadsSearchResponse`).

#### Pagination

Numbered page controls sit **below the table**:

```
[ < ]  1  2  3  ...  47  [ > ]
```

- Shows first page, current ±2 pages, last page, with `...` ellipsis between gaps.
- Clicking a page number fires `POST /api/leads/search` with `take: 20` and `skip: (selectedPage - 1) * 20` plus the current full filter state.
- `take` is fixed at **20** rows per page.
- When filter state changes, `skip` resets to `0` (page 1) automatically.
- The current page number is tracked in the UI's local state and derived from the response's `page` field.

---

### 3.3 Row Selection & Bulk Actions

A selection toolbar appears **above the table** as soon as at least one row is checked.

#### Selection toolbar layout (left → right)

| Slot | Content |
|---|---|
| Left | `[N] selected` label |
| Center | Chevron-down button — opens selection mode picker |
| Right | `Export` button · `Lists ▾` button |

#### Selection mode picker (opens below chevron button)

Radio buttons:

| Option | Behavior |
|---|---|
| Enter number of people | Shows a text input; user types a count N; selects the first N leads in the current result set |
| Select this page | Selects all rows visible on the current page |
| Select all [N total(Maximum will be 20,000)] | Marks a "select all" flag client-side (e.g. "Select all 20,000"). Does **not** load all IDs into memory. Export and Add to List operations with this flag active use a server-side background job. |
| Clear selection | Deselects everything; toolbar hides |

---

### 3.4 Export Dialog

Triggered by the **Export** button in the selection toolbar.

**Layout:**

```
┌─ Export data ─────────────────────── × ─┐
├──────────────────────────────────────────┤
│                                          │
│           [ Export ]                     │
│                                          │
│  Exporting e.g. 10 new records will      │
│  deduct 10 email/phone credits from      │
│  your account.                           │
│  Previously saved/exported contacts      │
│  do not cost credits.                    │
└──────────────────────────────────────────┘
```

- Header: "Export data" (left) · X close button (right)
- Divider below header
- Primary "Export" button — fires `POST /api/leads/export`:
  - **Normal selection** (specific rows checked): body `{ selectedPersons: number[] }`. Server creates a job, processes it, and returns `{ jobId, downloadUrl, status: "completed" }`. Browser navigates to the returned `downloadUrl` to trigger download.
  - **Select all active**: body `{ export: true, selectedPersons: [], deselectedPersons: [], selectFirstRows: N, Query: LeadsSearchPayload }`. Server queues a background job and returns `{ jobId, status: "pending" }`. Dialog closes immediately; toast shown: **"We will export contacts in the background. This process can take anywhere from 30 seconds to 10 minutes."** The completed file appears in **Export Jobs** in the top nav.
  - In both cases the job entry is always created and appears in the Export Jobs page.
- Credits notice below button (dynamic count — number of selected persons whose contact data has not yet been revealed)
- Closing the dialog (X or backdrop click) cancels without exporting

> See Section 8.9 for the full `ExportPayload` TypeScript types.

---

### 3.5 Lists Button & Dialogs

Clicking **Lists ▾** in the selection toolbar opens a small dropdown with two options:

| Option | Action |
|---|---|
| Add to list → | Opens the Add to Lists dialog |
| Remove from list | Opens the Remove from Lists dialog |

#### Add to Lists dialog

```
┌─ Add to lists ─────────────────────── × ─┐
├───────────────────────────────────────────┤
│  [ Search or create a list...        ]    │
│                                           │
│  Adding e.g. 10 new records to lists      │
│  will deduct 10 email/phone credits       │
│  from your account.                       │
│  Previously saved/exported contacts       │
│  do not cost credits.                     │
├───────────────────────────────────────────┤
│                                  [ Add ]  │
└───────────────────────────────────────────┘
```

**Search input behavior:**
- Placeholder: **"Search or create a list..."**
- On type (300 ms debounce) → fires `POST /api/lists` with `{ search: string }` → response: `[{ listId, listName, lastUpdatedUTC }]`
- Dropdown shows:
  1. **"Create new list '[typed text]'"** as the first item (shown whenever text is entered)
  2. Matching existing lists below

**"Create new list" click:**
- Calls `POST /api/lists/create` with `{ listName: string }` → returns `{ listId, listName }`
- Newly created list is immediately selected as a chip in the input

**Add button:**
- Disabled until at least one list chip is selected
- On click, closes dialog immediately and shows toast: **"We will add contacts to the selected list in the background. This process can take anywhere from 30 seconds to 10 minutes."**
- Fires `POST /api/lists/add-leads` (see Section 8.8 for full payload shapes)
- Credits notice below search input (dynamic count — unrevealed contacts in selection)

#### Remove from Lists dialog

```
┌─ Remove from lists ──────────────── × ─┐
├─────────────────────────────────────────┤
│  [ Choose lists...                  ]   │
│                                         │
├─────────────────────────────────────────┤
│                             [ Remove ]  │
└─────────────────────────────────────────┘
```

- Searchable dropdown placeholder: **"Choose lists"** — shows all user lists (same searchable list as the Add to Lists dialog)
- No credits notice (removing leads from lists does **not** cost credits)
- Divider above footer
- **Remove** button (primary, bottom-right) — disabled until a list is selected; fires `POST /api/lists/remove-leads` on click (see Section 8.8 for payload)

---

### 3.6 Export Jobs Page

**Route:** `/export-jobs`
**Navigation:** Clicking "Export Jobs" in the center top nav navigates here (full page, not a modal).

#### Page layout

```
Export Jobs
(files will be deleted after 30 days)

┌──────────────┬────────────────────────┬──────────────┬───────┬───────────────┐
│ Type         │ Created at             │ Status       │ Error │ File          │
├──────────────┼────────────────────────┼──────────────┼───────┼───────────────┤
│ Export job   │ 03-02-2026 at 4:00 PM  │ Completed    │       │ Download CSV  │
│ Export job   │ 03-02-2026 at 3:59 PM  │ Processing   │       │               │
│ Export job   │ 03-02-2026 at 3:58 PM  │ Failed       │ ...   │               │
└──────────────┴────────────────────────┴──────────────┴───────┴───────────────┘
```

#### Column behavior

| Column | Content |
|---|---|
| Type | Always "Export job" — only export jobs appear on this page |
| Created at | Local datetime of when the job was queued (formatted as shown) |
| Status | `Completed` · `Pending` · `Processing` · `Failed` |
| Error | Empty when no error; shows error message text when status is `Failed` |
| File | **"Download CSV"** link (direct URL to stored file) when status is `Completed`; empty otherwise |

#### Status rules

| Status | File column | Error column |
|---|---|---|
| Pending | — | — |
| Processing | — | — |
| Completed | "Download CSV" (direct link to stored file) | — |
| Failed | — | Error message string |

#### Download URL

"Download CSV" is a **direct URL** to the stored file on the server (not a streaming API call). Clicking it triggers a browser file download. Files are retained for **30 days** then deleted server-side.

#### Data source

`POST /api/export-jobs/list` — called on page load. Returns all export jobs for the current user, newest first.

```ts
type ExportJob = {
  jobId:       number;
  type:        'export';
  createdAt:   string;         // ISO timestamp
  status:      'pending' | 'processing' | 'completed' | 'failed';
  error?:      string | null;
  downloadUrl?: string | null; // populated when status === 'completed'
};
type ExportJobsResponse = ExportJob[];
```

---

### 3.7 Leads Lists Page

**Route:** `/leads-lists`
**Navigation:** Clicking "Leads Lists" in the center top nav navigates here (full page, not a modal).

#### Page layout

```
Lists                                          [ Create new list ]

┌────────────────────┬──────────────────────────┬───────────────────┬─────────┐
│ List name          │ Last updated             │ Number of records │ Actions │
├────────────────────┼──────────────────────────┼───────────────────┼─────────┤
│ asd                │ March 03, 2026 at 12:54  │ 0                 │ ✏ 🗑   │
│ d                  │ March 03, 2026 at 12:53  │ 0                 │ ✏ 🗑   │
│ a                  │ March 03, 2026 at 5:58   │ 1 (link)          │ ✏ 🗑   │
│ s                  │ March 03, 2026 at 5:58   │ 1 (link)          │ ✏ 🗑   │
└────────────────────┴──────────────────────────┴───────────────────┴─────────┘
```

#### Column behavior

| Column | Content |
|---|---|
| List name | Plain text name of the list |
| Last updated | Local datetime of the most recent change to the list |
| Number of records | Count of leads in the list. Displayed as a **blue link** when count > 0; plain text when 0 |
| Actions | Pencil icon (rename) · Trash icon (delete) |

#### "Number of records" click

Clicking the blue count navigates to `/dashboard?includeList=[listId]`. The dashboard reads the `includeList` query param on mount, initialises the filter state with that list added to the **Include lists** field (Section 2.10), and fires `POST /api/leads/search` immediately.

#### "Create new list" button

Opens a dialog:

```
┌─ Create new list ───────────────────── × ─┐
│                                            │
│  List name                                 │
│  [ Enter a name...                     ]  │
│                                            │
├────────────────────────────────────────────┤
│                               [ Create ]  │
└────────────────────────────────────────────┘
```

- Label: "List name"
- Text input (required, non-empty)
- **Create** button (primary, bottom-right) — calls `POST /api/lists/create` with `{ listName }` → closes dialog on success; reloads the list table; shows toast "List created"

#### Pencil (rename) action

Opens a rename dialog:

```
┌─ Rename list ───────────────────────── × ─┐
│                                            │
│  List name                                 │
│  [ current name pre-filled            ]   │
│                                            │
├────────────────────────────────────────────┤
│                                 [ Save ]  │
└────────────────────────────────────────────┘
```

- Input pre-filled with the current list name
- **Save** button — calls `POST /api/lists/rename` with `{ listId, listName }` → closes dialog on success; reloads the table; shows toast "List renamed"

#### Trash (delete) action

Opens a confirmation dialog:

```
┌─ Delete list ───────────────────────── × ─┐
│                                            │
│  Are you sure you want to delete           │
│  "[list name]"?                            │
│                                            │
├────────────────────────────────────────────┤
│               [ Cancel ]  [ Delete ]      │
└────────────────────────────────────────────┘
```

- **Delete** button (danger variant) — calls `POST /api/lists/delete` with `{ listId }` → closes dialog on success; removes row from table; shows toast "List deleted"
- **Cancel** button — closes dialog with no action
- Backdrop click closes dialog (non-destructive confirmation closes on backdrop)

#### Data source

`POST /api/lists/all` — called on page load. Returns all lists for the current user, newest first.

```ts
type UserList = {
  listId:       number;
  listName:     string;
  lastUpdated:  string;   // ISO timestamp
  recordCount:  number;
};
type UserListsResponse = UserList[];
```

---

## 4. Filter State Management

**Answer: React state only (option B).**

- All filter values live in a single React state object at the dashboard page level.
- The state is passed down to the sidebar via props or context; it is never stored in the URL or the DB.
- On page refresh, filters reset to their defaults (Has Company Email ✅, Has Personal Email ✅, Has Phone ☐, all other fields empty).
- **Exception — `?includeList=` param:** When the dashboard is opened from the Leads Lists page (clicking a record count), the URL contains `?includeList=[listId]`. The dashboard reads this param once on mount and initialises the filter state with that list in the Include lists field, then fires the initial search. After mount the param has no further effect (it is not kept in sync with filter state).
- The "Clear all filters" action in the Filter Actions dropdown resets this state object to the same defaults.
- A single `useFilterState` hook owns the state and exposes setter functions. All filter components call these setters — they never manage their own local copies of filter values.

---

## 5. When Does Search Execute?

**Answer: on every filter change (option A).**

The leads search fires `POST /api/leads/search` immediately on:
- Any checkbox toggle (Has Company Email, Has Personal Email, Has Phone, Management Level, Department, Country, Employee Count, Degree)
- Selecting **or** deselecting any item from an autocomplete dropdown (Job Title, Location, Industry, Technology, Skills, Major, Company)
- Pressing `Enter` in the Name search box

The full current filter state is always sent in the request body. No "Apply" button needed.

### Debounce

- Autocomplete inputs (job title, location, industry, technology, skills, major, company, lists) debounce the **autocomplete** POST by **300 ms**.
- The **leads search** POST fires immediately on checkbox toggles and on autocomplete item select/deselect — no debounce needed for those.
- If the user toggles multiple checkboxes in rapid succession, debounce the leads search by **200 ms** to batch the requests into one.

### In-flight request cancellation

Use an `AbortController` for every `POST /api/leads/search` call. When a new filter change triggers a new search before the previous response has arrived, abort the previous request immediately. This prevents stale responses from overwriting newer results. The `useFilterState` hook is responsible for managing the current abort controller ref.

### Toast policy for leads search

- **No success toast** is shown when the leads search completes — the results table updates silently.
- **Error toasts** are shown if the leads search request fails (network error, server error, auth error).
- Autocomplete suggestion failures show a brief inline error under the input, not a toast.

---

## 6. Schema Gaps (needs resolution before implementation)

The following fields are referenced by the UI but missing from `lead_data`:

| UI Filter | Status |
|---|---|
| Management Level | ✅ Added — `management_level` column / table in schema |
| Department | ✅ Added — `department` column in schema |
| Employee Count | ✅ Added — `employee_count` / company table in schema |
| Technology | ✅ Added — `technology` table + foreign key on `lead_data` |
| Skills | ✅ Added — `skills` table + foreign key on `lead_data` |
| Education | ✅ Added — `education` table + foreign key on `lead_data` |
| Region (Location) | ✅ Not needed — region→country mapping is hardcoded in the UI |

---

## 7. Open Questions Summary

| # | Question | Answer |
|---|---|---|
| 1 | Implement "Uploaded Files" feature now or placeholder only? | UI slot placeholder only |
| 2 | Management Levels / Departments — hardcoded or DB? | Loaded from DB on dashboard mount via `POST /api/filters/management-levels` and `POST /api/filters/departments` |
| 3 | Does `lead_data` need `management_level` / `department` columns? | ✅ Added |
| 4 | Region grouping — add `region` column to `country` or hardcode? | Hardcoded in UI; API receives `countryIds` |
| 5 | Region counts (42, 14...) — static or live lead counts? | Static — total countries per region |
| 6 | Employee Count checkboxes — from `company_size` table or hardcoded? | Loaded from DB on dashboard mount via `POST /api/filters/company-sizes` |
| 7 | Does `lead_data` need `employee_count` / company reference? | ✅ Added — company table created |
| 8 | Technology — new DB table or free-text only? | ✅ Added — `technology` table + foreign key |
| 9 | Skills — new DB table or free-text only? | ✅ Added — `skills` table + foreign key |
| 10 | Education — new DB table or hardcoded? | ✅ Added — `education` table + foreign key |
| 11 | What are "Lists"? | Include/Exclude lists — expandable section in sidebar; autocomplete search; details in Section 2.10 |
| 12 | Filter state — URL params, React state, or saved to DB? | React state only — resets on page refresh |
| 13 | Search trigger — on filter change or explicit apply button? | On every filter change — no apply button |

---

## 8. API Contract — Filter POST Body

All filter interactions send the full current filter state as a JSON body to `POST /api/leads/search`. Partial payloads are never sent — the server always receives a complete snapshot.

### 8.1 Leads Search Payload

Field names are derived from the actual backend `searchJson` schema (confirmed via Load Filters response).

Each autocomplete filter that stores display labels carries a parallel `selected*` array used to restore chip labels when a saved search is loaded. ID arrays drive the DB query; `selected*` arrays drive the UI display only.

```ts
type LeadsSearchPayload = {
  // Always-visible checkboxes
  hasWorkEmail?:     boolean;  // default: true  — "Has Company Email"
  hasPersonalEmail?: boolean;  // default: true  — "Has Personal Email"
  hasPhone?:         boolean;  // default: false — "Has Phone"

  // 2.1 Name
  fullName?: string | null;

  // 2.1 Email uploaded files
  includedEmailsList?:       number[];
  excludedEmailsList?:       number[];
  selectedIncludedEmails?:   string[];  // display labels for chips
  selectedExcludedEmails?:   string[];

  // 2.1 LinkedIn uploaded files
  includedLinkedInUrls?:     number[];
  excludedLinkedInUrls?:     number[];
  selectedIncludedLinkedin?: string[];
  selectedExcludedLinkedin?: string[];

  // 2.2 Job Title
  jobTitles?:         number[];  // IDs from job_title table
  selectedJobTitles?: string[];  // display labels for chips

  // 2.2 Management Levels (IDs from DB, not string labels)
  managementLevels?: number[];

  // 2.2 Departments
  departments?: number[];

  // 2.3 Location — search autocomplete chips
  locations?:         number[];  // IDs from location/city table
  selectedLocations?: string[];  // display labels for chips

  // 2.3 Location — region country checkboxes
  countries?:         number[];  // IDs from country table
  selectedCountries?: string[];  // display labels for chips

  // 2.4 Company — search autocomplete chips
  companies?:              number[];
  selectedCompaniesNames?: string[];

  // 2.4 Company — uploaded company name files
  includedCompanyNames?:           number[];
  excludedCompanyNames?:           number[];
  selectedIncludedCompanyNames?:   string[];
  selectedExcludedCompanyNames?:   string[];

  // 2.4 Company — uploaded company website files
  includedCompanyWebsites?:         number[];
  excludedCompanyWebsites?:         number[];
  selectedIncludedCompanyWebsites?: string[];
  selectedExcludedCompanyWebsites?: string[];

  // 2.5 Industry
  companyIndustries?:    number[];
  selectedIndustries?:   string[];

  // 2.6 Employee Count
  companySizes?: number[];  // IDs from company_size table

  // 2.7 Technology
  technologies?:         number[];
  selectedTechnologies?: string[];

  // 2.8 Skills
  skills?:         number[];
  selectedSkills?: string[];

  // 2.9 Education — individual boolean flags (null = not filtered)
  haveBachelor?:  boolean | null;
  haveMaster?:    boolean | null;
  haveAssociate?: boolean | null;
  haveDoctorate?: boolean | null;

  // 2.9 Major
  majors?:         number[];  // IDs from education table
  selectedMajors?: string[];

  // 2.10 Lists
  includedLists?:         number[];
  excludedLists?:         number[];
  selectedIncludedLists?: string[];
  selectedExcludedLists?: string[];

  // Pagination — the server uses take/skip (Drizzle ORM pattern)
  // Frontend tracks page (1-indexed) and computes: take = pageSize (20), skip = (page - 1) * pageSize
  take: number;  // default: 20
  skip: number;  // default: 0
};
```
### 8.2 Autocomplete Payload (shared shape)

All autocomplete endpoints (`/api/job-titles`, `/api/locations`, `/api/industries`, `/api/technologies`, `/api/skills`, `/api/education/majors`, `/api/leads/companies`) accept:

```ts
type AutocompletePayload = {
  q: string;        // the current search term
  limit?: number;   // max suggestions to return, default: 10
};
```

### 8.3 Leads Search Response

```ts
type LeadsSearchResponse = {
  total:    number;      // total matching leads across all pages
  page:     number;
  pageSize: number;
  data:     LeadRow[];
};

type LeadRow = {
  personId:         number;
  fullName:         string;
  avatarUrl?:       string;         // null → UI renders initials fallback
  jobTitle?:        string;
  companyName?:     string;
  city?:            string;
  country?:         string;

  // Contact availability — drives icon visibility
  hasWorkEmail:     boolean;
  hasPersonalEmail: boolean;
  hasPhone:         boolean;

  // Pre-revealed values — populated by server when user has already revealed this contact.
  // null means not yet revealed (not that the field is empty).
  revealedWorkEmail:     string | null;
  revealedPersonalEmail: string | null;
  revealedPhone1:        string | null;
  revealedPhone2:        string | null;
};
```

### 8.4 Reveal Contact Payload & Response

Endpoint: `POST /api/leads/reveal`

```ts
// Request
type RevealPayload = {
  selectedPersons: number[];  // array of personIds to reveal
};

// Response — one entry per personId
type RevealResponse = {
  personId:      number;
  workEmail:     string | null;
  personalEmail: string | null;
  phone1:        string | null;
  phone2:        string | null;
}[];
```

**Credits rules for reveal:**

- Each reveal costs **1 credit** per person, regardless of how many contact fields that person has.
- Free users receive **20 credits per day**; the counter refreshes daily.
- Once a contact is revealed, the server permanently records it for that user — **no further credits are charged** on subsequent views of the same contact.
- The server returns previously-revealed contacts' actual values in the leads search response (see `LeadRow.revealedWorkEmail` etc. in Section 8.3) so revealed data is always visible without a new reveal call.

### 8.5 Saved Searches Payload & Response

Load saved searches: `POST /api/saved-searches/list`
- Request body: `{}` (userId resolved from JWT on server)
- Response:
```ts
type SavedSearch = {
  savedSearchId:   number;
  savedSearchName: string;
  searchJson:      string;  // JSON-serialised LeadsSearchPayload
};
type SavedSearchesResponse = SavedSearch[];
```

Save current search: `POST /api/saved-searches/save`
```ts
// Request
type SaveSearchPayload = {
  name:       string;
  searchJson: string;  // JSON.stringify(currentFilterState)
};
// Response
type SaveSearchResponse = { savedSearchId: number };
```

### 8.6 Uploaded Files Payload

```ts
type UploadedFilesPayload = {
  // No userId needed — server resolves user identity from the JWT cookie.
};
```

### 8.7 Rules

- Every field in the leads search payload is always present in the body. Missing optional arrays default to `[]` on the server; missing strings default to `""`.
- The server must treat an empty array the same as "no filter applied" for that field.
- `skip` resets to `0` on every filter change triggered by the UI (equivalent to going back to page 1).

### 8.8 List API Payloads

#### Search lists (autocomplete in sidebar and Add to Lists dialog)

`POST /api/lists`
```ts
// Request
type ListSearchPayload = { search: string };
// Response
type ListSearchResponse = { listId: number; listName: string; lastUpdatedUTC: string }[];
```

#### Create list

`POST /api/lists/create`
```ts
// Request
type CreateListPayload = { listName: string };
// Response
type CreateListResponse = { listId: number; listName: string };
```

#### Rename list

`POST /api/lists/rename`
```ts
// Request
type RenameListPayload = { listId: number; listName: string };
// Response
type RenameListResponse = { listId: number; listName: string };
```

#### Delete list

`POST /api/lists/delete`
```ts
// Request
type DeleteListPayload = { listId: number };
// Response
type DeleteListResponse = { ok: true };
```

#### Get all user lists (Leads Lists page)

`POST /api/lists/all`
```ts
// Request body: {} — userId resolved from JWT
// Response
type UserListsResponse = {
  listId:      number;
  listName:    string;
  lastUpdated: string;  // ISO timestamp
  recordCount: number;
}[];
```

#### Add leads to lists

`POST /api/lists/add-leads`

Two modes depending on selection type:
```ts
// Mode 1 — specific persons selected
type AddLeadsSpecificPayload = {
  selectedPersons:   number[];  // personIds to add
  deselectedPersons: number[];  // personIds explicitly excluded from the selection
  lists:             number[];  // listIds to add them to
};

// Mode 2 — "select all" or "enter number" (server-side job)
type AddLeadsQueryPayload = {
  add:               true;
  selectedPersons:   number[];  // always [] in this mode
  deselectedPersons: number[];  // personIds explicitly excluded
  selectFirstRows:   number;    // number of rows to process (matches the selection count)
  Query:             LeadsSearchPayload;  // current full filter state
  lists:             number[];
};
```
Response: `{ ok: true }`

#### Remove leads from lists

`POST /api/lists/remove-leads`

Same two-mode structure as add-leads:
```ts
// Mode 1 — specific persons selected
type RemoveLeadsSpecificPayload = {
  selectedPersons:   number[];
  deselectedPersons: number[];
  lists:             number[];
};

// Mode 2 — server-side job
type RemoveLeadsQueryPayload = {
  selectedPersons:   number[];
  deselectedPersons: number[];
  selectFirstRows:   number;
  Query:             LeadsSearchPayload;
  lists:             number[];
};
```
Response: `{ ok: true }`

### 8.9 Export Payload

Endpoint: `POST /api/leads/export`

Two modes — one for a specific selection, one for a server-side bulk job:

```ts
// Mode 1 — specific persons selected (normal export)
// Server creates job synchronously and returns download URL immediately.
type ExportSpecificPayload = {
  selectedPersons: number[];  // personIds to export
};

// Mode 2 — "select all" or "enter number" (background job)
// Server queues a job and returns immediately with status: "pending".
type ExportQueryPayload = {
  export:            true;
  selectedPersons:   number[];  // always [] in this mode
  deselectedPersons: number[];  // personIds explicitly excluded
  selectFirstRows:   number;    // how many rows to export
  Query:             LeadsSearchPayload;  // current full filter state
};

// Response for Mode 1 (completed synchronously)
type ExportSyncResponse = {
  jobId:       number;
  downloadUrl: string;
  status:      'completed';
};

// Response for Mode 2 (background job queued)
type ExportAsyncResponse = {
  jobId:  number;
  status: 'pending';
};
```

---

## 9. Credits System

### 9.1 Rules

| Rule | Detail |
|---|---|
| Daily allocation | Free users receive **20 credits** per day |
| Refresh | Counter resets to 20 at the start of each calendar day (server-side) |
| Cost per reveal | **1 credit** per person revealed, regardless of how many fields are unlocked |
| Permanent reveal | Once a person is revealed for a user, that user always sees the contact data — no re-charge on page reload, filter change, or re-visit |
| Zero credits | Clicking a locked contact icon shows "No credits remaining" inline — API call is made to verify first |

### 9.2 Top Bar Credits Counter

- Location: **right slot**, between notification bell and Go Unlimited button
- Display: `Credits: 20` (or current count)
- Updates immediately after each reveal (decrement by 1 client-side; server is source of truth on next page load)
- At 0 credits: counter shown in **red**; optionally a tooltip "Upgrade to get more credits"

### 9.3 Credits in Dialogs

Export dialog and Add to Lists dialog both show a dynamic notice:

> "Exporting e.g. **10** new records will deduct **10** email/phone credits from your account. Previously saved/exported contacts do not cost credits."

The bold count is the number of selected persons whose contact info has **not yet been revealed** for the current user. Previously revealed contacts are always free.

### 9.4 API Route

`POST /api/credits/balance` — returns current user's remaining credits (called on page load to initialise the top bar counter).

```ts
type CreditsBalanceResponse = {
  remaining: number;
  dailyLimit: number;
  resetsAt:   string;  // ISO timestamp of next daily reset
};
```

---

## 10. Styling Architecture

All visual decisions must be centralised so that a full theme swap requires touching only one place.

### 10.1 Design Token File

**Location:** `src/styles/tokens.ts`

Export plain TypeScript objects (not Tailwind classes). The Tailwind config and CSS variable sheet both read from this file.

```
tokens
├── colors       — brand, semantic (success, warning, error, info), neutrals
├── typography   — fontFamily, fontSize scale, fontWeight, lineHeight
├── spacing      — 4-point grid values used throughout (4, 8, 12, 16, 24, 32, 48, 64)
├── radii        — none, sm, md, lg, full
├── shadows      — sm, md, lg, focus-ring
├── motion       — duration (fast 100ms, base 200ms, slow 400ms), easing curves
└── zIndex       — sidebar, topbar, modal, toast, tooltip
```

### 10.2 CSS Variables

**Location:** `src/styles/global.css`

Map every token to a CSS custom property under `:root`. Dark mode overrides go in `.dark`. No hard-coded hex values anywhere in component files.

```css
:root {
  --color-brand:        #f59e0b;
  --color-bg-surface:   #ffffff;
  --color-text-primary: #111827;
  /* ... */
}
.dark {
  --color-bg-surface:   #0f172a;
  --color-text-primary: #f8fafc;
  /* ... */
}
```

### 10.3 Tailwind Integration

Extend `tailwind.config.ts` to reference CSS variables rather than raw values:

```ts
colors: {
  brand:   'var(--color-brand)',
  surface: 'var(--color-bg-surface)',
  // ...
}
```

Components use only Tailwind utility classes. No inline `style={{}}` for theming.

### 10.4 Component Variant File

**Location:** `src/styles/variants.ts`

Use `cva` (class-variance-authority) to define all button, badge, input, and card variants in one place. Component files import variants from here — no variant logic lives inside component JSX.

```ts
export const buttonVariants = cva('...base classes...', {
  variants: {
    intent: { primary: '...', secondary: '...', danger: '...' },
    size:   { sm: '...', md: '...', lg: '...' },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
});
```

### 10.5 Rules

- Never import hex values or pixel sizes directly into components.
- Never use arbitrary Tailwind values (e.g. `w-[437px]`) except for one-off layout constraints that cannot be expressed by the grid.
- Spacing between elements must use the 4-point token scale.
- All interactive elements must have a visible `:focus-visible` ring using `--color-focus-ring`.

---

## 11. Route Constants

All URL strings (client pages and API endpoints) live in one file. No route string is hard-coded in a component or hook.

### 11.1 Client Routes

**Location:** `src/constants/clientRoutes.ts`

```ts
export const CLIENT_ROUTES = {
  home:           '/',
  signIn:         '/sign-in',
  signUp:         '/sign-up',
  dashboard:      '/dashboard',
  leadsList:      '/leads-lists',
  exportJobs:     '/export-jobs',
  verifyEmail:    '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword:  '/reset-password',
} as const;
```

### 11.2 API Routes

**Location:** `src/constants/apiRoutes.ts`

```ts
export const API_ROUTES = {
  auth: {
    login:          '/api/auth/login',
    signup:         '/api/auth/signup',
    logout:         '/api/auth/logout',
    refresh:        '/api/auth/refresh',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword:  '/api/auth/reset-password',
    verifyEmail:    '/api/auth/verify-email',
  },
  leads: {
    search:     '/api/leads/search',
    companies:  '/api/leads/companies',
  },
  filters: {
    jobTitles:         '/api/job-titles',
    locations:         '/api/locations',
    industries:        '/api/industries',
    technologies:      '/api/technologies',
    skills:            '/api/skills',
    managementLevels:  '/api/filters/management-levels',
    departments:       '/api/filters/departments',
    companySizes:      '/api/filters/company-sizes',
  },
  education: {
    majors: '/api/education/majors',
  },
  lists: {
    all:         '/api/lists/all',         // all lists for the Leads Lists page
    search:      '/api/lists',             // autocomplete in sidebar filter and Add to Lists dialog
    create:      '/api/lists/create',
    rename:      '/api/lists/rename',
    delete:      '/api/lists/delete',
    addLeads:    '/api/lists/add-leads',
    removeLeads: '/api/lists/remove-leads',
  },
  savedSearches: {
    list: '/api/saved-searches/list',
    save: '/api/saved-searches/save',
  },
  contacts: {
    reveal: '/api/leads/reveal',         // reveal email/phone for selected persons
    export: '/api/leads/export',         // export selected persons as CSV
  },
  exportJobs: {
    list: '/api/export-jobs/list',       // list all export jobs for current user
  },
  files: {
    uploaded: '/api/uploaded-files',
  },
  credits: {
    balance: '/api/credits/balance',
  },
} as const;
```

### 11.3 Rules

- Always build URLs from these constants; never concatenate raw strings.
- **All requests are POST.** No query params are ever appended to a URL — all data travels in the JSON request body.
- When a route requires a dynamic segment (e.g. `/api/leads/:id`), export a builder function alongside the constant:
  ```ts
  leadById: (id: string) => `/api/leads/${id}` as const,
  ```
- Never use `fetch(url + '?q=' + term)` — always use `method: 'POST'` with `body: JSON.stringify({ q: term })`.

---

## 12. Global Error Handling & Toast Notifications

### 12.1 Toast Library

Use **Sonner** (`sonner` package) — already compatible with Next.js App Router and Tailwind. Mount `<Toaster />` once in the root layout. Never render toast triggers in more than one layout.

```tsx
// src/app/[locale]/layout.tsx
import { Toaster } from 'sonner';
// ...
<Toaster position="top-right" richColors closeButton />
```

### 12.2 Toast Utility

**Location:** `src/utils/toast.ts`

Wrap Sonner behind a thin utility so the library can be swapped without touching call sites:

```ts
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (msg: string) => sonnerToast.success(msg),
  error:   (msg: string) => sonnerToast.error(msg),
  info:    (msg: string) => sonnerToast.info(msg),
  warning: (msg: string) => sonnerToast.warning(msg),
  loading: (msg: string) => sonnerToast.loading(msg),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
```

Components import only from `@/utils/toast`, never directly from `sonner`.

### 12.3 API Error Utility

**Location:** `src/utils/apiError.ts`

Centralise the fetch-error → user message translation:

```ts
export type ApiError = {
  code:    string;   // machine-readable, e.g. "EMAIL_TAKEN"
  message: string;   // human-readable fallback
  status:  number;
};

/** Parses a non-ok Response into a typed ApiError. */
export async function parseApiError(res: Response): Promise<ApiError> { ... }

/** Maps an ApiError code to a user-facing toast message. */
export function toastApiError(err: ApiError) {
  toast.error(ERROR_MESSAGES[err.code] ?? err.message);
}
```

`ERROR_MESSAGES` is a plain record keyed by error code, defined in `src/constants/errorMessages.ts`.

### 12.4 Error Boundary

- The existing `src/app/global-error.tsx` handles uncaught render errors at the root.
- Each major route group (`(auth)`, `(marketing)`) may have its own `error.tsx` for scoped recovery UI.
- Error boundaries must never expose stack traces or internal codes to the user.

### 12.5 Rules

- Every user-triggered action that calls an API **must** show a toast on both success and error. Exception: the leads search (`POST /api/leads/search`) updates the results table silently — no success toast (see Section 5 Toast policy).
- Success toasts auto-dismiss after 4 s. Error toasts stay until dismissed by the user (`duration: Infinity`).
- Loading states use `toast.loading(...)` with the returned ID passed to `toast.dismiss(id)` on completion.
- Never use `alert()` or `console.error` as user-facing feedback.
- API route handlers must return a consistent JSON shape: `{ data, error: { code, message } }`.

---

## 13. Loading & Empty States

Every data-fetching surface must cover three states explicitly — never leave them as implicit no-ops.

| State | Pattern |
|---|---|
| **Loading** | Skeleton shimmer matching the shape of the loaded content. No spinners in content areas; reserve spinners for buttons and inline triggers. |
| **Empty** | Illustrated empty state with a short label and, when relevant, a CTA (e.g. "Upload your first file"). |
| **Error** | Inline error message with a retry action. Toast for transient errors; inline for persistent failures. |

Skeleton components live in `src/components/skeletons/`. One skeleton per major layout shape (table row, card, sidebar section).

---

## 14. Accessibility Standards

- All interactive elements are keyboard-reachable and have a visible focus ring.
- Icon-only buttons must have `aria-label`.
- Collapsible sidebar sections use `aria-expanded` and `aria-controls`.
- Color is never the sole means of conveying state (pair with icon or text label).
- Minimum contrast ratio: 4.5 : 1 for body text, 3 : 1 for large text and UI components.
- `<dialog>` / modal: trap focus, close on `Escape`, restore focus to trigger on close.

---

## 15. Responsive Breakpoints

The dashboard is **desktop-first**. Mobile support is scoped to the auth pages for now.

| Breakpoint | Token name | Min-width |
|---|---|---|
| Mobile | `sm` | 640 px |
| Tablet | `md` | 768 px |
| Desktop | `lg` | 1024 px |
| Wide | `xl` | 1280 px |

Sidebar collapses to an off-canvas drawer on `md` and below. Top bar collapses the center nav into a hamburger menu at `sm`.

---

## 16. Data Fetching Strategy

- Use the **Next.js App Router fetch** with revalidation in server components.
- For client-side dynamic data (autocomplete, live filter counts) use **SWR** (`swr` package).
- All SWR fetcher functions live in `src/fetchers/`. File name matches the resource (e.g. `src/fetchers/leads.ts`).
- Loading, error, and empty states are always handled at the component level, not buried inside fetchers.
- Never fetch inside `useEffect` directly in a component — extract to a custom hook or SWR call.

---

## 17. Form Patterns

- Use **react-hook-form** + **Zod** for all forms.
- Schema lives in `src/validations/` co-located with the feature (e.g. `FilterValidation.ts`).
- Field errors render inline below the field, not in a toast.
- Submit button shows a spinner and becomes disabled while the request is in-flight.
- On success: dismiss the form/modal, fire a success toast, and invalidate relevant SWR cache keys.

---

## 18. Modal & Dialog Patterns

- Use `<dialog>` with a Radix UI or Headless UI wrapper — never position-absolute hacks.
- Destructive confirmations (e.g. "Delete list?") always use a confirmation dialog, not a toast action.
- Dialogs must have a visible close button in the top-right corner.
- Backdrop click closes the dialog only for non-destructive confirmations; destructive dialogs require an explicit button press.

---

## 19. Icon Usage

- Use a single icon library throughout: **Lucide React** (`lucide-react`).
- Icon size defaults: `16` (inline text), `20` (buttons), `24` (standalone).
- Never mix icon libraries in the same view.
- Icons are decorative by default (`aria-hidden="true"`); add `aria-label` when used without accompanying text.

---

## 20. Naming Conventions for Files & Components

| Item | Convention | Example |
|---|---|---|
| Page components | `PascalCase`, suffix `Page` | `DashboardPage` |
| Shared UI components | `PascalCase` | `FilterSection`, `TagInput` |
| Hooks | `camelCase`, prefix `use` | `useLeadSearch` |
| Utilities | `camelCase` | `parseApiError` |
| Constants files | `camelCase` | `apiRoutes.ts`, `errorMessages.ts` |
| Style / token files | `camelCase` | `tokens.ts`, `variants.ts` |
| Fetcher files | `camelCase`, suffix resource | `leads.ts`, `filters.ts` |
