import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './ValuePropositionSection.module.css';

const PROPOSITIONS = [
  {
    id: 'easy',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon">
        <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <path d="M16 24.5L21.5 30L32 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    titleId: 'NewLandingPage.valuePropEasyTitle',
    descId: 'NewLandingPage.valuePropEasyDesc',
  },
  {
    id: 'secure',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon">
        <path d="M24 4L6 12V22C6 33.1 13.64 43.36 24 46C34.36 43.36 42 33.1 42 22V12L24 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
        <path d="M18 24L22 28L30 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    titleId: 'NewLandingPage.valuePropSecureTitle',
    descId: 'NewLandingPage.valuePropSecureDesc',
  },
  {
    id: 'community',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon">
        <circle cx="24" cy="16" r="7" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <path d="M10 42C10 34.268 16.268 28 24 28C31.732 28 38 34.268 38 42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
    titleId: 'NewLandingPage.valuePropCommunityTitle',
    descId: 'NewLandingPage.valuePropCommunityDesc',
  },
];

const ValuePropositionSection = () => {
  return (
    <section className={css.root}>
      <div className={css.container}>
        <div className={css.header}>
          <h2 className={css.sectionTitle}>
            <FormattedMessage id="NewLandingPage.valuePropSectionTitle" />
          </h2>
        </div>
        <div className={css.grid}>
          {PROPOSITIONS.map(prop => (
            <div key={prop.id} className={css.card}>
              <div className={css.iconWrap}>{prop.icon}</div>
              <h3 className={css.cardTitle}>
                <FormattedMessage id={prop.titleId} />
              </h3>
              <p className={css.cardDesc}>
                <FormattedMessage id={prop.descId} />
              </p>
            </div>
          ))}
        </div>
        <div className={css.faqCta}>
          <NamedLink name="CMSPage" params={{ pageId: 'faq' }} className={css.faqButton}>
            <FormattedMessage id="NewLandingPage.valuePropFaqButton" />
          </NamedLink>
        </div>
      </div>
    </section>
  );
};

export default ValuePropositionSection;
