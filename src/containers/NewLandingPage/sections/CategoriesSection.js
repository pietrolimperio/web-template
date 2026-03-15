import React from 'react';
import { useConfiguration } from '../../../context/configurationContext';
import { getCategoryDisplayName, getShortLocaleForCategoryDisplay } from '../../../util/fieldHelpers';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './CategoriesSection.module.css';

const CategoriesSection = () => {
  const config = useConfiguration();
  const categories = config?.categoryConfiguration?.categories ?? [];
  const shortLocale = getShortLocaleForCategoryDisplay();

  if (categories.length === 0) {
    return null;
  }

  const renderCategoryRow = duplicateId =>
    categories.map(cat => {
      const displayName = getCategoryDisplayName(cat, shortLocale) || cat.name;
      const searchQuery = `?pub_categoryId=${encodeURIComponent(cat.id)}`;

      return (
        <div key={`${cat.id}${duplicateId}`} className={css.item}>
          <NamedLink
            name="SearchPage"
            to={{ search: searchQuery }}
            className={css.link}
          >
            <span className={css.imageWrap}>
              {cat.imageUrl ? (
                <img
                  src={cat.imageUrl}
                  alt=""
                  className={css.image}
                  loading="lazy"
                />
              ) : (
                <span className={css.placeholder} aria-hidden="true" />
              )}
            </span>
            <span className={css.name}>{displayName}</span>
          </NamedLink>
        </div>
      );
    });

  return (
    <section id="categories" className={css.root}>
      <div className={css.container}>
        <div className={css.header}>
          <h2 className={css.title}>
            <FormattedMessage id="NewLandingPage.categoriesTitle" />
          </h2>
          <p className={css.subtitle}>
            <FormattedMessage id="NewLandingPage.categoriesSubtitle" />
          </p>
        </div>
        <div className={css.track} aria-hidden="true">
          <div className={css.marquee}>
            <div className={css.marqueeContent}>{renderCategoryRow('-a')}</div>
            <div className={css.marqueeContent}>{renderCategoryRow('-b')}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
