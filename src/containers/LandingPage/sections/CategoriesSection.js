import React from 'react';
import { useConfiguration } from '../../../context/configurationContext';
import {
  getCategoryDisplayName,
  getShortLocaleForCategoryDisplay,
} from '../../../util/fieldHelpers';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './CategoriesSection.module.css';

const FallbackIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={css.cardIcon}
  >
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <polyline points="16 3 12 7 8 3" />
  </svg>
);

const CategoriesSection = () => {
  const config = useConfiguration();
  const categories = config?.categoryConfiguration?.categories ?? [];
  const shortLocale = getShortLocaleForCategoryDisplay(config);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section id="categories" className={css.root}>
      <div className={css.container}>
        <div className={css.header}>
          <div>
            <h2 className={css.title}>
              <FormattedMessage id="NewLandingPage.categoriesTitle" />
            </h2>
            <p className={css.subtitle}>
              <FormattedMessage id="NewLandingPage.categoriesSubtitle" />
            </p>
          </div>
          <NamedLink name="SearchPage" className={css.viewAllLink}>
            <FormattedMessage id="NewLandingPage.categoriesViewAll" />
            <span className={css.arrow}>&rarr;</span>
          </NamedLink>
        </div>

        <div className={css.grid}>
          {categories.map(cat => {
            const displayName =
              getCategoryDisplayName(cat, shortLocale) || cat.name;
            const searchQuery = `?pub_categoryId=${encodeURIComponent(cat.id)}`;

            return (
              <NamedLink
                key={cat.id}
                name="SearchPage"
                to={{ search: searchQuery }}
                className={css.card}
              >
                <span className={css.iconCircle}>
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt=""
                      className={css.cardImage}
                      loading="lazy"
                    />
                  ) : (
                    <FallbackIcon />
                  )}
                </span>
                <span className={css.cardName}>{displayName}</span>
              </NamedLink>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
