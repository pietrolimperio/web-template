/**
 * FAQ in-page search: tokenize query, AND-match on question + answer, rank by relevance.
 */

import React from 'react';

export function normalizeSearchQuery(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase();
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

/**
 * Filter and rank FAQ items. Every token must appear in question or answer (case-insensitive).
 * Higher score = more tokens matched in the question title.
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
      if (hayQ.includes(t)) {
        score += 4;
      } else if (hayA.includes(t)) {
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
 * Split text and wrap matches in <mark> nodes (React-safe array of strings + elements).
 *
 * @param {string} text
 * @param {string[]} tokens - lowercase tokens from tokenizeSearchQuery
 * @param {string} markClassName - CSS module class for <mark>
 * @returns {Array<string|React.ReactElement>}
 */
export function highlightSearchMatches(text, tokens, markClassName) {
  const safe = String(text || '');
  const usable = [...tokens].filter(t => t.length > 0).sort((a, b) => b.length - a.length);
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
