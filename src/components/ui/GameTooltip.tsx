'use client';

import React, { ReactNode } from 'react';
import { Tooltip, TooltipProps, VStack, Text, Box } from '@chakra-ui/react';

type TooltipVariant = 'simple' | 'detailed';

interface GameTooltipProps extends Omit<TooltipProps, 'label'> {
  title?: string;
  description?: string;
  status?: string;
  statusType?: 'error' | 'warning' | 'info';
  variant?: TooltipVariant;
  customLabel?: ReactNode;
  children: ReactNode;
  /** 
   * Whether to wrap children in a positioned Box. 
   * Disable for block-level elements like Progress bars.
   * @default true
   */
  useWrapper?: boolean;
}

export const GameTooltip: React.FC<GameTooltipProps> = ({
  title,
  description,
  status,
  statusType = 'error',
  variant = 'detailed',
  customLabel,
  children,
  placement = 'top',
  hasArrow = true,
  className = '',
  useWrapper = true,
  ...props
}) => {
  // Create tooltip label based on variant
  const createTooltipLabel = () => {
    // Use custom label if provided
    if (customLabel) {
      return customLabel;
    }

    // Simple variant - just title or description
    if (variant === 'simple') {
      return title || description || '';
    }

    // Detailed variant - VStack with structured content
    if (!title && !description && !status) {
      return null;
    }

    return (
      <VStack align="start" spacing={0} p={1}>
        {title && (
          <Text fontWeight="bold" className="gold-text-light">
            {title}
          </Text>
        )}
        {description && (
          <Text fontSize="xs" className="text-white" mt={title ? 1 : 0}>
            {description}
          </Text>
        )}
        {status && (
          <Text 
            fontSize="xs" 
            className={getStatusColor(statusType)}
            mt={2}
          >
            {status}
          </Text>
        )}
      </VStack>
    );
  };

  // Get color class based on status type
  const getStatusColor = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return 'text-red-300';
      case 'warning':
        return 'text-yellow-300';
      case 'info':
        return 'text-blue-300';
      default:
        return 'text-red-300';
    }
  };

  // Combine default and custom classes
  const tooltipClasses = [
    'mx-2 !bg-dark-brown border rounded-md border-amber-400/30 !text-white',
    className
  ].filter(Boolean).join(' ');

  const tooltipLabel = createTooltipLabel();

  // Don't render tooltip if no label content
  if (!tooltipLabel) {
    return <>{children}</>;
  }

  return (
    <Tooltip
      label={tooltipLabel}
      placement={placement}
      hasArrow={hasArrow}
      className={tooltipClasses}
      {...props}
    >
      {useWrapper ? (
        <Box position="relative" display="inline-block">
          {children}
        </Box>
      ) : (
        children
      )}
    </Tooltip>
  );
};