import React from 'react';
import { Box, VStack, Text, Flex, Badge, Button, Heading } from '@chakra-ui/react';

interface CharacterListProps {
  characters: any[]; // Ideally would be properly typed
  onSelectCharacter: (character: any) => void;
  selectedCharacterId?: string;
}

export const CharacterList: React.FC<CharacterListProps> = ({ 
  characters, 
  onSelectCharacter,
  selectedCharacterId
}) => {
  if (!characters || characters.length === 0) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
        <Text>No characters found in this area.</Text>
      </Box>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
      <Heading as="h3" size="md" mb={3}>Characters in Area</Heading>
      <VStack spacing={2} align="stretch">
        {characters.map((character) => (
          <CharacterListItem 
            key={character.id}
            character={character}
            isSelected={selectedCharacterId === character.id}
            onSelect={() => onSelectCharacter(character)}
          />
        ))}
      </VStack>
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
  const { id, stats, name } = character;
  const isMonster = stats.isMonster;
  
  return (
    <Flex 
      p={2} 
      borderWidth="1px" 
      borderRadius="md" 
      justify="space-between" 
      align="center"
      bg={isSelected ? "blue.50" : "white"}
      borderColor={isSelected ? "blue.300" : "gray.200"}
      _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
    >
      <Flex direction="column">
        <Text fontWeight="bold">
          {name || (isMonster ? "Monster" : "Unnamed Character")}
        </Text>
        <Flex mt={1}>
          <Badge colorScheme={isMonster ? "red" : "green"} mr={2}>
            {isMonster ? "Monster" : "Player"}
          </Badge>
          <Badge colorScheme="purple">
            Lvl {stats.level}
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