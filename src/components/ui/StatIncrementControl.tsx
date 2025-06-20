'use client';

import React from 'react';
import { HStack } from '@chakra-ui/react';
import Image from 'next/image';

type StatIncrementSize = 'small' | 'large';

interface StatIncrementControlProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  canIncrement: boolean;
  canDecrement: boolean;
  size?: StatIncrementSize;
  isDisabled?: boolean;
  showStyledValue?: boolean;
}

const sizeConfig: Record<StatIncrementSize, { 
  buttonSize: string; 
  spacing: string;
  valueContainer?: string;
  valueText?: string;
}> = {
  small: { 
    buttonSize: 'w-[30px] h-[30px]', 
    spacing: 'space-x-3',
    valueText: 'text-white text-xl font-semibold min-w-[2ch] text-center'
  },
  large: { 
    buttonSize: 'w-[50px] h-[50px]', 
    spacing: 'space-x-1',
    valueContainer: 'bg-black/85 px-4 pt-1 pb-2 min-w-[68px] sm:min-w-[80px] rounded-md border-2 border-zinc-400/25 shadow-[0_0_8px_rgba(100,100,100,0.3)] flex items-center justify-center',
    valueText: 'gold-text text-3xl sm:text-4xl font-bold leading-none'
  },
};

export const StatIncrementControl: React.FC<StatIncrementControlProps> = ({
  value,
  onIncrement,
  onDecrement,
  canIncrement,
  canDecrement,
  size = 'large',
  isDisabled = false,
}) => {
  const { buttonSize, spacing, valueContainer, valueText } = sizeConfig[size];
  
  const decrementDisabled = isDisabled || !canDecrement;
  const incrementDisabled = isDisabled || !canIncrement;

  const buttonBaseClasses = `
    relative flex items-center justify-center transition-transform duration-200
    hover:scale-105 active:scale-95
  `;

  const overlayClasses = `
    absolute inset-0 filter blur-sm opacity-0 hover:opacity-100 
    transition-opacity duration-200 rounded
  `;

  return (
    <HStack className={spacing}>
      {/* Decrement Button */}
      <button
        className={`
          ${buttonBaseClasses} ${buttonSize}
          ${decrementDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={onDecrement}
        disabled={decrementDisabled}
        aria-label="-"
      >
        {/* Button Image */}
        <Image
          src="/assets/buttons/-.webp"
          alt="-"
          width={size === 'large' ? 50 : 30}
          height={size === 'large' ? 50 : 30}
          className="w-full h-full object-contain"
          priority
        />
        
        {/* Hover Overlay */}
        <div className={`${overlayClasses} bg-red-400/20`} />
      </button>

      {/* Display Value */}
      {valueContainer ? (
        <div className={valueContainer}>
          <div className={valueText}>
            {value}
          </div>
        </div>
      ) : (
        <span className={valueText}>
          {value}
        </span>
      )}

      {/* Increment Button */}
      <button
        className={`
          ${buttonBaseClasses} ${buttonSize}
          ${incrementDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label="+"
      >
        {/* Button Image */}
        <Image
          src="/assets/buttons/+.webp"
          alt="+"
          width={size === 'large' ? 50 : 30}
          height={size === 'large' ? 50 : 30}
          className="w-full h-full object-contain"
          priority
        />
        
        {/* Hover Overlay */}
        <div className={`${overlayClasses} bg-teal-400/20`} />
      </button>
    </HStack>
  );
};