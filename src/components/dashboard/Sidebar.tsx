'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BoolKey, FilterOption, MultiKey, NullableIdKey, StringKey } from '@/hooks/useFilterState';
import type { FilterState } from '@/hooks/useFilterState';
import { API_ROUTES } from '@/constants/apiRoutes';
import { FilterMultiSelect } from './FilterMultiSelect';
import { LocationRegions } from './LocationRegions';

type StaticOption = FilterOption;

type Props = {
  filters: FilterState;
  onMultiChange: (key: MultiKey, value: FilterOption[]) => void;
  onBoolChange: (key: BoolKey, value: boolean) => void;
  onStringChange: (key: StringKey, value: string) => void;
  onNullableIdChange: (key: NullableIdKey, id: number | null) => void;
  onListIdChange: (id: number | null) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  listVersion: number;
};

/* ── Icon SVGs ─────────────────────────────────────────────────────────── */

/** Envelope icon — used for Contact filters */
function IconContact() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/** Magnifying glass — Name / Email / LinkedIn search */
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/** Briefcase — Job title / management / department */
function IconJob() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" />
      <path d="M2 12h20" />
    </svg>
  );
}

/** Map pin — Location / countries */
function IconLocation() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** Building — Industry */
function IconIndustry() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M9 8h1" /><path d="M9 12h1" /><path d="M9 16h1" />
      <path d="M14 8h1" /><path d="M14 12h1" /><path d="M14 16h1" />
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
    </svg>
  );
}

/** Office — Company / size */
function IconCompany() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3H6a2 2 0 0 0-2 2v16h16V9a2 2 0 0 0-2-2h-6Z" />
      <path d="M12 3v6" />
      <path d="M8 13h.01" /><path d="M12 13h.01" /><path d="M16 13h.01" />
      <path d="M8 17h.01" /><path d="M12 17h.01" /><path d="M16 17h.01" />
    </svg>
  );
}

/** Circuit chip — Technology */
function IconTech() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}

/** Star — Skill */
function IconSkill() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/** Graduation cap — Education */
function IconEducation() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

/* ── Helper sub-components (unchanged logic, kept internal) ─────────────── */

/** Flat checkbox list with optional "show more" collapse. */
function CheckboxList(props: {
  options: StaticOption[];
  selected: FilterOption[];
  onChange: (value: FilterOption[]) => void;
  collapseAfter?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const limit = props.collapseAfter ?? 8;
  const visible = expanded ? props.options : props.options.slice(0, limit);
  const hasMore = props.options.length > limit;

  function toggle(opt: StaticOption) {
    const already = props.selected.some(s => s.id === opt.id);
    props.onChange(already
      ? props.selected.filter(s => s.id !== opt.id)
      : [...props.selected, opt]);
  }

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map(opt => (
        <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-1 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]">
          <input type="checkbox" className="size-3.5 accent-[var(--color-brand)]" checked={props.selected.some(s => s.id === opt.id)} onChange={() => toggle(opt)} />
          <span className="truncate">{opt.label}</span>
        </label>
      ))}
      {hasMore && (
        <button type="button" className="mt-0.5 text-left text-[10px] text-[var(--color-brand)] hover:underline" onClick={() => setExpanded(e => !e)}>
          {expanded ? '− Show less' : `+ ${props.options.length - limit} more`}
        </button>
      )}
    </div>
  );
}

/** Small muted sub-label inside a panel section. */
function SubLabel(props: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
      {props.children}
    </p>
  );
}

/** Section header inside the glass panel. */
function PanelSection(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {/* Section label */}
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        {props.label}
      </p>
      {props.children}
    </div>
  );
}

// C-Suite management level names — must match DB labels exactly
const C_SUITE_NAMES = new Set([
  'Executive', 'Finance Executive', 'Human Resource Executive', 'IT Executive',
  'Legal Executive', 'Marketing Executive', 'Medical & Health Executive',
  'Operations Executive', 'Sales Executive',
]);

/** Management level filter with collapsible C-Suite sub-group. */
function ManagementLevelFilter(props: {
  options: StaticOption[];
  selected: FilterOption[];
  onChange: (value: FilterOption[]) => void;
}) {
  const [cSuiteOpen, setCSuiteOpen] = useState(false);

  const regular = props.options.filter(o => !C_SUITE_NAMES.has(String(o.label)));
  const cSuite = props.options.filter(o => C_SUITE_NAMES.has(String(o.label)));

  function toggle(opt: StaticOption) {
    const already = props.selected.some(s => s.id === opt.id);
    props.onChange(already
      ? props.selected.filter(s => s.id !== opt.id)
      : [...props.selected, opt]);
  }

  const cSuiteSelected = cSuite.filter(o => props.selected.some(s => s.id === o.id));
  const allCSelected = cSuite.length > 0 && cSuiteSelected.length === cSuite.length;

  function toggleAllCSuite() {
    if (allCSelected) {
      const ids = new Set(cSuite.map(o => o.id));
      props.onChange(props.selected.filter(s => !ids.has(s.id)));
    } else {
      const missing = cSuite.filter(o => !props.selected.some(s => s.id === o.id));
      props.onChange([...props.selected, ...missing]);
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      {regular.map(opt => (
        <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-1 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]">
          <input type="checkbox" className="size-3.5 accent-[var(--color-brand)]" checked={props.selected.some(s => s.id === opt.id)} onChange={() => toggle(opt)} />
          <span className="truncate">{opt.label}</span>
        </label>
      ))}

      {/* C-Suite collapsible group */}
      {cSuite.length > 0 && (
        <div className="mt-0.5">
          <button type="button" className="flex w-full items-center justify-between rounded-[var(--radius-md)] px-1 py-1 text-left text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]" onClick={() => setCSuiteOpen(o => !o)}>
            <span className="font-medium">
              {cSuiteOpen ? '−' : '+'} C-Suite ({cSuite.length})
              {cSuiteSelected.length > 0 && <span className="ml-1 text-[var(--color-brand)]">·{cSuiteSelected.length}</span>}
            </span>
          </button>
          {cSuiteOpen && (
            <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-border)] pl-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-1 py-0.5 text-xs italic text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]">
                <input type="checkbox" className="size-3.5 accent-[var(--color-brand)]" checked={allCSelected} onChange={toggleAllCSuite} />
                Select all
              </label>
              {cSuite.map(opt => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-1 py-0.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]">
                  <input type="checkbox" className="size-3.5 accent-[var(--color-brand)]" checked={props.selected.some(s => s.id === opt.id)} onChange={() => toggle(opt)} />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Collapsible sub-section for country region groups. */
function CountriesToggle(props: {
  label: string;
  allCountries: StaticOption[];
  selected: FilterOption[];
  onChange: (value: FilterOption[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button type="button" className="flex w-full items-center justify-between rounded-[var(--radius-md)] px-1 py-1 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]" onClick={() => setOpen(o => !o)}>
        <span>
          {props.label}
          {props.selected.length > 0 && (
            <span className="ml-1.5 rounded-[var(--radius-full)] bg-[var(--color-brand-light)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-brand-dark)]">
              {props.selected.length}
            </span>
          )}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform duration-[var(--duration-fast)] ${open ? '' : '-rotate-90'}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="mt-1">
          <LocationRegions allCountries={props.allCountries} selected={props.selected} onChange={props.onChange} />
        </div>
      )}
    </div>
  );
}

/**
 * File-chip multi-select: chips + text input that searches uploaded CSV files.
 *
 * @param props.columnType - 'email' | 'linkedin' — filters which files to show.
 * @param props.selected   - Currently selected files as FilterOption[].
 * @param props.onChange   - Called with the new array when selection changes.
 * @param props.placeholder - Input placeholder text.
 */
function FileChipSelect(props: {
  columnType: 'email' | 'linkedin';
  selected: FilterOption[];
  onChange: (value: FilterOption[]) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<{ id: number; uploadName: string }[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(API_ROUTES.uploadedFiles.list, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnType: props.columnType }),
    }).then(r => r.json()).then((data: { id: number; uploadName: string }[]) => setFiles(data)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.columnType]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredFiles = files.filter(
    f => f.uploadName.toLowerCase().includes(query.toLowerCase()) && !props.selected.some(s => Number(s.id) === f.id),
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="flex min-h-[32px] flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-1 focus-within:border-[var(--color-brand)]" onClick={() => setOpen(true)}>
        {props.selected.map(opt => (
          <span key={opt.id} className="flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-brand-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand-dark)]">
            {opt.label}
            <button type="button" className="leading-none opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); props.onChange(props.selected.filter(s => s.id !== opt.id)); }}>×</button>
          </span>
        ))}
        <input type="text" value={query} placeholder={props.selected.length === 0 ? props.placeholder : ''} className="min-w-[80px] flex-1 bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none" onChange={e => setQuery(e.target.value)} onFocus={() => setOpen(true)} />
      </div>
      {open && filteredFiles.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md">
          {filteredFiles.map(file => (
            <button key={file.id} type="button" className="w-full px-3 py-1.5 text-left text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]" onMouseDown={(e) => { e.preventDefault(); props.onChange([...props.selected, { id: file.id, label: file.uploadName }]); setQuery(''); setOpen(false); }}>
              {file.uploadName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section definitions ────────────────────────────────────────────────── */

// Each entry in this array corresponds to one icon button on the strip.
// The `id` is used as the hover key; `activeKeys` lists the filter state keys
// whose non-default values make this icon "glow".
type SectionId = 'contact' | 'search' | 'job' | 'location' | 'industry' | 'company' | 'tech' | 'skill' | 'education';

/* ── Main Glass Drawer Sidebar ──────────────────────────────────────────── */

/**
 * "Glass Drawer" sidebar: a 60px icon strip on the left edge.
 * Hovering an icon slides out a glassmorphism panel over the content area.
 * Active filters make their icon glow in brand colour.
 */
export function Sidebar(props: Props) {
  const t = useTranslations('Sidebar');

  // Static filter options fetched once on mount
  const [managementLevels, setManagementLevels] = useState<StaticOption[]>([]);
  const [departments, setDepartments] = useState<StaticOption[]>([]);
  const [companySizes, setCompanySizes] = useState<StaticOption[]>([]);
  const [allCountries, setAllCountries] = useState<StaticOption[]>([]);

  // Local text input for name/full-name filter
  const [nameInput, setNameInput] = useState('');

  // Which section panel is currently open (null = none)
  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  // Timeout ref used to delay closing so mouse can travel icon → panel without flicker
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref on the panel itself — used to detect outside clicks and close
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset local name input when external reset fires
  useEffect(() => {
    if (props.filters.fullName === '') setNameInput('');
  }, [props.filters.fullName]);

  // Fetch static options once on mount
  useEffect(() => {
    const opts = { method: 'POST', body: '{}' };
    Promise.all([
      fetch(API_ROUTES.filters.managementLevels, opts).then(r => r.json()),
      fetch(API_ROUTES.filters.departments, opts).then(r => r.json()),
      fetch(API_ROUTES.filters.companySizes, opts).then(r => r.json()),
      fetch(API_ROUTES.filters.countries, opts).then(r => r.json()),
    ]).then(([ml, dep, cs, countries]) => {
      setManagementLevels(ml as StaticOption[]);
      setDepartments(dep as StaticOption[]);
      setCompanySizes(cs as StaticOption[]);
      setAllCountries(countries as StaticOption[]);
    }).catch(() => {});
  }, []);

  // Close panel when clicking outside both strip and panel
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Check if the click is also outside the strip (left 60px)
        if ((e.clientX) > 60) setOpenSection(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  /** Called when mouse enters a strip icon. Opens that section immediately. */
  function handleIconEnter(id: SectionId) {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenSection(id);
  }

  /** Called when mouse leaves a strip icon. Starts a short delay before closing. */
  function handleIconLeave() {
    closeTimerRef.current = setTimeout(() => setOpenSection(null), 120);
  }

  /** Called when mouse enters the glass panel. Cancels the close timer. */
  function handlePanelEnter() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }

  /** Called when mouse leaves the glass panel. Starts the close delay. */
  function handlePanelLeave() {
    closeTimerRef.current = setTimeout(() => setOpenSection(null), 120);
  }

  /* ── Active-filter detection — determines which icons glow ─────────── */

  // Returns true if the "contact" section has any active filters
  const contactActive = props.filters.hasWorkEmail || props.filters.hasPersonalEmail || props.filters.hasPhone;

  // Returns true if the "search" section has any active filters
  const searchActive = !!(
    props.filters.fullName
    || props.filters.includeEmailFiles.length
    || props.filters.excludeEmailFiles.length
    || props.filters.includeLinkedInFiles.length
    || props.filters.excludeLinkedInFiles.length
  );

  // Returns true if the "job" section has any active filters
  const jobActive = !!(
    props.filters.jobTitles.length
    || props.filters.managementLevels.length
    || props.filters.departments.length
  );

  // Returns true if the "location" section has any active filters
  const locationActive = !!(props.filters.locations.length || props.filters.selectedCountries.length);

  // Returns true if the "industry" section has any active filters
  const industryActive = props.filters.industries.length > 0;

  // Returns true if the "company" section has any active filters
  const companyActive = !!(props.filters.companies.length || props.filters.companySizes.length);

  // Returns true if the "tech" section has any active filters
  const techActive = props.filters.technologies.length > 0;

  // Returns true if the "skill" section has any active filters
  const skillActive = props.filters.skills.length > 0;

  // Returns true if the "education" section has any active filters
  const educationActive = !!(
    props.filters.educationMajors.length
    || props.filters.haveBachelor
    || props.filters.haveMaster
    || props.filters.haveAssociate
    || props.filters.haveDoctorate
  );

  /* ── Icon strip configuration ───────────────────────────────────────── */

  // Defines order, icon, tooltip text, and active state of each strip button
  const SECTIONS: { id: SectionId; icon: React.ReactNode; label: string; active: boolean }[] = [
    { id: 'contact', icon: <IconContact />, label: t('section_contact'), active: contactActive },
    { id: 'search', icon: <IconSearch />, label: t('section_name_email_linkedin'), active: searchActive },
    { id: 'job', icon: <IconJob />, label: t('section_job_title'), active: jobActive },
    { id: 'location', icon: <IconLocation />, label: t('section_location'), active: locationActive },
    { id: 'industry', icon: <IconIndustry />, label: t('section_industry'), active: industryActive },
    { id: 'company', icon: <IconCompany />, label: t('section_company'), active: companyActive },
    { id: 'tech', icon: <IconTech />, label: t('section_technology'), active: techActive },
    { id: 'skill', icon: <IconSkill />, label: t('section_skill'), active: skillActive },
    { id: 'education', icon: <IconEducation />, label: t('section_education'), active: educationActive },
  ];

  /* ── Panel content for each section ────────────────────────────────── */

  function renderPanelContent(id: SectionId) {
    switch (id) {
      // ── Contact info ─────────────────────────────────────────────────
      case 'contact':
        return (
          <PanelSection label={t('section_contact')}>
            {[
              ['hasWorkEmail', t('has_work_email')] as const,
              ['hasPersonalEmail', t('has_personal_email')] as const,
              ['hasPhone', t('has_phone')] as const,
            ].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-1 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]">
                <input type="checkbox" className="size-3.5 accent-[var(--color-brand)]" checked={props.filters[key]} onChange={e => props.onBoolChange(key, e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </PanelSection>
        );

      // ── Name / Email / LinkedIn search ───────────────────────────────
      case 'search':
        return (
          <>
            <PanelSection label={t('section_name_email_linkedin')}>
              <input
                type="text"
                value={nameInput}
                placeholder={t('placeholder_person_name')}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') props.onStringChange('fullName', nameInput.trim()); }}
              />
            </PanelSection>

            <PanelSection label={t('divider_emails')}>
              <p className="mb-1 text-[10px] text-[var(--color-text-muted)]">{t('file_filter_include')}</p>
              <FileChipSelect columnType="email" selected={props.filters.includeEmailFiles} onChange={v => props.onMultiChange('includeEmailFiles', v)} placeholder={t('file_chip_placeholder_email')} />
              <p className="mb-1 mt-2 text-[10px] text-[var(--color-text-muted)]">{t('file_filter_exclude')}</p>
              <FileChipSelect columnType="email" selected={props.filters.excludeEmailFiles} onChange={v => props.onMultiChange('excludeEmailFiles', v)} placeholder={t('file_chip_placeholder_email')} />
            </PanelSection>

            <PanelSection label={t('divider_linkedin_urls')}>
              <p className="mb-1 text-[10px] text-[var(--color-text-muted)]">{t('file_filter_include')}</p>
              <FileChipSelect columnType="linkedin" selected={props.filters.includeLinkedInFiles} onChange={v => props.onMultiChange('includeLinkedInFiles', v)} placeholder={t('file_chip_placeholder_linkedin')} />
              <p className="mb-1 mt-2 text-[10px] text-[var(--color-text-muted)]">{t('file_filter_exclude')}</p>
              <FileChipSelect columnType="linkedin" selected={props.filters.excludeLinkedInFiles} onChange={v => props.onMultiChange('excludeLinkedInFiles', v)} placeholder={t('file_chip_placeholder_linkedin')} />
            </PanelSection>
          </>
        );

      // ── Job / Management / Department ────────────────────────────────
      case 'job':
        return (
          <>
            <PanelSection label={t('section_job_title')}>
              <FilterMultiSelect placeholder={t('placeholder_search')} fetchUrl={API_ROUTES.filters.jobTitles} selected={props.filters.jobTitles} onChange={v => props.onMultiChange('jobTitles', v)} inlineMode closeSignal={openSection} />
            </PanelSection>

            {managementLevels.length > 0 && (
              <PanelSection label={t('section_management_level')}>
                <ManagementLevelFilter options={managementLevels} selected={props.filters.managementLevels} onChange={v => props.onMultiChange('managementLevels', v)} />
              </PanelSection>
            )}

            {departments.length > 0 && (
              <PanelSection label={t('section_department')}>
                <CheckboxList options={departments} selected={props.filters.departments} onChange={v => props.onMultiChange('departments', v)} />
              </PanelSection>
            )}
          </>
        );

      // ── Location / Countries ─────────────────────────────────────────
      case 'location':
        return (
          <PanelSection label={t('section_location')}>
            <FilterMultiSelect placeholder={t('placeholder_search')} fetchUrl={API_ROUTES.filters.locations} selected={props.filters.locations} onChange={v => props.onMultiChange('locations', v)} inlineMode closeSignal={openSection} />
            <CountriesToggle label={t('section_countries')} allCountries={allCountries} selected={props.filters.selectedCountries} onChange={v => props.onMultiChange('selectedCountries', v)} />
          </PanelSection>
        );

      // ── Industry ─────────────────────────────────────────────────────
      case 'industry':
        return (
          <PanelSection label={t('section_industry')}>
            <FilterMultiSelect placeholder={t('placeholder_search')} fetchUrl={API_ROUTES.filters.industries} selected={props.filters.industries} onChange={v => props.onMultiChange('industries', v)} inlineMode closeSignal={openSection} />
          </PanelSection>
        );

      // ── Company / Size ───────────────────────────────────────────────
      case 'company':
        return (
          <>
            <PanelSection label={t('section_company')}>
              <FilterMultiSelect placeholder={t('placeholder_search')} fetchUrl={API_ROUTES.leads.companies} selected={props.filters.companies} onChange={v => props.onMultiChange('companies', v)} inlineMode closeSignal={openSection} />
            </PanelSection>

            {companySizes.length > 0 && (
              <PanelSection label={t('section_company_size')}>
                <CheckboxList options={companySizes} selected={props.filters.companySizes} onChange={v => props.onMultiChange('companySizes', v)} />
              </PanelSection>
            )}
          </>
        );

      // ── Technology ───────────────────────────────────────────────────
      case 'tech':
        return (
          <PanelSection label={t('section_technology')}>
            <FilterMultiSelect placeholder={t('placeholder_search')} fetchUrl={API_ROUTES.filters.technologies} selected={props.filters.technologies} onChange={v => props.onMultiChange('technologies', v)} inlineMode closeSignal={openSection} />
          </PanelSection>
        );

      // ── Skill ────────────────────────────────────────────────────────
      case 'skill':
        return (
          <PanelSection label={t('section_skill')}>
            <FilterMultiSelect placeholder={t('placeholder_search')} fetchUrl={API_ROUTES.filters.skills} selected={props.filters.skills} onChange={v => props.onMultiChange('skills', v)} inlineMode closeSignal={openSection} />
          </PanelSection>
        );

      // ── Education ────────────────────────────────────────────────────
      case 'education':
        return (
          <PanelSection label={t('section_education')}>
            <SubLabel>{t('education_degree_label')}</SubLabel>
            <div className="flex flex-col gap-0.5">
              {(
                [
                  ['haveBachelor', t('degree_bachelor')] as const,
                  ['haveMaster', t('degree_master')] as const,
                  ['haveAssociate', t('degree_associate')] as const,
                  ['haveDoctorate', t('degree_doctorate')] as const,
                ] satisfies [BoolKey, string][]
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-1 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]">
                  <input type="checkbox" className="size-3.5 accent-[var(--color-brand)]" checked={props.filters[key]} onChange={e => props.onBoolChange(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <SubLabel>{t('education_major_label')}</SubLabel>
            <FilterMultiSelect placeholder={t('placeholder_search')} fetchUrl={API_ROUTES.education.majors} selected={props.filters.educationMajors} onChange={v => props.onMultiChange('educationMajors', v)} inlineMode closeSignal={openSection} />
          </PanelSection>
        );

      default:
        return null;
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <>
      {/*
        ── Icon strip (60px wide, fixed left)
        Each button is an icon with a tooltip on the right.
        Active icons glow in brand colour with a drop-shadow.
      */}
      {/* Icon strip sits at left-[160px] — NavRail occupies the first 160px */}
      <aside className="fixed bottom-0 left-[160px] top-14 z-[var(--z-sidebar)] flex w-[60px] shrink-0 flex-col items-center border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] py-2">

        {/* Icon buttons */}
        <div className="flex flex-1 flex-col items-center gap-1 pt-1">
          {SECTIONS.map(section => (
            // Each icon button: tooltip via `title`, glow when active
            <div
              key={section.id}
              className="group relative"
              onMouseEnter={() => handleIconEnter(section.id)}
              onMouseLeave={handleIconLeave}
            >
              <button
                type="button"
                aria-label={section.label}
                // Click toggles the section: opens if closed, closes if already open
                onClick={() => setOpenSection(prev => prev === section.id ? null : section.id)}
                className={[
                  'flex size-10 items-center justify-center rounded-[var(--radius-lg)] transition-all duration-150',
                  // When this section's panel is open → tinted background
                  openSection === section.id
                    ? 'bg-[var(--color-brand-light)]'
                    : 'hover:bg-[var(--color-surface-subtle)]',
                  // Active (has filters set) → brand colour + glow
                  section.active
                    ? 'text-[var(--color-brand)] [filter:drop-shadow(0_0_6px_var(--color-brand))]'
                    : 'text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                {section.icon}
              </button>

              {/* Tooltip — appears to the right of the icon, only when panel is NOT open */}
              {/* {openSection !== section.id && (
                <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-primary)] opacity-0 shadow-sm transition-opacity duration-100 group-hover:opacity-100">
                  {section.label}
                </span>
              )} */}

              {/* Active dot — tiny brand dot below the icon when filters are set */}
              {section.active && (
                <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--color-brand)]" />
              )}
            </div>
          ))}
        </div>

        {/* Clear all button — only shown when at least one filter is active */}
        {props.hasActiveFilters && (
          <div className="group relative mb-2">
            <button
              type="button"
              aria-label={t('clear_all')}
              title={t('clear_all')}
              onClick={props.onReset}
              className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-error,#ef4444)] hover:bg-[var(--color-surface-subtle)] transition-all duration-150"
            >
              {/* X icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
            </button>
            <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--color-text-primary)] px-2 py-1 text-[10px] font-medium text-[var(--color-bg)] opacity-0 transition-opacity duration-100 group-hover:opacity-100">
              {t('clear_all')}
            </span>
          </div>
        )}
      </aside>

      {/*
        ── Glass Drawer Panel
        Slides out from the right edge of the icon strip.
        Overlays the table content (does not push it).
        Backdrop blur + semi-transparent background = glassmorphism.
      */}
      {/* Glass panel starts at left-[220px] — after NavRail (160px) + icon strip (60px) */}
      {openSection && (
        <div
          ref={panelRef}
          onMouseEnter={handlePanelEnter}
          onMouseLeave={handlePanelLeave}
          className="fixed bottom-0 left-[220px] top-14 z-[calc(var(--z-sidebar)-1)] w-72 overflow-y-auto border-r border-white/10 bg-white/85 shadow-[4px_0_24px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:bg-slate-900/85"
          style={{
            // Slide-in animation: panel glides from left on open
            animation: 'glassSlideIn 0.18s ease forwards',
          }}
        >
          {/* Panel inner padding */}
          <div className="px-4 py-4">
            {renderPanelContent(openSection)}
          </div>
        </div>
      )}
    </>
  );
}
