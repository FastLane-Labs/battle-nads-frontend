import React, { useState, useEffect, useCallback } from 'react';
import { Box, VStack, Text, Flex, Badge, Button, Heading, Spinner } from '@chakra-ui/react';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNadsClient } from '../../hooks/contracts/useBattleNadsClient'; // Import client hook
import { domain } from '../../types'; // Import domain types
import { mapCharacter } from '../../mappers'; // Import mapper

interface CharacterListProps {
  // Removed externalCharacters prop as we fetch the single owner character
  onSelectCharacter: (character: domain.Character | null) => void; // Pass the fetched character or null
  selectedCharacterId?: string; // Keep for styling the selected item
}

export const CharacterList: React.FC<CharacterListProps> = ({ 
  onSelectCharacter,
  selectedCharacterId
}) => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient(); // Get the client
  
  const [character, setCharacter] = useState<domain.Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacter = useCallback(async () => {
    // Prioritize injected wallet address
    const ownerAddress = injectedWallet?.address;
    
    if (!ownerAddress || !client) {
      // setError('Owner wallet not connected or client not available.');
      console.warn('CharacterList: Owner address or client not available yet.');
      setIsLoading(false); // Stop loading if we can't fetch
      return;
    }

    setIsLoading(true);
    setError(null);
    setCharacter(null); // Clear previous character
    console.log("CharacterList: Fetching character for owner:", ownerAddress);

    try {
      const charId = await client.getPlayerCharacterID(ownerAddress);
      console.log("CharacterList: Fetched Character ID:", charId);

      if (charId && charId !== '0x0000000000000000000000000000000000000000') { // Check for valid ID
        const contractCharacter = await client.getBattleNad(charId);
        console.log("CharacterList: Fetched Contract Character:", contractCharacter);
        if (contractCharacter) {
          const domainCharacter = mapCharacter(contractCharacter); // Map to domain type
          console.log("CharacterList: Mapped Domain Character:", domainCharacter);
          setCharacter(domainCharacter);
          onSelectCharacter(domainCharacter); // Automatically select the fetched character
        } else {
           setError('Character data not found for ID.');
           onSelectCharacter(null);
        }
      } else {
        setError('No active character found for this wallet.');
        onSelectCharacter(null); // No character to select
      }
    } catch (err) {
      console.error("CharacterList: Failed to fetch character:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch character');
      onSelectCharacter(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, injectedWallet?.address, onSelectCharacter]);

  // Fetch character when component mounts or dependencies change
  useEffect(() => {
    fetchCharacter();
  }, [fetchCharacter]);

  if (isLoading) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800">
        <Flex justify="center" align="center" py={4}>
          <Spinner mr={2} />
          <Text>Loading character...</Text>
        </Flex>
      </Box>
    );
  }

  // Display error or "No character" message
  if (error || !character) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800">
        <Text color={error ? "red.300" : "gray.400"}>
           {error || 'No character found. Create one to get started.'}
        </Text>
        <Button 
          mt={4} 
          colorScheme="blue" 
          size="sm" 
          as="a" 
          href="/create"
        >
          Create Character
        </Button>
      </Box>
    );
  }

  // Display the single character
  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="gray.800">
      <Heading as="h3" size="md" mb={3}>Your Character</Heading>
      <VStack spacing={2} align="stretch">
        <CharacterListItem 
          key={character.id}
          character={character} // Pass domain.Character
          isSelected={selectedCharacterId === character.id}
          // The onSelect prop here might be redundant if clicking does nothing new
          // Or it could re-trigger the onSelectCharacter callback if needed
          onSelect={() => onSelectCharacter(character)} 
        />
      </VStack>
      {/* Optional: Keep create button if needed */}
      {/* <Button 
        mt={4} 
        colorScheme="green" 
        size="sm" 
        w="full"
        as="a" 
        href="/create"
      >
        Create New Character
      </Button> */}
    </Box>
  );
};

interface CharacterListItemProps {
  character: domain.Character; // Expect domain.Character
  isSelected: boolean;
  onSelect: () => void;
}

const CharacterListItem: React.FC<CharacterListItemProps> = ({ 
  character, 
  isSelected,
  onSelect
}) => {
  // Destructure from domain.Character
  const { id, name, level, health, stats, weapon, armor, class: characterClass } = character;
  // Determine if monster based on class enum value
  const isMonster = characterClass < domain.CharacterClass.Warrior; 
  
  return (
    <Flex 
      p={2} 
      borderWidth="1px" 
      borderRadius="md" 
      justify="space-between" 
      align="center"
      bg={isSelected ? "blue.700" : "gray.700"}
      borderColor={isSelected ? "blue.500" : "gray.600"}
      _hover={{ bg: isSelected ? "blue.700" : "gray.600" }}
      onClick={onSelect} // Make the whole item clickable
      cursor="pointer"
    >
      <Flex direction="column">
        <Text fontWeight="bold">
          {name || "Unnamed Character"}
        </Text>
        <Flex mt={1} align="center">
          <Badge colorScheme={isMonster ? "red" : "green"} mr={2}>
            {isMonster ? domain.CharacterClass[characterClass] : `Level ${level}`}
          </Badge>
          <Badge colorScheme="purple">
            HP: {health} {/* Use direct health property */}
          </Badge>
        </Flex>
      </Flex>
      
      {/* Button might be optional now, could just show status */}
      <Text fontSize="sm" color={isSelected ? "white" : "gray.400"}>
         {isSelected ? "Selected" : ""}
      </Text>
      {/* <Button 
        size="sm" 
        colorScheme={isSelected ? "blue" : "gray"}
        onClick={onSelect}
      >
        {isSelected ? "Selected" : "Select"}
      </Button> */}
    </Flex>
  );
}; 