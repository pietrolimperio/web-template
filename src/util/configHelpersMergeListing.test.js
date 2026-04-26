import { mergeConfig } from './configHelpers';
import { getDefaultConfiguration, getHostedConfiguration } from './testHelpers';

describe('mergeConfig listing fields', () => {
  it('keeps local listing fields even when hosted listing fields are present', () => {
    const hostedConfig = getHostedConfiguration();
    const defaultConfig = getDefaultConfiguration();

    const merged = mergeConfig(hostedConfig, defaultConfig);
    const handByHandField = merged.listing.listingFields.find(
      field => field.key === 'handByHandAvailable'
    );

    expect(handByHandField).toBeTruthy();
    expect(handByHandField.schemaType).toBe('boolean');
    expect(handByHandField.filterConfig.indexForSearch).toBe(true);
    expect(handByHandField.filterConfig.toggleOnly).toBe(true);
    expect(handByHandField.filterConfig.orderAfter).toBe('price');
  });
});
