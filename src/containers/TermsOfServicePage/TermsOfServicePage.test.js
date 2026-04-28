import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { TermsOfServicePageComponent } from './TermsOfServicePage';

const { waitFor } = testingLibrary;

describe('TermsOfServicePage', () => {
  it('renders the redesigned Terms and Conditions page', async () => {
    const errorMessage = 'TermsOfServicePage failed';
    let e = new Error(errorMessage);
    e.type = 'error';
    e.name = 'Test';

    const { getAllByText, getByText } = render(
      <TermsOfServicePageComponent pageAssetsData={null} inProgress={false} error={e} />
    );

    await waitFor(() => {
      expect(getByText('Terms & Conditions')).toBeInTheDocument();
      expect(getByText('Table of Contents')).toBeInTheDocument();
      expect(getAllByText('2. Platform Role').length).toBeGreaterThan(0);
    });
  });
});
