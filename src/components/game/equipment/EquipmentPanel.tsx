import React, { useState } from 'react';
import { Box, Text, Tooltip, HStack, Button, VStack, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Divider, Spinner, SimpleGrid } from '@chakra-ui/react';
import { useEquipment, useEquipmentDetails } from '@/hooks/game/useEquipment';
import { EquipmentCard } from './EquipmentCard';
import Image from 'next/image';
import type { Weapon, Armor } from '@/types/domain';
import { useTransactionBalance } from '@/hooks/game/useTransactionBalance';
// Remove direct imports
// import WeaponIcon from 'public/assets/buttons/weapon.png';
// import ArmorIcon from 'public/assets/buttons/armor.png';

interface EquipmentPanelProps {
  characterId: string | null;
}

// Component to display an equipment option as a selectable card
const EquipmentOptionCard: React.FC<{
  slot: 'weapon' | 'armor';
  equipmentId: number;
  equipmentName: string;
  isCurrentlyEquipped: boolean;
  onEquip: (id: number) => void;
  isEquipping: boolean;
  isTransactionDisabled: boolean;
  insufficientBalanceMessage: string | null;
}> = ({ slot, equipmentId, equipmentName, isCurrentlyEquipped, onEquip, isEquipping, isTransactionDisabled, insufficientBalanceMessage }) => {
  const { data: equipment, isLoading, error } = useEquipmentDetails(slot, equipmentId);

  if (isLoading) {
    return (
      <Box className="p-4 border border-amber-400/30 rounded-md bg-dark-brown/30 cursor-not-allowed">
        <HStack justify="center" mb={2}>
          <Spinner size="sm" />
          <Text className="gold-text-light" fontSize="sm">Loading...</Text>
        </HStack>
        <Text className="text-gray-400" fontSize="sm" textAlign="center">{equipmentName}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="p-4 border border-red-400/30 rounded-md bg-red-900/20 cursor-not-allowed">
        <Text className="text-red-400" fontSize="sm" textAlign="center">
          Failed to load {equipmentName}
        </Text>
      </Box>
    );
  }

  if (!equipment) return null;

  // Equipment card is disabled if currently equipped, equipping in progress, or insufficient balance (but only for non-equipped items)
  const isDisabled = isCurrentlyEquipped || isEquipping || (isTransactionDisabled && !isCurrentlyEquipped);

  return (
    <Box 
      as="button"
      onClick={() => !isDisabled && onEquip(equipmentId)}
      disabled={isDisabled}
      className={`p-4 border rounded-md transition-all duration-200 text-left w-full ${
        isCurrentlyEquipped 
          ? 'border-green-400/60 bg-green-900/20 cursor-default' 
          : isTransactionDisabled && !isCurrentlyEquipped
          ? 'border-red-400/30 bg-red-900/10 cursor-not-allowed'
          : 'border-amber-400/30 bg-dark-brown/30 hover:border-amber-400/60 hover:bg-dark-brown/50 cursor-pointer'
      } ${isEquipping ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <HStack justify="space-between" mb={2}>
        <Text className="gold-text-light font-semibold" fontSize="sm">
          {equipment.name}
        </Text>
        {isCurrentlyEquipped && (
          <Text className="text-green-400 font-medium" fontSize="xs">
            Equipped
          </Text>
        )}
        {isTransactionDisabled && !isCurrentlyEquipped && (
          <Text className="text-red-400 font-medium" fontSize="xs">
            No Balance
          </Text>
        )}
      </HStack>
      
      <Divider className="border-amber-400/20 mb-2" />
      
      {slot === 'weapon' ? (
        <VStack align="start" spacing={1}>
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" className="text-gray-300">Base Damage:</Text>
            <Text fontSize="xs" className="gold-text-light font-medium">
              {(equipment as Weapon).baseDamage}
            </Text>
          </HStack>
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" className="text-gray-300">Bonus Damage:</Text>
            <Text fontSize="xs" className="gold-text-light font-medium">
              {(equipment as Weapon).bonusDamage}
            </Text>
          </HStack>
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" className="text-gray-300">Accuracy:</Text>
            <Text fontSize="xs" className="gold-text-light font-medium">
              {(equipment as Weapon).accuracy}
            </Text>
          </HStack>
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" className="text-gray-300">Speed:</Text>
            <Text fontSize="xs" className="gold-text-light font-medium">
              {(equipment as Weapon).speed}
            </Text>
          </HStack>
        </VStack>
      ) : (
        <VStack align="start" spacing={1}>
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" className="text-gray-300">Armor Factor:</Text>
            <Text fontSize="xs" className="gold-text-light font-medium">
              {(equipment as Armor).armorFactor}
            </Text>
          </HStack>
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" className="text-gray-300">Quality:</Text>
            <Text fontSize="xs" className="gold-text-light font-medium">
              {(equipment as Armor).armorQuality}
            </Text>
          </HStack>
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" className="text-gray-300">Flexibility:</Text>
            <Text fontSize="xs" className="gold-text-light font-medium">
              {(equipment as Armor).flexibility}
            </Text>
          </HStack>
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" className="text-gray-300">Weight:</Text>
            <Text fontSize="xs" className="gold-text-light font-medium">
              {(equipment as Armor).weight}
            </Text>
          </HStack>
        </VStack>
      )}
      
      {/* Show insufficient balance message at bottom if applicable */}
      {isTransactionDisabled && !isCurrentlyEquipped && insufficientBalanceMessage && (
        <>
          <Divider className="border-red-400/20 mt-2 mb-1" />
          <Text fontSize="xs" className="text-red-300" textAlign="center">
            {insufficientBalanceMessage}
          </Text>
        </>
      )}
    </Box>
  );
};

export const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ characterId }) => {
  const equipmentHookResult = useEquipment(characterId);
  const { 
    currentWeapon, currentArmor,
    equipableWeapons, equipableArmors,
    equipWeapon, equipArmor,
    isEquippingWeapon, isEquippingArmor,
    isInCombat
  } = equipmentHookResult;

  // Transaction balance validation
  const { isTransactionDisabled, insufficientBalanceMessage } = useTransactionBalance();

  const [selectedSlot, setSelectedSlot] = useState<'weapon' | 'armor' | null>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Get the current equipment for the selected slot
  const currentEquipment = selectedSlot === 'weapon' ? currentWeapon : currentArmor;
  
  // Get available equipment for the selected slot
  const availableEquipment = selectedSlot === 'weapon' ? equipableWeapons : equipableArmors;
  
  // Get the equip action for the selected slot
  const equipAction = selectedSlot === 'weapon' ? equipWeapon : equipArmor;
  
  // Get the loading state for the selected slot
  const isEquipping = selectedSlot === 'weapon' ? isEquippingWeapon : isEquippingArmor;

  // Handle selecting an equipment slot
  const handleSelectSlot = (slot: 'weapon' | 'armor') => {
    setSelectedSlot(slot);
    onOpen();
  };

  // Handle equipping an item
  const handleEquip = (equipmentId: number) => {
    if (selectedSlot && !isTransactionDisabled) {
      equipAction(equipmentId);
      onClose();
    }
  };

  // Render equipment stats tooltip content
  const renderStatsTooltip = (item: Weapon | Armor | null, slot: 'weapon' | 'armor') => {
    if (!item) return "Nothing equipped";
    
    const content = (
      <VStack align="start" spacing={0} p={1}>
        <Text fontWeight="bold" className='gold-text-light'>{item.name}</Text>
        {slot === 'weapon' ? (
          <>
            <Text fontSize="xs">Damage: {(item as Weapon).baseDamage} + {(item as Weapon).bonusDamage}</Text>
            <Text fontSize="xs">Accuracy: {(item as Weapon).accuracy}</Text>
            <Text fontSize="xs">Speed: {(item as Weapon).speed}</Text>
          </>
        ) : (
          <>
            <Text fontSize="xs">Factor: {(item as Armor).armorFactor}</Text>
            <Text fontSize="xs">Quality: {(item as Armor).armorQuality}</Text>
            <Text fontSize="xs">Flexibility: {(item as Armor).flexibility}</Text>
            <Text fontSize="xs">Weight: {(item as Armor).weight}</Text>
          </>
        )}
      </VStack>
    );
    
    return content;
  };

  return (
    <Box className="flex justify-between items-center gap-2">
      <Text className="gold-text text-2xl font-serif font-semibold">Equipment</Text>

      <HStack spacing={4} className="justify-between">
        <div className='flex gap-4 items-center'>
        {/* Weapon Button */}
        <Tooltip label={renderStatsTooltip(currentWeapon, 'weapon')} placement="top" className='mx-2 !bg-dark-brown border rounded-md border-amber-400/30 !text-white'>
          <Box 
            as="button"
            onClick={() => handleSelectSlot('weapon')}
            position="relative"
            className="rounded-sm hover:opacity-90"
            disabled={isInCombat}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                backgroundImage: 'url("/assets/buttons/weapon.png")',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
              className={`${isInCombat ? 'opacity-50' : 'hover:opacity-90'}`}
              aria-label="Weapon"
            />
          </Box>
        </Tooltip>

        {/* Plus Sign - Visual only */}
        <Text className="text-2xl gold-text-light font-bold">+</Text>

        {/* Armor Button */}
        <Tooltip label={renderStatsTooltip(currentArmor, 'armor')} placement="top" className='mx-2 !bg-dark-brown border rounded-md border-amber-400/30 !text-white'>
          <Box 
            as="button"
            onClick={() => handleSelectSlot('armor')}
            position="relative"
            className="rounded-sm hover:opacity-90"
            disabled={isInCombat}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                backgroundImage: 'url("/assets/buttons/armor.png")',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
              className={`${isInCombat ? 'opacity-50' : 'hover:opacity-90'}`}
              aria-label="Armor"
            />
          </Box>
        </Tooltip>
        </div>
      </HStack>

      {/* Change Equipment Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
        <ModalOverlay />
        <ModalContent className="border border-amber-400/40 !bg-dark-brown max-w-4xl">
          <ModalHeader className="gold-text-light">
            {selectedSlot === 'weapon' ? 'Choose Weapon' : 'Choose Armor'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {availableEquipment.map((item) => (
                <EquipmentOptionCard
                  key={item.id}
                  slot={selectedSlot!}
                  equipmentId={item.id}
                  equipmentName={item.name}
                  isCurrentlyEquipped={item.id === currentEquipment?.id}
                  onEquip={handleEquip}
                  isEquipping={isEquipping}
                  isTransactionDisabled={isTransactionDisabled}
                  insufficientBalanceMessage={insufficientBalanceMessage}
                />
              ))}
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}; 