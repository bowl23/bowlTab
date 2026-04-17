import { Badge, Button, Card, Divider } from 'sketchbook-ui';
import styles from './DomainGroup.module.css';
import TabItem from './TabItem';
import type { DomainGroupData, ManagedTab, ResourceLevel } from '../types';
import { formatDomainName } from '../../utils/domain';

const SKETCH_ZH_FONT =
  '"ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif';

const MONO_COLORS = {
  bg: '#ffffff',
  bgOverlay: '#ffffff',
  stroke: '#000000',
  text: '#000000',
} as const;

interface DomainGroupProps {
  group: DomainGroupData;
  onCloseAll: (group: DomainGroupData) => void;
  onActivateTab: (tab: ManagedTab) => void;
  onCloseTab: (tab: ManagedTab) => void;
}

function getPressureLabel(level: ResourceLevel): string {
  if (level === 'High') {
    return '资源压力：高';
  }

  if (level === 'Medium') {
    return '资源压力：中';
  }

  return '资源压力：低';
}

export default function DomainGroup({
  group,
  onCloseAll,
  onActivateTab,
  onCloseTab,
}: DomainGroupProps) {
  return (
    <Card
      className={styles.card}
      variant="paper"
      typography={{ fontFamily: SKETCH_ZH_FONT }}
      colors={MONO_COLORS}
    >
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <h2>{formatDomainName(group.domain)}</h2>
          <span className={styles.domain}>{group.domain}</span>
          <Badge
            className={styles.countBadge}
            typography={{ fontFamily: SKETCH_ZH_FONT }}
            colors={MONO_COLORS}
          >
            {group.count}
          </Badge>
          {group.pinnedCount > 0 ? (
            <Badge
              className={styles.pinned}
              typography={{ fontFamily: SKETCH_ZH_FONT }}
              colors={MONO_COLORS}
            >
              置顶 {group.pinnedCount}
            </Badge>
          ) : null}
          <Badge
            className={`${styles.pressureBadge} ${
              group.resourcePressureLevel === 'High'
                ? styles.pressureHigh
                : group.resourcePressureLevel === 'Medium'
                  ? styles.pressureMedium
                  : styles.pressureLow
            }`}
            typography={{ fontFamily: SKETCH_ZH_FONT }}
            colors={MONO_COLORS}
          >
            {getPressureLabel(group.resourcePressureLevel)}（{group.resourcePressureScore}）
          </Badge>
          {group.highResourceIdleCount > 0 ? (
            <Badge
              className={styles.highIdleBadge}
              typography={{ fontFamily: SKETCH_ZH_FONT }}
              colors={MONO_COLORS}
            >
              高资源闲置 {group.highResourceIdleCount}
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => onCloseAll(group)}
          typography={{ fontFamily: SKETCH_ZH_FONT }}
          colors={MONO_COLORS}
        >
          关闭该站全部
        </Button>
      </header>

      <Divider variant="dashed" color="#000000" className={styles.headerDivider} />

      <div className={styles.list}>
        {group.tabs.map((tab) => (
          <TabItem
            key={tab.tabId}
            tab={tab}
            onActivate={onActivateTab}
            onClose={onCloseTab}
          />
        ))}
      </div>
    </Card>
  );
}
