'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import AppInitializer from '../components/AppInitializer';

export default function ClientPage() {
  return (
    <Box className="min-h-screen">
      <AppInitializer />
    </Box>
  );
} 