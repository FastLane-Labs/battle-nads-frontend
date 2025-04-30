'use client';

import React, { useState, useEffect } from 'react';
import { Box, Heading, Flex, Spinner, Text } from '@chakra-ui/react';
import { useWallet } from '../../providers/WalletProvider';
import { CharacterCard } from './CharacterCard';
import { CharacterList } from './CharacterList';
import { domain } from '../../types'; // Import domain namespace

const CharacterDashboard = () => {
  const { address } = useWallet();
  // State to hold the selected character (domain.Character)
  const [selectedCharacter, setSelectedCharacter] = useState<domain.Character | null>(null);

  console.log('CharacterDashboard rendering. Selected Character:', selectedCharacter?.id);

  return (
    <Box p={5}>
      <Heading mb={4}>Character Dashboard</Heading>
      {!address ? (
        <Text>Please connect your wallet.</Text>
      ) : (
        <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
          {/* Left Panel: Character List */}
          <Box flex={{ base: 'none', md: 1 }} maxW={{ md: '350px' }}>
            <CharacterList 
              onSelectCharacter={setSelectedCharacter} 
              selectedCharacterId={selectedCharacter?.id}
            />
          </Box>

          {/* Right Panel: Selected Character Details */}
          <Box flex={{ base: 'none', md: 2 }}>
            {selectedCharacter ? (
              <CharacterCard character={selectedCharacter} />
            ) : (
              <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800" minH="200px" display="flex" alignItems="center" justifyContent="center">
                 <Text color="gray.400">Select a character from the list</Text>
              </Box>
            )}
          </Box>
        </Flex>
      )}
    </Box>
  );
};

export default CharacterDashboard; 