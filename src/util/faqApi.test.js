import {
  normalizeFaqResponse,
  sanitizeFaqAccentColor,
  sanitizeFaqIconUrl,
} from './faqApi';

describe('sanitizeFaqAccentColor', () => {
  it('accepts safe hex', () => {
    expect(sanitizeFaqAccentColor('#0560e1')).toBe('#0560e1');
    expect(sanitizeFaqAccentColor('#abc')).toBe('#abc');
  });
  it('rejects empty and unsafe', () => {
    expect(sanitizeFaqAccentColor('')).toBe('');
    expect(sanitizeFaqAccentColor('red')).toBe('');
    expect(sanitizeFaqAccentColor('url(x)')).toBe('');
  });
});

describe('sanitizeFaqIconUrl', () => {
  it('accepts http(s)', () => {
    expect(sanitizeFaqIconUrl('https://api.iconify.design/mdi/information-outline.svg')).toBe(
      'https://api.iconify.design/mdi/information-outline.svg'
    );
  });
  it('rejects empty and non-http', () => {
    expect(sanitizeFaqIconUrl('')).toBe('');
    expect(sanitizeFaqIconUrl('javascript:alert(1)')).toBe('');
  });
});

describe('normalizeFaqResponse', () => {
  it('passes through color and iconUrl on categories', () => {
    const out = normalizeFaqResponse({
      categories: [
        {
          id: 'cat-a',
          title: 'A',
          description: 'd',
          tag: 't',
          color: '#0560e1',
          iconUrl: 'https://example.com/i.svg',
        },
        {
          id: 'cat-b',
          title: 'B',
          description: '',
          tag: '',
          color: '',
          iconUrl: '',
        },
      ],
      items: [{ id: '1', category: 'cat-a', question: 'Q?', answer: 'A.' }],
    });
    expect(out.categories[0].color).toBe('#0560e1');
    expect(out.categories[0].iconUrl).toBe('https://example.com/i.svg');
    expect(out.categories[1].color).toBe('');
    expect(out.categories[1].iconUrl).toBe('');
  });
});
