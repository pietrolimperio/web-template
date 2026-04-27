import React from 'react';

import { bool, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { isScrollingDisabled } from '../../ducks/ui.duck';
import { LayoutSingleColumn, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { ASSET_NAME } from './PrivacyPolicyPage.duck';

import css from './PrivacyPolicyPage.module.css';

const lastUpdated = 'October 24, 2024';

const navItems = [
  { id: 'intro', label: '1. Introduction' },
  { id: 'collection', label: '2. Information We Collect' },
  { id: 'usage', label: '3. How We Use Data' },
  { id: 'sharing', label: '4. Sharing & Disclosure' },
  { id: 'rights', label: '5. Your Rights' },
];

const dataCards = [
  {
    icon: 'person',
    title: 'Personal Data',
    text:
      'Name, email address, phone number, and physical address for delivery or pickup coordination.',
  },
  {
    icon: 'payments',
    title: 'Transaction Info',
    text:
      'Payment details processed via secure third-party gateways and history of items listed or rented.',
  },
];

const usageItems = [
  'To facilitate peer-to-peer rental agreements and identity verification.',
  'To communicate with you regarding your listings, requests, or account security.',
  'To improve our platform algorithms for better item matching and user experience.',
];

const disclosureItems = [
  {
    title: 'Service Providers',
    text:
      'We share data with third-party vendors who perform services for us, such as payment processing, data analysis, and email delivery.',
  },
  {
    title: 'The Community',
    text:
      'Specific profile information (reviews, first name) is visible to other users to build trust within the marketplace.',
  },
];

const Icon = props => {
  const { name } = props;
  return (
    <span className={css.icon} aria-hidden="true">
      {name === 'person' ? 'P' : name === 'payments' ? '$' : 'OK'}
    </span>
  );
};

Icon.propTypes = {
  name: string.isRequired,
};

const PrivacyPolicyContent = () => {
  return (
    <div className={css.contentRoot}>
      <aside className={css.sidebar} aria-label="Privacy policy navigation">
        <div className={css.sidebarInner}>
          <h2 className={css.sidebarTitle}>Navigation</h2>
          <nav className={css.nav}>
            {navItems.map(item => (
              <a key={item.id} className={css.navLink} href={`#${item.id}`}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className={css.helpBox}>
            <p>Have questions about your data?</p>
            <a className={css.helpButton} href="mailto:privacy@leaz.eu">
              Contact Privacy Team
            </a>
          </div>
        </div>
      </aside>

      <article className={css.article}>
        <header className={css.hero}>
          <span className={css.kicker}>Legal Document</span>
          <h1>Privacy Policy</h1>
          <p>Last updated: {lastUpdated}</p>
          <span className={css.heroRule} aria-hidden="true" />
        </header>

        <section className={css.panel} id="intro">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Leaz. We are committed to protecting your personal information and your right
            to privacy. When you use our peer-to-peer sharing platform, you trust us with your
            personal data. This privacy policy describes how we collect, use, and protect that
            information.
          </p>
          <p>
            At Leaz, sustainability and community trust are our core values. We believe that being
            transparent about our data practices is essential to maintaining the trust of our
            sharing community.
          </p>
        </section>

        <section className={css.section} id="collection">
          <h2>2. Information We Collect</h2>
          <div className={css.cardGrid}>
            {dataCards.map(card => (
              <div key={card.title} className={css.dataCard}>
                <h3>
                  <Icon name={card.icon} />
                  {card.title}
                </h3>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
          <p className={css.note}>We do not store full credit card numbers on our servers.</p>
        </section>

        <section className={css.panelMuted} id="usage">
          <h2>3. How We Use Data</h2>
          <ul className={css.checkList}>
            {usageItems.map(item => (
              <li key={item}>
                <Icon name="check" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={css.section} id="sharing">
          <h2>4. Sharing & Disclosure</h2>
          <p>
            We only share information with your consent, to comply with laws, to provide you with
            services, or to fulfill business obligations.
          </p>
          <div className={css.disclosureList}>
            {disclosureItems.map(item => (
              <details key={item.title} className={css.disclosure}>
                <summary>{item.title}</summary>
                <p>{item.text}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={css.panel} id="rights">
          <h2>5. Your Rights</h2>
          <p>
            Depending on your location, you may have rights under the GDPR or CCPA to access,
            correct, or delete your personal data.
          </p>
          <div className={css.actionRow}>
            <a href="mailto:privacy@leaz.eu?subject=Data%20portability%20request">
              Request Data Portability
            </a>
            <a href="mailto:privacy@leaz.eu?subject=Account%20deletion%20request">
              Request Account Deletion
            </a>
          </div>
        </section>
      </article>
    </div>
  );
};

const PrivacyPolicyPageComponent = props => {
  const { scrollingDisabled } = props;
  const title = 'Privacy Policy | Leaz';
  const description =
    'Privacy Policy for Leaz, the peer-to-peer marketplace for renting everyday items.';
  const schema = {
    '@context': 'http://schema.org',
    '@type': 'WebPage',
    description,
    name: title,
  };

  return (
    <Page
      title={title}
      description={description}
      schema={schema}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.page}>
          <PrivacyPolicyContent />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

PrivacyPolicyPageComponent.propTypes = {
  scrollingDisabled: bool,
};

const mapStateToProps = state => {
  return {
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const PrivacyPolicyPage = compose(connect(mapStateToProps))(PrivacyPolicyPageComponent);

const PRIVACY_POLICY_ASSET_NAME = ASSET_NAME;
export { PRIVACY_POLICY_ASSET_NAME, PrivacyPolicyPageComponent, PrivacyPolicyContent };

export default PrivacyPolicyPage;
