import React, { useState, useEffect } from 'react';
import { 
  Box, Text, VStack, HStack, Divider, Select, Button, Tooltip, Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverHeader, PopoverBody, Icon, IconButton 
} from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useEquipment } from '@/hooks/game/useEquipment'; // Assuming we pass the hook result
import type { Weapon, Armor } from '@/types/domain';

type EquipmentSlot = 'weapon' | 'armor';

interface EquipmentCardProps {
  slot: EquipmentSlot;
  equipmentHookResult: ReturnType<typeof useEquipment>; // Pass the whole hook result
  characterId: string | null; // Still needed for equip functions potentially
}

// Helper component for displaying a single stat with a tooltip/popover
const StatDisplay: React.FC<{ 
  label: string; 
  value: string | number | undefined | null; 
  tooltip: string;
  statKey: keyof Weapon | keyof Armor; // Added key for potential mapping
}> = ({ label, value, tooltip, statKey }) => {
  if (value === undefined || value === null) return null;
  
  // Use Popover for better touch interaction
  return (
    <HStack key={statKey} justify="space-between" w="full">
      <HStack spacing={1}>
        <Text fontSize="xs">{label}:</Text>
        <Popover trigger="hover">
          <PopoverTrigger>
            <Icon as={InfoOutlineIcon} boxSize={3} color="gray.500" cursor="help" />
          </PopoverTrigger>
          <PopoverContent fontSize="xs">
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader fontWeight="semibold">{label}</PopoverHeader>
            <PopoverBody>{tooltip}</PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>
      <Text fontSize="xs" fontWeight="medium">{value ?? '—'}</Text> {/* Use em dash for null/undefined */}
    </HStack>
  );
};


export const EquipmentCard: React.FC<EquipmentCardProps> = ({ slot, equipmentHookResult, characterId }) => {
  const {
    currentWeapon, currentArmor,
    equipableWeapons,
    equipableArmors,
    equipWeapon, equipArmor,
    isEquippingWeapon, isEquippingArmor,
    weaponError, armorError,
    isInCombat
  } = equipmentHookResult;

  const [pendingId, setPendingId] = useState<number | null>(null);

  const isWeapon = slot === 'weapon';
  const currentItem = isWeapon ? currentWeapon : currentArmor;
  const options = isWeapon ? equipableWeapons : equipableArmors;
  const equipAction = isWeapon ? equipWeapon : equipArmor;
  const isEquipping = isWeapon ? isEquippingWeapon : isEquippingArmor;
  const error = isWeapon ? weaponError : armorError;
  
  // Log error when it changes
  useEffect(() => {
    if (error) {
      console.log(`[EquipmentCard-${slot}] Error present:`, error);
    }
  }, [error, slot]);
  
  const handleEquip = (selectedItemId: number) => {
    console.log(`[EquipmentCard-${slot}] handleEquip called. Pending ID: ${pendingId}, In Combat: ${isInCombat}`);
    if (selectedItemId !== null && !isInCombat) {
      equipAction(selectedItemId);
      setPendingId(null); // Reset selection after initiating equip
    }
  };

  // TODO: Define declarative stat map based on slot type
  const renderStats = () => {
    if (!currentItem) return null;
    if (isWeapon) {
      const weapon = currentItem as Weapon;
      return (
        <>
          <StatDisplay statKey="baseDamage" label="Base Dmg" value={weapon.baseDamage} tooltip="Base Damage" />
          <StatDisplay statKey="bonusDamage" label="Bonus Dmg" value={weapon.bonusDamage} tooltip="Bonus Damage" />
          <StatDisplay statKey="accuracy" label="Accuracy" value={weapon.accuracy} tooltip="Attack Accuracy" />
          <StatDisplay statKey="speed" label="Speed" value={weapon.speed} tooltip="Attack Speed" />
        </>
      );
    } else {
      const armor = currentItem as Armor;
      return (
        <>
          <StatDisplay statKey="armorFactor" label="Factor" value={armor.armorFactor} tooltip="Base Armor Factor" />
          <StatDisplay statKey="armorQuality" label="Quality" value={armor.armorQuality} tooltip="Armor Quality Rating" />
          <StatDisplay statKey="flexibility" label="Flexibility" value={armor.flexibility} tooltip="Armor Flexibility" />
          <StatDisplay statKey="weight" label="Weight" value={armor.weight} tooltip="Armor Weight" />
        </>
      );
    }
  };

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="sm" fontWeight="semibold" textTransform="capitalize">{slot}</Text>
      
      {/* Stat Card */}
      <Box p={2} borderWidth={1} borderRadius="md" bg="panelBg"> {/* Use theme token */}
        {currentItem ? (
          <>
            <Text fontSize="sm" fontWeight="medium" mb={1}>{currentItem.name}</Text>
            <Divider my={1} />
            {renderStats()}
          </>
        ) : (
          <Text fontSize="sm" fontStyle="italic">None equipped</Text>
        )}
      </Box>

      {/* Equip Controls */}
      <HStack>
        <Select
          size="xs"
          placeholder={currentItem ? 'Change...' : 'Equip...'}
          value={pendingId ?? ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const newId = Number(e.target.value);
            console.log(`[EquipmentCard-${slot}] Selection changed. New pending ID: ${newId}`);
            setPendingId(newId);
          }}
          disabled={isInCombat || isEquipping || !options.length}
          flexGrow={1} // Allow select to take available space
        >
          {options.map((item: { id: number; name: string }) => (
            <option key={item.id} value={item.id}>
              {item.name} {/* TODO: Consider adding basic stats here */}
            </option>
          ))}
        </Select>
        <Tooltip 
          label={isInCombat ? "Cannot change equipment while in combat" : (pendingId === null ? "Select an item to equip" : `Equip ${options.find((o: { id: number; name: string }) => o.id === pendingId)?.name}`)}
          isDisabled={!isInCombat && pendingId !== null}
        >
          {/* Wrap button for tooltip when disabled */}
          <Box>
            <Button 
              onClick={() => { if (pendingId !== null) { handleEquip(pendingId); } }} 
              disabled={!pendingId || isInCombat || isEquipping}
              size="xs"
              isLoading={isEquipping}
            >
              Equip
            </Button>
          </Box>
        </Tooltip>
      </HStack>

      {/* Error Display */}
      {error && (
        <Text color="red.500" fontSize="xs" mt={1}>
          Error: {error.message}
          {/* TODO: Add Retry button */}
        </Text>
      )}
    </VStack>
  );
}; 