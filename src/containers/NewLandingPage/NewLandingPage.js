import React from 'react';
import { bool, array, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import { propTypes } from '../../util/types';

import { LayoutComposer, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import HeroSection from './sections/HeroSection';
import CategoriesSection from './sections/CategoriesSection';
import PopularListingsSection from './sections/PopularListingsSection';
import PartnersSection from './sections/PartnersSection';
import ValuePropositionSection from './sections/ValuePropositionSection';

import css from './NewLandingPage.module.css';

const NewLandingPageComponent = props => {
  const {
    scrollingDisabled,
    popularListings,
    fetchPopularInProgress,
  } = props;
  const intl = useIntl();

  const siteTitle = intl.formatMessage({ id: 'NewLandingPage.schemaTitle' });
  const schemaDescription = intl.formatMessage({ id: 'NewLandingPage.schemaDescription' });

  const layoutAreas = `
    topbar
    main
    footer
  `;

  return (
    <Page
      title={siteTitle}
      description={schemaDescription}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: siteTitle,
        description: schemaDescription,
      }}
    >
      <LayoutComposer areas={layoutAreas} className={css.layout}>
        {layoutProps => {
          const { Topbar, Main, Footer } = layoutProps;
          return (
            <>
              <Topbar as="header" className={css.topbar}>
                <TopbarContainer currentPage="LandingPage" />
              </Topbar>
              <Main as="main" className={css.main}>
                <HeroSection />
                <ValuePropositionSection />
                <CategoriesSection />
                <PopularListingsSection
                  listings={popularListings}
                  inProgress={fetchPopularInProgress}
                />
                <PartnersSection />
              </Main>
              <Footer>
                <FooterContainer />
              </Footer>
            </>
          );
        }}
      </LayoutComposer>
    </Page>
  );
};

NewLandingPageComponent.propTypes = {
  scrollingDisabled: bool.isRequired,
  popularListings: array.isRequired,
  fetchPopularInProgress: bool.isRequired,
};

const mapStateToProps = state => {
  const { popularListingIds, fetchPopularInProgress } = state.NewLandingPage;
  const popularListings = getListingsById(state, popularListingIds);
  return {
    scrollingDisabled: isScrollingDisabled(state),
    popularListings,
    fetchPopularInProgress,
  };
};

const NewLandingPage = compose(connect(mapStateToProps))(NewLandingPageComponent);

export default NewLandingPage;
