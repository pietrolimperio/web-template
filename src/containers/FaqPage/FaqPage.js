import React, { useEffect, useMemo, useRef, useState } from 'react';
import { bool } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { useIntl, FormattedMessage } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchFaqContent, sanitizeFaqAccentColor, sanitizeFaqIconUrl } from '../../util/faqApi';
import { searchFaqItems, tokenizeSearchQuery, highlightSearchMatches } from '../../util/faqSearch';
import { Page, LayoutComposer, NamedLink, IconSearch, IconArrowHead } from '../../components';
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
    color: '',
    iconUrl: '',
  }));

  return { categories, items, source: 'static' };
}

function FaqCategoryCardIcon({ iconUrl, imgClassName, faqIconClassName }) {
  const safeUrl = sanitizeFaqIconUrl(iconUrl);
  const [imgFailed, setImgFailed] = useState(!safeUrl);

  useEffect(() => {
    setImgFailed(!safeUrl);
  }, [safeUrl]);

  if (!imgFailed && safeUrl) {
    return (
      <img
        src={safeUrl}
        alt=""
        className={imgClassName}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <i className={classNames('fa-solid fa-question', faqIconClassName)} aria-hidden />;
}

function categoryDomId(categoryId) {
  return `faq-category-${String(categoryId || 'topic')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

const FaqPageComponent = props => {
  const { scrollingDisabled } = props;
  const intl = useIntl();
  const [query, setQuery] = useState('');
  const [remotePayload, setRemotePayload] = useState(null);
  const [activeCategory, setActiveCategory] = useState('rent');
  const [openId, setOpenId] = useState('');
  const faqSectionHeaderRef = useRef(null);

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
    return items;
  }, [items, normalizedQuery, query]);

  const itemsByCategory = useMemo(() => {
    return categoryRows.map(category => ({
      category,
      items: items.filter(item => item.category === category.id),
    }));
  }, [categoryRows, items]);

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
    if (typeof window !== 'undefined') {
      const el = document.getElementById(categoryDomId(categoryId)) || faqSectionHeaderRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
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
                    <span className={css.kicker}>
                      <FormattedMessage id="FaqPage.kicker" defaultMessage="Help Center" />
                    </span>
                    <h1 id="faq-hero-title" className={css.heroTitle}>
                      <FormattedMessage id="FaqPage.heroTitle" />
                    </h1>
                    <p className={css.heroSubtitle}>{pageDescription}</p>
                    <form className={css.searchForm} onSubmit={onSearchSubmit}>
                      <div className={css.searchShell}>
                        <div className={css.searchFieldRow}>
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
                        </div>
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

                  <div className={css.contentGrid}>
                    <aside
                      className={css.sidebar}
                      aria-label={intl.formatMessage({ id: 'FaqPage.categoriesAriaLabel' })}
                    >
                      <nav className={css.topicNav}>
                        {categoryRows.map((cat, rowIndex) => {
                          const visualKey = resolveFaqCategoryVisualKey(cat.id, rowIndex);
                          const accent = sanitizeFaqAccentColor(cat.color);
                          const themeClass = accent
                            ? css.categoryThemeCustom
                            : THEME_CLASS_BY_CATEGORY[visualKey] || css.categoryThemeAccount;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              className={classNames(css.topicLink, themeClass, {
                                [css.topicLinkActive]:
                                  !normalizedQuery && activeCategory === cat.id,
                              })}
                              style={accent ? { '--faq-theme': accent } : undefined}
                              aria-pressed={!normalizedQuery && activeCategory === cat.id}
                              onClick={() => selectCategory(cat.id)}
                            >
                              <span className={css.topicIcon}>
                                <FaqCategoryCardIcon
                                  iconUrl={cat.iconUrl}
                                  imgClassName={css.categoryIconImg}
                                  faqIconClassName={css.categoryIconFaq}
                                />
                              </span>
                              <span className={css.topicText}>{cat.title}</span>
                            </button>
                          );
                        })}
                      </nav>

                      <div className={css.supportCard}>
                        <div className={css.supportIcon} aria-hidden>
                          <i className="fa-solid fa-headset" />
                        </div>
                        <h2 className={css.supportTitle}>
                          <FormattedMessage id="FaqPage.ctaTitle" />
                        </h2>
                        <p className={css.supportBody}>
                          <FormattedMessage id="FaqPage.ctaSubtitle" />
                        </p>
                        <NamedLink
                          name="CMSPage"
                          params={{ pageId: 'help' }}
                          className={css.supportButton}
                        >
                          <FormattedMessage id="FaqPage.ctaPrimary" />
                        </NamedLink>
                      </div>
                    </aside>

                    <div className={css.faqColumn}>
                      {normalizedQuery ? (
                        <section className={css.faqSection} aria-labelledby="faq-search-title">
                          <div ref={faqSectionHeaderRef} className={css.faqSectionHeader}>
                            <div className={css.sectionIcon} aria-hidden>
                              <IconSearch />
                            </div>
                            <h2 id="faq-search-title" className={css.faqSectionTitle}>
                              <FormattedMessage id="FaqPage.popularTitle" />
                            </h2>
                            <span className={classNames(css.tag, css.tagSearch)}>
                              <FormattedMessage id="FaqPage.tagSearch" />
                            </span>
                          </div>
                          <div className={classNames(css.faqList, css.faqListSearch)}>
                            {displayedItems.map(item => {
                              const isOpen = openId === item.id;
                              const questionNodes = highlightSearchMatches(
                                item.question,
                                searchTokens,
                                css.searchHighlight
                              );
                              const answerNodes = highlightSearchMatches(
                                item.answer,
                                searchTokens,
                                css.searchHighlight
                              );
                              const itemVisualKey = visualKeyForRow(item.category, categoryRows);
                              const itemCategoryRow = categoryRows.find(
                                r => r.id === item.category
                              );
                              const itemPillAccent = sanitizeFaqAccentColor(itemCategoryRow?.color);

                              return (
                                <div
                                  key={item.id}
                                  className={classNames(css.faqItem, css.faqItemSearch)}
                                >
                                  <span
                                    className={classNames(
                                      css.tag,
                                      itemPillAccent
                                        ? css.tagCustom
                                        : TAG_CLASS_BY_CATEGORY[itemVisualKey] || css.tagAccount,
                                      css.faqItemCategoryPill
                                    )}
                                    style={
                                      itemPillAccent
                                        ? { '--faq-tag-accent': itemPillAccent }
                                        : undefined
                                    }
                                  >
                                    {categoryTitleById[item.category] || item.category}
                                  </span>
                                  <div className={css.faqItemSurface}>
                                    <button
                                      type="button"
                                      id={`faq-q-${item.id}`}
                                      className={classNames(css.faqToggle, {
                                        [css.faqToggleOpen]: isOpen,
                                      })}
                                      aria-expanded={isOpen}
                                      aria-controls={`faq-a-${item.id}`}
                                      onClick={() => setOpenId(isOpen ? '' : item.id)}
                                    >
                                      <span>{questionNodes}</span>
                                      <span
                                        className={classNames(css.chevron, {
                                          [css.chevronUp]: isOpen,
                                        })}
                                        aria-hidden
                                      >
                                        <IconArrowHead direction="down" size="small" />
                                      </span>
                                    </button>
                                    {isOpen ? (
                                      <p
                                        id={`faq-a-${item.id}`}
                                        className={css.faqAnswer}
                                        role="region"
                                      >
                                        {answerNodes}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      ) : (
                        itemsByCategory.map(({ category, items: categoryItems }, rowIndex) => {
                          if (!categoryItems.length) {
                            return null;
                          }
                          const visualKey = resolveFaqCategoryVisualKey(category.id, rowIndex);
                          const accent = sanitizeFaqAccentColor(category.color);
                          const sectionStyle = accent ? { '--faq-theme': accent } : undefined;
                          return (
                            <section
                              key={category.id}
                              id={categoryDomId(category.id)}
                              className={classNames(
                                css.faqSection,
                                accent
                                  ? css.categoryThemeCustom
                                  : THEME_CLASS_BY_CATEGORY[visualKey] || css.categoryThemeAccount
                              )}
                              style={sectionStyle}
                              aria-labelledby={`${categoryDomId(category.id)}-title`}
                            >
                              <div
                                ref={activeCategory === category.id ? faqSectionHeaderRef : null}
                                className={css.faqSectionHeader}
                              >
                                <div className={css.sectionIcon} aria-hidden>
                                  <FaqCategoryCardIcon
                                    iconUrl={category.iconUrl}
                                    imgClassName={css.categoryIconImg}
                                    faqIconClassName={css.categoryIconFaq}
                                  />
                                </div>
                                <div className={css.sectionHeadingText}>
                                  <h2
                                    id={`${categoryDomId(category.id)}-title`}
                                    className={css.faqSectionTitle}
                                  >
                                    {category.title}
                                  </h2>
                                  {category.description ? (
                                    <p className={css.sectionDescription}>{category.description}</p>
                                  ) : null}
                                </div>
                                <span
                                  className={classNames(
                                    css.tag,
                                    accent
                                      ? css.tagCustom
                                      : TAG_CLASS_BY_CATEGORY[visualKey] || css.tagAccount
                                  )}
                                  style={accent ? { '--faq-tag-accent': accent } : undefined}
                                >
                                  {category.tag && category.tag.trim() !== '' ? (
                                    category.tag
                                  ) : (
                                    <FormattedMessage
                                      id={TAG_MESSAGE_ID[visualKey] || 'FaqPage.tagRent'}
                                    />
                                  )}
                                </span>
                              </div>
                              <div className={css.faqList}>
                                {categoryItems.map(item => {
                                  const isOpen = openId === item.id;
                                  return (
                                    <div key={item.id} className={css.faqItem}>
                                      <button
                                        type="button"
                                        id={`faq-q-${item.id}`}
                                        className={classNames(css.faqToggle, {
                                          [css.faqToggleOpen]: isOpen,
                                        })}
                                        aria-expanded={isOpen}
                                        aria-controls={`faq-a-${item.id}`}
                                        onClick={() => {
                                          setActiveCategory(item.category);
                                          setOpenId(isOpen ? '' : item.id);
                                        }}
                                      >
                                        <span>{item.question}</span>
                                        <span
                                          className={classNames(css.chevron, {
                                            [css.chevronUp]: isOpen,
                                          })}
                                          aria-hidden
                                        >
                                          <IconArrowHead direction="down" size="small" />
                                        </span>
                                      </button>
                                      {isOpen ? (
                                        <p
                                          id={`faq-a-${item.id}`}
                                          className={css.faqAnswer}
                                          role="region"
                                        >
                                          {item.answer}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })
                      )}
                    </div>
                  </div>
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
