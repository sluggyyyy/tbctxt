import type {
  ClassData, ItemReference, RecipesData, RaidsData, ItemStats,
  CollectionsData, AttunementsData, HeroicsData, FactionsData, LockoutsData
} from '@/types/data';
import type { AuthState, ServerProgress } from '@/types/state';

export const state = {
  itemIds: {} as ItemReference,
  classData: {} as ClassData,
  recipesData: {} as RecipesData,
  raidsData: {} as RaidsData,
  collectionsData: {} as CollectionsData,
  attunementsData: {} as AttunementsData,
  heroicsData: {} as HeroicsData,
  factionsData: {} as FactionsData,
  lockoutsData: {} as LockoutsData,
  enchantSpellIds: {} as Record<string, number>,
  talentSpellIds: {} as Record<string, number>,
  questIds: {} as Record<string, number>,
  itemStats: {} as ItemStats,
  currentUser: null as AuthState | null,
  serverProgress: null as ServerProgress | null,
  currentClass: 'warrior' as string,
  currentSpec: null as string | null,
  currentPhase: null as number | null
};

export function setState(updates: Partial<typeof state>): void {
  Object.assign(state, updates);
}

export function getState(): typeof state {
  return state;
}
