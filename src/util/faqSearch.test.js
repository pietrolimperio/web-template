import {
  searchFaqItems,
  stemForFaqMatch,
  foldAccents,
  expandHighlightTokens,
} from './faqSearch';

describe('faqSearch stem / fold', () => {
  it('folds accents for comparison', () => {
    expect(foldAccents('perché')).toBe('perche');
    expect(foldAccents('Città')).toBe('Citta');
  });

  it('aligns Italian singular/plural-ish forms', () => {
    expect(stemForFaqMatch('noleggio')).toBe(stemForFaqMatch('noleggi'));
    expect(stemForFaqMatch('domanda')).toBe(stemForFaqMatch('domande'));
    expect(stemForFaqMatch('annuncio')).toBe(stemForFaqMatch('annunci'));
  });

  it('aligns common English plurals', () => {
    expect(stemForFaqMatch('listing')).toBe(stemForFaqMatch('listings'));
    expect(stemForFaqMatch('country')).toBe(stemForFaqMatch('countries'));
  });
});

describe('searchFaqItems', () => {
  const items = [
    {
      id: '1',
      category: 'rent',
      question: 'Come funziona il noleggio?',
      answer: 'Puoi noleggiare oggetti dagli altri utenti.',
    },
    {
      id: '2',
      category: 'lend',
      question: 'Quante domande posso fare?',
      answer: 'Tutte le domande che vuoi.',
    },
  ];

  it('finds same FAQ when query uses plural vs singular keyword', () => {
    const qSing = searchFaqItems(items, 'noleggio');
    const qPlur = searchFaqItems(items, 'noleggi');
    expect(qSing.map(x => x.id)).toContain('1');
    expect(qPlur.map(x => x.id)).toContain('1');
  });

  it('matches domanda / domande', () => {
    const r = searchFaqItems(items, 'domande');
    expect(r.map(x => x.id)).toContain('2');
  });

  it('still requires all tokens (AND)', () => {
    const r = searchFaqItems(items, 'noleggio inesistente');
    expect(r).toHaveLength(0);
  });
});

describe('expandHighlightTokens', () => {
  it('includes inflected words in text for marking', () => {
    const t = expandHighlightTokens('Il noleggio è semplice', ['noleggi']);
    expect(t).toEqual(expect.arrayContaining(['noleggi', 'noleggio']));
  });
});
