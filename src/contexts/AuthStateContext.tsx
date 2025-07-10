'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { AuthStateContext as AuthStateType } from '@/types/auth';
import { useAppInitializerMachine } from '@/hooks/useAppInitializerMachine';

interface AuthStateProviderProps {
  children: ReactNode;
  isCheckingContract?: boolean;
}

const AuthStateContext = createContext<AuthStateType | undefined>(undefined);

/**
 * Provides authentication state using the app initializer state machine
 * This is the single source of truth for authentication flow state
 */
export function AuthStateProvider({ children, isCheckingContract = false }: AuthStateProviderProps) {
  const authState = useAppInitializerMachine(isCheckingContract);
  
  return (
    <AuthStateContext.Provider value={authState}>
      {children}
    </AuthStateContext.Provider>
  );
}

/**
 * Hook to consume the authentication state
 */
export function useAuthState(): AuthStateType {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthStateProvider');
  }
  return context;
}