# Equipment Inventory Feature Implementation Guide

## Overview

This document outlines the implementation plan for the Equipment Inventory feature in the Battle-Nads frontend. The feature allows players to view and change their equipped weapons and armor through an intuitive dropdown interface.

## Requirements

1. **One-click dropdown interface** for equipping items
2. **Display current equipment** clearly
3. **List available unequipped items** in dropdowns
4. **Disable equipment changes** during combat
5. **Show stat differences** in tooltips (nice-to-have)

## Implementation Components

### 1. Equipment Hook Enhancement

**File:** `src/hooks/game/useEquipment.ts`

The existing hook already provides core functionality but needs to be integrated with other components:

- ✅ Existing: Access to current equipment (`currentWeapon`, `currentArmor`)
- ✅ Existing: List of available items (`weaponOptions`, `armorOptions`)
- ✅ Existing: Mutations for equipping items
- ✅ Existing: Loading and error states

**Needed Enhancements:**
- Add combat state check to prevent equipment changes during combat
- Add tooltip data generation for stat comparisons
- Add utility function for equipment selection validation

```typescript
// Add to useEquipment.ts

// Combat state check - use character.isInCombat directly for reliability
const isInCombat = useMemo(() => {
  return Boolean(gameState?.character?.isInCombat);
}, [gameState]);

// Get stat differences for tooltips (nice-to-have)
const getEquipmentStatDiff = (itemType: 'weapon' | 'armor', itemId: number) => {
  // Implementation to compare stats between current and selected equipment
  if (!gameState?.character) return null;
  
  const currentStats = itemType === 'weapon' 
    ? currentWeapon 
    : currentArmor;
    
  // Get stats for the selected item
  const selectedItem = itemType === 'weapon'
    ? weaponOptions.find(weapon => weapon.id === itemId)
    : armorOptions.find(armor => armor.id === itemId);
  
  if (!selectedItem || !currentStats) return null;
  
  // Implement stat difference logic here
  // This is a placeholder until we have access to item stats
  return [
    { 
      statName: 'Power', 
      currentValue: 0, 
      newValue: 0, 
      difference: 0 
    }
  ];
};

return {
  // ... existing return values
  isInCombat,
  getEquipmentStatDiff,
};
```

### 2. Equipment UI Component

**File:** `src/components/game/equipment/EquipmentPanel.tsx` (create new)

Create a dedicated component for equipment management:

```typescript
import React from 'react';
import { Box, Text, Flex, Select, Tooltip } from '@chakra-ui/react';
import { useEquipment } from '@/hooks/game/useEquipment';

interface EquipmentPanelProps {
  characterId: string | null;
}

export const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ characterId }) => {
  const { 
    currentWeapon,
    currentArmor,
    weaponOptions,
    armorOptions,
    equipWeapon,
    equipArmor,
    isEquippingWeapon,
    isEquippingArmor,
    weaponError,
    armorError,
    isInCombat,
    getEquipmentStatDiff
  } = useEquipment();

  // Equipment change handlers
  const handleWeaponChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!characterId || isInCombat) return;
    equipWeapon(Number(e.target.value));
  };

  const handleArmorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!characterId || isInCombat) return;
    equipArmor(Number(e.target.value));
  };

  return (
    <Box>
      <Text fontWeight="bold" mb={2}>Equipment</Text>
      
      {/* Weapon Selection */}
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="sm">Weapon:</Text>
        <Flex align="center">
          <Text fontSize="sm" fontWeight="medium" mr={2}>
            {currentWeapon?.name || 'None'}
          </Text>
          <Tooltip 
            label={isInCombat ? "Cannot change equipment while in combat" : ""}
            isDisabled={!isInCombat}
          >
            <Select
              size="xs"
              width="auto"
              onChange={handleWeaponChange}
              placeholder="Change"
              disabled={isInCombat || isEquippingWeapon || !weaponOptions.length}
              data-testid="weapon-select"
            >
              {weaponOptions.map((weapon) => (
                <option key={weapon.id} value={weapon.id}>
                  {weapon.name}
                </option>
              ))}
            </Select>
          </Tooltip>
        </Flex>
      </Flex>
      
      {/* Armor Selection */}
      <Flex justify="space-between" align="center">
        <Text fontSize="sm">Armor:</Text>
        <Flex align="center">
          <Text fontSize="sm" fontWeight="medium" mr={2}>
            {currentArmor?.name || 'None'}
          </Text>
          <Tooltip 
            label={isInCombat ? "Cannot change equipment while in combat" : ""}
            isDisabled={!isInCombat}
          >
            <Select
              size="xs"
              width="auto"
              onChange={handleArmorChange}
              placeholder="Change"
              disabled={isInCombat || isEquippingArmor || !armorOptions.length}
              data-testid="armor-select"
            >
              {armorOptions.map((armor) => (
                <option key={armor.id} value={armor.id}>
                  {armor.name}
                </option>
              ))}
            </Select>
          </Tooltip>
        </Flex>
      </Flex>
      
      {/* Error Messages */}
      {(weaponError || armorError) && (
        <Text color="red.500" fontSize="xs" mt={1}>
          {weaponError || armorError}
        </Text>
      )}
    </Box>
  );
};
```

### 3. Integration with Character Components

#### For CharacterCard.tsx

**File:** `src/components/characters/CharacterCard.tsx`

Integrate the equipment panel:

```typescript
// Import at the top
import { EquipmentPanel } from '@/components/game/equipment/EquipmentPanel';

// Replace the Equipment section in CharacterCard.tsx
<Divider />

{/* Equipment - Replace with dedicated component */}
<EquipmentPanel characterId={character?.id} />

<Divider />
```

#### For CharacterInfo.tsx

**File:** `src/components/game/board/CharacterInfo.tsx`

Update both the props interface and component to use isInCombat from parent:

```typescript
// Update props interface to accept isInCombat directly
interface CharacterInfoProps {
  character: domain.Character;
  isInCombat: boolean; // Add this prop instead of combatants
}

// Update component to use isInCombat from props
const CharacterInfo: React.FC<CharacterInfoProps> = ({ character, isInCombat }) => {
  // Remove any existing code that calculates isInCombat from combatants array
  
  // Replace the Equipment section
  <Divider />
  
  {/* Equipment */}
  <EquipmentPanel characterId={character?.id} />
  
  <Divider />
  
  // Rest of component...
};
```

#### For GameView.tsx

**File:** `src/components/game/layout/GameView.tsx`

Update to pass isInCombat directly:

```typescript
{/* Character Info */}
<GridItem area="character">
  <CharacterInfo 
    character={character} 
    isInCombat={isInCombat} // Pass boolean directly instead of combatants array
  />
</GridItem>
```

### 4. Optional Tooltip Enhancement

**File:** `src/components/game/equipment/EquipmentTooltip.tsx` (create new)

Create a component for displaying stat differences in tooltips (optional nice-to-have):

```typescript
import React from 'react';
import { Box, Text, Flex, Badge } from '@chakra-ui/react';

interface StatDiff {
  statName: string;
  currentValue: number;
  newValue: number;
  difference: number;
}

interface EquipmentTooltipProps {
  itemName: string;
  statDiffs: StatDiff[];
}

export const EquipmentTooltip: React.FC<EquipmentTooltipProps> = ({ 
  itemName, 
  statDiffs 
}) => {
  return (
    <Box p={2} maxW="200px">
      <Text fontWeight="bold" mb={1}>{itemName}</Text>
      {statDiffs.map((stat) => (
        <Flex key={stat.statName} justify="space-between" fontSize="xs" mb={1}>
          <Text>{stat.statName}</Text>
          <Flex align="center">
            <Text>{stat.currentValue}</Text>
            <Text mx={1}>→</Text>
            <Text>{stat.newValue}</Text>
            {stat.difference !== 0 && (
              <Badge 
                ml={1} 
                colorScheme={stat.difference > 0 ? "green" : "red"}
                fontSize="2xs"
              >
                {stat.difference > 0 ? `+${stat.difference}` : stat.difference}
              </Badge>
            )}
          </Flex>
        </Flex>
      ))}
    </Box>
  );
};
```

## Integration Tests

After implementation, the following tests should be performed:

1. **Equipment Display Test**
   - Verify current equipment is correctly displayed
   - Ensure available equipment is listed in dropdowns

2. **Equipment Change Test**
   - Confirm equipment changes are sent to the blockchain
   - Verify UI updates after successful equipment change
   - Test error handling for failed equipment changes

3. **Combat Restriction Test**
   - Ensure equipment changes are disabled during combat
   - Verify that tooltip displays the correct message
   - Test that equipment becomes available again after combat ends

4. **Game State Integration Test**
   - Check that equipment changes update character stats
   - Verify that health values recalculate properly

## Implementation Sequence

1. Enhance `useEquipment.ts` hook with combat state check (use character.isInCombat property)
2. Create the `EquipmentPanel.tsx` component that utilizes this hook
3. Update `CharacterCard.tsx` to use the new component 
4. Update `CharacterInfo.tsx` to receive isInCombat directly and use the new component
5. Update `GameView.tsx` to pass isInCombat to CharacterInfo instead of combatants array
6. Add stat comparison tooltip (optional)
7. Test all features
8. Document any edge cases or unexpected behavior

## Completion Criteria

- Players can view their current equipment
- Players can see a list of available equipment
- Players can change equipment with one click
- Equipment changes are disabled during combat with explanatory tooltip
- Equipment changes are reflected in character stats and appearance