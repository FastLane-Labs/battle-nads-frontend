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
  Select
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/providers/WalletProvider';
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { useGame } from '@/hooks/game/useGame';
import { useBattleNadsClient } from '@/hooks/contracts/useBattleNadsClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { domain } from '@/types';

interface CharacterCreationProps {
  onCharacterCreated?: () => void;
}

const CharacterCreation: React.FC<CharacterCreationProps> = ({ onCharacterCreated }) => {
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<domain.CharacterClass | '' >('');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const queryClient = useQueryClient();

  const { client } = useBattleNadsClient();
  const { embeddedWallet, injectedWallet } = useWallet();
  const { characterId: globalCharacterId } = useGame();

  const createCharacterMutation = useMutation({
    mutationFn: async (params: {
      name: string;
      characterClass: domain.CharacterClass;
    }) => {
      if (!client) throw new Error("Client not available");
      return client.createCharacter(
        params.characterClass, 
        params.name
      );
    },
    onSuccess: (result) => {
      console.log("Character creation transaction submitted/succeeded:", result);
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', injectedWallet?.address] });
      queryClient.invalidateQueries({ queryKey: ['playerCharacters', injectedWallet?.address] });
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
    if (!name || selectedClass === '') {
      toast({ title: 'Error', description: 'Please enter a name and select a class', status: 'error' });
      return;
    }
    if (!embeddedWallet?.address) {
      toast({ title: 'Error', description: 'Session key wallet not available.', status: 'error' });
      return;
    }
    if (!injectedWallet?.address) {
      toast({ title: 'Error', description: 'Owner wallet not connected.', status: 'error' });
      return;
    }

    console.log("Initiating character creation mutation...", { name, selectedClass });
    createCharacterMutation.mutate({
      name,
      characterClass: selectedClass as domain.CharacterClass,
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
        <VStack spacing={4}>
          <Image 
            src="/BattleNadsLogo.png" 
            alt="Battle Nads Logo"
            maxWidth="250px" 
            mb={2}
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
          <FormControl isRequired>
            <FormLabel>Class</FormLabel>
            <Select 
              placeholder="Select class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as domain.CharacterClass | '')}
              isDisabled={createCharacterMutation.isPending}
            >
              {Object.entries(domain.CharacterClass)
                .filter(([key, value]) => typeof value === 'number')
                .map(([key, value]) => (
                  <option key={value} value={value}>{key}</option>
              ))}
            </Select>
          </FormControl>
          
          <Button 
            colorScheme="blue" 
            width="full"
            onClick={handleCreateCharacter}
            isDisabled={!name || selectedClass === '' || createCharacterMutation.isPending}
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