import React, { useEffect, useMemo, useState } from 'react';

import { bool, object, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { LayoutSingleColumn, Page } from '../../components';
import { fetchPageAsset } from '../../util/pageAssetsApi';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { ASSET_NAME } from './PrivacyPolicyPage.duck';

import css from './PrivacyPolicyPage.module.css';

const pageKey = 'privacy-policy';

const getCurrentMarketplaceLocale = intlLocale => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('marketplace_locale') || intlLocale;
  }
  return intlLocale;
};

const fallbackPageAsset = {
  pageKey,
  locale: 'en',
  title: 'Privacy Policy',
  lastUpdated: 'October 24, 2024',
  navigation: [
    { sectionId: 'introduction', label: 'Introduction' },
    { sectionId: 'information-we-collect', label: 'Information We Collect' },
    { sectionId: 'how-we-use-data', label: 'How We Use Data' },
    { sectionId: 'sharing-disclosure', label: 'Sharing & Disclosure' },
    { sectionId: 'your-rights', label: 'Your Rights' },
  ],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction',
      blocks: [
        {
          type: 'paragraph',
          text:
            'Welcome to Leaz. We are committed to protecting your personal information and your right to privacy. When you use our peer-to-peer sharing platform, you trust us with your personal data. This privacy policy describes how we collect, use, and protect that information.',
        },
        {
          type: 'paragraph',
          text:
            'At Leaz, sustainability and community trust are our core values. We believe that being transparent about our data practices is essential to maintaining the trust of our sharing community.',
        },
      ],
    },
    {
      id: 'information-we-collect',
      title: 'Information We Collect',
      blocks: [
        {
          type: 'cards',
          items: [
            {
              title: 'Personal Data',
              text:
                'Name, email address, phone number, and physical address for delivery or pickup coordination.',
            },
            {
              title: 'Transaction Info',
              text:
                'Payment details processed via secure third-party gateways and history of items listed or rented.',
            },
          ],
        },
        {
          type: 'note',
          text: 'We do not store full credit card numbers on our servers.',
        },
      ],
    },
    {
      id: 'how-we-use-data',
      title: 'How We Use Data',
      blocks: [
        {
          type: 'bullets',
          items: [
            {
              text: 'To facilitate peer-to-peer rental agreements and identity verification.',
            },
            {
              text:
                'To communicate with you regarding your listings, requests, or account security.',
            },
            {
              text:
                'To improve our platform algorithms for better item matching and user experience.',
            },
          ],
        },
      ],
    },
    {
      id: 'sharing-disclosure',
      title: 'Sharing & Disclosure',
      blocks: [
        {
          type: 'paragraph',
          text:
            'We only share information with your consent, to comply with laws, to provide you with services, or to fulfill business obligations.',
        },
        {
          type: 'disclosures',
          items: [
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
          ],
        },
      ],
    },
    {
      id: 'your-rights',
      title: 'Your Rights',
      blocks: [
        {
          type: 'paragraph',
          text:
            'Depending on your location, you may have rights under the GDPR or CCPA to access, correct, or delete your personal data.',
        },
        {
          type: 'actions',
          items: [{ label: 'Request Data Portability' }, { label: 'Request Account Deletion' }],
        },
      ],
    },
  ],
};

const numberedLabel = (index, label) => `${index + 1}. ${label}`;

const Icon = props => {
  const { name } = props;
  return (
    <span className={css.icon} aria-hidden="true">
      {name === 'card' ? 'P' : name === 'action' ? '$' : 'OK'}
    </span>
  );
};

Icon.propTypes = {
  name: string.isRequired,
};

const getActionHref = label => {
  const subject = encodeURIComponent(label || 'Privacy request');
  return `mailto:privacy@leaz.eu?subject=${subject}`;
};

const Block = props => {
  const { block } = props;

  switch (block.type) {
    case 'paragraph':
      return block.text ? <p>{block.text}</p> : null;
    case 'cards':
      return block.items?.length ? (
        <div className={css.cardGrid}>
          {block.items.map((item, index) => (
            <div key={`${item.title}-${index}`} className={css.dataCard}>
              <h3>
                <Icon name={index === 0 ? 'card' : 'action'} />
                {item.title}
              </h3>
              {item.text ? <p>{item.text}</p> : null}
            </div>
          ))}
        </div>
      ) : null;
    case 'note':
      return block.text ? <p className={css.note}>{block.text}</p> : null;
    case 'bullets':
      return block.items?.length ? (
        <ul className={css.checkList}>
          {block.items.map((item, index) => (
            <li key={`${item.text}-${index}`}>
              <Icon name="check" />
              <span>{item.text || item.label}</span>
            </li>
          ))}
        </ul>
      ) : null;
    case 'disclosures':
      return block.items?.length ? (
        <div className={css.disclosureList}>
          {block.items.map((item, index) => (
            <details key={`${item.title}-${index}`} className={css.disclosure}>
              <summary>{item.title}</summary>
              {item.text ? <p>{item.text}</p> : null}
            </details>
          ))}
        </div>
      ) : null;
    case 'actions':
      return block.items?.length ? (
        <div className={css.actionRow}>
          {block.items.map((item, index) => (
            <a key={`${item.label}-${index}`} href={getActionHref(item.label)}>
              {item.label}
            </a>
          ))}
        </div>
      ) : null;
    default:
      return null;
  }
};

Block.propTypes = {
  block: object.isRequired,
};

const PrivacyPolicyDocument = props => {
  const { asset, isFallback } = props;
  const navigation =
    asset.navigation?.length > 0
      ? asset.navigation
      : asset.sections.map(section => ({ sectionId: section.id, label: section.title }));

  return (
    <div className={css.contentRoot}>
      <aside className={css.sidebar} aria-label="Privacy policy navigation">
        <div className={css.sidebarInner}>
          <h2 className={css.sidebarTitle}>Navigation</h2>
          <nav className={css.nav}>
            {navigation.map((item, index) => (
              <a key={item.sectionId} className={css.navLink} href={`#${item.sectionId}`}>
                {numberedLabel(index, item.label)}
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
          <h1>{asset.title}</h1>
          {asset.lastUpdated ? <p>Last updated: {asset.lastUpdated}</p> : null}
          {isFallback ? (
            <p className={css.unavailableNotice}>
              We could not load the localized policy right now, so this fallback version is shown.
            </p>
          ) : null}
          <span className={css.heroRule} aria-hidden="true" />
        </header>

        {asset.sections.map((section, index) => {
          const sectionClassName =
            index === 0 || index === asset.sections.length - 1 ? css.panel : css.section;
          return (
            <section key={section.id} className={sectionClassName} id={section.id}>
              <h2>{numberedLabel(index, section.title)}</h2>
              {section.blocks.map((block, blockIndex) => (
                <Block key={`${section.id}-${block.type}-${blockIndex}`} block={block} />
              ))}
            </section>
          );
        })}
      </article>
    </div>
  );
};

PrivacyPolicyDocument.propTypes = {
  asset: object.isRequired,
  isFallback: bool,
};

const usePrivacyPolicyAsset = () => {
  const intl = useIntl();
  const [state, setState] = useState({
    asset: fallbackPageAsset,
    loading: true,
    status: 'loading',
  });

  const locale = getCurrentMarketplaceLocale(intl?.locale);

  useEffect(() => {
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, status: 'loading' }));

    fetchPageAsset(pageKey, locale).then(result => {
      if (cancelled) {
        return;
      }
      if (result.data) {
        setState({ asset: result.data, loading: false, status: 'ok' });
      } else {
        setState({
          asset: fallbackPageAsset,
          loading: false,
          status: result.status || 'error',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  return state;
};

const PrivacyPolicyContent = () => {
  const { asset, loading, status } = usePrivacyPolicyAsset();

  return (
    <>
      {loading ? <div className={css.loading}>Loading privacy policy...</div> : null}
      <PrivacyPolicyDocument asset={asset} isFallback={status !== 'ok'} />
    </>
  );
};

const PrivacyPolicyPageComponent = props => {
  const { scrollingDisabled } = props;
  const { asset, loading, status } = usePrivacyPolicyAsset();
  const title = `${asset.title || fallbackPageAsset.title} | Leaz`;
  const description =
    'Privacy Policy for Leaz, the peer-to-peer marketplace for renting everyday items.';
  const schema = useMemo(
    () => ({
      '@context': 'http://schema.org',
      '@type': 'WebPage',
      description,
      name: title,
    }),
    [description, title]
  );

  return (
    <Page
      title={title}
      description={description}
      schema={schema}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.page}>
          {loading ? <div className={css.loading}>Loading privacy policy...</div> : null}
          <PrivacyPolicyDocument asset={asset} isFallback={status !== 'ok'} />
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
export {
  fallbackPageAsset,
  PRIVACY_POLICY_ASSET_NAME,
  PrivacyPolicyPageComponent,
  PrivacyPolicyContent,
};

export default PrivacyPolicyPage;
