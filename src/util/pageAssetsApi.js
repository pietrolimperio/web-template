import { DEFAULT_LOCALE } from '../config/localeConfig';

const CACHE_TTL_MS = 15 * 60 * 1000;
const cacheByKeyAndLocale = new Map();

const textValue = value => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
};

const normalizeItems = items => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map(item =>
      typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
        ? { title: '', text: textValue(item), label: '' }
        : {
            title: textValue(item?.title),
            text: textValue(item?.text),
            label: textValue(item?.label),
          }
    )
    .filter(item => item.title || item.text || item.label);
};

export const normalizePageAssetResponse = data => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const pageKey = textValue(data.pageKey);
  const title = textValue(data.title);
  const sections = Array.isArray(data.sections)
    ? data.sections
        .map(section => {
          const id = textValue(section?.id);
          const sectionTitle = textValue(section?.title);
          const blocks = Array.isArray(section?.blocks)
            ? section.blocks
                .map(block => {
                  const type = textValue(block?.type);
                  const text = textValue(block?.text);
                  const items = normalizeItems(block?.items);
                  return { type, text, items };
                })
                .filter(block => block.type && (block.text || block.items.length > 0))
            : [];

          return { id, title: sectionTitle, blocks };
        })
        .filter(section => section.id && section.title && section.blocks.length > 0)
    : [];

  if (!pageKey || !title || sections.length === 0) {
    return null;
  }

  const navigation = Array.isArray(data.navigation)
    ? data.navigation
        .map(item => ({
          sectionId: textValue(item?.sectionId),
          label: textValue(item?.label),
        }))
        .filter(item => item.sectionId && item.label)
    : [];

  return {
    pageKey,
    locale: textValue(data.locale),
    title,
    lastUpdated: textValue(data.lastUpdated),
    navigation,
    sections,
    status: textValue(data.status),
    createdAt: textValue(data.createdAt),
    updatedAt: textValue(data.updatedAt),
  };
};

const getBrowserLocale = fallbackLocale => {
  if (fallbackLocale) {
    return fallbackLocale;
  }
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return DEFAULT_LOCALE;
  }
  return localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE;
};

export const fetchPageAsset = (pageKey, locale) => {
  const baseUrl =
    process.env.REACT_APP_LEAZ_BACKEND_URL || process.env.REACT_APP_LEAZ_BACKEND_API_URL;

  if (!baseUrl || !pageKey) {
    return Promise.resolve({ data: null, status: 'unavailable' });
  }

  const loc = getBrowserLocale(locale);
  const cacheKey = `${pageKey}:${loc}`;
  const now = Date.now();
  const cached = cacheByKeyAndLocale.get(cacheKey);
  if (cached && cached.expiry > now) {
    return Promise.resolve({ data: cached.data, status: 'ok' });
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/services/page-assets/${encodeURIComponent(
    pageKey
  )}?locale=${encodeURIComponent(loc)}`;

  return fetch(url, { method: 'GET', credentials: 'omit' })
    .then(res => {
      if (res.status === 404) {
        return { data: null, status: 'not_found' };
      }
      if (!res.ok) {
        return { data: null, status: 'error' };
      }
      return res.json().then(json => {
        const normalized = normalizePageAssetResponse(json);
        if (!normalized) {
          return { data: null, status: 'error' };
        }
        cacheByKeyAndLocale.set(cacheKey, { data: normalized, expiry: now + CACHE_TTL_MS });
        return { data: normalized, status: 'ok' };
      });
    })
    .catch(() => ({ data: null, status: 'error' }));
};

export const clearPageAssetCache = () => {
  cacheByKeyAndLocale.clear();
};
