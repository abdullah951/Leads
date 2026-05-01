'use client';

// ── NavRail ────────────────────────────────────────────────────────────────────
// Fixed left navigation rail — 160 px wide, always expanded.
// Layout:
//   • Pinned top: "Search Leads" CTA button
//   • Scrollable middle: WORKSPACE / SYSTEM / SUPPORT sections
//     - Each section has a faint 1px rule, a 10px / 50%-opacity header, then items
//   • Pinned bottom: Settings
//
// Active item: brand bg + text + icon drop-shadow glow + 2px left accent bar.
// Section headers: 10px font, 50% opacity, uppercase tracking.
// ──────────────────────────────────────────────────────────────────────────────

import { Link } from '@/libs/I18nNavigation';
import { CLIENT_ROUTES } from '@/constants/clientRoutes';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * All valid active-page keys.
 * Each layout file passes the matching key so the rail highlights the right item.
 */
type ActivePage =
  | 'dashboard'
  | 'leads-lists'
  | 'uploaded-files'
  | 'export-jobs'
  | 'favorites'
  | 'reveal-history'
  // | 'account-billing'
  | 'integrations'
  | 'webhooks'
  | 'team'
  | 'documentation'
  | 'feedback'
  | 'whats-new'
  | 'settings';

type Props = {
  /** Which page is currently active — drives the glow/accent indicator. */
  activePage: ActivePage;
};

/** A single navigable item in the rail */
type NavItem = {
  key: ActivePage;
  href: string;
  label: string;
  icon: React.ReactNode;
  /** When true the link opens in a new tab (used for the external Docs link). */
  external?: boolean;
};

/** A labelled group of nav items */
type NavSection = {
  /** Rendered as a 10px / 50%-opacity uppercase label above the items */
  title: string;
  items: NavItem[];
};

// ── Icons ─────────────────────────────────────────────────────────────────────
// All icons are 16×16 Lucide-style stroke SVGs for visual consistency.

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconExport() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}


function IconPlug() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// Kept for future use (currently disabled in nav items)
export function IconWebhook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Simplified webhook / share icon */}
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ── Nav section data ───────────────────────────────────────────────────────────

/**
 * Section definitions rendered in the scrollable middle area.
 * "Search Leads" and "Settings" are rendered separately (pinned top/bottom).
 */
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      {
        key: 'leads-lists',
        href: CLIENT_ROUTES.leadsList,
        label: 'Leads Lists',
        icon: <IconList />,
      },
      {
        key: 'uploaded-files',
        href: CLIENT_ROUTES.uploadedFiles,
        label: 'Uploaded Files',
        icon: <IconUpload />,
      },
      {
        key: 'export-jobs',
        href: CLIENT_ROUTES.exportJobs,
        label: 'Export Jobs',
        icon: <IconExport />,
      },
      // Lightweight bookmarking — save individual leads for quick access
      {
        key: 'favorites',
        href: '/favorites',
        label: 'Favorites',
        icon: <IconHeart />,
      },
      // Log of every contact the current user has revealed (email / phone)
      {
        key: 'reveal-history',
        href: '/reveal-history',
        label: 'Reveal History',
        icon: <IconEye />,
      },
      // Account + subscription + billing — replaces the profile-dropdown entry
      // {
      //   key: 'account-billing',
      //   href: '/account',
      //   label: 'Account / Billing',
      //   icon: <IconCreditCard />,
      // },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      // Integrations — connect CRMs, Zapier, etc. (moved out of Settings)
      {
        key: 'integrations',
        href: '/integrations',
        label: 'Integrations',
        icon: <IconPlug />,
      },
      // // Webhooks — outbound event hooks (e.g. lead revealed → POST to your endpoint)
      // {
      //   key: 'webhooks',
      //   href: '/webhooks',
      //   label: 'Webhooks',
      //   icon: <IconWebhook />,
      // },
      // Team Management — invite members, assign roles
      {
        key: 'team',
        href: '/team',
        label: 'Team',
        icon: <IconUsers />,
      },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      // In-app documentation hub — full guide, FAQ, and feature reference
      {
        key: 'documentation',
        href: CLIENT_ROUTES.documentation,
        label: 'Documentation',
        icon: <IconBook />,
      },
      // In-app feedback form
      {
        key: 'feedback',
        href: '/feedback',
        label: 'Feedback',
        icon: <IconMessage />,
      },
      // Changelog / release notes page
      {
        key: 'whats-new',
        href: CLIENT_ROUTES.whatsNew,
        label: "What's New",
        icon: <IconStar />,
      },
    ],
  },
];

// ── NavItemRow — renders a single item link ────────────────────────────────────

/**
 * Renders one nav item as a full-width link row (icon + label).
 * Active state: brand bg, brand text, glow filter on icon.
 * External links open in a new tab via a plain <a>.
 */
function NavItemRow(props: { item: NavItem; isActive: boolean }) {
  const { item, isActive } = props;

  // Base classes shared between internal Link and external <a>
  const cls = [
    'flex items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-[7px]',
    'text-[12px] font-medium leading-none transition-colors duration-150',
    isActive
      ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]',
  ].join(' ');

  // Icon span — adds a glow drop-shadow when the item is active
  const iconSpan = (
    <span
      className="shrink-0"
      style={isActive ? { filter: 'drop-shadow(0 0 4px var(--color-brand))' } : undefined}
    >
      {item.icon}
    </span>
  );

  // External links (Documentation) use a plain <a> to get target="_blank"
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {iconSpan}
        <span className="truncate">{item.label}</span>
      </a>
    );
  }

  return (
    <Link href={item.href} className={cls}>
      {iconSpan}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Fixed left navigation rail.
 * Sections are separated by a faint 1px rule and a tiny 10px / 50%-opacity label.
 * Each active item gets a 2px glowing left accent bar.
 * Settings is pinned at the very bottom, below a border-t separator.
 */
export function NavRail(props: Props) {
  return (
    // Fixed below the 56px topbar — inline zIndex because Tailwind v4 can't resolve
    // CSS vars inside arbitrary z-[...] bracket syntax.
    <nav
      style={{ zIndex: 10 }}
      className="fixed left-0 top-14 flex h-[calc(100vh-56px)] w-[160px] flex-col border-r border-[var(--color-border)] bg-[var(--color-topbar-bg)]"
    >

      {/* ── Pinned top: "Search Leads" CTA ─────────────────────────────────
          Solid brand button — the primary action of the app.
          When active it glows; when inactive it shows a brand-tinted bg. */}
      <div className="px-3 pb-1 pt-3">
        {/* Wrapper is relative so the 2px accent bar can be positioned absolutely */}
        <div className="relative">
          {props.activePage === 'dashboard' && (
            // 2px left accent bar for the active dashboard item
            <span
              className="absolute -left-1 top-1/2 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--color-brand)]"
              style={{ height: '28px', boxShadow: '0 0 8px 2px var(--color-brand)' }}
            />
          )}
          <Link
            href={CLIENT_ROUTES.dashboard}
            className={[
              'flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2',
              'text-[12px] font-semibold transition-colors duration-150',
              props.activePage === 'dashboard'
                // Active: filled brand button with outer glow
                ? 'bg-[var(--color-brand)] text-white shadow-[0_0_12px_2px_var(--color-brand)]'
                // Inactive: brand-tinted pill — transitions to full brand on hover
                : 'bg-[var(--color-brand-light)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white',
            ].join(' ')}
          >
            {/* Magnifying glass icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search Leads
          </Link>
        </div>
      </div>

      {/* ── Scrollable section list ─────────────────────────────────────────
          Each section: faint 1px rule → tiny header → list of item rows. */}
      {/* Thin custom scrollbar: 4px wide, light transparent thumb, no track */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-border)] [&::-webkit-scrollbar-thumb]:opacity-50">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>

            {/* Faint horizontal separator before each section */}
            <div className="mx-1 my-2 h-px bg-[var(--color-border)] opacity-50" />

            {/* Section header — 10px, 50% opacity, uppercase with wide tracking */}
            <p
              className="mb-1 px-2 font-medium uppercase tracking-widest text-[var(--color-text-muted)]"
              style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '0.1em' }}
            >
              {section.title}
            </p>

            {/* Items for this section */}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = props.activePage === item.key;

                return (
                  // relative so the absolute 2px accent bar is scoped to this row
                  <li key={item.key} className="relative">

                    {/* 2px glowing left accent bar — only for the active item */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--color-brand)]"
                        style={{ height: '22px', boxShadow: '0 0 6px 1px var(--color-brand)' }}
                      />
                    )}

                    <NavItemRow item={item} isActive={isActive} />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Pinned bottom: Settings ─────────────────────────────────────────
          Separated by a border-t; always visible regardless of scroll position.
          Users expect Settings at the bottom in modern SaaS tools. */}
      <div className="border-t border-[var(--color-border)] px-2 py-2">
        <div className="relative">
          {/* Accent bar for settings active state */}
          {props.activePage === 'settings' && (
            <span
              className="absolute left-0 top-1/2 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--color-brand)]"
              style={{ height: '22px', boxShadow: '0 0 6px 1px var(--color-brand)' }}
            />
          )}
          <Link
            href="/settings"
            className={[
              'flex items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-[7px]',
              'text-[12px] font-medium leading-none transition-colors duration-150',
              props.activePage === 'settings'
                ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            <span
              className="shrink-0"
              style={props.activePage === 'settings' ? { filter: 'drop-shadow(0 0 4px var(--color-brand))' } : undefined}
            >
              <IconSettings />
            </span>
            <span className="truncate">Settings</span>
          </Link>
        </div>
      </div>

    </nav>
  );
}
