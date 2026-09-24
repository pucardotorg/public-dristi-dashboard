/** Resolving person ids, and the monogram shown when there is no photograph. */

const HONORIFICS = new Set(['justice', 'dr', 'mr', 'ms', 'mrs', 'prof']);

/** Eight tones, each of which carries white text at AA. */
export const TONES = 8;

export function index(people) {
  return new Map(people.map((person) => [person.id, person]));
}

export function initials(name) {
  const words = name
    .split(/\s+/)
    .filter((word) => !HONORIFICS.has(word.toLowerCase().replace(/\./g, '')));
  if (!words.length) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Stable per person, so someone keeps the same colour on every screen. */
export function tone(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 9973;
  return hash % TONES;
}

/** Owner first, then the team, without repeats. */
export function contributors(workstream) {
  return [...new Set([workstream.owner, ...(workstream.team ?? [])])];
}

/** Everyone across a set of workstreams, most involved first. */
export function collaborators(workstreams) {
  const counts = new Map();
  for (const ws of workstreams) {
    for (const id of contributors(ws)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);
}

/** Every workstream a person touches, across the courts a reader may see. */
export function assignments(states, personId) {
  const out = [];
  for (const state of states) {
    for (const ws of state.workstreams) {
      if (ws.owner === personId) out.push({ state, ws, role: 'Owner' });
      else if ((ws.team ?? []).includes(personId)) out.push({ state, ws, role: 'Contributor' });
    }
  }
  return out;
}
