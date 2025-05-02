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