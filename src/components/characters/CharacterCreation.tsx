'use client';

import React, { useState, useEffect } from 'react';
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
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  Image,
  useDisclosure,
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalFooter, 
  ModalBody, 
  ModalCloseButton
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useBattleNads } from '../../hooks/useBattleNads';
import { useWallet } from '../../providers/WalletProvider';
import { isValidCharacterId } from '../../utils/getCharacterLocalStorageKey';

interface AttributeInputProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
  isDisabled?: boolean;
}

interface CharacterCreationProps {
  onCharacterCreated?: () => void;
}

const CharacterCreation: React.FC<CharacterCreationProps> = ({ onCharacterCreated }) => {
  const [name, setName] = useState('');
  const [strength, setStrength] = useState(3);
  const [vitality, setVitality] = useState(3);
  const [dexterity, setDexterity] = useState(3);
  const [quickness, setQuickness] = useState(3);
  const [sturdiness, setSturdiness] = useState(3);
  const [luck, setLuck] = useState(3);
  const [isCreating, setIsCreating] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    createCharacter, 
    loading, 
    error, 
    characterId,
    getCharacterIdByTransactionHash 
  } = useBattleNads();
  
  // Import the wallet provider to get embedded wallet address
  const { embeddedWallet, injectedWallet } = useWallet();
  
  // Check if character already exists and redirect if it does
  useEffect(() => {
    const storedCharacterId = localStorage.getItem('battleNadsCharacterId');
    if (storedCharacterId && isValidCharacterId(storedCharacterId)) {
      console.log("Found existing valid character, redirecting to game:", storedCharacterId);
      router.push('/game');
    } else if (storedCharacterId) {
      console.log("Found invalid zero-address character ID in localStorage, not redirecting");
      // Remove invalid character ID from localStorage
      localStorage.removeItem('battleNadsCharacterId');
    }
  }, [router]);
  
  // Check if character was created and redirect to game
  useEffect(() => {
    if (characterId && isValidCharacterId(characterId)) {
      console.log("Valid character ID found, redirecting to game:", characterId);
      router.push('/game');
    } else if (characterId) {
      console.log("Character ID is the zero address, not redirecting to game");
    }
  }, [characterId, router]);
  
  // Check if we have both required wallets
  useEffect(() => {
    if (!injectedWallet?.address) {
      console.warn("Owner wallet not connected for character creation");
    }
    
    if (!embeddedWallet?.address) {
      console.warn("Embedded wallet not available for use as session key");
    } else {
      console.log("Embedded wallet (will be used as session key):", embeddedWallet.address);
    }
  }, [injectedWallet, embeddedWallet]);
  
  // Add a new effect to listen for character creation events
  useEffect(() => {
    const handleCharacterCreated = (event: CustomEvent) => {
      console.log("CharacterCreation received characterCreated event:", event.detail);
      if (event.detail && event.detail.characterId && isValidCharacterId(event.detail.characterId)) {
        console.log("Valid character created, will redirect to game:", event.detail.characterId);
        router.push('/game');
      }
    };

    // Add event listener
    window.addEventListener('characterCreated', handleCharacterCreated as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('characterCreated', handleCharacterCreated as EventListener);
    };
  }, [router]);
  
  const MIN_STAT_VALUE = 3;
  const TOTAL_POINTS = 32;
  const BASE_POINTS_USED = MIN_STAT_VALUE * 6; // 6 attributes starting at 3 each
  const usedPoints = strength + vitality + dexterity + quickness + sturdiness + luck;
  const unallocatedPoints = TOTAL_POINTS - usedPoints;
  
  const handleTransactionLookup = async () => {
    if (!transactionHash) {
      toast({
        title: 'Error',
        description: 'Please enter a transaction hash',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      const foundCharacterId = await getCharacterIdByTransactionHash(transactionHash);
      if (foundCharacterId) {
        toast({
          title: 'Success',
          description: `Found character ID: ${foundCharacterId}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Should navigate automatically via useEffect
      } else {
        toast({
          title: 'Error',
          description: 'Could not find character ID for this transaction',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    onClose();
  };
  
  const handleCreateCharacter = async () => {
    if (!name) {
      toast({
        title: 'Error',
        description: 'Please enter a character name',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (unallocatedPoints !== 0) {
      toast({
        title: 'Error',
        description: `Please allocate all attribute points. You have ${unallocatedPoints} points unallocated.`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Check if embedded wallet is available to use as session key
    if (!embeddedWallet?.address) {
      toast({
        title: 'Error',
        description: 'Session key wallet not available. Please ensure your embedded wallet is connected.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    // Make sure owner wallet is connected
    if (!injectedWallet?.address) {
      toast({
        title: 'Error',
        description: 'Owner wallet not connected. Please connect your MetaMask wallet.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    console.log("Starting character creation process...");
    setIsCreating(true);
    
    try {
      console.log("Creating character with session key:", embeddedWallet.address);
      console.log("Character stats:", { name, strength, vitality, dexterity, quickness, sturdiness, luck });
      
      // Call the createCharacter function from the hook
      const newCharacterId = await createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck,
        embeddedWallet.address  // Pass the embedded wallet address as the session key
      );
      
      console.log("Character creation result:", { 
        characterId: newCharacterId, 
        isValid: newCharacterId ? isValidCharacterId(newCharacterId) : false 
      });
      
      if (newCharacterId && isValidCharacterId(newCharacterId)) {
        // Store character ID in local state for the component to use
        console.log("Setting transactionHash for reference:", newCharacterId);
        setTransactionHash(typeof newCharacterId === 'string' && newCharacterId.startsWith('0x') && newCharacterId.length < 66 
          ? newCharacterId  // It's probably a transaction hash
          : null           // It's a character ID
        );
        
        toast({
          title: 'Success',
          description: 'Character created successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Call the callback if provided
        if (onCharacterCreated) {
          onCharacterCreated();
        }
        
        // Force check localStorage to ensure it was updated
        const storedCharacterId = localStorage.getItem('battleNadsCharacterId');
        console.log("Checking localStorage after creation:", { 
          storedCharacterId,
          isValid: storedCharacterId ? isValidCharacterId(storedCharacterId) : false
        });
        
        // Navigation will happen via useEffect or the event listener
        console.log("Waiting for navigation to game page...");
        
        // Manually trigger a custom event in case other listeners missed it
        try {
          const characterCreatedEvent = new CustomEvent('characterCreated', { 
            detail: { characterId: newCharacterId, owner: injectedWallet.address }
          });
          window.dispatchEvent(characterCreatedEvent);
          console.log("Manually dispatched characterCreated event");
        } catch (eventErr) {
          console.error("Error dispatching manual event:", eventErr);
        }
      } else {
        console.warn("Character creation returned an invalid character ID:", newCharacterId);
        toast({
          title: 'Error',
          description: error || 'Failed to create character - invalid ID returned',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      console.error("Error creating character:", err);
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const AttributeInput = ({ value, onChange, label, isDisabled = false }: AttributeInputProps) => (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <NumberInput 
        value={value} 
        onChange={(_, val) => onChange(val)} 
        min={MIN_STAT_VALUE} 
        max={10}
        isDisabled={isDisabled || isCreating}
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </FormControl>
  );
  
  if (loading || isCreating) {
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
        <VStack spacing={4}>
          <Image 
            src="/BattleNadsLogo.png" 
            alt="Battle Nads Logo"
            maxWidth="250px" 
            mb={2}
          />
          
          <Heading as="h1" size="xl" textAlign="center">Create Character</Heading>
          
          <Divider />
          
          <FormControl>
            <FormLabel>Character Name</FormLabel>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter your character name"
            />
          </FormControl>
          
          <Alert status={unallocatedPoints > 0 ? "info" : unallocatedPoints < 0 ? "error" : "success"} variant="subtle">
            <AlertIcon />
            <AlertDescription>
              <Text fontWeight="bold">
                Unallocated Attribute Points: {unallocatedPoints}
              </Text>
            </AlertDescription>
          </Alert>
          
          <AttributeInput 
            value={strength} 
            onChange={setStrength} 
            label="Strength" 
          />
          
          <AttributeInput 
            value={vitality} 
            onChange={setVitality} 
            label="Vitality" 
          />
          
          <AttributeInput 
            value={dexterity} 
            onChange={setDexterity} 
            label="Dexterity" 
          />
          
          <AttributeInput 
            value={quickness} 
            onChange={setQuickness} 
            label="Quickness" 
          />
          
          <AttributeInput 
            value={sturdiness} 
            onChange={setSturdiness} 
            label="Sturdiness" 
          />
          
          <AttributeInput 
            value={luck} 
            onChange={setLuck} 
            label="Luck" 
          />
          
          <Button 
            colorScheme="blue" 
            width="full"
            onClick={handleCreateCharacter}
            isDisabled={unallocatedPoints !== 0 || !name || isCreating}
          >
            Create Character
          </Button>
          
          <Button
            variant="outline"
            onClick={onOpen}
            width="full"
          >
            Already Created? Lookup by Transaction
          </Button>
        </VStack>
      </Box>
      
      {/* Transaction Lookup Modal */}
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