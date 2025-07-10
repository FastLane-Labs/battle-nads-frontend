'use client';

import React, { ReactNode } from 'react';
import { AuthStateProvider } from '@/contexts/AuthStateContext';
import { useContractCheck } from '@/contexts/ContractCheckContext';

interface AuthStateWrapperProps {
  children: ReactNode;
}

export function AuthStateWrapper({ children }: AuthStateWrapperProps) {
  const { contractCheckState } = useContractCheck();
  
  return (
    <AuthStateProvider isCheckingContract={contractCheckState.isChecking}>
      {children}
    </AuthStateProvider>
  );
}