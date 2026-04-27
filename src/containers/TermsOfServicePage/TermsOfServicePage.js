import React from 'react';
import loadable from '@loadable/component';

import { bool, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { isScrollingDisabled } from '../../ducks/ui.duck';

import { LayoutSingleColumn, Page } from '../../components';
import { H1 } from '../PageBuilder/Primitives/Heading';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import { fallbackSections } from './FallbackPage';
import { ASSET_NAME } from './TermsOfServicePage.duck';

import css from './TermsOfServicePage.module.css';

const SectionBuilder = loadable(
  () => import(/* webpackChunkName: "SectionBuilder" */ '../PageBuilder/PageBuilder'),
  {
    resolveComponent: components => components.SectionBuilder,
  }
);

const lastUpdated = 'October 24, 2024';

const navItems = [
  { id: 'acceptance', label: '1. Acceptance of Terms' },
  { id: 'services', label: '2. Description of Services' },
  { id: 'accounts', label: '3. User Accounts & Security' },
  { id: 'sharing', label: '4. Peer-to-Peer Sharing Rules' },
  { id: 'fees', label: '5. Fees and Payments' },
  { id: 'liability', label: '6. Limitation of Liability' },
  { id: 'termination', label: '7. Termination' },
  { id: 'contact', label: '8. Contact Information' },
];

const accountRules = [
  'You are responsible for maintaining the confidentiality of your account credentials.',
  'You must immediately notify Leaz of any unauthorized use of your account.',
  'Users must be at least 18 years old to create an account.',
];

const responsibilityCards = [
  {
    title: 'Lender Responsibility',
    text: 'Maintain insurance, ensure safety standards, and provide accurate availability.',
  },
  {
    title: 'Borrower Responsibility',
    text: 'Timely return, honest communication, and coverage of any damage incurred.',
  },
];

const Icon = props => {
  const { name } = props;
  return (
    <span className={css.icon} aria-hidden="true">
      {name === 'mail' ? '@' : name === 'shield' ? 'OK' : 'i'}
    </span>
  );
};

Icon.propTypes = {
  name: string.isRequired,
};

// This "content-only" component can be used in modals etc.
const TermsOfServiceContent = props => {
  const { inProgress, error, data } = props;

  // We don't want to add h1 heading twice to the HTML (SEO issue).
  // Modal's header is mapped as h2
  const hasContent = data => typeof data?.content === 'string';
  const exposeContentAsChildren = data => {
    return hasContent(data) ? { children: data.content } : {};
  };

  if (!hasContent(data) && inProgress) {
    return null;
  }

  const CustomHeading1 = props => <H1 as="h2" {...props} />;

  const hasData = error === null && data;
  const sectionsData = hasData ? data : fallbackSections;

  return (
    <SectionBuilder
      {...sectionsData}
      options={{
        fieldComponents: {
          heading1: { component: CustomHeading1, pickValidProps: exposeContentAsChildren },
        },
        isInsideContainer: true,
      }}
    />
  );
};

const TermsOfServiceDocument = () => {
  return (
    <div className={css.page}>
      <section className={css.hero}>
        <div className={css.heroInner}>
          <p className={css.eyebrow}>Legal Document</p>
          <h1>Terms & Conditions</h1>
          <p>
            Last updated: {lastUpdated}. Please read these terms carefully before using the Leaz
            platform.
          </p>
        </div>
      </section>

      <div className={css.documentRoot}>
        <aside className={css.sidebar} aria-label="Terms and conditions navigation">
          <div className={css.sidebarInner}>
            <h2 className={css.sidebarTitle}>Table of Contents</h2>
            <nav className={css.nav}>
              {navItems.map(item => (
                <a key={item.id} className={css.navLink} href={`#${item.id}`}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className={css.article}>
          <section className={css.section} id="acceptance">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Leaz platform, you agree to be bound by these Terms and
              Conditions and our Privacy Policy. If you do not agree to all of these terms, do not
              use the Service.
            </p>
            <p>
              We reserve the right to modify these terms at any time. We will provide notice of
              significant changes by posting the new terms on the platform and updating the "Last
              updated" date.
            </p>
          </section>

          <section className={css.section} id="services">
            <h2>2. Description of Services</h2>
            <p>
              Leaz provides a peer-to-peer marketplace platform that allows users to list, discover,
              and rent items from other individuals. Leaz does not own, create, sell, resell,
              provide, control, manage, offer, deliver, or supply any listings or host services.
            </p>
            <p>
              Users are solely responsible for their listings and the items they share. When users
              make or accept a booking, they are entering into a contract directly with each other.
            </p>
          </section>

          <section className={css.section} id="accounts">
            <h2>3. User Accounts & Security</h2>
            <p>
              To access certain features of the platform, you must register for an account. You must
              provide accurate, current, and complete information during the registration process.
            </p>
            <ul className={css.bulletList}>
              {accountRules.map(rule => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          <div className={css.trustCallout}>
            <div className={css.calloutIcon}>
              <Icon name="shield" />
            </div>
            <div>
              <h2>Trust & Safety is Our Priority</h2>
              <p>
                We verify our community members to ensure a sustainable and safe sharing
                environment. Always communicate through our secure messaging system.
              </p>
            </div>
          </div>

          <section className={css.section} id="sharing">
            <h2>4. Peer-to-Peer Sharing Rules</h2>
            <p>
              Lenders represent and warrant that any item they list is accurately described and in
              safe, working condition. Borrowers agree to treat the items with care and return them
              in the same condition as received.
            </p>
            <div className={css.responsibilityGrid}>
              {responsibilityCards.map(card => (
                <div key={card.title} className={css.responsibilityCard}>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={css.section} id="fees">
            <h2>5. Fees and Payments</h2>
            <p>
              Leaz charges a service fee for each transaction to maintain the platform and provide
              support. Fees are clearly displayed before any transaction is finalized.
            </p>
            <p>
              Payments are processed through secure third-party providers. Leaz does not store full
              credit card details on its servers.
            </p>
          </section>

          <section className={css.quotePanel} id="liability">
            <h2>6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Leaz shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of profits or
              revenues, whether incurred directly or indirectly, or any split of data, use,
              goodwill, or other intangible losses, resulting from your access to or use of or
              inability to access or use the services.
            </p>
          </section>

          <section className={css.section} id="termination">
            <h2>7. Termination</h2>
            <p>
              We may suspend or terminate access to the platform if a user breaches these terms,
              creates risk for the community, or uses Leaz in a way that harms other users or the
              marketplace.
            </p>
            <p>
              You may stop using the Service at any time. Existing rental obligations, payment
              obligations, and dispute-resolution duties remain active until they are fully settled.
            </p>
          </section>

          <section className={css.contactPanel} id="contact">
            <h2>Questions about these Terms?</h2>
            <p>
              Our support team is here to help clarify any part of our agreement. We aim to respond
              within 24 hours.
            </p>
            <div className={css.actionRow}>
              <a className={css.primaryAction} href="mailto:support@leaz.eu">
                <Icon name="mail" />
                Contact Support
              </a>
              <a className={css.secondaryAction} href="/p/faq">
                View Help Center
              </a>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};

// Presentational component for TermsOfServicePage
const TermsOfServicePageComponent = props => {
  const { scrollingDisabled } = props;
  const title = 'Terms & Conditions | Leaz';
  const description =
    'Terms and Conditions for Leaz, the peer-to-peer marketplace for renting everyday items.';
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
        <TermsOfServiceDocument />
      </LayoutSingleColumn>
    </Page>
  );
};

TermsOfServicePageComponent.propTypes = {
  scrollingDisabled: bool,
};

const mapStateToProps = state => {
  return {
    scrollingDisabled: isScrollingDisabled(state),
  };
};

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const TermsOfServicePage = compose(connect(mapStateToProps))(TermsOfServicePageComponent);

const TOS_ASSET_NAME = ASSET_NAME;
export {
  TOS_ASSET_NAME,
  TermsOfServicePageComponent,
  TermsOfServiceContent,
  TermsOfServiceDocument,
};

export default TermsOfServicePage;
