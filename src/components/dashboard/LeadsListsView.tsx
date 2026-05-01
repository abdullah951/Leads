'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/constants/apiRoutes';
import { CLIENT_ROUTES } from '@/constants/clientRoutes';
import { Spinner } from './Spinner';

type UserList = {
  id: number;
  label: string;
  count: number;
  createdAt: string;
};

type ListLead = {
  id: number;
  fullName: string;
  jobTitle: string | null;
  companyName: string | null;
  location: string | null;
};

/**
 * Lists management page: view all lists, manage leads within each list.
 */
export function LeadsListsView() {
  const t = useTranslations('LeadsListsView');
  // Router used by empty-state CTAs to navigate to dashboard / upload pages
  const router = useRouter();
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedList, setSelectedList] = useState<UserList | null>(null);
  const [leads, setLeads] = useState<ListLead[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  function loadLists() {
    setLoadingLists(true);
    fetch(API_ROUTES.lists.all, { method: 'POST', body: '{}' })
      .then(r => r.json())
      .then((data: UserList[]) => setLists(data))
      .catch(() => {})
      .finally(() => setLoadingLists(false));
  }

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (!selectedList) return;
    setLoadingLeads(true);
    fetch(API_ROUTES.leads.search, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId: selectedList.id, page: 1, pageSize: 100 }),
    })
      .then(r => r.json())
      .then((data: { leads: ListLead[] }) => setLeads(data.leads))
      .catch(() => {})
      .finally(() => setLoadingLeads(false));
  }, [selectedList]);

  async function createList() {
    if (!newListName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(API_ROUTES.lists.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName: newListName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message ?? t('create_error'));
        return;
      }
      setNewListName('');
      loadLists();
    } catch {
      setError(t('create_error'));
    } finally {
      setCreating(false);
    }
  }

  async function renameList() {
    if (!renameId || !renameName.trim()) return;
    try {
      const res = await fetch(API_ROUTES.lists.rename, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: renameId, name: renameName.trim() }),
      });
      if (res.ok) {
        setRenameId(null);
        loadLists();
      }
    } catch {}
  }

  async function deleteList(id: number) {
    if (!window.confirm(t('delete_confirm'))) return;
    try {
      await fetch(API_ROUTES.lists.delete, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: id }),
      });
      if (selectedList?.id === id) setSelectedList(null);
      loadLists();
    } catch {}
  }

  async function removeLead(leadId: number) {
    if (!selectedList) return;
    try {
      await fetch(API_ROUTES.lists.removeLeads, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: selectedList.id, personIds: [leadId] }),
      });
      setLeads(prev => prev.filter(l => l.id !== leadId));
    } catch {}
  }

  return (
    // Layout wrapper already applies pl-[60px] pt-14 — no extra offset needed here
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex gap-6">
          {/* Left: list of user lists */}
          <div className="w-64 shrink-0">
            <h1 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">{t('title')}</h1>

            {/* Create new list */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder={t('new_list_placeholder')}
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                onKeyDown={e => e.key === 'Enter' && createList()}
              />
              <button
                type="button"
                disabled={creating || !newListName.trim()}
                className="flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-60"
                onClick={createList}
              >
                {creating ? <Spinner size={13} /> : '+'}
              </button>
            </div>

            {error && <p className="mb-2 text-xs text-[var(--color-error)]">{error}</p>}

            {loadingLists
              ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-10 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)]" />
                    ))}
                  </div>
                )
              : lists.length === 0
                ? (
                    <p className="text-sm text-[var(--color-text-muted)]">{t('no_lists')}</p>
                  )
                : (
                    <ul className="space-y-1">
                      {lists.map(list => (
                        <li key={list.id}>
                          {renameId === list.id
                            ? (
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={renameName}
                                    onChange={e => setRenameName(e.target.value)}
                                    className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-brand)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:outline-none"
                                    onKeyDown={e => e.key === 'Enter' && renameList()}
                                    autoFocus
                                  />
                                  <button type="button" onClick={renameList} className="text-xs text-[var(--color-brand)]">{t('save')}</button>
                                  <button type="button" onClick={() => setRenameId(null)} className="text-xs text-[var(--color-text-muted)]">{t('cancel')}</button>
                                </div>
                              )
                            : (
                                <div
                                  className={[
                                    'group flex cursor-pointer items-center justify-between rounded-[var(--radius-md)] px-3 py-2',
                                    selectedList?.id === list.id
                                      ? 'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]'
                                      : 'hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]',
                                  ].join(' ')}
                                  onClick={() => setSelectedList(list)}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{list.label}</p>
                                    <p className="text-xs text-[var(--color-text-muted)]">{t('lead_count', { count: list.count })}</p>
                                  </div>
                                  <div className="ml-2 hidden shrink-0 gap-1 group-hover:flex">
                                    <button
                                      type="button"
                                      title={t('rename_title')}
                                      onClick={e => { e.stopPropagation(); setRenameId(list.id); setRenameName(list.label); }}
                                      className="rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    </button>
                                    <button
                                      type="button"
                                      title={t('delete_title')}
                                      onClick={e => { e.stopPropagation(); deleteList(list.id); }}
                                      className="rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                        </li>
                      ))}
                    </ul>
                  )}
          </div>

          {/* Right: leads in selected list */}
          <div className="flex-1">
            {!selectedList
              ? (
                  <div className="flex h-64 items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)]">
                    <p className="text-sm text-[var(--color-text-muted)]">{t('select_list_hint')}</p>
                  </div>
                )
              : (
                  <div>
                    <h2 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
                      {selectedList.label}
                      <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                        ({selectedList.count})
                      </span>
                    </h2>

                    {loadingLeads
                      ? (
                          <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)]" />
                            ))}
                          </div>
                        )
                      : leads.length === 0
                        ? (
                            /* ── Empty-list state ───────────────────────────────────────────────
                               Shown when a list is selected but contains 0 leads.
                               Provides two CTA buttons to help the user populate the list:
                                 1. Find leads → dashboard search (list pre-selected)
                                 2. Import leads → uploaded-files page                          */
                            <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] px-8 py-16 text-center">

                              {/* Illustration: stylised empty folder SVG */}
                              <svg
                                width="64"
                                height="64"
                                viewBox="0 0 64 64"
                                fill="none"
                                className="mb-5 opacity-30"
                                aria-hidden="true"
                              >
                                {/* Folder back panel */}
                                <path
                                  d="M4 20C4 17.8 5.8 16 8 16H26L30 20H56C58.2 20 60 21.8 60 24V52C60 54.2 58.2 56 56 56H8C5.8 56 4 54.2 4 52V20Z"
                                  fill="currentColor"
                                  className="text-[var(--color-text-muted)]"
                                />
                                {/* Magnifying glass overlay — signals "search / find" */}
                                <circle
                                  cx="36"
                                  cy="38"
                                  r="10"
                                  stroke="white"
                                  strokeWidth="3"
                                  fill="none"
                                />
                                <line
                                  x1="43"
                                  y1="45"
                                  x2="50"
                                  y2="52"
                                  stroke="white"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                              </svg>

                              {/* Heading — bold, slightly larger than body */}
                              <p className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
                                {t('empty_list_heading')}
                              </p>

                              {/* Context message with the list name highlighted */}
                              <p className="mb-6 text-xs text-[var(--color-text-muted)]">
                                {/* t('empty_list') = "No leads in this list." — kept as-is below */}
                                Your list &ldquo;<span className="font-medium text-[var(--color-text-secondary)]">{selectedList.label}</span>&rdquo; is currently empty.
                              </p>

                              {/* ── Two CTA buttons ──────────────────────────────────────────── */}
                              <div className="flex flex-col gap-3 sm:flex-row">

                                {/* Primary: find leads — navigates to dashboard */}
                                <button
                                  type="button"
                                  onClick={() => router.push(CLIENT_ROUTES.dashboard)}
                                  className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] transition-colors duration-150"
                                >
                                  {t('empty_list_cta_find')}
                                </button>

                                {/* Secondary: import leads — navigates to dashboard page */}
                                <button
                                  type="button"
                                  onClick={() => router.push(CLIENT_ROUTES.dashboard)}
                                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] transition-colors duration-150"
                                >
                                  {t('empty_list_cta_import')}
                                </button>
                              </div>
                            </div>
                          )
                        : (
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
                                  <th className="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{t('col_name')}</th>
                                  <th className="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{t('col_title')}</th>
                                  <th className="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{t('col_company')}</th>
                                  <th className="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{t('col_location')}</th>
                                  <th className="w-16 px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {leads.map(lead => (
                                  <tr key={lead.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)]">
                                    <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">{lead.fullName}</td>
                                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{lead.jobTitle ?? '—'}</td>
                                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{lead.companyName ?? '—'}</td>
                                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{lead.location ?? '—'}</td>
                                    <td className="px-3 py-2">
                                      <button
                                        type="button"
                                        title={t('remove_title')}
                                        onClick={() => removeLead(lead.id)}
                                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                                      >
                                        {t('remove_button')}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                  </div>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}
