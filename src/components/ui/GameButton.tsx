'use client';

import React, { forwardRef } from 'react';
import { Box, Button, ButtonProps } from '@chakra-ui/react';

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
  compact: { height: 'h-[45px]', textSize: 'text-lg' },
  default: { height: 'h-[60px]', textSize: 'text-xl' },
  large: { height: 'h-[75px]', textSize: 'text-3xl sm:text-4xl font-bold', responsiveHeight: 'sm:h-[85px]' },
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
    
    // Image classes
    const imageClasses = [
      'transition-all duration-200',
      'group-hover:brightness-125 group-hover:scale-[1.02]',
      'group-active:brightness-90 group-active:scale-[0.98]',
      disabled && 'opacity-50',
    ].filter(Boolean).join(' ');
    
    // Text classes
    const textClasses = [
      'absolute inset-0 flex items-center justify-center z-10',
      'transition-transform duration-200',
      'group-hover:scale-105 group-active:scale-95',
      'pointer-events-none',
    ].filter(Boolean).join(' ');
    
    // Glow effect (optional) - for create-character variant, always visible
    const isCreateCharacter = variant === 'create-character';
    const glowElement = withGlow && (
      <div
        className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${
          isCreateCharacter ? 'opacity-20' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{
          background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.4), transparent 70%)',
          filter: 'blur(25px)',
        }}
      />
    );

    return (
      <div className={`relative mt-4 group ${responsiveHeight || ''}`}>
        <img 
          src={bgImage}
          alt="" 
          className={`absolute inset-0 w-full ${height} object-fill z-0 transition-all duration-200 
            group-hover:brightness-125 group-hover:scale-[1.02] group-active:brightness-90 group-active:scale-[0.98]
            ${disabled ? 'opacity-50' : ''}`}
        />
        
        <button 
          ref={ref}
          className={`relative ${height} w-full uppercase z-10 bg-transparent border-0 px-8 py-0
            flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${responsiveHeight || ''}`}
          onClick={props.onClick}
          disabled={disabled}
          type="button"
        >
          <span className={`gold-text ${textSize} leading-none ${withAnimation ? 'animate-pulse' : ''}`}>
            {loading && loadingText ? loadingText : children}
          </span>
        </button>
        {glowElement}
      </div>
    );
  }
);

GameButton.displayName = 'GameButton';