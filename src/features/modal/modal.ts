export interface ModalOptions {
  type?: 'confirm' | 'alert';
  confirmText?: string;
  cancelText?: string;
}

export function showModal(message: string, options: ModalOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const { type = 'confirm', confirmText = 'YES', cancelText = 'NO' } = options;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[100]';
    overlay.id = 'modal-overlay';

    overlay.innerHTML = `
      <div class="bg-terminal-bg border-2 border-terminal-accent p-6 max-w-md mx-4 font-mono">
        <div class="text-terminal-text text-sm mb-6">${message}</div>
        <div class="flex gap-3 justify-end">
          ${type === 'confirm' ? `
            <button id="modal-cancel" class="px-4 py-2 border border-terminal-dim text-terminal-dim hover:border-terminal-text hover:text-terminal-text transition-colors text-xs">[ ${cancelText} ]</button>
            <button id="modal-confirm" class="px-4 py-2 border border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-terminal-bg transition-colors text-xs">[ ${confirmText} ]</button>
          ` : `
            <button id="modal-confirm" class="px-4 py-2 border border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-terminal-bg transition-colors text-xs">[ OK ]</button>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('modal-confirm')?.focus();

    const cleanup = (result: boolean) => {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
      resolve(result);
    };

    document.getElementById('modal-confirm')?.addEventListener('click', () => cleanup(true));
    document.getElementById('modal-cancel')?.addEventListener('click', () => cleanup(false));

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup(false);
    };
    document.addEventListener('keydown', handleEscape);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}
