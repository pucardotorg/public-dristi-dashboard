/** Dates. Everything in the data files is a plain ISO day, handled in UTC. */

const LONG = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const SHORT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' });

const DAY = 86400000;

export function parseDay(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const toIso = (date) => date.toISOString().slice(0, 10);

export function formatDay(iso, { short = false } = {}) {
  const date = parseDay(iso);
  if (!date) return 'not set';
  return (short ? SHORT : LONG).format(date);
}

export function todayIso() {
  return toIso(new Date());
}

export function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/* ------------------------------------------------- Timeline unit arithmetic */

export const monthLabel = (iso) => (parseDay(iso) ? MONTH.format(parseDay(iso)) : '');
export const yearOf = (iso) => parseDay(iso)?.getUTCFullYear() ?? 0;
export const monthOf = (iso) => parseDay(iso)?.getUTCMonth() ?? 0;
export const dayOfMonth = (iso) => parseDay(iso)?.getUTCDate() ?? 0;

export function addDays(iso, count) {
  const date = parseDay(iso);
  return date ? toIso(new Date(date.getTime() + count * DAY)) : iso;
}

export function addMonths(iso, count) {
  const date = parseDay(iso);
  if (!date) return iso;
  return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, date.getUTCDate())));
}

/** Weeks start on Monday, which is how court calendars read. */
export function startOfWeek(iso) {
  const date = parseDay(iso);
  if (!date) return iso;
  const shift = (date.getUTCDay() + 6) % 7;
  return addDays(iso, -shift);
}

export function startOfMonth(iso) {
  const date = parseDay(iso);
  return date ? toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))) : iso;
}

export function startOfQuarter(iso) {
  const date = parseDay(iso);
  if (!date) return iso;
  return toIso(new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1)));
}

/** Sunday first, matching getUTCDay. */
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function weekdayInitial(iso) {
  const date = parseDay(iso);
  return date ? WEEKDAY_INITIALS[date.getUTCDay()] : '';
}

export function isWeekend(iso) {
  const day = parseDay(iso)?.getUTCDay();
  return day === 0 || day === 6;
}

export function dayIndex(iso, originIso) {
  const date = parseDay(iso);
  const origin = parseDay(originIso);
  if (!date || !origin) return 0;
  return Math.round((date - origin) / DAY);
}

export function weekIndex(iso, originIso) {
  const date = parseDay(startOfWeek(iso));
  const origin = parseDay(startOfWeek(originIso));
  if (!date || !origin) return 0;
  return Math.round((date - origin) / (7 * DAY));
}

export function monthIndex(iso, originIso) {
  const date = parseDay(iso);
  const origin = parseDay(originIso);
  if (!date || !origin) return 0;
  return (date.getUTCFullYear() - origin.getUTCFullYear()) * 12 + (date.getUTCMonth() - origin.getUTCMonth());
}

export function quarterIndex(iso, originIso) {
  return Math.floor(monthIndex(startOfQuarter(iso), startOfQuarter(originIso)) / 3);
}
