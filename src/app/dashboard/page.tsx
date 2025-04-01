'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import NavBar from '../../components/NavBar';
import GameInitializer from '../../components/GameInitializer';

export default function DashboardPage() {
  return (
    <Box className="min-h-screen bg-gray-900">
      <NavBar />
      <Box pt="60px">
        <GameInitializer />
      </Box>
    </Box>
  );
} 