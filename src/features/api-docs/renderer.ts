import { registerRenderer } from '@/core/router';
import { API_BASE_URL } from '@/core/config';

export function renderApiDocs(): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <h2 class="text-terminal-accent text-lg mb-4">[ API DOCUMENTATION ]</h2>
    <p class="text-terminal-dim text-xs mb-6">Public API endpoints for TBC.TXT data</p>

    <div class="space-y-6">
      <div class="border border-terminal-dim p-4">
        <h3 class="text-terminal-accent mb-2">GET /api/classes</h3>
        <p class="text-terminal-dim text-xs mb-2">Returns all class data including specs, BiS gear, and rotations</p>
        <code class="block bg-terminal-dim bg-opacity-20 p-2 text-xs">${API_BASE_URL}/api/classes</code>
      </div>

      <div class="border border-terminal-dim p-4">
        <h3 class="text-terminal-accent mb-2">GET /api/raids</h3>
        <p class="text-terminal-dim text-xs mb-2">Returns all raid data including bosses and strategies</p>
        <code class="block bg-terminal-dim bg-opacity-20 p-2 text-xs">${API_BASE_URL}/api/raids</code>
      </div>

      <div class="border border-terminal-dim p-4">
        <h3 class="text-terminal-accent mb-2">GET /api/items</h3>
        <p class="text-terminal-dim text-xs mb-2">Returns item ID mappings for Wowhead integration</p>
        <code class="block bg-terminal-dim bg-opacity-20 p-2 text-xs">${API_BASE_URL}/api/items</code>
      </div>

      <div class="border border-terminal-dim p-4">
        <h3 class="text-terminal-accent mb-2">GET /api/recipes</h3>
        <p class="text-terminal-dim text-xs mb-2">Returns profession recipes and patterns</p>
        <code class="block bg-terminal-dim bg-opacity-20 p-2 text-xs">${API_BASE_URL}/api/recipes</code>
      </div>

      <div class="border border-terminal-dim p-4">
        <h3 class="text-terminal-accent mb-2">GET /api/health</h3>
        <p class="text-terminal-dim text-xs mb-2">Health check endpoint with data statistics</p>
        <code class="block bg-terminal-dim bg-opacity-20 p-2 text-xs">${API_BASE_URL}/api/health</code>
      </div>
    </div>

    <div class="mt-6 p-4 border border-terminal-accent border-opacity-30">
      <h3 class="text-terminal-accent text-sm mb-2">Usage Notes</h3>
      <ul class="text-terminal-dim text-xs space-y-1 list-disc ml-4">
        <li>All endpoints return JSON data</li>
        <li>CORS is enabled for all origins</li>
        <li>No authentication required for public endpoints</li>
        <li>Rate limiting may apply for heavy usage</li>
      </ul>
    </div>
  `;
}

registerRenderer('renderApiDocs', renderApiDocs);
