import { registerRenderer } from '@/core/router';
import { showModal } from '@/features/modal/modal';

export function renderBugReportForm(): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <h2 class="text-terminal-accent text-lg mb-4">[ BUG REPORT ]</h2>
    <p class="text-terminal-dim text-xs mb-6">Found a bug? Let us know!</p>

    <div class="border border-terminal-dim p-4">
      <div class="grid gap-4">
        <div>
          <label class="text-terminal-text text-sm mb-2 block">Email</label>
          <input type="email" id="bug-email" placeholder="your@email.com (optional)" class="w-full bg-terminal-bg border border-terminal-dim px-3 py-2 text-terminal-text" />
        </div>
        <div>
          <label class="text-terminal-text text-sm mb-2 block">Title</label>
          <input type="text" id="bug-title" class="w-full bg-terminal-bg border border-terminal-dim px-3 py-2 text-terminal-text" />
        </div>
        <div>
          <label class="text-terminal-text text-sm mb-2 block">Description</label>
          <textarea id="bug-description" rows="6" class="w-full bg-terminal-bg border border-terminal-dim px-3 py-2 text-terminal-text"></textarea>
        </div>
        <button id="submit-bug-btn" class="border border-terminal-accent text-terminal-accent px-4 py-2 hover:bg-terminal-accent hover:text-terminal-bg">Submit Bug Report</button>
      </div>
    </div>
  `;

  document.getElementById('submit-bug-btn')?.addEventListener('click', async () => {
    const title = (document.getElementById('bug-title') as HTMLInputElement).value;
    const description = (document.getElementById('bug-description') as HTMLTextAreaElement).value;

    if (!title || !description) {
      await showModal('Please fill in all fields', { type: 'alert' });
      return;
    }

    await showModal('Bug report submitted! Thank you for your feedback.', { type: 'alert' });
    (document.getElementById('bug-title') as HTMLInputElement).value = '';
    (document.getElementById('bug-description') as HTMLTextAreaElement).value = '';
  });
}

registerRenderer('renderBugReportForm', renderBugReportForm);
