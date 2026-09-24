import { html, raw } from '../html.js';
import { initials, tone } from '../people.js';
import { currentTheme } from '../theme.js';

/** The bar every screen shares: brand, view switch, court switch, session. */
export function topbar(config, { state, session, route }) {
  const courts = config.states.filter((option) => session.states.includes(option.slug));
  const slug = state?.slug ?? courts[0]?.slug;

  return html`
    <header class="topbar">
      <a class="topbar__brand" href="#/court/${slug}">${config.title}</a>
      <nav class="topbar__actions">
        ${state
          ? raw(html`
              <span class="segmented" role="group" aria-label="View">
                <a class="segmented__item ${route === 'board' ? 'is-on' : ''}" href="#/court/${state.slug}">Board</a>
                <a class="segmented__item ${route === 'timeline' ? 'is-on' : ''}" href="#/court/${state.slug}/timeline">
                  Timeline
                </a>
              </span>
            `)
          : ''}
        ${courts.length > 1 && state
          ? raw(html`
              <select class="select" id="state-switch" aria-label="Court">
                ${courts.map(
                  (option) => raw(html`
                    <option value="${option.slug}" ${option.slug === state.slug ? raw('selected') : ''}>
                      ${option.name}
                    </option>
                  `)
                )}
              </select>
            `)
          : ''}
        <button class="link" type="button" id="theme">${currentTheme() === 'dark' ? 'Light' : 'Dark'}</button>
        <button class="link" type="button" id="sign-out">Sign out</button>
      </nav>
    </header>
  `;
}

/** Wires the controls that appear on every screen. */
export function bindChrome(root, { onSwitchState, onSignOut, onThemeChange }) {
  const theme = root.querySelector('#theme');
  theme?.addEventListener('click', () => {
    theme.textContent = onThemeChange() === 'dark' ? 'Light' : 'Dark';
  });
  root.querySelector('#sign-out')?.addEventListener('click', onSignOut);
  root.querySelector('#state-switch')?.addEventListener('change', (event) => onSwitchState(event.target.value));
}

/** A single monogram, or a photograph once one exists. */
export function avatar(person, { size = '' } = {}) {
  if (!person) return '';
  const classes = `avatar avatar--t${tone(person.id)}${size ? ` avatar--${size}` : ''}`;
  if (person.photo) {
    return html`<img class="${classes}" src="${person.photo}" alt="${person.name}" />`;
  }
  return html`<span class="${classes}" aria-hidden="true">${initials(person.name)}</span>`;
}

/** Overlapping monograms, capped, with a count for the remainder. */
export function stack(ids, people, { max = 4, size = 'sm' } = {}) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return html`
    <span class="stack__faces">
      ${shown.map((id) => raw(avatar(people.get(id), { size })))}
      ${extra > 0 ? raw(html`<span class="avatar avatar--${size} avatar--more">+${extra}</span>`) : ''}
    </span>
  `;
}
