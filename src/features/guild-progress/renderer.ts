import { registerRenderer } from '@/core/router';
import { state } from '@/core/state';
import { getStorageItem, setStorageItem } from '@/utils/storage';
import { STORAGE_KEYS, type GuildProgress } from '@/types/state';

function loadGuildProgress(): GuildProgress {
  return getStorageItem<GuildProgress>(STORAGE_KEYS.GUILD_PROGRESS) || {};
}

function saveGuildProgress(progress: GuildProgress): void {
  setStorageItem(STORAGE_KEYS.GUILD_PROGRESS, progress);
}

export function renderGuildProgress(): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  const progress = loadGuildProgress();

  let html = `
    <h2 class="text-terminal-accent text-lg mb-4">[ GUILD PROGRESS ]</h2>
    <p class="text-terminal-dim text-xs mb-6">Track your guild's raid boss kills</p>
  `;

  Object.entries(state.raidsData).forEach(([phaseKey, phaseData]) => {
    html += `<h3 class="text-terminal-accent text-sm mb-3 mt-6">${phaseData.name}</h3>`;

    Object.entries(phaseData.raids).forEach(([raidKey, raid]) => {
      html += `<div class="border border-terminal-dim p-4 mb-4">
        <h4 class="text-terminal-text mb-3">${raid.name}</h4>
        <div class="grid gap-2">`;

      raid.bosses.forEach(boss => {
        const bossId = `${phaseKey}-${raidKey}-${boss.npcId}`;
        const kills = progress[bossId] || 0;

        html += `
          <div class="flex justify-between items-center border-b border-terminal-dim pb-2">
            <span class="text-terminal-text text-sm">${boss.name}</span>
            <div class="flex items-center gap-2">
              <button class="boss-decrement px-2 py-1 border border-terminal-dim text-xs" data-boss-id="${bossId}">-</button>
              <span class="text-terminal-accent min-w-[40px] text-center">${kills} kills</span>
              <button class="boss-increment px-2 py-1 border border-terminal-accent text-xs" data-boss-id="${bossId}">+</button>
            </div>
          </div>
        `;
      });

      html += `</div></div>`;
    });
  });

  content.innerHTML = html;

  document.querySelectorAll('.boss-increment, .boss-decrement').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const bossId = target.getAttribute('data-boss-id');
      if (bossId) {
        const progress = loadGuildProgress();
        const current = progress[bossId] || 0;
        progress[bossId] = target.classList.contains('boss-increment') ? current + 1 : Math.max(0, current - 1);
        saveGuildProgress(progress);
        renderGuildProgress();
      }
    });
  });
}

registerRenderer('renderGuildProgress', renderGuildProgress);
