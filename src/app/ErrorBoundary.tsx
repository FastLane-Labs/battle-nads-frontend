'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { Button, Box, Heading, Text, VStack } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our logger service
    logger.error('React Error Boundary caught an error', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });
  }

  private handleReload = (): void => {
    // Reset the error boundary state
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Optional: reload the page
    window.location.reload();
  };

  public render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Box 
          p={8} 
          borderRadius="md"
          bg="red.900"
          color="white"
          maxW="container.md"
          mx="auto"
          my={12}
          textAlign="left"
        >
          <VStack spacing={6} align="stretch">
            <Heading as="h1" size="xl">Something went wrong</Heading>
            <Text>We've encountered an unexpected error. Our team has been notified.</Text>
            
            {process.env.NODE_ENV !== 'production' && (
              <>
                <Box mt={4}>
                  <Heading as="h3" size="md" mb={2}>Error Details:</Heading>
                  <Box 
                    p={4} 
                    borderRadius="md" 
                    bg="blackAlpha.400"
                    fontSize="sm"
                    fontFamily="monospace"
                    whiteSpace="pre-wrap"
                    overflowX="auto"
                  >
                    {error?.toString()}
                  </Box>
                </Box>

                {errorInfo && (
                  <Box mt={2}>
                    <Heading as="h3" size="md" mb={2}>Component Stack:</Heading>
                    <Box 
                      p={4} 
                      borderRadius="md" 
                      bg="blackAlpha.400"
                      fontSize="sm"
                      fontFamily="monospace"
                      whiteSpace="pre-wrap"
                      overflowX="auto"
                    >
                      {errorInfo.componentStack}
                    </Box>
                  </Box>
                )}
              </>
            )}
            
            <Button 
              mt={6} 
              colorScheme="white" 
              variant="outline"
              onClick={this.handleReload}
              alignSelf="flex-start"
            >
              Retry
            </Button>
          </VStack>
        </Box>
      );
    }

    return children;
  }
}

export default ErrorBoundary; 