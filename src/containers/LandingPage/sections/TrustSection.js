import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { useReveal } from '../hooks/useReveal';
import css from './TrustSection.module.css';

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

const PILLARS = [
  { titleId: 'NewLandingPage.trust1Title', bodyId: 'NewLandingPage.trust1Body', shape: 0 },
  { titleId: 'NewLandingPage.trust2Title', bodyId: 'NewLandingPage.trust2Body', shape: 1 },
  { titleId: 'NewLandingPage.trust3Title', bodyId: 'NewLandingPage.trust3Body', shape: 2 },
];

const TrustSection = () => {
  return (
    <section className={css.section}>
      <div className={css.inner}>
        <Reveal className={css.sectionHead}>
          <span className={css.kicker}>
            <FormattedMessage id="NewLandingPage.trustKicker" />
          </span>
          <h2 className={css.sectionTitle}>
            <FormattedMessage id="NewLandingPage.trustTitle" />
          </h2>
        </Reveal>

        <div className={css.grid}>
          {PILLARS.map((p, i) => (
            <Reveal key={p.titleId} className={css.card} delay={i * 0.08}>
              <div className={css.iconWrap} aria-hidden="true">
                <div className={`${css.shape} ${css[`shape${p.shape}`]}`} />
              </div>
              <h3 className={css.cardTitle}>
                <FormattedMessage id={p.titleId} />
              </h3>
              <p className={css.cardBody}>
                <FormattedMessage id={p.bodyId} />
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
