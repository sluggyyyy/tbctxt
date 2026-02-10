import { registerRenderer } from '@/core/router';
import { API_BASE_URL } from '@/core/config';

export function renderPreRaidChecker(): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <h2 class="text-terminal-accent text-lg mb-4">[ PRE-RAID CHECKER ]</h2>
    <p class="text-terminal-dim text-xs mb-6">Check if your character is ready for raiding</p>

    <div class="border border-terminal-dim p-4 mb-6">
      <h3 class="text-terminal-text mb-3">Enter Character Details</h3>
      <div class="grid gap-3">
        <input type="text" id="char-name" placeholder="Character Name" class="bg-terminal-bg border border-terminal-dim px-3 py-2 text-terminal-text" />
        <input type="text" id="char-realm" placeholder="Realm (e.g., Faerlina)" class="bg-terminal-bg border border-terminal-dim px-3 py-2 text-terminal-text" />
        <select id="char-region" class="bg-terminal-bg border border-terminal-dim px-3 py-2 text-terminal-text">
          <option value="us">US</option>
          <option value="eu">EU</option>
        </select>
        <button id="check-char-btn" class="border border-terminal-accent text-terminal-accent px-4 py-2 hover:bg-terminal-accent hover:text-terminal-bg">Check Character</button>
      </div>
    </div>

    <div id="check-results"></div>
  `;

  document.getElementById('check-char-btn')?.addEventListener('click', async () => {
    const name = (document.getElementById('char-name') as HTMLInputElement).value;
    const realm = (document.getElementById('char-realm') as HTMLInputElement).value;
    const region = (document.getElementById('char-region') as HTMLSelectElement).value;
    const results = document.getElementById('check-results');

    if (!name || !realm || !results) return;

    results.innerHTML = '<div class="text-terminal-dim">Loading character data...</div>';

    try {
      const res = await fetch(\`\${API_BASE_URL}/api/character?name=\${name}&realm=\${realm}&region=\${region}\`);
      const data = await res.json();

      if (data.error) {
        results.innerHTML = \`<div class="text-red-400">Error: \${data.error}</div>\`;
        return;
      }

      results.innerHTML = \`
        <div class="border border-terminal-accent p-4">
          <h3 class="text-terminal-accent mb-3">\${name} - \${realm}</h3>
          <div class="text-terminal-dim text-xs">Character data loaded successfully!</div>
        </div>
      \`;
    } catch (error) {
      results.innerHTML = '<div class="text-red-400">Failed to load character data</div>';
    }
  });
}

registerRenderer('renderPreRaidChecker', renderPreRaidChecker);
