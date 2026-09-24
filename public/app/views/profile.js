import { html, mount, raw } from '../html.js';
import { formatDay, plural } from '../format.js';
import { assignments } from '../people.js';
import { avatar, topbar } from './chrome.js';

/** One person: who they are, and everything they are named on. */
export function renderProfile(root, context) {
  const { config, person, states } = context;
  const work = assignments(states, person.id);
  const courts = [...new Set(work.map((item) => item.state.slug))];

  mount(
    root,
    html`
      ${raw(topbar(config, { ...context, route: 'profile' }))}
      <main class="page">
        <a class="back" href="#/court/${context.state?.slug ?? states[0].slug}">Back to the board</a>

        <div class="profile">
          ${raw(avatar(person, { size: 'xl' }))}
          <div class="profile__who">
            <h1>${person.name}</h1>
            <p class="profile__role">${person.role}</p>
            <p class="profile__org">${person.org}${person.based ? ` · ${person.based}` : ''}</p>
          </div>
        </div>

        <section class="section">
          <h2 class="section__title">
            ${work.length
              ? `${plural(work.length, 'workstream')} across ${plural(courts.length, 'court')}`
              : 'Not named on any workstream'}
          </h2>
          ${work.length
            ? raw(html`<ul class="assignments">${work.map((item) => raw(assignment(item, config)))}</ul>`)
            : raw(html`<p class="muted">Nothing in the courts you can see.</p>`)}
        </section>
      </main>
    `
  );
}

function assignment({ state, ws, role }, config) {
  const stage = config.stages.find((entry) => entry.id === ws.stage);
  const live = ws.stage === config.stages.at(-1).id && ws.stageProgress === 100;

  return html`
    <li class="assignments__item" data-stage="${ws.stage}">
      <a class="assignments__link" href="#/court/${state.slug}/ws/${ws.id}">
        <span class="assignments__dot" aria-hidden="true"></span>
        <span class="assignments__text">
          <strong>${ws.name}</strong>
          <small>${state.name} &middot; ${stage?.label ?? ws.stage}</small>
        </span>
        ${role === 'Owner' ? raw(html`<span class="tag">Owner</span>`) : ''}
        <span class="assignments__due">
          ${live ? 'Live' : 'Due'} ${formatDay(live ? ws.liveSince ?? ws.target : ws.target, { short: true })}
        </span>
      </a>
    </li>
  `;
}
