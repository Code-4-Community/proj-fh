import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { User } from "../types";
import apiClient from "../api/apiClient";
import { isAxiosError } from "axios";

export type AuthState = 
    | 'loading'
    | 'authenticated'
    | 'unauthenticated'
    | 'forbidden'
    | 'error';

export type AuthContextValue = {
    authState: AuthState;
    user: User | null;
    refresh: () => Promise<void>;
    clear: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>('loading');
    const [user, setUser] = useState<User | null>(null);

    const refresh = useCallback(async () =>  { 
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

    const clear = useCallback(async () => {
        setUser(null);
        setAuthState('unauthenticated');
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const value = useMemo(
        () => ({ authState, user, refresh, clear }),
        [authState, user, refresh, clear],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }
    return context;
}

