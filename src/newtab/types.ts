export interface ManagedTab {
  tabId: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl?: string;
  domain: string;
  host: string;
  isActive: boolean;
  pinned: boolean;
  discarded: boolean;
  index: number;
}

export interface DomainGroupData {
  domain: string;
  tabs: ManagedTab[];
  count: number;
  pinnedCount: number;
}
