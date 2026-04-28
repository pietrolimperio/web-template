import React from 'react';
import { useConfiguration } from '../../../context/configurationContext';
import {
  getCategoryDisplayName,
  getShortLocaleForCategoryDisplay,
} from '../../../util/fieldHelpers';
import { buildCategorySelectionToken, CATEGORY_MULTI_FILTER_PARAM } from '../../../util/search';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './CategoriesStrip.module.css';

/**
 * Custom section: horizontal scroll of 1st-level categories with image and name.
 * Rendered on landing-page at position 1 (after the first Console section).
 * Categories and imageUrl come from config (Leaz backend with includeImages=1).
 */
const CategoriesStrip = ({ sectionId, className }) => {
  const config = useConfiguration();
  const categories = config?.categoryConfiguration?.categories ?? [];
  const shortLocale = getShortLocaleForCategoryDisplay(config);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section id={sectionId} className={className}>
      <div className={css.root}>
        <h2 className={css.title}>
          <FormattedMessage id="CategoriesStrip.title" />
        </h2>
        <ul className={css.list} role="list">
          {categories.map(cat => {
            const displayName = getCategoryDisplayName(cat, shortLocale) || cat.name;
            const categoryToken = buildCategorySelectionToken('categoryId', cat.id);
            const searchQuery = `?${CATEGORY_MULTI_FILTER_PARAM}=${encodeURIComponent(
              categoryToken
            )}`;

            return (
              <li key={cat.id} className={css.item}>
                <NamedLink name="SearchPage" to={{ search: searchQuery }} className={css.link}>
                  <span className={css.imageWrap}>
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className={css.image} loading="lazy" />
                    ) : (
                      <span className={css.placeholder} aria-hidden="true" />
                    )}
                  </span>
                  <span className={css.name}>{displayName}</span>
                </NamedLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default CategoriesStrip;
