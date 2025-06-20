'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  ModalProps,
} from '@chakra-ui/react';

type GameModalVariant = 'default' | 'death' | 'transaction';

interface GameModalProps extends Omit<ModalProps, 'children'> {
  variant?: GameModalVariant;
  title?: string;
  showCloseButton?: boolean;
  overlayOpacity?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const variantConfig: Record<GameModalVariant, {
  contentBg: string;
  overlayBg: string;
  borderStyle?: string;
  headerColor?: string;
  minHeight?: string;
}> = {
  default: {
    contentBg: 'gray.900',
    overlayBg: 'rgba(0, 0, 0, 0.8)',
    borderStyle: 'borderColor="gray.700" borderWidth={1}',
    headerColor: 'gold',
  },
  death: {
    contentBg: '!bg-black/90',
    overlayBg: 'rgba(0, 0, 0, 0.9)',
    minHeight: '300px',
  },
  transaction: {
    contentBg: 'gray.900',
    overlayBg: 'rgba(0, 0, 0, 0.8)',
    borderStyle: 'borderColor="gray.700" borderWidth={1}',
    headerColor: 'gold',
  },
};

export const GameModal: React.FC<GameModalProps> = ({
  variant = 'default',
  title,
  showCloseButton = true,
  overlayOpacity,
  children,
  footer,
  isOpen,
  onClose,
  size = 'xl',
  isCentered = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  ...props
}) => {
  const config = variantConfig[variant];
  
  // Death modal overrides for non-dismissible behavior
  if (variant === 'death') {
    closeOnOverlayClick = false;
    closeOnEsc = false;
    showCloseButton = false;
  }

  const overlayBg = overlayOpacity 
    ? `rgba(0, 0, 0, ${overlayOpacity})`
    : config.overlayBg;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered={isCentered}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEsc={closeOnEsc}
      size={size}
      {...props}
    >
      <ModalOverlay bg={overlayBg} />
      <ModalContent
        bg={config.contentBg.startsWith('!') ? undefined : config.contentBg}
        className={config.contentBg.startsWith('!') ? config.contentBg : undefined}
        borderColor={variant !== 'death' ? 'gray.700' : undefined}
        borderWidth={variant !== 'death' ? 1 : undefined}
        minHeight={config.minHeight}
        display={variant === 'death' ? 'flex' : undefined}
        alignItems={variant === 'death' ? 'center' : undefined}
        justifyContent={variant === 'death' ? 'center' : undefined}
      >
        {title && (
          <ModalHeader color={config.headerColor}>
            {title}
          </ModalHeader>
        )}
        
        {showCloseButton && <ModalCloseButton color="white" />}
        
        <ModalBody pb={footer ? 6 : 8} p={variant === 'death' ? 8 : undefined}>
          {children}
        </ModalBody>
        
        {footer && (
          <ModalFooter>
            {footer}
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};