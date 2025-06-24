import React from 'react';
import { Box } from '@chakra-ui/react';
import { getHealthPercentage } from '@/utils/validateCharacterHealth';

interface HealthBarProps {
  health: number;
  maxHealth: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const HealthBar: React.FC<HealthBarProps> = ({ 
  health, 
  maxHealth, 
  size = 'medium',
  showLabel = true 
}) => {
  const healthPercentage = getHealthPercentage(health, maxHealth) * 100;

  // Size configurations
  const sizeConfig = {
    small: {
      height: 'h-6',
      textSize: 'text-sm',
      padding: 'px-1'
    },
    medium: {
      height: 'h-9',
      textSize: 'text-xl',
      padding: 'px-2'
    },
    large: {
      height: 'h-12',
      textSize: 'text-2xl',
      padding: 'px-3'
    }
  };

  const config = sizeConfig[size];

  return (
    <Box>
      <div className={`relative w-full bg-black/70 rounded border border-amber-900/35 ${config.height} overflow-hidden`}>
        <div 
          className={`h-full ${
            healthPercentage > 55 
            ? 'bg-gradient-to-r from-red-800 via-red-700 to-red-800' 
            : healthPercentage > 30 
            ? 'bg-gradient-to-r from-yellow-800 via-yellow-700 to-yellow-800' 
            : 'bg-red-900/95'
          }`}
          style={{ width: `${healthPercentage}%` }}
        />
        {showLabel && (
          <div className={`absolute inset-0 flex justify-between items-center ${config.padding}`}>
            <span className={`text-amber-300 font-black font-serif ${config.textSize}`}>HP</span>
            <span className={`text-amber-300 font-black font-serif ${config.textSize}`}>
              {health}/{maxHealth}
            </span>
          </div>
        )}
      </div>
    </Box>
  );
};

export default HealthBar; 