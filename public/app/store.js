/** Loads the JSON that the scheduled update job rewrites. */
const cache = new Map();

async function getJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path, { cache: 'no-cache' }).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
        return response.json();
      })
    );
  }
  try {
    return await cache.get(path);
  } catch (error) {
    cache.delete(path);
    throw error;
  }
}

export const loadConfig = () => getJson('data/config.json');
export const loadAccess = () => getJson('data/access.json');
export const loadPeople = () => getJson('data/people.json');
export const loadState = (slug) => getJson(`data/${slug}.json`);
