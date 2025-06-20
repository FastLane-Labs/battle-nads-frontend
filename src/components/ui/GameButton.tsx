'use client';

import React, { forwardRef } from 'react';
import { Box, Button, ButtonProps } from '@chakra-ui/react';
import Image from 'next/image';

type GameButtonVariant = 'primary' | 'compact' | 'large' | 'create-character';
type GameButtonSize = 'compact' | 'default' | 'large';

interface GameButtonProps extends Omit<ButtonProps, 'size' | 'variant'> {
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  backgroundImage?: string;
  loading?: boolean;
  loadingText?: string;
  withAnimation?: boolean;
  withGlow?: boolean;
}

const sizeConfig: Record<GameButtonSize, { height: string; textSize: string; responsiveHeight?: string }> = {
  compact: { height: '45px', textSize: 'text-lg' },
  default: { height: '60px', textSize: 'text-xl sm:text-2xl' },
  large: { height: '75px', textSize: 'text-2xl sm:text-3xl', responsiveHeight: 'sm:h-[85px]' },
};

const variantConfig: Record<GameButtonVariant, { backgroundImage: string; size: GameButtonSize }> = {
  primary: { backgroundImage: '/assets/buttons/primary-button.webp', size: 'default' },
  compact: { backgroundImage: '/assets/buttons/primary-button.webp', size: 'compact' },
  large: { backgroundImage: '/assets/buttons/primary-button.webp', size: 'large' },
  'create-character': { backgroundImage: '/assets/buttons/create-character.webp', size: 'large' },
};

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  ({ 
    variant = 'primary',
    size,
    backgroundImage,
    loading = false,
    loadingText,
    withAnimation = false,
    withGlow = false,
    children,
    isDisabled,
    className = '',
    ...props 
  }, ref) => {
    // Determine size from variant or explicit size prop
    const effectiveSize = size || variantConfig[variant].size;
    const { height, textSize, responsiveHeight } = sizeConfig[effectiveSize];
    
    // Determine background image
    const bgImage = backgroundImage || variantConfig[variant].backgroundImage;
    
    // Combine disabled states
    const disabled = isDisabled || loading;
    
    // Container classes with optional animations
    const containerClasses = [
      'relative group cursor-pointer w-full',
      withAnimation && 'animate-float',
      className,
    ].filter(Boolean).join(' ');
    
    // Image container classes
    const imageClasses = [
      'relative w-full',
      height,
      responsiveHeight,
      'transition-all duration-200',
      'group-hover:brightness-125 group-hover:scale-[1.02]',
      'group-active:brightness-90 group-active:scale-[0.98]',
      disabled && 'opacity-50',
    ].filter(Boolean).join(' ');
    
    // Text classes
    const textClasses = [
      'absolute inset-0 flex items-center justify-center',
      'transition-transform duration-200',
      'group-hover:scale-105 group-active:scale-95',
      'pointer-events-none',
    ].filter(Boolean).join(' ');
    
    // Glow effect (optional)
    const glowElement = withGlow && (
      <Box
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.3), transparent 70%)',
          filter: 'blur(20px)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
    );

    return (
      <Button
        ref={ref}
        as="button"
        onClick={props.onClick}
        isDisabled={disabled}
        className={containerClasses}
        w="full"
        h="auto"
        p={0}
        bg="transparent"
        _hover={{ bg: 'transparent' }}
        _active={{ bg: 'transparent' }}
        _focus={{ boxShadow: 'none' }}
        _disabled={{ cursor: 'not-allowed' }}
        {...props}
      >
        {glowElement}
        <Box className={imageClasses}>
          <Image
            src={bgImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain"
            priority
          />
        </Box>
        <Box className={textClasses}>
          <span className={`gold-text ${textSize} ${withAnimation ? 'animate-pulse' : ''}`}>
            {loading && loadingText ? loadingText : children}
          </span>
        </Box>
      </Button>
    );
  }
);

GameButton.displayName = 'GameButton';