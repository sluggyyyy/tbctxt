import { registerRenderer } from '@/core/router';
import { state } from '@/core/state';
import { getStorageItem, setStorageItem } from '@/utils/storage';
import { STORAGE_KEYS, type LockoutProgress } from '@/types/state';

function loadLockoutProgress(): LockoutProgress {
  return getStorageItem<LockoutProgress>(STORAGE_KEYS.LOCKOUT) || {};
}

function saveLockoutProgress(progress: LockoutProgress): void {
  setStorageItem(STORAGE_KEYS.LOCKOUT, progress);
}

export function renderLockoutTracker(): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  const progress = loadLockoutProgress();
  const now = Date.now();

  let html = `
    <h2 class="text-terminal-accent text-lg mb-4">[ LOCKOUT TRACKER ]</h2>
    <p class="text-terminal-dim text-xs mb-6">Track your raid lockouts and reset timers</p>
  `;

  if (state.lockoutsData?.raids) {
    state.lockoutsData.raids.forEach(raid => {
      const lockout = progress[raid.id];
      const isLocked = lockout && lockout.locked && lockout.timestamp > now;

      html += `
        <div class="border border-terminal-dim p-4 mb-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-terminal-text">${raid.name} (${raid.size})</h3>
              <div class="text-terminal-dim text-xs">Resets: ${raid.resetPeriod}</div>
            </div>
            <label class="flex items-center gap-2">
              <input type="checkbox" class="lockout-checkbox" data-raid-id="${raid.id}" ${isLocked ? 'checked' : ''} />
              <span class="text-xs">${isLocked ? 'Locked' : 'Available'}</span>
            </label>
          </div>
        </div>
      `;
    });
  }

  content.innerHTML = html;

  document.querySelectorAll('.lockout-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const raidId = target.getAttribute('data-raid-id');
      if (raidId) {
        const progress = loadLockoutProgress();
        const resetTime = target.checked ? now + (7 * 24 * 60 * 60 * 1000) : 0;
        progress[raidId] = { locked: target.checked, timestamp: resetTime };
        saveLockoutProgress(progress);
      }
    });
  });
}

registerRenderer('renderLockoutTracker', renderLockoutTracker);
