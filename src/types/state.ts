export interface AuthState {
  battletag: string;
  token: string;
}

export interface ServerProgress {
  attunements: AttunementProgress;
  bis?: BisProgress;
}

export interface AttunementProgress {
  [stepId: string]: boolean;
}

export interface BisProgress {
  [itemKey: string]: boolean;
}

export interface RepProgress {
  [factionId: string]: RepStanding;
}

export type RepStanding = 'Neutral' | 'Friendly' | 'Honored' | 'Revered' | 'Exalted';

export interface LockoutProgress {
  [raidId: string]: LockoutEntry;
}

export interface LockoutEntry {
  locked: boolean;
  timestamp: number;
}

export interface GuildProgress {
  [bossId: string]: number;
}

export interface CharacterGear {
  name: string;
  realm?: string;
  region?: string;
  gear: GearItem[];
  source: 'blizzard' | 'manual';
}

export interface GearItem {
  id?: number;
  name: string;
  slot?: string;
  quality?: string;
  itemLevel?: number;
}

export const STORAGE_KEYS = {
  AUTH: 'tbctxt_auth',
  ATTUNEMENT: 'tbctxt_attunements',
  BIS: 'tbctxt_bis',
  REP: 'tbctxt_reputation',
  LOCKOUT: 'tbctxt_lockouts',
  GUILD_PROGRESS: 'tbctxt_guild_progress'
} as const;
