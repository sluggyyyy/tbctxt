import { state } from '@/core/state';
import { registerRenderer } from '@/core/router';
import type { ClassSpec, BisItem } from '@/types/data';

export function renderClassContent(className: string, specName?: string | null, phase?: number | null): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  const classInfo = state.classData[className];
  if (!classInfo) {
    content.innerHTML = `<div class="text-red-400">Class not found: ${className}</div>`;
    return;
  }

  const currentSpec = specName || classInfo.defaultSpec;
  const specData = classInfo.specs[currentSpec];
  if (!specData) {
    content.innerHTML = `<div class="text-red-400">Spec not found: ${currentSpec}</div>`;
    return;
  }

  const currentPhase = phase || 1;

  content.innerHTML = `
    <div class="class-content">
      <h1 class="text-2xl text-terminal-accent mb-4">${classInfo.title}</h1>

      <div class="spec-tabs mb-6">
        ${Object.keys(classInfo.specs).map(spec => `
          <a href="#${className}/${spec}"
             class="inline-block px-4 py-2 mr-2 border ${spec === currentSpec ? 'border-terminal-accent text-terminal-accent' : 'border-terminal-dim text-terminal-dim'}">
            ${classInfo.specs[spec].name}
          </a>
        `).join('')}
      </div>

      <div class="spec-info mb-6">
        <h2 class="text-xl text-terminal-accent mb-3">${specData.name}</h2>
        <p class="text-terminal-dim mb-4">${specData.rotation.description}</p>

        <h3 class="text-lg text-terminal-accent mb-2">Stat Priority</h3>
        <ul class="list-disc ml-6 mb-4">
          ${specData.statPriority.map(stat => `<li>${stat}</li>`).join('')}
        </ul>

        <h3 class="text-lg text-terminal-accent mb-2">BiS Gear - Phase ${currentPhase}</h3>
        <div class="phase-tabs mb-4">
          ${[1, 2, 3, 4, 5].map(p => `
            <a href="#${className}/${currentSpec}/${p}"
               class="inline-block px-3 py-1 mr-2 text-sm border ${p === currentPhase ? 'border-terminal-accent text-terminal-accent' : 'border-terminal-dim text-terminal-dim'}">
              P${p}
            </a>
          `).join('')}
        </div>

        ${renderBisTable(specData, currentPhase)}
      </div>
    </div>
  `;
}

function renderBisTable(specData: ClassSpec, phase: number): string {
  const bisPhaseIndex = phase - 1;
  if (!specData.bis || !specData.bis[bisPhaseIndex]) {
    return '<p class="text-terminal-dim">No BiS data available for this phase.</p>';
  }

  const bisItems = specData.bis[bisPhaseIndex];

  return `
    <table class="w-full border-collapse">
      <thead>
        <tr class="border-b border-terminal-accent">
          <th class="text-left py-2 px-3 text-terminal-accent">Slot</th>
          <th class="text-left py-2 px-3 text-terminal-accent">Item</th>
          <th class="text-left py-2 px-3 text-terminal-accent">Source</th>
        </tr>
      </thead>
      <tbody>
        ${bisItems.map(([slot, item, source]: BisItem) => `
          <tr class="border-b border-terminal-dim/30">
            <td class="py-2 px-3 text-terminal-text">${slot}</td>
            <td class="py-2 px-3 text-terminal-text">${item}</td>
            <td class="py-2 px-3 text-terminal-dim text-sm">${source}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

registerRenderer('renderClassContent', renderClassContent);
