import { normalizePageAssetResponse } from './pageAssetsApi';

describe('pageAssetsApi', () => {
  it('normalizes structured page asset content', () => {
    const normalized = normalizePageAssetResponse({
      pageKey: 'privacy-policy',
      locale: 'it-IT',
      title: 'Privacy Policy',
      lastUpdated: 'October 24, 2024',
      navigation: [{ sectionId: 'introduction', label: 'Introduction' }],
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          blocks: [
            { type: 'paragraph', text: 'Plain text only.' },
            { type: 'bullets', items: ['First item', { text: 'Second item' }] },
            {
              type: 'actions',
              items: [{ label: 'Request Account Deletion', href: 'mailto:privacy@leaz.eu' }],
            },
          ],
        },
      ],
      status: 'published',
    });

    expect(normalized).toMatchObject({
      pageKey: 'privacy-policy',
      locale: 'it-IT',
      title: 'Privacy Policy',
      navigation: [{ sectionId: 'introduction', label: 'Introduction' }],
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          blocks: [
            { type: 'paragraph', text: 'Plain text only.' },
            {
              type: 'bullets',
              items: [
                { title: '', text: 'First item', label: '' },
                { title: '', text: 'Second item', label: '' },
              ],
            },
            {
              type: 'actions',
              items: [
                {
                  title: '',
                  text: '',
                  label: 'Request Account Deletion',
                  href: 'mailto:privacy@leaz.eu',
                },
              ],
            },
          ],
        },
      ],
      status: 'published',
    });
  });

  it('rejects unusable page asset payloads', () => {
    expect(normalizePageAssetResponse({ pageKey: 'privacy-policy', sections: [] })).toBeNull();
    expect(normalizePageAssetResponse(null)).toBeNull();
  });

  it('preserves generic explore categories block fields as plain text', () => {
    const normalized = normalizePageAssetResponse({
      pageKey: 'explore-categories',
      locale: 'en-GB',
      title: 'Explore categories',
      sections: [
        {
          id: 'hero',
          title: 'Hero',
          blocks: [
            {
              type: 'hero',
              kicker: '<strong>Catalog</strong>',
              title: 'Everything you want',
              text: 'Plain text only.',
            },
          ],
        },
        {
          id: 'category-groups',
          title: 'Categories',
          blocks: [
            {
              type: 'category-grid',
              items: [
                {
                  key: 'diy',
                  categoryIndex: 0,
                  title: 'DIY',
                  text: 'Tools',
                  imageUrl: 'https://example.com/diy.png',
                  imageKey: 'diy',
                  icon: 'build',
                  accent: '#ff5a02',
                  items: ['Power tools'],
                },
              ],
            },
          ],
        },
      ],
      status: 'published',
    });

    expect(normalized.sections[0].blocks[0]).toMatchObject({
      type: 'hero',
      kicker: '<strong>Catalog</strong>',
      title: 'Everything you want',
      text: 'Plain text only.',
    });
    expect(normalized.sections[1].blocks[0].items[0]).toMatchObject({
      key: 'diy',
      categoryIndex: 0,
      title: 'DIY',
      imageUrl: 'https://example.com/diy.png',
      imageKey: 'diy',
      icon: 'build',
      accent: '#ff5a02',
      items: ['Power tools'],
    });
  });
});
