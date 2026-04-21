import React, { act } from 'react';
import ReactDOMClient from 'react-dom/client';
import { getHostedConfiguration } from './util/testHelpers';
import { ClientApp } from './app';
import configureStore from './store';

// Mock @loadable/component to return empty fallback components synchronously
// so that dynamic imports don't cause SyntaxError retry loops in the test environment.
jest.mock('@loadable/component', () => {
  const React = require('react');
  return (loader, opts = {}) => {
    const Fallback = (opts && opts.fallback) ? opts.fallback : () => null;
    const LoadableComponent = () => React.createElement(Fallback);
    LoadableComponent.preload = () => {};
    return LoadableComponent;
  };
});

const jsdomScroll = window.scroll;
beforeAll(() => {
  // Mock window.scroll - otherwise, Jest/JSDOM will print a not-implemented error.
  window.scroll = () => {};
});

afterAll(() => {
  window.scroll = jsdomScroll;
});

describe('Application - JSDOM environment', () => {
  it('renders the LandingPage without crashing', async () => {
    window.google = { maps: {} };

    // LandingPage gets rendered and it calls hostedAsset > fetchPageAssets > sdk.assetByVersion
    const pageData = {
      data: {
        sections: [],
        _schema: './schema.json',
      },
      meta: {
        version: 'bCsMYVYVawc8SMPzZWJpiw',
      },
    };
    const resolvePageAssetCall = () => Promise.resolve(pageData);
    const resolveListingsCall = () => Promise.resolve({ data: { data: [], included: [] } });
    const resolveEmptyCall = () => Promise.resolve({ data: {} });
    const fakeSdk = {
      assetByVersion: resolvePageAssetCall,
      assetByAlias: resolvePageAssetCall,
      listings: { query: resolveListingsCall },
      currentUser: { show: resolveEmptyCall },
      authInfo: resolveEmptyCall,
    };
    const store = configureStore({}, fakeSdk);
    const div = document.createElement('div');
    const root = ReactDOMClient.createRoot(div);

    await act(async () => {
      root.render(<ClientApp store={store} hostedConfig={getHostedConfiguration()} />);
    });
    delete window.google;
  });
});
