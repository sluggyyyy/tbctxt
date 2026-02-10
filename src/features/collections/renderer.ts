import { registerRenderer } from '@/core/router';
import { state } from '@/core/state';

export function renderCollectionsContent(category?: string): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  const currentCategory = category || 'mounts';
  const categories = ['mounts', 'tabards', 'pets', 'rareSpawns', 'toys'];

  const categoryButtons = categories.map(cat =>
    `<a href="#collections/${cat}" class="${cat === currentCategory ? 'bg-terminal-accent text-terminal-bg' : 'bg-transparent'} border border-terminal-accent px-3 py-2 no-underline text-xs">${cat.toUpperCase()}</a>`
  ).join('');

  let html = `
    <h2 class="text-terminal-accent text-lg mb-4">[ COLLECTIONS ]</h2>
    <div class="flex flex-wrap gap-2 mb-6">${categoryButtons}</div>
  `;

  const data = state.collectionsData[currentCategory as keyof typeof state.collectionsData];

  if (Array.isArray(data)) {
    data.forEach(item => {
      const source = 'source' in item ? item.source : ('location' in item ? item.location : '');
      html += `
        <div class="border border-terminal-dim p-3 mb-2">
          <div class="text-terminal-text">${item.name}</div>
          <div class="text-terminal-dim text-xs">${source}</div>
        </div>
      `;
    });
  } else if (typeof data === 'object') {
    Object.entries(data).forEach(([key, items]: [string, any]) => {
      html += `<h3 class="text-terminal-accent text-sm mb-3 mt-4">${key}</h3>`;
      items.forEach((item: any) => {
        html += `
          <div class="border border-terminal-dim p-3 mb-2">
            <div class="text-terminal-text">${item.name}</div>
            <div class="text-terminal-dim text-xs">Source: ${item.source}</div>
          </div>
        `;
      });
    });
  }

  content.innerHTML = html;
}

registerRenderer('renderCollectionsContent', renderCollectionsContent);
