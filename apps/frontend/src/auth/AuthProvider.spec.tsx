import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthProvider';
import apiClient from '../api/apiClient';
import { Status, type User } from '../types';

/**
 * Unit tests for AuthProvider.
 *
 * apiClient is mocked, so no backend or Cognito is needed. renderHook runs useAuth() inside an
 * AuthProvider the way a real component would, so these tests see the same state changes the app does.
 */

// Replaces the real apiClient so its Cognito and axios setup never loads.
jest.mock('../api/apiClient', () => ({
  __esModule: true,
  default: { getCurrentIdentity: jest.fn() },
}));

const getCurrentIdentity = jest.mocked(apiClient.getCurrentIdentity);

const adminUser = {
  id: 1,
  status: Status.ADMIN,
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@c4cneu.gmail.com',
} as User;

/** Builds an error shaped like the axios error apiClient throws for an HTTP error response. */
const httpError = (status: number) => ({ isAxiosError: true, response: { status } });

/** Renders useAuth() inside an AuthProvider, which calls refresh() once on mount. */
const renderAuth = () => renderHook(() => useAuth(), { wrapper: AuthProvider });

describe('AuthProvider', () => {
  beforeEach(() => {
    getCurrentIdentity.mockReset();
  });

  describe('refresh', () => {
    it('starts loading, then stores the user and becomes authenticated on success', async () => {
      getCurrentIdentity.mockResolvedValue(adminUser);

      const { result } = renderAuth();
      expect(result.current.authState).toBe('loading');

      await waitFor(() => expect(result.current.authState).toBe('authenticated'));
      expect(result.current.user).toEqual(adminUser);
    });

    it('becomes unauthenticated with no user on a 401', async () => {
      getCurrentIdentity.mockRejectedValue(httpError(401));

      const { result } = renderAuth();

      await waitFor(() => expect(result.current.authState).toBe('unauthenticated'));
      expect(result.current.user).toBeNull();
    });

    it.each([403, 404])('becomes forbidden with no user on a %i', async (status) => {
      getCurrentIdentity.mockRejectedValue(httpError(status));

      const { result } = renderAuth();

      await waitFor(() => expect(result.current.authState).toBe('forbidden'));
      expect(result.current.user).toBeNull();
    });

    it.each([
      ['a 500 response', httpError(500)],
      ['a network error with no response', new Error('Network Error')],
    ])('becomes error with no user on %s', async (_, error) => {
      getCurrentIdentity.mockRejectedValue(error);

      const { result } = renderAuth();

      await waitFor(() => expect(result.current.authState).toBe('error'));
      expect(result.current.user).toBeNull();
    });

    it('updates the state when called again, e.g. after signing in or out', async () => {
      getCurrentIdentity.mockResolvedValue(adminUser);
      const { result } = renderAuth();
      await waitFor(() => expect(result.current.authState).toBe('authenticated'));

      getCurrentIdentity.mockRejectedValue(httpError(401));
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.authState).toBe('unauthenticated');
      expect(result.current.user).toBeNull();
      expect(getCurrentIdentity).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('removes the user and becomes unauthenticated', async () => {
      getCurrentIdentity.mockResolvedValue(adminUser);
      const { result } = renderAuth();
      await waitFor(() => expect(result.current.authState).toBe('authenticated'));

      act(() => {
        result.current.clear();
      });

      expect(result.current.authState).toBe('unauthenticated');
      expect(result.current.user).toBeNull();
    });
  });

  describe('useAuth', () => {
    // React logs the thrown error to the console; this keeps the expected error out of the test output.
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('throws when used outside an AuthProvider', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used inside AuthProvider',
      );
    });
  });
});