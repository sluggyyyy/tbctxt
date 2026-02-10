import { registerRenderer } from '@/core/router';
import { state } from '@/core/state';

export function renderHeroicsContent(zone?: string, dungeon?: string | null): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  const currentZone = zone || 'hellfire';
  const zoneData = state.heroicsData[currentZone];

  const zoneButtons = Object.keys(state.heroicsData).map(key => {
    const z = state.heroicsData[key];
    return `<a href="#heroics/${key}" class="${key === currentZone ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text px-3 py-2 no-underline text-xs">${z.name}</a>`;
  }).join('');

  let html = `
    <h2 class="text-terminal-accent text-lg mb-4">[ HEROIC DUNGEONS ]</h2>
    <div class="flex flex-wrap gap-2 mb-6">${zoneButtons}</div>
  `;

  if (zoneData) {
    Object.entries(zoneData.dungeons).forEach(([key, dungeonData]) => {
      html += `
        <div class="border border-terminal-dim p-4 mb-4">
          <h3 class="text-terminal-accent mb-2">${dungeonData.name}</h3>
          <div class="text-terminal-dim text-xs mb-2">📍 ${dungeonData.location}</div>
          <div class="text-terminal-dim text-xs mb-3">${dungeonData.description}</div>
        </div>
      `;
    });
  }

  content.innerHTML = html;
}

registerRenderer('renderHeroicsContent', renderHeroicsContent);
