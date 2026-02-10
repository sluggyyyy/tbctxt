import { setState, state } from '@/core/state';
import type { ReferenceData } from '@/types/data';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

function showLoading(): void {
  const content = document.getElementById('main-content');
  if (content) {
    content.innerHTML = `
      <div class="text-center py-20">
        <div class="text-terminal-accent text-lg mb-3">[ LOADING DATA ]</div>
        <div class="text-terminal-dim text-xs">Fetching game data...</div>
      </div>
    `;
  }
}

function showError(error: Error): void {
  const content = document.getElementById('main-content');
  if (content) {
    content.innerHTML = `
      <div class="text-red-400 text-center py-10">
        <div class="mb-2">[ ERROR LOADING DATA ]</div>
        <div class="text-xs text-terminal-dim">${error.message}</div>
        <div class="text-xs text-terminal-dim mt-2">Check browser console for details (F12)</div>
      </div>
    `;
  }
}

export async function loadAllData(): Promise<void> {
  showLoading();

  try {
    const [items, classes, recipes, raids, reference, stats, collections, attunements, heroics, factions, lockouts] = await Promise.all([
      fetchJSON('/data/itemIds.json'),
      fetchJSON('/data/classData.json'),
      fetchJSON('/data/recipesData.json'),
      fetchJSON('/data/raidsData.json'),
      fetchJSON<ReferenceData>('/data/referenceData.json'),
      fetchJSON('/data/itemStats.json'),
      fetchJSON('/data/collectionsData.json'),
      fetchJSON('/data/attunementsData.json'),
      fetchJSON('/data/heroicsData.json'),
      fetchJSON('/data/factionsData.json'),
      fetchJSON('/data/lockoutsData.json')
    ]);

    setState({
      itemIds: items,
      classData: classes,
      recipesData: recipes,
      raidsData: raids,
      collectionsData: collections,
      attunementsData: attunements,
      heroicsData: heroics,
      factionsData: factions,
      lockoutsData: lockouts,
      enchantSpellIds: reference.enchantSpellIds,
      talentSpellIds: reference.talentSpellIds,
      questIds: reference.questIds,
      itemStats: stats
    });

    console.log('Data loaded:', {
      items: Object.keys(state.itemIds).length,
      classes: Object.keys(state.classData).length,
      professions: Object.keys(state.recipesData).length,
      raidPhases: Object.keys(state.raidsData).length,
      itemStats: Object.keys(state.itemStats).length,
      heroicZones: Object.keys(state.heroicsData).length,
      factions: state.factionsData.factions?.length || 0
    });
  } catch (error) {
    console.error('Failed to load data:', error);
    showError(error as Error);
    throw error;
  }
}
