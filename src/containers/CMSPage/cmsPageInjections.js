/**
 * Shared injection logic for static/CMS pages (CMSPage and LandingPage).
 * Export custom section registry, injection config, and injectCustomSections.
 */
import InjectedStatsSection from './customSections/InjectedStatsSection';
import CustomHero from './customSections/CustomHero';

/**
 * Custom Section Components Registry
 *
 * Register your custom React components here to inject them into CMS/landing pages.
 * These components will be inserted at specific positions in the page content.
 */
export const customSectionComponents = {
  customHero: { component: CustomHero },
  injectedStats: { component: InjectedStatsSection },
  // Add more custom sections here:
  // customFeatures: { component: CustomFeaturesSection },
  // customTestimonials: { component: CustomTestimonialsSection },
};

/**
 * Configuration: where to inject custom sections for each page.
 * Key = base page ID (e.g. 'new-landing', 'landing-page', 'about').
 */
export const injectionConfig = {
  'new-landing': [
    { position: -1, section: { sectionType: 'customHero', sectionId: 'custom-hero' } },
    // { position: 1, section: { sectionType: 'injectedStats', sectionId: 'stats-1' } },
  ],
  'landing-page': [
    // Rimossa customHero in prima posizione (position: -1)
    // { position: -1, section: { sectionType: 'customHero', sectionId: 'custom-hero-landing' } },
    // { position: 1, section: { sectionType: 'injectedStats', sectionId: 'stats-landing' } },
  ],
  // about: [
  //   { position: 0, section: { sectionType: 'injectedStats', sectionId: 'about-stats' } },
  // ],
};

/**
 * Inject Custom Sections into CMS/Landing Pages
 *
 * Inserts custom React components at specific positions in the Console-managed sections array.
 *
 * Position Guide:
 *   position: -1  → Insert BEFORE all Console sections (right after topbar)
 *   position: 0   → Insert AFTER 1st Console section
 *   position: 1   → Insert AFTER 2nd Console section
 *   position: N   → Insert AFTER (N+1)th Console section
 *
 * @param {Object} pageAssetsData - Page data from Sharetribe Console
 * @param {string} pageId - Base page identifier (e.g. 'new-landing', 'landing-page', 'about')
 * @returns {Object} Modified page data with injected sections
 */
export const injectCustomSections = (pageAssetsData, pageId) => {
  if (!pageAssetsData) return pageAssetsData;

  const sections = pageAssetsData.sections || [];
  const injectionsForPage = injectionConfig[pageId] || [];

  if (injectionsForPage.length === 0) {
    return pageAssetsData;
  }

  const sortedInjections = [...injectionsForPage].sort((a, b) => b.position - a.position);
  const newSections = [...sections];

  sortedInjections.forEach(({ position, section }) => {
    if (position === -1) {
      newSections.unshift(section);
    } else {
      newSections.splice(position + 1, 0, section);
    }
  });

  return {
    ...pageAssetsData,
    sections: newSections,
  };
};
