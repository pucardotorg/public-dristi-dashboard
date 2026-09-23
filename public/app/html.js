/**
 * Minimal HTML templating. Interpolated values are escaped unless wrapped in
 * raw(), so anything coming out of a data file cannot inject markup.
 */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function resolve(value) {
  if (value == null || value === false || value === true) return '';
  if (Array.isArray(value)) return value.map(resolve).join('');
  if (typeof value === 'object' && 'raw' in value) return value.raw;
  return escape(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += resolve(values[i]) + strings[i + 1];
  return out;
}

export const raw = (value) => ({ raw: String(value) });

export function mount(node, markup) {
  node.innerHTML = markup;
  return node;
}
