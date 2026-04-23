import React from 'react';
import { useConfiguration } from '../../../context/configurationContext';
import {
  getCategoryDisplayName,
  getShortLocaleForCategoryDisplay,
} from '../../../util/fieldHelpers';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';
import { useReveal } from '../hooks/useReveal';

import css from './CategoriesSection.module.css';

const STRIPE_CLASSES = [
  css.stripes0,
  css.stripes1,
  css.stripes2,
  css.stripes3,
  css.stripes4,
  css.stripes5,
];

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      className={`${css.reveal} ${shown ? css.revealIn : ''} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

const CategoriesSection = () => {
  const config = useConfiguration();
  const categories = config?.categoryConfiguration?.categories ?? [];
  const shortLocale = getShortLocaleForCategoryDisplay(config);

  if (categories.length === 0) return null;

  const visibleCategories = categories.slice(0, 3);

  return (
    <section className={css.section}>
      <Reveal className={css.sectionHead}>
        <div>
          <span className={css.kicker}>
            <FormattedMessage id="NewLandingPage.categoriesKicker" />
          </span>
          <h2 className={css.sectionTitle}>
            <FormattedMessage id="NewLandingPage.categoriesTitle" />
          </h2>
        </div>
        <NamedLink name="SearchPage" className={css.seeAll}>
          <FormattedMessage id="NewLandingPage.categoriesViewAll" /> →
        </NamedLink>
      </Reveal>

      <div className={css.grid}>
        {visibleCategories.map((cat, i) => {
          const displayName = getCategoryDisplayName(cat, shortLocale) || cat.name;
          const searchQuery = `?pub_categoryId=${encodeURIComponent(cat.id)}`;
          const stripeClass = STRIPE_CLASSES[i % STRIPE_CLASSES.length];

          return (
            <Reveal key={cat.id} delay={i * 0.06}>
              <NamedLink
                name="SearchPage"
                to={{ search: searchQuery }}
                className={css.card}
              >
                <div className={css.catVisual}>
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt="" className={css.catImage} loading="lazy" />
                  ) : (
                    <div className={`${css.catStripes} ${stripeClass}`} />
                  )}
                </div>
                <div className={css.catMeta}>
                  <h3 className={css.catLabel}>{displayName}</h3>
                </div>
              </NamedLink>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

export default CategoriesSection;
