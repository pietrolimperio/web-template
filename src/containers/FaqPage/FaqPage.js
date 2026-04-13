import React, { useEffect, useMemo, useState } from 'react';
import { bool } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { useIntl, FormattedMessage } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchFaqContent } from '../../util/faqApi';
import { searchFaqItems, tokenizeSearchQuery, highlightSearchMatches } from '../../util/faqSearch';
import {
  Page,
  LayoutComposer,
  NamedLink,
  IconSearch,
  IconArrowHead,
  IconInquiry,
  IconEdit,
  IconKeys,
  IconUser,
  IconHelp,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './FaqPage.module.css';

const TAG_MESSAGE_ID = {
  rent: 'FaqPage.tagRent',
  lend: 'FaqPage.tagLend',
  safety: 'FaqPage.tagSafety',
  account: 'FaqPage.tagAccount',
};

/** Static FAQ entries: order defines display order within each category */
const FAQ_DEFINITIONS = [
  { id: 'rent-1', category: 'rent', questionId: 'FaqPage.question1', answerId: 'FaqPage.answer1' },
  { id: 'rent-2', category: 'rent', questionId: 'FaqPage.question4', answerId: 'FaqPage.answer4' },
  { id: 'rent-3', category: 'rent', questionId: 'FaqPage.rentQ3', answerId: 'FaqPage.rentA3' },
  { id: 'lend-1', category: 'lend', questionId: 'FaqPage.lendQ1', answerId: 'FaqPage.lendA1' },
  { id: 'lend-2', category: 'lend', questionId: 'FaqPage.lendQ2', answerId: 'FaqPage.lendA2' },
  { id: 'lend-3', category: 'lend', questionId: 'FaqPage.lendQ3', answerId: 'FaqPage.lendA3' },
  {
    id: 'safety-1',
    category: 'safety',
    questionId: 'FaqPage.question2',
    answerId: 'FaqPage.answer2',
  },
  {
    id: 'safety-2',
    category: 'safety',
    questionId: 'FaqPage.question3',
    answerId: 'FaqPage.answer3',
  },
  {
    id: 'safety-3',
    category: 'safety',
    questionId: 'FaqPage.safetyQ3',
    answerId: 'FaqPage.safetyA3',
  },
  {
    id: 'account-1',
    category: 'account',
    questionId: 'FaqPage.accountQ1',
    answerId: 'FaqPage.accountA1',
  },
  {
    id: 'account-2',
    category: 'account',
    questionId: 'FaqPage.accountQ2',
    answerId: 'FaqPage.accountA2',
  },
];

const CATEGORY_CARDS = [
  {
    category: 'rent',
    titleId: 'FaqPage.catRentTitle',
    bodyId: 'FaqPage.catRentBody',
    iconClass: css.categoryIconRent,
    Icon: IconInquiry,
  },
  {
    category: 'lend',
    titleId: 'FaqPage.catLendTitle',
    bodyId: 'FaqPage.catLendBody',
    iconClass: css.categoryIconLend,
    Icon: IconEdit,
  },
  {
    category: 'safety',
    titleId: 'FaqPage.catSafetyTitle',
    bodyId: 'FaqPage.catSafetyBody',
    iconClass: css.categoryIconSafety,
    Icon: IconKeys,
  },
  {
    category: 'account',
    titleId: 'FaqPage.catAccountTitle',
    bodyId: 'FaqPage.catAccountBody',
    iconClass: css.categoryIconAccount,
    Icon: IconUser,
  },
];

const ICON_BY_CATEGORY_ID = CATEGORY_CARDS.reduce((acc, row) => {
  acc[row.category] = { Icon: row.Icon, iconClass: row.iconClass };
  return acc;
}, {});

function buildStaticFaqPayload(intl) {
  const items = FAQ_DEFINITIONS.map(def => ({
    id: def.id,
    category: def.category,
    question: intl.formatMessage({ id: def.questionId }),
    answer: intl.formatMessage({ id: def.answerId }),
  }));

  const categories = CATEGORY_CARDS.map(c => ({
    id: c.category,
    title: intl.formatMessage({ id: c.titleId }),
    description: intl.formatMessage({ id: c.bodyId }),
    tag: intl.formatMessage({ id: TAG_MESSAGE_ID[c.category] }),
  }));

  return { categories, items, source: 'static' };
}

const FaqPageComponent = props => {
  const { scrollingDisabled } = props;
  const intl = useIntl();
  const [query, setQuery] = useState('');
  const [remotePayload, setRemotePayload] = useState(null);
  const [activeCategory, setActiveCategory] = useState('rent');
  const [openId, setOpenId] = useState('rent-1');

  const staticPayload = useMemo(() => buildStaticFaqPayload(intl), [intl]);

  useEffect(() => {
    let cancelled = false;
    fetchFaqContent().then(data => {
      if (cancelled || !data?.items?.length) {
        return;
      }
      setRemotePayload(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = remotePayload?.items?.length ? remotePayload.items : staticPayload.items;
  const categoryRows = useMemo(() => {
    if (remotePayload?.categories?.length) {
      return remotePayload.categories;
    }
    return staticPayload.categories;
  }, [remotePayload, staticPayload.categories]);

  const normalizedQuery = query.trim().toLowerCase();
  const searchTokens = useMemo(() => tokenizeSearchQuery(query), [query]);

  const categoryTitleById = useMemo(() => {
    const map = {};
    categoryRows.forEach(c => {
      map[c.id] = c.title;
    });
    return map;
  }, [categoryRows]);

  /** Full corpus: all FAQs from API when loaded, otherwise static i18n set (same as `items`). */
  const displayedItems = useMemo(() => {
    if (normalizedQuery) {
      return searchFaqItems(items, query);
    }
    return items.filter(item => item.category === activeCategory);
  }, [items, normalizedQuery, activeCategory, query]);

  const activeCategoryRow = categoryRows.find(c => c.id === activeCategory);
  const tagForBadge = normalizedQuery
    ? null
    : activeCategoryRow?.tag && activeCategoryRow.tag.trim() !== ''
      ? activeCategoryRow.tag
      : null;

  useEffect(() => {
    if (displayedItems.length === 0 || openId === '') {
      return;
    }
    const match = displayedItems.some(item => item.id === openId);
    if (!match) {
      setOpenId(displayedItems[0].id);
    }
  }, [displayedItems, openId]);

  useEffect(() => {
    const ids = new Set(categoryRows.map(c => c.id));
    if (!ids.has(activeCategory) && categoryRows[0]) {
      const next = categoryRows[0].id;
      setActiveCategory(next);
      const firstItem = items.find(i => i.category === next);
      if (firstItem) {
        setOpenId(firstItem.id);
      }
    }
  }, [categoryRows, activeCategory, items]);

  const selectCategory = categoryId => {
    if (!categoryRows.some(c => c.id === categoryId)) {
      return;
    }
    setActiveCategory(categoryId);
    setQuery('');
    const firstInCat = items.find(i => i.category === categoryId);
    if (firstInCat) {
      setOpenId(firstInCat.id);
    }
  };

  const pageTitle = intl.formatMessage({ id: 'FaqPage.schemaTitle' });
  const pageDescription = intl.formatMessage({ id: 'FaqPage.schemaDescription' });

  const layoutAreas = `
    topbar
    main
    footer
  `;

  const onSearchSubmit = e => {
    e.preventDefault();
  };

  return (
    <Page
      title={pageTitle}
      description={pageDescription}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
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
                <div className={css.inner}>
                  <section className={css.hero} aria-labelledby="faq-hero-title">
                    <h1 id="faq-hero-title" className={css.heroTitle}>
                      <FormattedMessage id="FaqPage.heroTitle" />
                    </h1>
                    <form className={css.searchForm} onSubmit={onSearchSubmit}>
                      <div className={css.searchShell}>
                        <span className={css.searchIcon} aria-hidden>
                          <IconSearch />
                        </span>
                        <input
                          type="search"
                          className={css.searchInput}
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          placeholder={intl.formatMessage({ id: 'FaqPage.searchPlaceholder' })}
                          autoComplete="off"
                          aria-label={intl.formatMessage({ id: 'FaqPage.searchPlaceholder' })}
                        />
                        <button type="submit" className={css.searchSubmit}>
                          <FormattedMessage id="FaqPage.searchButton" />
                        </button>
                      </div>
                      <p className={css.searchHint} role="status" aria-live="polite">
                        {normalizedQuery && displayedItems.length === 0 ? (
                          <FormattedMessage id="FaqPage.searchNoResults" />
                        ) : normalizedQuery && displayedItems.length > 0 ? (
                          <span className={css.searchResultsMeta}>
                            <FormattedMessage
                              id="FaqPage.searchResultsCount"
                              values={{ count: displayedItems.length }}
                            />
                          </span>
                        ) : (
                          '\u00a0'
                        )}
                      </p>
                    </form>
                  </section>

                  <section
                    className={css.categories}
                    aria-label={intl.formatMessage({ id: 'FaqPage.categoriesAriaLabel' })}
                  >
                    {categoryRows.map(cat => {
                      const iconMeta = ICON_BY_CATEGORY_ID[cat.id] || {
                        Icon: IconHelp,
                        iconClass: css.categoryIconAccount,
                      };
                      const { Icon: CategoryIcon, iconClass } = iconMeta;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={classNames(css.categoryCard, {
                            [css.categoryCardActive]:
                              !normalizedQuery && activeCategory === cat.id,
                          })}
                          aria-pressed={!normalizedQuery && activeCategory === cat.id}
                          onClick={() => selectCategory(cat.id)}
                        >
                          <div className={classNames(css.categoryIcon, iconClass)}>
                            <span className={css.categoryIconSvg}>
                              <CategoryIcon />
                            </span>
                          </div>
                          <p className={css.categoryTitle}>{cat.title}</p>
                          <p className={css.categoryBody}>{cat.description}</p>
                        </button>
                      );
                    })}
                  </section>

                  <section className={css.faqSection} aria-labelledby="faq-popular-title">
                    <div className={css.faqSectionHeader}>
                      <h2 id="faq-popular-title" className={css.faqSectionTitle}>
                        <FormattedMessage id="FaqPage.popularTitle" />
                      </h2>
                      <span className={css.tag}>
                        {normalizedQuery ? (
                          <FormattedMessage id="FaqPage.tagSearch" />
                        ) : tagForBadge ? (
                          tagForBadge
                        ) : (
                          <FormattedMessage id={TAG_MESSAGE_ID[activeCategory] || 'FaqPage.tagRent'} />
                        )}
                      </span>
                    </div>
                    <div className={css.faqList}>
                      {displayedItems.map(item => {
                        const isOpen = openId === item.id;
                        const questionNodes = normalizedQuery
                          ? highlightSearchMatches(item.question, searchTokens, css.searchHighlight)
                          : item.question;
                        const answerNodes = normalizedQuery
                          ? highlightSearchMatches(item.answer, searchTokens, css.searchHighlight)
                          : item.answer;
                        return (
                          <div key={item.id} className={css.faqItem}>
                            {normalizedQuery ? (
                              <span className={css.faqResultCategory}>
                                {categoryTitleById[item.category] || item.category}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              id={`faq-q-${item.id}`}
                              className={classNames(css.faqToggle, { [css.faqToggleOpen]: isOpen })}
                              aria-expanded={isOpen}
                              aria-controls={`faq-a-${item.id}`}
                              onClick={() => setOpenId(isOpen ? '' : item.id)}
                            >
                              <span>{questionNodes}</span>
                              <span
                                className={classNames(css.chevron, { [css.chevronUp]: isOpen })}
                                aria-hidden
                              >
                                <IconArrowHead direction="down" size="small" />
                              </span>
                            </button>
                            {isOpen ? (
                              <p id={`faq-a-${item.id}`} className={css.faqAnswer} role="region">
                                {answerNodes}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className={css.cta} aria-labelledby="faq-cta-title">
                    <div className={css.ctaDeco1} aria-hidden />
                    <div className={css.ctaDeco2} aria-hidden />
                    <div className={css.ctaText}>
                      <h2 id="faq-cta-title" className={css.ctaTitle}>
                        <FormattedMessage id="FaqPage.ctaTitle" />
                      </h2>
                      <p className={css.ctaSubtitle}>
                        <FormattedMessage id="FaqPage.ctaSubtitle" />
                      </p>
                    </div>
                    <div className={css.ctaActions}>
                      <NamedLink name="CMSPage" params={{ pageId: 'help' }} className={css.ctaPrimary}>
                        <FormattedMessage id="FaqPage.ctaPrimary" />
                      </NamedLink>
                    </div>
                  </section>
                </div>
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

FaqPageComponent.propTypes = {
  scrollingDisabled: bool.isRequired,
};

const mapStateToProps = state => ({
  scrollingDisabled: isScrollingDisabled(state),
});

const FaqPage = compose(connect(mapStateToProps))(FaqPageComponent);

export default FaqPage;
