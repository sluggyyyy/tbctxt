import { registerRenderer } from '@/core/router';
import { state } from '@/core/state';
import { getStorageItem, setStorageItem } from '@/utils/storage';
import { STORAGE_KEYS, type RepProgress, type RepStanding } from '@/types/state';

const standings: RepStanding[] = ['Neutral', 'Friendly', 'Honored', 'Revered', 'Exalted'];

function loadRepProgress(): RepProgress {
  return getStorageItem<RepProgress>(STORAGE_KEYS.REP) || {};
}

function saveRepProgress(progress: RepProgress): void {
  setStorageItem(STORAGE_KEYS.REP, progress);
}

export function renderReputationTracker(): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  const progress = loadRepProgress();

  let html = `
    <h2 class="text-terminal-accent text-lg mb-4">[ REPUTATION TRACKER ]</h2>
    <p class="text-terminal-dim text-xs mb-6">Track your faction reputation progress</p>
  `;

  if (state.factionsData?.factions) {
    state.factionsData.factions.forEach(faction => {
      const currentStanding = progress[faction.id] || 'Neutral';
      html += `
        <div class="border border-terminal-dim p-4 mb-4">
          <h3 class="text-terminal-text mb-3">${faction.name}</h3>
          <div class="flex gap-2 mb-3">
            ${standings.map(standing => `
              <button class="rep-standing-btn px-3 py-1 text-xs border ${currentStanding === standing ? 'border-terminal-accent text-terminal-accent' : 'border-terminal-dim text-terminal-dim'}" data-faction="${faction.id}" data-standing="${standing}">${standing}</button>
            `).join('')}
          </div>
        </div>
      `;
    });
  }

  content.innerHTML = html;

  document.querySelectorAll('.rep-standing-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const factionId = target.getAttribute('data-faction');
      const standing = target.getAttribute('data-standing') as RepStanding;
      if (factionId && standing) {
        const progress = loadRepProgress();
        progress[factionId] = standing;
        saveRepProgress(progress);
        renderReputationTracker();
      }
    });
  });
}

registerRenderer('renderReputationTracker', renderReputationTracker);
