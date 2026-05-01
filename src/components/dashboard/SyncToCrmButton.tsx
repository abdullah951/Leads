'use client';

// ── SyncToCrmButton ────────────────────────────────────────────────────────────
// A "Sync to CRM ▾" pill button shared by BulkToolbar and RevealHistoryView.
//
// Behaviour:
//   1. On first click, fetches connected providers from /api/integrations/status
//   2. Opens a pop-up tray above the button listing every CRM provider
//   3. Connected providers: full brand colour + green pulsing dot
//   4. Disconnected providers: greyscale + broken-link icon
//      - Hover: tooltip "X not linked. Click to connect in 30 seconds."
//      - Click: opens an in-place QuickConnectModal for that provider
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { API_ROUTES } from '@/constants/apiRoutes';

// ── CRM catalogue ─────────────────────────────────────────────────────────────

type CrmProvider = {
  id: string;       // provider string used in API routes
  name: string;
  accent: string;   // brand hex colour
};

// All CRM / sync providers that appear in the tray
const CRM_PROVIDERS: CrmProvider[] = [
  { id: 'hubspot',      name: 'HubSpot',       accent: '#ff7a59' },
  { id: 'salesforce',   name: 'Salesforce',    accent: '#00a1e0' },
  { id: 'pipedrive',    name: 'Pipedrive',     accent: '#25a244' },
  { id: 'zoho',         name: 'Zoho CRM',      accent: '#e42527' },
  { id: 'googlesheets', name: 'Google Sheets', accent: '#0f9d58' },
];

// ── ProviderInitials ───────────────────────────────────────────────────────────

/**
 * Small coloured square with 1–2 letter initials for a CRM provider.
 * Rendered in greyscale when the provider is not connected.
 */
function ProviderInitials(props: { provider: CrmProvider; connected: boolean }) {
  const { provider, connected } = props;

  // Build up-to-2-letter initials from the name
  const initials = provider.name
    .split(/[\s.]+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white"
      style={{
        // Connected: full brand colour. Disconnected: medium grey
        backgroundColor: connected ? provider.accent : '#9ca3af',
        // Greyscale filter when not connected
        filter: connected ? 'none' : 'grayscale(1) opacity(0.65)',
      }}
    >
      {initials}
    </span>
  );
}

// ── BrokenLinkIcon ─────────────────────────────────────────────────────────────

/** Chain-link-broken icon for disconnected providers */
function BrokenLinkIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Broken chain link */}
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      {/* Strike-through to indicate broken */}
      <line x1="4" y1="4" x2="20" y2="20" strokeWidth="1.5" />
    </svg>
  );
}

// ── QuickConnectModal ─────────────────────────────────────────────────────────

/**
 * In-place compact modal for connecting a CRM provider.
 * On mount, checks /api/integrations/[provider]/status to determine:
 *   - not-configured: shows env var setup instructions
 *   - configured: shows a Connect button that starts the OAuth flow
 *
 * @param provider - The CRM provider to connect.
 * @param onClose - Called when the modal should be dismissed.
 */
function QuickConnectModal(props: {
  provider: CrmProvider;
  onClose: () => void;
}) {
  const { provider } = props;

  // null = loading, false = creds missing, true = ready to connect
  const [configured, setConfigured] = useState<boolean | null>(null);
  // Callback URL to register in the OAuth app
  const [callbackUrl, setCallbackUrl] = useState('');
  // Clipboard feedback
  const [copied, setCopied] = useState(false);

  // Required env var names by provider — shown in setup instructions
  const ENV_VARS: Record<string, { id: string; secret: string }> = {
    hubspot:      { id: 'HUBSPOT_CLIENT_ID',       secret: 'HUBSPOT_CLIENT_SECRET' },
    salesforce:   { id: 'SALESFORCE_CLIENT_ID',    secret: 'SALESFORCE_CLIENT_SECRET' },
    pipedrive:    { id: 'PIPEDRIVE_CLIENT_ID',      secret: 'PIPEDRIVE_CLIENT_SECRET' },
    zoho:         { id: 'ZOHO_CLIENT_ID',           secret: 'ZOHO_CLIENT_SECRET' },
    googlesheets: { id: 'GOOGLE_SHEETS_CLIENT_ID',  secret: 'GOOGLE_SHEETS_CLIENT_SECRET' },
  };

  // Developer console links so user can create an OAuth app
  const CONSOLE_URLS: Record<string, string> = {
    hubspot:      'https://developers.hubspot.com/get-started',
    salesforce:   'https://developer.salesforce.com/signup',
    pipedrive:    'https://developers.pipedrive.com/',
    zoho:         'https://api-console.zoho.com/',
    googlesheets: 'https://console.cloud.google.com/apis/credentials',
  };

  // Fetch whether credentials are configured on the server
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(API_ROUTES.integrations.providerStatus(provider.id));
        if (res.ok) {
          const data = await res.json() as { configured: boolean; callbackUrl: string };
          setConfigured(data.configured);
          setCallbackUrl(data.callbackUrl);
        } else {
          setConfigured(false);
        }
      } catch {
        setConfigured(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.id]);

  // Copy text to clipboard helper
  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const envVars = ENV_VARS[provider.id];

  return (
    <>
      {/* Invisible full-screen click-catcher to close modal when clicking outside.
          No color/blur — keeps the UI clean and unobtrusive. */}
      <div
        className="fixed inset-0 z-[200]"
        onClick={props.onClose}
      />

      {/* Modal panel — floats fixed at bottom-center, just above the FAB bar.
          bottom-[72px] = FAB bar height (≈56px) + 16px gap — minimal spacing.
          left-1/2 -translate-x-1/2 centers it horizontally on screen.
          Ring + shadow give it visual depth without a dark overlay. */}
      <div
        className="fixed bottom-[72px] left-1/2 z-[210] w-full max-w-sm -translate-x-1/2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Coloured initials badge */}
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: provider.accent }}
            >
              {provider.name.split(/[\s.]+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Connect {provider.name}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                30-second setup
              </p>
            </div>
          </div>
          {/* Close button */}
          <button
            type="button"
            onClick={props.onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Loading skeleton ────────────────────────────────────────────── */}
        {configured === null && (
          <div className="flex flex-col gap-3">
            <div className="h-12 animate-pulse rounded-lg bg-[var(--color-surface-subtle)]" />
            <div className="h-8 animate-pulse rounded-lg bg-[var(--color-surface-subtle)]" />
          </div>
        )}

        {/* ── Credentials not configured — show setup steps ───────────────── */}
        {configured === false && (
          <div className="flex flex-col gap-3">
            {/* Warning pill */}
            <div className="flex items-start gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-[11px] text-[#92400e]">
                <span className="font-semibold">Credentials missing.</span> Add the env vars below and restart the server.
              </p>
            </div>

            {/* Step 1: Open dev console */}
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Step 1 — Create an OAuth app
              </p>
              <a
                href={CONSOLE_URLS[provider.id] ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--color-brand)] hover:underline"
              >
                Open {provider.name} developer console
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>

            {/* Step 2: Register callback URL */}
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Step 2 — Register callback URL
              </p>
              <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-1.5">
                <code className="flex-1 truncate font-mono text-[9px] text-[var(--color-text-primary)]">
                  {callbackUrl || `…/api/integrations/${provider.id}/callback`}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(callbackUrl)}
                  className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-brand)]"
                  title="Copy"
                >
                  {copied
                    ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )
                    : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                </button>
              </div>
            </div>

            {/* Step 3: Add env vars */}
            {envVars && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Step 3 — Add to <code className="font-mono">.env.local</code>
                </p>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-2 font-mono text-[9px] text-[var(--color-text-primary)]">
                  <p>{envVars.id}=your_client_id</p>
                  <p className="mt-0.5">{envVars.secret}=your_secret</p>
                </div>
                <p className="mt-1 text-[9px] text-[var(--color-text-muted)]">
                  Restart the dev server after adding env vars.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Credentials OK — show connect button ──────────────────────── */}
        {configured === true && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Authorise WarpLeads to access your {provider.name} account via OAuth 2.0.
            </p>
            {/* Connect button navigates to the OAuth start route */}
            <a
              href={API_ROUTES.integrations.connect(provider.id)}
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: provider.accent }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Connect {provider.name}
            </a>
          </div>
        )}
      </div>
    </>
  );
}

// ── SyncTray ──────────────────────────────────────────────────────────────────

/**
 * Pop-up tray that lists all CRM providers above the Sync button.
 * Connected providers are in brand colour; disconnected ones are greyscale.
 *
 * @param connectedIds - Provider IDs that are currently connected.
 * @param onProviderClick - Called when the user clicks any provider row.
 * @param onClose - Called when the tray should be dismissed (backdrop click, etc.).
 */
function SyncTray(props: {
  connectedIds: string[];
  onProviderClick: (provider: CrmProvider) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Invisible overlay — clicking outside closes the tray */}
      <div className="fixed inset-0 z-[150]" onClick={props.onClose} />

      {/* Tray card — positioned above the button via `bottom-full mb-2` on the parent */}
      <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 z-[160] w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
        {/* Tray header */}
        <div className="border-b border-[var(--color-border)] px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Select destination
          </p>
        </div>

        {/* Provider rows — connected ones float to the top */}
        <div className="divide-y divide-[var(--color-border)]">
          {[...CRM_PROVIDERS].sort((a, b) => {
            // Sort connected providers before disconnected ones
            const aConnected = props.connectedIds.includes(a.id) ? 1 : 0;
            const bConnected = props.connectedIds.includes(b.id) ? 1 : 0;
            return bConnected - aConnected;
          }).map((crm) => {
            const isConnected = props.connectedIds.includes(crm.id);

            return (
              // Each row is a relative container so the tooltip can be positioned
              <div key={crm.id} className="group relative">
                <button
                  type="button"
                  onClick={() => props.onProviderClick(crm)}
                  className={[
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150',
                    isConnected
                      // Connected: full interaction
                      ? 'hover:bg-[var(--color-surface-subtle)]'
                      // Disconnected: still clickable (opens quick-connect modal)
                      : 'hover:bg-[var(--color-surface-subtle)]',
                  ].join(' ')}
                >
                  {/* Provider colour initials badge */}
                  <ProviderInitials provider={crm} connected={isConnected} />

                  {/* Provider name */}
                  <span
                    className={[
                      'flex-1 text-sm font-medium',
                      isConnected
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)]',
                    ].join(' ')}
                  >
                    {crm.name}
                  </span>

                  {/* Right indicator */}
                  {isConnected
                    ? (
                        // Green pulsing "system health" dot for connected providers
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                        </span>
                      )
                    : (
                        // Broken-link icon for disconnected providers
                        <span className="shrink-0 text-[var(--color-text-muted)]">
                          <BrokenLinkIcon />
                        </span>
                      )}
                </button>

                {/* Hover tooltip for disconnected providers — appears to the left of the row */}
                {!isConnected && (
                  <div
                    className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                    style={{ zIndex: 170 }}
                  >
                    {crm.name} not linked.{' '}
                    <span className="text-[#86efac]">Click to connect in 30 s.</span>
                    {/* Tooltip arrow pointing right */}
                    <span
                      className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── SyncToCrmButton ───────────────────────────────────────────────────────────

/**
 * Renders a "Sync to CRM ▾" pill button.
 * On click, opens a provider tray above the bar.
 * Connected providers can sync leads; disconnected ones open a quick-connect modal.
 *
 * Used by both BulkToolbar and RevealHistoryView.
 *
 * @param selectedPersonIds - Person IDs currently selected (for future sync action).
 * @param className - Extra CSS classes to apply to the trigger button.
 * @param onUpsell - Optional callback for plan gating. When provided, it is called
 *   instead of opening the tray. The caller (BulkToolbar) decides whether to show
 *   an upsell modal or to let the click proceed normally.
 */
export function SyncToCrmButton(props: {
  selectedPersonIds: number[];
  className?: string;
  /** Optional upsell gate — called when button is clicked; if provided, the tray does NOT open automatically. */
  onUpsell?: () => void;
}) {
  // Whether the tray is open
  const [trayOpen, setTrayOpen] = useState(false);
  // Connected provider IDs — lazy-loaded when the tray first opens
  const [connectedIds, setConnectedIds] = useState<string[] | null>(null);
  // Provider for which the quick-connect modal is open (null = none)
  const [quickConnectProvider, setQuickConnectProvider] = useState<CrmProvider | null>(null);
  // Toast message (success/info)
  const [toast, setToast] = useState<string | null>(null);
  // Whether we're currently fetching the status
  const [loadingStatus, setLoadingStatus] = useState(false);
  // Ref for the button container so we can position the tray correctly
  const containerRef = useRef<HTMLDivElement>(null);

  // Show a brief bottom-right toast
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Fetch connected providers the first time the tray opens
  async function openTray() {
    setTrayOpen(true);

    // Only fetch once — cache the result
    if (connectedIds !== null) return;

    setLoadingStatus(true);
    try {
      const res = await fetch(API_ROUTES.integrations.status, { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as { connected: string[] };
        setConnectedIds(data.connected ?? []);
      } else {
        setConnectedIds([]);
      }
    } catch {
      setConnectedIds([]);
    } finally {
      setLoadingStatus(false);
    }
  }

  function handleButtonClick() {
    // ── Upsell gate ─────────────────────────────────────────────────────────
    // If an onUpsell callback is provided (e.g. from BulkToolbar on the free plan),
    // call it and return early — the caller will decide whether to show an upsell
    // modal or to invoke this function again without the gate.
    if (props.onUpsell) {
      props.onUpsell();
      return;
    }

    // Normal open/close toggle for the provider tray
    if (trayOpen) {
      setTrayOpen(false);
    } else {
      void openTray();
    }
  }

  // Called when a provider row is clicked in the tray
  function handleProviderClick(crm: CrmProvider) {
    const isConnected = (connectedIds ?? []).includes(crm.id);
    setTrayOpen(false);

    if (isConnected) {
      // TODO: implement actual CRM push; for now show a placeholder toast
      showToast(`Syncing ${props.selectedPersonIds.length} lead${props.selectedPersonIds.length !== 1 ? 's' : ''} to ${crm.name}…`);
    } else {
      // Open quick-connect modal for this provider
      setQuickConnectProvider(crm);
    }
  }

  // Derive the active connected CRM count for the button label
  const activeCount = (connectedIds ?? []).filter(id =>
    CRM_PROVIDERS.some(c => c.id === id),
  ).length;

  return (
    // Relative container so the tray can use absolute positioning off it
    <div ref={containerRef} className="relative">
      {/* ── Main pill button ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleButtonClick}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150',
          props.className ?? 'border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]',
        ].join(' ')}
      >
        {/* Plug/sync icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
        </svg>

        {/* Label — shows active count when any CRM is connected */}
        {activeCount > 0
          ? `Sync to CRM (${activeCount})`
          : 'Sync to CRM'}

        {/* Loading spinner or chevron */}
        {loadingStatus
          ? (
              // Tiny animated spinner
              <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )
          : (
              // Chevron up/down based on tray state
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-150 ${trayOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
      </button>

      {/* ── Provider tray ─────────────────────────────────────────────────── */}
      {trayOpen && connectedIds !== null && (
        <SyncTray
          connectedIds={connectedIds}
          onProviderClick={handleProviderClick}
          onClose={() => setTrayOpen(false)}
        />
      )}

      {/* ── Quick-connect modal ────────────────────────────────────────────── */}
      {quickConnectProvider !== null && (
        <QuickConnectModal
          provider={quickConnectProvider}
          onClose={() => setQuickConnectProvider(null)}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast !== null && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] rounded-xl bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
