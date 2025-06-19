'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Button,
  Text,
  VStack,
  Box
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/providers/WalletProvider';

interface DeathModalProps {
  isOpen: boolean;
  onClose?: () => void; // Optional since death modal might not be dismissible
  characterName?: string;
  balanceLost?: string; // Formatted balance string
}

const DeathModal: React.FC<DeathModalProps> = ({ 
  isOpen, 
  onClose, 
  characterName,
  balanceLost 
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { injectedWallet } = useWallet();

  const handleCreateNewCharacter = () => {
    // Clear any character data from localStorage before redirecting
    if (typeof window !== 'undefined') {
      // Clear character ID from localStorage
      const keys = Object.keys(localStorage);
      const keysToRemove = keys.filter(key => key.includes('battleNadsCharacterId'));
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
    }
    
    // Invalidate all game-related queries to force a refresh
    const owner = injectedWallet?.address;
    if (owner) {
      // Invalidate the main game state query
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
      // Invalidate session key queries
      queryClient.invalidateQueries({ queryKey: ['sessionKey'] });
      // Invalidate any other character-related queries
      queryClient.invalidateQueries({ queryKey: ['battleNads'] });
    }
    
    // Add a small delay to allow queries to refresh before redirecting
    setTimeout(() => {
      // Redirect to character creation
      router.push('/create');
    }, 100);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose || (() => {})} 
      isCentered 
      closeOnOverlayClick={false}
      closeOnEsc={false}
      size="xl"
    >
      <ModalOverlay bg="rgba(0, 0, 0, 0.9)" />
      <ModalContent 
        minHeight="300px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        className='!bg-black/90'
      >
        <ModalBody p={8}>
          <VStack spacing={6} textAlign="center">
            {/* YOU DIED title */}
            <Text 
              fontSize="8xl" 
              letterSpacing="wider"
              className='text-nowrap text-red-800 font-serif leading-none'
            >
              YOU DIED
            </Text>

            {/* Character name if provided */}
            {characterName && (
              <Text 
                fontSize="xl" 
                color="gray.200"
                fontStyle="italic"
              >
                {characterName} has fallen in battle
              </Text>
            )}

            {/* Balance returned info if provided */}
            {/* {balanceReturned && (
              <Box 
                bg="rgba(139, 0, 0, 0.2)" 
                border="1px solid #8B0000" 
                borderRadius="md" 
                p={4}
                w="100%"
              >
                <Text color="gray.200" fontSize="sm" mb={2}>
                  Balance Returned:
                </Text>
                <Text color="#FFD700" fontSize="lg" fontWeight="bold">
                  {balanceReturned}
                </Text>
              </Box>
            )} */}

            {/* Create new character button */}
            <Button
              bg="#8B0000"
              color="white"
              size="lg"
              px={8}
              py={6}
              fontSize="xl"
              fontWeight="bold"
              _hover={{ bg: "#A52A2A" }}
              _active={{ bg: "#660000" }}
              onClick={handleCreateNewCharacter}
              border="1px solid #A52A2A"
              borderRadius="md"
            >
              Create New Character
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default DeathModal; 