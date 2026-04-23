import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { useReveal } from '../hooks/useReveal';
import css from './TestimonialsSection.module.css';

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

const QUOTES = [
  {
    quoteId: 'NewLandingPage.testimonial1Quote',
    whoId: 'NewLandingPage.testimonial1Who',
    tagId: 'NewLandingPage.testimonial1Tag',
    avatarIdx: 0,
  },
  {
    quoteId: 'NewLandingPage.testimonial2Quote',
    whoId: 'NewLandingPage.testimonial2Who',
    tagId: 'NewLandingPage.testimonial2Tag',
    avatarIdx: 1,
  },
  {
    quoteId: 'NewLandingPage.testimonial3Quote',
    whoId: 'NewLandingPage.testimonial3Who',
    tagId: 'NewLandingPage.testimonial3Tag',
    avatarIdx: 2,
  },
];

const TestimonialsSection = () => {
  return (
    <section className={css.section}>
      <Reveal className={css.sectionHead}>
        <span className={css.kicker}>
          <FormattedMessage id="NewLandingPage.testimonialsKicker" />
        </span>
        <h2 className={css.sectionTitle}>
          <FormattedMessage id="NewLandingPage.testimonialsTitle" />
        </h2>
      </Reveal>

      <div className={css.grid}>
        {QUOTES.map((q, i) => (
          <Reveal key={q.quoteId} className={css.quote} delay={i * 0.07}>
            <div className={css.quoteMark}>"</div>
            <p className={css.quoteText}>
              <FormattedMessage id={q.quoteId} />
            </p>
            <div className={css.quoteMeta}>
              <div className={`${css.avatar} ${css[`avatar${q.avatarIdx}`]}`} />
              <div>
                <div className={css.quoteWho}>
                  <FormattedMessage id={q.whoId} />
                </div>
                <div className={css.quoteTag}>
                  <FormattedMessage id={q.tagId} />
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;
