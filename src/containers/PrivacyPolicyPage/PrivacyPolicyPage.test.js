import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { PrivacyPolicyPageComponent } from './PrivacyPolicyPage';

const { screen } = testingLibrary;

describe('PrivacyPolicyPage', () => {
  it('renders the local privacy policy content', () => {
    render(<PrivacyPolicyPageComponent scrollingDisabled={false} />);

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Last updated: October 24, 2024')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Information We Collect' })).toBeInTheDocument();
    expect(screen.getByText('Request Account Deletion')).toBeInTheDocument();
  });
});
