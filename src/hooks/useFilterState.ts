'use client';

import { useCallback, useState } from 'react';

export type FilterOption = { id: number | string; label: string };

export type FilterState = {
  jobTitles: FilterOption[];
  locations: FilterOption[];
  selectedCountries: FilterOption[];
  industries: FilterOption[];
  technologies: FilterOption[];
  skills: FilterOption[];
  managementLevels: FilterOption[];
  departments: FilterOption[];
  companySizes: FilterOption[];
  companies: FilterOption[];
  educationMajors: FilterOption[];
  listId: number | null;
  page: number;
  pageSize: number;
  hasWorkEmail: boolean;
  hasPersonalEmail: boolean;
  hasPhone: boolean;
  haveBachelor: boolean;
  haveMaster: boolean;
  haveAssociate: boolean;
  haveDoctorate: boolean;
  fullName: string;
  // File-chip multi-select for email/LinkedIn URL filtering (OR logic across files)
  includeEmailFiles: FilterOption[];
  excludeEmailFiles: FilterOption[];
  includeLinkedInFiles: FilterOption[];
  excludeLinkedInFiles: FilterOption[];
};

const DEFAULT_STATE: FilterState = {
  jobTitles: [],
  locations: [],
  selectedCountries: [],
  industries: [],
  technologies: [],
  skills: [],
  managementLevels: [],
  departments: [],
  companySizes: [],
  companies: [],
  educationMajors: [],
  listId: null,
  page: 1,
  pageSize: 25,
  hasWorkEmail: true,
  hasPersonalEmail: true,
  hasPhone: false,
  haveBachelor: false,
  haveMaster: false,
  haveAssociate: false,
  haveDoctorate: false,
  fullName: '',
  // File-chip arrays default to empty (no files selected)
  includeEmailFiles: [],
  excludeEmailFiles: [],
  includeLinkedInFiles: [],
  excludeLinkedInFiles: [],
};

export type MultiKey = keyof Pick<
  FilterState,
  | 'jobTitles'
  | 'locations'
  | 'selectedCountries'
  | 'industries'
  | 'technologies'
  | 'skills'
  | 'managementLevels'
  | 'departments'
  | 'companySizes'
  | 'companies'
  | 'educationMajors'
  // File-chip multi-selects for email/LinkedIn filtering
  | 'includeEmailFiles'
  | 'excludeEmailFiles'
  | 'includeLinkedInFiles'
  | 'excludeLinkedInFiles'
>;

export type BoolKey = keyof Pick<
  FilterState,
  | 'hasWorkEmail'
  | 'hasPersonalEmail'
  | 'hasPhone'
  | 'haveBachelor'
  | 'haveMaster'
  | 'haveAssociate'
  | 'haveDoctorate'
>;

export type StringKey = keyof Pick<
  FilterState,
  // Only fullName remains as a string filter; email/LinkedIn moved to file-chip arrays
  'fullName'
>;

export type NullableIdKey = keyof Pick<FilterState, 'listId'>;

/**
 * Manages the filter state for the leads search page.
 * Multi-select fields hold arrays of FilterOption; boolean fields control presence and degree filters.
 */
export function useFilterState() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_STATE);

  const setMulti = useCallback((key: MultiKey, value: FilterOption[]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const setBool = useCallback((key: BoolKey, value: boolean) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const setString = useCallback((key: StringKey, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const setNullableId = useCallback((key: NullableIdKey, id: number | null) => {
    setFilters(prev => ({ ...prev, [key]: id, page: 1 }));
  }, []);

  const setListId = useCallback((id: number | null) => {
    setFilters(prev => ({ ...prev, listId: id, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_STATE);
  }, []);

  const hasActiveFilters = (
    filters.jobTitles.length > 0
    || filters.locations.length > 0
    || filters.selectedCountries.length > 0
    || filters.industries.length > 0
    || filters.technologies.length > 0
    || filters.skills.length > 0
    || filters.managementLevels.length > 0
    || filters.departments.length > 0
    || filters.companySizes.length > 0
    || filters.companies.length > 0
    || filters.educationMajors.length > 0
    || filters.listId !== null
    || !filters.hasWorkEmail
    || !filters.hasPersonalEmail
    || filters.hasPhone
    || filters.haveBachelor
    || filters.haveMaster
    || filters.haveAssociate
    || filters.haveDoctorate
    || filters.fullName !== ''
    // File-chip arrays: active when at least one file is selected
    || filters.includeEmailFiles.length > 0
    || filters.excludeEmailFiles.length > 0
    || filters.includeLinkedInFiles.length > 0
    || filters.excludeLinkedInFiles.length > 0
  );

  return {
    filters,
    setMulti,
    setBool,
    setString,
    setNullableId,
    setListId,
    setPage,
    resetFilters,
    hasActiveFilters,
  };
}
