import { Badge, Button, Card, Divider } from "sketchbook-ui";
import styles from "./DomainGroup.module.css";
import TabItem from "./TabItem";
import type { DomainGroupData, ManagedTab } from "../types";
import { formatDomainName } from "../../utils/domain";

const SKETCH_ZH_FONT =
  '"ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif';

const MONO_COLORS = {
  bg: "#ffffff",
  bgOverlay: "#ffffff",
  stroke: "#000000",
  text: "#000000",
} as const;

interface DomainGroupProps {
  group: DomainGroupData;
  onCloseAll: (group: DomainGroupData) => void;
  onActivateTab: (tab: ManagedTab) => void;
  onCloseTab: (tab: ManagedTab) => void;
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
          <span className={styles.domain}>
            {group.domain === "unknown" ? "未知来源" : group.domain}
          </span>
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
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => onCloseAll(group)}
          typography={{ fontFamily: SKETCH_ZH_FONT }}
          colors={MONO_COLORS}
        >
          关闭全部
        </Button>
      </header>

      <Divider
        variant="dashed"
        color="#000000"
        className={styles.headerDivider}
      />

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
