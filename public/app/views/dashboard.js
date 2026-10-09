import { html, mount, raw } from '../html.js';
import { formatDay, plural } from '../format.js';
import { collaborators, contributors } from '../people.js';
import { STATUSES, isLive, progressOf, statusOf } from '../progress.js';
import { stack, topbar } from './chrome.js';
import { bindSheet, sheetMarkup } from './sheet.js';

/**
 * One column per stage, every workstream sitting in the column it has reached.
 * The stages are the structure of the page, so what they are and what order
 * they run in is the first thing a reader takes in. A card opens its detail,
 * a stack of faces opens the people at that stage.
 */
export function renderDashboard(root, context) {
  const { config, state, people } = context;
  const byStage = new Map(config.stages.map((entry) => [entry.id, []]));
  for (const ws of state.workstreams) byStage.get(ws.stage)?.push(ws);

  mount(
    root,
    html`
      ${raw(topbar(config, { ...context, route: 'board' }))}
      <main class="page">
        <div class="title">
          <h1>${state.name}</h1>
          <p class="title__court">${state.court}</p>
          <p class="title__updated">Updated ${formatDay(state.updated)}</p>
        </div>

        <ul class="legend" aria-label="What the progress colours mean">
          ${STATUSES.map(
            (status) => raw(html`<li class="legend__item" data-status="${status.id}">${status.label}</li>`)
          )}
        </ul>

        <ol class="board">
          ${config.stages.map(
            (stage, index) => raw(column(stage, index, byStage.get(stage.id), people, config.stages))
          )}
        </ol>
      </main>
      ${raw(sheetMarkup())}
    `
  );

  const sheet = bindSheet(root);
  const find = (id) => state.workstreams.find((ws) => ws.id === id);

  root.querySelector('.board').addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (card) {
      sheet.workstream(find(card.dataset.ws), context);
      return;
    }

    const faces = event.target.closest('.stack');
    if (!faces) return;
    const stageId = faces.closest('.stage').dataset.stage;
    const stage = config.stages.find((entry) => entry.id === stageId);
    const ids = collaborators(byStage.get(stageId));
    sheet.people({
      title: stage.label,
      subtitle: `${plural(ids.length, 'person', 'people')} across ${plural(
        byStage.get(stageId).length,
        'workstream'
      )} at this stage.`,
      ids,
      people
    });
  });

  return sheet;
}

function column(stage, index, workstreams, people, stages) {
  const ids = collaborators(workstreams);

  return html`
    <li class="stage" data-stage="${stage.id}">
      <div class="stage__top">
        <div class="stage__head">
          <span class="stage__number" aria-hidden="true">${index + 1}</span>
          <h2 class="stage__label">${stage.label}</h2>
          <span class="stage__count">${workstreams.length}</span>
        </div>
        <p class="stage__desc">${stage.description}</p>
        ${ids.length
          ? raw(html`
              <button
                class="stack"
                type="button"
                aria-label="${plural(ids.length, 'person', 'people')} at ${stage.label}"
              >
                ${raw(stack(ids, people))}
                <span class="stack__count">${plural(ids.length, 'person', 'people')}</span>
              </button>
            `)
          : ''}
      </div>
      <ul class="stage__list">
        ${workstreams.length
          ? workstreams.map((ws) => raw(card(ws, people, stages)))
          : raw('<li class="stage__none">None yet</li>')}
      </ul>
    </li>
  `;
}

function card(ws, people, stages) {
  const live = isLive(stages, ws);
  const due = live ? ws.liveSince ?? ws.target : ws.target;
  const percent = progressOf(stages, ws);
  const status = statusOf(stages, ws);
  const label = STATUSES.find((entry) => entry.id === status).label;

  return html`
    <li>
      <button class="card" type="button" data-ws="${ws.id}">
        <span class="card__name">${ws.name}</span>
        <span class="card__progress" data-status="${status}">
          <progress
            class="meter"
            value="${percent}"
            max="100"
            aria-label="${ws.name}: ${percent}% complete, ${label.toLowerCase()}"
          ></progress>
          <span class="card__status">${status === 'in-progress' ? `${percent}%` : label}</span>
        </span>
        <span class="card__foot">
          <span class="card__due">${live ? 'Live' : 'Due'} ${formatDay(due, { short: true })}</span>
          ${raw(stack(contributors(ws), people, { max: 3 }))}
        </span>
      </button>
    </li>
  `;
}
