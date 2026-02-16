import React, { useState, useEffect } from 'react';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import { useIntl } from '../../util/reactIntl';
import css from './AddressCascadingDropdowns.module.css';
import { 
  ITALIAN_PROVINCES, 
  ITALIAN_CITIES_BY_PROVINCE, 
  getProvinceByCode, 
  getCitiesByProvinceCode,
  getAllProvincesSorted 
} from './italianGeoData';

/**
 * Map locale to country ISO2 code
 * @param {string} locale - The current locale (e.g., 'it-IT', 'en-GB')
 * @returns {string} - ISO2 country code
 */
const getCountryCodeFromLocale = locale => {
  if (!locale) return 'IT';
  
  // Map locale to country code
  const localeMap = {
    'it-IT': 'IT',
    'it': 'IT',
    'en-GB': 'GB',
    'en-US': 'US',
    'en': 'GB',
    'de-DE': 'DE',
    'de': 'DE',
    'fr-FR': 'FR',
    'fr': 'FR',
    'es-ES': 'ES',
    'es': 'ES',
    'pt-PT': 'PT',
    'pt-BR': 'BR',
    'pt': 'PT',
  };

  return localeMap[locale] || localeMap[locale.split('-')[0]] || 'IT';
};

/**
 * Get translated country name based on locale
 * @param {Object} country - Country object from react-country-state-city
 * @param {string} locale - Current locale
 * @returns {string} - Translated country name
 */
const getTranslatedCountryName = (country, locale) => {
  if (!country) return '';
  
  // The library provides native names, but we need to handle translations
  // For European languages, use the native name if it matches the locale
  const baseLocale = locale ? locale.split('-')[0].toLowerCase() : 'en';
  
  // Country name translations for main supported languages
  const countryTranslations = {
    IT: { it: 'Italia', en: 'Italy', de: 'Italien', fr: 'Italie', es: 'Italia', pt: 'Itália' },
    DE: { it: 'Germania', en: 'Germany', de: 'Deutschland', fr: 'Allemagne', es: 'Alemania', pt: 'Alemanha' },
    FR: { it: 'Francia', en: 'France', de: 'Frankreich', fr: 'France', es: 'Francia', pt: 'França' },
    ES: { it: 'Spagna', en: 'Spain', de: 'Spanien', fr: 'Espagne', es: 'España', pt: 'Espanha' },
    GB: { it: 'Regno Unito', en: 'United Kingdom', de: 'Vereinigtes Königreich', fr: 'Royaume-Uni', es: 'Reino Unido', pt: 'Reino Unido' },
    US: { it: 'Stati Uniti', en: 'United States', de: 'Vereinigte Staaten', fr: 'États-Unis', es: 'Estados Unidos', pt: 'Estados Unidos' },
    PT: { it: 'Portogallo', en: 'Portugal', de: 'Portugal', fr: 'Portugal', es: 'Portugal', pt: 'Portugal' },
    AT: { it: 'Austria', en: 'Austria', de: 'Österreich', fr: 'Autriche', es: 'Austria', pt: 'Áustria' },
    CH: { it: 'Svizzera', en: 'Switzerland', de: 'Schweiz', fr: 'Suisse', es: 'Suiza', pt: 'Suíça' },
    BE: { it: 'Belgio', en: 'Belgium', de: 'Belgien', fr: 'Belgique', es: 'Bélgica', pt: 'Bélgica' },
    NL: { it: 'Paesi Bassi', en: 'Netherlands', de: 'Niederlande', fr: 'Pays-Bas', es: 'Países Bajos', pt: 'Países Baixos' },
  };

  const countryCode = country.iso2;
  if (countryTranslations[countryCode] && countryTranslations[countryCode][baseLocale]) {
    return countryTranslations[countryCode][baseLocale];
  }

  // Fallback to library's name
  return country.name;
};

/**
 * Italian province to region mapping
 * Maps province codes to region IDs in the react-country-state-city library
 * This is needed because the library has both provinces (no cities) and regions (with cities)
 * We show provinces in dropdown but load cities from the parent region
 */
const ITALY_PROVINCE_TO_REGION = {
  // Abruzzo (1679)
  AQ: 1679, CH: 1679, PE: 1679, TE: 1679,
  // Puglia/Apulia (1688)
  BA: 1688, BR: 1688, FG: 1688, LE: 1688, TA: 1688, BT: 1688,
  // Basilicata (1706)
  MT: 1706, PZ: 1706,
  // Calabria (1703)
  CS: 1703, CZ: 1703, KR: 1703, RC: 1703, VV: 1703,
  // Campania (1669)
  AV: 1669, BN: 1669, CE: 1669, NA: 1669, SA: 1669,
  // Emilia-Romagna (1773)
  BO: 1773, FC: 1773, FE: 1773, MO: 1773, PR: 1773, PC: 1773, RE: 1773, RN: 1773, RA: 1773,
  // Friuli-Venezia Giulia (1756)
  GO: 1756, PN: 1756, TS: 1756, UD: 1756,
  // Lazio (1678)
  FR: 1678, LT: 1678, RI: 1678, RM: 1678, VT: 1678,
  // Liguria (1768)
  GE: 1768, IM: 1768, SP: 1768, SV: 1768,
  // Lombardia (1705)
  BG: 1705, BS: 1705, CO: 1705, CR: 1705, LC: 1705, LO: 1705, MN: 1705, MB: 1705, MI: 1705, PV: 1705, SO: 1705, VA: 1705,
  // Marche (1670)
  AN: 1670, AP: 1670, FM: 1670, MC: 1670, PU: 1670,
  // Molise (1695)
  CB: 1695, IS: 1695,
  // Piemonte (1702)
  AL: 1702, AT: 1702, BI: 1702, CN: 1702, NO: 1702, TO: 1702, VB: 1702, VC: 1702,
  // Sardegna (1715)
  CA: 1715, NU: 1715, OR: 1715, SS: 1715, SU: 1715, VS: 1715, OG: 1715, OT: 1715, CI: 1715,
  // Sicilia (1709)
  AG: 1709, CL: 1709, CT: 1709, EN: 1709, ME: 1709, PA: 1709, RG: 1709, SR: 1709, TP: 1709,
  // Trentino-Alto Adige (1725)
  BZ: 1725, TN: 1725,
  // Toscana (1664)
  AR: 1664, FI: 1664, GR: 1664, LI: 1664, LU: 1664, MS: 1664, PI: 1664, PO: 1664, PT: 1664, SI: 1664,
  // Umbria (1683)
  PG: 1683, TR: 1683,
  // Valle d'Aosta (1716)
  AO: 1716,
  // Veneto (1753)
  BL: 1753, PD: 1753, RO: 1753, TV: 1753, VE: 1753, VI: 1753, VR: 1753,
};

/**
 * Get region ID for an Italian province
 * @param {string} provinceCode - Province code (e.g., 'TA', 'MI')
 * @returns {number|null} - Region ID or null if not found
 */
const getItalianRegionIdForProvince = (provinceCode) => {
  return ITALY_PROVINCE_TO_REGION[provinceCode?.toUpperCase()] || null;
};

/**
 * Check if a state entry is an Italian province (not a region)
 * Provinces have letter codes (e.g., 'TA'), regions have numeric codes (e.g., '75')
 * @param {Object} state - State object from the library
 * @returns {boolean}
 */
const isItalianProvince = (state) => {
  // Provinces have 2-letter codes, regions have numeric codes
  return state && /^[A-Z]{2}$/.test(state.state_code);
};

/**
 * Find country by name (supports multiple languages)
 * @param {Array} countries - List of countries
 * @param {string} countryName - Country name to find
 * @returns {Object|null} - Found country or null
 */
const findCountryByName = (countries, countryName) => {
  if (!countryName || !countries.length) return null;
  
  const normalizedName = countryName.toLowerCase().trim();
  
  // Common country name mappings (all variations)
  const countryAliases = {
    IT: ['italia', 'italy', 'italien', 'italie'],
    DE: ['germania', 'germany', 'deutschland', 'allemagne', 'alemania', 'alemanha'],
    FR: ['francia', 'france', 'frankreich'],
    ES: ['spagna', 'spain', 'spanien', 'espagne', 'españa'],
    GB: ['regno unito', 'united kingdom', 'uk', 'gran bretagna', 'vereinigtes königreich', 'royaume-uni', 'reino unido'],
    US: ['stati uniti', 'united states', 'usa', 'vereinigte staaten', 'états-unis', 'estados unidos'],
    PT: ['portogallo', 'portugal'],
    AT: ['austria', 'österreich', 'autriche'],
    CH: ['svizzera', 'switzerland', 'schweiz', 'suisse', 'suiza'],
    BE: ['belgio', 'belgium', 'belgien', 'belgique', 'bélgica'],
    NL: ['paesi bassi', 'netherlands', 'niederlande', 'pays-bas', 'países bajos', 'olanda', 'holland'],
  };

  // First try to match by aliases
  for (const [iso2, aliases] of Object.entries(countryAliases)) {
    if (aliases.includes(normalizedName)) {
      return countries.find(c => c.iso2 === iso2) || null;
    }
  }

  // Then try to match by name
  return countries.find(
    c => c.name.toLowerCase() === normalizedName || c.iso2.toLowerCase() === normalizedName
  ) || null;
};

/**
 * Find state/province by name or code
 * @param {Array} states - List of states
 * @param {string} stateName - State name or code to find
 * @param {boolean} isItaly - Whether the country is Italy (to search Italian data)
 * @returns {Object|null} - Found state or null
 */
const findStateByNameOrCode = (states, stateName, isItaly = false) => {
  if (!stateName) return null;
  
  const normalizedName = stateName.toLowerCase().trim();
  const upperName = stateName.toUpperCase().trim();
  
  // For Italy, first try to find in the Italian dataset
  if (isItaly) {
    // Try to find by code first (e.g., "MI", "RM")
    const italianProvince = getProvinceByCode(upperName);
    if (italianProvince) {
      // Convert to state-like object for consistency
      return {
        id: `it-${italianProvince.code}`,
        name: italianProvince.name,
        state_code: italianProvince.code,
        region: italianProvince.region,
        regionId: italianProvince.regionId,
        isItalianDataset: true
      };
    }
    
    // Try to find by name in Italian dataset
    const byName = ITALIAN_PROVINCES.find(p => 
      p.name.toLowerCase() === normalizedName ||
      p.code.toLowerCase() === normalizedName
    );
    if (byName) {
      return {
        id: `it-${byName.code}`,
        name: byName.name,
        state_code: byName.code,
        region: byName.region,
        regionId: byName.regionId,
        isItalianDataset: true
      };
    }
  }
  
  // Fallback to searching in the provided states array
  if (!states.length) return null;
  
  return states.find(
    s => 
      s.name.toLowerCase() === normalizedName ||
      s.state_code?.toLowerCase() === normalizedName ||
      s.iso2?.toLowerCase() === normalizedName
  ) || null;
};

/**
 * Find city by name
 * @param {Array} cities - List of cities
 * @param {string} cityName - City name to find
 * @returns {Object|null} - Found city or null
 */
const findCityByName = (cities, cityName) => {
  if (!cityName || !cities.length) return null;
  
  const normalizedName = cityName.toLowerCase().trim();
  
  return cities.find(c => c.name.toLowerCase() === normalizedName) || null;
};

/**
 * AddressCascadingDropdowns Component
 * 
 * Provides cascading dropdowns for Country -> State/Province -> City selection
 * with localization support.
 */
const AddressCascadingDropdowns = ({
  locale = 'it-IT',
  initialCountry = null,
  initialState = null,
  initialCity = null,
  initialPostalCode = '',
  onCountryChange,
  onStateChange,
  onCityChange,
  onPostalCodeChange,
  disabled = false,
  className = '',
  labelClassName = '',
  selectClassName = '',
  inputClassName = '',
  showLabels = true,
}) => {
  const intl = useIntl();
  
  // Data state
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  
  // Selection state
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [postalCode, setPostalCode] = useState(initialPostalCode || '');
  
  // Loading state
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  
  // Track initialization
  const [initialized, setInitialized] = useState(false);

  // Sync postalCode when initialPostalCode changes (e.g. from address autocomplete selection)
  useEffect(() => {
    const val = initialPostalCode || '';
    if (postalCode !== val) {
      setPostalCode(val);
    }
  }, [initialPostalCode]);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoadingCountries(true);
        const result = await GetCountries();
        setCountries(result || []);
      } catch (error) {
        console.error('Error loading countries:', error);
        setCountries([]);
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  // Initialize with initial values or default country based on locale
  useEffect(() => {
    if (countries.length === 0 || initialized) return;

    const initializeSelection = async () => {
      let countryToSelect = null;

      // First priority: initial country from props
      if (initialCountry) {
        countryToSelect = findCountryByName(countries, initialCountry);
      }
      
      // Second priority: default country based on locale
      if (!countryToSelect) {
        const defaultCountryCode = getCountryCodeFromLocale(locale);
        countryToSelect = countries.find(c => c.iso2 === defaultCountryCode);
      }

      if (countryToSelect) {
        setSelectedCountry(countryToSelect);
        
        // Check if this is Italy
        const isItaly = countryToSelect.id === 107 || countryToSelect.iso2 === 'IT';
        
        // Get translated country name and call callback to propagate the value
        const translatedCountryName = getTranslatedCountryName(countryToSelect, locale);
        
        // Load states for the selected country
        try {
          setLoadingStates(true);
          
          let filteredStates = [];
          
          if (isItaly) {
            // Use complete Italian dataset for provinces
            filteredStates = getAllProvincesSorted().map(p => ({
              id: `it-${p.code}`,
              name: p.name,
              state_code: p.code,
              region: p.region,
              regionId: p.regionId,
              isItalianDataset: true
            }));
          } else {
            // Use library for other countries
            const statesResult = await GetState(countryToSelect.id);
            filteredStates = statesResult || [];
          }
          
          setStates(filteredStates);
          
          // If initial state is provided, select it
          if (initialState && filteredStates?.length > 0) {
            const stateToSelect = findStateByNameOrCode(filteredStates, initialState, isItaly);
            if (stateToSelect) {
              setSelectedState(stateToSelect);
              
              // Load cities for the selected state
              try {
                setLoadingCities(true);
                
                let citiesResult = [];
                
                if (isItaly && (stateToSelect.isItalianDataset || stateToSelect.state_code)) {
                  // Use Italian dataset for cities
                  const provinceCode = stateToSelect.state_code;
                  const italianCities = getCitiesByProvinceCode(provinceCode);
                  citiesResult = italianCities.map((name, index) => ({
                    id: `it-city-${provinceCode}-${index}`,
                    name: name,
                    isItalianDataset: true
                  }));
                } else {
                  // Use library for other countries
                  citiesResult = await GetCity(countryToSelect.id, stateToSelect.id);
                }
                
                setCities(citiesResult || []);
                
                // If initial city is provided, try to select it
                let selectedCityValue = null;
                if (initialCity) {
                  if (citiesResult?.length > 0) {
                    // Try to find in dropdown
                    const cityToSelect = findCityByName(citiesResult, initialCity);
                    if (cityToSelect) {
                      setSelectedCity(cityToSelect);
                      selectedCityValue = cityToSelect;
                    } else {
                      // City not found in dropdown, use manual entry
                      const manualCity = { name: initialCity, id: null };
                      setSelectedCity(manualCity);
                      selectedCityValue = manualCity;
                    }
                  } else {
                    // No cities available, use manual entry
                    const manualCity = { name: initialCity, id: null };
                    setSelectedCity(manualCity);
                    selectedCityValue = manualCity;
                  }
                }
                
                // Call callbacks to propagate initialized values
                onCountryChange?.(countryToSelect, translatedCountryName);
                onStateChange?.(stateToSelect, stateToSelect.name, stateToSelect.state_code || stateToSelect.iso2 || '');
                if (selectedCityValue) {
                  onCityChange?.(selectedCityValue, selectedCityValue.name);
                }
              } catch (error) {
                console.error('Error loading cities:', error);
                setCities([]);
                // If there's an error but we have initial city, use manual entry
                if (initialCity) {
                  const manualCity = { name: initialCity, id: null };
                  setSelectedCity(manualCity);
                  // Call callbacks
                  onCountryChange?.(countryToSelect, translatedCountryName);
                  onStateChange?.(stateToSelect, stateToSelect.name, stateToSelect.state_code || stateToSelect.iso2 || '');
                  onCityChange?.(manualCity, initialCity);
                } else {
                  // Call callbacks without city
                  onCountryChange?.(countryToSelect, translatedCountryName);
                  onStateChange?.(stateToSelect, stateToSelect.name, stateToSelect.state_code || stateToSelect.iso2 || '');
                }
              } finally {
                setLoadingCities(false);
              }
            } else {
              // State not found, just call country callback
              onCountryChange?.(countryToSelect, translatedCountryName);
            }
          } else {
            // No initial state, just call country callback
            onCountryChange?.(countryToSelect, translatedCountryName);
          }
        } catch (error) {
          console.error('Error loading states:', error);
          setStates([]);
          // Still call country callback even if states failed to load
          onCountryChange?.(countryToSelect, translatedCountryName);
        } finally {
          setLoadingStates(false);
        }
      }

      // Propagate initial postal code if provided
      if (initialPostalCode) {
        onPostalCodeChange?.(initialPostalCode);
      }

      setInitialized(true);
    };

    initializeSelection();
  }, [countries, initialCountry, initialState, initialCity, initialPostalCode, locale, initialized]);

  // React to changes in initialState after initialization (for autocomplete prefill)
  useEffect(() => {
    if (!initialized || !selectedCountry || !states.length || !initialState) return;
    
    // Skip if the current selection already matches
    if (selectedState?.state_code === initialState || selectedState?.name === initialState) return;
    
    const isItaly = selectedCountry.id === 107 || selectedCountry.iso2 === 'IT';
    const stateToSelect = findStateByNameOrCode(states, initialState, isItaly);
    
    if (stateToSelect && stateToSelect.id !== selectedState?.id) {
      setSelectedState(stateToSelect);
      setSelectedCity(null);
      
      // Load cities for the newly selected state
      const loadCitiesForState = async () => {
        try {
          setLoadingCities(true);
          let citiesResult = [];
          
          if (isItaly && (stateToSelect.isItalianDataset || stateToSelect.state_code)) {
            const provinceCode = stateToSelect.state_code;
            const italianCities = getCitiesByProvinceCode(provinceCode);
            citiesResult = italianCities.map((name, index) => ({
              id: `it-city-${provinceCode}-${index}`,
              name: name,
              isItalianDataset: true
            }));
          } else {
            citiesResult = await GetCity(selectedCountry.id, stateToSelect.id);
          }
          
          setCities(citiesResult || []);
          
          // Try to select initial city if provided
          if (initialCity && citiesResult?.length > 0) {
            const cityToSelect = findCityByName(citiesResult, initialCity);
            if (cityToSelect) {
              setSelectedCity(cityToSelect);
              onCityChange?.(cityToSelect, cityToSelect.name);
            }
          }
        } catch (error) {
          console.error('Error loading cities for autocomplete prefill:', error);
          setCities([]);
        } finally {
          setLoadingCities(false);
        }
      };
      
      loadCitiesForState();
      onStateChange?.(stateToSelect, stateToSelect.name, stateToSelect.state_code || stateToSelect.iso2 || '');
    }
  }, [initialState, initialized, selectedCountry, states, selectedState]);

  // React to changes in initialCity after state is selected
  useEffect(() => {
    if (!initialized || !selectedState || !cities.length || !initialCity) return;
    
    // Skip if the current selection already matches
    if (selectedCity?.name === initialCity) return;
    
    const cityToSelect = findCityByName(cities, initialCity);
    if (cityToSelect && cityToSelect.id !== selectedCity?.id) {
      setSelectedCity(cityToSelect);
      onCityChange?.(cityToSelect, cityToSelect.name);
    }
  }, [initialCity, initialized, selectedState, cities, selectedCity]);

  // Handle country change
  const handleCountryChange = async e => {
    const countryId = parseInt(e.target.value, 10);
    const country = countries.find(c => c.id === countryId);
    
    setSelectedCountry(country || null);
    setSelectedState(null);
    setSelectedCity(null);
    setStates([]);
    setCities([]);
    
    if (country) {
      try {
        setLoadingStates(true);
        
        const isItaly = country.id === 107 || country.iso2 === 'IT';
        let filteredStates = [];
        
        if (isItaly) {
          // Use complete Italian dataset for provinces
          filteredStates = getAllProvincesSorted().map(p => ({
            id: `it-${p.code}`,
            name: p.name,
            state_code: p.code,
            region: p.region,
            regionId: p.regionId,
            isItalianDataset: true
          }));
        } else {
          // Use library for other countries
          const statesResult = await GetState(country.id);
          filteredStates = statesResult || [];
        }
        
        setStates(filteredStates);
      } catch (error) {
        console.error('Error loading states:', error);
        setStates([]);
      } finally {
        setLoadingStates(false);
      }
    }
    
    const translatedName = country ? getTranslatedCountryName(country, locale) : '';
    onCountryChange?.(country, translatedName);
  };

  // Handle state change
  const handleStateChange = async e => {
    const stateId = e.target.value;
    // Handle both string IDs (Italian dataset) and numeric IDs (library)
    const state = states.find(s => String(s.id) === String(stateId));
    
    setSelectedState(state || null);
    setSelectedCity(null);
    setCities([]);
    
    if (state && selectedCountry) {
      try {
        setLoadingCities(true);
        
        const isItaly = selectedCountry.id === 107 || selectedCountry.iso2 === 'IT';
        let citiesResult = [];
        
        if (isItaly && (state.isItalianDataset || state.state_code)) {
          // Use Italian dataset for cities - filtered by province
          const provinceCode = state.state_code;
          const italianCities = getCitiesByProvinceCode(provinceCode);
          citiesResult = italianCities.map((name, index) => ({
            id: `it-city-${provinceCode}-${index}`,
            name: name,
            isItalianDataset: true
          }));
        } else {
          // Use library for other countries
          citiesResult = await GetCity(selectedCountry.id, state.id);
        }
        
        setCities(citiesResult || []);
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    }
    
    // Return both the full name and the state code
    onStateChange?.(state, state?.name || '', state?.state_code || state?.iso2 || '');
  };

  // Handle city change (dropdown)
  const handleCityChange = e => {
    const cityId = e.target.value;
    // Handle both string IDs (Italian dataset) and numeric IDs (library)
    const city = cities.find(c => String(c.id) === String(cityId));
    
    setSelectedCity(city || null);
    onCityChange?.(city, city?.name || '');
  };

  // Handle manual city input (when no cities available)
  const handleManualCityChange = e => {
    const cityName = e.target.value;
    const manualCity = cityName ? { name: cityName, id: null } : null;
    setSelectedCity(manualCity);
    onCityChange?.(manualCity, cityName);
  };

  // Check if we should show manual city input
  // Show when: state is selected, not loading, and no cities available
  const showManualCityInput = selectedState && !loadingCities && cities.length === 0;

  // Handle postal code change
  const handlePostalCodeChange = e => {
    const value = e.target.value;
    setPostalCode(value);
    onPostalCodeChange?.(value);
  };

  // Get labels based on locale
  const labels = {
    country: intl.formatMessage({ id: 'AddressCascadingDropdowns.countryLabel', defaultMessage: 'Country' }),
    state: intl.formatMessage({ id: 'AddressCascadingDropdowns.stateLabel', defaultMessage: 'State/Province' }),
    city: intl.formatMessage({ id: 'AddressCascadingDropdowns.cityLabel', defaultMessage: 'City' }),
    postalCode: intl.formatMessage({ id: 'AddressCascadingDropdowns.postalCodeLabel', defaultMessage: 'Postal Code' }),
  };

  const placeholders = {
    country: intl.formatMessage({ id: 'AddressCascadingDropdowns.countryPlaceholder', defaultMessage: 'Select country...' }),
    state: intl.formatMessage({ id: 'AddressCascadingDropdowns.statePlaceholder', defaultMessage: 'Select state/province...' }),
    city: intl.formatMessage({ id: 'AddressCascadingDropdowns.cityPlaceholder', defaultMessage: 'Select city...' }),
    postalCode: intl.formatMessage({ id: 'AddressCascadingDropdowns.postalCodePlaceholder', defaultMessage: '00100' }),
  };

  return (
    <div className={`${css.root} ${className}`}>
      {/* Row 1: Country and State/Province */}
      <div className={css.row}>
        {/* Country Dropdown */}
        <div className={css.fieldGroup}>
          {showLabels && (
            <label className={`${css.label} ${labelClassName}`}>
              {labels.country}
            </label>
          )}
          <select
            className={`${css.select} ${selectClassName}`}
            value={selectedCountry?.id || ''}
            onChange={handleCountryChange}
            disabled={disabled || loadingCountries}
          >
            <option value="">{loadingCountries ? '...' : placeholders.country}</option>
            {countries.map(country => (
              <option key={country.id} value={country.id}>
                {getTranslatedCountryName(country, locale)}
              </option>
            ))}
          </select>
        </div>

        {/* State/Province Dropdown */}
        <div className={css.fieldGroup}>
          {showLabels && (
            <label className={`${css.label} ${labelClassName}`}>
              {labels.state}
            </label>
          )}
          <select
            className={`${css.select} ${selectClassName} ${!selectedCountry ? css.selectDisabled : ''}`}
            value={selectedState?.id || ''}
            onChange={handleStateChange}
            disabled={disabled || !selectedCountry || loadingStates}
          >
            <option value="">
              {loadingStates ? '...' : placeholders.state}
            </option>
            {[...states]
              .sort((a, b) => {
                // For Italian provinces from our dataset, sort by code
                const isItaly = selectedCountry?.id === 107 || selectedCountry?.iso2 === 'IT';
                if (isItaly && a.state_code && b.state_code) {
                  return a.state_code.localeCompare(b.state_code);
                }
                return a.name.localeCompare(b.name);
              })
              .map(state => {
                // For Italian provinces, show code + name (e.g., "MI - Milano")
                const isItaly = selectedCountry?.id === 107 || selectedCountry?.iso2 === 'IT';
                const displayName = (isItaly && state.state_code) 
                  ? `${state.state_code} - ${state.name}` 
                  : state.name;
                return (
                  <option key={state.id} value={state.id}>
                    {displayName}
                  </option>
                );
              })}
          </select>
        </div>
      </div>

      {/* Row 2: City and Postal Code */}
      <div className={css.row}>
        {/* City - Dropdown or Manual Input */}
        <div className={css.fieldGroup}>
          {showLabels && (
            <label className={`${css.label} ${labelClassName}`}>
              {labels.city}
            </label>
          )}
          {showManualCityInput ? (
            // Manual text input when no cities are available from the API
            <input
              type="text"
              className={`${css.input} ${selectClassName}`}
              value={selectedCity?.name || ''}
              onChange={handleManualCityChange}
              disabled={disabled}
              placeholder={placeholders.city}
            />
          ) : (
            // Dropdown when cities are available
            <select
              className={`${css.select} ${selectClassName} ${!selectedState ? css.selectDisabled : ''}`}
              value={selectedCity?.id || ''}
              onChange={handleCityChange}
              disabled={disabled || !selectedState || loadingCities}
            >
              <option value="">
                {loadingCities ? '...' : placeholders.city}
              </option>
              {[...cities]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(city => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Postal Code */}
        <div className={css.fieldGroup}>
          {showLabels && (
            <label className={`${css.label} ${labelClassName}`}>
              {labels.postalCode}
            </label>
          )}
          <input
            type="text"
            className={`${css.input} ${inputClassName}`}
            value={postalCode}
            onChange={handlePostalCodeChange}
            disabled={disabled}
            placeholder={placeholders.postalCode}
          />
        </div>
      </div>
    </div>
  );
};

export default AddressCascadingDropdowns;
