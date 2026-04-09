import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './CTASection.module.css';

const CTASection = () => {
  return (
    <section className={css.root}>
      <div className={css.container}>
        <div className={css.banner}>
          <div className={css.bannerContent}>
            <h2 className={css.title}>
              <FormattedMessage id="NewLandingPage.ctaTitle" />
            </h2>
            <p className={css.subtitle}>
              <FormattedMessage id="NewLandingPage.ctaSubtitle" />
            </p>
            <div className={css.buttons}>
              <NamedLink
                name="AIListingCreationPage"
                className={css.primaryButton}
              >
                <FormattedMessage id="NewLandingPage.ctaButtonPrimary" />
              </NamedLink>
              <NamedLink
                name="CMSPage"
                params={{ pageId: 'faq' }}
                className={css.secondaryButton}
              >
                <FormattedMessage id="NewLandingPage.ctaButtonSecondary" />
              </NamedLink>
            </div>
          </div>
          <div className={css.decoTop} />
          <div className={css.decoBottom} />
        </div>
      </div>
    </section>
  );
};

export default CTASection;
