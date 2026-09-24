import { html, raw } from '../html.js';
import { formatDay, plural } from '../format.js';
import { contributors } from '../people.js';
import { avatar } from './chrome.js';

const TYPES = { pdf: 'PDF', doc: 'DOC', sheet: 'XLS', link: 'LINK' };

/** The markup for the one dialog a screen reuses for every detail view. */
export function sheetMarkup() {
  return html`
    <dialog class="sheet" id="sheet" aria-labelledby="sheet-title">
      <button class="sheet__close" type="button" id="sheet-close" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
      <div class="sheet__body" id="sheet-body"></div>
    </dialog>
  `;
}

export function bindSheet(root) {
  const dialog = root.querySelector('#sheet');
  const body = root.querySelector('#sheet-body');

  root.querySelector('#sheet-close').addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the dialog itself, never on its contents.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Following a link out of the sheet should not leave a modal behind.
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('a')) dialog.close();
  });

  const open = (markup, stageId) => {
    if (stageId) dialog.dataset.stage = stageId;
    else delete dialog.dataset.stage;
    body.innerHTML = markup;
    dialog.showModal();
  };

  return {
    workstream: (ws, context) => open(workstreamBody(ws, context), ws.stage),
    people: (details) => open(peopleBody(details))
  };
}

function workstreamBody(ws, { config, people }) {
  const stage = config.stages.find((entry) => entry.id === ws.stage);
  const stageNumber = config.stages.findIndex((entry) => entry.id === ws.stage) + 1;
  const live = ws.stage === config.stages.at(-1).id && ws.stageProgress === 100;
  const team = contributors(ws);

  return html`
    <p class="sheet__stage">
      <span class="stage__number" aria-hidden="true">${stageNumber}</span>
      ${stage?.label ?? ws.stage}
    </p>
    <h2 class="sheet__title" id="sheet-title">${ws.name}</h2>
    <p class="sheet__summary">${ws.summary}</p>

    <dl class="sheet__facts">
      <div>
        <dt>${live ? 'Live since' : 'Deadline'}</dt>
        <dd>${formatDay(live ? ws.liveSince ?? ws.target : ws.target)}</dd>
      </div>
      <div>
        <dt>Stage</dt>
        <dd>${stage?.label ?? ws.stage}</dd>
      </div>
    </dl>

    <section class="sheet__section">
      <h3>Latest</h3>
      <p>${ws.note}</p>
    </section>

    <section class="sheet__section">
      <h3>${plural(team.length, 'person', 'people')} on this</h3>
      <ul class="people">
        ${team.map((id) => raw(personRow(people.get(id), id === ws.owner ? 'Owner' : null)))}
      </ul>
    </section>

    <section class="sheet__section">
      <h3>Files</h3>
      ${ws.files?.length
        ? raw(html`<ul class="files">${ws.files.map((file) => raw(fileRow(file)))}</ul>`)
        : raw(html`<p class="muted">Nothing attached yet.</p>`)}
    </section>
  `;
}

function peopleBody({ title, subtitle, ids, people }) {
  return html`
    <h2 class="sheet__title" id="sheet-title">${title}</h2>
    <p class="sheet__summary">${subtitle}</p>
    <ul class="people people--roomy">${ids.map((id) => raw(personRow(people.get(id))))}</ul>
  `;
}

function personRow(person, badge) {
  if (!person) return '';
  return html`
    <li class="people__item">
      <a class="people__link" href="#/person/${person.id}">
        ${raw(avatar(person))}
        <span class="people__text">
          <strong>${person.name}</strong>
          <small>${person.role}, ${person.org}</small>
        </span>
        ${badge ? raw(html`<span class="tag">${badge}</span>`) : ''}
      </a>
    </li>
  `;
}

function fileRow(file) {
  const label = TYPES[file.type] ?? file.type.toUpperCase();
  const meta = html`<small>Updated ${formatDay(file.updated, { short: true })}</small>`;

  if (file.href) {
    return html`
      <li class="files__item">
        <a class="files__link" href="${file.href}" target="_blank" rel="noopener noreferrer">
          <span class="files__type">${label}</span>
          <span class="files__text"><strong>${file.name}</strong>${raw(meta)}</span>
        </a>
      </li>
    `;
  }

  return html`
    <li class="files__item">
      <span class="files__link files__link--plain">
        <span class="files__type">${label}</span>
        <span class="files__text"><strong>${file.name}</strong>${raw(meta)}</span>
        <span class="tag">Link pending</span>
      </span>
    </li>
  `;
}
