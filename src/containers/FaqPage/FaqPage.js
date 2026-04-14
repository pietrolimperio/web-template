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
    themeClass: css.categoryThemeRent,
  },
  {
    category: 'lend',
    titleId: 'FaqPage.catLendTitle',
    bodyId: 'FaqPage.catLendBody',
    themeClass: css.categoryThemeLend,
  },
  {
    category: 'safety',
    titleId: 'FaqPage.catSafetyTitle',
    bodyId: 'FaqPage.catSafetyBody',
    themeClass: css.categoryThemeSafety,
  },
  {
    category: 'account',
    titleId: 'FaqPage.catAccountTitle',
    bodyId: 'FaqPage.catAccountBody',
    themeClass: css.categoryThemeAccount,
  },
];

const THEME_CLASS_BY_CATEGORY = CATEGORY_CARDS.reduce((acc, row) => {
  acc[row.category] = row.themeClass;
  return acc;
}, {});

const TAG_CLASS_BY_CATEGORY = {
  rent: css.tagRent,
  lend: css.tagLend,
  safety: css.tagSafety,
  account: css.tagAccount,
};

/** Ordine UI: usato come fallback quando l’API usa slug diversi da rent/lend/… */
const FAQ_VISUAL_CATEGORY_ORDER = ['rent', 'lend', 'safety', 'account'];

const FAQ_CATEGORY_ALIASES = {
  rent: 'rent',
  renting: 'rent',
  noleggiare: 'rent',
  noleggio: 'rent',
  borrower: 'rent',
  lend: 'lend',
  lending: 'lend',
  listing: 'lend',
  lessor: 'lend',
  affitto: 'lend',
  host: 'lend',
  safety: 'safety',
  sicurezza: 'safety',
  secure: 'safety',
  trust: 'safety',
  account: 'account',
  profilo: 'account',
  settings: 'account',
  utente: 'account',
  inaffitto: 'lend',
  mettereinaffitto: 'lend',
};

/**
 * Allinea id CMS/API agli slug usati per tema colore (card, icona, tag).
 * Se l’id non è riconosciuto, usa l’indice della riga (0–3) come fallback.
 */
function resolveFaqCategoryVisualKey(rawId, rowIndex = 0) {
  const raw = String(rawId || '')
    .trim()
    .toLowerCase();
  const compact = raw.replace(/[\s_-]+/g, '');

  if (FAQ_VISUAL_CATEGORY_ORDER.includes(raw)) {
    return raw;
  }
  if (FAQ_VISUAL_CATEGORY_ORDER.includes(compact)) {
    return compact;
  }

  const alias = FAQ_CATEGORY_ALIASES[raw] || FAQ_CATEGORY_ALIASES[compact];
  if (alias) {
    return alias;
  }

  if (
    typeof rowIndex === 'number' &&
    rowIndex >= 0 &&
    rowIndex < FAQ_VISUAL_CATEGORY_ORDER.length
  ) {
    return FAQ_VISUAL_CATEGORY_ORDER[rowIndex];
  }

  return 'account';
}

function visualKeyForRow(categoryId, rows) {
  const idx = rows.findIndex(r => r.id === categoryId);
  return resolveFaqCategoryVisualKey(categoryId, idx >= 0 ? idx : 0);
}

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
  const [openId, setOpenId] = useState('');

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

  const activeVisualKey = useMemo(
    () => visualKeyForRow(activeCategory, categoryRows),
    [activeCategory, categoryRows]
  );

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
      setOpenId('');
    }
  }, [displayedItems, openId]);

  useEffect(() => {
    const ids = new Set(categoryRows.map(c => c.id));
    if (!ids.has(activeCategory) && categoryRows[0]) {
      const next = categoryRows[0].id;
      setActiveCategory(next);
      setOpenId('');
    }
  }, [categoryRows, activeCategory, items]);

  const selectCategory = categoryId => {
    if (!categoryRows.some(c => c.id === categoryId)) {
      return;
    }
    setActiveCategory(categoryId);
    setQuery('');
    setOpenId('');
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
                    {categoryRows.map((cat, rowIndex) => {
                      const visualKey = resolveFaqCategoryVisualKey(cat.id, rowIndex);
                      const themeClass =
                        THEME_CLASS_BY_CATEGORY[visualKey] || css.categoryThemeAccount;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={classNames(css.categoryCard, themeClass, {
                            [css.categoryCardActive]:
                              !normalizedQuery && activeCategory === cat.id,
                          })}
                          aria-pressed={!normalizedQuery && activeCategory === cat.id}
                          onClick={() => selectCategory(cat.id)}
                        >
                          <div className={css.categoryIcon}>
                            <i
                              className={classNames('fa-solid fa-question', css.categoryIconFaq)}
                              aria-hidden
                            />
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
                      <span
                        className={classNames(
                          css.tag,
                          normalizedQuery
                            ? css.tagSearch
                            : TAG_CLASS_BY_CATEGORY[activeVisualKey] || css.tagAccount
                        )}
                      >
                        {normalizedQuery ? (
                          <FormattedMessage id="FaqPage.tagSearch" />
                        ) : tagForBadge ? (
                          tagForBadge
                        ) : (
                          <FormattedMessage
                            id={TAG_MESSAGE_ID[activeVisualKey] || 'FaqPage.tagRent'}
                          />
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
                              <span
                                className={classNames(
                                  css.tag,
                                  TAG_CLASS_BY_CATEGORY[
                                    visualKeyForRow(item.category, categoryRows)
                                  ] || css.tagAccount,
                                  css.faqResultCategoryPill
                                )}
                              >
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
