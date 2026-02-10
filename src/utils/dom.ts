export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function createWowheadLink(itemName: string, itemId: number, quality?: string): string {
  const cleanName = itemName.replace(/\s*\((BEST|RECOMMENDED|GOOD|OPTION|ALTERNATIVE|EASY|HARD)\)\s*$/i, '').trim();
  const qualityClass = quality ? `quality-${quality}` : 'quality-epic';

  return `<a href="https://tbc.wowhead.com/item=${itemId}" class="wowhead-link ${qualityClass}" data-wowhead="domain=tbc;item=${itemId}" data-item-id="${itemId}">${cleanName}</a>`;
}

export function processWowheadLinks(): void {
  if (typeof (window as any).$WowheadPower !== 'undefined') {
    (window as any).$WowheadPower.refreshLinks();
  }
}
