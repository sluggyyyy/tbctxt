import { registerRenderer } from '@/core/router';
import { state } from '@/core/state';

let currentProfession = 'blacksmithing';

export function renderRecipesContent(profession?: string): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (profession) currentProfession = profession;

  const professionButtons = Object.keys(state.recipesData).map(key => {
    const prof = state.recipesData[key];
    return `<a href="#recipes/${key}" class="${key === currentProfession ? 'bg-terminal-accent text-terminal-bg' : 'bg-transparent'} border border-terminal-accent px-3 py-2 no-underline text-xs">${prof.title}</a>`;
  }).join('');

  const profData = state.recipesData[currentProfession];
  let html = `
    <h2 class="text-terminal-accent text-lg mb-4">[ PROFESSION RECIPES ]</h2>
    <div class="flex flex-wrap gap-2 mb-6">${professionButtons}</div>
  `;

  if (profData) {
    html += `<h3 class="text-terminal-text mb-4">${profData.title}</h3>`;

    Object.entries(profData.categories).forEach(([catKey, category]) => {
      html += `<div class="mb-6">
        <h4 class="text-terminal-accent text-sm mb-3">${category.name}</h4>
        <div class="grid gap-2">`;

      category.recipes.forEach(recipe => {
        html += `
          <div class="border border-terminal-dim p-3">
            <div class="text-terminal-text">${recipe.name}</div>
            <div class="text-terminal-dim text-xs mt-1">Source: ${recipe.source}</div>
          </div>
        `;
      });

      html += `</div></div>`;
    });
  }

  content.innerHTML = html;
}

registerRenderer('renderRecipesContent', renderRecipesContent);
