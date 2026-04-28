import React, { useEffect, useMemo, useState } from 'react';
import loadable from '@loadable/component';

import { bool, object, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchPageAsset } from '../../util/pageAssetsApi';

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

const pageKey = 'terms-and-conditions';

const getCurrentMarketplaceLocale = intlLocale => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('marketplace_locale') || intlLocale;
  }
  return intlLocale;
};

const fallbackPageAsset = {
  pageKey,
  locale: 'en',
  title: 'Terms & Conditions',
  lastUpdated: 'October 24, 2024',
  navigation: [
    { sectionId: 'introduction', label: 'Introduction' },
    { sectionId: 'platform-role', label: 'Platform Role' },
    { sectionId: 'user-accounts', label: 'User Accounts' },
    { sectionId: 'listings-and-rentals', label: 'Listings and Rentals' },
    { sectionId: 'payments-and-fees', label: 'Payments and Fees' },
    { sectionId: 'user-responsibilities', label: 'User Responsibilities' },
    { sectionId: 'prohibited-conduct', label: 'Prohibited Conduct' },
    { sectionId: 'liability-and-disputes', label: 'Liability and Disputes' },
    { sectionId: 'changes-to-these-terms', label: 'Changes to These Terms' },
    { sectionId: 'contact', label: 'Contact' },
  ],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction',
      blocks: [
        {
          type: 'paragraph',
          text:
            'These Terms & Conditions govern your access to and use of Leaz, a peer-to-peer marketplace for renting everyday items.',
        },
        {
          type: 'paragraph',
          text:
            'By creating an account, publishing a listing, sending a rental request, or otherwise using the platform, you agree to follow these terms and any policies referenced by Leaz.',
        },
      ],
    },
    {
      id: 'platform-role',
      title: 'Platform Role',
      blocks: [
        {
          type: 'paragraph',
          text:
            'Leaz provides technology that helps users list, discover, request, and coordinate rentals. Leaz is not the owner, provider, renter, borrower, insurer, or carrier of the items listed by users.',
        },
        {
          type: 'note',
          text:
            'When a rental is accepted, the rental agreement is formed directly between the users involved in that transaction.',
        },
      ],
    },
    {
      id: 'user-accounts',
      title: 'User Accounts',
      blocks: [
        {
          type: 'paragraph',
          text:
            'You must provide accurate and current information when registering and keep your account details up to date.',
        },
        {
          type: 'bullets',
          items: [
            { text: 'Keep your login credentials confidential.' },
            { text: 'Notify Leaz if you suspect unauthorized access to your account.' },
            {
              text:
                'Use the platform only if you are legally able to enter into binding agreements.',
            },
            { text: 'Do not create duplicate, misleading, or fraudulent accounts.' },
          ],
        },
      ],
    },
    {
      id: 'listings-and-rentals',
      title: 'Listings and Rentals',
      blocks: [
        {
          type: 'paragraph',
          text:
            'Users who publish listings are responsible for describing their items accurately, keeping availability current, and ensuring that rented items are safe, lawful, and suitable for the intended use.',
        },
        {
          type: 'paragraph',
          text:
            'Users who rent items are responsible for reviewing listing details, respecting agreed pickup and return times, and returning items in the agreed condition.',
        },
        {
          type: 'disclosures',
          items: [
            {
              title: 'Listing accuracy',
              text:
                'Photos, descriptions, condition details, rental price, deposits, restrictions, and availability must be truthful and updated when circumstances change.',
            },
            {
              title: 'Rental handover',
              text:
                'Users should document item condition at pickup and return, communicate through Leaz when possible, and promptly report problems.',
            },
          ],
        },
      ],
    },
    {
      id: 'payments-and-fees',
      title: 'Payments and Fees',
      blocks: [
        {
          type: 'paragraph',
          text:
            'Payments may be processed by third-party payment providers. Leaz may charge service fees, commissions, or other charges that are displayed before a transaction is completed.',
        },
        {
          type: 'note',
          text:
            'Do not bypass Leaz payment or messaging flows when a transaction started on the platform. Off-platform arrangements may reduce available support and protections.',
        },
      ],
    },
    {
      id: 'user-responsibilities',
      title: 'User Responsibilities',
      blocks: [
        {
          type: 'bullets',
          items: [
            { text: 'Use Leaz honestly and in compliance with applicable law.' },
            { text: 'Communicate promptly and respectfully with other users.' },
            { text: 'Comply with rental terms agreed in the listing or conversation.' },
            { text: "Handle other users' property with care." },
            { text: 'Pay amounts due and resolve reported damage or missing items in good faith.' },
          ],
        },
      ],
    },
    {
      id: 'prohibited-conduct',
      title: 'Prohibited Conduct',
      blocks: [
        {
          type: 'bullets',
          items: [
            { text: 'Publishing illegal, unsafe, counterfeit, stolen, or prohibited items.' },
            { text: 'Providing false identity, payment, listing, or transaction information.' },
            { text: 'Harassing, threatening, discriminating against, or abusing other users.' },
            { text: 'Circumventing platform fees, security checks, or payment flows.' },
            { text: 'Interfering with the security, availability, or integrity of Leaz systems.' },
          ],
        },
      ],
    },
    {
      id: 'liability-and-disputes',
      title: 'Liability and Disputes',
      blocks: [
        {
          type: 'paragraph',
          text:
            'To the maximum extent permitted by law, Leaz is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.',
        },
        {
          type: 'paragraph',
          text:
            'Users are primarily responsible for resolving disputes related to item condition, pickup, return, damage, deposits, or transaction expectations. Leaz may provide support tools but does not become a party to the rental agreement.',
        },
        {
          type: 'note',
          text:
            'Nothing in these terms limits rights that cannot be excluded under applicable consumer or platform laws.',
        },
      ],
    },
    {
      id: 'changes-to-these-terms',
      title: 'Changes to These Terms',
      blocks: [
        {
          type: 'paragraph',
          text:
            'Leaz may update these terms from time to time. When changes are material, we will take reasonable steps to notify users or highlight the updated version on the platform.',
        },
        {
          type: 'paragraph',
          text:
            'Continued use of Leaz after updated terms become effective means you accept the revised terms.',
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      blocks: [
        {
          type: 'paragraph',
          text:
            'If you have questions about these Terms & Conditions, contact the Leaz support team.',
        },
        {
          type: 'actions',
          items: [{ label: 'Contact Support', href: 'mailto:support@leaz.eu' }],
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
      {name === 'mail' ? '@' : name === 'shield' ? 'OK' : 'i'}
    </span>
  );
};

Icon.propTypes = {
  name: string.isRequired,
};

const getActionHref = item =>
  item.href ||
  `mailto:support@leaz.eu?subject=${encodeURIComponent(item.label || 'Terms request')}`;

const Block = props => {
  const { block } = props;

  switch (block.type) {
    case 'paragraph':
      return block.text ? <p>{block.text}</p> : null;
    case 'cards':
      return block.items?.length ? (
        <div className={css.responsibilityGrid}>
          {block.items.map((item, index) => (
            <div key={`${item.title}-${index}`} className={css.responsibilityCard}>
              {item.title ? <h3>{item.title}</h3> : null}
              {item.text ? <p>{item.text}</p> : null}
            </div>
          ))}
        </div>
      ) : null;
    case 'note':
      return block.text ? <p className={css.note}>{block.text}</p> : null;
    case 'bullets':
      return block.items?.length ? (
        <ul className={css.bulletList}>
          {block.items.map((item, index) => (
            <li key={`${item.text || item.label}-${index}`}>{item.text || item.label}</li>
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
            <a
              key={`${item.label}-${index}`}
              className={index === 0 ? css.primaryAction : css.secondaryAction}
              href={getActionHref(item)}
            >
              {index === 0 ? <Icon name="mail" /> : null}
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

const TermsOfServiceDocument = props => {
  const { asset, isFallback } = props;
  const navigation =
    asset.navigation?.length > 0
      ? asset.navigation
      : asset.sections.map(section => ({ sectionId: section.id, label: section.title }));

  return (
    <div className={css.page}>
      <section className={css.hero}>
        <div className={css.heroInner}>
          <p className={css.eyebrow}>Legal Document</p>
          <h1>{asset.title}</h1>
          {asset.lastUpdated ? (
            <p>
              Last updated: {asset.lastUpdated}. Please read these terms carefully before using the
              Leaz platform.
            </p>
          ) : null}
          {isFallback ? (
            <p className={css.unavailableNotice}>
              We could not load the localized terms right now, so this fallback version is shown.
            </p>
          ) : null}
        </div>
      </section>

      <div className={css.documentRoot}>
        <aside className={css.sidebar} aria-label="Terms and conditions navigation">
          <div className={css.sidebarInner}>
            <h2 className={css.sidebarTitle}>Table of Contents</h2>
            <nav className={css.nav}>
              {navigation.map((item, index) => (
                <a key={item.sectionId} className={css.navLink} href={`#${item.sectionId}`}>
                  {numberedLabel(index, item.label)}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className={css.article}>
          {asset.sections.map((section, index) => {
            const isContactSection = index === asset.sections.length - 1;
            const hasOnlyNote = section.blocks.length === 1 && section.blocks[0]?.type === 'note';
            const sectionClassName = isContactSection
              ? css.contactPanel
              : hasOnlyNote
              ? css.quotePanel
              : css.section;

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
    </div>
  );
};

TermsOfServiceDocument.propTypes = {
  asset: object.isRequired,
  isFallback: bool,
};

const useTermsOfServiceAsset = () => {
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

// Presentational component for TermsOfServicePage
const TermsOfServicePageComponent = props => {
  const { scrollingDisabled } = props;
  const { asset, loading, status } = useTermsOfServiceAsset();
  const title = `${asset.title || fallbackPageAsset.title} | Leaz`;
  const description =
    'Terms and Conditions for Leaz, the peer-to-peer marketplace for renting everyday items.';
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
        {loading ? <div className={css.loading}>Loading terms and conditions...</div> : null}
        <TermsOfServiceDocument asset={asset} isFallback={status !== 'ok'} />
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
  fallbackPageAsset,
  TOS_ASSET_NAME,
  TermsOfServicePageComponent,
  TermsOfServiceContent,
  TermsOfServiceDocument,
};

export default TermsOfServicePage;
