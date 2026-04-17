import { getHostname, getMainDomain } from './domain';
import type { DomainGroupData, ManagedTab } from '../newtab/types';

const URL_PROTOCOL_PREFIX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

export function normalizeUrlForDedup(url: string): string {
  return url.trim();
}

export function tabToManagedTab(tab: chrome.tabs.Tab): ManagedTab | null {
  if (typeof tab.id !== 'number') {
    return null;
  }

  const url = tab.url ?? '';
  const domain = getMainDomain(url);
  const lastAccessed =
    typeof (tab as { lastAccessed?: number }).lastAccessed === 'number'
      ? (tab as { lastAccessed?: number }).lastAccessed ?? null
      : null;

  return {
    tabId: tab.id,
    windowId: tab.windowId,
    title: tab.title?.trim() || '(无标题)',
    url,
    favIconUrl: tab.favIconUrl,
    lastAccessed,
    domain,
    host: getHostname(url),
    isActive: Boolean(tab.active),
    pinned: Boolean(tab.pinned),
    discarded: Boolean(tab.discarded),
    index: tab.index ?? 0
  };
}

export function shouldSkipTabInManager(tab: chrome.tabs.Tab): boolean {
  const url = (tab.url ?? '').trim();
  const lowerUrl = url.toLowerCase();
  const domain = getMainDomain(url);

  if (domain === 'unknown') {
    return true;
  }

  if (
    domain === 'newtab' ||
    lowerUrl.startsWith('chrome://newtab') ||
    lowerUrl.startsWith('chrome://new-tab-page/')
  ) {
    return true;
  }

  if (url.startsWith('chrome-extension://')) {
    return url.includes(`${chrome.runtime.id}/newtab.html`);
  }

  return false;
}

export type GroupSortMode = 'default' | 'lastViewed';

function getLastAccessedValue(tab: ManagedTab): number {
  return tab.lastAccessed ?? 0;
}

export function groupTabsByDomain(
  tabs: ManagedTab[],
  sortMode: GroupSortMode = 'default',
): DomainGroupData[] {
  const grouped = new Map<string, ManagedTab[]>();

  for (const tab of tabs) {
    const domainTabs = grouped.get(tab.domain) ?? [];
    domainTabs.push(tab);
    grouped.set(tab.domain, domainTabs);
  }

  return [...grouped.entries()]
    .map(([domain, groupTabs]) => {
      const sortedTabs = [...groupTabs].sort((a, b) => {
        if (sortMode === 'lastViewed') {
          const lastViewedDiff = getLastAccessedValue(b) - getLastAccessedValue(a);
          if (lastViewedDiff !== 0) {
            return lastViewedDiff;
          }
        }

        if (a.pinned !== b.pinned) {
          return Number(b.pinned) - Number(a.pinned);
        }

        if (a.isActive !== b.isActive) {
          return Number(b.isActive) - Number(a.isActive);
        }

        return a.index - b.index;
      });

      return {
        domain,
        tabs: sortedTabs,
        count: sortedTabs.length,
        pinnedCount: sortedTabs.filter((tab) => tab.pinned).length
      };
    })
    .sort((a, b) => {
      if (sortMode === 'lastViewed') {
        const aLatest = Math.max(...a.tabs.map(getLastAccessedValue));
        const bLatest = Math.max(...b.tabs.map(getLastAccessedValue));
        if (bLatest !== aLatest) {
          return bLatest - aLatest;
        }
      }

      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.domain.localeCompare(b.domain);
    });
}

export function collectDuplicateUrlTabIds(tabs: ManagedTab[]): number[] {
  const byUrl = new Map<string, ManagedTab[]>();

  for (const tab of tabs) {
    if (!tab.url || !URL_PROTOCOL_PREFIX.test(tab.url)) {
      continue;
    }

    const key = normalizeUrlForDedup(tab.url);
    const list = byUrl.get(key) ?? [];
    list.push(tab);
    byUrl.set(key, list);
  }

  const removable: number[] = [];

  for (const sameUrlTabs of byUrl.values()) {
    if (sameUrlTabs.length <= 1) {
      continue;
    }

    const sorted = [...sameUrlTabs].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return Number(b.pinned) - Number(a.pinned);
      }

      if (a.isActive !== b.isActive) {
        return Number(b.isActive) - Number(a.isActive);
      }

      return a.index - b.index;
    });

    removable.push(...sorted.slice(1).map((tab) => tab.tabId));
  }

  return removable;
}
