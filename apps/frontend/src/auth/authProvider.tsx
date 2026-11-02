import { ReactNode, useCallback, useState } from "react";
import { User } from "../types";
import apiClient from "../api/apiClient";
import { isAxiosError } from "axios";

export type AuthState = 
    | 'loading'
    | 'authenticated'
    | 'unauthenticated'
    | 'forbidden'
    | 'error';


export function AuthProvider({ children }: { children: ReactNode })
{
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

}
