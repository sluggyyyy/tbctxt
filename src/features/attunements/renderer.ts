import { registerRenderer } from '@/core/router';
import { state } from '@/core/state';
import { getStorageItem, setStorageItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/types/state';
import type { AttunementProgress } from '@/types/state';

let currentAttunement = 'karazhan';

function loadAttunementProgress(): AttunementProgress {
  return getStorageItem<AttunementProgress>(STORAGE_KEYS.ATTUNEMENT) || {};
}

function saveAttunementProgress(progress: AttunementProgress): void {
  setStorageItem(STORAGE_KEYS.ATTUNEMENT, progress);
}

export function renderAttunementsContent(attunementKey?: string): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (attunementKey) currentAttunement = attunementKey;

  const attunementLabels: Record<string, string> = {
    karazhan: 'Karazhan',
    ssc: 'SSC',
    tk: 'TK',
    hyjal: 'Hyjal',
    bt: 'Black Temple',
    heroicKeys: 'Heroic Keys'
  };

  const attunementButtons = Object.keys(attunementLabels).map(key =>
    `<a href="#attunements/${key}" class="${key === currentAttunement ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent'} border border-terminal-text px-4 py-2.5 no-underline">${attunementLabels[key]}</a>`
  ).join('');

  const attunement = state.attunementsData[currentAttunement];
  const progress = loadAttunementProgress();

  let html = `
    <h2 class="text-terminal-accent text-lg mb-4">[ ATTUNEMENTS ]</h2>
    <p class="text-terminal-dim text-xs mb-6">Track your raid attunement progress</p>
    <div class="flex gap-2 mb-6">${attunementButtons}</div>
  `;

  if (attunement) {
    html += `<div class="border border-terminal-text p-4 mb-4">
      <h3 class="text-terminal-accent mb-3">${attunement.name}</h3>
      <p class="text-terminal-dim text-xs mb-4">${attunement.description || ''}</p>
    </div>`;

    attunement.steps.forEach((step, index) => {
      const isCompleted = progress[step.id];
      html += `
        <label class="flex items-start gap-3 py-3 px-2 border-b border-terminal-dim ${isCompleted ? 'opacity-50' : ''}">
          <input type="checkbox" class="attunement-checkbox mt-0.5" data-step-id="${step.id}" ${isCompleted ? 'checked' : ''} />
          <div class="flex-1">
            <div class="text-terminal-text text-sm">${index + 1}. ${step.name}</div>
            <div class="text-terminal-dim text-xs mt-1">${step.description}</div>
            <div class="text-terminal-dim text-xs mt-1">📍 ${step.location}</div>
          </div>
        </label>
      `;
    });
  }

  content.innerHTML = html;

  document.querySelectorAll('.attunement-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const stepId = target.getAttribute('data-step-id');
      if (stepId) {
        const progress = loadAttunementProgress();
        progress[stepId] = target.checked;
        saveAttunementProgress(progress);
      }
    });
  });
}

registerRenderer('renderAttunementsContent', renderAttunementsContent);
