'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import AppInitializer from '../components/AppInitializer';

export default function HomePage() {
  return (
    <Box className="min-h-screen bg-gray-900">
      <AppInitializer />
    </Box>
  );
} 