'use client';

// ── SettingsView ───────────────────────────────────────────────────────────────
// Studio Split layout: narrow left menu (5 items) + wide right content area.
//
// Sections:
//   Profile      — avatar initials, name, email with inline validation
//   Subscription — plan card, credit progress bar, billing date, upgrade CTA
//   Security     — change password + danger zone (delete account)
//   Preferences  — theme cards (Light/Dark/Auto) + draggable export-column tags
//   Notifications — credit-low alert toggle + threshold slider
//
// UX patterns:
//   • Toast notification in bottom-right on save
//   • Inline field-level error messages (no page reload)
//   • Danger zone: soft red background, requires password/confirmation
//
// Layout: ml-[160px] pt-14 to clear NavRail (160px) and TopBar (56px)
// ──────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_ROUTES } from '@/constants/apiRoutes';
import { CLIENT_ROUTES } from '@/constants/clientRoutes';

// ── Types ──────────────────────────────────────────────────────────────────────

type SettingsSection = 'profile' | 'subscription' | 'security' | 'preferences' | 'notifications';
type Theme = 'light' | 'dark' | 'auto';

type SettingsData = {
  // Profile
  name: string;
  email: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  // Settings
  theme: Theme;
  exportColumnsJson: string;
  creditAlertEnabled: boolean;
  creditAlertThreshold: number;
  // Credits
  creditsRemaining: number;
  creditsDailyLimit: number;
  creditsResetsAt: string | null;
  // Subscription
  plan: string;
  subStatus: string;
  currentPeriodEnd: string | null;
};

// ── Export column definitions ─────────────────────────────────────────────────
// Each entry represents one draggable tag the user can reorder.

type ExportColumn = { key: string; label: string };

const ALL_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'firstName',       label: 'First Name' },
  { key: 'lastName',        label: 'Last Name' },
  { key: 'workEmail',       label: 'Work Email' },
  { key: 'personalEmail',   label: 'Personal Email' },
  { key: 'phone1',          label: 'Phone 1' },
  { key: 'phone2',          label: 'Phone 2' },
  { key: 'jobTitle',        label: 'Job Title' },
  { key: 'company',         label: 'Company' },
  { key: 'city',            label: 'City' },
  { key: 'country',         label: 'Country' },
  { key: 'linkedIn',        label: 'LinkedIn' },
  { key: 'industry',        label: 'Industry' },
  { key: 'companySize',     label: 'Company Size' },
  { key: 'department',      label: 'Department' },
  { key: 'managementLevel', label: 'Mgmt Level' },
];

const DEFAULT_EXPORT_COLUMNS = ['firstName', 'lastName', 'workEmail', 'jobTitle', 'company', 'linkedIn'];

// ── Toast ──────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error';

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

/** Renders all active toast notifications in the bottom-right corner. */
function ToastContainer(props: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {props.toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: toast.type === 'success' ? '#22c55e18' : '#ef444418',
            border: `1px solid ${toast.type === 'success' ? '#22c55e55' : '#ef444455'}`,
            color: toast.type === 'success' ? '#4ade80' : '#f87171',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'auto',
            // Slide-in animation
            animation: 'toastIn 0.25s ease-out both',
            minWidth: 240,
          }}
        >
          {/* Icon */}
          <span style={{ fontSize: 16 }}>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          {/* Dismiss button */}
          <button
            onClick={() => props.onRemove(toast.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, opacity: 0.7, fontSize: 14, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(30px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Section card wrapper ───────────────────────────────────────────────────────

/** A titled card container used for each settings block within a section */
function SectionCard(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${props.accentColor ?? 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: props.accentColor ? `0 0 16px ${props.accentColor}18` : undefined,
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: '18px 24px 16px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-subtle)',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          {props.title}
        </h3>
        {props.subtitle && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '3px 0 0' }}>
            {props.subtitle}
          </p>
        )}
      </div>
      {/* Card body */}
      <div style={{ padding: '20px 24px' }}>
        {props.children}
      </div>
    </div>
  );
}

// ── Form field helper ──────────────────────────────────────────────────────────

/** A labelled text input with optional inline error message */
function Field(props: {
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
        {props.label}
      </label>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onChange={e => props.onChange(e.target.value)}
        style={{
          padding: '10px 12px',
          backgroundColor: props.disabled ? 'var(--color-surface-subtle)' : 'var(--color-surface-subtle)',
          border: `1px solid ${props.error ? '#ef4444' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)',
          fontSize: 14,
          outline: 'none',
          opacity: props.disabled ? 0.5 : 1,
          transition: 'border-color 0.15s',
        }}
      />
      {/* Inline validation error */}
      {props.error && (
        <span style={{ fontSize: 12, color: '#f87171' }}>{props.error}</span>
      )}
      {/* Hint text (shown when no error) */}
      {!props.error && props.hint && (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{props.hint}</span>
      )}
    </div>
  );
}

// ── Save button ────────────────────────────────────────────────────────────────

/** Standard save button used at the bottom of each section form */
function SaveButton(props: { loading: boolean; label?: string; onClick?: () => void; type?: 'submit' | 'button'; disabled?: boolean }) {
  return (
    <button
      type={props.type ?? 'submit'}
      onClick={props.onClick}
      disabled={props.loading || props.disabled}
      style={{
        padding: '10px 24px',
        backgroundColor: 'var(--color-brand)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: '#fff',
        fontSize: 14,
        fontWeight: 700,
        cursor: props.loading || props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.loading || props.disabled ? 0.65 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {props.loading ? 'Saving…' : (props.label ?? 'Save changes')}
    </button>
  );
}

// ── Left nav menu ──────────────────────────────────────────────────────────────

const MENU_ITEMS: { key: SettingsSection; emoji: string; label: string }[] = [
  { key: 'profile',       emoji: '👤', label: 'Profile' },
  { key: 'subscription',  emoji: '💳', label: 'Subscription' },
  { key: 'security',      emoji: '🔒', label: 'Security' },
  { key: 'preferences',   emoji: '🎨', label: 'Preferences' },
  { key: 'notifications', emoji: '🔔', label: 'Notifications' },
];

/** Narrow left navigation menu for the settings studio split */
function SettingsMenu(props: { active: SettingsSection; onChange: (s: SettingsSection) => void }) {
  return (
    <nav
      style={{
        width: 200,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {MENU_ITEMS.map(item => {
        const isActive = props.active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => props.onChange(item.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              backgroundColor: isActive ? 'var(--color-brand-light)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--color-brand)' : 'transparent'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
            className={!isActive ? 'hover:bg-[var(--color-surface-subtle)]' : ''}
          >
            <span style={{ fontSize: 16 }}>{item.emoji}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)',
              }}
            >
              {item.label}
            </span>
            {/* Active indicator dot */}
            {isActive && (
              <span
                style={{
                  marginLeft: 'auto',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-brand)',
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ── Draggable export-column tags ───────────────────────────────────────────────

/**
 * Renders a list of draggable pill tags for reordering CSV export columns.
 * Uses the HTML5 drag-and-drop API to swap items by dragging.
 */
function ExportColumnSorter(props: {
  columns: string[];
  onChange: (cols: string[]) => void;
}) {
  // The index of the item currently being dragged (stored in a ref to avoid re-renders)
  const dragIndex = useRef<number | null>(null);

  /** Called when the user starts dragging a tag */
  function onDragStart(idx: number) {
    dragIndex.current = idx;
  }

  /** Called when the dragged tag is dropped over a target */
  function onDrop(targetIdx: number) {
    if (dragIndex.current === null || dragIndex.current === targetIdx) return;
    const next = [...props.columns];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(targetIdx, 0, moved!);
    props.onChange(next);
    dragIndex.current = null;
  }

  /** Toggle a column on/off — clicking an unselected column adds it, clicking active removes it */
  function toggleColumn(key: string) {
    if (props.columns.includes(key)) {
      props.onChange(props.columns.filter(k => k !== key));
    } else {
      props.onChange([...props.columns, key]);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Instruction */}
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
        Drag to reorder. Click to add/remove. Exported CSV columns will match this order.
      </p>

      {/* Active (selected) columns — draggable */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
          Included columns ({props.columns.length})
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40 }}>
          {props.columns.map((key, idx) => {
            const col = ALL_EXPORT_COLUMNS.find(c => c.key === key);
            return (
              <div
                key={key}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(idx)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  backgroundColor: 'var(--color-brand-light)',
                  border: '1px solid var(--color-brand)',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-brand)',
                  cursor: 'grab',
                  userSelect: 'none',
                }}
              >
                {/* Drag handle dots */}
                <span style={{ opacity: 0.5, fontSize: 10 }}>⠿</span>
                {col?.label ?? key}
                {/* Remove × button */}
                <button
                  onClick={() => toggleColumn(key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-brand)',
                    padding: 0,
                    fontSize: 12,
                    lineHeight: 1,
                    opacity: 0.7,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
          {props.columns.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No columns selected — all fields will be exported
            </span>
          )}
        </div>
      </div>

      {/* Available (unselected) columns */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
          Available
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_EXPORT_COLUMNS.filter(c => !props.columns.includes(c.key)).map(col => (
            <button
              key={col.key}
              onClick={() => toggleColumn(col.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              className="hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
            >
              + {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* CSV preview row */}
      {props.columns.length > 0 && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
            Preview (first row)
          </p>
          {/* Header row */}
          <code style={{ fontSize: 11, color: '#818cf8', display: 'block', marginBottom: 3 }}>
            {props.columns.map(k => ALL_EXPORT_COLUMNS.find(c => c.key === k)?.label ?? k).join(', ')}
          </code>
          {/* Example data row */}
          <code style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {props.columns.map(k => {
              const examples: Record<string, string> = {
                firstName: 'Jane', lastName: 'Smith', workEmail: 'jane@acme.com',
                personalEmail: 'jane@gmail.com', phone1: '+1 555 0100', phone2: '+1 555 0101',
                jobTitle: 'VP of Sales', company: 'Acme Corp', city: 'San Francisco, CA',
                country: 'United States', linkedIn: 'linkedin.com/in/janesmith',
                industry: 'Software', companySize: '51-200', department: 'Sales',
                managementLevel: 'VP',
              };
              return examples[k] ?? '—';
            }).join(', ')}
          </code>
        </div>
      )}
    </div>
  );
}

// ── Theme cards ────────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; emoji: string; label: string; desc: string }[] = [
  { value: 'light', emoji: '☀️', label: 'Light',   desc: 'Clean, bright workspace' },
  { value: 'dark',  emoji: '🌙', label: 'Dark',    desc: 'Easy on the eyes' },
  { value: 'auto',  emoji: '🖥️', label: 'Auto',    desc: 'Follows system setting' },
];

/** Three illustrated cards for picking the app theme */
function ThemeCards(props: { value: Theme; onChange: (t: Theme) => void }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {THEME_OPTIONS.map(opt => {
        const isActive = props.value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => props.onChange(opt.value)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '20px 12px',
              backgroundColor: isActive ? 'var(--color-brand-light)' : 'var(--color-surface-subtle)',
              border: `2px solid ${isActive ? 'var(--color-brand)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isActive ? '0 0 16px var(--color-brand)33' : 'none',
            }}
          >
            {/* Large theme icon */}
            <span style={{ fontSize: 32 }}>{opt.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>
              {opt.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {opt.desc}
            </span>
            {/* Selected badge */}
            {isActive && (
              <span
                style={{
                  padding: '3px 10px',
                  backgroundColor: 'var(--color-brand)',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                Selected ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Full settings page with studio-split layout.
 * Left: narrow section navigation menu.
 * Right: stacked section cards for the active section.
 */
export function SettingsView() {
  // ── Active section ─────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // ── Toast queue ────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  /** Adds a toast — auto-removes after 4 seconds */
  function pushToast(type: ToastType, message: string) {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  // ── Remote data ────────────────────────────────────────────────────────────
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.settings.get, { method: 'POST' });
      if (res.ok) {
        const json = await res.json() as SettingsData;
        setData(json);
        // Seed form state from fetched data.
        // Coerce null/undefined → '' so controlled inputs never receive null.
        setProfileName(json.name ?? '');
        setProfileEmail(json.email ?? '');
        setAvatarPreview(json.avatarUrl ?? null);
        setTheme(json.theme as Theme);
        const saved = JSON.parse(json.exportColumnsJson || '[]') as string[];
        setExportCols(saved.length > 0 ? saved : DEFAULT_EXPORT_COLUMNS);
        setCreditAlertEnabled(json.creditAlertEnabled);
        setCreditAlertThreshold(json.creditAlertThreshold);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Profile form state ─────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState('');
  // Email is read-only — populated from the server but never submitted back.
  const [profileEmail, setProfileEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Avatar state ───────────────────────────────────────────────────────────
  // avatarPreview: current display URL (either from DB or a local object URL after picking)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Hidden file input ref — triggered when user clicks the avatar circle
  const avatarInputRef = useRef<HTMLInputElement>(null);

  /** Handles avatar file pick → uploads immediately and updates preview */
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show a local object URL as an instant preview before the upload completes
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch(API_ROUTES.settings.avatar, { method: 'POST', body: form });
      const d = await res.json() as { avatarUrl?: string; error?: string };
      if (!res.ok) throw new Error(d.error ?? 'Upload failed');
      // Replace the local blob URL with the persisted server path
      setAvatarPreview(d.avatarUrl ?? localUrl);
      pushToast('success', 'Profile photo updated');
    } catch (err: unknown) {
      setAvatarPreview(data?.avatarUrl ?? null); // revert on error
      pushToast('error', err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      // Clear the input so the same file can be re-selected if needed
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  // ── 2FA state ──────────────────────────────────────────────────────────────
  // step: 'idle' → 'qr' (setup) → 'verify' (enter code to enable) | 'disable'
  type TwoFaStep = 'idle' | 'setup' | 'disable';
  const [twoFaStep, setTwoFaStep] = useState<TwoFaStep>('idle');
  const [twoFaSecret, setTwoFaSecret] = useState('');      // temp secret from /2fa/setup
  const [twoFaQr, setTwoFaQr] = useState('');              // data URL for QR image
  const [twoFaManualKey, setTwoFaManualKey] = useState(''); // base32 manual entry key
  const [twoFaCode, setTwoFaCode] = useState('');           // 6-digit code entered by user
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  /** Starts the 2FA setup flow — generates a new secret and QR code */
  async function startTwoFaSetup() {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      const res = await fetch(API_ROUTES.settings.twoFaSetup, { method: 'POST' });
      const d = await res.json() as { secret: string; qrDataUrl: string; manualKey: string };
      if (!res.ok) throw new Error('Setup failed');
      setTwoFaSecret(d.secret);
      setTwoFaQr(d.qrDataUrl);
      setTwoFaManualKey(d.manualKey);
      setTwoFaCode('');
      setTwoFaStep('setup');
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setTwoFaLoading(false);
    }
  }

  /** Submits the 6-digit code to enable 2FA */
  async function confirmEnableTwoFa() {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      const res = await fetch(API_ROUTES.settings.twoFaEnable, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: twoFaSecret, code: twoFaCode }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? 'Verification failed');
      // Update local data to reflect 2FA enabled
      setData(prev => prev ? { ...prev, twoFactorEnabled: true } : prev);
      setTwoFaStep('idle');
      setTwoFaCode('');
      pushToast('success', '2FA enabled — your account is now more secure');
    } catch (err: unknown) {
      setTwoFaError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setTwoFaLoading(false);
    }
  }

  /** Submits the 6-digit code to disable 2FA */
  async function confirmDisableTwoFa() {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      const res = await fetch(API_ROUTES.settings.twoFaDisable, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFaCode }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? 'Verification failed');
      setData(prev => prev ? { ...prev, twoFactorEnabled: false } : prev);
      setTwoFaStep('idle');
      setTwoFaCode('');
      pushToast('success', '2FA disabled');
    } catch (err: unknown) {
      setTwoFaError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setTwoFaLoading(false);
    }
  }

  // Email field is read-only — displayed for reference only.
  // Changing email requires a separate verification flow; we intentionally
  // exclude it from the profile save to avoid conflicts and confusion.

  async function saveProfile() {
    // Guard: name must not be blank
    if (!profileName.trim()) {
      pushToast('error', 'Name cannot be empty');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch(API_ROUTES.settings.profile, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send only name — email is disabled and must not be changed from this form
        body: JSON.stringify({ name: profileName.trim() }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? 'Save failed');
      pushToast('success', 'Profile updated successfully');
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Security form state ────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  function validateNewPw(v: string) {
    setNewPw(v);
    if (v && v.length < 8) setPwError('Minimum 8 characters');
    else setPwError(null);
  }

  async function savePassword() {
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (pwError) return;
    setSavingPw(true);
    try {
      const res = await fetch(API_ROUTES.settings.password, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? 'Save failed');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      pushToast('success', 'Password updated');
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingPw(false);
    }
  }

  // Danger zone state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePw, setDeletePw] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch(API_ROUTES.settings.deleteAccount, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePw || undefined, confirmation: deleteConfirm }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? 'Delete failed');
      // Redirect to sign-up after account deletion
      window.location.href = CLIENT_ROUTES.signUp;
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  // ── Preferences form state ─────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>('auto');
  const [exportCols, setExportCols] = useState<string[]>(DEFAULT_EXPORT_COLUMNS);
  const [savingPrefs, setSavingPrefs] = useState(false);

  async function savePreferences() {
    setSavingPrefs(true);
    try {
      const res = await fetch(API_ROUTES.settings.preferences, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, exportColumnsJson: JSON.stringify(exportCols) }),
      });
      if (!res.ok) throw new Error('Save failed');
      pushToast('success', 'Preferences saved');
      // Apply theme to the document immediately (client-side) + persist in cookie
      // so the server-rendered layout also picks it up on next page load.
      applyTheme(theme);
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingPrefs(false);
    }
  }

  /** Applies the theme immediately: sets data-theme on <html> + writes wl_theme cookie */
  function applyTheme(t: Theme) {
    const root = document.documentElement;
    if (t === 'auto') {
      // Remove data-theme so the CSS falls back to prefers-color-scheme
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', t);
    }
    // Persist in a 1-year cookie — read server-side in RootLayout for SSR
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `wl_theme=${t}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  // ── Billing helpers ────────────────────────────────────────────────────────

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  /**
   * Redirects to Stripe Checkout for the given plan tier.
   *
   * @param planTier - Which plan to purchase: 'starter' | 'pro' | 'enterprise'.
   */
  async function handleUpgrade(planTier: 'starter' | 'pro' | 'enterprise') {
    setCheckoutLoading(true);
    try {
      const res = await fetch(API_ROUTES.stripe.checkout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the requested plan tier so the server picks the right Stripe price
        body: JSON.stringify({ planTier }),
      });
      const d = await res.json() as { url?: string; message?: string };
      if (!res.ok) throw new Error(d.message ?? 'Checkout failed');
      if (d.url) window.location.href = d.url;
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Could not open checkout');
    } finally {
      setCheckoutLoading(false);
    }
  }

  /** Redirects to the Stripe Billing Portal to manage invoices / cancel */
  async function handleBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch(API_ROUTES.settings.billingPortal, { method: 'POST' });
      const d = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(d.error ?? 'Could not open billing portal');
      if (d.url) window.location.href = d.url;
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  // ── Notifications form state ───────────────────────────────────────────────
  const [creditAlertEnabled, setCreditAlertEnabled] = useState(false);
  const [creditAlertThreshold, setCreditAlertThreshold] = useState(5);
  const [savingNotifs, setSavingNotifs] = useState(false);

  async function saveNotifications() {
    setSavingNotifs(true);
    try {
      const res = await fetch(API_ROUTES.settings.notifications, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditAlertEnabled, creditAlertThreshold }),
      });
      if (!res.ok) throw new Error('Save failed');
      pushToast('success', 'Notification preferences saved');
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingNotifs(false);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  /** Derives avatar initials from name or email */
  function initials(name: string, email: string) {
    if (name) {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0]![0]! + parts[1]![0]!).toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="ml-[160px] pt-14 min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Settings
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '5px 0 0' }}>
            Manage your profile, billing, security and workspace preferences.
          </p>
        </div>

        {/* ── Studio split layout ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

          {/* Left nav menu — sticky so it stays visible while scrolling */}
          <div style={{ position: 'sticky', top: 80, flexShrink: 0 }}>
            <SettingsMenu active={activeSection} onChange={setActiveSection} />
          </div>

          {/* Right content area */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {loading
              ? (
                  /* Skeleton while fetching */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[1, 2].map(i => (
                      <div
                        key={i}
                        className="animate-pulse"
                        style={{ height: 160, backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}
                      />
                    ))}
                  </div>
                )

              /* ── PROFILE section ────────────────────────────────────────── */
              : activeSection === 'profile' ? (
                  <SectionCard
                    title="Your profile"
                    subtitle="Update your display name and email address."
                  >
                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {/* ── Avatar circle — clickable to upload a new photo ── */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {/* Hidden file input — triggered by clicking the avatar */}
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: 'none' }}
                          onChange={handleAvatarChange}
                        />
                        {/* Clickable avatar — shows photo if uploaded, else gradient initials */}
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          title="Click to change photo"
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            border: '2px solid var(--color-border)',
                            background: avatarPreview
                              ? 'none'
                              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            fontWeight: 800,
                            color: '#fff',
                            cursor: uploadingAvatar ? 'wait' : 'pointer',
                            userSelect: 'none',
                            overflow: 'hidden',
                            padding: 0,
                            position: 'relative',
                            transition: 'opacity 0.15s',
                            opacity: uploadingAvatar ? 0.6 : 1,
                          }}
                        >
                          {avatarPreview
                            ? (
                                // Show the uploaded photo
                                <img
                                  src={avatarPreview}
                                  alt="Your avatar"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              )
                            : (data ? initials(profileName, profileEmail) : '…')}
                          {/* Hover overlay: camera icon */}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0,0,0,0.45)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.15s',
                            }}
                            className="group-hover:opacity-100"
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                              <circle cx="12" cy="13" r="4" />
                            </svg>
                          </div>
                        </button>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {uploadingAvatar ? 'Uploading…' : 'Click to change'}
                        </span>
                      </div>

                      {/* Fields */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <Field
                            label="Full name"
                            value={profileName}
                            placeholder="Jane Smith"
                            onChange={setProfileName}
                          />
                          {/* Email is read-only — displayed for reference, not editable.
                              Changing email requires a separate verification flow. */}
                          <Field
                            label="Email address"
                            type="email"
                            value={profileEmail}
                            placeholder="jane@acme.com"
                            onChange={setProfileEmail}  // no-op since field is disabled
                            disabled
                            hint="Contact support to change your email"
                          />
                        </div>
                        <div>
                          {/* Save button — only name is sent; email is never modified here */}
                          <SaveButton loading={savingProfile} onClick={saveProfile} type="button" />
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                )

              /* ── SUBSCRIPTION section ────────────────────────────────────── */
              : activeSection === 'subscription' ? (
                  <>
                    {/* ── Current plan status card ─────────────────────────── */}
                    <SectionCard title="Current plan">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                          {/* Plan badge — maps plan slug to human label + colour */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {(() => {
                              // Colour + label per plan tier
                              const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
                                free:       { label: '🆓 Free',       color: '#fbbf24', bg: '#f59e0b22', border: '#f59e0b44' },
                                starter:    { label: '⭐ Starter',    color: '#34d399', bg: '#10b98122', border: '#10b98144' },
                                pro:        { label: '🚀 Pro',        color: '#818cf8', bg: '#6366f122', border: '#6366f144' },
                                enterprise: { label: '⚡ Enterprise', color: '#f472b6', bg: '#ec489922', border: '#ec489944' },
                                // Legacy value — keep for safety
                                unlimited:  { label: '⚡ Unlimited',  color: '#818cf8', bg: '#6366f122', border: '#6366f144' },
                              };
                              const meta = PLAN_META[data?.plan ?? 'free'] ?? PLAN_META.free!;
                              return (
                                <span
                                  style={{
                                    padding: '4px 12px',
                                    borderRadius: 9999,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    backgroundColor: meta.bg,
                                    color: meta.color,
                                    border: `1px solid ${meta.border}`,
                                  }}
                                >
                                  {meta.label}
                                </span>
                              );
                            })()}
                            {/* Subscription status badge */}
                            <span style={{ fontSize: 11, color: data?.subStatus === 'active' ? '#22c55e' : '#f87171', fontWeight: 600, textTransform: 'capitalize' }}>
                              {data?.subStatus}
                            </span>
                          </div>

                          {/* Next billing date */}
                          {data?.currentPeriodEnd && (
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                              Next billing date:{' '}
                              <strong style={{ color: 'var(--color-text-secondary)' }}>
                                {new Date(data.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </strong>
                            </p>
                          )}

                          {/* Opens Stripe Billing Portal to manage invoices + cancellations */}
                          <button
                            onClick={handleBillingPortal}
                            disabled={portalLoading}
                            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--color-brand)', cursor: portalLoading ? 'wait' : 'pointer', fontWeight: 500, opacity: portalLoading ? 0.6 : 1 }}
                          >
                            {portalLoading ? 'Opening…' : 'View invoices & billing →'}
                          </button>
                        </div>
                      </div>
                    </SectionCard>

                    {/* ── Pricing cards ─────────────────────────────────────────
                        3 cards side-by-side. Current plan is highlighted.
                        Clicking a card's button starts a Stripe Checkout session.
                    ───────────────────────────────────────────────────────────── */}
                    <SectionCard title="Choose a plan">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

                        {/* ── Helper: each plan card ───────────────────────── */}
                        {(
                          [
                            {
                              tier: 'starter' as const,
                              label: 'Starter',
                              price: '$49',
                              period: '/mo',
                              credits: '60,000 reveals/mo',
                              features: ['60k monthly credits', 'Resets on 1st of month', 'CSV export', 'Email support'],
                              accent: '#10b981',
                              accentBg: '#10b98112',
                              accentBorder: '#10b98144',
                            },
                            {
                              tier: 'pro' as const,
                              label: 'Pro',
                              price: '$79',
                              period: '/mo',
                              credits: '150,000 reveals/mo',
                              features: ['150k monthly credits', 'Resets on 1st of month', 'CSV export', 'Priority support'],
                              accent: '#6366f1',
                              accentBg: '#6366f112',
                              accentBorder: '#6366f144',
                            },
                            {
                              tier: 'enterprise' as const,
                              label: 'Enterprise',
                              price: '$99',
                              period: '/mo',
                              credits: 'Unlimited reveals',
                              features: ['Unlimited monthly credits', 'No reset needed', 'CSV export', 'Dedicated support'],
                              accent: '#ec4899',
                              accentBg: '#ec489912',
                              accentBorder: '#ec489944',
                            },
                          ] as const
                        ).map(plan => {
                          // Check if this is the user's current active plan
                          const isCurrent = data?.plan === plan.tier;
                          return (
                            <div
                              key={plan.tier}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16,
                                padding: 20,
                                borderRadius: 'var(--radius-lg)',
                                // Highlight current plan with accent border + bg
                                border: `2px solid ${isCurrent ? plan.accentBorder : 'var(--color-border)'}`,
                                backgroundColor: isCurrent ? plan.accentBg : 'var(--color-surface)',
                                position: 'relative',
                                transition: 'border-color 0.2s',
                              }}
                            >
                              {/* "Current plan" badge — only shown on active plan */}
                              {isCurrent && (
                                <span style={{
                                  position: 'absolute',
                                  top: -11,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '2px 10px',
                                  borderRadius: 9999,
                                  backgroundColor: plan.accent,
                                  color: '#fff',
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  whiteSpace: 'nowrap',
                                }}>
                                  Current plan
                                </span>
                              )}

                              {/* Plan name */}
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? plan.accent : 'var(--color-text-primary)', margin: 0 }}>
                                  {plan.label}
                                </p>
                                {/* Monthly credit summary */}
                                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                  {plan.credits}
                                </p>
                              </div>

                              {/* Price */}
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>{plan.price}</span>
                                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{plan.period}</span>
                              </div>

                              {/* Feature list */}
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {plan.features.map(f => (
                                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                    {/* Checkmark icon */}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    {f}
                                  </li>
                                ))}
                              </ul>

                              {/* CTA button */}
                              {isCurrent
                                ? (
                                    // Already on this plan — non-clickable indicator
                                    <div style={{ padding: '9px 0', textAlign: 'center', fontSize: 13, fontWeight: 600, color: plan.accent, borderTop: `1px solid ${plan.accentBorder}` }}>
                                      ✓ Active
                                    </div>
                                  )
                                : (
                                    // Different plan — show upgrade/switch button
                                    <button
                                      onClick={() => handleUpgrade(plan.tier)}
                                      disabled={checkoutLoading}
                                      style={{
                                        padding: '9px 0',
                                        backgroundColor: plan.accent,
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: checkoutLoading ? 'wait' : 'pointer',
                                        opacity: checkoutLoading ? 0.7 : 1,
                                        transition: 'opacity 0.15s',
                                        width: '100%',
                                      }}
                                    >
                                      {checkoutLoading ? 'Redirecting…' : `Get ${plan.label}`}
                                    </button>
                                  )}
                            </div>
                          );
                        })}
                      </div>
                    </SectionCard>

                    {/* Credits card */}
                    <SectionCard title="Daily credits">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Progress bar */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                              Credits remaining today
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {data?.creditsRemaining ?? 0} / {data?.creditsDailyLimit ?? 20}
                            </span>
                          </div>
                          {/* Track */}
                          <div
                            style={{
                              height: 8,
                              backgroundColor: 'var(--color-border)',
                              borderRadius: 9999,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                borderRadius: 9999,
                                backgroundColor: 'var(--color-brand)',
                                width: `${((data?.creditsRemaining ?? 0) / (data?.creditsDailyLimit ?? 20)) * 100}%`,
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                        </div>

                        {/* Resets at */}
                        {data?.creditsResetsAt && (
                          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                            Resets at:{' '}
                            <strong style={{ color: 'var(--color-text-secondary)' }}>
                              {new Date(data.creditsResetsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </strong>
                          </p>
                        )}

                        {/* Credit usage history shortcut */}
                        <a
                          href="/reveal-history"
                          style={{ fontSize: 13, color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}
                        >
                          View credit usage history →
                        </a>
                      </div>
                    </SectionCard>
                  </>
                )

              /* ── SECURITY section ────────────────────────────────────────── */
              : activeSection === 'security' ? (
                  <>
                    {/* Change password card */}
                    <SectionCard
                      title="Change password"
                      subtitle={data?.hasPassword ? 'Update your existing password.' : 'Set a password to enable email/password login.'}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Current password — only shown if user already has a password */}
                        {data?.hasPassword && (
                          <Field
                            label="Current password"
                            type="password"
                            value={currentPw}
                            placeholder="••••••••"
                            onChange={setCurrentPw}
                          />
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <Field
                            label="New password"
                            type="password"
                            value={newPw}
                            placeholder="Min 8 characters"
                            onChange={validateNewPw}
                            error={pwError}
                          />
                          <Field
                            label="Confirm new password"
                            type="password"
                            value={confirmPw}
                            placeholder="Repeat password"
                            onChange={setConfirmPw}
                            error={confirmPw && confirmPw !== newPw ? 'Passwords do not match' : null}
                          />
                        </div>
                        <div>
                          <SaveButton
                            loading={savingPw}
                            label={data?.hasPassword ? 'Update password' : 'Set password'}
                            onClick={savePassword}
                            type="button"
                            disabled={!!pwError || (confirmPw !== '' && confirmPw !== newPw)}
                          />
                        </div>
                      </div>
                    </SectionCard>

                    {/* ── 2FA card ────────────────────────────────────────── */}
                    <SectionCard
                      title="Two-factor authentication"
                      subtitle="Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc.)."
                    >
                      {twoFaStep === 'idle' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                          {/* Status */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: 9999,
                                fontSize: 12,
                                fontWeight: 700,
                                backgroundColor: data?.twoFactorEnabled ? '#22c55e22' : '#6b728022',
                                color: data?.twoFactorEnabled ? '#4ade80' : '#9ca3af',
                                border: `1px solid ${data?.twoFactorEnabled ? '#22c55e44' : '#6b728044'}`,
                              }}
                            >
                              {data?.twoFactorEnabled ? '🔐 Enabled' : '🔓 Disabled'}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                              {data?.twoFactorEnabled
                                ? 'Your account is protected with TOTP 2FA.'
                                : 'Recommended for increased account security.'}
                            </span>
                          </div>
                          {/* Action button */}
                          {data?.twoFactorEnabled
                            ? (
                                <button
                                  onClick={() => { setTwoFaStep('disable'); setTwoFaCode(''); setTwoFaError(null); }}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#ef444422',
                                    border: '1px solid #ef444488',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#f87171',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Disable 2FA
                                </button>
                              )
                            : (
                                <button
                                  onClick={startTwoFaSetup}
                                  disabled={twoFaLoading}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--color-brand)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: twoFaLoading ? 'wait' : 'pointer',
                                    opacity: twoFaLoading ? 0.7 : 1,
                                  }}
                                >
                                  {twoFaLoading ? 'Loading…' : 'Set up 2FA'}
                                </button>
                              )}
                        </div>
                      )}

                      {/* Setup step: show QR code + verify code */}
                      {twoFaStep === 'setup' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.
                          </p>
                          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {/* QR code image */}
                            {twoFaQr && (
                              <div
                                style={{
                                  padding: 12,
                                  backgroundColor: '#fff',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--color-border)',
                                  flexShrink: 0,
                                }}
                              >
                                <img src={twoFaQr} alt="2FA QR code" width={160} height={160} />
                              </div>
                            )}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {/* Manual entry key */}
                              <div>
                                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>
                                  Can't scan? Enter this key manually:
                                </p>
                                <code
                                  style={{
                                    display: 'block',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--color-surface-subtle)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 12,
                                    letterSpacing: '0.1em',
                                    color: 'var(--color-brand)',
                                    wordBreak: 'break-all',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  {twoFaManualKey}
                                </code>
                              </div>
                              {/* Verification code input */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                  Enter the 6-digit code from your app
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={6}
                                  placeholder="000000"
                                  value={twoFaCode}
                                  onChange={e => { setTwoFaCode(e.target.value.replace(/\D/g, '')); setTwoFaError(null); }}
                                  style={{
                                    padding: '10px 14px',
                                    backgroundColor: 'var(--color-surface-subtle)',
                                    border: `1px solid ${twoFaError ? '#ef4444' : 'var(--color-border)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-text-primary)',
                                    fontSize: 20,
                                    letterSpacing: '0.3em',
                                    textAlign: 'center',
                                    fontFamily: 'var(--font-mono)',
                                    outline: 'none',
                                    width: '100%',
                                  }}
                                />
                                {twoFaError && (
                                  <span style={{ fontSize: 12, color: '#f87171' }}>{twoFaError}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Buttons */}
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              onClick={() => setTwoFaStep('idle')}
                              style={{ padding: '9px 18px', backgroundColor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={confirmEnableTwoFa}
                              disabled={twoFaCode.length !== 6 || twoFaLoading}
                              style={{
                                flex: 1,
                                padding: '9px 18px',
                                backgroundColor: 'var(--color-brand)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: (twoFaCode.length !== 6 || twoFaLoading) ? 'not-allowed' : 'pointer',
                                opacity: (twoFaCode.length !== 6 || twoFaLoading) ? 0.6 : 1,
                              }}
                            >
                              {twoFaLoading ? 'Verifying…' : '✓ Enable 2FA'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Disable step: confirm with current code */}
                      {twoFaStep === 'disable' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                            Enter the current 6-digit code from your authenticator app to confirm disabling 2FA.
                          </p>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={twoFaCode}
                            onChange={e => { setTwoFaCode(e.target.value.replace(/\D/g, '')); setTwoFaError(null); }}
                            style={{
                              padding: '10px 14px',
                              backgroundColor: 'var(--color-surface-subtle)',
                              border: `1px solid ${twoFaError ? '#ef4444' : 'var(--color-border)'}`,
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--color-text-primary)',
                              fontSize: 20,
                              letterSpacing: '0.3em',
                              textAlign: 'center',
                              fontFamily: 'var(--font-mono)',
                              outline: 'none',
                              width: 180,
                            }}
                          />
                          {twoFaError && <span style={{ fontSize: 12, color: '#f87171' }}>{twoFaError}</span>}
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              onClick={() => setTwoFaStep('idle')}
                              style={{ padding: '9px 18px', backgroundColor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={confirmDisableTwoFa}
                              disabled={twoFaCode.length !== 6 || twoFaLoading}
                              style={{
                                padding: '9px 18px',
                                backgroundColor: '#ef444422',
                                border: '1px solid #ef444488',
                                borderRadius: 'var(--radius-md)',
                                color: '#f87171',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: (twoFaCode.length !== 6 || twoFaLoading) ? 'not-allowed' : 'pointer',
                                opacity: (twoFaCode.length !== 6 || twoFaLoading) ? 0.6 : 1,
                              }}
                            >
                              {twoFaLoading ? 'Verifying…' : 'Disable 2FA'}
                            </button>
                          </div>
                        </div>
                      )}
                    </SectionCard>

                    {/* Danger zone card */}
                    <div
                      style={{
                        backgroundColor: '#ef444408',
                        border: '1px solid #ef444433',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Danger zone header */}
                      <div
                        style={{
                          padding: '18px 24px 16px',
                          borderBottom: '1px solid #ef444433',
                          backgroundColor: '#ef444410',
                        }}
                      >
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f87171', margin: 0 }}>
                          ⚠️ Danger zone
                        </h3>
                        <p style={{ fontSize: 12, color: '#f8717199', margin: '3px 0 0' }}>
                          These actions are permanent and cannot be undone.
                        </p>
                      </div>
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                          Deleting your account will permanently remove all your data: leads lists, export jobs, favorites, team members, and billing history.
                        </p>

                        {/* Password confirmation for email accounts */}
                        {data?.hasPassword
                          ? (
                              <Field
                                label="Enter your password to confirm deletion"
                                type="password"
                                value={deletePw}
                                placeholder="••••••••"
                                onChange={setDeletePw}
                              />
                            )
                          : (
                              <Field
                                label='Type "DELETE" to confirm'
                                value={deleteConfirm}
                                placeholder="DELETE"
                                onChange={setDeleteConfirm}
                              />
                            )}

                        <div>
                          <button
                            onClick={deleteAccount}
                            disabled={deleting || (data?.hasPassword ? !deletePw : deleteConfirm !== 'DELETE')}
                            style={{
                              padding: '10px 20px',
                              backgroundColor: '#ef444422',
                              border: '1px solid #ef444488',
                              borderRadius: 'var(--radius-md)',
                              color: '#f87171',
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: deleting || (data?.hasPassword ? !deletePw : deleteConfirm !== 'DELETE') ? 'not-allowed' : 'pointer',
                              opacity: deleting ? 0.6 : 1,
                              transition: 'all 0.15s',
                            }}
                          >
                            {deleting ? 'Deleting…' : '🗑 Delete my account'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )

              /* ── PREFERENCES section ─────────────────────────────────────── */
              : activeSection === 'preferences' ? (
                  <>
                    {/* Theme card */}
                    <SectionCard title="Appearance" subtitle="Choose how WarpLeads looks on this device.">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Apply theme instantly on click (visual preview), then persisted on Save */}
                        <ThemeCards
                          value={theme}
                          onChange={(t) => {
                            setTheme(t);
                            // Apply immediately so the user sees the change before hitting Save
                            applyTheme(t);
                          }}
                        />
                      </div>
                    </SectionCard>

                    {/* Export configurator card */}
                    <SectionCard title="Export configurator" subtitle="Define the columns and order of your exported CSV files.">
                      <ExportColumnSorter columns={exportCols} onChange={setExportCols} />
                    </SectionCard>

                    <div>
                      <SaveButton loading={savingPrefs} onClick={savePreferences} type="button" />
                    </div>
                  </>
                )

              /* ── NOTIFICATIONS section ───────────────────────────────────── */
              : (
                  <SectionCard title="Credit alert" subtitle="Get an email when your daily credits drop below a threshold.">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                      {/* Toggle row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                            Low-credit email alert
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '3px 0 0' }}>
                            Email me when my credits drop below the threshold below.
                          </p>
                        </div>
                        {/* Toggle switch */}
                        <button
                          onClick={() => setCreditAlertEnabled(v => !v)}
                          style={{
                            position: 'relative',
                            width: 44,
                            height: 24,
                            borderRadius: 9999,
                            backgroundColor: creditAlertEnabled ? 'var(--color-brand)' : 'var(--color-border)',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'background 0.2s',
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: 3,
                              left: creditAlertEnabled ? 23 : 3,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              backgroundColor: '#fff',
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            }}
                          />
                        </button>
                      </div>

                      {/* Threshold slider — only shown when alert is enabled */}
                      {creditAlertEnabled && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                              Alert threshold
                            </label>
                            {/* Current value badge */}
                            <span
                              style={{
                                padding: '3px 12px',
                                backgroundColor: 'var(--color-brand-light)',
                                border: '1px solid var(--color-brand)',
                                borderRadius: 9999,
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'var(--color-brand)',
                              }}
                            >
                              {creditAlertThreshold} credits
                            </span>
                          </div>
                          {/* Slider */}
                          <input
                            type="range"
                            min={1}
                            max={100}
                            value={creditAlertThreshold}
                            onChange={e => setCreditAlertThreshold(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--color-brand)', cursor: 'pointer' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>1</span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>100</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                            You'll receive an email when your remaining credits fall below <strong>{creditAlertThreshold}</strong>.
                          </p>
                        </div>
                      )}

                      <div>
                        <SaveButton loading={savingNotifs} onClick={saveNotifications} type="button" />
                      </div>
                    </div>
                  </SectionCard>
                )}
          </div>
        </div>
      </div>

      {/* ── Toast container ──────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
