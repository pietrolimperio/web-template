import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { NamedLink } from '../../components';

import css from './CustomSectionsWrapper.module.css';

/**
 * Example Custom Sections
 * You can create your own components here that aren't available in Page Builder
 */

// Example 2: Custom CTA Section
const CustomCTA = () => {
  return (
    <div className={css.customCTA}>
      <h2 className={css.ctaTitle}>Ready to get started?</h2>
      <NamedLink name="SignupPage" className={css.ctaButton}>
        <FormattedMessage id="CustomCTA.signup" defaultMessage="Sign up now" />
      </NamedLink>
    </div>
  );
};

// Example 3: Custom Stats Section
const CustomStatsSection = () => {
  return (
    <div className={css.statsSection}>
      <div className={css.stat}>
        <h3 className={css.statNumber}>10,000+</h3>
        <p className={css.statLabel}>Active Listings</p>
      </div>
      <div className={css.stat}>
        <h3 className={css.statNumber}>50,000+</h3>
        <p className={css.statLabel}>Happy Customers</p>
      </div>
      <div className={css.stat}>
        <h3 className={css.statNumber}>100+</h3>
        <p className={css.statLabel}>Cities</p>
      </div>
    </div>
  );
};

/**
 * Configuration: Define which custom sections to show for each page
 */
const PAGE_CUSTOM_SECTIONS = {
  'new-landing': {
    before: [
      // NOTE: Don't put content here - it will appear BEFORE the topbar!
      // Use Approach 3 (injection in CMSPage.js) instead
    ],
    after: [
      // Sections to render AFTER Console content (below footer)
      //{ component: CustomStatsSection, key: 'stats' },
      //{ component: CustomCTA, key: 'cta' },
    ],
  },
  about: {
    before: [],
    //after: [{ component: CustomCTA, key: 'cta' }],
  },
  terms: {
    before: [],
    after: [],
  },
};

/**
 * Wrapper component that injects custom sections before/after Console content
 *
 * @param {Object} props
 * @param {string} props.pageId - The CMS page identifier (e.g., 'new-landing', 'about')
 * @param {ReactNode} props.children - The PageBuilder component (Console content)
 */
export const CustomSectionsWrapper = ({ pageId, children }) => {
  const config = PAGE_CUSTOM_SECTIONS[pageId] || { before: [], after: [] };

  return (
    <>
      {/* Render custom sections BEFORE Console content */}
      {config.before.map(({ component: Component, key }) => (
        <Component key={key} />
      ))}

      {/* Render Console content (PageBuilder) */}
      {children}

      {/* Render custom sections AFTER Console content */}
      {config.after.map(({ component: Component, key }) => (
        <Component key={key} />
      ))}
    </>
  );
};

export default CustomSectionsWrapper;
