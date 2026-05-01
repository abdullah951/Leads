'use client';

import { useState } from 'react';
import type { FilterOption } from '@/hooks/useFilterState';
import { REGION_GROUPS } from '@/constants/regionCountries';

type Props = {
  /** Countries loaded from the DB — used only to resolve IDs for filtering. */
  allCountries: FilterOption[];
  selected: FilterOption[];
  onChange: (value: FilterOption[]) => void;
};

/**
 * Renders all hardcoded region groups with country checkboxes.
 * Countries are always shown regardless of DB state; DB IDs are used for search filtering.
 * If a country has no DB ID yet, it still renders but won't filter results.
 */
export function LocationRegions(props: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Index DB countries by lowercased name for ID lookup
  const idByName = new Map(props.allCountries.map(c => [c.label.toLowerCase(), c.id]));

  // Build display items for each region — all hardcoded names always shown
  const regions = REGION_GROUPS.map(r => ({
    ...r,
    items: r.countryNames.map(name => ({
      name,
      id: idByName.get(name.toLowerCase()) ?? null,
    })),
  }));

  function isSelected(name: string) {
    return props.selected.some(s => s.label === name);
  }

  function toggleCountry(name: string, id: number | null) {
    if (isSelected(name)) {
      props.onChange(props.selected.filter(s => s.label !== name));
    } else {
      // Include even if no DB ID — just won't filter results for that country
      props.onChange([...props.selected, { id: id ?? `name:${name}`, label: name }]);
    }
  }

  function toggleAll(items: { name: string; id: string | number | null }[]) {
    const allSelected = items.every(c => isSelected(c.name));
    if (allSelected) {
      const names = new Set(items.map(c => c.name));
      props.onChange(props.selected.filter(s => !names.has(s.label)));
    } else {
      const missing = items.filter(c => !isSelected(c.name));
      const toAdd = missing.map(c => ({ id: c.id ?? `name:${c.name}`, label: c.name }));
      props.onChange([...props.selected, ...toAdd]);
    }
  }

  function toggleRegion(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col">
      {regions.map((region) => {
        const isOpen = expanded[region.key] ?? false;
        const allChecked = region.items.length > 0 && region.items.every(c => isSelected(c.name));
        const someChecked = region.items.some(c => isSelected(c.name));

        return (
          <div key={region.key}>
            {/* Region header */}
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-[var(--radius-md)] px-1 py-1 text-left text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
              onClick={() => toggleRegion(region.key)}
            >
              <span className="font-medium">{region.label}</span>
              <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                {someChecked && !allChecked && (
                  <span className="inline-block size-1.5 rounded-full bg-[var(--color-brand)]" />
                )}
                {isOpen ? '−' : '+'}
              </span>
            </button>

            {/* Country list */}
            {isOpen && (
              <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-border)] pl-2">
                {/* Select all */}
                <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-1 py-0.5 text-xs italic text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--color-brand)]"
                    checked={allChecked}
                    onChange={() => toggleAll(region.items)}
                  />
                  Select all
                </label>

                {region.items.map(country => (
                  <label
                    key={country.name}
                    className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-1 py-0.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-[var(--color-brand)]"
                      checked={isSelected(country.name)}
                      onChange={() => toggleCountry(country.name, country.id as number | null)}
                    />
                    <span className="truncate">{country.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
