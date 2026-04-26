import React from 'react';
import '@testing-library/jest-dom';

import { createImageVariantConfig } from '../../util/sdkLoader';
import { createCurrentUser, createListing } from '../../util/testData';
import {
  renderWithProviders as render,
  testingLibrary,
  getRouteConfiguration,
  getHostedConfiguration,
  createFakeDispatch,
  dispatchedActions,
} from '../../util/testHelpers';

import {
  loadData,
  searchListings,
  searchListingsRequest,
  searchListingsSuccess,
} from './SearchPage.duck';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';

const { screen, userEvent, waitFor } = testingLibrary;

const noop = () => null;

const listingTypes = [
  {
    id: 'rent-bicycles-daily',
    transactionProcess: {
      name: 'default-booking',
      alias: 'default-booking/release-1',
    },
    unitType: 'day',
  },
  {
    id: 'rent-bicycles-nightly',
    transactionProcess: {
      name: 'default-booking',
      alias: 'default-booking/release-1',
    },
    unitType: 'night',
  },
  {
    id: 'rent-bicycles-hourly',
    transactionProcess: {
      name: 'default-booking',
      alias: 'default-booking/release-1',
    },
    unitType: 'hour',
  },
  {
    id: 'sell-bicycles',
    transactionProcess: {
      name: 'default-purchase',
      alias: 'default-purchase/release-1',
    },
    unitType: 'item',
  },
];

const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
const addSpaces = str => str.split('-').join(' ');
const labelize = str => addSpaces(capitalizeFirstLetter(str));
const getFilterToggleButton = labelNode => labelNode.closest('button');

const generateCategories = optionStrings => {
  return optionStrings.reduce((converted, entry) => {
    const isArray = Array.isArray(entry);
    const option = isArray
      ? { id: entry[0], name: labelize(entry[0]), subcategories: generateCategories(entry[1]) }
      : { id: entry, name: labelize(entry) };
    return [...converted, option];
  }, []);
};
const categories = generateCategories([
  ['dogs', ['labradors', 'poodles']],
  ['cats', ['burmese', 'egyptian-mau']],
  ['fish', [['freshwater', ['grayling', 'arctic-char', 'pike']], 'saltwater']],
  ['birds', ['parrot', 'macaw']],
]);

const listingFields = [
  {
    // Formerly used for category, but now there's dedicated category setup
    key: 'cat',
    scope: 'public',
    categoryConfig: {
      limitToCategoryIds: true,
      categoryIds: ['cats'],
    },
    schemaType: 'enum',
    enumOptions: [{ option: 'cat_1', label: 'Cat 1' }, { option: 'cat_2', label: 'Cat 2' }],
    filterConfig: {
      indexForSearch: true,
      label: 'Cat',
      group: 'primary',
    },
    showConfig: {
      label: 'Cat',
    },
    saveConfig: {
      label: 'Cat',
    },
  },
  {
    key: 'boat ',
    scope: 'public',
    listingTypeConfig: {
      limitToListingTypeIds: true,
      listingTypeIds: ['sell-bicycles'],
    },
    schemaType: 'enum',
    enumOptions: [{ option: 'boat_1', label: 'Boat 1' }, { option: 'boat_2', label: 'Boat 2' }],
    filterConfig: {
      indexForSearch: true,
      label: 'Boat',
      group: 'primary',
    },
    showConfig: {
      label: 'Boat',
    },
    saveConfig: {
      label: 'Boat',
    },
  },
  {
    key: 'singleSelectTest',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [{ option: 'enum1', label: 'Enum 1' }, { option: 'enum2', label: 'Enum 2' }],
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectSingleFilter',
      label: 'Single Select Test',
      group: 'primary',
    },
    showConfig: {
      label: 'Single Select Test',
    },
    saveConfig: {
      label: 'Single Select Test',
    },
  },
  {
    key: 'amenities',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [{ option: 'dog_1', label: 'Dog 1' }, { option: 'dog_2', label: 'Dog 2' }],
    filterConfig: {
      indexForSearch: true,
      label: 'Amenities',
      //searchMode: 'has_all',
      group: 'secondary',
    },
    showConfig: {
      label: 'Amenities',
    },
    saveConfig: {
      label: 'Amenities',
    },
  },
  {
    key: 'handByHandAvailable',
    scope: 'public',
    schemaType: 'boolean',
    filterConfig: {
      indexForSearch: true,
      label: 'Hand by hand',
      group: 'primary',
      toggleOnly: true,
      orderAfter: 'price',
    },
    showConfig: {
      label: 'Hand by hand',
    },
    saveConfig: {
      label: 'Hand by hand',
    },
  },
];

const listingTypeOptions = listingTypes.map(lt => ({ option: lt.id, label: labelize(lt.id) }));

const defaultFiltersConfig = [
  {
    key: 'category',
    schemaType: 'category',
    scope: 'public',
    isNestedEnum: true,
    categoryLevelKeys: ['categoryId', 'subcategoryId', 'thirdCategoryId'],
    nestedParams: ['categoryId', 'subcategoryId', 'thirdCategoryId'],
  },
  {
    key: 'listingType',
    schemaType: 'listingType',
    scope: 'public',
    options: listingTypeOptions,
  },
  {
    key: 'price',
    schemaType: 'price',
    label: 'Price',
    // Note: unlike most prices this is not handled in subunits
    min: 0,
    max: 1000,
    step: 5,
  },
  {
    key: 'keywords',
    schemaType: 'text',
    label: 'Keyword',
  },
];

const datesFilterConfig = {
  key: 'dates',
  schemaType: 'dates',
  availability: 'time-full',
  dateRangeMode: 'day',
};

const sortConfig = {
  active: true,
  queryParamName: 'sort',
  relevanceKey: 'relevance',
  conflictingFilters: [],
  options: [
    { key: 'createdAt', label: 'Newest' },
    { key: '-createdAt', label: 'Oldest' },
    { key: '-price', label: 'Lowest price' },
    { key: 'price', label: 'Highest price' },
    { key: 'relevance', label: 'Relevance', longLabel: 'Relevance (Keyword search)' },
  ],
};

const getConfig = (variantType, customListingFields) => {
  const hostedConfig = getHostedConfiguration();
  return {
    ...hostedConfig,
    listingFields: {
      listingFields: customListingFields || listingFields,
    },
    listingTypes: {
      listingTypes,
    },
    categories: { categories },
    search: {
      ...hostedConfig.search,
      mainSearch: {
        searchType: 'location',
      },
      defaultFilters: defaultFiltersConfig,
      sortConfig: sortConfig,
    },
    layout: {
      ...hostedConfig.layout,
      searchPage: { variantType },
    },
    topbar: {
      searchBar: {
        display: 'always',
      },
    },
  };
};

const l1 = createListing('l1');
const l2 = createListing('l2');

// We'll initialize the store with relevant listing data
const initialState = {
  SearchPage: {
    currentPageResultIds: [l1.id, l2.id],
    pagination: {
      page: 1,
      perPage: 1,
      totalItems: 2,
      totalPages: 2,
    },
    searchInProgress: false,
    searchListingsError: null,
    searchParams: null,
    activeListingId: null,
  },
  marketplaceData: {
    entities: {
      listing: {
        l1,
        l2,
      },
    },
  },
};

const getSearchParams = config => {
  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const aspectRatio = aspectHeight / aspectWidth;
  return {
    page: 1,
    perPage: 24,
    include: ['author', 'images'],
    'fields.listing': [
      'title',
      'geolocation',
      'price',
      'deleted',
      'state',
      'publicData.listingType',
      'publicData.transactionProcessAlias',
      'publicData.unitType',
      'publicData.cardStyle',
      // These help rendering of 'purchase' listings,
      // when transitioning from search page to listing page
      'publicData.handByHandAvailable',
      'publicData.pickupEnabled',
      'publicData.shippingEnabled',
      'publicData.priceVariationsEnabled',
      'publicData.priceVariants',
      'publicData.categoryId',
      'publicData.subcategoryId',
      'publicData.thirdCategoryId',
      'publicData.estimatedPriceNew',
    ],
    'fields.user': ['profile.displayName', 'profile.abbreviatedName'],
    'fields.image': [
      'variants.scaled-small',
      'variants.scaled-medium',
      `variants.${variantPrefix}`,
      `variants.${variantPrefix}-2x`,
    ],
    ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
    ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
    'limit.images': 1,
  };
};

describe('SearchPage', () => {
  const commonProps = {
    scrollingDisabled: false,
    onActivateListing: noop,
    onManageDisableScrolling: noop,
  };

  it('Check that filterColumn and filters exist in grid variant', async () => {
    // Select correct SearchPage variant according to route configuration
    const config = getConfig('grid');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const { getByPlaceholderText, getByText, getAllByText, queryByText, getByRole } = render(
      <SearchPage {...props} />,
      {
        initialState,
        config,
        routeConfiguration,
        initialPath: '/s',
        messages: { 'FieldSelectTree.screenreader.option': 'Choose {optionName}.' },
      }
    );

    await waitFor(() => {
      // Has main search in Topbar and it's a location search.
      expect(getByPlaceholderText('TopbarSearchForm.placeholder')).toBeInTheDocument();
      expect(screen.getByTestId('location-search')).toBeInTheDocument();

      // Has filter column
      expect(screen.getByTestId('filterColumnAside')).toBeInTheDocument();
      // Does not have search map container
      expect(screen.queryByTestId('searchMapContainer')).not.toBeInTheDocument();

      // Has SortBy component
      expect(getByText('MainPanelHeader.sortBy')).toBeInTheDocument();
      expect(getAllByText('Newest')).toHaveLength(4); // desktop and mobile dropdowns & selected
      expect(getAllByText('Oldest')).toHaveLength(2); // desktop and mobile dropdowns

      // Has no Cat filter (primary filter tied to 'Cats' category)
      expect(queryByText('Cat')).not.toBeInTheDocument();
      // Has no Boat filter (primary filter tied to 'sell-bicycles' listing type)
      expect(queryByText('Boat')).not.toBeInTheDocument();
      // Has(!) Amenities filter (secondary filter)
      expect(getByText('Amenities')).toBeInTheDocument();
      // Has Single Select Test filter
      expect(getByText('Single Select Test')).toBeInTheDocument();
      // Has boolean filter
      expect(screen.getAllByText('Consegna a mano').length).toBeGreaterThan(0);
      expect(getByText('Enum 1')).toBeInTheDocument();
      expect(getByText('Enum 2')).toBeInTheDocument();

      // Has Category filter
      const categoryFilterButton = getFilterToggleButton(getByText('FilterComponent.categoryLabel'));
      expect(categoryFilterButton).toBeInTheDocument();
      expect(categoryFilterButton).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(queryByText('Poodle')).not.toBeInTheDocument();
      expect(queryByText('Burmese')).not.toBeInTheDocument();
      expect(queryByText('Freshwater')).not.toBeInTheDocument();

      // Has Listing type filter
      expect(getByText('FilterComponent.listingTypeLabel')).toBeInTheDocument();
      expect(getByText('Rent bicycles daily')).toBeInTheDocument();
      expect(getByText('Rent bicycles nightly')).toBeInTheDocument();
      expect(getByText('Rent bicycles hourly')).toBeInTheDocument();
      expect(getByText('Sell bicycles')).toBeInTheDocument();

      // Has Price filter
      expect(getByText('FilterComponent.priceLabel')).toBeInTheDocument();

      // Shows listings
      // Has listing with title
      expect(getByText('l1 title')).toBeInTheDocument();
      // Has listing with title
      expect(getByText('l2 title')).toBeInTheDocument();
      // 2 listings with the same price (2 DOM elements per card: mobile + desktop)
      expect(getAllByText('ListingCard.price')).toHaveLength(4);
    });

    await waitFor(() => {
      userEvent.click(getFilterToggleButton(getByText('FilterComponent.categoryLabel')));
    });

    expect(getFilterToggleButton(getByText('FilterComponent.categoryLabel'))).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    // Test category interaction: select "Fish"
    await waitFor(() => {
      userEvent.click(screen.getByLabelText('Fish'));
    });

    expect(getByText('Dogs')).toBeInTheDocument();
    expect(queryByText('Poodle')).not.toBeInTheDocument();
    expect(getByText('Cats')).toBeInTheDocument();
    expect(queryByText('Burmese')).not.toBeInTheDocument();
    // Subcategories of Fish should be visible
    expect(screen.getAllByText('Fish').length).toBeGreaterThan(0);
    expect(getByText('Freshwater')).toBeInTheDocument();
    expect(getByText('Saltwater')).toBeInTheDocument();
  });

  it('Check that map and filters exist in map variant', async () => {
    // Select correct SearchPage variant according to route configuration
    const config = getConfig('map');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const {
      getByPlaceholderText,
      getByText,
      getByLabelText,
      getAllByText,
      queryByText,
      getByRole,
    } = render(<SearchPage {...props} />, {
      initialState,
      config,
      routeConfiguration,
      initialPath: '/s',
      messages: {
        'SearchPage.screenreader.openFilterButton': 'Filter: {label}',
        'FieldSelectTree.screenreader.option': 'Choose {optionName}.',
      },
    });

    await waitFor(() => {
      // Has main search in Topbar and it's a location search.
      expect(getByPlaceholderText('TopbarSearchForm.placeholder')).toBeInTheDocument();
      expect(screen.getByTestId('location-search')).toBeInTheDocument();

      // Does not have filter column
      expect(screen.queryByTestId('filterColumnAside')).not.toBeInTheDocument();
      // Has search map container
      expect(screen.getByTestId('searchMapContainer')).toBeInTheDocument();

      // Has SortBy component
      expect(getByText('MainPanelHeader.sortBy')).toBeInTheDocument();
      expect(getAllByText('Newest')).toHaveLength(4); // desktop and mobile dropdowns & selected
      expect(getAllByText('Oldest')).toHaveLength(2); // desktop and mobile dropdowns

      // Has no Cat filter (primary filter tied to 'Cats' category)
      expect(queryByText('Cat')).not.toBeInTheDocument();
      // Does not have Amenities filter (secondary)
      expect(queryByText('Amenities')).not.toBeInTheDocument();
      // Has Single Select Test filter
      expect(getByText('Single Select Test')).toBeInTheDocument();
      // Has boolean filter
      expect(screen.getAllByText('Consegna a mano').length).toBeGreaterThan(0);
      expect(queryByText('Enum 1')).not.toBeInTheDocument();
      expect(queryByText('Enum 2')).not.toBeInTheDocument();

      // Has Category filter
      expect(getByLabelText('Filter: FilterComponent.categoryLabel')).toBeInTheDocument();
      expect(queryByText('Dogs')).not.toBeInTheDocument();
      expect(queryByText('Cats')).not.toBeInTheDocument();
      expect(queryByText('Fish')).not.toBeInTheDocument();

      // Has Listing type filter
      expect(getByText('FilterComponent.listingTypeLabel')).toBeInTheDocument();
      expect(queryByText('Rent bicycles daily')).not.toBeInTheDocument();
      expect(queryByText('Rent bicycles nightly')).not.toBeInTheDocument();
      expect(queryByText('Rent bicycles hourly')).not.toBeInTheDocument();
      expect(queryByText('Sell bicycles')).not.toBeInTheDocument();

      // Has "more filters" button for secondary filters
      expect(getByText('SearchFiltersPrimary.moreFiltersButton')).toBeInTheDocument();

      // Has Price filter
      expect(getByText('FilterComponent.priceLabel')).toBeInTheDocument();

      // Shows listings
      // Has listing with title
      expect(getByText('l1 title')).toBeInTheDocument();
      // Has listing with title
      expect(getByText('l2 title')).toBeInTheDocument();
      // 2 listings with the same price (2 DOM elements per card: mobile + desktop)
      expect(getAllByText('ListingCard.price')).toHaveLength(4);
    });

    // Test category interaction
    await waitFor(() => {
      userEvent.click(getByRole('button', { name: 'Filter: FilterComponent.categoryLabel' }));
    });
    expect(getByText('Dogs')).toBeInTheDocument();
    expect(queryByText('Poodle')).not.toBeInTheDocument();
    expect(getByText('Cats')).toBeInTheDocument();
    expect(queryByText('Burmese')).not.toBeInTheDocument();
    expect(getByText('Fish')).toBeInTheDocument();
    expect(queryByText('Freshwater')).not.toBeInTheDocument();

    // Test category interaction: select "Fish"
    await waitFor(() => {
      userEvent.click(screen.getByLabelText('Fish'));
    });
    expect(getByText('Dogs')).toBeInTheDocument();
    expect(queryByText('Poodle')).not.toBeInTheDocument();
    expect(getByText('Cats')).toBeInTheDocument();
    expect(queryByText('Burmese')).not.toBeInTheDocument();
    // Subcategories of Fish should be visible
    expect(screen.getAllByText('Fish').length).toBeGreaterThan(0);
    expect(getByText('Freshwater')).toBeInTheDocument();
    expect(getByText('Saltwater')).toBeInTheDocument();
  });

  it('Check that Cat filters is revealed in grid variant', async () => {
    // Select correct SearchPage variant according to route configuration
    const config = getConfig('grid');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const { getByPlaceholderText, getByText, getAllByText, queryByText, getByRole } = render(
      <SearchPage {...props} />,
      {
        initialState,
        config,
        routeConfiguration,
        messages: {
          'FieldSelectTree.screenreader.option': 'Choose {optionName}.',
        },
      }
    );

    await waitFor(() => {
      // Has no Cat filter (primary)
      expect(queryByText('Cat')).not.toBeInTheDocument();

      // Has Category filter
      const categoryFilterButton = getFilterToggleButton(getByText('FilterComponent.categoryLabel'));
      expect(categoryFilterButton).toBeInTheDocument();
      expect(categoryFilterButton).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(queryByText('Poodle')).not.toBeInTheDocument();
      expect(queryByText('Burmese')).not.toBeInTheDocument();
      expect(queryByText('Freshwater')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      userEvent.click(getFilterToggleButton(getByText('FilterComponent.categoryLabel')));
    });

    expect(getFilterToggleButton(getByText('FilterComponent.categoryLabel'))).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    // Test category interaction: select "Cats"
    await waitFor(() => {
      userEvent.click(screen.getByLabelText('Cats'));
    });

    // Has no Cat filter (primary)
    expect(getByText('Cat')).toBeInTheDocument();

    expect(getByText('Dogs')).toBeInTheDocument();
    expect(queryByText('Poodle')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cats').length).toBeGreaterThan(0);
    // Subcategories of Cats should be visible
    expect(queryByText('Burmese')).toBeInTheDocument();
    expect(queryByText('Egyptian mau')).toBeInTheDocument();
    expect(getByText('Fish')).toBeInTheDocument();
    expect(queryByText('Freshwater')).not.toBeInTheDocument();
    expect(queryByText('Saltwater')).not.toBeInTheDocument();
  });

  it('Check that Boat filters is revealed in grid variant', async () => {
    // Select correct SearchPage variant according to route configuration
    const config = getConfig('grid');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const { getByPlaceholderText, getByText, getAllByText, queryByText, getByRole } = render(
      <SearchPage {...props} />,
      {
        initialState,
        config,
        routeConfiguration,
        messages: {
          'FieldSelectTree.screenreader.option': 'Choose {optionName}.',
        },
      }
    );

    await waitFor(() => {
      // Has no Boat filter (primary)
      expect(queryByText('Boat')).not.toBeInTheDocument();

      // Has Listing type filter
      expect(getByText('FilterComponent.listingTypeLabel')).toBeInTheDocument();
      expect(getByText('Rent bicycles daily')).toBeInTheDocument();
      expect(getByText('Rent bicycles nightly')).toBeInTheDocument();
      expect(getByText('Rent bicycles hourly')).toBeInTheDocument();
      expect(getByText('Sell bicycles')).toBeInTheDocument();
    });

    // Test category intercation: click "Sell bicycles"
    await waitFor(() => {
      userEvent.click(getByRole('button', { name: 'Choose Sell bicycles.' }));
    });

    // Has Boat filter filter (primary)
    expect(getByText('Boat')).toBeInTheDocument();
  });

  it('Check that Listing type filter is not revealed when using a listing type path param', async () => {
    // Select correct SearchPage variant according to route configuration
    const config = getConfig('grid');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps, params: { listingType: 'sell-bicycles' } };
    const searchRouteConfig = routeConfiguration.find(
      conf => conf.name === 'SearchPageWithListingType'
    );
    const SearchPage = searchRouteConfig.component;

    const { getByPlaceholderText, getByText, getAllByText, queryByText, getByRole } = render(
      <SearchPage {...props} />,
      {
        initialState,
        config,
        routeConfiguration,
      }
    );

    await waitFor(() => {
      // Does not have Listing type filter
      expect(queryByText('FilterComponent.listingTypeLabel')).not.toBeInTheDocument();
      expect(queryByText('Rent bicycles daily')).not.toBeInTheDocument();
      expect(queryByText('Rent bicycles nightly')).not.toBeInTheDocument();
      expect(queryByText('Rent bicycles hourly')).not.toBeInTheDocument();
      expect(queryByText('Sell bicycles')).not.toBeInTheDocument();
    });
  });

  it('keeps dates out of the filter list and exposes the inline keyword/date search instead', async () => {
    const baseConfig = getConfig('grid');
    const config = {
      ...baseConfig,
      search: {
        ...baseConfig.search,
        mainSearch: {
          searchType: 'keywords',
        },
        defaultFilters: [...defaultFiltersConfig, datesFilterConfig],
      },
    };
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const { queryByText } = render(<SearchPage {...props} />, {
      initialState,
      config,
      routeConfiguration,
    });

    await waitFor(() => {
      expect(queryByText('FilterComponent.datesLabel')).not.toBeInTheDocument();
      expect(screen.getByTestId('search-page-date-trigger')).toBeInTheDocument();
    });

    await waitFor(() => {
      userEvent.click(screen.getByTestId('search-page-date-trigger'));
    });

    expect(screen.getByTestId('search-page-date-picker')).toBeInTheDocument();
  });

  it('opens the topbar date picker from the Quando section in keyword search mode', async () => {
    const baseConfig = getConfig('grid');
    const config = {
      ...baseConfig,
      search: {
        ...baseConfig.search,
        mainSearch: {
          searchType: 'keywords',
        },
      },
    };
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    render(<SearchPage {...props} />, {
      initialState,
      config,
      routeConfiguration,
      initialPath: '/s',
    });

    await waitFor(() => {
      expect(screen.getByTestId('topbar-date-trigger')).toBeInTheDocument();
    });

    await waitFor(() => {
      userEvent.click(screen.getByTestId('topbar-date-trigger'));
    });

    expect(screen.getByTestId('topbar-date-picker')).toBeInTheDocument();
  });

  it('disables category chips that have no matching listings when the full result set is loaded', async () => {
    const config = getConfig('grid');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const lCats = createListing('lcats', {
      publicData: { categoryId: 'cats' },
    });
    const lFreshwater = createListing('lfreshwater', {
      publicData: { categoryId: 'fish', subcategoryId: 'freshwater' },
    });
    const fullResultState = {
      SearchPage: {
        ...initialState.SearchPage,
        currentPageResultIds: [lCats.id, lFreshwater.id],
        pagination: { paginationUnsupported: true, totalItems: 2, totalPages: 1, page: 1, perPage: 2 },
        searchParams: { pub_category: 'categoryId:fish' },
      },
      marketplaceData: {
        entities: {
          listing: {
            [lCats.id.uuid]: lCats,
            [lFreshwater.id.uuid]: lFreshwater,
          },
        },
      },
    };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const { getByText } = render(<SearchPage {...props} />, {
      initialState: fullResultState,
      config,
      routeConfiguration,
      initialPath: '/s?pub_category=categoryId:fish',
    });

    await waitFor(() => {
      expect(getByText('FilterComponent.categoryLabel')).toBeInTheDocument();
    });

    await waitFor(() => {
      userEvent.click(getFilterToggleButton(getByText('FilterComponent.categoryLabel')));
    });

    const dogButtons = screen.getAllByRole('button', { name: 'Dogs' });
    expect(dogButtons.every(button => button.disabled)).toBe(true);

    await waitFor(() => {
      const freshwaterButtons = screen.getAllByRole('button', { name: 'Fish / Freshwater' });
      const saltwaterButtons = screen.getAllByRole('button', { name: 'Fish / Saltwater' });

      expect(freshwaterButtons.every(button => !button.disabled)).toBe(true);
      expect(saltwaterButtons.every(button => button.disabled)).toBe(true);
    });
  });

  it('keeps category chips selectable when only a partial result page is loaded', async () => {
    const config = getConfig('grid');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const lBird = createListing('lbird', {
      publicData: { categoryId: 'birds' },
    });
    const paginatedState = {
      SearchPage: {
        ...initialState.SearchPage,
        currentPageResultIds: [lBird.id],
        pagination: { page: 1, perPage: 1, totalItems: 2, totalPages: 2 },
        searchParams: {},
      },
      marketplaceData: {
        entities: {
          listing: {
            [lBird.id.uuid]: lBird,
          },
        },
      },
    };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const { getByText } = render(<SearchPage {...props} />, {
      initialState: paginatedState,
      config,
      routeConfiguration,
      initialPath: '/s',
    });

    await waitFor(() => {
      expect(getByText('FilterComponent.categoryLabel')).toBeInTheDocument();
    });

    await waitFor(() => {
      userEvent.click(getFilterToggleButton(getByText('FilterComponent.categoryLabel')));
    });

    const dogButtons = screen.getAllByRole('button', { name: 'Dogs' });
    expect(dogButtons.every(button => !button.disabled)).toBe(true);
  });

  it('filters grid results by multi-branch category selections from the URL', async () => {
    const config = getConfig('grid');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const lCategory = createListing('lcategory', {
      publicData: { categoryId: 'cats' },
    });
    const lSubcategory = createListing('lsubcat', {
      publicData: { categoryId: 'fish', subcategoryId: 'freshwater' },
    });
    const lOther = createListing('lother', {
      publicData: { categoryId: 'birds' },
    });
    const stateWithCategoryFilter = {
      SearchPage: {
        ...initialState.SearchPage,
        currentPageResultIds: [lCategory.id, lSubcategory.id, lOther.id],
        pagination: { paginationUnsupported: true },
        searchParams: { pub_category: 'categoryId:cats,subcategoryId:freshwater' },
      },
      marketplaceData: {
        entities: {
          listing: {
            [lCategory.id.uuid]: lCategory,
            [lSubcategory.id.uuid]: lSubcategory,
            [lOther.id.uuid]: lOther,
          },
        },
      },
    };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const { getByText, queryByText } = render(<SearchPage {...props} />, {
      initialState: stateWithCategoryFilter,
      config,
      routeConfiguration,
      initialPath: '/s?pub_category=categoryId:cats,subcategoryId:freshwater',
    });

    await waitFor(() => {
      expect(getByText('lcategory title')).toBeInTheDocument();
      expect(getByText('lsubcat title')).toBeInTheDocument();
      expect(queryByText('lother title')).not.toBeInTheDocument();
    });
  });

  it('clears selected subcategories when their selected parent category is deselected', async () => {
    const config = getConfig('grid');
    const routeConfiguration = getRouteConfiguration(config.layout);
    const props = { ...commonProps };
    const searchRouteConfig = routeConfiguration.find(conf => conf.name === 'SearchPage');
    const SearchPage = searchRouteConfig.component;

    const { getByText } = render(<SearchPage {...props} />, {
      initialState,
      config,
      routeConfiguration,
      initialPath: '/s',
      messages: { 'FieldSelectTree.screenreader.option': 'Choose {optionName}.' },
    });

    await waitFor(() => {
      expect(getByText('FilterComponent.categoryLabel')).toBeInTheDocument();
    });

    await waitFor(() => {
      userEvent.click(getFilterToggleButton(getByText('FilterComponent.categoryLabel')));
    });

    await waitFor(() => {
      userEvent.click(screen.getByLabelText('Fish'));
    });

    await waitFor(() => {
      userEvent.click(screen.getByLabelText('Fish / Freshwater'));
    });

    expect(screen.getByRole('button', { name: 'Fish' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fish / Freshwater' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await waitFor(() => {
      userEvent.click(screen.getByRole('button', { name: 'Fish' }));
    });

    expect(screen.getByRole('button', { name: 'Fish' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Fish' })).not.toHaveFocus();

    await waitFor(() => {
      userEvent.click(screen.getByRole('button', { name: 'Fish' }));
    });

    expect(screen.getByRole('button', { name: 'Fish' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fish / Freshwater' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});

describe('Duck', () => {
  const defaultConfig = getConfig('map');

  const config = {
    ...defaultConfig,
    categoryConfiguration: {
      categories: [...defaultConfig.categories.categories],
      categoryLevelKeys: ['categoryId', 'subcategoryId', 'thirdCategoryId'],
      key: 'category',
      scope: 'public',
    },
    listing: {
      ...defaultConfig.listingFields,
      ...defaultConfig.listingTypes,
    },
    accessControl: { marketplace: { private: true } },
  };
  // Shared parameters for viewing rights loadData tests
  const fakeResponse = resource => ({ data: { data: resource, include: [] } });
  const sdkFn = response => jest.fn(() => Promise.resolve(response));
  const currentUser = createCurrentUser('userId');

  it('loadData() for full viewing rights user loads listings', () => {
    const getState = () => ({
      ...initialState,
      user: { currentUser },
      auth: { isAuthenticated: true },
    });

    const sdk = {
      currentUser: { show: sdkFn(fakeResponse(currentUser)) },
      listings: { query: sdkFn(fakeResponse([l1, l2])) },
      authInfo: sdkFn({}),
    };

    const dispatch = createFakeDispatch(getState, sdk);

    const searchParams = getSearchParams(config);
    const listingFields = config?.listing?.listingFields;
    const sanitizeConfig = { listingFields };

    // Tests the actions that get dispatched to the Redux store when SearchPage.duck.js
    // loadData() function is called. If you make customizations to the loadData() logic,
    // update this test accordingly!
    return loadData(null, null, config)(dispatch, getState, sdk).then(data => {
      expect(dispatchedActions(dispatch)).toEqual([
        searchListingsRequest(searchParams),
        addMarketplaceEntities(fakeResponse([l1, l2]), sanitizeConfig),
        searchListingsSuccess(fakeResponse([l1, l2])),
      ]);
    });
  });

  it('loadData() for restricted viewing rights user does not load listings', () => {
    currentUser.effectivePermissionSet.attributes.read = 'permissions/deny';

    const getState = () => ({
      ...initialState,
      user: { currentUser },
      auth: { isAuthenticated: true },
    });

    const sdk = {};

    const dispatch = createFakeDispatch(getState, sdk);

    // Tests the actions that get dispatched to the Redux store when SearchPage.duck.js
    // loadData() function is called. If you make customizations to the loadData() logic,
    // update this test accordingly!
    return loadData(null, null, config)(dispatch, getState, sdk).then(data => {
      expect(dispatchedActions(dispatch)).toEqual([]);
    });
  });

  it('searchListings() keeps numeric category ids in API params', () => {
    const numericCategoryConfig = {
      ...config,
      categoryConfiguration: {
        ...config.categoryConfiguration,
        categories: [
          {
            id: 10,
            name: 'Parent',
            subcategories: [{ id: 11, name: 'Child' }],
          },
        ],
      },
    };

    const sdk = {
      listings: { query: jest.fn(() => Promise.resolve(fakeResponse([l1, l2]))) },
    };
    const dispatch = jest.fn(action => action);
    const getState = () => initialState;
    const searchParams = {
      pub_categoryId: '10',
      pub_subcategoryId: '11',
      page: 1,
    };

    return searchListings(searchParams, numericCategoryConfig)(dispatch, getState, sdk).then(() => {
      expect(sdk.listings.query).toHaveBeenCalledWith(
        expect.objectContaining({
          pub_categoryId: '10',
          pub_subcategoryId: '11',
        })
      );
    });
  });
});
