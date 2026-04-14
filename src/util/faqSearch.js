/**
 * FAQ in-page search: tokenize query, AND-match on question + answer, rank by relevance.
 * Matching supporta varianti morfologiche leggere (plurale/singolare IT/EN, accenti).
 */

import React from 'react';

export function normalizeSearchQuery(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

/** Rimuove segni diacritici per confronti stabili (è → e, ü → u, …). */
export function foldAccents(str) {
  const s = String(str || '');
  try {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    return s;
  }
}

/**
 * Estrae parole “a parole” dal testo (latin esteso + apostrofo per elisioni).
 * @param {string} str
 * @returns {string[]}
 */
export function extractWordsForFaqSearch(str) {
  const s = String(str || '');
  try {
    return [...s.toLowerCase().matchAll(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)?/gu)].map(m => m[0]);
  } catch {
    const t = s.toLowerCase();
    return t.match(/[0-9a-z\u00c0-\u024f]+(?:'[0-9a-z\u00c0-\u024f]+)?/gi) || [];
  }
}

/**
 * Radice leggera per equivalenze singolare/plurale e piccole flessioni (IT + regole EN comuni).
 * Non è un Porter completo: bilanciamento tra recall e falsi positivi su corpus FAQ breve.
 *
 * @param {string} word
 * @returns {string}
 */
export function stemForFaqMatch(word) {
  let w = foldAccents(String(word).toLowerCase());
  if (w.length <= 2) {
    return w;
  }

  // Inglese: plurali frequenti
  if (w.endsWith('ies') && w.length >= 5) {
    w = w.slice(0, -3) + 'y';
  } else if (w.length >= 5 && w.endsWith('es') && /(ches|shes|xes|zes|oes)$/.test(w)) {
    w = w.slice(0, -2);
  } else if (w.length >= 5 && w.endsWith('s') && !w.endsWith('ss')) {
    const prev = w[w.length - 2];
    if (prev && !'aeiouy'.includes(prev)) {
      w = w.slice(0, -1);
    }
  }

  // Italiano/romanzo: toglie fino a 2 vocali finali (noleggio/noleggi, domanda/domande, …)
  const vowelEnd = /[aeiouy]$/;
  let stripped = 0;
  while (stripped < 2 && w.length > 4 && vowelEnd.test(w)) {
    w = w.slice(0, -1);
    stripped += 1;
  }

  return w;
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function tokenizeSearchQuery(raw) {
  const n = normalizeSearchQuery(raw);
  if (!n) return [];
  return n.split(/\s+/).filter(Boolean);
}

const MIN_STEM_LEN = 3;

/**
 * @param {string} token — già normalizzato lowercase
 * @param {string} hayLower — question o answer in lowercase
 */
function tokenMatchesInFaqHaystack(token, hayLower) {
  if (!token || !hayLower) {
    return false;
  }
  if (hayLower.includes(token)) {
    return true;
  }

  const stem = stemForFaqMatch(token);
  if (stem.length < MIN_STEM_LEN) {
    return false;
  }

  for (const w of extractWordsForFaqSearch(hayLower)) {
    if (stemForFaqMatch(w) === stem) {
      return true;
    }
  }

  // Fallback: radice sufficientemente lunga compare come sottostringa (frasi lunghe)
  if (stem.length >= 5 && hayLower.includes(stem)) {
    return true;
  }

  return false;
}

/**
 * Filter and rank FAQ items. Every token must appear in question or answer (case-insensitive),
 * con tolleranza su plurali/lemma leggero. Higher score = more tokens matched in the question title.
 *
 * @param {Array<{ id: string, question: string, answer: string }>} items
 * @param {string} rawQuery
 * @returns {Array<{ id: string, question: string, answer: string, category?: string }>} ordered results
 */
export function searchFaqItems(items, rawQuery) {
  const tokens = tokenizeSearchQuery(rawQuery);
  if (!tokens.length || !items?.length) {
    return [];
  }

  const scored = [];

  items.forEach((item, index) => {
    const hayQ = (item.question || '').toLowerCase();
    const hayA = (item.answer || '').toLowerCase();
    let score = 0;
    for (const t of tokens) {
      const inQExact = hayQ.includes(t);
      const inAExact = hayA.includes(t);
      const inQStem = !inQExact && tokenMatchesInFaqHaystack(t, hayQ);
      const inAStem = !inAExact && tokenMatchesInFaqHaystack(t, hayA);

      if (inQExact) {
        score += 4;
      } else if (inQStem) {
        score += 3;
      } else if (inAExact) {
        score += 1;
      } else if (inAStem) {
        score += 1;
      } else {
        return;
      }
    }
    scored.push({ item, score, index });
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.map(s => s.item);
}

export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pattern per evidenziazione: token originali + parole nel testo che condividono la stessa radice.
 *
 * @param {string} text
 * @param {string[]} tokens - lowercase da tokenizeSearchQuery
 * @returns {string[]}
 */
export function expandHighlightTokens(text, tokens) {
  const set = new Set();
  const usable = [...tokens].filter(Boolean);
  for (const t of usable) {
    set.add(t);
  }
  const safe = String(text || '');
  const words = extractWordsForFaqSearch(safe);
  for (const t of usable) {
    const st = stemForFaqMatch(t);
    if (st.length < MIN_STEM_LEN) {
      continue;
    }
    for (const w of words) {
      if (stemForFaqMatch(w) === st) {
        set.add(w.toLowerCase());
      }
    }
  }
  return [...set].sort((a, b) => b.length - a.length);
}

/**
 * Split text and wrap matches in <mark> nodes (React-safe array of strings + elements).
 *
 * @param {string} text
 * @param {string[]} tokens - lowercase tokens from tokenizeSearchQuery
 * @param {string} markClassName - CSS module class for <mark>
 * @returns {Array<string|React.ReactElement>}
 */
export function highlightSearchMatches(text, tokens, markClassName) {
  const safe = String(text || '');
  const usable = expandHighlightTokens(safe, tokens).filter(t => t.length > 0);
  if (!usable.length) {
    return [safe];
  }

  const pattern = usable.map(escapeRegExp).join('|');
  if (!pattern) {
    return [safe];
  }

  const re = new RegExp(`(${pattern})`, 'gi');
  const out = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = re.exec(safe)) !== null) {
    if (match.index > lastIndex) {
      out.push(safe.slice(lastIndex, match.index));
    }
    const chunk = match[0];
    out.push(React.createElement('mark', { key: `h-${key++}`, className: markClassName }, chunk));
    lastIndex = match.index + chunk.length;
    if (chunk.length === 0) {
      re.lastIndex += 1;
    }
  }

  if (lastIndex < safe.length) {
    out.push(safe.slice(lastIndex));
  }

  return out.length ? out : [safe];
}
