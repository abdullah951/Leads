/**
 * Design tokens — single source of truth.
 *
 * CSS variables in global.css @theme block mirror these values.
 * Primary brand: Indigo-600 (#4F46E5) — Stripe/Linear/Attio aesthetic.
 * Surfaces: pure white (#FFFFFF) content, Slate-50 (#F8FAFC) sidebar.
 * Borders: Slate-200 (#E2E8F0) hairlines.
 */

export const colors = {
  // ── Brand — Indigo ─────────────────────────────────────────────────────────
  brand: '#4F46E5',      // Indigo-600 — primary actions, active states, links
  brandDark: '#4338CA',  // Indigo-700 — hover / pressed states
  brandLight: '#EEF2FF', // Indigo-50  — badge fills, chip backgrounds

  // ── Accents ────────────────────────────────────────────────────────────────
  emerald: '#10B981',      // Emerald-500 — "revealed" contact status
  emeraldLight: '#D1FAE5', // Emerald-100 — revealed badge background
  amber: '#F59E0B',        // Amber-500   — filter active highlight
  amberLight: '#FEF3C7',   // Amber-100   — filter active badge background

  // ── Semantic ───────────────────────────────────────────────────────────────
  success: '#10B981',  // Emerald
  warning: '#F59E0B',  // Amber
  error: '#EF4444',    // Red-500
  info: '#4F46E5',     // Indigo (matches brand)

  // ── Slate neutrals (surfaces, text, borders) ───────────────────────────────
  slate50: '#F8FAFC',   // Sidebar background
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',  // Hairline borders
  slate300: '#CBD5E1',
  slate400: '#94A3B8',  // Muted text / placeholders
  slate500: '#64748B',  // Secondary text / labels
  slate600: '#475569',
  slate700: '#334155',  // Dark mode borders
  slate800: '#1E293B',  // Dark mode surface-subtle
  slate900: '#0F172A',  // Deep heading colour + dark mode surface

  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  // Strict 4-point grid
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
};

export const radii = {
  none: '0px',
  sm: '4px',   // tight — tags, chips
  md: '6px',   // default — buttons, inputs
  lg: '8px',   // cards, panels
  xl: '12px',  // modals, dialogs
  full: '9999px', // pills, avatars
};

export const shadows = {
  // Subtle indigo-tinted shadows — no heavy drop shadows
  sm: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
  md: '0 4px 6px -1px rgb(79 70 229 / 0.08), 0 2px 4px -2px rgb(79 70 229 / 0.04)',
  lg: '0 10px 15px -3px rgb(79 70 229 / 0.1), 0 4px 6px -4px rgb(79 70 229 / 0.05)',
  focusRing: '0 0 0 3px rgb(79 70 229 / 0.35)', // Indigo focus glow
};

export const motion = {
  durationFast: '100ms',
  durationBase: '200ms',
  durationSlow: '400ms',
  easeDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
};

export const zIndex = {
  sidebar: 10,
  topbar: 20,
  modal: 50,
  toast: 60,
  tooltip: 70,
};
