'use client';

import React from 'react';
import { Spinner, Text, Box, Center } from '@chakra-ui/react';

type LoadingSize = 'small' | 'medium' | 'large';
type LoadingVariant = 'inline' | 'fullscreen' | 'overlay';

interface LoadingIndicatorProps {
  message?: string;
  size?: LoadingSize;
  variant?: LoadingVariant;
  showBackground?: boolean;
  backgroundImage?: string;
  className?: string;
  children?: React.ReactNode;
}

const sizeConfig: Record<LoadingSize, {
  spinnerSize: string;
  textSize: string;
  spacing: string;
}> = {
  small: { spinnerSize: 'md', textSize: 'text-sm', spacing: 'space-y-2' },
  medium: { spinnerSize: 'lg', textSize: 'text-base', spacing: 'space-y-3' },
  large: { spinnerSize: 'xl', textSize: 'text-lg', spacing: 'space-y-4' },
};

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Loading...',
  size = 'large',
  variant = 'fullscreen',
  showBackground = true,
  backgroundImage,
  className = '',
  children,
}) => {
  const { spinnerSize, textSize, spacing } = sizeConfig[size];

  // Base content (spinner + text + children)
  const content = (
    <div className={`flex flex-col items-center ${spacing}`}>
      <Spinner 
        size={spinnerSize as any}
        color="gold"
        thickness="4px"
        speed="0.8s"
      />
      {message && (
        <Text 
          className={`text-yellow-500 ${textSize} text-center`}
          fontWeight="medium"
        >
          {message}
        </Text>
      )}
      {children}
    </div>
  );

  // Inline variant - minimal wrapper
  if (variant === 'inline') {
    return (
      <Box className={className}>
        {content}
      </Box>
    );
  }

  // Overlay variant - absolute positioned with backdrop
  if (variant === 'overlay') {
    return (
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(0, 0, 0, 0.8)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex="modal"
        className={className}
      >
        {content}
      </Box>
    );
  }

  // Fullscreen variant - full screen with optional background
  const backgroundStyle = backgroundImage 
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <Box
      className={`h-screen w-full flex items-center justify-center ${showBackground ? 'bg-black' : ''} ${className}`}
      style={backgroundStyle}
    >
      {showBackground && backgroundImage && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.6)"
          zIndex="1"
        />
      )}
      
      <Box position="relative" zIndex="2">
        {variant === 'fullscreen' && showBackground ? (
          <Box
            className="bg-black/60 border border-amber-900/50 rounded-lg p-6 mx-4"
            minW="300px"
          >
            {content}
          </Box>
        ) : (
          content
        )}
      </Box>
    </Box>
  );
};