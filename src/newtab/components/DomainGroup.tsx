import styles from './DomainGroup.module.css';
import TabItem from './TabItem';
import type { DomainGroupData, ManagedTab } from '../types';
import { formatDomainName } from '../../utils/domain';

interface DomainGroupProps {
  group: DomainGroupData;
  onCloseAll: (group: DomainGroupData) => void;
  onActivateTab: (tab: ManagedTab) => void;
}

export default function DomainGroup({ group, onCloseAll, onActivateTab }: DomainGroupProps) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <h2>{formatDomainName(group.domain)}</h2>
          <span className={styles.domain}>{group.domain}</span>
          <span className={styles.count}>({group.count})</span>
          {group.pinnedCount > 0 ? <span className={styles.pinned}>置顶 {group.pinnedCount}</span> : null}
        </div>

        <button type="button" onClick={() => onCloseAll(group)}>
          关闭全部
        </button>
      </header>

      <div className={styles.list}>
        {group.tabs.map((tab) => (
          <TabItem key={tab.tabId} tab={tab} onActivate={onActivateTab} />
        ))}
      </div>
    </article>
  );
}
