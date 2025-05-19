import React, { useMemo } from 'react';
import { 
  Box, 
  Text, 
  Progress, 
  Divider, 
  Flex, 
  Badge,
  VStack
} from '@chakra-ui/react';
import { domain } from '@/types';
import { EquipmentPanel } from '@/components/game/equipment/EquipmentPanel';

// Constants from the smart contract
const EXP_BASE = 100; // Base experience points required per level
const EXP_SCALE = 10; // Scaling factor for experience requirements

// Helper to format Gold value (18 decimals)
const formatGold = (value: number | bigint | undefined): string => {
  if (value === undefined) return '0';
  
  // Convert to string and handle 18 decimals
  const valueString = value.toString();
  
  // If the value is small, pad with zeros
  if (valueString.length <= 18) {
    const paddedValue = '0.' + valueString.padStart(18, '0');
    // Trim to 4 decimal places
    const trimmed = paddedValue.substring(0, paddedValue.indexOf('.') + 5);
    return trimmed === '0.' ? '0' : trimmed;
  }
  
  // Insert decimal point 18 places from the right
  const decimalPosition = valueString.length - 18;
  const integerPart = valueString.slice(0, decimalPosition);
  const decimalPart = valueString.slice(decimalPosition, decimalPosition + 4);
  
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

interface CharacterInfoProps {
  character: domain.Character;
  combatants: domain.CharacterLite[];
}

const CharacterInfo: React.FC<CharacterInfoProps> = ({ character, combatants }) => {
  // No need for separate currentStats state if just reading from props now
  // const [currentStats, setCurrentStats] = useState<typeof character.stats>(character.stats);

  // Removed useEffect hooks related to currentStats and event listeners
  if (!character) return null;

  // Destructure health AND maxHealth directly from the character prop
  const { weapon, armor, name, inventory, level, health, maxHealth, stats } = character;
  
  // Add this line to convert level to a regular number
  const displayLevel = Number(level);
  
  // Use maxHealth directly from props. Ensure it's treated as a number.
  const currentMaxHealth = Number(maxHealth || 100); // Default to 100 if maxHealth is missing/0
  const currentHealth = Math.max(0, Number(health)); // Ensure health is not negative
  
  // Calculate percentage using health and maxHealth from props
  const healthPercentage = currentMaxHealth > 0 ? (currentHealth / currentMaxHealth) * 100 : 0;
  
  // Calculate experience progress (using stats from props)
  const experienceProgress = useMemo(() => {
    const currentExperience = Number(stats?.experience || 0);
    if (displayLevel <= 0) return 0; // Avoid division by zero or weird results for level 0
    const experienceNeededForNextLevel = (displayLevel * EXP_BASE) + (displayLevel * displayLevel * EXP_SCALE);
    if (experienceNeededForNextLevel <= 0) return 0; // Avoid division by zero
    return Math.min(100, (currentExperience / experienceNeededForNextLevel) * 100); // Cap at 100%
  }, [displayLevel, stats?.experience]);

  // Determine combat indicator text
  const livingCombatants = combatants.filter(combatant => !combatant.isDead);
  const isInCombat = livingCombatants && livingCombatants.length > 0;
  const combatIndicatorText = useMemo(() => {
    if (!isInCombat) return null;
    if (livingCombatants.length === 1) {
      return `Fighting: ${livingCombatants[0]?.name || 'Unknown'}`;
    }
    return `Fighting: Multiple Enemies (${livingCombatants.length})`;
  }, [livingCombatants, isInCombat]);

  return (
    <Box borderRadius="md" h="100%" overflowY="auto">
      <VStack spacing={3} align="stretch">
        
        <div className='grid gap-1.5 p-2 bg-dark-brown rounded-lg border border-black/40'>
          {/* Character Name and Level */}
          <Flex justify="space-between" align="center">
            <h1 className='gold-text-light text-2xl font-bold tracking-tight'>{name || 'Unnamed Character'}</h1>
            {displayLevel && (
              <Box 
              backgroundImage="/assets/bg/level.png"
              backgroundSize="contain"
              backgroundRepeat="no-repeat"
              backgroundPosition="center"
              px={3}
              py={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              minWidth="120px"
              height="40px"
              className='text-yellow-400/90 font-bold text-center font-serif text-xl'
              >
                Level {displayLevel}
              </Box>
            )}
          </Flex>
        
          {/* Combat Indicator - NEW */}
          {/* TODO: Style this badge */}
          {isInCombat && (
            <Badge colorScheme="red" variant="solid" p={1} textAlign="center" w="100%">
              ⚔️ {combatIndicatorText} ⚔️
            </Badge>
          )}
        
        
          {/* Health Bar */}
          <Box>
            <div className="relative w-full bg-black/70 rounded border border-amber-900/35 h-9 overflow-hidden">
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
              <div className="absolute inset-0 flex justify-between items-center px-2">
                <span className="text-amber-300 font-black font-serif text-xl">HP</span>
                <span className="text-amber-300 font-black font-serif text-xl">{currentHealth}/{currentMaxHealth}</span>
              </div>
            </div>
          </Box>
        </div>
        
        {/* Character Stats - Use stats directly from props */}
        <Box>
          <div className="bg-dark-brown rounded-lg border border-black/40 p-3">
            <h2 className="gold-text text-2xl font-serif mb-2 font-semibold">Stats</h2>
            <div className="grid grid-cols-2 gap-2 text-xl">
              <div className="flex justify-between gold-text-light">
                <span>STR</span>
                <span>{Number(stats?.strength)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>DEX</span>
                <span>{Number(stats?.dexterity)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>VIT</span>
                <span>{Number(stats?.vitality)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>STD</span>
                <span>{Number(stats?.sturdiness)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>QCK</span>
                <span>{Number(stats?.quickness)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>LCK</span>
                <span>{Number(stats?.luck)}</span>
              </div>
            </div>
          </div>
        </Box>
        
        <Divider />
        
        {/* Equipment */}
        <EquipmentPanel characterId={character?.id} />
        
        <Divider />
        
        {/* Character Progress */}
        <Box>
          <VStack align="stretch" spacing={2}>
            {/* Experience Bar */}
            <Box>
              <Flex justify="space-between" mb={1}>
              <Text className="gold-text text-2xl font-serif mb-1 font-semibold">Experience</Text>
              <span className="text-amber-300 font-black font-serif">
              {Number(stats?.experience)} / {(displayLevel * EXP_BASE) + (displayLevel * displayLevel * EXP_SCALE)}
                </span>
              </Flex>
              <Progress 
                value={experienceProgress} 
                colorScheme="blue" 
                size="md"
                borderRadius="sm" 
                mb={2}
              />
            </Box>
            <Divider />

            {/* Gold Display */}
            {inventory?.balance !== undefined && (
              <Flex justify="space-between">
                <Text fontSize="sm">Gold <Badge bg="gold" color="black" fontSize="xs" ml={1}>SHMONAD</Badge></Text>
                <Text fontSize="sm" fontWeight="medium">{formatGold(inventory.balance)}</Text>
              </Flex>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default CharacterInfo; 