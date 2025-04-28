'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Heading, 
  Button, 
  Center, 
  FormControl, 
  FormLabel, 
  Input, 
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  Text,
  Spinner,
  useToast,
  Divider,
  Image,
  useDisclosure,
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalFooter, 
  ModalBody, 
  ModalCloseButton,
  Select,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/providers/WalletProvider';
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { useGame } from '@/hooks/game/useGame';
import { useBattleNadsClient } from '@/hooks/contracts/useBattleNadsClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { domain } from '@/types';
import { ethers } from 'ethers';

// --- Constants for Stat Allocation ---
const MIN_STAT_VALUE = 3;
const TOTAL_POINTS = 32;
// -------------------------------------

// --- Attribute Input Component (Helper) ---
interface AttributeInputProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
  isDisabled?: boolean;
  min?: number;
  max?: number; 
}

const AttributeInput: React.FC<AttributeInputProps> = ({ 
  value, 
  onChange, 
  label, 
  isDisabled = false, 
  min = MIN_STAT_VALUE, // Default min
  max = 10 // Default reasonable max, adjust if needed
}) => (
  <FormControl isRequired>
    <FormLabel>{label}</FormLabel>
    <NumberInput 
      value={value} 
      onChange={(_, val) => onChange(isNaN(val) ? min : val)}
      min={min} 
      max={max}
      isDisabled={isDisabled}
    >
      <NumberInputField />
      <NumberInputStepper>
        <NumberIncrementStepper />
        <NumberDecrementStepper />
      </NumberInputStepper>
    </NumberInput>
  </FormControl>
);
// --------------------------------------

interface CharacterCreationProps {
  onCharacterCreated?: () => void;
}

const CharacterCreation: React.FC<CharacterCreationProps> = ({ onCharacterCreated }) => {
  const [name, setName] = useState('');
  const [strength, setStrength] = useState(MIN_STAT_VALUE);
  const [vitality, setVitality] = useState(MIN_STAT_VALUE);
  const [dexterity, setDexterity] = useState(MIN_STAT_VALUE);
  const [quickness, setQuickness] = useState(MIN_STAT_VALUE);
  const [sturdiness, setSturdiness] = useState(MIN_STAT_VALUE);
  const [luck, setLuck] = useState(MIN_STAT_VALUE);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const queryClient = useQueryClient();

  const { client } = useBattleNadsClient();
  const { embeddedWallet, injectedWallet } = useWallet();
  const { characterId: globalCharacterId } = useGame();

  const usedPoints = useMemo(() => 
    strength + vitality + dexterity + quickness + sturdiness + luck,
    [strength, vitality, dexterity, quickness, sturdiness, luck]
  );
  const unspentAttributePoints = useMemo(() => TOTAL_POINTS - usedPoints, [usedPoints]);

  const createCharacterMutation = useMutation({
    mutationFn: async (params: {
      name: string;
      strength: bigint;
      vitality: bigint;
      dexterity: bigint;
      quickness: bigint;
      sturdiness: bigint;
      luck: bigint;
      sessionKey: string;
      sessionKeyDeadline: bigint;
    }) => {
      if (!client) throw new Error("Client not available");
      return client.createCharacter(
        params.name,
        params.strength,
        params.vitality,
        params.dexterity,
        params.quickness,
        params.sturdiness,
        params.luck,
        params.sessionKey,
        params.sessionKeyDeadline
      );
    },
    onSuccess: (result) => {
      console.log("Character creation transaction submitted/succeeded:", result);
      if (result?.hash) {
        setTransactionHash(result.hash);
        console.log("Set transaction hash from result:", result.hash);
      } else {
        console.warn("Could not extract transaction hash from creation result.");
      }
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', injectedWallet?.address] });
      queryClient.invalidateQueries({ queryKey: ['playerCharacters', injectedWallet?.address] });
      queryClient.invalidateQueries({ queryKey: ['characterId', injectedWallet?.address] });
      toast({
        title: 'Creation Submitted',
        description: 'Character creation transaction sent. Waiting for confirmation...',
        status: 'info',
        duration: 4000,
        isClosable: true,
      });
      if (onCharacterCreated) onCharacterCreated();
    },
    onError: (err: any) => {
      console.error("Error creating character:", err);
      toast({
        title: 'Creation Error',
        description: err.message || 'An unexpected error occurred during character creation.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const getCharacterIdByTransactionHash = async (txHash: string): Promise<string | null> => {
     if (!client) {
        console.error("Client not ready for transaction lookup");
        toast({ title: 'Error', description: 'Client not available for lookup', status: 'error' });
        return null;
     }
     console.warn("getCharacterIdByTransactionHash not implemented on client yet");
     toast({ title: 'Info', description: 'Transaction lookup not implemented yet.', status: 'info' });
     return null; 
  };
  
  useEffect(() => {
    const storedCharacterId = localStorage.getItem('battleNadsCharacterId');
    if (storedCharacterId && isValidCharacterId(storedCharacterId)) {
      console.log("Found existing valid character in localStorage, redirecting to game:", storedCharacterId);
      router.push('/game');
    } else if (storedCharacterId) {
      console.log("Found invalid zero-address character ID in localStorage, removing.");
      localStorage.removeItem('battleNadsCharacterId');
    }
  }, [router]);
  
  useEffect(() => {
    if (globalCharacterId && isValidCharacterId(globalCharacterId)) {
      console.log("Valid globalCharacterId found, redirecting to game:", globalCharacterId);
      localStorage.setItem('battleNadsCharacterId', globalCharacterId);
      router.push('/game');
    }
  }, [globalCharacterId, router]);
  
  const handleTransactionLookup = async () => {
    if (!transactionHash) {
      toast({ title: 'Error', description: 'Please enter a transaction hash', status: 'error' });
      return;
    }
    try {
      const foundCharacterId = await getCharacterIdByTransactionHash(transactionHash);
      if (foundCharacterId && isValidCharacterId(foundCharacterId)) {
        toast({ title: 'Success', description: `Found character ID: ${foundCharacterId}`, status: 'success' });
        localStorage.setItem('battleNadsCharacterId', foundCharacterId);
         router.push('/game');
      } else if (foundCharacterId === null) {
         // Function not implemented yet or lookup failed cleanly
         // Toast already shown in getCharacterIdByTransactionHash
      } else {
        toast({ title: 'Error', description: 'Could not find valid character ID for this transaction', status: 'error' });
      }
    } catch (err: any) {
      toast({ title: 'Lookup Error', description: err.message || 'Lookup failed', status: 'error' });
    } finally {
       onClose();
    }
  };
  
  const handleCreateCharacter = () => {
    if (!name) {
      toast({ title: 'Error', description: 'Please enter a name', status: 'error' });
      return;
    }
    if (unspentAttributePoints !== 0) {
      toast({ title: 'Error', description: `Please allocate all ${TOTAL_POINTS} attribute points. Remaining: ${unspentAttributePoints}`, status: 'error' });
      return;
    }
    if (!embeddedWallet?.address || !ethers.isAddress(embeddedWallet.address)) {
      toast({ title: 'Error', description: 'Valid Session key wallet not available.', status: 'error' });
      return;
    }
    if (!injectedWallet?.address) {
      toast({ title: 'Error', description: 'Owner wallet not connected.', status: 'error' });
      return;
    }

    console.log("Initiating character creation mutation...", {
      name,
      strength: BigInt(strength),
      vitality: BigInt(vitality),
      dexterity: BigInt(dexterity),
      quickness: BigInt(quickness),
      sturdiness: BigInt(sturdiness),
      luck: BigInt(luck),
      sessionKey: embeddedWallet.address,
      sessionKeyDeadline: BigInt(0)
    });
    
    createCharacterMutation.mutate({
      name,
      strength: BigInt(strength),
      vitality: BigInt(vitality),
      dexterity: BigInt(dexterity),
      quickness: BigInt(quickness),
      sturdiness: BigInt(sturdiness),
      luck: BigInt(luck),
      sessionKey: embeddedWallet.address,
      sessionKeyDeadline: BigInt(0)
    });
  };
  
  if (createCharacterMutation.isPending) {
    return (
      <Center height="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Creating your character on the Monad Testnet...</Text>
        </VStack>
      </Center>
    );
  }
  
  return (
    <Center height="100vh">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <VStack spacing={4} align="stretch">
          <Image 
            src="/BattleNadsLogo.png" 
            alt="Battle Nads Logo"
            maxWidth="250px" 
            mb={2}
            alignSelf="center"
          />
          <Heading as="h1" size="xl" textAlign="center">Create Character</Heading>
          <Divider />
          <FormControl isRequired>
            <FormLabel>Character Name</FormLabel>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter your character name"
              isDisabled={createCharacterMutation.isPending}
            />
          </FormControl>
          
          <Alert 
            status={unspentAttributePoints === 0 ? "success" : "info"}
            variant="subtle"
            borderRadius="md"
          >
            <AlertIcon />
            <AlertDescription>
              Points Remaining: {unspentAttributePoints} / {TOTAL_POINTS}
            </AlertDescription>
          </Alert>
          
          <AttributeInput 
            value={strength} 
            onChange={setStrength} 
            label="Strength" 
            isDisabled={createCharacterMutation.isPending}
          />
          <AttributeInput 
            value={vitality} 
            onChange={setVitality} 
            label="Vitality" 
            isDisabled={createCharacterMutation.isPending}
          />
          <AttributeInput 
            value={dexterity} 
            onChange={setDexterity} 
            label="Dexterity" 
            isDisabled={createCharacterMutation.isPending}
          />
          <AttributeInput 
            value={quickness} 
            onChange={setQuickness} 
            label="Quickness" 
            isDisabled={createCharacterMutation.isPending}
          />
          <AttributeInput 
            value={sturdiness} 
            onChange={setSturdiness} 
            label="Sturdiness" 
            isDisabled={createCharacterMutation.isPending}
          />
          <AttributeInput 
            value={luck} 
            onChange={setLuck} 
            label="Luck" 
            isDisabled={createCharacterMutation.isPending}
          />
          
          <Button 
            colorScheme="blue" 
            width="full"
            onClick={handleCreateCharacter}
            isDisabled={unspentAttributePoints !== 0 || !name || createCharacterMutation.isPending}
            isLoading={createCharacterMutation.isPending}
            loadingText="Creating..."
          >
            Create Character
          </Button>
          
          <Button
            variant="outline"
            onClick={onOpen}
            width="full"
            isDisabled={createCharacterMutation.isPending}
          >
            Already Created? Lookup by Transaction
          </Button>
        </VStack>
      </Box>
      
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Look Up Character by Transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Transaction Hash</FormLabel>
              <Input
                placeholder="0x..."
                value={transactionHash || ''}
                onChange={(e) => setTransactionHash(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleTransactionLookup}>
              Look Up
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Center>
  );
};

export default CharacterCreation; 