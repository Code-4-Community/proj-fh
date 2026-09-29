import { render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should show the sign-in screen', () => {
    const { getByText } = render(<App />);
    expect(getByText('Welcome back')).toBeTruthy();
    expect(getByText('Sign in')).toBeTruthy();
  });
});
