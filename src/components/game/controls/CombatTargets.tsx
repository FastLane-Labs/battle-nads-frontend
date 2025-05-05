import React, { useState } from 'react';
import { Box, Button, Heading, VStack, Text, Badge } from '@chakra-ui/react';
import { domain } from '../../../types';

interface CombatTargetsProps {
  combatants: domain.CharacterLite[];
  onAttack: (targetIndex: number) => Promise<void>;
  isAttacking: boolean;
}

const CombatTargets: React.FC<CombatTargetsProps> = ({ 
  combatants, 
  onAttack, 
  isAttacking 
}) => {
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  
  const handleAttack = () => {
    if (selectedTarget !== null && !isAttacking) {
      onAttack(selectedTarget);
    }
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Combat</Heading>
      
      {combatants.length === 0 ? (
        <Box p={4} bg="gray.700" borderRadius="md" textAlign="center">
          <Text>No targets in this area</Text>
        </Box>
      ) : (
        <VStack spacing={2} align="stretch">
          {/* Target List */}
          <Box p={2} bg="gray.700" borderRadius="md" mb={2} maxH="200px" overflowY="auto">
            {combatants.map((combatant, index) => (
              <Button
                key={index}
                size="sm"
                variant={selectedTarget === index ? "solid" : "ghost"}
                colorScheme={selectedTarget === index ? "red" : "gray"}
                justifyContent="flex-start"
                width="100%"
                mb={1}
                onClick={() => setSelectedTarget(index)}
                disabled={isAttacking}
              >
                <Text fontSize="sm" mr={2}>
                  {combatant.name || `Enemy #${index + 1}`}
                </Text>
                <Badge colorScheme="green" ml="auto">
                  Lvl {combatant.level || '?'}
                </Badge>
              </Button>
            ))}
          </Box>
          
          {/* Attack Button */}
          <Button
            colorScheme="red"
            size="md"
            onClick={handleAttack}
            isDisabled={selectedTarget === null || isAttacking}
            isLoading={isAttacking}
            loadingText="Attacking..."
          >
            Attack
          </Button>
        </VStack>
      )}
    </Box>
  );
};

export default CombatTargets; 