'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@chakra-ui/react';
import { handleContractChange } from '@/utils/contractChangeDetection';
import { logger } from '@/utils/logger';

interface ContractCheckState {
  isChecking: boolean;
  hasChecked: boolean;
  changeDetected: boolean;
  error?: string;
}

interface ContractCheckContextValue {
  contractCheckState: ContractCheckState;
}

const ContractCheckContext = createContext<ContractCheckContextValue | undefined>(undefined);

interface ContractCheckProviderProps {
  children: ReactNode;
}

export function ContractCheckProvider({ children }: ContractCheckProviderProps) {
  const toast = useToast();
  const [contractCheckState, setContractCheckState] = useState<ContractCheckState>({
    isChecking: false,
    hasChecked: false,
    changeDetected: false
  });

  // Effect for contract change detection (runs once on mount)
  useEffect(() => {
    const checkContractChange = async () => {
      if (contractCheckState.hasChecked) return;
      
      setContractCheckState(prev => ({ ...prev, isChecking: true }));
      
      try {
        const changeDetected = await handleContractChange();
        
        if (changeDetected) {
          logger.info('[ContractCheckProvider] Contract change detected and handled');
          toast({
            title: 'Contract Updated',
            description: 'The game contract has been updated. Your previous data has been cleared for a fresh start.',
            status: 'info',
            duration: 8000,
            isClosable: true,
          });
        }
        
        setContractCheckState(prev => ({
          ...prev,
          isChecking: false,
          hasChecked: true,
          changeDetected
        }));
      } catch (error) {
        logger.error('[ContractCheckProvider] Error during contract change detection', error);
        setContractCheckState(prev => ({
          ...prev,
          isChecking: false,
          hasChecked: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        
        // Show error toast but don't block the app
        toast({
          title: 'Contract Check Warning',
          description: 'Unable to verify contract version. The app will continue normally.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    checkContractChange();
  }, []); // Run only once on mount

  return (
    <ContractCheckContext.Provider value={{ contractCheckState }}>
      {children}
    </ContractCheckContext.Provider>
  );
}

export function useContractCheck() {
  const context = useContext(ContractCheckContext);
  if (!context) {
    throw new Error('useContractCheck must be used within ContractCheckProvider');
  }
  return context;
}