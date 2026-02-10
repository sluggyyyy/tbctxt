import { registerRenderer } from '@/core/router';
import { state } from '@/core/state';
import { processWowheadLinks } from '@/utils/dom';

let currentRaidPhase = 'phase1';
let currentRaid = 'karazhan';

export function renderRaidsContent(phaseKey?: string, raidKey?: string): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (phaseKey) currentRaidPhase = phaseKey;
  if (raidKey) currentRaid = raidKey;

  const phaseData = state.raidsData[currentRaidPhase];
  if (!phaseData) return;

  const raidData = phaseData.raids[currentRaid];

  const phaseButtons = Object.entries(state.raidsData).map(([key, phase]) =>
    `<a href="#raids/${key}" class="raid-phase-btn ${key === currentRaidPhase ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text px-4 py-2.5 no-underline" data-phase="${key}">${phase.name}</a>`
  ).join('');

  const raidButtons = Object.entries(phaseData.raids).map(([key, raid]) =>
    `<a href="#raids/${currentRaidPhase}/${key}" class="raid-btn ${key === currentRaid ? 'bg-terminal-accent text-terminal-bg' : 'bg-transparent'} border border-terminal-accent px-3 py-2 no-underline" data-raid="${key}">${raid.name} (${raid.size})</a>`
  ).join('');

  let html = `<h2 class="text-terminal-accent text-lg mb-4">[ RAID GUIDES ]</h2><div class="flex gap-2 mb-4">${phaseButtons}</div><div class="flex gap-2 mb-6">${raidButtons}</div>`;

  if (raidData) {
    html += `<div class="border border-terminal-dim p-4 mb-6"><h3 class="text-terminal-accent mb-3">${raidData.name}</h3><p class="text-terminal-dim text-xs mb-4">${raidData.description || ''}</p></div><h3 class="text-sm my-4">[ BOSSES ]</h3>`;

    for (const boss of raidData.bosses) {
      html += `<div class="mb-6 border border-terminal-dim p-4"><h4 class="mb-3 text-wow-epic">${boss.name}</h4><p class="text-terminal-dim text-xs mb-3">${boss.description}</p>`;

      if (boss.abilities?.length) {
        html += `<table class="w-full text-xs"><thead><tr><th class="bg-terminal-dim text-terminal-bg p-2 text-left">Ability</th><th class="bg-terminal-dim text-terminal-bg p-2 text-left">Description</th></tr></thead><tbody>`;
        for (const ability of boss.abilities) {
          html += `<tr><td class="p-2">${ability.name}</td><td class="p-2 text-terminal-dim">${ability.description}</td></tr>`;
        }
        html += `</tbody></table>`;
      }
      html += `</div>`;
    }
  }

  content.innerHTML = html;
  processWowheadLinks();
}

registerRenderer('renderRaidsContent', renderRaidsContent);
