'use client';

// ── IntegrationsView ──────────────────────────────────────────────────────────
// Full "Bento Marketplace" integrations page with live DB-backed state.
//
// Sections:
//   Header: title + sub-text + search input
//   Tabs: All | CRMs | Automation | Communication
//   Card grid: each tool shown as a bento card with logo, status badge, action btn
//   WebhookDrawer: list all endpoints, add/edit/delete/test, event selection
//   ZapierMakeDrawer: setup guide + add webhook form
//   OAuthDrawer: connect via OAuth or manage settings / disconnect
//   ComingSoonModal: DB-persisted Notify Me
//   Toast system: fixed bottom-right, auto-dismiss after 3 s
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/constants/apiRoutes';

// ── Types ─────────────────────────────────────────────────────────────────────

type IntegrationStatus = 'connected' | 'beta' | 'coming-soon' | 'live';
type TabKey = 'all' | 'crm' | 'automation' | 'communication';

// A single entry from the INTEGRATIONS catalogue
type Integration = {
  id: string;
  name: string;
  description: string;
  category: TabKey;
  // Base status from catalogue — overridden at runtime by DB data
  status: IntegrationStatus;
  accent: string;
  featured?: boolean;
  // Provider string used in OAuth API routes (may differ from id)
  provider?: string;
};

// Webhook row returned by /api/integrations/webhooks/list
type WebhookRow = {
  id: number;
  name: string;
  url: string;
  secret: string | null;
  events: string; // comma-separated e.g. "lead.revealed,lead.exported"
  active: boolean;
};

// Shape returned by /api/integrations/status
type IntegrationStatusResponse = {
  connected: string[];                         // e.g. ['hubspot', 'salesforce']
  settings: Record<string, Record<string, unknown>>; // per-provider settings
  webhooks: number;                            // total endpoint count
  notified: string[];                          // providers user has opted into
};

// ── Toast ─────────────────────────────────────────────────────────────────────

type Toast = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

// Global counter so toasts have unique IDs even with rapid firing
let toastCounter = 0;

/** Small toast item rendered inside ToastContainer */
function ToastItem(props: { toast: Toast; onDismiss: (id: number) => void }) {
  const { toast } = props;

  // Auto-dismiss after 3 s
  useEffect(() => {
    const t = setTimeout(() => props.onDismiss(toast.id), 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  // Colour per type
  const bg =
    toast.type === 'success'
      ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]'
      : toast.type === 'error'
        ? 'bg-[#fff1f2] border-[#fecdd3] text-[#e11d48]'
        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]';

  return (
    <div
      className={`flex items-center gap-2 rounded-[var(--radius-lg)] border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-md)] ${bg}`}
    >
      {toast.message}
      {/* Manual close button */}
      <button
        type="button"
        className="ml-1 opacity-60 hover:opacity-100"
        onClick={() => props.onDismiss(toast.id)}
      >
        ✕
      </button>
    </div>
  );
}

/** Fixed bottom-right container for all toasts */
function ToastContainer(props: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {props.toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={props.onDismiss} />
      ))}
    </div>
  );
}

// ── Integration catalogue ─────────────────────────────────────────────────────

/**
 * Static catalogue of all integrations.
 * Runtime "connected" status comes from the DB via /api/integrations/status,
 * not from this static array.
 */
const INTEGRATIONS: Integration[] = [
  // ── CRMs ──────────────────────────────────────────────────────────────────
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Push leads directly into your CRM pipeline.',
    category: 'crm',
    status: 'beta',
    accent: '#ff7a59',
    provider: 'hubspot',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise-grade lead sync and workflow automation.',
    category: 'crm',
    status: 'beta',
    accent: '#00a1e0',
    provider: 'salesforce',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sales pipeline management with one-click import.',
    category: 'crm',
    status: 'beta',
    accent: '#25a244',
    provider: 'pipedrive',
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Sync leads and manage follow-ups from one place.',
    category: 'crm',
    status: 'beta',
    accent: '#e42527',
    provider: 'zoho',
  },

  // ── Automation ────────────────────────────────────────────────────────────
  {
    id: 'webhooks',
    name: 'Webhooks',
    description:
      'Fire an HTTP POST to any URL when a lead is revealed. Works with Zapier, Make.com, and 5,000+ apps.',
    category: 'automation',
    status: 'live',
    accent: '#6366f1',
    featured: true,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automate workflows between WarpLeads and 5,000+ apps.',
    category: 'automation',
    status: 'beta',
    accent: '#ff4a00',
  },
  {
    id: 'make',
    name: 'Make.com',
    description: 'Visual automation builder for complex multi-step flows.',
    category: 'automation',
    status: 'beta',
    accent: '#6d00f6',
  },
  {
    id: 'googlesheets',
    name: 'Google Sheets',
    description: 'Export revealed leads to a spreadsheet automatically.',
    category: 'automation',
    status: 'beta',
    accent: '#0f9d58',
    provider: 'googlesheets',
  },
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Open-source workflow automation with self-hosting.',
    category: 'automation',
    status: 'coming-soon',
    accent: '#ea4b71',
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notified in Slack when a lead matches your criteria.',
    category: 'communication',
    status: 'coming-soon',
    accent: '#4a154b',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send personalised outreach emails straight from WarpLeads.',
    category: 'communication',
    status: 'coming-soon',
    accent: '#ea4335',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Connect your Microsoft inbox for direct lead outreach.',
    category: 'communication',
    status: 'coming-soon',
    accent: '#0078d4',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Post lead alerts and summaries to a Teams channel.',
    category: 'communication',
    status: 'coming-soon',
    accent: '#6264a7',
  },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'crm', label: 'CRMs' },
  { key: 'automation', label: 'Automation' },
  { key: 'communication', label: 'Communication' },
];

// Available webhook event types
const WEBHOOK_EVENTS = ['lead.revealed', 'lead.exported'] as const;

// ── Status badge ──────────────────────────────────────────────────────────────

/** Tiny coloured pill shown in the top-right of each card */
function StatusBadge(props: { status: IntegrationStatus }) {
  const config: Record<IntegrationStatus, { label: string; cls: string }> = {
    connected: { label: 'Connected', cls: 'bg-[#dcfce7] text-[#16a34a]' },
    beta: { label: 'Beta', cls: 'bg-[var(--color-brand-light)] text-[var(--color-brand)]' },
    'coming-soon': {
      label: 'Coming Soon',
      cls: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]',
    },
    live: { label: 'Live', cls: 'bg-[#f3e8ff] text-[#7c3aed]' },
  };
  const { label, cls } = config[props.status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

// ── Integration logo ──────────────────────────────────────────────────────────

/**
 * Coloured icon block for each integration.
 * Uses SVG for a few key ones and initials as fallback.
 */
function IntegrationLogo(props: { integration: Integration }) {
  const { integration: item } = props;

  // Webhooks — share/network SVG
  if (item.id === 'webhooks') {
    return (
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
        style={{ backgroundColor: item.accent }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </div>
    );
  }

  // Google Sheets — table grid SVG
  if (item.id === 'googlesheets') {
    return (
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
        style={{ backgroundColor: item.accent }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </div>
    );
  }

  // Default: coloured rounded square with up-to-2-letter initials
  const initials = item.name
    .split(/[\s.]+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
      style={{ backgroundColor: item.accent }}
    >
      {initials}
    </div>
  );
}

// ── AddWebhookForm ─────────────────────────────────────────────────────────────

/**
 * Form to create or edit a single webhook endpoint.
 * Calls /api/integrations/webhooks/save on submit.
 *
 * @param onSaved - Called with the saved row after a successful save.
 * @param onCancel - Called when the user cancels.
 * @param initial - Pre-fill the form when editing an existing webhook.
 * @param addToast - Show a toast notification.
 */
function AddWebhookForm(props: {
  onSaved: (wh: WebhookRow) => void;
  onCancel: () => void;
  initial?: WebhookRow;
  addToast: (msg: string, type?: Toast['type']) => void;
}) {
  const { initial } = props;

  // Form field state
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [secret, setSecret] = useState(initial?.secret ?? '');

  // Checkbox state for each event — pre-check if editing
  const [events, setEvents] = useState<Record<string, boolean>>(() => {
    const existing = initial?.events.split(',').map(e => e.trim()) ?? [];
    return Object.fromEntries(
      WEBHOOK_EVENTS.map(ev => [ev, existing.includes(ev) || (!initial && ev === 'lead.revealed')]),
    );
  });

  const [saving, setSaving] = useState(false);

  // Toggle a single event checkbox
  const toggleEvent = (ev: string) =>
    setEvents(prev => ({ ...prev, [ev]: !prev[ev] }));

  async function handleSave() {
    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      props.addToast('URL must start with http:// or https://', 'error');
      return;
    }

    // At least one event must be selected
    const selectedEvents = Object.entries(events)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',');
    if (!selectedEvents) {
      props.addToast('Select at least one trigger event', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API_ROUTES.integrations.webhooks.save, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Pass id when editing so backend does UPDATE instead of INSERT
          id: initial?.id,
          name: name || url,
          url,
          secret: secret || null,
          events: selectedEvents,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        props.addToast(err.message ?? 'Failed to save webhook', 'error');
        return;
      }

      const data = await res.json() as { webhook: WebhookRow };
      props.addToast('Webhook saved', 'success');
      props.onSaved(data.webhook);
    } catch {
      props.addToast('Network error — could not save webhook', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Endpoint name */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Name <span className="text-[var(--color-text-muted)]">(optional label)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Zapier leads hook"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
        />
      </div>

      {/* Endpoint URL */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Endpoint URL <span className="text-[#e11d48]">*</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://hooks.zapier.com/…"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
        />
      </div>

      {/* Optional signing secret */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Signing secret{' '}
          <span className="text-[var(--color-text-muted)]">
            — sent as X-WarpLeads-Secret header
          </span>
        </label>
        <input
          type="text"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="my_secret_key"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
        />
      </div>

      {/* Trigger event checkboxes */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
          Trigger events
        </p>
        {WEBHOOK_EVENTS.map(ev => (
          <label
            key={ev}
            className="mb-1.5 flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]"
          >
            <input
              type="checkbox"
              checked={!!events[ev]}
              onChange={() => toggleEvent(ev)}
              className="accent-[var(--color-brand)]"
            />
            <span className="font-mono text-xs">{ev}</span>
          </label>
        ))}
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Update webhook' : 'Add webhook'}
        </button>
        <button
          type="button"
          onClick={props.onCancel}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── WebhookItem ────────────────────────────────────────────────────────────────

/**
 * Renders a single webhook row inside the WebhookDrawer.
 * Shows URL, events, test button, toggle, and delete.
 */
function WebhookItem(props: {
  wh: WebhookRow;
  onEdit: (wh: WebhookRow) => void;
  onDelete: (id: number) => void;
  addToast: (msg: string, type?: Toast['type']) => void;
}) {
  const { wh } = props;
  const [testing, setTesting] = useState(false);

  // Fire test ping to this webhook endpoint
  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch(API_ROUTES.integrations.webhooks.test, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wh.id }),
      });
      const data = await res.json() as { ok: boolean; statusCode?: number; durationMs?: number; error?: string };
      if (data.ok) {
        props.addToast(`Test OK — ${data.statusCode} in ${data.durationMs}ms`, 'success');
      } else {
        props.addToast(`Test failed — ${data.error ?? `HTTP ${data.statusCode}`}`, 'error');
      }
    } catch {
      props.addToast('Network error during test', 'error');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
      {/* Row 1: name + action buttons */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
          {wh.name || wh.url}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {/* Test ping */}
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            title="Send test ping"
            className="rounded px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-brand)] disabled:opacity-50"
          >
            {testing ? '…' : 'Test'}
          </button>
          {/* Edit */}
          <button
            type="button"
            onClick={() => props.onEdit(wh)}
            title="Edit"
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {/* Delete */}
          <button
            type="button"
            onClick={() => props.onDelete(wh.id)}
            title="Delete"
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[#fee2e2] hover:text-[#e11d48]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
      {/* Row 2: URL */}
      <p className="mb-1 truncate font-mono text-[10px] text-[var(--color-text-muted)]">{wh.url}</p>
      {/* Row 3: events as chips */}
      <div className="flex flex-wrap gap-1">
        {wh.events.split(',').map(ev => (
          <span
            key={ev}
            className="rounded-full bg-[var(--color-brand-light)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--color-brand)]"
          >
            {ev.trim()}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── WebhookDrawer ─────────────────────────────────────────────────────────────

/**
 * Slide-out drawer for the Webhooks integration.
 * Lists all existing endpoints, allows add / edit / delete / test.
 */
function WebhookDrawer(props: {
  onClose: () => void;
  webhookCount: number;
  addToast: (msg: string, type?: Toast['type']) => void;
  integration: Integration;
}) {
  const { addToast } = props;

  // All webhook rows from DB
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);

  // null = list view, undefined = add-new form, WebhookRow = edit form
  const [editTarget, setEditTarget] = useState<WebhookRow | null | undefined>(null);

  // Load webhooks on mount
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(API_ROUTES.integrations.webhooks.list, { method: 'POST' });
        const data = await res.json() as { webhooks: WebhookRow[] };
        setWebhooks(data.webhooks ?? []);
      } catch {
        addToast('Failed to load webhooks', 'error');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle delete — calls API then removes from local state
  async function handleDelete(id: number) {
    try {
      await fetch(API_ROUTES.integrations.webhooks.delete, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setWebhooks(prev => prev.filter(w => w.id !== id));
      addToast('Webhook deleted', 'info');
    } catch {
      addToast('Failed to delete webhook', 'error');
    }
  }

  // After a save, update/insert in local state and return to list
  function handleSaved(wh: WebhookRow) {
    setWebhooks(prev => {
      const idx = prev.findIndex(w => w.id === wh.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = wh;
        return next;
      }
      return [...prev, wh];
    });
    setEditTarget(null); // back to list
  }

  // editTarget === undefined means "show add form", otherwise list
  const showForm = editTarget !== null;

  return (
    <DrawerShell integration={props.integration} onClose={props.onClose}>
      {showForm
        ? (
            // ── Add / Edit form ───────────────────────────────────────────
            <AddWebhookForm
              initial={editTarget ?? undefined}
              onSaved={handleSaved}
              onCancel={() => setEditTarget(null)}
              addToast={addToast}
            />
          )
        : (
            // ── Webhook list ──────────────────────────────────────────────
            <div className="flex flex-col gap-4">
              {/* How-it-works blurb */}
              <p className="text-sm text-[var(--color-text-secondary)]">
                Add HTTP endpoints below. WarpLeads will POST a JSON payload to each one
                whenever the selected event fires.
              </p>

              {/* Loading skeleton */}
              {loading && (
                <div className="flex flex-col gap-2">
                  {[1, 2].map(i => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)]"
                    />
                  ))}
                </div>
              )}

              {/* Existing webhooks */}
              {!loading && webhooks.length > 0 && (
                <div className="flex flex-col gap-2">
                  {webhooks.map(wh => (
                    <WebhookItem
                      key={wh.id}
                      wh={wh}
                      onEdit={setEditTarget}
                      onDelete={handleDelete}
                      addToast={addToast}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && webhooks.length === 0 && (
                <p className="text-center text-xs text-[var(--color-text-muted)]">
                  No endpoints configured yet.
                </p>
              )}

              {/* Add new endpoint button */}
              <button
                type="button"
                // undefined signals "add new" mode (distinct from null = list mode)
                onClick={() => setEditTarget(undefined)}
                className="flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-brand)] bg-[var(--color-brand-light)] px-4 py-2.5 text-sm font-semibold text-[var(--color-brand)] hover:opacity-90"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add endpoint
              </button>

              {/* Payload sample */}
              <details className="mt-1">
                <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  Sample payload
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] p-3 font-mono text-[10px] text-[var(--color-text-secondary)]">
                  {JSON.stringify(
                    {
                      event: 'lead.revealed',
                      timestamp: '2025-01-01T00:00:00Z',
                      data: {
                        personIds: [123],
                        leads: [{ personId: 123, workEmail: 'jane@acme.com', phone1: '+1555…' }],
                      },
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          )}
    </DrawerShell>
  );
}

// ── ZapierMakeDrawer ──────────────────────────────────────────────────────────

/**
 * Drawer for Zapier / Make.com — shows a setup guide tab and a webhook form tab.
 * Zapier/Make work via webhooks; the user just pastes the catch-hook URL.
 */
function ZapierMakeDrawer(props: {
  integration: Integration;
  onClose: () => void;
  addToast: (msg: string, type?: Toast['type']) => void;
}) {
  const [tab, setTab] = useState<'guide' | 'webhook'>('guide');

  // Steps to show in the guide tab
  const steps =
    props.integration.id === 'zapier'
      ? [
          'Log in to Zapier and click Create Zap.',
          'Choose Trigger → Webhooks by Zapier → Catch Hook.',
          'Copy the hook URL Zapier gives you.',
          'Paste it in the Webhook tab here and click Add endpoint.',
          'Finish your Zap: choose an Action (e.g. Add to HubSpot).',
          'Turn on your Zap — new leads will flow in automatically.',
        ]
      : [
          'Log in to Make.com and create a new Scenario.',
          'Add a Webhooks → Custom webhook module as the trigger.',
          'Click Add → copy the URL Make generates.',
          'Paste it in the Webhook tab here and click Add endpoint.',
          'Add the next module in your scenario (e.g. Google Sheets).',
          'Activate the scenario — WarpLeads will start sending data.',
        ];

  return (
    <DrawerShell integration={props.integration} onClose={props.onClose}>
      {/* Tab switcher */}
      <div className="mb-4 flex gap-1 border-b border-[var(--color-border)]">
        {(['guide', 'webhook'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'px-3 py-1.5 text-xs font-medium transition-colors',
              tab === t
                ? 'border-b-2 border-[var(--color-brand)] text-[var(--color-brand)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {t === 'guide' ? 'Setup guide' : 'Add webhook'}
          </button>
        ))}
      </div>

      {tab === 'guide'
        ? (
            // ── Setup guide ───────────────────────────────────────────────
            <ol className="flex flex-col gap-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  {/* Step number bubble */}
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: props.integration.accent }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm text-[var(--color-text-secondary)]">{step}</p>
                </li>
              ))}
            </ol>
          )
        : (
            // ── Webhook form tab ──────────────────────────────────────────
            <AddWebhookForm
              onSaved={() => {
                props.addToast('Endpoint saved', 'success');
                setTab('guide'); // go back to guide after saving
              }}
              onCancel={() => setTab('guide')}
              addToast={props.addToast}
            />
          )}
    </DrawerShell>
  );
}

// ── OAuthDrawer ───────────────────────────────────────────────────────────────

// Required env var names per provider — shown in the "setup required" panel
const PROVIDER_ENV_VARS: Record<string, { clientId: string; clientSecret: string }> = {
  hubspot:      { clientId: 'HUBSPOT_CLIENT_ID',       clientSecret: 'HUBSPOT_CLIENT_SECRET' },
  salesforce:   { clientId: 'SALESFORCE_CLIENT_ID',    clientSecret: 'SALESFORCE_CLIENT_SECRET' },
  pipedrive:    { clientId: 'PIPEDRIVE_CLIENT_ID',     clientSecret: 'PIPEDRIVE_CLIENT_SECRET' },
  zoho:         { clientId: 'ZOHO_CLIENT_ID',          clientSecret: 'ZOHO_CLIENT_SECRET' },
  googlesheets: { clientId: 'GOOGLE_SHEETS_CLIENT_ID', clientSecret: 'GOOGLE_SHEETS_CLIENT_SECRET' },
};

// Dev-console URLs for each provider so the user can go register an OAuth app
const PROVIDER_CONSOLE_URLS: Record<string, string> = {
  hubspot:      'https://developers.hubspot.com/get-started',
  salesforce:   'https://developer.salesforce.com/signup',
  pipedrive:    'https://developers.pipedrive.com/',
  zoho:         'https://api-console.zoho.com/',
  googlesheets: 'https://console.cloud.google.com/apis/credentials',
};

/**
 * Drawer for CRM / Google Sheets integrations that use OAuth.
 * On mount, checks whether the server has credentials configured for the provider.
 * If not configured: shows setup instructions (env vars + console URL + callback URL).
 * If configured + not connected: shows permissions list + Connect button (OAuth redirect).
 * If connected: shows sync-mode settings + Disconnect.
 */
function OAuthDrawer(props: {
  integration: Integration;
  isConnected: boolean;
  settings: Record<string, unknown>;
  onClose: () => void;
  onDisconnected: () => void;
  addToast: (msg: string, type?: Toast['type']) => void;
}) {
  const { integration, isConnected, addToast } = props;
  const provider = integration.provider ?? integration.id;

  // Whether server env vars are set for this provider — null = loading
  const [configured, setConfigured] = useState<boolean | null>(null);
  // Callback URL the user needs to register in their OAuth app
  const [callbackUrl, setCallbackUrl] = useState('');

  // Local settings state for the "save settings" form
  const [syncMode, setSyncMode] = useState(
    (props.settings.syncMode as string) ?? 'on_reveal',
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check provider credentials on mount (only when not already connected)
  useEffect(() => {
    if (isConnected) {
      // Already connected — no need to check configuration
      setConfigured(true);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(API_ROUTES.integrations.providerStatus(provider));
        if (res.ok) {
          const data = await res.json() as { configured: boolean; callbackUrl: string };
          setConfigured(data.configured);
          setCallbackUrl(data.callbackUrl);
        } else {
          // Treat fetch errors as unconfigured
          setConfigured(false);
        }
      } catch {
        setConfigured(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, isConnected]);

  // Permissions shown in the "ready to connect" state
  const PERMISSIONS: Record<string, string[]> = {
    hubspot:      ['Read contacts', 'Create contacts', 'Update deal stages'],
    salesforce:   ['Read leads', 'Create leads', 'Update opportunity stages'],
    pipedrive:    ['Read persons', 'Create persons', 'Update pipeline stages'],
    zoho:         ['Read contacts', 'Create contacts', 'Update CRM modules'],
    googlesheets: ['Read spreadsheets', 'Append rows to sheets', 'Create new sheets'],
  };
  const perms = PERMISSIONS[provider] ?? ['Read data', 'Write data'];

  // Save settings to DB
  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch(API_ROUTES.integrations.settings(provider), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { syncMode } }),
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Settings saved', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  }

  // Disconnect integration
  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch(API_ROUTES.integrations.disconnect(provider), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      addToast(`${integration.name} disconnected`, 'info');
      props.onDisconnected();
    } catch {
      addToast('Failed to disconnect', 'error');
    } finally {
      setDisconnecting(false);
    }
  }

  // Copy text to clipboard helper
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => addToast(`${label} copied`, 'success'),
      () => addToast('Copy failed', 'error'),
    );
  }

  return (
    <DrawerShell integration={integration} onClose={props.onClose}>
      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {configured === null && (
        <div className="flex flex-col gap-3">
          <div className="h-16 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)]" />
          <div className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)]" />
        </div>
      )}

      {/* ── NOT CONFIGURED — setup instructions ───────────────────────────── */}
      {configured === false && (
        <div className="flex flex-col gap-5">
          {/* Warning banner */}
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-[#92400e]">OAuth credentials not configured</p>
              <p className="mt-0.5 text-xs text-[#b45309]">
                Add your {integration.name} app credentials to <code className="font-mono">.env.local</code> to enable this integration.
              </p>
            </div>
          </div>

          {/* Step 1 — create OAuth app */}
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
              Step 1 — Create an OAuth app
            </p>
            <a
              href={PROVIDER_CONSOLE_URLS[provider] ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[var(--color-brand)] hover:underline"
            >
              Open {integration.name} developer console
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {/* Step 2 — register callback URL */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              Step 2 — Register this callback URL in your app
            </p>
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2">
              <code className="flex-1 truncate font-mono text-[10px] text-[var(--color-text-primary)]">
                {callbackUrl || `…/api/integrations/${provider}/callback`}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(callbackUrl, 'Callback URL')}
                title="Copy"
                className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-brand)]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Step 3 — add env vars */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              Step 3 — Add to <code className="font-mono">.env.local</code>
            </p>
            <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2.5">
              {PROVIDER_ENV_VARS[provider] && (
                <>
                  {/* Client ID env var */}
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-[10px] text-[var(--color-text-primary)]">
                      {PROVIDER_ENV_VARS[provider]!.clientId}=your_client_id
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${PROVIDER_ENV_VARS[provider]!.clientId}=`, 'Env key')}
                      className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-brand)]"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                  {/* Client secret env var */}
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-[10px] text-[var(--color-text-primary)]">
                      {PROVIDER_ENV_VARS[provider]!.clientSecret}=your_secret
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${PROVIDER_ENV_VARS[provider]!.clientSecret}=`, 'Env key')}
                      className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-brand)]"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
              Restart the dev server after adding env vars.
            </p>
          </div>
        </div>
      )}

      {/* ── CONFIGURED + NOT CONNECTED — show connect button ──────────────── */}
      {configured === true && !isConnected && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Click below to authorise WarpLeads to connect with your{' '}
            {integration.name} account via OAuth 2.0.
          </p>

          {/* Permissions list */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
            <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
              Permissions requested
            </p>
            <ul className="flex flex-col gap-1.5">
              {perms.map(p => (
                <li key={p} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Connect button — navigates to OAuth start route which redirects to the provider */}
          <a
            href={API_ROUTES.integrations.connect(provider)}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: integration.accent }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Connect {integration.name}
          </a>
        </div>
      )}

      {/* ── CONNECTED — settings form ──────────────────────────────────────── */}
      {isConnected && (
        <div className="flex flex-col gap-4">
          {/* Connected health banner */}
          <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            </span>
            <p className="text-xs font-semibold text-[#16a34a]">Connected</p>
          </div>

          {/* Sync mode selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Sync mode
            </label>
            <select
              value={syncMode}
              onChange={e => setSyncMode(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand)] focus:outline-none"
            >
              <option value="on_reveal">On reveal (instant)</option>
              <option value="on_export">On export</option>
              <option value="manual">Manual only</option>
            </select>
          </div>

          {/* Save + Disconnect row */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={savingSettings}
              onClick={handleSaveSettings}
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
            >
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>
            <button
              type="button"
              disabled={disconnecting}
              onClick={handleDisconnect}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[#e11d48] hover:bg-[#fee2e2] disabled:opacity-50"
            >
              {disconnecting ? '…' : 'Disconnect'}
            </button>
          </div>
        </div>
      )}
    </DrawerShell>
  );
}

// ── DrawerShell ───────────────────────────────────────────────────────────────

/**
 * Shared slide-out drawer shell: backdrop + panel + header.
 * Specific drawer content is passed as children.
 */
function DrawerShell(props: {
  integration: Integration;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={props.onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
        style={{ animation: 'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <IntegrationLogo integration={props.integration} />
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                {props.integration.name}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {props.integration.id === 'webhooks'
                  ? 'Configure endpoints'
                  : props.integration.id === 'zapier' || props.integration.id === 'make'
                    ? 'Setup guide'
                    : 'OAuth 2.0'}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={props.onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {props.children}
        </div>
      </div>

      {/* Slide-in keyframe */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

// ── ComingSoonModal ───────────────────────────────────────────────────────────

/**
 * Centred modal for "coming soon" integrations.
 * Persists notify-me subscription to DB via /api/integrations/notify-me.
 */
function ComingSoonModal(props: {
  integration: Integration | null;
  alreadyNotified: boolean; // pre-loaded from status API
  onClose: () => void;
  onNotified: (provider: string) => void;
  addToast: (msg: string, type?: Toast['type']) => void;
}) {
  const { integration } = props;
  const [submitting, setSubmitting] = useState(false);
  // Local subscribed state — starts from parent's pre-loaded value
  const [subscribed, setSubscribed] = useState(props.alreadyNotified);

  // Sync if a different "coming soon" card is clicked without unmounting
  useEffect(() => {
    setSubscribed(props.alreadyNotified);
  }, [props.alreadyNotified, integration?.id]);

  if (!integration) return null;

  async function handleNotify() {
    if (!integration) return;
    setSubmitting(true);
    try {
      await fetch(API_ROUTES.integrations.notifyMe, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: integration.id }),
      });
      setSubscribed(true);
      props.onNotified(integration.id);
      props.addToast("You're on the list!", 'success');
    } catch {
      props.addToast('Failed to subscribe', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <IntegrationLogo integration={integration} />
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">
              {integration.name}
            </h3>
            <StatusBadge status="coming-soon" />
          </div>
        </div>

        {/* Description */}
        <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
          We're building this! Be the first to know when{' '}
          <span className="font-medium text-[var(--color-text-primary)]">
            {integration.name}
          </span>{' '}
          goes live.
        </p>

        {/* CTA or success */}
        {subscribed
          ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[#dcfce7] px-3 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-sm font-medium text-[#16a34a]">You're on the list!</p>
              </div>
            )
          : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleNotify}
                  className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
                >
                  {submitting ? '…' : '🔔 Notify Me'}
                </button>
                <button
                  type="button"
                  onClick={props.onClose}
                  className="rounded-[var(--radius-md)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  Close
                </button>
              </div>
            )}
      </div>
    </div>
  );
}

// ── Integration card ──────────────────────────────────────────────────────────

/**
 * Bento card for a single integration.
 * The effective status is derived at render time from DB data (connectedProviders).
 */
function IntegrationCard(props: {
  item: Integration;
  isConnected: boolean;    // from DB
  isNotified: boolean;     // from DB
  onConnect: (item: Integration) => void;
  onComingSoon: (item: Integration) => void;
}) {
  const { item, isConnected } = props;
  const isComingSoon = item.status === 'coming-soon';
  const isWebhookOrSpecial = item.id === 'webhooks' || item.id === 'zapier' || item.id === 'make';

  // Compute the displayed status badge
  const displayStatus: IntegrationStatus = isConnected
    ? 'connected'
    : item.status;

  return (
    <div
      className={[
        'relative flex flex-col rounded-[var(--radius-xl)] border bg-[var(--color-surface)] p-5 transition-shadow duration-200',
        item.featured
          ? 'hover:shadow-[0_0_20px_4px]'
          : 'border-[var(--color-border)] hover:shadow-[var(--shadow-md)]',
      ].join(' ')}
      style={
        item.featured
          ? { borderColor: item.accent, boxShadow: `0 0 0 2px ${item.accent}55` }
          : undefined
      }
    >
      {/* Top row: logo + badge */}
      <div className="mb-4 flex items-start justify-between">
        <div className="relative">
          <IntegrationLogo integration={item} />
          {/* Pulsing green dot for connected cards */}
          {isConnected && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-70" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-[#22c55e]" />
            </span>
          )}
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      {/* Name + description */}
      <div className="mb-4 flex-1">
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
          {item.name}
        </h3>
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          {item.description}
        </p>
      </div>

      {/* Action button */}
      {isComingSoon
        ? (
            <button
              type="button"
              onClick={() => props.onComingSoon(item)}
              className={[
                'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs font-medium transition-colors',
                props.isNotified
                  ? 'bg-[#dcfce7] text-[#16a34a]'
                  : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]',
              ].join(' ')}
            >
              {props.isNotified ? '✓ On the list' : '🔔 Notify Me'}
            </button>
          )
        : isConnected
          ? (
              <button
                type="button"
                onClick={() => props.onConnect(item)}
                className="w-full rounded-[var(--radius-md)] border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-xs font-semibold text-[#16a34a] transition-colors hover:bg-[#dcfce7]"
              >
                ✓ Manage Settings
              </button>
            )
          : isWebhookOrSpecial
            ? (
                <button
                  type="button"
                  onClick={() => props.onConnect(item)}
                  className="w-full rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: item.accent }}
                >
                  {item.id === 'webhooks' ? '⚡ Configure' : '⚡ Setup'}
                </button>
              )
            : (
                <button
                  type="button"
                  onClick={() => props.onConnect(item)}
                  className="w-full rounded-[var(--radius-md)] bg-[var(--color-brand)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-dark)]"
                >
                  Connect Now
                </button>
              )}
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="h-12 w-12 animate-pulse rounded-xl bg-[var(--color-surface-subtle)]" />
      <div className="h-3.5 w-2/3 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
      <div className="h-2.5 w-full animate-pulse rounded bg-[var(--color-surface-subtle)]" />
      <div className="h-2.5 w-4/5 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
      <div className="mt-2 h-8 w-full animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)]" />
    </div>
  );
}

// ── RequestCard ───────────────────────────────────────────────────────────────

function RequestCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-text-muted)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Don't see your tool?
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Let us know what you need.
        </p>
      </div>
      <a
        href="mailto:integrations@warpleads.com"
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
      >
        Request Integration
      </a>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Full Integrations marketplace page.
 * Loads live connection status from DB on mount.
 * Handles drawer routing for Webhooks, Zapier/Make, OAuth CRMs, and Coming Soon modal.
 */
export function IntegrationsView() {
  // ── Status from DB ────────────────────────────────────────────────────────
  // Loading state for DB fetch — show skeletons until resolved
  const [statusLoading, setStatusLoading] = useState(true);
  // Providers that are actually connected in DB
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  // Per-provider settings objects
  const [providerSettings, setProviderSettings] = useState<Record<string, Record<string, unknown>>>({});
  // Provider IDs the user has opted into "notify me"
  const [notifiedProviders, setNotifiedProviders] = useState<string[]>([]);

  // Load status once on mount
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(API_ROUTES.integrations.status, { method: 'POST' });
        if (res.ok) {
          const data = await res.json() as IntegrationStatusResponse;
          setConnectedProviders(data.connected ?? []);
          setProviderSettings(data.settings ?? {});
          setNotifiedProviders(data.notified ?? []);
        }
      } finally {
        setStatusLoading(false);
      }
    })();
  }, []);

  // ── URL params: ?connected=provider or ?error=reason ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');

    if (connected) {
      // Find the display name from catalogue
      const found = INTEGRATIONS.find(i => (i.provider ?? i.id) === connected);
      addToast(`${found?.name ?? connected} connected successfully!`, 'success');
      // Update local state immediately without waiting for a re-fetch
      setConnectedProviders(prev => (prev.includes(connected) ? prev : [...prev, connected]));
    }

    if (error) {
      // Map known error codes to human-readable messages
      const errorMessages: Record<string, string> = {
        not_configured: 'OAuth credentials not set — add env vars and restart.',
        invalid_state:  'OAuth state mismatch — please try again.',
        no_code:        'OAuth flow incomplete — no auth code received.',
        token_exchange_failed: 'Token exchange failed — check your credentials.',
        unauthenticated: 'Session expired — please log in again.',
        access_denied:  'Access denied — you cancelled the OAuth flow.',
      };
      addToast(errorMessages[error] ?? `OAuth error: ${error}`, 'error');
    }

    // Clean up query params from URL without a page reload
    if (connected || error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  // Which integration's drawer is open
  const [drawerItem, setDrawerItem] = useState<Integration | null>(null);
  // "Coming Soon" modal
  const [comingSoonItem, setComingSoonItem] = useState<Integration | null>(null);

  // ── Toast system ──────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(message: string, type: Toast['type'] = 'info') {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // ── Filter + sort integrations by tab + search ────────────────────────────
  // Connected integrations float to the top of the list so users can quickly
  // find and manage what they've already set up.
  const filtered = INTEGRATIONS
    .filter((item) => {
      const matchesTab = activeTab === 'all' || item.category === activeTab;
      const matchesQuery
        = query === '' || item.name.toLowerCase().includes(query.toLowerCase());
      return matchesTab && matchesQuery;
    })
    .sort((a, b) => {
      // Determine connected state for each item using the same logic as the card
      const providerA = a.provider ?? a.id;
      const providerB = b.provider ?? b.id;
      const connectedA = connectedProviders.includes(providerA) ? 1 : 0;
      const connectedB = connectedProviders.includes(providerB) ? 1 : 0;
      // Higher "connected" value sorts first (descending)
      return connectedB - connectedA;
    });

  // ── Drawer routing ────────────────────────────────────────────────────────
  // Decide which drawer to show based on the selected integration
  function handleConnect(item: Integration) {
    setDrawerItem(item);
  }

  function closeDrawer() {
    setDrawerItem(null);
  }

  // Called when OAuthDrawer disconnects — remove from connected list
  function handleDisconnected(provider: string) {
    setConnectedProviders(prev => prev.filter(p => p !== provider));
    closeDrawer();
  }

  // Called when ComingSoonModal's "Notify Me" succeeds
  function handleNotified(provider: string) {
    setNotifiedProviders(prev => (prev.includes(provider) ? prev : [...prev, provider]));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // ml-[160px] clears the 160px NavRail; pt-14 clears AppTopBar
    <div className="ml-[160px] min-h-screen pt-14">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Connect your Workflow
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Sync your leads directly to your favourite CRM and sales tools.
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tools…"
              style={{ width: '200px' }}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-8 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            />
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'px-4 py-2 text-sm font-medium transition-colors duration-150',
                activeTab === tab.key
                  ? 'border-b-2 border-[var(--color-brand)] text-[var(--color-brand)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Card grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {statusLoading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : (
                <>
                  {filtered.map(item => (
                    <IntegrationCard
                      key={item.id}
                      item={item}
                      isConnected={connectedProviders.includes(item.provider ?? item.id)}
                      isNotified={notifiedProviders.includes(item.id)}
                      onConnect={handleConnect}
                      onComingSoon={setComingSoonItem}
                    />
                  ))}

                  {/* "Don't see your tool?" — always at end in All tab */}
                  {(activeTab === 'all' || filtered.length === 0) && <RequestCard />}

                  {/* Empty state when search returns nothing */}
                  {filtered.length === 0 && query !== '' && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                        No integrations found for "{query}"
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Try a different keyword or{' '}
                        <button
                          type="button"
                          className="text-[var(--color-brand)] hover:underline"
                          onClick={() => setQuery('')}
                        >
                          clear the search
                        </button>
                      </p>
                    </div>
                  )}
                </>
              )}
        </div>
      </div>

      {/* ── Drawers ─────────────────────────────────────────────────────────── */}
      {drawerItem?.id === 'webhooks' && (
        // Webhooks drawer — list + add/edit/delete/test endpoints
        <WebhookDrawer
          integration={drawerItem}
          webhookCount={0}
          onClose={closeDrawer}
          addToast={addToast}
        />
      )}

      {(drawerItem?.id === 'zapier' || drawerItem?.id === 'make') && (
        // Zapier / Make.com drawer — setup guide + webhook form
        <ZapierMakeDrawer
          integration={drawerItem}
          onClose={closeDrawer}
          addToast={addToast}
        />
      )}

      {drawerItem && !['webhooks', 'zapier', 'make'].includes(drawerItem.id) && (
        // OAuth CRM / Google Sheets drawer
        <OAuthDrawer
          integration={drawerItem}
          isConnected={connectedProviders.includes(drawerItem.provider ?? drawerItem.id)}
          settings={providerSettings[drawerItem.provider ?? drawerItem.id] ?? {}}
          onClose={closeDrawer}
          onDisconnected={() => handleDisconnected(drawerItem.provider ?? drawerItem.id)}
          addToast={addToast}
        />
      )}

      {/* ── Coming Soon modal ──────────────────────────────────────────────── */}
      {comingSoonItem && (
        <ComingSoonModal
          integration={comingSoonItem}
          alreadyNotified={notifiedProviders.includes(comingSoonItem.id)}
          onClose={() => setComingSoonItem(null)}
          onNotified={handleNotified}
          addToast={addToast}
        />
      )}

      {/* ── Toast container ────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
