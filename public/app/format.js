/** Date and text helpers. Dates in the data files are plain ISO days. */

const LONG = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const SHORT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function parseDay(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function today() {
  return parseDay(new Date().toISOString().slice(0, 10));
}

export function formatDay(iso, { short = false } = {}) {
  const date = parseDay(iso);
  if (!date) return 'Not set';
  return (short ? SHORT : LONG).format(date);
}

export function daysBetween(fromIso, toIso) {
  const from = parseDay(fromIso);
  const to = parseDay(toIso);
  if (!from || !to) return null;
  return Math.round((to - from) / 86400000);
}

export function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function percent(value) {
  return `${Math.round(value)}%`;
}
