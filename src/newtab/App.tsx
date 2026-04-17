import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Input, SketchProvider, Spinner } from "sketchbook-ui";
import styles from "./App.module.css";
import type { DomainGroupData, ManagedTab } from "./types";
import DomainGroup from "./components/DomainGroup";
import {
  collectDuplicateUrlTabIds,
  groupTabsByDomain,
  shouldSkipTabInManager,
  tabToManagedTab,
} from "../utils/tabs";

const SKETCH_ZH_FONT =
  '"ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif';

const MONO_COLORS = {
  bg: "#ffffff",
  bgOverlay: "#ffffff",
  stroke: "#000000",
  text: "#000000",
} as const;

const MONO_INPUT_COLORS = {
  ...MONO_COLORS,
  label: "#000000",
} as const;

function isChromeApisReady(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.tabs);
}

export default function App() {
  const [tabs, setTabs] = useState<ManagedTab[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
      console.error("查询标签页失败", error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const allGroups = useMemo<DomainGroupData[]>(
    () => groupTabsByDomain(tabs),
    [tabs],
  );

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return allGroups;
    }

    return allGroups.filter((group) =>
      group.domain.toLowerCase().includes(keyword),
    );
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
        console.error("关闭标签页失败", error);
      } finally {
        setBusy(false);
      }
    },
    [refreshTabs],
  );

  const handleActivateTab = useCallback(async (tab: ManagedTab) => {
    try {
      await chrome.tabs.update(tab.tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    } catch (error) {
      console.error("激活标签页失败", error);
    }
  }, []);

  const handleCloseTab = useCallback(
    async (tab: ManagedTab) => {
      setBusy(true);
      try {
        await chrome.tabs.remove(tab.tabId);
        await refreshTabs();
      } catch (error) {
        console.error("关闭单个标签页失败", error);
      } finally {
        setBusy(false);
      }
    },
    [refreshTabs],
  );

  const handleCloseDomainTabs = useCallback(
    async (group: DomainGroupData) => {
      await runTabRemoval(
        group.tabs.map((tab) => tab.tabId),
        `是否关闭 ${group.domain} 下的 ${group.count} 个标签页？`,
        `已关闭 ${group.domain} 下的标签页`,
      );
    },
    [runTabRemoval],
  );

  const closeDuplicateUrls = useCallback(async () => {
    const tabIds = collectDuplicateUrlTabIds(tabs);
    if (!tabIds.length) {
      window.alert("当前没有重复地址标签。");
      return;
    }

    await runTabRemoval(
      tabIds,
      `是否关闭 ${tabIds.length} 个重复地址标签？`,
      "已关闭重复地址标签",
    );
  }, [runTabRemoval, tabs]);

  const restoreLatestClosed = useCallback(async () => {
    if (!chrome.sessions) {
      window.alert("当前浏览器不支持会话恢复接口。");
      return;
    }

    setBusy(true);
    try {
      const sessions = await chrome.sessions.getRecentlyClosed({
        maxResults: 1,
      });
      const latest = sessions[0];
      const sessionId = latest?.tab?.sessionId ?? latest?.window?.sessionId;

      if (!sessionId) {
        window.alert("没有可恢复的最近关闭记录。");
        return;
      }

      await chrome.sessions.restore(sessionId);
      await refreshTabs();
    } catch (error) {
      console.error("恢复最近关闭失败", error);
    } finally {
      setBusy(false);
    }
  }, [refreshTabs]);

  if (!isChromeApisReady()) {
    return (
      <SketchProvider>
        <div className={styles.centerTip}>
          请在 Chrome 扩展环境中打开本页面，才能读取和管理全部标签页。
        </div>
      </SketchProvider>
    );
  }

  return (
    <SketchProvider>
      <main className={styles.page}>
        <div className={styles.stickyHeader}>
          <section className={styles.hero}>
            <div className={styles.brand}>
              <div>
                <h1>bowl tab manager</h1>
              </div>
            </div>
            {/* <div className={styles.heroMeta}></div> */}
            <Badge
              className={styles.metaPill}
              typography={{ fontFamily: SKETCH_ZH_FONT }}
              colors={MONO_COLORS}
              size="lg"
            >
              <div className={styles.metaText}>
                {busy ? "操作执行中" : "实时同步已开启"}
              </div>
            </Badge>
          </section>

          <header className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Input
                className={styles.searchInput}
                placeholder="按域名过滤，例如 github.com"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                typography={{ fontFamily: SKETCH_ZH_FONT }}
                colors={MONO_INPUT_COLORS}
              />
            </div>

            <div className={styles.stats}>
              <Badge className={styles.statCard}>
                <span>总标签:</span>
                <strong>{totalTabs}</strong>
              </Badge>
              <Badge className={styles.statCard}>
                <span>域名组:</span>
                <strong>{totalGroups}</strong>
              </Badge>
            </div>

            <div className={styles.actions}>
              <Button
                type="button"
                size="sm"
                onClick={closeDuplicateUrls}
                disabled={busy}
                typography={{ fontFamily: SKETCH_ZH_FONT }}
                colors={MONO_COLORS}
              >
                关闭重复地址
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={restoreLatestClosed}
                disabled={busy}
                typography={{ fontFamily: SKETCH_ZH_FONT }}
                colors={MONO_COLORS}
              >
                恢复最近关闭
              </Button>
            </div>
          </header>
        </div>

        {loading ? (
          <div className={styles.centerTip}>
            <div className={styles.loadingWrap}>
              <Spinner
                size="md"
                variant="spiral"
                colors={{ stroke: "#000000" }}
              />
              <span>正在加载标签页...</span>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className={styles.centerTip}>
            没有匹配域名组，试试清空搜索条件。
          </div>
        ) : (
          <section className={styles.groupList}>
            {filteredGroups.map((group) => (
              <DomainGroup
                key={group.domain}
                group={group}
                onCloseAll={handleCloseDomainTabs}
                onActivateTab={handleActivateTab}
                onCloseTab={handleCloseTab}
              />
            ))}
          </section>
        )}
      </main>
    </SketchProvider>
  );
}
