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
});
