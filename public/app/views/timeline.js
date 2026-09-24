import { html, mount, raw } from '../html.js';
import {
  addDays,
  addMonths,
  dayIndex,
  dayOfMonth,
  isWeekend,
  weekdayInitial,
  formatDay,
  monthLabel,
  monthOf,
  monthIndex,
  plural,
  quarterIndex,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  todayIso,
  weekIndex,
  yearOf
} from '../format.js';
import { collaborators, contributors } from '../people.js';
import { stack, topbar } from './chrome.js';
import { bindSheet, sheetMarkup } from './sheet.js';

/**
 * Each column is one unit of time. A unit knows where to start, how to count
 * from that start, how to step forward, and what to write in the header. The
 * header always has two lines, so the rule under it never breaks.
 */
function monthBand(headings) {
  const groups = [];
  headings.forEach((heading, i) => {
    const last = groups.at(-1);
    if (last && monthOf(last.at) === monthOf(heading.at) && yearOf(last.at) === yearOf(heading.at)) {
      last.span += 1;
      return;
    }
    groups.push({ at: heading.at, label: `${monthLabel(heading.at)} ${yearOf(heading.at)}`, from: i, span: 1 });
  });
  return groups;
}

const UNITS = {
  day: {
    label: 'Days',
    width: '1.55rem',
    origin: (iso) => iso,
    index: dayIndex,
    step: addDays,
    band: monthBand,
    head: (iso) => ({
      primary: String(dayOfMonth(iso)),
      secondary: weekdayInitial(iso),
      weekend: isWeekend(iso)
    })
  },
  week: {
    label: 'Weeks',
    width: '1.7rem',
    origin: startOfWeek,
    index: weekIndex,
    step: (iso, i) => addDays(iso, i * 7),
    band: monthBand,
    head: (iso) => ({ primary: String(dayOfMonth(iso)), secondary: '' })
  },
  month: {
    label: 'Months',
    width: '2.6rem',
    origin: startOfMonth,
    index: monthIndex,
    step: addMonths,
    head: (iso, i) => ({
      primary: monthLabel(iso),
      secondary: i === 0 || monthOf(iso) === 0 ? String(yearOf(iso)) : ''
    })
  },
  quarter: {
    label: 'Quarters',
    width: '4.5rem',
    origin: startOfQuarter,
    index: quarterIndex,
    step: (iso, i) => addMonths(iso, i * 3),
    head: (iso, i) => ({
      primary: `Q${Math.floor(monthOf(iso) / 3) + 1}`,
      secondary: i === 0 || monthOf(iso) === 0 ? String(yearOf(iso)) : ''
    })
  }
};

const view = { stage: 'all', person: 'all', unit: 'month' };

/** Every workstream as a bar from when it started to when it is due. */
export function renderTimeline(root, context) {
  const { config, state, people } = context;

  mount(
    root,
    html`
      ${raw(topbar(config, { ...context, route: 'timeline' }))}
      <main class="page">
        <div class="title">
          <h1>Timeline</h1>
          <p class="title__court">${state.name} &middot; ${state.court}</p>
        </div>
        <div class="filters">
          <label class="filter">
            <span>Scale</span>
            <select class="select" id="filter-unit">
              ${Object.entries(UNITS).map(
                ([id, unit]) => raw(html`
                  <option value="${id}" ${id === view.unit ? raw('selected') : ''}>${unit.label}</option>
                `)
              )}
            </select>
          </label>
          <label class="filter">
            <span>Stage</span>
            <select class="select" id="filter-stage">
              <option value="all">All stages</option>
              ${config.stages.map(
                (stage) => raw(html`
                  <option value="${stage.id}" ${stage.id === view.stage ? raw('selected') : ''}>
                    ${stage.label}
                  </option>
                `)
              )}
            </select>
          </label>
          <label class="filter">
            <span>Person</span>
            <select class="select" id="filter-person">
              <option value="all">Everyone</option>
              ${collaborators(state.workstreams)
                .map((id) => people.get(id))
                .filter(Boolean)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(
                  (person) => raw(html`
                    <option value="${person.id}" ${person.id === view.person ? raw('selected') : ''}>
                      ${person.name}
                    </option>
                  `)
                )}
            </select>
          </label>
          <button class="link" type="button" id="filter-clear">Reset</button>
          <p class="filters__count" id="filter-count" aria-live="polite"></p>
        </div>

        <div class="gantt-wrap"><div class="gantt" id="gantt"></div></div>
      </main>
      ${raw(sheetMarkup())}
    `
  );

  const sheet = bindSheet(root);
  const gantt = root.querySelector('#gantt');
  const count = root.querySelector('#filter-count');

  const paint = () => {
    const rows = state.workstreams.filter((ws) => {
      if (view.stage !== 'all' && ws.stage !== view.stage) return false;
      if (view.person !== 'all' && !contributors(ws).includes(view.person)) return false;
      return true;
    });
    count.textContent = `${plural(rows.length, 'workstream')} shown`;
    draw(gantt, rows, config, UNITS[view.unit], people);
  };

  const onChange = (id, key) =>
    root.querySelector(id).addEventListener('change', (event) => {
      view[key] = event.target.value;
      paint();
    });

  onChange('#filter-unit', 'unit');
  onChange('#filter-stage', 'stage');
  onChange('#filter-person', 'person');

  root.querySelector('#filter-clear').addEventListener('click', () => {
    Object.assign(view, { stage: 'all', person: 'all', unit: 'month' });
    root.querySelector('#filter-unit').value = 'month';
    root.querySelector('#filter-stage').value = 'all';
    root.querySelector('#filter-person').value = 'all';
    paint();
  });

  gantt.addEventListener('click', (event) => {
    const target = event.target.closest('.gantt__bar, .gantt__label');
    if (!target) return;
    const ws = state.workstreams.find((entry) => entry.id === target.dataset.ws);
    if (ws) sheet.workstream(ws, context);
  });

  paint();
  return sheet;
}

function span(ws) {
  const start = ws.history?.[0]?.from ?? ws.baseline;
  const live = ws.stageProgress === 100 && ws.stage === 'deployment';
  return { start, end: live ? ws.liveSince ?? ws.target : ws.target, live };
}

function draw(gantt, rows, config, unit, people) {
  gantt.style.removeProperty('grid-template-columns');
  if (!rows.length) {
    gantt.innerHTML = html`<p class="muted">Nothing matches those filters.</p>`;
    return;
  }

  const bounds = rows.map(span);
  const origin = unit.origin(bounds.map((entry) => entry.start).sort()[0]);
  const columns = unit.index(bounds.map((entry) => entry.end).sort().at(-1), origin) + 1;
  const todayOffset = unit.index(todayIso(), origin);

  const headings = Array.from({ length: columns }, (unused, i) => {
    const at = unit.step(origin, i);
    return { at, ...unit.head(at, i, i > 0 ? unit.step(origin, i - 1) : at) };
  });

  // A band of months above the columns, where the columns are too fine to
  // carry the month themselves.
  const band = unit.band ? unit.band(headings) : [];
  const headerRows = band.length ? 2 : 1;
  const firstRow = headerRows + 1;

  gantt.innerHTML = html`
    <span class="gantt__corner" data-row="1" data-row-span="${headerRows}" data-col="1">
      Workstream
      <small class="is-hidden">.</small>
    </span>
    ${band.map(
      (group) => raw(html`
        <span class="gantt__band" data-row="1" data-col="${group.from + 2}" data-span="${group.span}">
          ${group.label}
        </span>
      `)
    )}
    ${headings.map(
      (heading, i) => raw(html`
        <span
          class="gantt__month ${heading.weekend ? 'is-weekend' : ''}"
          data-row="${headerRows}"
          data-col="${i + 2}"
        >
          ${heading.primary}
          <small class="${heading.secondary ? '' : 'is-hidden'}">${heading.secondary || '.'}</small>
        </span>
      `)
    )}
    ${raw(weekendRuns(headings, rows.length + headerRows))}
    ${todayOffset >= 0 && todayOffset < columns
      ? raw(html`<span class="gantt__today" data-col="${todayOffset + 2}" aria-hidden="true"></span>`)
      : ''}
    ${rows.map((ws, i) => {
      const { start, end, live } = bounds[i];
      const from = Math.max(0, unit.index(start, origin));
      const to = Math.max(from, unit.index(end, origin));
      const stage = config.stages.find((entry) => entry.id === ws.stage);
      return raw(html`
        <button class="gantt__label" type="button" data-row="${firstRow + i}" data-col="1" data-ws="${ws.id}">
          <strong>${ws.name}</strong>
          <small>${stage?.label ?? ws.stage}</small>
        </button>
        <button
          class="gantt__bar"
          type="button"
          data-stage="${ws.stage}"
          data-row="${firstRow + i}"
          data-col="${from + 2}"
          data-span="${to - from + 1}"
          data-ws="${ws.id}"
          title="${ws.name}: ${formatDay(start)} to ${formatDay(end)}"
        >
          ${raw(stack(contributors(ws), people, { max: 3, size: 'xs' }))}
          <span class="gantt__bar-text">${live ? 'Live' : formatDay(end, { short: true })}</span>
        </button>
      `);
    })}
  `;

  // Grid placement goes through the CSSOM, so the content security policy can
  // keep refusing inline style attributes.
  gantt.style.gridTemplateColumns = `var(--gantt-label) repeat(${columns}, minmax(${unit.width}, 1fr))`;
  for (const cell of gantt.children) {
    const { row, rowSpan, col, span: cols } = cell.dataset;
    if (row) cell.style.gridRow = rowSpan ? `${row} / span ${rowSpan}` : row;
    if (col) cell.style.gridColumn = cols ? `${col} / span ${cols}` : col;
  }
  const marker = gantt.querySelector('.gantt__today');
  if (marker) marker.style.gridRow = `1 / span ${rows.length + headerRows}`;

  // A short bar cannot hold faces and a date. Drop them in that order once
  // the grid has settled and the real widths are known.
  for (const bar of gantt.querySelectorAll('.gantt__bar')) {
    const width = bar.offsetWidth;
    bar.classList.toggle('is-tight', width < 150);
    bar.classList.toggle('is-narrow', width < 78);
  }
}

/** Saturdays and Sundays, merged into runs so one element covers a weekend. */
function weekendRuns(headings, rowCount) {
  const runs = [];
  headings.forEach((heading, i) => {
    if (!heading.weekend) return;
    const last = runs.at(-1);
    if (last && last.from + last.span === i) last.span += 1;
    else runs.push({ from: i, span: 1 });
  });

  return runs
    .map(
      (run) => html`
        <span
          class="gantt__weekend"
          data-row="1"
          data-row-span="${rowCount}"
          data-col="${run.from + 2}"
          data-span="${run.span}"
          aria-hidden="true"
        ></span>
      `
    )
    .join('');
}
