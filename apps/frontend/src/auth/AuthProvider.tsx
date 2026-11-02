import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { User } from '../types';
import apiClient from '../api/apiClient';
import { isAxiosError } from 'axios';

/**
 * Where the app is in determining who the current user is.
 *
 * - loading: the user's identity is still being fetched.
 * - authenticated: the user is signed in and has a database record.
 * - unauthenticated: no one is signed in, or their session is invalid (401 from /auth/me).
 * - forbidden: the user is signed in but has no database record (403 or 404 from /auth/me).
 * - error: anything else went wrong, e.g. the server returned a 500 or couldn't be reached.
 */
export type AuthState =
  'loading' | 'authenticated' | 'unauthenticated' | 'forbidden' | 'error';


/**
* Everything AuthProvider shares with the components inside it, read with useAuth().
 */
export type AuthContextValue = {
  authState: AuthState;
  user: User | null;
  refresh: () => Promise<void>;
  clear: () => void;
};

/**
 * Holds the AuthContextValue for every component inside AuthProvider.
 * Starts as undefined so useAuth() can tell when it's used outside an AuthProvider.
 */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Tracks the signed-in user and their auth state, and shares them with every component inside it.
 *
 * On first load it calls refresh() to fetch the current user from /auth/me. Wrap the app's router
 * in this component so pages and route guards like RequireStatus can read the auth state with useAuth().
 *
 * @param children the part of the app that can read the auth state
 * @returns the children, wrapped in AuthContext.Provider
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    setAuthState('loading');

    try {
      const currentUser = await apiClient.getCurrentIdentity();

      setUser(currentUser);
      setAuthState('authenticated');
    } catch (error) {
      setUser(null);

      const status = isAxiosError(error) ? error.response?.status : undefined;

      if (status === 401) {
        setAuthState('unauthenticated');
      } else if (status === 404 || status === 403) {
        setAuthState('forbidden');
      } else {
        setAuthState('error');
      }
    }
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setAuthState('unauthenticated');
  }, []);

  // Fetches the current user once when the app starts. The lint rule flags refresh's
  // setAuthState('loading'), but authState already starts as 'loading', so that update
  // doesn't cause an extra render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ authState, user, refresh, clear }),
    [authState, user, refresh, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


/**
 * Reads the auth state, current user, refresh and clear from the nearest AuthProvider.
 *
 * @returns the current AuthContextValue
 * @throws Error if used in a component that isn't inside an AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
