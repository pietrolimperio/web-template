/**
 * TopbarMobileMenu – Side drawer for mobile.
 * Renders a guest variant or an authenticated-user variant depending on auth state.
 */
import React from 'react';
import classNames from 'classnames';

import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import { FormattedMessage } from '../../../../util/reactIntl';
import { ensureCurrentUser } from '../../../../util/data';

import {
  AvatarLarge,
  ExternalLink,
  InlineTextButton,
  NamedLink,
  NotificationBadge,
} from '../../../../components';

import logoImage from '../../../../assets/logo.png';
import css from './TopbarMobileMenu.module.css';

/* ------------------------------------------------------------------ */
/*  SVG icon helpers (inline to avoid extra dependencies)              */
/* ------------------------------------------------------------------ */

const IconAccountCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z" />
  </svg>
);

const IconLogin = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
  </svg>
);

const IconPersonAdd = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const IconGridView = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z" />
  </svg>
);

const IconInfo = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
);

const IconHelp = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
  </svg>
);

const IconInventory = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z" />
  </svg>
);

const IconShoppingBasket = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.21 9l-4.38-6.56a.993.993 0 00-.83-.42c-.32 0-.64.14-.83.43L6.79 9H2c-.55 0-1 .45-1 1 0 .09.01.18.04.27l2.54 9.27c.23.84 1 1.46 1.92 1.46h13c.92 0 1.69-.62 1.93-1.46l2.54-9.27L23 10c0-.55-.45-1-1-1h-4.79zM9 9l3-4.4L15 9H9zm3 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
);

const IconFavorite = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const IconChat = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
  </svg>
);

const IconNotifications = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
  </svg>
);

const IconSettings = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z" />
  </svg>
);

const IconLogout = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
  </svg>
);

const IconLanguage = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
  </svg>
);

const IconStar = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

const IconVerified = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Custom link (from topbar config)                                   */
/* ------------------------------------------------------------------ */

const CustomLinkComponent = ({ linkConfig, currentPage }) => {
  const { text, type, href, route } = linkConfig;
  const getCurrentPageClass = page => {
    const hasPageName = name => currentPage?.indexOf(name) === 0;
    const isCMSPage = pageId => hasPageName('CMSPage') && currentPage === `${page}:${pageId}`;
    const isInboxPage = tab => hasPageName('InboxPage') && currentPage === `${page}:${tab}`;
    const isCurrentPage = currentPage === page;

    return isCMSPage(route?.params?.pageId) || isInboxPage(route?.params?.tab) || isCurrentPage
      ? css.currentPage
      : null;
  };

  if (type === 'internal' && route) {
    const { name, params, to } = route || {};
    const className = classNames(css.navigationLink, getCurrentPageClass(name));
    return (
      <NamedLink name={name} params={params} to={to} className={className}>
        <span className={css.menuItemBorder} />
        {text}
      </NamedLink>
    );
  }
  return (
    <ExternalLink href={href} className={css.navigationLink}>
      <span className={css.menuItemBorder} />
      {text}
    </ExternalLink>
  );
};

/* ------------------------------------------------------------------ */
/*  GUEST drawer                                                       */
/* ------------------------------------------------------------------ */

const GuestDrawerContent = ({ customLinks, currentPage }) => {
  const extraLinks = customLinks.map((linkConfig, i) => (
    <CustomLinkComponent
      key={`${linkConfig.text}_${i}`}
      linkConfig={linkConfig}
      currentPage={currentPage}
    />
  ));

  return (
    <nav className={css.root}>
      {/* Header */}
      <div className={css.guestHeader}>
        <img src={logoImage} alt="Leaz" className={css.brandLogo} />
        <div className={css.guestHeaderInner}>
          <div className={css.guestAvatarCircle}>
            <IconAccountCircle className={css.guestAvatarIcon} />
          </div>
          <div className={css.guestGreetingText}>
            <span className={css.guestGreetingName}>
              <FormattedMessage id="TopbarMobileMenu.guestGreeting" />
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={css.navigation}>
        <NamedLink name="LoginPage" className={css.navItemActive}>
          <IconLogin className={css.navIconActive} />
          <span className={css.navLabel}>
            <FormattedMessage id="TopbarMobileMenu.loginLink" />
          </span>
        </NamedLink>

        <NamedLink name="SignupPage" className={css.navItem}>
          <IconPersonAdd className={css.navIcon} />
          <span className={css.navLabel}>
            <FormattedMessage id="TopbarMobileMenu.signupLink" />
          </span>
        </NamedLink>

        <NamedLink name="ExploreCategoriesPage" className={css.navItem}>
          <IconGridView className={css.navIcon} />
          <span className={css.navLabel}>
            <FormattedMessage id="TopbarMobileMenu.browseCategories" />
          </span>
        </NamedLink>

        <NamedLink name="CMSPage" params={{ pageId: 'how-it-works' }} className={css.navItem}>
          <IconInfo className={css.navIcon} />
          <span className={css.navLabel}>
            <FormattedMessage id="TopbarMobileMenu.howItWorks" />
          </span>
        </NamedLink>

        <NamedLink name="CMSPage" params={{ pageId: 'help' }} className={css.navItem}>
          <IconHelp className={css.navIcon} />
          <span className={css.navLabel}>
            <FormattedMessage id="TopbarMobileMenu.help" />
          </span>
        </NamedLink>

        {extraLinks.length > 0 && <div className={css.navDivider} />}
        <div className={css.customLinksWrapper}>{extraLinks}</div>
      </div>

      {/* CTA Card */}
      <div className={css.ctaSection}>
        <div className={css.ctaCard}>
          <div className={css.ctaCardDecoration} />
          <div className={css.ctaCardContent}>
            <h3 className={css.ctaTitle}>
              <FormattedMessage id="TopbarMobileMenu.ctaTitle" />
            </h3>
            <p className={css.ctaDescription}>
              <FormattedMessage id="TopbarMobileMenu.ctaDescription" />
            </p>
            <NamedLink name="AIListingCreationPage" className={css.ctaButton}>
              <FormattedMessage id="TopbarMobileMenu.ctaButton" />
            </NamedLink>
          </div>
        </div>
      </div>
    </nav>
  );
};

/* ------------------------------------------------------------------ */
/*  AUTHENTICATED drawer                                               */
/* ------------------------------------------------------------------ */

const AuthenticatedDrawerContent = ({
  currentUser,
  currentPage,
  inboxTab,
  notificationCount,
  customLinks,
  onLogout,
  showCreateListingsLink,
}) => {
  const user = ensureCurrentUser(currentUser);
  const displayName = user.attributes.profile.firstName;

  const isActivePage = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    const isInboxPage = currentPage?.indexOf('InboxPage') === 0 && page?.indexOf('InboxPage') === 0;
    return currentPage === page || isAccountSettingsPage || isInboxPage;
  };

  const navItemClass = page => (isActivePage(page) ? css.navItemActive : css.navItem);
  const navIconClass = page => (isActivePage(page) ? css.navIconActive : css.navIcon);
  const hasNotifications = notificationCount > 0;

  const extraLinks = customLinks.map((linkConfig, i) => (
    <CustomLinkComponent
      key={`${linkConfig.text}_${i}`}
      linkConfig={linkConfig}
      currentPage={currentPage}
    />
  ));

  return (
    <div className={css.root}>
      <div className={css.authHeader}>
        <img src={logoImage} alt="Leaz" className={css.brandLogo} />
      </div>

      <div className={css.authBody}>
        <nav className={css.sectionNav}>
          <p className={css.sectionLabel}>
            <FormattedMessage id="TopbarMobileMenu.sectionActivity" />
          </p>
          <NamedLink
            name="InboxPage"
            params={{ tab: inboxTab }}
            className={navItemClass(`InboxPage:${inboxTab}`)}
          >
            <IconInventory className={navIconClass(`InboxPage:${inboxTab}`)} />
            <span className={css.navLabel}>
              <FormattedMessage id="TopbarMobileMenu.inboxLink" />
            </span>
            {hasNotifications ? (
              <NotificationBadge className={css.notificationBadge} count={notificationCount} />
            ) : null}
          </NamedLink>

          {showCreateListingsLink ? (
            <NamedLink name="ManageListingsPage" className={navItemClass('ManageListingsPage')}>
              <IconShoppingBasket className={navIconClass('ManageListingsPage')} />
              <span className={css.navLabel}>
                <FormattedMessage id="TopbarMobileMenu.yourListingsLink" />
              </span>
            </NamedLink>
          ) : null}

          <NamedLink name="SearchPage" className={css.navItem}>
            <IconFavorite className={css.navIcon} />
            <span className={css.navLabel}>
              <FormattedMessage id="TopbarMobileMenu.favoriteItemsLink" />
            </span>
          </NamedLink>
        </nav>

        {showCreateListingsLink ? (
          <NamedLink className={css.publishButton} name="AIListingCreationPage">
            <IconPersonAdd className={css.publishIcon} />
            <FormattedMessage id="TopbarMobileMenu.newListingLink" />
          </NamedLink>
        ) : null}

        <nav className={css.sectionNav}>
          <p className={css.sectionLabel}>
            <FormattedMessage id="TopbarMobileMenu.sectionBrowse" />
          </p>
          <NamedLink name="ExploreCategoriesPage" className={navItemClass('ExploreCategoriesPage')}>
            <IconGridView className={navIconClass('ExploreCategoriesPage')} />
            <span className={css.navLabel}>
              <FormattedMessage id="TopbarMobileMenu.browseCategories" />
            </span>
          </NamedLink>
          <NamedLink
            name="CMSPage"
            params={{ pageId: 'faq' }}
            className={navItemClass('CMSPage:faq')}
          >
            <IconInfo className={navIconClass('CMSPage:faq')} />
            <span className={css.navLabel}>
              <FormattedMessage id="TopbarMobileMenu.howItWorks" />
            </span>
          </NamedLink>
        </nav>

        <nav className={css.sectionNav}>
          <p className={css.sectionLabel}>
            <FormattedMessage id="TopbarMobileMenu.sectionAccount" />
          </p>
          <NamedLink name="AccountSettingsPage" className={navItemClass('AccountSettingsPage')}>
            <IconSettings className={navIconClass('AccountSettingsPage')} />
            <span className={css.navLabel}>
              <FormattedMessage id="TopbarMobileMenu.accountSettingsLink" />
            </span>
          </NamedLink>
          <InlineTextButton rootClassName={css.logoutNavItem} onClick={onLogout}>
            <IconLogout className={css.logoutNavIcon} />
            <span className={css.navLabel}>
              <FormattedMessage id="TopbarMobileMenu.logoutLink" />
            </span>
          </InlineTextButton>
        </nav>

        {extraLinks.length > 0 ? (
          <nav className={css.sectionNav}>
            <p className={css.sectionLabel}>
              <FormattedMessage id="TopbarMobileMenu.sectionMore" />
            </p>
            <div className={css.customLinksWrapper}>{extraLinks}</div>
          </nav>
        ) : null}
      </div>

      <div className={css.userFooter}>
        <div className={css.userCard}>
          <div className={css.userAvatarWrapper}>
            <AvatarLarge className={css.avatar} user={currentUser} />
            <div className={css.verifiedBadge}>
              <IconVerified className={css.verifiedIcon} />
            </div>
          </div>
          <div className={css.userInfo}>
            <span className={css.userName}>
              <FormattedMessage id="TopbarMobileMenu.greeting" values={{ displayName }} />
            </span>
            <span className={css.userSubtitle}>
              <FormattedMessage id="TopbarMobileMenu.memberLabel" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main exported component                                            */
/* ------------------------------------------------------------------ */

/**
 * Side drawer menu for mobile layout.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isAuthenticated
 * @param {string?} props.currentPage
 * @param {Object?} props.currentUser
 * @param {number} props.notificationCount
 * @param {Array<Object>} props.customLinks
 * @param {Function} props.onLogout
 * @param {boolean} props.showCreateListingsLink
 * @param {string} props.inboxTab
 * @returns {JSX.Element}
 */
const TopbarMobileMenu = props => {
  const {
    isAuthenticated,
    currentPage,
    inboxTab,
    currentUser,
    notificationCount = 0,
    customLinks,
    onLogout,
    showCreateListingsLink,
  } = props;

  if (!isAuthenticated) {
    return <GuestDrawerContent customLinks={customLinks} currentPage={currentPage} />;
  }

  return (
    <AuthenticatedDrawerContent
      currentUser={currentUser}
      currentPage={currentPage}
      inboxTab={inboxTab}
      notificationCount={notificationCount}
      customLinks={customLinks}
      onLogout={onLogout}
      showCreateListingsLink={showCreateListingsLink}
    />
  );
};

export default TopbarMobileMenu;
