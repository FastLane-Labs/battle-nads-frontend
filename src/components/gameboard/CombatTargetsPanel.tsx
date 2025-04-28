import React from 'react';
import { 
  Box, 
  Heading, 
  VStack, 
  Text, 
  Progress, 
  Button, 
  Alert, 
  AlertIcon 
} from '@chakra-ui/react';
import { domain } from '../../types';

// Type alias for clarity
type BattleNadLite = domain.CharacterLite;

interface CombatTargetsPanelProps {
  combatants: BattleNadLite[];
  onAttack: (targetIndex: number) => void;
  isAttacking: boolean;
  isMoving: boolean;
}

export const CombatTargetsPanel: React.FC<CombatTargetsPanelProps> = ({
  combatants,
  onAttack,
  isAttacking,
  isMoving,
}) => {
  return (
    <Box bg="gray.800" p={3} borderRadius="md">
      <Heading size="sm" mb={3} color="whiteAlpha.900">Combat Targets</Heading>
      {combatants.length > 0 ? (
        <VStack align="stretch" spacing={2} maxHeight="300px" overflowY="auto">
          {combatants.map((enemy: BattleNadLite, index: number) => {
            const name = enemy.name || 'Unknown';
            const level = enemy.level || 1;
            const health = enemy.health || 0;
            const maxHealth = enemy.maxHealth || 1; // Avoid division by zero
            const healthPercentage = maxHealth > 0 ? (health / maxHealth) * 100 : 0;

            return (
              <Box key={enemy.id || index} p={2} bg="gray.700" borderRadius="md">
                <Text fontSize="sm" fontWeight="bold">{name}</Text>
                <Text fontSize="xs">Level: {level}</Text>
                <Text fontSize="xs">HP: {health} / {maxHealth}</Text>
                <Progress value={healthPercentage} size="xs" colorScheme="red" mt={1} />
                <Button 
                  size="xs" 
                  colorScheme="red" 
                  mt={2} 
                  onClick={() => onAttack(index)}
                  isDisabled={isAttacking || isMoving || health <= 0} // Disable if already dead
                >
                  Attack
                </Button>
              </Box>
            );
          })}
        </VStack>
      ) : (
        <Alert status="info" variant="subtle" size="sm">
          <AlertIcon boxSize="14px" />
          No combatants nearby.
        </Alert>
      )}
    </Box>
  );
};

export default CombatTargetsPanel; 