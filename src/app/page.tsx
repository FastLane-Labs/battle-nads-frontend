'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import Login from './Login';

export default function HomePage() {
  return (
    <Box className="min-h-screen bg-gray-900">
      <Login />
    </Box>
  );
} 