import React, { useState, useEffect, useMemo } from 'react';
import { arrayOf } from 'prop-types';
import { propTypes } from '../../../util/types';
import { Form as FinalForm } from 'react-final-form';
import { useHistory } from 'react-router-dom';
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { createResourceLocatorString } from '../../../util/routes';
import { stringifyDateToISO8601 } from '../../../util/dates';
import { Form } from '../../../components';

import FilterKeyword from '../../PageBuilder/Primitives/SearchCTA/FilterKeyword/FilterKeyword';
import FilterDateRange from '../../PageBuilder/Primitives/SearchCTA/FilterDateRange/FilterDateRange';

import css from './HeroSection.module.css';

const ROTATING_WORDS_IDS = [
  'NewLandingPage.rotatingWord0',
  'NewLandingPage.rotatingWord1',
  'NewLandingPage.rotatingWord2',
  'NewLandingPage.rotatingWord3',
  'NewLandingPage.rotatingWord4',
  'NewLandingPage.rotatingWord5',
  'NewLandingPage.rotatingWord6',
];

const isEmpty = v => v == null || (v.hasOwnProperty('length') && v.length === 0);

const formatDateValue = (dateRange, queryParamName) => {
  const { startDate, endDate } = dateRange || {};
  const start = startDate ? stringifyDateToISO8601(startDate) : null;
  const end = endDate ? stringifyDateToISO8601(endDate) : null;
  const value = start && end ? `${start},${end}` : null;
  return { [queryParamName]: value };
};

const TILE_DEFS = [
  { delay: 0,   top: '8%',  right: '6%',  w: 260, h: 300, label: 'trapano', rotate: -6 },
  { delay: 0.2, top: '54%', right: '22%', w: 300, h: 300, label: 'casco',   rotate:  5 },
  { delay: 0.4, top: '22%', right: '32%', w: 200, h: 260, label: 'tenda',   rotate: -3 },
];

function FloatTile({ top, right, w, h, label, rotate, delay, imgUrl }) {
  return (
    <div
      className={css.floatTile}
      style={{ top, right, width: w, height: h, '--rot': `${rotate}deg`, animationDelay: `${delay}s` }}
    >
      {imgUrl ? (
        <img src={imgUrl} alt={label} className={css.tileImg} />
      ) : (
        <div className={css.tileStripes} />
      )}
    </div>
  );
}

function HeroIllustration({ listings = [] }) {
  const shuffledImgs = useMemo(() => {
    const imgs = listings
      .map(l => l?.images?.[0]?.attributes?.variants?.['listing-card']?.url)
      .filter(Boolean);
    return [...imgs].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [listings.length]); // intentional: re-shuffle only when count changes, not on every reference update

  return (
    <div className={css.heroIllo} aria-hidden="true">
      {TILE_DEFS.map((t, i) => (
        <FloatTile key={i} {...t} imgUrl={shuffledImgs[i] || null} />
      ))}
      <div className={css.illoCircle} />
      <div className={css.illoRing} />
    </div>
  );
}

const HeroSection = ({ listings = [] }) => {
  const intl = useIntl();
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIdx(i => (i + 1) % ROTATING_WORDS_IDS.length);
        setWordVisible(true);
      }, 280);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 599px)');
    const handleChange = event => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const onSubmit = values => {
    const queryParams = {};
    Object.entries(values).forEach(([key, value]) => {
      if (!isEmpty(value)) {
        if (key === 'dateRange') {
          const { dates } = formatDateValue(value, 'dates');
          if (dates) queryParams.dates = dates;
        } else {
          queryParams[key] = value;
        }
      }
    });
    const to = createResourceLocatorString('SearchPage', routeConfiguration, {}, queryParams);
    history.push(to);
  };

  return (
    <section className={css.hero}>
      <div className={css.heroInner}>
        <h1 className={css.heroTitle}>
          <span className={css.heroLead}>
            <FormattedMessage id="NewLandingPage.heroTitle1" />
          </span>
          <span className={css.heroTitleLine}>
            {isMobile ? (
              <span
                className={`${css.rotator} ${css.rotatorMobile} ${wordVisible ? css.rotatorIn : css.rotatorOut}`}
                aria-live="polite"
              >
                {intl.formatMessage({ id: ROTATING_WORDS_IDS[wordIdx] })}
              </span>
            ) : (
              <span className={css.rotator} aria-live="polite">
                {ROTATING_WORDS_IDS.map((id, i) => (
                  <span
                    key={id}
                    className={`${css.rotatorWord} ${i === wordIdx ? (wordVisible ? css.rotatorIn : css.rotatorOut) : css.rotatorHidden}`}
                    aria-hidden={i !== wordIdx}
                  >
                    {intl.formatMessage({ id })}
                  </span>
                ))}
              </span>
            )}
            {' '}
            <span className={css.heroTitleSuffix}>
              <FormattedMessage id="NewLandingPage.heroTitle2" />
            </span>
          </span>
        </h1>
        <p className={css.heroSub}>
          <FormattedMessage id="NewLandingPage.heroSub" />
        </p>
        <p className={css.heroMotto}>
          <FormattedMessage
            id="NewLandingPage.heroMotto"
            values={{
              highlight: chunks => <span className={css.heroMottoAccent}>{chunks}</span>,
            }}
          />
        </p>

        <FinalForm
          onSubmit={onSubmit}
          render={({ handleSubmit }) => (
            <Form role="search" onSubmit={handleSubmit} className={css.search}>
              <label className={css.searchField}>
                <span className={css.searchLabel}>
                  <FormattedMessage id="NewLandingPage.heroCosaLabel" />
                </span>
                <FilterKeyword rootClassName={css.keywordRoot} />
              </label>
              <div className={css.searchDivider} />
              {/* dateRoot must have position:relative so the date-picker dropdown anchors correctly */}
              <div className={css.searchFieldDate}>
                <span className={css.searchLabel}>
                  <FormattedMessage id="NewLandingPage.heroQuandoLabel" />
                </span>
                <FilterDateRange
                  config={config}
                  rootClassName={css.dateRoot}
                  alignLeft={false}
                  openAbove
                  toggleButtonClassName={css.dateToggle}
                  labelClassName={css.dateLabel}
                />
              </div>
              <button type="submit" className={css.searchBtn} aria-label={intl.formatMessage({ id: 'NewLandingPage.heroSearchAriaLabel' })}>
                <svg
                  className={css.searchBtnIcon}
                  width="22"
                  height="22"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="5.5" />
                  <path d="m12 12 4 4" />
                </svg>
                <span><FormattedMessage id="NewLandingPage.heroSearch" /></span>
              </button>
            </Form>
          )}
        />
      </div>

      <HeroIllustration listings={listings} />
    </section>
  );
};

HeroSection.propTypes = {
  listings: arrayOf(propTypes.listing),
};

export default HeroSection;
