export type ItemQuality = 'poor' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'artifact';

export interface ItemReference {
  [itemName: string]: number;
}

export interface ItemStats {
  strength?: number;
  agility?: number;
  stamina?: number;
  intellect?: number;
  spirit?: number;
  attackPower?: number;
  spellPower?: number;
  healing?: number;
  hit?: number;
  crit?: number;
  haste?: number;
  expertise?: number;
  armor?: number;
  defense?: number;
  dodge?: number;
  parry?: number;
  resilience?: number;
  penetration?: number;
}

export interface ClassSpec {
  name: string;
  statPriority: string[];
  rotation: RotationInfo;
  talents: TalentBuild[];
  consumables: string[];
  bis: BisItem[][];
  enchants: Record<string, string>;
}

export interface RotationInfo {
  description: string;
  priority: AbilityInfo[];
  cooldowns: AbilityInfo[];
  notes: string;
}

export interface AbilityInfo {
  name: string;
  spellId: number;
  description: string;
}

export interface TalentBuild {
  name: string;
  dist: string;
  trees: TalentTree[];
}

export interface TalentTree {
  name: string;
  talents: TalentEntry[];
}

export interface TalentEntry {
  name: string;
  points: number;
  max: number;
}

export type BisItem = [slot: string, item: string, source: string];

export interface ClassData {
  [className: string]: {
    title: string;
    defaultSpec: string;
    armorType: string;
    professions: Profession[];
    specs: Record<string, ClassSpec>;
  };
}

export interface Profession {
  name: string;
  skillId: number;
}

export interface RaidsData {
  [phaseKey: string]: PhaseData;
}

export interface PhaseData {
  name: string;
  description: string;
  raids: Record<string, RaidInfo>;
}

export interface RaidInfo {
  name: string;
  shortName: string;
  size: number;
  location: string;
  attunement?: string;
  attunementSteps?: string[];
  description: string;
  recommendedComposition: RaidComposition;
  minimumGear: Record<string, string>;
  tierTokens: string;
  bosses: BossInfo[];
}

export interface RaidComposition {
  tanks: number;
  healers: number;
  dps: number;
  notes: string;
}

export interface BossInfo {
  name: string;
  npcId: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
  description: string;
  phaseBreakdown?: string[];
  abilities: BossAbility[];
  strategy: string;
  commonMistakes: string[];
  lootHighlights: string[];
}

export interface BossAbility {
  name: string;
  spellId: number;
  description: string;
  handling: string;
}

export interface AttunementsData {
  [attunementKey: string]: AttunementInfo;
}

export interface AttunementInfo {
  name: string;
  shortName: string;
  reward: string;
  rewardItemId: number;
  description: string;
  steps: AttunementStep[];
}

export interface AttunementStep {
  id: string;
  questId?: number;
  name: string;
  description: string;
  location: string;
  npc?: string;
  type: 'quest' | 'dungeon' | 'achievement' | 'reputation';
}

export interface RecipesData {
  [profession: string]: ProfessionInfo;
}

export interface ProfessionInfo {
  title: string;
  categories: Record<string, RecipeCategory>;
}

export interface RecipeCategory {
  name: string;
  recipes: Recipe[];
}

export interface Recipe {
  name: string;
  itemId: number;
  source: string;
  materials?: string[];
}

export interface ReferenceData {
  enchantSpellIds: Record<string, number>;
  talentSpellIds: Record<string, number>;
  questIds: Record<string, number>;
}

export interface CollectionsData {
  mounts: MountCollection;
  tabards: TabardCollection;
  pets: PetCollection;
  rareSpawns: RareSpawnCollection;
  toys: ToyCollection;
}

export interface MountCollection {
  [category: string]: CollectionItem[];
}

export interface CollectionItem {
  name: string;
  itemId?: number;
  spellId?: number;
  source: string;
  difficulty?: string;
}

export type TabardCollection = CollectionItem[];
export type PetCollection = CollectionItem[];
export type RareSpawnCollection = RareSpawn[];
export type ToyCollection = CollectionItem[];

export interface RareSpawn {
  name: string;
  npcId: number;
  location: string;
  loot: string[];
  respawn: string;
}

export interface FactionsData {
  factions: FactionInfo[];
}

export interface FactionInfo {
  id: number;
  name: string;
  category: string;
  rewards: FactionReward[];
}

export interface FactionReward {
  standing: 'Neutral' | 'Friendly' | 'Honored' | 'Revered' | 'Exalted';
  items: string[];
}

export interface HeroicsData {
  [zone: string]: ZoneInfo;
}

export interface ZoneInfo {
  name: string;
  dungeons: Record<string, DungeonInfo>;
}

export interface DungeonInfo {
  name: string;
  location: string;
  level: string;
  description: string;
  bosses: BossInfo[];
  loot: string[];
}

export interface LockoutsData {
  raids: LockoutInfo[];
}

export interface LockoutInfo {
  id: string;
  name: string;
  size: number;
  resetPeriod: 'weekly' | 'daily';
}
