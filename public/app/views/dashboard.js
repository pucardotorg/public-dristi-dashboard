import { html, mount, raw } from '../html.js';
import { formatDay, initials, percent, plural, daysBetween, today } from '../format.js';
import { currentTheme, toggleTheme } from '../theme.js';
import { isLive, progressOf, riskOf, slippage, stageIndex, summarise } from '../progress.js';

const SORTS = {
  target: { label: 'Target date', compare: (a, b) => (a.ws.target ?? '').localeCompare(b.ws.target ?? '') },
  attention: { label: 'Needs attention', compare: (a, b) => b.weight - a.weight || a.progress - b.progress },
  progress: { label: 'Most complete', compare: (a, b) => b.progress - a.progress },
  name: { label: 'Name', compare: (a, b) => a.ws.name.localeCompare(b.ws.name) }
};

const RISK_WEIGHT = { blocked: 3, delayed: 2, watch: 1, 'on-track': 0 };

export function renderDashboard(root, { config, state, session, onSwitchState, onSignOut }) {
  const view = { query: '', stage: 'all', status: 'all', sort: 'attention' };
  mount(root, shell(config, state, session));

  const list = root.querySelector('#workstreams');
  const count = root.querySelector('#result-count');

  const paint = () => {
    const rows = select(config, state, view);
    count.textContent = `${plural(rows.length, 'workstream')} shown`;
    list.innerHTML = rows.length
      ? rows.map((row) => workstreamRow(config, row)).join('')
      : html`<p class="empty">Nothing matches those filters.</p>`;
  };

  root.querySelector('#search').addEventListener('input', (event) => {
    view.query = event.target.value.trim().toLowerCase();
    paint();
  });
  root.querySelector('#stage-filter').addEventListener('change', (event) => {
    view.stage = event.target.value;
    paint();
  });
  root.querySelector('#status-filter').addEventListener('change', (event) => {
    view.status = event.target.value;
    paint();
  });
  root.querySelector('#sort').addEventListener('change', (event) => {
    view.sort = event.target.value;
    paint();
  });
  const theme = root.querySelector('#theme');
  theme.addEventListener('click', () => {
    theme.firstElementChild.textContent = toggleTheme() === 'dark' ? 'Light' : 'Dark';
  });
  root.querySelector('#sign-out').addEventListener('click', onSignOut);
  root.querySelector('#state-switch')?.addEventListener('change', (event) => onSwitchState(event.target.value));

  paint();
}

function select(config, state, view) {
  const rows = state.workstreams
    .map((ws) => {
      const risk = riskOf(config.stages, ws);
      return { ws, risk, progress: progressOf(config.stages, ws), weight: RISK_WEIGHT[risk] ?? 0 };
    })
    .filter(({ ws, risk }) => {
      if (view.stage !== 'all' && ws.stage !== view.stage) return false;
      if (view.status === 'live' && !isLive(config.stages, ws)) return false;
      if (view.status === 'in-flight' && isLive(config.stages, ws)) return false;
      if (view.status === 'attention' && !(risk === 'delayed' || risk === 'blocked')) return false;
      if (!view.query) return true;
      const haystack = [ws.name, ws.summary, ws.owner.name, ...(ws.team ?? []).map((m) => m.name)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(view.query);
    });

  return rows.sort(SORTS[view.sort].compare);
}

function shell(config, state, session) {
  const stats = summarise(config.stages, state.workstreams);
  const multiState = session.states.length > 1;

  return html`
    <header class="topbar">
      <div class="topbar__brand">
        <span class="topbar__mark" aria-hidden="true">${config.programme.slice(0, 2)}</span>
        <span>
          <strong>${config.title}</strong>
          <small>${config.programme}</small>
        </span>
      </div>
      <div class="topbar__actions">
        ${multiState
          ? raw(html`
              <label class="field field--inline">
                <span class="field__label" for="state-switch">Court</span>
                <select class="field__select" id="state-switch">
                  ${config.states
                    .filter((option) => session.states.includes(option.slug))
                    .map(
                      (option) => raw(html`
                        <option value="${option.slug}" ${option.slug === state.slug ? raw('selected') : ''}>
                          ${option.name}
                        </option>
                      `)
                    )}
                </select>
              </label>
            `)
          : ''}
        <button class="button button--icon" type="button" id="theme" aria-label="Switch between light and dark">
          <span aria-hidden="true">${currentTheme() === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <button class="button button--quiet" type="button" id="sign-out">Sign out</button>
      </div>
    </header>

    <main class="page">
      <section class="hero">
        <div class="hero__heading">
          <h1>${state.name}</h1>
          <p class="hero__court">${state.court}</p>
          <p class="hero__meta">
            Updated ${formatDay(state.updated)} &middot; ${state.rollout.courtsLive} of
            ${state.rollout.courtsPlanned} courts live
          </p>
        </div>
        <div class="hero__progress">
          <div class="hero__progress-top">
            <span>Overall progress</span>
            <strong>${percent(stats.overall)}</strong>
          </div>
          ${raw(bar(stats.overall, 'Overall progress across all workstreams'))}
          <p class="hero__note">${state.rollout.note}</p>
        </div>
      </section>

      <section class="stats" aria-label="Summary">
        ${stat('Workstreams', stats.total)} ${stat('Live', stats.live)} ${stat('In flight', stats.inFlight)}
        ${stat('Delays expected', stats.atRisk, stats.atRisk > 0 ? 'warn' : '')}
        ${stat('Next go live', stats.nextTarget ? formatDay(stats.nextTarget, { short: true }) : 'None planned')}
      </section>

      <section class="board" aria-label="Workstreams">
        <div class="controls">
          <label class="field field--grow">
            <span class="field__label" for="search">Search</span>
            <input class="field__input" id="search" type="search" placeholder="Workstream or person" />
          </label>
          <label class="field">
            <span class="field__label" for="stage-filter">Stage</span>
            <select class="field__select" id="stage-filter">
              <option value="all">All stages</option>
              ${config.stages.map((stage) => raw(html`<option value="${stage.id}">${stage.label}</option>`))}
            </select>
          </label>
          <label class="field">
            <span class="field__label" for="status-filter">Status</span>
            <select class="field__select" id="status-filter">
              <option value="all">All</option>
              <option value="in-flight">In flight</option>
              <option value="attention">Delays expected</option>
              <option value="live">Live</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label" for="sort">Sort by</span>
            <select class="field__select" id="sort">
              ${Object.entries(SORTS).map(
                ([id, sort]) => raw(html`<option value="${id}" ${id === 'attention' ? raw('selected') : ''}>${sort.label}</option>`)
              )}
            </select>
          </label>
          <p class="controls__count" id="result-count" aria-live="polite"></p>
        </div>

        <div class="rows" id="workstreams"></div>
      </section>

      <footer class="footer">
        <div>
          <h2>What the stages mean</h2>
          <dl class="legend">
            ${config.stages.map(
              (stage) => raw(html`<dt>${stage.label}</dt><dd>${stage.description}</dd>`)
            )}
          </dl>
        </div>
        <div>
          <h2>How to read the flags</h2>
          <dl class="legend">
            ${config.risks.map((risk) => raw(html`<dt>${risk.label}</dt><dd>${risk.description}</dd>`))}
          </dl>
          <p class="footer__contact">
            Something look wrong? Write to <a href="mailto:${config.contact}">${config.contact}</a>.
          </p>
        </div>
      </footer>
    </main>
  `;
}

function stat(label, value, tone = '') {
  return raw(html`
    <div class="stat ${tone ? `stat--${tone}` : ''}">
      <dt class="stat__label">${label}</dt>
      <dd class="stat__value">${value}</dd>
    </div>
  `);
}

function bar(value, label) {
  const rounded = Math.round(value);
  return html`
    <div
      class="bar"
      role="progressbar"
      aria-label="${label}"
      aria-valuenow="${rounded}"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span class="bar__fill" style="width: ${rounded}%"></span>
    </div>
  `;
}

function workstreamRow(config, { ws, risk, progress }) {
  const live = isLive(config.stages, ws);
  const slipped = slippage(ws);
  const untilTarget = daysBetween(today().toISOString().slice(0, 10), ws.target);

  return html`
    <details class="row" id="ws-${ws.id}">
      <summary class="row__summary">
        <div class="row__main">
          <h3 class="row__name">${ws.name}</h3>
          <p class="row__summary-text">${ws.summary}</p>
          <p class="row__flags">
            ${raw(riskBadge(config, risk, live))}
            ${slipped > 0 ? raw(html`<span class="badge badge--slip">${plural(slipped, 'day')} later than planned</span>`) : ''}
          </p>
        </div>

        <div class="row__pipeline">${raw(pipeline(config.stages, ws))}</div>

        <div class="row__progress">
          ${raw(bar(progress, `${ws.name} progress`))}
          <span class="row__progress-value">${percent(progress)}</span>
        </div>

        <div class="row__people">
          <span class="avatar" title="${ws.owner.name}, ${ws.owner.role}">${initials(ws.owner.name)}</span>
          <span class="row__owner">
            <strong>${ws.owner.name}</strong>
            <small>${ws.owner.role}</small>
          </span>
        </div>

        <div class="row__date">
          <span class="row__date-label">${live ? 'Live since' : 'Target'}</span>
          <strong>${formatDay(live ? ws.liveSince ?? ws.target : ws.target, { short: true })}</strong>
          <small>${live ? 'Deployed' : dateHint(untilTarget)}</small>
        </div>

        <span class="row__chevron" aria-hidden="true"></span>
      </summary>

      <div class="row__detail">
        <div class="detail__block">
          <h4>Where it stands</h4>
          <p>${stageNote(config, ws)}</p>
          <p class="detail__note">${ws.note}</p>
        </div>

        <div class="detail__block">
          <h4>Who is working on it</h4>
          <ul class="people">
            ${raw(person(ws.owner, 'Owner'))}
            ${(ws.team ?? []).map((member) => raw(person(member)))}
          </ul>
        </div>

        <div class="detail__block">
          <h4>Dates</h4>
          <ul class="facts">
            <li><span>Target deployment</span><strong>${formatDay(ws.target)}</strong></li>
            <li><span>Date first committed</span><strong>${formatDay(ws.baseline)}</strong></li>
            <li>
              <span>Change</span>
              <strong>${slipped > 0 ? `${plural(slipped, 'day')} later` : 'No change'}</strong>
            </li>
          </ul>
        </div>

        <div class="detail__block detail__block--wide">
          <h4>Stage history</h4>
          <ol class="timeline">
            ${config.stages.map((stage) => raw(timelineItem(config, ws, stage)))}
          </ol>
        </div>
      </div>
    </details>
  `;
}

function dateHint(days) {
  if (days == null) return '';
  if (days < 0) return `${plural(Math.abs(days), 'day')} overdue`;
  if (days === 0) return 'Due today';
  if (days < 60) return `in ${plural(days, 'day')}`;
  return `in about ${plural(Math.round(days / 30), 'month')}`;
}

function riskBadge(config, risk, live) {
  if (live) return html`<span class="badge badge--live">Live</span>`;
  const label = config.risks.find((entry) => entry.id === risk)?.label ?? risk;
  return html`<span class="badge badge--${risk}">${label}</span>`;
}

function stageNote(config, ws) {
  const stage = config.stages.find((entry) => entry.id === ws.stage);
  if (!stage) return '';
  if (isLive(config.stages, ws)) return `Deployed and in use. ${stage.description}`;
  return `${stage.label}, about ${percent(ws.stageProgress)} through this stage. ${stage.description}`;
}

function person(member, fallbackRole) {
  const role = member.role ?? fallbackRole ?? 'Contributor';
  return html`
    <li class="people__item">
      <span class="avatar avatar--sm" aria-hidden="true">${initials(member.name)}</span>
      <span>
        <strong>${member.name}</strong>
        <small>${role}${member.org ? `, ${member.org}` : ''}</small>
      </span>
    </li>
  `;
}

function timelineItem(config, ws, stage) {
  const current = stageIndex(config.stages, ws.stage);
  const index = stageIndex(config.stages, stage.id);
  const entry = (ws.history ?? []).find((item) => item.stage === stage.id);
  const status = index < current ? 'done' : index === current ? 'current' : 'todo';
  const when = entry
    ? entry.to
      ? `${formatDay(entry.from, { short: true })} to ${formatDay(entry.to, { short: true })}`
      : `Started ${formatDay(entry.from, { short: true })}`
    : 'Not started';

  return html`
    <li class="timeline__item timeline__item--${status}">
      <span class="timeline__label">${stage.label}</span>
      <span class="timeline__when">${when}</span>
    </li>
  `;
}

function pipeline(stages, ws) {
  const current = stageIndex(stages, ws.stage);
  const live = isLive(stages, ws);
  return html`
    <ol class="pipeline" aria-label="Stage: ${stages[current]?.label ?? 'Unknown'}">
      ${stages.map((stage, index) => {
        const status = live || index < current ? 'done' : index === current ? 'current' : 'todo';
        return raw(html`
          <li class="pipeline__step pipeline__step--${status}">
            <span class="pipeline__dash" aria-hidden="true"></span>
            <span class="pipeline__text">${stage.short}</span>
          </li>
        `);
      })}
    </ol>
  `;
}
