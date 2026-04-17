import { Badge } from 'sketchbook-ui';
import styles from './TabItem.module.css';
import type { ManagedTab } from '../types';

const SKETCH_ZH_FONT =
  '"ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif';

const MONO_COLORS = {
  bg: '#ffffff',
  bgOverlay: '#ffffff',
  stroke: '#000000',
  text: '#000000',
} as const;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

interface TabItemProps {
  tab: ManagedTab;
  onActivate: (tab: ManagedTab) => void;
  onClose: (tab: ManagedTab) => void;
}

function getUrlLabel(url: string): string {
  if (!url) {
    return '空白页';
  }

  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function formatLastViewed(lastAccessed: number | null): string {
  if (!lastAccessed) {
    return '上次查看：未知';
  }

  const diff = Date.now() - lastAccessed;
  if (diff < 60 * 1000) {
    return '上次查看：刚刚';
  }

  if (diff < 60 * 60 * 1000) {
    return `上次查看：${Math.floor(diff / (60 * 1000))} 分钟前`;
  }

  if (diff < 24 * 60 * 60 * 1000) {
    return `上次查看：${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  }

  return `上次查看：${DATE_TIME_FORMATTER.format(lastAccessed)}`;
}

function getResourceLabel(tab: ManagedTab): string {
  if (tab.resourceLevel === 'High') {
    return `高资源占用 ${tab.resourceScore}`;
  }

  if (tab.resourceLevel === 'Medium') {
    return `中资源占用 ${tab.resourceScore}`;
  }

  return `低资源占用 ${tab.resourceScore}`;
}

export default function TabItem({ tab, onActivate, onClose }: TabItemProps) {
  const fallback = tab.domain.charAt(0).toUpperCase();

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.activateButton}
        onClick={() => onActivate(tab)}
      >
        {tab.favIconUrl ? (
          <img className={styles.favicon} src={tab.favIconUrl} alt="网站图标" />
        ) : (
          <span className={styles.fallbackIcon}>{fallback}</span>
        )}

        <span className={styles.textWrap}>
          <span className={styles.title}>{tab.title}</span>
          <span className={styles.meta}>
            {getUrlLabel(tab.url)} | 窗口 #{tab.windowId} | 标签 #{tab.tabId}
          </span>
          <span className={styles.lastViewed}>{formatLastViewed(tab.lastAccessed)}</span>
          <span className={styles.resourceLine}>
            <span
              className={`${styles.resourcePill} ${
                tab.resourceLevel === 'High'
                  ? styles.resourceHigh
                  : tab.resourceLevel === 'Medium'
                    ? styles.resourceMedium
                    : styles.resourceLow
              }`}
            >
              {getResourceLabel(tab)}
            </span>
            <span className={styles.idleText}>闲置 {tab.idleHours} 小时</span>
            {tab.isHighResourceIdle ? (
              <span className={styles.highIdleTag}>高资源闲置</span>
            ) : null}
          </span>
        </span>

        <span className={styles.badges}>
          {tab.pinned ? (
            <Badge
              size="sm"
              className={styles.pin}
              typography={{ fontFamily: SKETCH_ZH_FONT }}
              colors={MONO_COLORS}
            >
              置顶
            </Badge>
          ) : null}
          {tab.audible ? (
            <Badge
              size="sm"
              className={styles.audible}
              typography={{ fontFamily: SKETCH_ZH_FONT }}
              colors={MONO_COLORS}
            >
              播放中
            </Badge>
          ) : null}
          {tab.discarded ? (
            <Badge
              size="sm"
              className={styles.discarded}
              typography={{ fontFamily: SKETCH_ZH_FONT }}
              colors={MONO_COLORS}
            >
              已休眠
            </Badge>
          ) : null}
          {tab.isActive ? (
            <Badge
              size="sm"
              className={styles.active}
              typography={{ fontFamily: SKETCH_ZH_FONT }}
              colors={MONO_COLORS}
            >
              当前
            </Badge>
          ) : null}
        </span>
      </button>

      <button
        type="button"
        className={styles.closeButton}
        onClick={() => onClose(tab)}
        aria-label={`关闭标签页 ${tab.tabId}`}
      >
        X
      </button>
    </div>
  );
}
