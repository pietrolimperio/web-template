import React, { useState } from 'react';
import { useConfiguration } from '../../context/configurationContext';
import loadable from '@loadable/component';
import { DEFAULT_LOCALE } from '../../config/localeConfig';

const SectionBuilder = loadable(
  () => import(/* webpackChunkName: "SectionBuilder" */ '../PageBuilder/PageBuilder'),
  {
    resolveComponent: components => components.SectionBuilder,
  }
);

const FooterComponent = () => {
  const { footer = {}, topbar } = useConfiguration();
  const [currentLocale, setCurrentLocale] = useState(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE;
    }
    return DEFAULT_LOCALE;
  });

  const handleLocaleChange = newLocale => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('marketplace_locale', newLocale);
    }

    setCurrentLocale(newLocale);

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // If footer asset is not set, let's not render Footer at all.
  if (Object.keys(footer).length === 0) {
    return null;
  }

  // The footer asset does not specify sectionId or sectionType. However, the SectionBuilder
  // expects sectionId and sectionType in order to identify the section. We add those
  // attributes here before passing the asset to SectionBuilder.
  const footerSection = {
    ...footer,
    sectionId: 'footer',
    sectionType: 'footer',
    linkLogoToExternalSite: topbar?.logoLink,
    currentLocale,
    onLocaleChange: handleLocaleChange,
  };

  return <SectionBuilder sections={[footerSection]} />;
};

// NOTE: if you want to add dynamic data to FooterComponent,
//       you could just connect this FooterContainer to Redux Store
//
// const mapStateToProps = state => {
//   const { currentUser } = state.user;
//   return { currentUser };
// };
// const FooterContainer = compose(connect(mapStateToProps))(FooterComponent);
// export default FooterContainer;

export default FooterComponent;
