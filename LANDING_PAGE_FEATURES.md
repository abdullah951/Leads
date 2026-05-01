# WarpLeads — Landing Page Feature Reference

Everything the app does, grouped for landing page copywriting and section planning.

---

## 1. Core Value Proposition

- **102,048,243 leads** searchable in real time
- 1 credit = reveal 1 person's verified email + phone
- Free plan: 20 credits/day (resets daily, no card required)
- Paid plan: unlimited reveals + exports

---

## 2. Lead Search & Filtering

### Contact Info Filters
- Has company email (on by default)
- Has personal email (on by default)
- Has phone number
- Search by name, email, or LinkedIn URL

### Job Filters
- Job title (keyword search — matches partial titles)
- Management level (C-suite, VP, Director, Manager, IC)
- Department (Sales, Engineering, Marketing, HR, Operations…)

### Location Filters
- City / region (multi-select)
- Country (multi-select)

### Company Filters
- Industry (20+ categories)
- Company name / website (autocomplete)
- Company size (headcount buckets: 1–10, 11–50, 51–200, 201–500, 500+)

### Tech & Skills
- Technology stack (React, AWS, Salesforce, HubSpot, 500+ tools)
- Professional skills (Leadership, Data Analysis, Sales…)

### Education Filters
- Degree type (Bachelor, Master, Associate, Doctorate)
- Field of study / major

### List & File Filters
- Filter by saved list (show only leads in a specific list)
- Include / exclude leads from uploaded CSV files (by email or LinkedIn URL)

### Saved Searches
- Save any filter combination with a name
- Re-run in one click

---

## 3. Lead Actions

### Per-Lead
- **Reveal** — unlock verified email + phone (1 credit; already-revealed = free forever)
- **Add to list** — add to a named list
- **Favorite / star** — bookmark with color tag
- **Copy to clipboard** — email or phone (hover-reveal icon, spring tooltip)
- **View LinkedIn profile** — direct link
- **Export** — include in CSV export

### Bulk (select any number of rows)
- Export selected leads to CSV
- Export all filtered leads to CSV
- Add selected leads to a list (create list inline)
- Save current filter set as a named search
- Sync to CRM (HubSpot, Salesforce, Pipedrive)

---

## 4. Leads Lists

- Create unlimited named lists
- Rename or delete any list
- View lead count per list
- Remove individual leads from a list
- Empty-state CTAs: "Find leads" or "Import leads"

---

## 5. Reveal History

- Full paginated log of every reveal
- Search by name, email, or company
- Email deliverability badges: Deliverable / Risky / Undeliverable
- "+1 credit refunded" badge when an undeliverable email triggered a refund
- Bulk export, add-to-list, CRM sync from history
- Copy-to-clipboard on emails and phones

---

## 6. CSV Export

- Export selected leads or all filtered leads
- Background job with status tracking: Pending → Processing → Done / Failed
- Download completed files directly
- Export history page with all past jobs
- Clear all jobs action

---

## 7. CSV Import (Uploaded Files)

- Upload your own contact list (up to 2,000 rows per file)
- Column mapping UI: map your columns to Email, LinkedIn URL, Company Name, Company Website
- Preview file rows before importing
- Use imported files as include/exclude filters on lead search
- Download or delete uploaded files
- Sample CSV download

---

## 8. Favorites

- Star any lead for quick personal access
- Color-coded tags for organisation
- Bulk export and add-to-list from favorites
- Quick reveal without leaving the favorites view

---

## 9. Credits & Billing

- **Free plan**: 20 credits/day, resets daily at midnight UTC
- **Unlimited plan**: no credit deductions, 25k leads per export
- Stripe checkout + billing portal (manage card, change plan, cancel)
- Credit balance always visible in the top bar
- Low-credit alert with configurable threshold

---

## 10. Integrations

- **CRM**: HubSpot, Salesforce, Pipedrive (OAuth connect/disconnect)
- **Automation**: Zapier (1,000+ apps)
- **Webhooks**: create, edit, delete, test custom webhooks
- Marketplace-style grid with status badges: Connected / Beta / Coming Soon
- Notify-me for upcoming integrations

---

## 11. Team Management

- Invite members by email with role (Admin, Member, Viewer)
- Set per-member daily credit quota
- Toggle low-credit alerts per member
- View member usage progress bars
- Remove members or revoke pending invites
- Member status: Pending / Active / Inactive

---

## 12. Settings

| Section | What You Can Do |
|---------|----------------|
| Profile | Avatar, name, email |
| Subscription | Plan, credit balance, renewal date, upgrade |
| Security | Change password, enable / disable 2FA (QR code setup) |
| Preferences | Light / dark / auto theme, export column order |
| Notifications | Low-credit threshold slider + alert toggle |
| Account | Hard-delete account |

---

## 13. Documentation (in-app)

- Quick Start 4-step guide
- Feature reference (Bento Grid: Search, Contacts, Integrations, Billing)
- Interactive FAQ accordion with helpfulness votes
- Live search across all help content
- Sticky table of contents

---

## 14. Feedback & Changelog

- **Feedback board**: mood picker, category (Bug / Feature / General), community upvotes, status tracking
- **What's New** changelog: releases with badges (Major, Feature, Fix, Improvement), emoji reactions, confetti on major versions

---

## 15. UI/UX Highlights (social proof / design section)

- Instant search with debounced API calls and progress bar
- Skeleton loading rows (no blank flashes)
- Hover-reveal copy icon on every email/phone
- Spring "Copied!" tooltip animation
- Gradient initials avatars on every lead row
- Panel-based sidebar — hover or click to open filter sections
- Bulk toolbar appears only when rows are selected
- All strings translated in English and French

---

## 16. Authentication

- Email + password sign-up / sign-in
- Google sign-in via Firebase (popup flow)
- Email verification on signup
- Forgot password / reset password
- Automatic timezone detection

---

## Suggested Landing Page Sections

| # | Section | Key Points to Hit |
|---|---------|-------------------|
| 1 | Hero | "Find and reveal 102M+ leads", free signup CTA, screenshot |
| 2 | Social proof | Credit/user numbers, deliverability rate |
| 3 | Search & Filters | 14+ filter dimensions, screenshot of sidebar |
| 4 | Reveal & Export | 1-click reveal, CSV export, CRM sync |
| 5 | Lists & History | Organise, re-access, never pay twice for a contact |
| 6 | Integrations | HubSpot, Salesforce, Zapier logos |
| 7 | Team | Invite team, control quotas, shared history |
| 8 | Pricing | Free vs Unlimited table |
| 9 | FAQ | Top 6–8 questions from in-app FAQ |
| 10 | CTA footer | Sign up free / Book a demo |
