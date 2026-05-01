'use client';

// ── TeamView ───────────────────────────────────────────────────────────────────
// Team Management page — lets a workspace owner:
//   • See all invited members in a table (status, role, usage progress, quota)
//   • Invite new members via a modal (email + role + credit limit)
//   • Edit a member's credit quota inline
//   • Toggle per-member low-credit alert
//   • Remove / revoke members
//
// Layout: ml-[160px] pt-14 to account for NavRail (160px) + TopBar (56px)
// ──────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_ROUTES } from '@/constants/apiRoutes';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Shape returned by POST /api/team/list */
type TeamMember = {
  id: number;
  email: string;
  name: string | null;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'inactive';
  creditQuota: number;   // 0 = unlimited
  creditsUsed: number;
  lowCreditAlert: boolean;
  invitedAt: string;
  joinedAt: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Derives up to 2 initials from a name or email address.
 * Falls back to the first two characters of the email local-part.
 */
function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

/**
 * Generates a deterministic gradient from a string (email) for avatar background.
 * Returns a CSS linear-gradient string.
 */
function getGradient(seed: string): string {
  // Simple hash to pick from a preset palette of gradients
  const palettes = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',   // indigo → violet
    'linear-gradient(135deg, #f59e0b, #ef4444)',   // amber → red
    'linear-gradient(135deg, #10b981, #3b82f6)',   // emerald → blue
    'linear-gradient(135deg, #ec4899, #f97316)',   // pink → orange
    'linear-gradient(135deg, #14b8a6, #6366f1)',   // teal → indigo
    'linear-gradient(135deg, #f43f5e, #a855f7)',   // rose → purple
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash += seed.charCodeAt(i);
  return palettes[hash % palettes.length]!;
}

/** Role badge colours */
const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  admin: { bg: '#6366f122', text: '#818cf8' },
  member: { bg: '#10b98122', text: '#34d399' },
  viewer: { bg: '#f59e0b22', text: '#fbbf24' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Gradient circular avatar showing member initials */
function Avatar(props: { name: string | null; email: string; size?: number }) {
  const size = props.size ?? 36;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: getGradient(props.email),
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        letterSpacing: 0.5,
      }}
    >
      {getInitials(props.name, props.email)}
    </div>
  );
}

/** Animated pulse dot — green for active, yellow for pending, grey for inactive */
function StatusDot(props: { status: TeamMember['status'] }) {
  const colors: Record<TeamMember['status'], string> = {
    active: '#22c55e',
    pending: '#f59e0b',
    inactive: '#6b7280',
  };
  const color = colors[props.status];

  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
      {/* Ping ring — only for active/pending to indicate "alive" state */}
      {props.status !== 'inactive' && (
        <span
          className="animate-ping"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.4,
          }}
        />
      )}
      {/* Solid inner dot */}
      <span
        style={{
          position: 'relative',
          display: 'block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
    </span>
  );
}

/** Thin horizontal progress bar for credit usage */
function UsageBar(props: { used: number; quota: number }) {
  // If quota is 0 (unlimited), show an indeterminate shimmer
  const pct = props.quota > 0 ? Math.min(100, (props.used / props.quota) * 100) : null;

  // Colour shifts red as usage approaches limit
  const barColor
    = pct === null ? '#6366f1'
    : pct >= 90 ? '#ef4444'
    : pct >= 70 ? '#f59e0b'
    : '#22c55e';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Numeric label */}
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
        {props.quota > 0
          ? `${props.used} / ${props.quota} credits`
          : `${props.used} credits used`}
      </span>
      {/* Bar track */}
      <div
        style={{
          width: 120,
          height: 4,
          borderRadius: 9999,
          backgroundColor: 'var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: pct !== null ? `${pct}%` : '100%',
            height: '100%',
            borderRadius: 9999,
            backgroundColor: barColor,
            // Shimmer animation for unlimited quota
            animation: pct === null ? 'shimmer 2s infinite' : undefined,
            opacity: pct === null ? 0.5 : 1,
          }}
        />
      </div>
    </div>
  );
}

// ── Invite Modal ───────────────────────────────────────────────────────────────

type InviteFormState = {
  email: string;
  role: 'admin' | 'member' | 'viewer';
  creditQuota: string; // string so the input is controlled
};

/**
 * Modal for inviting a new team member.
 * Slide-in panel from the right with email/role/credit-limit fields.
 */
function InviteModal(props: {
  onClose: () => void;
  onInvited: (member: TeamMember) => void;
}) {
  const [form, setForm] = useState<InviteFormState>({
    email: '',
    role: 'member',
    creditQuota: '0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Copy-to-clipboard state after generating invite link
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /** Submits the invite form — calls POST /api/team/invite */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.team.invite, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          creditQuota: Number(form.creditQuota),
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Invite failed');
      }
      const data = await res.json() as { id: number; inviteToken: string };

      // Build the invite link to show / copy
      const link = `${window.location.origin}/join-team?token=${data.inviteToken}`;
      setInviteLink(link);

      // Optimistically add the member to the table
      props.onInvited({
        id: data.id,
        email: form.email,
        name: null,
        role: form.role,
        status: 'pending',
        creditQuota: Number(form.creditQuota),
        creditsUsed: 0,
        lowCreditAlert: false,
        invitedAt: new Date().toISOString(),
        joinedAt: null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  /** Copies the invite link to clipboard */
  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    /* Backdrop overlay */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={props.onClose}
    >
      {/* Modal panel — stop click propagation so clicking inside doesn't close */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 28,
          width: 420,
          maxWidth: '95vw',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Invite team member
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              They'll receive an invite link to join your workspace.
            </p>
          </div>
          {/* Close × button */}
          <button
            onClick={props.onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 4,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Show invite link after success */}
        {inviteLink
          ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#22c55e18',
                    border: '1px solid #22c55e44',
                    borderRadius: 'var(--radius-md)',
                    color: '#4ade80',
                    fontSize: 13,
                  }}
                >
                  ✅ Invite created! Share this link with your teammate:
                </div>
                {/* Invite link + copy button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {inviteLink}
                  </span>
                  <button
                    onClick={copyLink}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: copied ? '#22c55e22' : 'var(--color-brand-light)',
                      color: copied ? '#4ade80' : 'var(--color-brand)',
                      border: `1px solid ${copied ? '#22c55e44' : 'var(--color-brand)'}`,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
                <button
                  onClick={props.onClose}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            )
          : (
              /* Invite form */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Email field */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--color-surface-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Role select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as InviteFormState['role'] }))}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--color-surface-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="admin">Admin — full access, can invite others</option>
                    <option value="member">Member — search + reveal contacts</option>
                    <option value="viewer">Viewer — read-only, no reveals</option>
                  </select>
                </div>

                {/* Credit quota */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Daily credit limit
                    <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--color-text-muted)', fontSize: 12 }}>
                      (0 = no limit)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.creditQuota}
                    onChange={e => setForm(f => ({ ...f, creditQuota: e.target.value }))}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--color-surface-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Error banner */}
                {error && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#ef444422',
                      border: '1px solid #ef444444',
                      borderRadius: 'var(--radius-md)',
                      color: '#f87171',
                      fontSize: 13,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* CTA buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={props.onClose}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: 'var(--color-surface-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 2,
                      padding: '10px',
                      backgroundColor: 'var(--color-brand)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {loading ? 'Sending…' : '✉️ Generate invite link'}
                  </button>
                </div>
              </form>
            )}
      </div>
    </div>
  );
}

// ── Edit Quota Popover ─────────────────────────────────────────────────────────

/**
 * Tiny inline popover for editing a member's credit quota.
 * Appears when the pencil icon next to the quota value is clicked.
 */
function QuotaEditor(props: {
  memberId: number;
  currentQuota: number;
  onSaved: (newQuota: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(String(props.currentQuota));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when popover opens
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch(API_ROUTES.team.updateQuota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: props.memberId, creditQuota: Number(value) }),
      });
      props.onSaved(Number(value));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-brand)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <input
        ref={inputRef}
        type="number"
        min="0"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') props.onCancel(); }}
        style={{
          width: 60,
          padding: '3px 6px',
          backgroundColor: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text-primary)',
          fontSize: 13,
          outline: 'none',
        }}
      />
      {/* Save check */}
      <button
        onClick={save}
        disabled={saving}
        style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: 14, padding: 0 }}
      >
        ✓
      </button>
      {/* Cancel × */}
      <button
        onClick={props.onCancel}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Stat Cards ─────────────────────────────────────────────────────────────────

/** One summary stat card with an icon, value and label */
function StatCard(props: { icon: string; value: string | number; label: string; accent?: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 160,
        padding: '18px 20px',
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${props.accent ?? 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: props.accent ? `0 0 12px ${props.accent}22` : undefined,
      }}
    >
      {/* Icon + value row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{props.icon}</span>
        <span style={{ fontSize: 26, fontWeight: 700, color: props.accent ?? 'var(--color-text-primary)', lineHeight: 1 }}>
          {props.value}
        </span>
      </div>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>
        {props.label}
      </span>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

/** Shown when the owner has no team members yet */
function EmptyState(props: { onInvite: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 20px',
        gap: 16,
        textAlign: 'center',
      }}
    >
      {/* Large graphic using SVG */}
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
        Grow your team
      </h3>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 340, margin: 0 }}>
        Invite colleagues to collaborate in your WarpLeads workspace.
        Set credit limits and roles to stay in control.
      </p>
      <button
        onClick={props.onInvite}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          backgroundColor: 'var(--color-brand)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Invite first member
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

/**
 * Team management page — fetches members on mount, displays a stats row,
 * a member table, and provides invite / edit / remove actions.
 */
export function TeamView() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  // Which member's quota editor is open (by member id)
  const [editingQuotaId, setEditingQuotaId] = useState<number | null>(null);
  // Invite modal visibility
  const [showInviteModal, setShowInviteModal] = useState(false);
  // Which member is being removed (shows spinner)
  const [removingId, setRemovingId] = useState<number | null>(null);

  // ── Fetch members ──────────────────────────────────────────────────────────

  /** Loads all team members from the API */
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.team.list, { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as TeamMember[];
        setMembers(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Computed stats ─────────────────────────────────────────────────────────

  const activeCount = members.filter(m => m.status === 'active').length;
  const pendingCount = members.filter(m => m.status === 'pending').length;
  const totalCreditsUsed = members.reduce((sum, m) => sum + m.creditsUsed, 0);
  // Fixed seat cap for display — in a real product this would come from the subscription
  const SEAT_LIMIT = 10;

  // ── Action handlers ────────────────────────────────────────────────────────

  /** Removes a member row from the DB + local state */
  async function handleRemove(memberId: number) {
    setRemovingId(memberId);
    try {
      const res = await fetch(API_ROUTES.team.remove, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      if (res.ok) {
        // Remove from local state immediately for a snappy UX
        setMembers(prev => prev.filter(m => m.id !== memberId));
      }
    } finally {
      setRemovingId(null);
    }
  }

  /** Saves a new quota from the inline editor */
  function handleQuotaSaved(memberId: number, newQuota: number) {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, creditQuota: newQuota } : m));
    setEditingQuotaId(null);
  }

  /** Toggles the low-credit alert for a member */
  async function handleToggleAlert(memberId: number, enabled: boolean) {
    // Optimistic update
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, lowCreditAlert: enabled } : m));
    await fetch(API_ROUTES.team.toggleAlert, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, enabled }),
    });
  }

  /** Adds a newly invited member to the local list */
  function handleMemberInvited(member: TeamMember) {
    setMembers(prev => [member, ...prev]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    // Main content area — offset for NavRail (160px) + TopBar (56px)
    <div
      className="ml-[160px] pt-14 min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)', padding: '0 0 40px' }}
    >
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '28px 32px 0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            Team
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Manage collaborators, roles and daily credit limits.
          </p>
        </div>

        {/* Invite button */}
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            backgroundColor: 'var(--color-brand)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 12px var(--color-brand)',
          }}
        >
          {/* Plus icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Invite member
        </button>
      </div>

      {/* ── Stat cards row ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '24px 32px 0',
          flexWrap: 'wrap',
        }}
      >
        {/* Seats used */}
        <StatCard
          icon="👥"
          value={`${activeCount} / ${SEAT_LIMIT}`}
          label="Seats used"
          accent="var(--color-brand)"
        />
        {/* Total credits consumed by team today */}
        <StatCard
          icon="⚡"
          value={totalCreditsUsed.toLocaleString()}
          label="Team credits used today"
          accent="#f59e0b"
        />
        {/* Pending invites */}
        <StatCard
          icon="✉️"
          value={pendingCount}
          label="Pending invites"
          accent={pendingCount > 0 ? '#f59e0b' : undefined}
        />
      </div>

      {/* ── Member table ────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 32px 0' }}>
        {loading
          ? (
              /* Skeleton rows while loading */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="animate-pulse"
                    style={{
                      height: 56,
                      backgroundColor: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                ))}
              </div>
            )
          : members.length === 0
            ? (
                <EmptyState onInvite={() => setShowInviteModal(true)} />
              )
            : (
                /* ── Table ── */
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Table header */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1.5fr 1fr auto',
                      padding: '10px 20px',
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface-subtle)',
                    }}
                  >
                    {['Member', 'Status', 'Role', 'Credit quota', 'Usage today', 'Alert', 'Actions'].map(col => (
                      <span key={col} style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {col}
                      </span>
                    ))}
                  </div>

                  {/* Table rows */}
                  {members.map((member, idx) => (
                    <div
                      key={member.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1.5fr 1fr auto',
                        padding: '14px 20px',
                        alignItems: 'center',
                        borderBottom: idx < members.length - 1 ? '1px solid var(--color-border)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      className="hover:bg-[var(--color-surface-subtle)]"
                    >
                      {/* ── Member cell: avatar + name + email ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={member.name} email={member.email} size={36} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {member.name ?? member.email}
                          </div>
                          {member.name && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Status dot + label ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <StatusDot status={member.status} />
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                          {member.status}
                        </span>
                      </div>

                      {/* ── Role badge ── */}
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 9999,
                            backgroundColor: ROLE_STYLES[member.role]?.bg ?? '#6366f122',
                            color: ROLE_STYLES[member.role]?.text ?? '#818cf8',
                            border: `1px solid ${ROLE_STYLES[member.role]?.text ?? '#818cf8'}44`,
                            textTransform: 'capitalize',
                          }}
                        >
                          {member.role}
                        </span>
                      </div>

                      {/* ── Credit quota (editable) ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {editingQuotaId === member.id
                          ? (
                              <QuotaEditor
                                memberId={member.id}
                                currentQuota={member.creditQuota}
                                onSaved={quota => handleQuotaSaved(member.id, quota)}
                                onCancel={() => setEditingQuotaId(null)}
                              />
                            )
                          : (
                              <>
                                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                  {member.creditQuota === 0 ? 'Unlimited' : `${member.creditQuota}/day`}
                                </span>
                                {/* Pencil edit icon */}
                                <button
                                  onClick={() => setEditingQuotaId(member.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 3,
                                    cursor: 'pointer',
                                    color: 'var(--color-text-muted)',
                                    opacity: 0.6,
                                    lineHeight: 1,
                                  }}
                                  title="Edit quota"
                                >
                                  {/* Pencil SVG */}
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              </>
                            )}
                      </div>

                      {/* ── Usage progress bar ── */}
                      <UsageBar used={member.creditsUsed} quota={member.creditQuota} />

                      {/* ── Low credit alert toggle ── */}
                      <div>
                        <button
                          onClick={() => handleToggleAlert(member.id, !member.lowCreditAlert)}
                          style={{
                            position: 'relative',
                            width: 36,
                            height: 20,
                            borderRadius: 9999,
                            backgroundColor: member.lowCreditAlert ? 'var(--color-brand)' : 'var(--color-border)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            padding: 0,
                          }}
                          title={member.lowCreditAlert ? 'Alert on' : 'Alert off'}
                        >
                          {/* Toggle thumb */}
                          <span
                            style={{
                              position: 'absolute',
                              top: 3,
                              left: member.lowCreditAlert ? 19 : 3,
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              backgroundColor: '#fff',
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }}
                          />
                        </button>
                      </div>

                      {/* ── Row action buttons ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/* Resend invite — only for pending members */}
                        {member.status === 'pending' && (
                          <button
                            title="Resend invite"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 6,
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                              borderRadius: 'var(--radius-sm)',
                              lineHeight: 1,
                            }}
                            className="hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-brand)]"
                          >
                            {/* Mail resend icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10" />
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                          </button>
                        )}

                        {/* Remove / revoke button */}
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={removingId === member.id}
                          title={member.status === 'pending' ? 'Revoke invite' : 'Remove member'}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 6,
                            cursor: removingId === member.id ? 'not-allowed' : 'pointer',
                            color: 'var(--color-text-muted)',
                            borderRadius: 'var(--radius-sm)',
                            lineHeight: 1,
                          }}
                          className="hover:bg-[#ef444422] hover:text-[#f87171]"
                        >
                          {/* Trash / spinner */}
                          {removingId === member.id
                            ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                                  <line x1="12" y1="2" x2="12" y2="6" />
                                  <line x1="12" y1="18" x2="12" y2="22" />
                                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                                  <line x1="2" y1="12" x2="6" y2="12" />
                                  <line x1="18" y1="12" x2="22" y2="12" />
                                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                                </svg>
                              )
                            : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
      </div>

      {/* ── Invite Modal ─────────────────────────────────────────────────────── */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvited={(member) => {
            handleMemberInvited(member);
            setShowInviteModal(false);
          }}
        />
      )}
    </div>
  );
}
