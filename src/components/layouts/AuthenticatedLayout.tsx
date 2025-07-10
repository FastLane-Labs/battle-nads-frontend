'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import NavBar from '@/components/NavBar';
import { OnboardingManager } from '@/components/onboarding';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  showNavBar?: boolean;
}

/**
 * Layout component for authenticated pages.
 * Provides consistent structure with NavBar and proper spacing.
 */
const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ 
  children, 
  showNavBar = true 
}) => {
  return (
    <div className='h-screen'>
      {showNavBar && <NavBar />}
      <Box pt={showNavBar ? "64px" : "0"} className='h-full'>
        {children}
      </Box>
      <OnboardingManager />
    </div>
  );
};

export default AuthenticatedLayout;