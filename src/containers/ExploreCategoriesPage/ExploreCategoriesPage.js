import React, { useMemo } from 'react';
import { arrayOf, bool, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { LayoutComposer, NamedLink, Page } from '../../components';
import { buildCategorySelectionToken, CATEGORY_MULTI_FILTER_PARAM } from '../../util/search';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import popDiyImage from '../../assets/explore-categories/pop-diy.png';
import popKidsImage from '../../assets/explore-categories/pop-kids.png';
import popGardenImage from '../../assets/explore-categories/pop-garden.png';
import popSportImage from '../../assets/explore-categories/pop-sport.png';
import popElectronicsImage from '../../assets/explore-categories/pop-electronics.png';
import popCommunityImage from '../../assets/explore-categories/pop-community.png';

import css from './ExploreCategoriesPage.module.css';

const CATEGORY_CARDS = [
  {
    key: 'diy',
    categoryIndex: 0,
    className: css.cardDiy,
    icon: 'build',
    titleId: 'ExploreCategoriesPage.diyTitle',
    bodyId: 'ExploreCategoriesPage.diyBody',
    image: popDiyImage,
    items: ['diyItem1', 'diyItem2', 'diyItem3'],
  },
  {
    key: 'kids',
    categoryIndex: 1,
    className: css.cardKids,
    icon: 'kids',
    titleId: 'ExploreCategoriesPage.kidsTitle',
    bodyId: 'ExploreCategoriesPage.kidsBody',
    image: popKidsImage,
    items: ['kidsItem1', 'kidsItem2', 'kidsItem3'],
  },
  {
    key: 'garden',
    categoryIndex: 2,
    className: css.cardGarden,
    icon: 'garden',
    titleId: 'ExploreCategoriesPage.gardenTitle',
    image: popGardenImage,
    items: ['gardenItem1', 'gardenItem2', 'gardenItem3'],
  },
  {
    key: 'sport',
    categoryIndex: 3,
    className: css.cardSport,
    icon: 'sport',
    titleId: 'ExploreCategoriesPage.sportTitle',
    bodyId: 'ExploreCategoriesPage.sportBody',
    image: popSportImage,
    items: ['sportItem1', 'sportItem2', 'sportItem3', 'sportItem4'],
  },
  {
    key: 'kitchen',
    categoryIndex: 4,
    className: css.cardKitchen,
    icon: 'kitchen',
    titleId: 'ExploreCategoriesPage.kitchenTitle',
    bodyId: 'ExploreCategoriesPage.kitchenBody',
    items: ['kitchenItem1', 'kitchenItem2', 'kitchenItem3'],
  },
  {
    key: 'electronics',
    categoryIndex: 5,
    className: css.cardElectronics,
    icon: 'electronics',
    titleId: 'ExploreCategoriesPage.electronicsTitle',
    bodyId: 'ExploreCategoriesPage.electronicsBody',
    image: popElectronicsImage,
  },
  {
    key: 'events',
    categoryIndex: 6,
    className: css.cardEvents,
    icon: 'events',
    titleId: 'ExploreCategoriesPage.eventsTitle',
    bodyId: 'ExploreCategoriesPage.eventsBody',
    items: ['eventsItem1', 'eventsItem2', 'eventsItem3'],
  },
];

const categorySearch = category => {
  const token = buildCategorySelectionToken('categoryId', category?.id);
  return token ? `?${CATEGORY_MULTI_FILTER_PARAM}=${encodeURIComponent(token)}` : '';
};

const IconGlyph = ({ name, className }) => {
  switch (name) {
    case 'kids':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="7" r="3.2" />
          <path d="M5.8 20c.8-4.3 3-6.6 6.2-6.6s5.4 2.3 6.2 6.6" />
          <path d="M9.5 8.1h.1M14.5 8.1h.1" />
        </svg>
      );
    case 'garden':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V9" />
          <path d="M12 12C7.8 12 5.4 9.6 4.8 5.4 9 5.4 11.4 7.8 12 12Z" />
          <path d="M12 11c4.2 0 6.6-2.4 7.2-6.6C15 4.4 12.6 6.8 12 11Z" />
          <path d="M7.5 19h9l-1.1 3H8.6l-1.1-3Z" />
        </svg>
      );
    case 'sport':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5S14.4 18.1 12 20.5" />
          <path d="M12 3.5C9.6 5.9 8.4 8.8 8.4 12s1.2 6.1 3.6 8.5" />
        </svg>
      );
    case 'kitchen':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.8 3v18" />
          <path d="M4.8 3v5.4c0 1.8 1.2 3 3 3s3-1.2 3-3V3" />
          <path d="M16.8 3v18" />
          <path d="M16.8 3c-2.4 1.8-3.6 4.2-3.6 7.2 0 2.4 1.2 4.2 3.6 4.2" />
        </svg>
      );
    case 'electronics':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="11.5" rx="1.8" />
          <path d="M9 20h6M12 16.5V20" />
        </svg>
      );
    case 'events':
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 20 19 6" />
          <path d="M14 6h5v5" />
          <path d="M6 7l1.2 2.4L10 10l-2.4 1.2L7 14l-1.2-2.4L3 11l2.4-1.2L6 7Z" />
          <path d="M17 15l.8 1.5 1.7.5-1.5.8-.5 1.7-.8-1.5-1.7-.5 1.5-.8.5-1.7Z" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m14.5 4.5 5 5-10 10H4.5v-5l10-10Z" />
          <path d="m13 6 5 5" />
        </svg>
      );
  }
};

const CategoryItems = ({ cardKey, items, variant }) => {
  if (!items?.length) return null;

  return (
    <div className={variant === 'chips' ? css.chipList : css.itemList}>
      {items.map(item => (
        <span key={item} className={variant === 'chips' ? css.chip : css.itemRow}>
          <FormattedMessage id={`ExploreCategoriesPage.${cardKey}.${item}`} />
        </span>
      ))}
    </div>
  );
};

const ExploreCategoriesPageComponent = props => {
  const { scrollingDisabled } = props;
  const config = useConfiguration();
  const intl = useIntl();

  const categories = config?.categoryConfiguration?.categories ?? [];

  const cards = useMemo(
    () =>
      CATEGORY_CARDS.map(card => ({
        ...card,
        category: categories[card.categoryIndex],
      })),
    [categories]
  );

  const pageTitle = intl.formatMessage({ id: 'ExploreCategoriesPage.schemaTitle' });
  const pageDescription = intl.formatMessage({ id: 'ExploreCategoriesPage.schemaDescription' });

  const layoutAreas = `
    topbar
    main
    footer
  `;

  return (
    <Page
      title={pageTitle}
      description={pageDescription}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'CollectionPage',
        name: pageTitle,
        description: pageDescription,
      }}
    >
      <LayoutComposer areas={layoutAreas} className={css.layout}>
        {layoutProps => {
          const { Topbar, Main, Footer } = layoutProps;
          return (
            <>
              <Topbar as="header" className={css.topbar}>
                <TopbarContainer />
              </Topbar>
              <Main as="main" className={css.main}>
                <section className={css.heroSection}>
                  <span className={css.heroKicker}>
                    <FormattedMessage id="ExploreCategoriesPage.heroKicker" />
                  </span>
                  <h1 className={css.heroTitle}>
                    <FormattedMessage
                      id="ExploreCategoriesPage.popHeroTitle"
                      values={{
                        accent: chunks => <span className={css.heroTitleAccent}>{chunks}</span>,
                      }}
                    />
                  </h1>
                  <p className={css.heroSubheadline}>
                    <FormattedMessage id="ExploreCategoriesPage.popHeroSubheadline" />
                  </p>
                </section>

                <div className={css.bentoGrid}>
                  {cards.map(card => {
                    const search = categorySearch(card.category);
                    const linkProps = search ? { to: { search } } : {};
                    const isDiy = card.key === 'diy';
                    const isKids = card.key === 'kids';
                    const isSport = card.key === 'sport';
                    const isEvents = card.key === 'events';
                    const isKitchen = card.key === 'kitchen';
                    const isElectronics = card.key === 'electronics';

                    return (
                      <NamedLink
                        key={card.key}
                        name="SearchPage"
                        {...linkProps}
                        className={`${css.categoryCard} ${card.className}`}
                      >
                        {isDiy ? (
                          <>
                            <div className={css.cardCopy}>
                              <div>
                                <div className={css.cardHeading}>
                                  <IconGlyph name={card.icon} className={css.cardIcon} />
                                  <h2>
                                    <FormattedMessage id={card.titleId} />
                                  </h2>
                                </div>
                                <p className={css.cardBodyItalic}>
                                  <FormattedMessage id={card.bodyId} />
                                </p>
                                <CategoryItems cardKey={card.key} items={card.items} />
                              </div>
                              <span className={css.exploreLink}>
                                <FormattedMessage id="ExploreCategoriesPage.exploreAll" />
                              </span>
                            </div>
                            <div
                              className={css.diyImage}
                              style={{ backgroundImage: `url(${card.image})` }}
                            />
                          </>
                        ) : isKids ? (
                          <>
                            <div>
                              <div className={css.cardHeading}>
                                <IconGlyph name={card.icon} className={css.cardIcon} />
                                <h2>
                                  <FormattedMessage id={card.titleId} />
                                </h2>
                              </div>
                              <p className={css.cardBody}>
                                <FormattedMessage id={card.bodyId} />
                              </p>
                              <CategoryItems
                                cardKey={card.key}
                                items={card.items}
                                variant="tiles"
                              />
                            </div>
                            <div
                              className={css.kidsImage}
                              style={{ backgroundImage: `url(${card.image})` }}
                            />
                          </>
                        ) : isSport ? (
                          <>
                            <div className={css.sportCopy}>
                              <div className={css.cardHeading}>
                                <IconGlyph name={card.icon} className={css.cardIcon} />
                                <h2>
                                  <FormattedMessage id={card.titleId} />
                                </h2>
                              </div>
                              <p className={css.cardBody}>
                                <FormattedMessage id={card.bodyId} />
                              </p>
                              <CategoryItems
                                cardKey={card.key}
                                items={card.items}
                                variant="chips"
                              />
                            </div>
                            <div
                              className={css.sportImage}
                              style={{ backgroundImage: `url(${card.image})` }}
                            />
                          </>
                        ) : isKitchen ? (
                          <>
                            <div className={css.cardHeading}>
                              <IconGlyph name={card.icon} className={css.cardIcon} />
                              <h2>
                                <FormattedMessage id={card.titleId} />
                              </h2>
                            </div>
                            <p className={css.cardBodyItalic}>
                              <FormattedMessage id={card.bodyId} />
                            </p>
                            <CategoryItems cardKey={card.key} items={card.items} variant="stack" />
                          </>
                        ) : isElectronics ? (
                          <>
                            <div
                              className={css.electronicsImage}
                              style={{ backgroundImage: `url(${card.image})` }}
                            />
                            <div className={css.cardCopy}>
                              <div className={css.cardHeading}>
                                <IconGlyph name={card.icon} className={css.cardIcon} />
                                <h2>
                                  <FormattedMessage id={card.titleId} />
                                </h2>
                              </div>
                              <p className={css.cardBodySmall}>
                                <FormattedMessage id={card.bodyId} />
                              </p>
                            </div>
                          </>
                        ) : isEvents ? (
                          <>
                            <div>
                              <div className={css.cardHeading}>
                                <IconGlyph name={card.icon} className={css.eventIcon} />
                                <h2>
                                  <FormattedMessage id={card.titleId} />
                                </h2>
                              </div>
                              <p className={css.eventsBody}>
                                <FormattedMessage id={card.bodyId} />
                              </p>
                              <CategoryItems cardKey={card.key} items={card.items} />
                            </div>
                            <span className={css.eventRocket} aria-hidden="true">
                              <IconGlyph name="events" className={css.rocketIcon} />
                            </span>
                          </>
                        ) : (
                          <>
                            <div
                              className={css.gardenImage}
                              style={{ backgroundImage: `url(${card.image})` }}
                            />
                            <div className={css.cardCopy}>
                              <div className={css.cardHeading}>
                                <IconGlyph name={card.icon} className={css.cardIcon} />
                                <h2>
                                  <FormattedMessage id={card.titleId} />
                                </h2>
                              </div>
                              <CategoryItems cardKey={card.key} items={card.items} />
                            </div>
                          </>
                        )}
                      </NamedLink>
                    );
                  })}
                </div>

                <section className={css.communityCallout}>
                  <div className={css.communityCopy}>
                    <h2>
                      <FormattedMessage id="ExploreCategoriesPage.communityTitle" />
                    </h2>
                    <p>
                      <FormattedMessage id="ExploreCategoriesPage.communityBody" />
                    </p>
                    <NamedLink name="AIListingCreationPage" className={css.communityButton}>
                      <FormattedMessage id="ExploreCategoriesPage.communityButton" />
                    </NamedLink>
                  </div>
                  <div
                    className={css.communityImage}
                    style={{ backgroundImage: `url(${popCommunityImage})` }}
                  />
                </section>
              </Main>
              <Footer>
                <FooterContainer />
              </Footer>
            </>
          );
        }}
      </LayoutComposer>
    </Page>
  );
};

ExploreCategoriesPageComponent.propTypes = {
  scrollingDisabled: bool.isRequired,
};

IconGlyph.defaultProps = {
  className: null,
};

IconGlyph.propTypes = {
  name: string.isRequired,
  className: string,
};

CategoryItems.defaultProps = {
  items: null,
  variant: null,
};

CategoryItems.propTypes = {
  cardKey: string.isRequired,
  items: arrayOf(string),
  variant: string,
};

const mapStateToProps = state => ({
  scrollingDisabled: isScrollingDisabled(state),
});

const ExploreCategoriesPage = compose(connect(mapStateToProps))(ExploreCategoriesPageComponent);

export default ExploreCategoriesPage;
