import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { ExternalLink } from '../../../components';

import boschLogo from '../../../assets/partners/Bosch-logo.svg.png';
import boseLogo from '../../../assets/partners/bose_logo_icon_168497.webp';
import chiccoLogo from '../../../assets/partners/Chicco_logo.svg.png';
import decathlonLogo from '../../../assets/partners/Decathlon_-_logo_(France,_2024).svg';
import delonghiLogo from '../../../assets/partners/lg-683ab74fe2503-DeLonghi.webp';
import samsungLogo from '../../../assets/partners/Samsung-emblem.png';
import vorwerkLogo from '../../../assets/partners/Vorwerk.svg.png';

import css from './PartnersSection.module.css';

const PARTNERS = [
  { name: 'Bosch', logoUrl: boschLogo, websiteUrl: 'https://www.bosch.com' },
  { name: 'Bose', logoUrl: boseLogo, websiteUrl: 'https://www.bose.com' },
  { name: 'Chicco', logoUrl: chiccoLogo, websiteUrl: 'https://www.chicco.com' },
  { name: 'Decathlon', logoUrl: decathlonLogo, websiteUrl: 'https://www.decathlon.com' },
  { name: 'DeLonghi', logoUrl: delonghiLogo, websiteUrl: 'https://www.delonghi.com' },
  { name: 'Samsung', logoUrl: samsungLogo, websiteUrl: 'https://www.samsung.com' },
  { name: 'Vorwerk', logoUrl: vorwerkLogo, websiteUrl: 'https://www.vorwerk.com' },
];

const PartnerLogo = ({ partner }) => {
  const content = partner.logoUrl ? (
    <img src={partner.logoUrl} alt={partner.name} className={css.logo} loading="lazy" />
  ) : (
    <span className={css.logoPlaceholder}>{partner.name}</span>
  );

  if (partner.websiteUrl) {
    return (
      <ExternalLink href={partner.websiteUrl} className={css.partnerLink} title={partner.name}>
        {content}
      </ExternalLink>
    );
  }
  return <div className={css.partnerLink}>{content}</div>;
};

const PartnersSection = () => {
  if (PARTNERS.length === 0) {
    return null;
  }

  const renderPartnerRow = (duplicateId = '') =>
    PARTNERS.map((partner, idx) => (
      <div key={`${partner.name}-${idx}${duplicateId}`} className={css.marqueeItem}>
        <PartnerLogo partner={partner} />
      </div>
    ));

  return (
    <section className={css.root}>
      <div className={css.container}>
        <div className={css.header}>
          <span className={css.kicker}>
            <FormattedMessage id="NewLandingPage.partnersKicker" />
          </span>
          <h2 className={css.title}>
            <FormattedMessage id="NewLandingPage.partnersTitle" />
          </h2>
        </div>
      </div>
      <div className={css.track} aria-hidden="true">
        <div className={css.marquee}>
          <div className={css.marqueeContent}>{renderPartnerRow('-a')}</div>
          <div className={css.marqueeContent}>{renderPartnerRow('-b')}</div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
