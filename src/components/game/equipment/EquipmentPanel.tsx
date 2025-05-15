import React, { useState } from 'react';
import { Box, Text, Tooltip, HStack, Button, VStack, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Select } from '@chakra-ui/react';
import { useEquipment } from '@/hooks/game/useEquipment';
import { EquipmentCard } from './EquipmentCard';
import Image from 'next/image';
import type { Weapon, Armor } from '@/types/domain';

interface EquipmentPanelProps {
  characterId: string | null;
}

export const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ characterId }) => {
  const equipmentHookResult = useEquipment(characterId);
  const { 
    currentWeapon, currentArmor,
    equipableWeapons, equipableArmors,
    equipWeapon, equipArmor,
    isEquippingWeapon, isEquippingArmor,
    isInCombat
  } = equipmentHookResult;

  const [selectedSlot, setSelectedSlot] = useState<'weapon' | 'armor' | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  
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
    // If this slot is already selected, deselect it
    if (selectedSlot === slot) {
      setSelectedSlot(null);
    } else {
      setSelectedSlot(slot);
    }
    setPendingId(null); // Reset pending ID when changing slots
  };

  // Handle equipping an item
  const handleEquip = () => {
    if (pendingId !== null && selectedSlot) {
      equipAction(pendingId);
      onClose();
      setPendingId(null);
    }
  };

  // Render equipment stats tooltip content
  const renderStatsTooltip = (item: Weapon | Armor | null, slot: 'weapon' | 'armor') => {
    if (!item) return "Nothing equipped";
    
    if (slot === 'weapon') {
      const weapon = item as Weapon;
      return (
        <VStack align="start" spacing={0} p={1} className=''>
          <Text fontWeight="bold" className='gold-text-light'>{weapon.name}</Text>
          <Text fontSize="xs">Damage: {weapon.baseDamage} + {weapon.bonusDamage}</Text>
          <Text fontSize="xs">Accuracy: {weapon.accuracy}</Text>
          <Text fontSize="xs">Speed: {weapon.speed}</Text>
        </VStack>
      );
    } else {
      const armor = item as Armor;
      return (
        <VStack align="start" spacing={0} p={1}>
          <Text fontWeight="bold" className='gold-text-light'>{armor.name}</Text>
          <Text fontSize="xs">Factor: {armor.armorFactor}</Text>
          <Text fontSize="xs">Quality: {armor.armorQuality}</Text>
          <Text fontSize="xs">Flexibility: {armor.flexibility}</Text>
          <Text fontSize="xs">Weight: {armor.weight}</Text>
        </VStack>
      );
    }
  };

  return (
    <Box className="card-bg p-4">
      <Text className="gold-text text-2xl font-serif mb-4 font-semibold">Equipment</Text>

      <HStack spacing={4} className="justify-between">
        <div className='flex gap-4 items-center'>
        {/* Weapon Button */}
        <Tooltip label={renderStatsTooltip(currentWeapon, 'weapon')} placement="top" className='mx-2 !bg-dark-brown border rounded-md border-amber-400/30 !text-white'>
          <Box 
            as="button"
            onClick={() => handleSelectSlot('weapon')}
            position="relative"
            className={`rounded-sm ${selectedSlot === 'weapon' ? '!ring-2 !ring-amber-400 hover:!ring-2 hover:!ring-amber-400' : ''}`}
            disabled={isInCombat}
            >
            <Image
              src="/assets/buttons/weapon.png"
              alt="Weapon"
              width={64}
              height={64}
              className={`${isInCombat ? 'opacity-50' : 'hover:opacity-90'}`}
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
            className={`rounded-sm ${selectedSlot === 'armor' ? '!ring-2 !ring-amber-400 hover:!ring-2 hover:!ring-amber-400' : ''}`}
            disabled={isInCombat}
            >
            <Image
              src="/assets/buttons/armor.png"
              alt="Armor"
              width={64}
              height={64}
              className={`${isInCombat ? 'opacity-50' : 'hover:opacity-90'}`}
              />
          </Box>
        </Tooltip>
        </div>
        
        {/* Change Button */}
        <Button
          onClick={onOpen}
          disabled={selectedSlot === null || isInCombat}
          size="md"
          className="bg-brown border-black/40 border hover:border-amber-400 font-semibold"
          _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
         <span className='gold-text-light'>
            Change
         </span>
        </Button>
      </HStack>

      {/* Change Equipment Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent className="border border-amber-400/40 !bg-dark-brown">
          <ModalHeader className="gold-text-light">
            {selectedSlot === 'weapon' ? 'Change Weapon' : 'Change Armor'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Select
              placeholder={currentEquipment ? 'Change...' : 'Equip...'}
              value={pendingId ?? ''}
              onChange={(e) => setPendingId(Number(e.target.value))}
              className="bg-dark-brown mb-4"
            >
              {availableEquipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>

            {pendingId !== null && (
              <Button 
                onClick={handleEquip} 
                isLoading={isEquipping}
                className="w-full bg-brown border border-black/40"
              >
                <span className='gold-text-light'>
                Equip
                </span>
              </Button>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}; 