/**
 * FAQ API: fetch localized FAQ payload from Leaz backend with in-memory TTL cache.
 *
 * Expected endpoint (backend):
 *   GET {REACT_APP_LEAZ_BACKEND_API_URL}/api/services/faq?locale=it-IT
 *
 * See backend handoff notes in the project README or ask the team for the OpenAPI spec.
 *
 * Behaviour:
 * - Cache per locale (TTL) to limit traffic; FAQs change infrequently.
 * - Retries on 429 like categoriesApi.
 * - Returns null if URL missing, disabled, network error, empty payload, or non-OK status → caller uses static i18n fallback.
 */

import { DEFAULT_LOCALE } from '../config/localeConfig';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RETRY_AFTER_429_MS = 3000;
const MAX_RETRIES_429 = 2;

/** @type {Map<string, { data: object, expiry: number }>} */
const cacheByLocale = new Map();

/**
 * @param {unknown} data - raw JSON from API
 * @returns {{ categories: Array<{id: string, title: string, description: string, tag: string}>, items: Array<{id: string, category: string, question: string, answer: string}> } | null}
 */
export function normalizeFaqResponse(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const rawCategories = data.categories ?? data.categoryCards ?? [];
  const rawItems = data.items ?? data.faqs ?? data.questions ?? [];

  const categories = [];
  for (const c of rawCategories) {
    const id = c.id ?? c.slug;
    if (!id || typeof id !== 'string') {
      continue;
    }
    const title = c.title ?? c.name ?? '';
    const description = c.description ?? c.body ?? c.subtitle ?? '';
    const tag = c.tag ?? c.badge ?? c.label ?? '';
    categories.push({ id, title, description, tag });
  }

  const items = [];
  for (const row of rawItems) {
    const id = row.id ?? row.slug;
    const category = row.categoryId ?? row.category ?? row.topic;
    if (!id || !category || typeof id !== 'string' || typeof category !== 'string') {
      continue;
    }
    const question = row.question ?? row.q ?? '';
    const answer = row.answer ?? row.a ?? row.body ?? '';
    if (!question && !answer) {
      continue;
    }
    items.push({ id: String(id), category: String(category), question, answer });
  }

  if (items.length === 0) {
    return null;
  }

  return { categories, items };
}

function getBrowserLocale() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return DEFAULT_LOCALE;
  }
  return localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE;
}

/**
 * @param {string} [locale] - BCP 47 locale (e.g. it-IT). Defaults to marketplace_locale or DEFAULT_LOCALE.
 * @returns {Promise<object | null>} Normalized payload or null to use static fallback
 */
export function fetchFaqContent(locale) {
  const baseUrl = process.env.REACT_APP_LEAZ_BACKEND_API_URL;
  const disabled =
    process.env.REACT_APP_FAQ_API_DISABLED === 'true' ||
    process.env.REACT_APP_FAQ_API_DISABLED === '1';

  if (!baseUrl || disabled) {
    return Promise.resolve(null);
  }

  const loc = locale || getBrowserLocale();
  const now = Date.now();
  const cached = cacheByLocale.get(loc);
  if (cached && cached.expiry > now) {
    return Promise.resolve(cached.data);
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/services/faq?locale=${encodeURIComponent(loc)}`;

  const doFetch = (retriesLeft = MAX_RETRIES_429) =>
    fetch(url, { method: 'GET', credentials: 'omit' })
      .then(res => {
        if (res.status === 429 && retriesLeft > 0) {
          return new Promise((resolve, reject) => {
            setTimeout(
              () => doFetch(retriesLeft - 1).then(resolve).catch(reject),
              RETRY_AFTER_429_MS
            );
          });
        }
        if (!res.ok) {
          return null;
        }
        return res.json();
      })
      .then(json => {
        const normalized = normalizeFaqResponse(json);
        if (!normalized) {
          return null;
        }
        const version = json && typeof json === 'object' ? json.version ?? json.cacheVersion : undefined;
        const payload = { ...normalized, version };
        cacheByLocale.set(loc, { data: payload, expiry: now + CACHE_TTL_MS });
        return payload;
      })
      .catch(() => null);

  return doFetch();
}

export function clearFaqCache() {
  cacheByLocale.clear();
}
