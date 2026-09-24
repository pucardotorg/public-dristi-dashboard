import { clearSession, loadSession, saveSession, verify } from './auth.js';
import { loadAccess, loadConfig, loadPeople, loadState } from './store.js';
import { index as indexPeople } from './people.js';
import { renderGate } from './views/gate.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTimeline } from './views/timeline.js';
import { renderProfile } from './views/profile.js';
import { bindChrome } from './views/chrome.js';
import { html, mount } from './html.js';
import { initTheme, toggleTheme } from './theme.js';

const root = document.querySelector('#app');
const LAST_COURT = 'pucar.lastCourt.v1';

let config;
let people;
let session;
let court;

/* ------------------------------------------------------------------ storage */

function remember(slug) {
  try {
    localStorage.setItem(LAST_COURT, slug);
  } catch {
    /* Storage is optional. */
  }
}

function recall() {
  try {
    return localStorage.getItem(LAST_COURT);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------- errors */

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

/* ------------------------------------------------------------------ routing */

function permitted(slug) {
  return session.states.includes(slug);
}

function defaultCourt() {
  const preferred = recall();
  return preferred && permitted(preferred) ? preferred : session.states[0];
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function chrome(context) {
  bindChrome(root, {
    onSwitchState: (slug) => go(`#/court/${slug}`),
    onSignOut: () => {
      clearSession();
      session = null;
      court = null;
      document.title = config.title;
      history.replaceState(null, '', location.pathname);
      showGate();
    },
    onThemeChange: toggleTheme
  });
  return context;
}

async function route() {
  if (!session) return showGate();

  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

  if (parts[0] === 'person' && parts[1]) {
    const person = people.get(parts[1]);
    if (!person) return go(`#/court/${court ?? defaultCourt()}`);
    const states = await Promise.all(session.states.map(loadState));
    document.title = `${person.name} | ${config.title}`;
    const current = court ? await loadState(court) : null;
    renderProfile(root, { config, person, people, states, session, state: current });
    chrome();
    return window.scrollTo({ top: 0 });
  }

  if (parts[0] !== 'court' || !parts[1] || !permitted(parts[1])) {
    return go(`#/court/${defaultCourt()}`);
  }

  court = parts[1];
  remember(court);
  const state = await loadState(court);
  const name = config.states.find((entry) => entry.slug === court)?.name ?? state.name;

  if (parts[2] === 'timeline') {
    document.title = `Timeline, ${name} | ${config.title}`;
    renderTimeline(root, { config, state, people, session });
    chrome();
    return window.scrollTo({ top: 0 });
  }

  document.title = `${name} | ${config.title}`;
  const sheet = renderDashboard(root, { config, state, people, session });
  chrome();
  window.scrollTo({ top: 0 });

  // #/court/<slug>/ws/<id> opens the board with that card already open.
  if (parts[2] === 'ws' && parts[3]) {
    const ws = state.workstreams.find((entry) => entry.id === parts[3]);
    if (ws) sheet.workstream(ws, { config, state, people, session });
  }
}

/* --------------------------------------------------------------------- gate */

function showGate() {
  renderGate(root, {
    config,
    onSubmit: async (code) => {
      const access = await loadAccess();
      const grant = await verify(code, access);
      if (!grant) return false;
      session = grant;
      saveSession(grant);
      go(`#/court/${defaultCourt()}`);
      return true;
    }
  });
}

/* -------------------------------------------------------------------- start */

async function start() {
  initTheme();
  if (!window.crypto?.subtle) {
    return fail('This browser cannot run the access check. Please use an up to date browser over https.');
  }

  const [loadedConfig, loadedPeople] = await Promise.all([loadConfig(), loadPeople()]);
  config = loadedConfig;
  people = indexPeople(loadedPeople.people);
  document.title = config.title;
  session = loadSession();

  window.addEventListener('hashchange', () => route().catch((error) => fail(error.message)));
  await route();
}

start().catch((error) => {
  console.error(error);
  fail('The status data could not be loaded. Please refresh, and tell us if it keeps happening.');
});
