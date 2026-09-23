import { clearSession, loadSession, saveSession, verify } from './auth.js';
import { loadAccess, loadConfig, loadState } from './store.js';
import { renderGate } from './views/gate.js';
import { renderDashboard } from './views/dashboard.js';
import { html, mount } from './html.js';
import { initTheme } from './theme.js';

const root = document.querySelector('#app');
const LAST_STATE_KEY = 'pucar.lastState.v1';

function remember(slug) {
  try {
    localStorage.setItem(LAST_STATE_KEY, slug);
  } catch {
    /* Storage is optional. */
  }
}

function recall() {
  try {
    return localStorage.getItem(LAST_STATE_KEY);
  } catch {
    return null;
  }
}

function fail(message) {
  mount(
    root,
    html`
      <main class="gate">
        <div class="gate__card">
          <h1 class="gate__title">Cannot load the tracker</h1>
          <p class="gate__lede">${message}</p>
          <button class="button button--primary" type="button" id="retry">Try again</button>
        </div>
      </main>
    `
  );
  root.querySelector('#retry')?.addEventListener('click', () => location.reload());
}

async function showDashboard(config, session, slug) {
  const chosen = session.states.includes(slug) ? slug : session.states[0];
  remember(chosen);
  document.title = `${config.states.find((s) => s.slug === chosen)?.name ?? 'Court'} | ${config.title}`;

  const state = await loadState(chosen);
  renderDashboard(root, {
    config,
    state,
    session,
    onSwitchState: (next) => showDashboard(config, session, next).catch((error) => fail(error.message)),
    onSignOut: () => {
      clearSession();
      document.title = config.title;
      showGate(config);
    }
  });
  window.scrollTo({ top: 0 });
}

function showGate(config) {
  renderGate(root, {
    config,
    onSubmit: async (code) => {
      const access = await loadAccess();
      const grant = await verify(code, access);
      if (!grant) return false;
      saveSession(grant);
      const preferred = recall();
      await showDashboard(config, grant, grant.states.includes(preferred) ? preferred : grant.states[0]);
      return true;
    }
  });
}

async function start() {
  initTheme();
  if (!window.crypto?.subtle) {
    return fail('This browser cannot run the access check. Please use an up to date browser over https.');
  }
  const config = await loadConfig();
  document.title = config.title;
  const session = loadSession();
  if (session) {
    const preferred = recall();
    return showDashboard(config, session, session.states.includes(preferred) ? preferred : session.states[0]);
  }
  showGate(config);
}

start().catch((error) => {
  console.error(error);
  fail('The status data could not be loaded. Please refresh, and tell us if it keeps happening.');
});
