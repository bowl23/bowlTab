import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './App.module.css';
import type { DomainGroupData, ManagedTab } from './types';
import DomainGroup from './components/DomainGroup';
import {
  collectBlankTabIds,
  collectDuplicateUrlTabIds,
  collectRepeatedDomainExtraTabIds,
  groupTabsByDomain,
  shouldSkipTabInManager,
  tabToManagedTab
} from '../utils/tabs';

const THEME_KEY = 'bowl-tab-manager-theme';

type ThemeMode = 'light' | 'dark';

function isChromeApisReady(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.tabs);
}

export default function App() {
  const [tabs, setTabs] = useState<ManagedTab[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');

  const refreshTabs = useCallback(async () => {
    if (!isChromeApisReady()) {
      return;
    }

    try {
      const queriedTabs = await chrome.tabs.query({});
      const parsedTabs = queriedTabs
        .filter((tab) => !shouldSkipTabInManager(tab))
        .map(tabToManagedTab)
        .filter((tab): tab is ManagedTab => tab !== null);

      setTabs(parsedTabs);
    } catch (error) {
      console.error('Failed to query tabs', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    void refreshTabs();
  }, [refreshTabs]);

  useEffect(() => {
    if (!isChromeApisReady()) {
      return;
    }

    let timer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void refreshTabs();
      }, 120);
    };

    const onCreated = () => scheduleRefresh();
    const onRemoved = () => scheduleRefresh();
    const onUpdated = () => scheduleRefresh();
    const onActivated = () => scheduleRefresh();

    chrome.tabs.onCreated.addListener(onCreated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onActivated.addListener(onActivated);

    return () => {
      chrome.tabs.onCreated.removeListener(onCreated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onActivated.removeListener(onActivated);
      window.clearTimeout(timer);
    };
  }, [refreshTabs]);

  const allGroups = useMemo<DomainGroupData[]>(() => groupTabsByDomain(tabs), [tabs]);

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return allGroups;
    }

    return allGroups.filter((group) => group.domain.toLowerCase().includes(keyword));
  }, [allGroups, search]);

  const totalTabs = tabs.length;
  const totalGroups = allGroups.length;

  const runTabRemoval = useCallback(
    async (tabIds: number[], confirmText: string, doneText: string) => {
      if (!tabIds.length) {
        return;
      }

      if (!window.confirm(confirmText)) {
        return;
      }

      setBusy(true);
      try {
        await chrome.tabs.remove(tabIds);
        await refreshTabs();
        console.info(doneText);
      } catch (error) {
        console.error('Failed to remove tabs', error);
      } finally {
        setBusy(false);
      }
    },
    [refreshTabs]
  );

  const handleActivateTab = useCallback(async (tab: ManagedTab) => {
    try {
      await chrome.tabs.update(tab.tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    } catch (error) {
      console.error('Failed to activate tab', error);
    }
  }, []);

  const handleCloseDomainTabs = useCallback(
    async (group: DomainGroupData) => {
      await runTabRemoval(
        group.tabs.map((tab) => tab.tabId),
        `是否关闭 ${group.domain} 下的 ${group.count} 个标签页？`,
        `Closed tabs for ${group.domain}`
      );
    },
    [runTabRemoval]
  );

  const closeBlankTabs = useCallback(async () => {
    const tabIds = collectBlankTabIds(tabs);
    if (!tabIds.length) {
      window.alert('当前没有空白页标签。');
      return;
    }

    await runTabRemoval(tabIds, `是否关闭 ${tabIds.length} 个空白页标签？`, 'Closed blank tabs');
  }, [runTabRemoval, tabs]);

  const closeDuplicateUrls = useCallback(async () => {
    const tabIds = collectDuplicateUrlTabIds(tabs);
    if (!tabIds.length) {
      window.alert('当前没有重复 URL 标签。');
      return;
    }

    await runTabRemoval(tabIds, `是否关闭 ${tabIds.length} 个重复 URL 标签？`, 'Closed duplicate URL tabs');
  }, [runTabRemoval, tabs]);

  const closeRepeatedDomainExtras = useCallback(async () => {
    const tabIds = collectRepeatedDomainExtraTabIds(allGroups);
    if (!tabIds.length) {
      window.alert('当前没有重复站点需要清理。');
      return;
    }

    await runTabRemoval(tabIds, `是否关闭 ${tabIds.length} 个重复站点的多余标签？`, 'Closed repeated domain extra tabs');
  }, [allGroups, runTabRemoval]);

  const restoreLatestClosed = useCallback(async () => {
    if (!chrome.sessions) {
      window.alert('当前浏览器不支持 sessions API。');
      return;
    }

    setBusy(true);
    try {
      const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
      const latest = sessions[0];
      const sessionId = latest?.tab?.sessionId ?? latest?.window?.sessionId;

      if (!sessionId) {
        window.alert('没有可恢复的最近关闭记录。');
        return;
      }

      await chrome.sessions.restore(sessionId);
      await refreshTabs();
    } catch (error) {
      console.error('Failed to restore session', error);
    } finally {
      setBusy(false);
    }
  }, [refreshTabs]);

  if (!isChromeApisReady()) {
    return (
      <div className={styles.centerTip}>
        请在 Chrome 扩展环境中打开本页面，才能读取和管理全部标签页。
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            placeholder="按域名过滤，例如 github.com"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className={styles.stats}>
          <span>总标签: {totalTabs}</span>
          <span>域名组: {totalGroups}</span>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={closeRepeatedDomainExtras} disabled={busy}>
            关闭重复站点
          </button>
          <button type="button" onClick={closeDuplicateUrls} disabled={busy}>
            关闭重复 URL
          </button>
          <button type="button" onClick={closeBlankTabs} disabled={busy}>
            关闭空白页
          </button>
          <button type="button" onClick={restoreLatestClosed} disabled={busy}>
            恢复最近关闭
          </button>
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            disabled={busy}
          >
            {theme === 'dark' ? '浅色模式' : '深色模式'}
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.centerTip}>正在加载标签页...</div>
      ) : filteredGroups.length === 0 ? (
        <div className={styles.centerTip}>没有匹配域名组，试试清空搜索条件。</div>
      ) : (
        <section className={styles.groupList}>
          {filteredGroups.map((group) => (
            <DomainGroup
              key={group.domain}
              group={group}
              onCloseAll={handleCloseDomainTabs}
              onActivateTab={handleActivateTab}
            />
          ))}
        </section>
      )}
    </main>
  );
}
