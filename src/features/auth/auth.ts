import { API_BASE_URL } from '@/core/config';
import { setState, state } from '@/core/state';
import { STORAGE_KEYS } from '@/types/state';
import type { AuthState, ServerProgress } from '@/types/state';

export async function checkAuthStatus(): Promise<void> {
  handleAuthCallback();

  const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
  if (saved) {
    try {
      const user = JSON.parse(saved) as AuthState;
      setState({ currentUser: user });
    } catch (e) {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      setState({ currentUser: null });
    }
  } else {
    setState({ currentUser: null });
  }

  updateAuthUI();
  if (state.currentUser) loadServerProgress();
}

function handleAuthCallback(): void {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('auth_token');
  const battletag = params.get('battletag');

  if (token && battletag) {
    const user: AuthState = {
      battletag: decodeURIComponent(battletag),
      token
    };
    setState({ currentUser: user });
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
    history.replaceState(null, '', window.location.pathname + window.location.hash);
    updateAuthUI();
    loadServerProgress();
  }
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
  setState({ currentUser: null });
  updateAuthUI();
}

export function updateAuthUI(): void {
  const headerAuth = document.getElementById('header-auth');
  if (!headerAuth) return;

  if (state.currentUser) {
    headerAuth.innerHTML = `
      <span class="inline-flex items-center px-3 py-1.5 border md:text-[11px] sm:text-[10px]" style="color: #00AEFF; border-color: #00AEFF;">
        <span class="text-xs">${state.currentUser.battletag}</span>
        <a href="#" id="logout-btn" class="ml-2 text-[10px] text-terminal-dim hover:text-terminal-text transition-colors">[ LOGOUT ]</a>
      </span>
    `;
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    headerAuth.innerHTML = `
      <a href="${API_BASE_URL}/api/auth/login" class="text-xs px-3 py-1.5 border transition-colors md:text-[11px] sm:text-[10px]" style="color: #00AEFF; border-color: #00AEFF;" onmouseover="this.style.backgroundColor='#00AEFF'; this.style.color='#222222';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#00AEFF';">[ LOGIN ]</a>
    `;
  }
}

async function loadServerProgress(): Promise<void> {
  if (!state.currentUser || !state.currentUser.token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/progress`, {
      headers: { 'Authorization': `Bearer ${state.currentUser.token}` }
    });

    if (res.ok) {
      const progress = await res.json() as ServerProgress;
      setState({ serverProgress: progress });

      if (progress.attunements) {
        localStorage.setItem(STORAGE_KEYS.ATTUNEMENT, JSON.stringify(progress.attunements));
      }

      console.log('Loaded progress from server:', progress);
    }
  } catch (e) {
    console.error('Failed to load server progress:', e);
  }
}

export async function saveProgressToServer(attunements: Record<string, boolean>): Promise<void> {
  if (!state.currentUser || !state.currentUser.token) return;

  try {
    await fetch(`${API_BASE_URL}/api/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.currentUser.token}`
      },
      body: JSON.stringify({ attunements })
    });
    console.log('Progress saved to server');
  } catch (e) {
    console.error('Failed to save to server:', e);
  }
}
