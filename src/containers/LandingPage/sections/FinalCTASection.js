import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';
import { useReveal } from '../hooks/useReveal';
import css from './FinalCTASection.module.css';

const FinalCTASection = () => {
  const [ref, shown] = useReveal();

  return (
    <section className={css.section}>
      <div
        ref={ref}
        className={`${css.inner} ${shown ? css.innerIn : ''}`}
      >
        <h2 className={css.title}>
          <FormattedMessage
            id="NewLandingPage.finalCtaTitle"
            values={{
              em: chunks => <em className={css.titleEm}>{chunks}</em>,
              lineBreak: <br />,
            }}
          />
        </h2>
        <p className={css.sub}>
          <FormattedMessage id="NewLandingPage.finalCtaSub" />
        </p>
        <div className={css.actions}>
          <NamedLink name="AIListingCreationPage" className={css.btnPrimary}>
            <FormattedMessage id="NewLandingPage.finalCtaPrimary" />
          </NamedLink>
          <NamedLink name="CMSPage" params={{ pageId: 'faq' }} className={css.btnGhost}>
            <FormattedMessage id="NewLandingPage.finalCtaSecondary" />
          </NamedLink>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
