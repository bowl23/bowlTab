import { Badge } from 'sketchbook-ui';
import styles from './TabItem.module.css';
import type { ManagedTab } from '../types';

const SKETCH_ZH_FONT = '"ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif';

const MONO_COLORS = {
  bg: '#ffffff',
  bgOverlay: '#ffffff',
  stroke: '#000000',
  text: '#000000'
} as const;

interface TabItemProps {
  tab: ManagedTab;
  onActivate: (tab: ManagedTab) => void;
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

export default function TabItem({ tab, onActivate }: TabItemProps) {
  const fallback = tab.domain.charAt(0).toUpperCase();

  return (
    <button type="button" className={styles.row} onClick={() => onActivate(tab)}>
      {tab.favIconUrl ? (
        <img className={styles.favicon} src={tab.favIconUrl} alt="favicon" />
      ) : (
        <span className={styles.fallbackIcon}>{fallback}</span>
      )}

      <span className={styles.textWrap}>
        <span className={styles.title}>{tab.title}</span>
        <span className={styles.meta}>
          {getUrlLabel(tab.url)} · window #{tab.windowId} · tab #{tab.tabId}
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
            PIN
          </Badge>
        ) : null}
        {tab.isActive ? (
          <Badge
            size="sm"
            className={styles.active}
            typography={{ fontFamily: SKETCH_ZH_FONT }}
            colors={MONO_COLORS}
          >
            ACTIVE
          </Badge>
        ) : null}
      </span>
    </button>
  );
}
