import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import BooleanFilter from './BooleanFilter';

const { screen, userEvent } = testingLibrary;

describe('BooleanFilter', () => {
  it('toggles true-only filters on and off without submitting false', async () => {
    const onSubmit = jest.fn();

    const { rerender } = render(
      <BooleanFilter
        id="handByHandAvailable"
        name="handByHandAvailable"
        label="Hand by hand"
        queryParamNames={['pub_handByHandAvailable']}
        initialValues={{}}
        onSubmit={onSubmit}
        toggleOnly
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hand by hand' }));
    expect(onSubmit).toHaveBeenCalledWith({ pub_handByHandAvailable: true });

    rerender(
      <BooleanFilter
        id="handByHandAvailable"
        name="handByHandAvailable"
        label="Hand by hand"
        queryParamNames={['pub_handByHandAvailable']}
        initialValues={{ pub_handByHandAvailable: true }}
        onSubmit={onSubmit}
        toggleOnly
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hand by hand' }));
    expect(onSubmit).toHaveBeenLastCalledWith({ pub_handByHandAvailable: null });
  });

  it('treats false as disabled for toggle-only filters', async () => {
    const onSubmit = jest.fn();

    render(
      <BooleanFilter
        id="handByHandAvailable"
        name="handByHandAvailable"
        label="Hand by hand"
        queryParamNames={['pub_handByHandAvailable']}
        initialValues={{ pub_handByHandAvailable: false }}
        onSubmit={onSubmit}
        toggleOnly
      />
    );

    const button = screen.getByRole('button', { name: 'Hand by hand' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith({ pub_handByHandAvailable: true });
  });

  it('treats string true from URL params as enabled', async () => {
    const onSubmit = jest.fn();

    render(
      <BooleanFilter
        id="handByHandAvailable"
        name="handByHandAvailable"
        label="Hand by hand"
        queryParamNames={['pub_handByHandAvailable']}
        initialValues={{ pub_handByHandAvailable: 'true' }}
        onSubmit={onSubmit}
        toggleOnly
      />
    );

    const button = screen.getByRole('button', { name: 'Hand by hand' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith({ pub_handByHandAvailable: null });
  });
});
