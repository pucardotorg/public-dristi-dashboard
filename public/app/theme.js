/** Light and dark follow the operating system unless the reader picks one. */
const KEY = 'pucar.theme.v1';

function read() {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function write(theme) {
  try {
    if (theme) localStorage.setItem(KEY, theme);
    else localStorage.removeItem(KEY);
  } catch {
    /* Storage is optional. */
  }
}

export function initTheme() {
  const stored = read();
  if (stored) document.documentElement.dataset.theme = stored;
}

export function currentTheme() {
  return (
    document.documentElement.dataset.theme ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  write(next);
  return next;
}
