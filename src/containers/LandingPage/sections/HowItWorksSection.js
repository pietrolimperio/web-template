import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { useReveal } from '../hooks/useReveal';
import css from './HowItWorksSection.module.css';

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

const STEPS = [
  { n: '01', titleId: 'NewLandingPage.howStep1Title', bodyId: 'NewLandingPage.howStep1Body' },
  { n: '02', titleId: 'NewLandingPage.howStep2Title', bodyId: 'NewLandingPage.howStep2Body' },
  { n: '03', titleId: 'NewLandingPage.howStep3Title', bodyId: 'NewLandingPage.howStep3Body' },
];

const HowItWorksSection = () => {
  return (
    <section className={css.section}>
      <Reveal className={css.sectionHead}>
        <span className={css.kicker}>
          <FormattedMessage id="NewLandingPage.howItWorksKicker" />
        </span>
        <h2 className={css.sectionTitle}>
          <FormattedMessage id="NewLandingPage.howItWorksTitle" />
        </h2>
      </Reveal>

      <div className={css.grid}>
        {STEPS.map((s, i) => (
          <Reveal key={s.n} className={css.card} delay={i * 0.08}>
            <div className={css.stepN}>{s.n}</div>
            <h3 className={css.stepTitle}>
              <FormattedMessage id={s.titleId} />
            </h3>
            <p className={css.stepBody}>
              <FormattedMessage id={s.bodyId} />
            </p>
            {i < STEPS.length - 1 && <div className={css.connector} />}
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default HowItWorksSection;
