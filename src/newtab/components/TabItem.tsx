import styles from './TabItem.module.css';
import type { ManagedTab } from '../types';

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
        {tab.pinned ? <span className={styles.pin}>PIN</span> : null}
        {tab.isActive ? <span className={styles.active}>ACTIVE</span> : null}
      </span>
    </button>
  );
}
