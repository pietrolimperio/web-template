import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';

import css from './ValuePropositionSection.module.css';

const PROPOSITIONS = [
  {
    id: 'easy',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon">
        <path
          d="M28 4L12 28H24L20 44L36 20H24L28 4Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
    titleId: 'NewLandingPage.valuePropEasyTitle',
    descId: 'NewLandingPage.valuePropEasyDesc',
  },
  {
    id: 'secure',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon">
        <path
          d="M24 4L6 12V22C6 33.1 13.64 43.36 24 46C34.36 43.36 42 33.1 42 22V12L24 4Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M18 24L22 28L30 20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    titleId: 'NewLandingPage.valuePropSecureTitle',
    descId: 'NewLandingPage.valuePropSecureDesc',
  },
  {
    id: 'local',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon">
        <path
          d="M24 4C16.268 4 10 10.268 10 18C10 28 24 44 24 44C24 44 38 28 38 18C38 10.268 31.732 4 24 4Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="24" cy="18" r="5" stroke="currentColor" strokeWidth="2.5" fill="none" />
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
          <p className={css.sectionSubtitle}>
            <FormattedMessage id="NewLandingPage.valuePropSectionSubtitle" />
          </p>
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
      </div>
    </section>
  );
};

export default ValuePropositionSection;
