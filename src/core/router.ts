import { setState, state } from './state';

type RenderFunction = (...args: any[]) => void;

const renderers: Record<string, RenderFunction> = {};

export function registerRenderer(name: string, fn: RenderFunction): void {
  renderers[name] = fn;
}

function updateActiveNav(target: string): void {
  const current = document.querySelector('.class-list li.active');
  if (current) current.classList.remove('active');

  const activeLink = document.querySelector(`.nav-link[data-class="${target}"], .nav-link[data-view="${target}"]`);
  if (activeLink) activeLink.parentElement?.classList.add('active');
}

function navigateToHash(hash: string): void {
  const target = hash.replace('#', '');
  if (!target) {
    renderers.renderClassContent?.('warrior');
    updateActiveNav('warrior');
    return;
  }

  const parts = target.split('/');
  const page = parts[0];

  if (page === 'recipes') {
    renderers.renderRecipesContent?.(parts[1] || 'blacksmithing');
  } else if (page === 'raids') {
    renderers.renderRaidsContent?.(parts[1] || 'phase1', parts[2] || 'karazhan');
  } else if (page === 'heroics') {
    renderers.renderHeroicsContent?.(parts[1] || 'hellfire', parts[2] || null);
  } else if (page === 'collections') {
    renderers.renderCollectionsContent?.(parts[1] || 'mounts');
  } else if (page === 'attunements') {
    renderers.renderAttunementsContent?.(parts[1] || 'karazhan');
  } else if (page === 'reputation') {
    renderers.renderReputationTracker?.();
  } else if (page === 'lockouts') {
    renderers.renderLockoutTracker?.();
  } else if (page === 'guildprogress') {
    renderers.renderGuildProgress?.();
  } else if (page === 'raidready') {
    renderers.renderPreRaidChecker?.();
  } else if (page === 'api') {
    renderers.renderApiDocs?.();
  } else if (page === 'bug-report') {
    renderers.renderBugReportForm?.();
  } else {
    setState({
      currentClass: page,
      currentSpec: parts[1] || null,
      currentPhase: parts[2] ? parseInt(parts[2]) : null
    });
    renderers.renderClassContent?.(page, parts[1], parts[2] ? parseInt(parts[2]) : null);
  }

  updateActiveNav(page);
}

export function initRouter(): void {
  window.addEventListener('hashchange', () => {
    navigateToHash(window.location.hash);
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      const event = e as MouseEvent;
      if (event.ctrlKey || event.metaKey || event.button === 1) return;
      e.preventDefault();
      window.location.hash = (this as HTMLAnchorElement).getAttribute('href') || '';
      document.querySelectorAll('.nav-dropdown.open').forEach(dd => dd.classList.remove('open'));
    });
  });

  document.querySelectorAll('.nav-dropdown-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const dropdown = (this as HTMLElement).closest('.nav-dropdown');
      const isOpen = dropdown?.classList.contains('open');
      document.querySelectorAll('.nav-dropdown.open').forEach(dd => dd.classList.remove('open'));
      if (!isOpen) dropdown?.classList.add('open');
    });
  });

  document.addEventListener('click', function(e) {
    const target = e.target as HTMLElement;
    if (!target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown.open').forEach(dd => dd.classList.remove('open'));
    }
  });

  navigateToHash(window.location.hash || '');
}
