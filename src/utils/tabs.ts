import { getHostname, getMainDomain } from './domain';
import type { DomainGroupData, ManagedTab, ResourceLevel } from '../newtab/types';

const URL_PROTOCOL_PREFIX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const VIDEO_DOMAIN_KEYWORDS = [
  'youtube.com',
  'youtu.be',
  'netflix.com',
  'bilibili.com',
  'iqiyi.com',
  'youku.com',
  'v.qq.com',
  'twitch.tv',
  'douyu.com',
  'huya.com',
];
const HEAVY_APP_KEYWORDS = [
  'figma',
  'notion',
  'canva',
  'miro',
  'docs',
  'sheets',
  'slides',
  'dashboard',
  'studio',
  'ide',
  'editor',
  'chat',
  'mail',
  'maps',
  'webgl',
  'game',
  '3d',
  'canvas',
];

const HIGH_RESOURCE_IDLE_HOURS = 12;

export type GroupSortMode = 'default' | 'lastViewed' | 'resource';

export function normalizeUrlForDedup(url: string): string {
  return url.trim();
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getLastAccessed(tab: chrome.tabs.Tab): number | null {
  const value = (tab as { lastAccessed?: number }).lastAccessed;
  return typeof value === 'number' ? value : null;
}

function getIdleHours(lastAccessed: number | null): number {
  if (!lastAccessed) {
    return 0;
  }

  const diffMs = Date.now() - lastAccessed;
  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / (1000 * 60 * 60));
}

function scoreByIdleHours(idleHours: number): number {
  if (idleHours >= 24) {
    return 20;
  }

  if (idleHours >= 12) {
    return 12;
  }

  if (idleHours >= 6) {
    return 6;
  }

  return 0;
}

function scoreToResourceLevel(score: number): ResourceLevel {
  if (score <= 30) {
    return 'Low';
  }

  if (score <= 70) {
    return 'Medium';
  }

  return 'High';
}

function isVideoLikeTab(url: string, title: string): boolean {
  const text = `${url} ${title}`.toLowerCase();
  return VIDEO_DOMAIN_KEYWORDS.some((keyword) => text.includes(keyword));
}

function hasHeavyWorkloadSignal(url: string, title: string): boolean {
  const text = `${url} ${title}`.toLowerCase();
  return HEAVY_APP_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function estimateTabResource(tab: chrome.tabs.Tab, lastAccessed: number | null): {
  score: number;
  level: ResourceLevel;
  idleHours: number;
  isHighResourceIdle: boolean;
} {
  const url = tab.url ?? '';
  const title = tab.title ?? '';
  const idleHours = getIdleHours(lastAccessed);

  let score = 20;

  if (isVideoLikeTab(url, title)) {
    score += 25;
  }

  // 无法读取真实 JS heap，使用重前端/重交互页面特征作为近似代理。
  if (hasHeavyWorkloadSignal(url, title)) {
    score += 18;
  }

  if (tab.active) {
    score += 20;
  }

  if (tab.audible) {
    score += 18;
  }

  if (tab.discarded) {
    score -= 45;
  }

  if (tab.pinned) {
    score -= 12;
  }

  score += scoreByIdleHours(idleHours);

  const normalizedScore = clampScore(score);
  const level = scoreToResourceLevel(normalizedScore);
  const isHighResourceIdle =
    level === 'High' &&
    idleHours >= HIGH_RESOURCE_IDLE_HOURS &&
    !tab.active &&
    !tab.audible &&
    !tab.pinned &&
    !tab.discarded;

  return {
    score: normalizedScore,
    level,
    idleHours,
    isHighResourceIdle,
  };
}

export function tabToManagedTab(tab: chrome.tabs.Tab): ManagedTab | null {
  if (typeof tab.id !== 'number') {
    return null;
  }

  const url = tab.url ?? '';
  const domain = getMainDomain(url);
  const lastAccessed = getLastAccessed(tab);
  const resource = estimateTabResource(tab, lastAccessed);

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
    audible: Boolean(tab.audible),
    pinned: Boolean(tab.pinned),
    discarded: Boolean(tab.discarded),
    resourceScore: resource.score,
    resourceLevel: resource.level,
    idleHours: resource.idleHours,
    isHighResourceIdle: resource.isHighResourceIdle,
    index: tab.index ?? 0,
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

function getLastAccessedValue(tab: ManagedTab): number {
  return tab.lastAccessed ?? 0;
}

function compareTabsByDefault(a: ManagedTab, b: ManagedTab): number {
  if (a.pinned !== b.pinned) {
    return Number(b.pinned) - Number(a.pinned);
  }

  if (a.isActive !== b.isActive) {
    return Number(b.isActive) - Number(a.isActive);
  }

  return a.index - b.index;
}

function compareTabsByLastViewed(a: ManagedTab, b: ManagedTab): number {
  const lastViewedDiff = getLastAccessedValue(b) - getLastAccessedValue(a);
  if (lastViewedDiff !== 0) {
    return lastViewedDiff;
  }

  return compareTabsByDefault(a, b);
}

function compareTabsByResource(a: ManagedTab, b: ManagedTab): number {
  if (b.resourceScore !== a.resourceScore) {
    return b.resourceScore - a.resourceScore;
  }

  if (a.isHighResourceIdle !== b.isHighResourceIdle) {
    return Number(b.isHighResourceIdle) - Number(a.isHighResourceIdle);
  }

  if (b.idleHours !== a.idleHours) {
    return b.idleHours - a.idleHours;
  }

  return compareTabsByLastViewed(a, b);
}

function getDomainPressureScore(tabs: ManagedTab[]): number {
  if (!tabs.length) {
    return 0;
  }

  const totalScore = tabs.reduce((sum, tab) => sum + tab.resourceScore, 0);
  return clampScore(totalScore / tabs.length);
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
        if (sortMode === 'resource') {
          return compareTabsByResource(a, b);
        }

        if (sortMode === 'lastViewed') {
          return compareTabsByLastViewed(a, b);
        }

        return compareTabsByDefault(a, b);
      });

      const resourcePressureScore = getDomainPressureScore(sortedTabs);

      return {
        domain,
        tabs: sortedTabs,
        count: sortedTabs.length,
        pinnedCount: sortedTabs.filter((tab) => tab.pinned).length,
        resourcePressureScore,
        resourcePressureLevel: scoreToResourceLevel(resourcePressureScore),
        highResourceIdleCount: sortedTabs.filter((tab) => tab.isHighResourceIdle).length,
      };
    })
    .sort((a, b) => {
      if (sortMode === 'resource') {
        if (b.resourcePressureScore !== a.resourcePressureScore) {
          return b.resourcePressureScore - a.resourcePressureScore;
        }

        if (b.highResourceIdleCount !== a.highResourceIdleCount) {
          return b.highResourceIdleCount - a.highResourceIdleCount;
        }
      }

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

export function collectHighResourceIdleTabIds(tabs: ManagedTab[]): number[] {
  return tabs.filter((tab) => tab.isHighResourceIdle).map((tab) => tab.tabId);
}
