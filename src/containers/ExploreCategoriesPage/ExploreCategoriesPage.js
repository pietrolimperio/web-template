import React, { useEffect, useMemo, useState } from 'react';
import { arrayOf, bool, object, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { LayoutComposer, NamedLink, Page } from '../../components';
import { fetchPageAsset } from '../../util/pageAssetsApi';
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

const PAGE_KEY = 'explore-categories';

const CARD_CLASS_BY_KEY = {
  diy: css.cardDiy,
  kids: css.cardKids,
  garden: css.cardGarden,
  sport: css.cardSport,
  kitchen: css.cardKitchen,
  electronics: css.cardElectronics,
  events: css.cardEvents,
};

const LOCAL_IMAGE_BY_KEY = {
  diy: popDiyImage,
  kids: popKidsImage,
  garden: popGardenImage,
  sport: popSportImage,
  electronics: popElectronicsImage,
  community: popCommunityImage,
};

const FALLBACK_CARDS = [
  {
    key: 'diy',
    categoryIndex: 0,
    icon: 'build',
    titleId: 'ExploreCategoriesPage.diyTitle',
    textId: 'ExploreCategoriesPage.diyBody',
    imageKey: 'diy',
    itemIds: ['diyItem1', 'diyItem2', 'diyItem3'],
  },
  {
    key: 'kids',
    categoryIndex: 1,
    icon: 'kids',
    titleId: 'ExploreCategoriesPage.kidsTitle',
    textId: 'ExploreCategoriesPage.kidsBody',
    imageKey: 'kids',
    itemIds: ['kidsItem1', 'kidsItem2', 'kidsItem3'],
  },
  {
    key: 'garden',
    categoryIndex: 2,
    icon: 'garden',
    titleId: 'ExploreCategoriesPage.gardenTitle',
    imageKey: 'garden',
    itemIds: ['gardenItem1', 'gardenItem2', 'gardenItem3'],
  },
  {
    key: 'sport',
    categoryIndex: 3,
    icon: 'sport',
    titleId: 'ExploreCategoriesPage.sportTitle',
    textId: 'ExploreCategoriesPage.sportBody',
    imageKey: 'sport',
    itemIds: ['sportItem1', 'sportItem2', 'sportItem3', 'sportItem4'],
  },
  {
    key: 'kitchen',
    categoryIndex: 4,
    icon: 'kitchen',
    titleId: 'ExploreCategoriesPage.kitchenTitle',
    textId: 'ExploreCategoriesPage.kitchenBody',
    itemIds: ['kitchenItem1', 'kitchenItem2', 'kitchenItem3'],
  },
  {
    key: 'electronics',
    categoryIndex: 5,
    icon: 'electronics',
    titleId: 'ExploreCategoriesPage.electronicsTitle',
    textId: 'ExploreCategoriesPage.electronicsBody',
    imageKey: 'electronics',
  },
  {
    key: 'events',
    categoryIndex: 6,
    icon: 'events',
    titleId: 'ExploreCategoriesPage.eventsTitle',
    textId: 'ExploreCategoriesPage.eventsBody',
    itemIds: ['eventsItem1', 'eventsItem2', 'eventsItem3'],
  },
];

const getMessage = (intl, id) => intl.formatMessage({ id });

const getFallbackAsset = intl => ({
  pageKey: PAGE_KEY,
  locale: intl.locale,
  title: getMessage(intl, 'ExploreCategoriesPage.schemaTitle'),
  sections: [
    {
      id: 'hero',
      title: getMessage(intl, 'ExploreCategoriesPage.schemaTitle'),
      blocks: [
        {
          type: 'hero',
          kicker: getMessage(intl, 'ExploreCategoriesPage.heroKicker'),
          title: intl.locale?.startsWith('it')
            ? 'Tutto ciò che vuoi, per il tempo che ti serve.'
            : 'Everything you want, for the time you need.',
          text: getMessage(intl, 'ExploreCategoriesPage.popHeroSubheadline'),
        },
      ],
    },
    {
      id: 'category-groups',
      title: 'Categories',
      blocks: [
        {
          type: 'category-grid',
          items: FALLBACK_CARDS.map(card => ({
            key: card.key,
            categoryIndex: card.categoryIndex,
            title: getMessage(intl, card.titleId),
            text: card.textId ? getMessage(intl, card.textId) : '',
            icon: card.icon,
            imageKey: card.imageKey,
            items: (card.itemIds || []).map(itemId =>
              getMessage(intl, `ExploreCategoriesPage.${card.key}.${itemId}`)
            ),
          })),
        },
      ],
    },
    {
      id: 'community',
      title: getMessage(intl, 'ExploreCategoriesPage.communityTitle'),
      blocks: [
        {
          type: 'callout',
          title: getMessage(intl, 'ExploreCategoriesPage.communityTitle'),
          text: getMessage(intl, 'ExploreCategoriesPage.communityBody'),
          imageKey: 'community',
          actionLabel: getMessage(intl, 'ExploreCategoriesPage.communityButton'),
          actionRoute: 'AIListingCreationPage',
        },
      ],
    },
  ],
  status: 'fallback',
});

const getBlock = (asset, type) =>
  (asset?.sections || [])
    .flatMap(section => section.blocks || [])
    .find(block => block.type === type);

const categorySearch = (category, item) => {
  if (item?.href) {
    return item.href;
  }
  const token = buildCategorySelectionToken('categoryId', category?.id);
  return token ? `/s?${CATEGORY_MULTI_FILTER_PARAM}=${encodeURIComponent(token)}` : '/s';
};

const imageForItem = item => item?.imageUrl || LOCAL_IMAGE_BY_KEY[item?.imageKey || item?.key];

const toSearchLinkProps = href => {
  if (href && href.startsWith('/s?')) {
    return { name: 'SearchPage', to: { search: href.slice(2) } };
  }
  return { name: 'SearchPage' };
};

const CalloutAction = ({ block }) => {
  if (!block.actionLabel) return null;
  if (block.actionHref) {
    return (
      <a href={block.actionHref} className={css.communityButton}>
        {block.actionLabel}
      </a>
    );
  }
  return (
    <NamedLink name={block.actionRoute || 'AIListingCreationPage'} className={css.communityButton}>
      {block.actionLabel}
    </NamedLink>
  );
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

const CategoryItems = ({ items, variant }) => {
  if (!items?.length) return null;

  return (
    <div className={variant === 'chips' ? css.chipList : css.itemList}>
      {items.map(item => (
        <span key={item} className={variant === 'chips' ? css.chip : css.itemRow}>
          {item}
        </span>
      ))}
    </div>
  );
};

const CategoryCard = ({ item, category }) => {
  const key = item.key || '';
  const image = imageForItem(item);
  const linkProps = toSearchLinkProps(categorySearch(category, item));
  const isDiy = key === 'diy';
  const isKids = key === 'kids';
  const isSport = key === 'sport';
  const isEvents = key === 'events';
  const isKitchen = key === 'kitchen';
  const isElectronics = key === 'electronics';
  const icon = item.icon || key;
  const className = `${css.categoryCard} ${CARD_CLASS_BY_KEY[key] || css.cardGarden}`;

  return (
    <NamedLink {...linkProps} className={className}>
      {isDiy ? (
        <>
          <div className={css.cardCopy}>
            <div>
              <div className={css.cardHeading}>
                <IconGlyph name={icon} className={css.cardIcon} />
                <h2>{item.title}</h2>
              </div>
              {item.text ? <p className={css.cardBodyItalic}>{item.text}</p> : null}
              <CategoryItems items={item.items} />
            </div>
            {item.actionLabel ? <span className={css.exploreLink}>{item.actionLabel}</span> : null}
          </div>
          {image ? (
            <div className={css.diyImage} style={{ backgroundImage: `url(${image})` }} />
          ) : null}
        </>
      ) : isKids ? (
        <>
          <div>
            <div className={css.cardHeading}>
              <IconGlyph name={icon} className={css.cardIcon} />
              <h2>{item.title}</h2>
            </div>
            {item.text ? <p className={css.cardBody}>{item.text}</p> : null}
            <CategoryItems items={item.items} variant="tiles" />
          </div>
          {image ? (
            <div className={css.kidsImage} style={{ backgroundImage: `url(${image})` }} />
          ) : null}
        </>
      ) : isSport ? (
        <>
          <div className={css.sportCopy}>
            <div className={css.cardHeading}>
              <IconGlyph name={icon} className={css.cardIcon} />
              <h2>{item.title}</h2>
            </div>
            {item.text ? <p className={css.cardBody}>{item.text}</p> : null}
            <CategoryItems items={item.items} variant="chips" />
          </div>
          {image ? (
            <div className={css.sportImage} style={{ backgroundImage: `url(${image})` }} />
          ) : null}
        </>
      ) : isKitchen ? (
        <>
          <div className={css.cardHeading}>
            <IconGlyph name={icon} className={css.cardIcon} />
            <h2>{item.title}</h2>
          </div>
          {item.text ? <p className={css.cardBodyItalic}>{item.text}</p> : null}
          <CategoryItems items={item.items} variant="stack" />
        </>
      ) : isElectronics ? (
        <>
          {image ? (
            <div className={css.electronicsImage} style={{ backgroundImage: `url(${image})` }} />
          ) : null}
          <div className={css.cardCopy}>
            <div className={css.cardHeading}>
              <IconGlyph name={icon} className={css.cardIcon} />
              <h2>{item.title}</h2>
            </div>
            {item.text ? <p className={css.cardBodySmall}>{item.text}</p> : null}
          </div>
        </>
      ) : isEvents ? (
        <>
          <div>
            <div className={css.cardHeading}>
              <IconGlyph name={icon} className={css.eventIcon} />
              <h2>{item.title}</h2>
            </div>
            {item.text ? <p className={css.eventsBody}>{item.text}</p> : null}
            <CategoryItems items={item.items} />
          </div>
          <span className={css.eventRocket} aria-hidden="true">
            <IconGlyph name="events" className={css.rocketIcon} />
          </span>
        </>
      ) : (
        <>
          {image ? (
            <div className={css.gardenImage} style={{ backgroundImage: `url(${image})` }} />
          ) : null}
          <div className={css.cardCopy}>
            <div className={css.cardHeading}>
              <IconGlyph name={icon} className={css.cardIcon} />
              <h2>{item.title}</h2>
            </div>
            {item.text ? <p className={css.cardBody}>{item.text}</p> : null}
            <CategoryItems items={item.items} />
          </div>
        </>
      )}
    </NamedLink>
  );
};

const useExploreCategoriesAsset = intl => {
  const fallbackAsset = useMemo(() => getFallbackAsset(intl), [intl]);
  const [state, setState] = useState({ asset: fallbackAsset, loading: false, status: 'fallback' });

  useEffect(() => {
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));
    fetchPageAsset(PAGE_KEY, intl.locale).then(result => {
      if (cancelled) return;
      setState({
        asset: result.data || fallbackAsset,
        loading: false,
        status: result.status === 'ok' && result.data ? 'ok' : result.status,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [fallbackAsset, intl.locale]);

  return state;
};

const ExploreCategoriesPageComponent = props => {
  const { scrollingDisabled } = props;
  const config = useConfiguration();
  const intl = useIntl();
  const { asset } = useExploreCategoriesAsset(intl);

  const categories = config?.categoryConfiguration?.categories ?? [];
  const heroBlock = getBlock(asset, 'hero') || {};
  const categoryGridBlock = getBlock(asset, 'category-grid') || {};
  const calloutBlock = getBlock(asset, 'callout') || {};
  const cards = (categoryGridBlock.items || []).map((item, index) => ({
    ...item,
    category: Number.isInteger(item.categoryIndex)
      ? categories[item.categoryIndex]
      : categories[index],
  }));

  const pageTitle = asset?.title || intl.formatMessage({ id: 'ExploreCategoriesPage.schemaTitle' });
  const pageDescription =
    heroBlock.text || intl.formatMessage({ id: 'ExploreCategoriesPage.schemaDescription' });
  const calloutImage = calloutBlock.imageUrl || LOCAL_IMAGE_BY_KEY[calloutBlock.imageKey];

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
                  {heroBlock.kicker ? (
                    <span className={css.heroKicker}>{heroBlock.kicker}</span>
                  ) : null}
                  <h1 className={css.heroTitle}>{heroBlock.title || pageTitle}</h1>
                  {heroBlock.text ? <p className={css.heroSubheadline}>{heroBlock.text}</p> : null}
                </section>

                <div className={css.bentoGrid}>
                  {cards.map((item, index) => (
                    <CategoryCard
                      key={item.key || item.title || index}
                      item={item}
                      category={item.category}
                    />
                  ))}
                </div>

                {calloutBlock.title || calloutBlock.text ? (
                  <section className={css.communityCallout}>
                    <div className={css.communityCopy}>
                      {calloutBlock.title ? <h2>{calloutBlock.title}</h2> : null}
                      {calloutBlock.text ? <p>{calloutBlock.text}</p> : null}
                      <CalloutAction block={calloutBlock} />
                    </div>
                    {calloutImage ? (
                      <div
                        className={css.communityImage}
                        style={{ backgroundImage: `url(${calloutImage})` }}
                      />
                    ) : null}
                  </section>
                ) : null}
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
  items: arrayOf(string),
  variant: string,
};

CategoryCard.propTypes = {
  item: object.isRequired,
  category: object,
};

CategoryCard.defaultProps = {
  category: null,
};

CalloutAction.propTypes = {
  block: object.isRequired,
};

const mapStateToProps = state => ({
  scrollingDisabled: isScrollingDisabled(state),
});

const ExploreCategoriesPage = compose(connect(mapStateToProps))(ExploreCategoriesPageComponent);

export { ExploreCategoriesPageComponent };

export default ExploreCategoriesPage;
