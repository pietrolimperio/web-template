/**
 * Categories API: fetch categories from Leaz backend with in-memory cache.
 *
 * - GET {REACT_APP_LEAZ_BACKEND_API_URL}/api/services/categories?includeTranslations=1
 * - Response: each node has id, name (base for storage), translations: { en, it, fr, de, es, pt }
 * - No auth headers
 * - Cache in memory (TTL) to avoid repeated requests and respect rate limit (60/min per IP)
 * - Normalizes API response (subcategory -> subcategories) and keeps name + translations
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RETRY_AFTER_429_MS = 3000;
const MAX_RETRIES_429 = 2;

let cache = null;
let cacheExpiry = 0;

/**
 * Normalize API shape: subcategory -> subcategories, keep name and translations for each node.
 * @param {Array} items - array of { id, name, translations?, subcategory?, sub-subcategory? }
 * @returns {Array} array of { id, name, translations, subcategories }
 */
function normalizeToSubcategories(items) {
  if (!items || !Array.isArray(items)) return [];
  return items.map(({ id, name, translations, subcategory, 'sub-subcategory': subSubcategory }) => {
    const children = subcategory || subSubcategory || [];
    return {
      id,
      name: name ?? '',
      translations: translations && typeof translations === 'object' ? translations : {},
      subcategories: normalizeToSubcategories(children),
    };
  });
}

/**
 * @returns {Promise<{ categories: Array }>} Categories with name (for storage) and translations (for display)
 */
export function fetchCategories() {
  const baseUrl = process.env.REACT_APP_LEAZ_BACKEND_API_URL;
  if (!baseUrl) {
    return Promise.resolve({ categories: [] });
  }

  const now = Date.now();
  if (cache && cacheExpiry > now) {
    return Promise.resolve(cache);
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/services/categories?includeTranslations=1`;

  const doFetch = (retriesLeft = MAX_RETRIES_429) =>
    fetch(url, { method: 'GET' })
      .then(res => {
        if (res.status === 429 && retriesLeft > 0) {
          return new Promise((resolve, reject) => {
            setTimeout(() => doFetch(retriesLeft - 1).then(resolve).catch(reject), RETRY_AFTER_429_MS);
          });
        }
        if (!res.ok) {
          throw new Error(`Categories API error: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        const rawCategories = data?.categories ?? [];
        const categories = normalizeToSubcategories(rawCategories);
        const result = { categories };
        cache = result;
        cacheExpiry = now + CACHE_TTL_MS;
        return result;
      });

  return doFetch();
}

/**
 * Clear in-memory cache (e.g. for tests or force refresh).
 */
export function clearCategoriesCache() {
  cache = null;
  cacheExpiry = 0;
}
