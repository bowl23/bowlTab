export type ResourceLevel = 'Low' | 'Medium' | 'High';

export interface ManagedTab {
  tabId: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl?: string;
  lastAccessed: number | null;
  domain: string;
  host: string;
  isActive: boolean;
  audible: boolean;
  pinned: boolean;
  discarded: boolean;
  resourceScore: number;
  resourceLevel: ResourceLevel;
  idleHours: number;
  isHighResourceIdle: boolean;
  index: number;
}

export interface DomainGroupData {
  domain: string;
  tabs: ManagedTab[];
  count: number;
  pinnedCount: number;
  resourcePressureScore: number;
  resourcePressureLevel: ResourceLevel;
  highResourceIdleCount: number;
}
