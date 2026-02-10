import { loadAllData } from '@/data/loader';
import { initRouter } from '@/core/router';
import { checkAuthStatus } from '@/features/auth/auth';
import { showTipJar } from '@/features/tipjar/tipjar';
import { renderApiDocs } from '@/features/api-docs/renderer';

import '@/features/modal/modal';
import '@/features/auth/auth';
import '@/features/classes/renderer';
import '@/features/raids/renderer';
import '@/features/attunements/renderer';
import '@/features/recipes/renderer';
import '@/features/heroics/renderer';
import '@/features/collections/renderer';
import '@/features/reputation/renderer';
import '@/features/lockouts/renderer';
import '@/features/guild-progress/renderer';
import '@/features/pre-raid-checker/renderer';
import '@/features/bug-report/renderer';
import '@/features/api-docs/renderer';

async function init() {
  console.log('[TBC.TXT] Initializing TypeScript version - v4.0');

  try {
    await loadAllData();
    await checkAuthStatus();
    initRouter();

    (window as any).showTipJar = showTipJar;
    (window as any).renderApiDocs = renderApiDocs;

    console.log('[TBC.TXT] Initialization complete');
  } catch (error) {
    console.error('[TBC.TXT] Initialization failed:', error);
  }
}

init();
