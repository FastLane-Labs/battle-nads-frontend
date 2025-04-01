import React, { useState, useEffect } from 'react';
import { Box, VStack, Text, Flex, Badge, Button, Heading, Spinner } from '@chakra-ui/react';
import { useBattleNads } from '../hooks/useBattleNads';
import { usePrivy } from '@privy-io/react-auth';

interface CharacterListProps {
  characters?: any[]; // Now optional
  onSelectCharacter: (characterId: string) => void;
  selectedCharacterId?: string;
}

export const CharacterList: React.FC<CharacterListProps> = ({ 
  characters: externalCharacters, 
  onSelectCharacter,
  selectedCharacterId
}) => {
  const { user } = usePrivy();
  const { getPlayerCharacters, loading } = useBattleNads();
  const [characters, setCharacters] = useState<any[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);

  // If characters are provided externally, use those
  // Otherwise fetch the user's characters
  useEffect(() => {
    if (externalCharacters) {
      setCharacters(externalCharacters);
    } else {
      const fetchCharacters = async () => {
        setLoadingCharacters(true);
        try {
          if (user?.wallet?.address) {
            const userCharacters = await getPlayerCharacters(user.wallet.address);
            setCharacters(userCharacters || []);
          }
        } catch (error) {
          console.error("Failed to fetch characters:", error);
        } finally {
          setLoadingCharacters(false);
        }
      };

      fetchCharacters();
    }
  }, [externalCharacters, user, getPlayerCharacters]);

  if (loadingCharacters) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800">
        <Flex justify="center" align="center" py={4}>
          <Spinner mr={2} thickness="4px" speed="0.8s" color="blue.500" />
          <Text>Loading characters...</Text>
        </Flex>
      </Box>
    );
  }

  if (!characters || characters.length === 0) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800">
        <Text>No characters found. Create a new character to get started.</Text>
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

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="gray.800">
      <Heading as="h3" size="md" mb={3}>Your Characters</Heading>
      <VStack spacing={2} align="stretch">
        {characters.map((character) => (
          <CharacterListItem 
            key={character.id}
            character={character}
            isSelected={selectedCharacterId === character.id}
            onSelect={() => onSelectCharacter(character.id)}
          />
        ))}
      </VStack>
      <Button 
        mt={4} 
        colorScheme="green" 
        size="sm" 
        w="full"
        as="a" 
        href="/create"
      >
        Create New Character
      </Button>
    </Box>
  );
};

interface CharacterListItemProps {
  character: any;
  isSelected: boolean;
  onSelect: () => void;
}

const CharacterListItem: React.FC<CharacterListItemProps> = ({ 
  character, 
  isSelected,
  onSelect
}) => {
  const { id, stats, weapon, armor } = character;
  const isMonster = stats?.isMonster;
  const name = character.name || "Unknown Character";
  
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
    >
      <Flex direction="column">
        <Text fontWeight="bold">
          {name}
        </Text>
        <Flex mt={1}>
          <Badge colorScheme={isMonster ? "red" : "green"} mr={2}>
            {isMonster ? "Monster" : "Level " + (stats?.level || 1)}
          </Badge>
          <Badge colorScheme="purple">
            HP: {stats?.health || 0}
          </Badge>
        </Flex>
      </Flex>
      
      <Button 
        size="sm" 
        colorScheme={isSelected ? "blue" : "gray"}
        onClick={onSelect}
      >
        {isSelected ? "Selected" : "Select"}
      </Button>
    </Flex>
  );
}; 