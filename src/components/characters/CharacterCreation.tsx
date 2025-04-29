'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
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
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { domain } from '@/types';
import { ethers } from 'ethers';
import { formatEther } from 'ethers';

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
  <div className="flex w-full items-center justify-between mb-2 text-3xl">
    <span className="gold-text font-bold flex-1">{label}</span>
    <div className="flex space-x-1 flex-1 justify-end">
      <button 
        className={`relative flex items-center justify-center w-[50px] h-[50px] ${isDisabled || value <= min ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform duration-200'}`}
        onClick={() => value > min && onChange(value - 1)}
        disabled={isDisabled || value <= min}
      >
        <img 
          src="/assets/buttons/-.png" 
          alt="-" 
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 rounded-md bg-red-400/20 filter blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
      </button>
      <div className='bg-black/85 px-4 pt-1 pb-2 min-w-[80px] rounded-md border-2 border-zinc-400/25 shadow-[0_0_8px_rgba(100,100,100,0.3)] flex items-center justify-center'>
        <div className="gold-text text-4xl font-bold leading-none">
          {value}
        </div>
      </div>
      <button 
        className={`relative flex items-center justify-center w-[50px] h-[50px] ${isDisabled || value >= max ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform duration-200'}`}
        onClick={() => value < max && onChange(value + 1)}
        disabled={isDisabled || value >= max}
      >
        <img 
          src="/assets/buttons/+.png" 
          alt="+" 
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 rounded-md bg-teal-400/20 filter blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
      </button>
    </div>
  </div>
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

  // --- Fetch estimated buy-in amount --- 
  const { data: buyInAmount, isLoading: isLoadingBuyIn, error: buyInError } = useQuery({
    queryKey: ['buyInAmount'],
    queryFn: async () => {
      if (!client) return BigInt(0); // Return 0 if client not ready
      try {
        const amount = await client.estimateBuyInAmountInMON();
        console.log("[CharacterCreation] Estimated buy-in amount:", amount);
        return amount;
      } catch (err) {
        console.error("[CharacterCreation] Error fetching buy-in amount:", err);
        toast({
          title: 'Buy-in Error',
          description: 'Could not estimate character creation cost.',
          status: 'error'
        });
        return BigInt(0); // Return 0 on error
      }
    },
    enabled: !!client, // Only fetch when client is ready
    staleTime: Infinity, // This value rarely changes
    refetchOnWindowFocus: false, // No need to refetch on focus
  });
  // -------------------------------------

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
      value: bigint;
    }) => {
      if (!client) throw new Error("Client not available");
      const tx = await client.createCharacter(
        params.name,
        params.strength,
        params.vitality,
        params.dexterity,
        params.quickness,
        params.sturdiness,
        params.luck,
        params.sessionKey,
        params.sessionKeyDeadline,
        params.value
      );
      console.log("Character creation transaction sent:", tx.hash);
      return tx;
    },
    onSuccess: async (result: ethers.TransactionResponse) => {
      console.log("Character creation transaction submitted, waiting for confirmation...", result.hash);
      setTransactionHash(result.hash);
      
      toast({
        title: 'Transaction Sent',
        description: `Tx: ${result.hash.slice(0, 6)}...${result.hash.slice(-4)}. Waiting for 1 confirmation...`,
        status: 'loading',
        duration: null,
        isClosable: true,
        id: 'tx-wait-toast'
      });
      
      try {
        const receipt = await result.wait(1);
        console.log("Transaction confirmed:", receipt);
        
        toast.close('tx-wait-toast');
        toast({
          title: 'Character Created!',
          description: `Transaction ${receipt?.hash.slice(0, 6)}...${receipt?.hash.slice(-4)} confirmed.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // --- Add direct fetch for character ID --- 
        if (client && injectedWallet?.address) {
          try {
            console.log(`[CharacterCreation] Directly fetching character ID for owner: ${injectedWallet.address}...`);
            const fetchedId = await client.getPlayerCharacterID(injectedWallet.address);
            console.log(`[CharacterCreation] Directly fetched ID: ${fetchedId}`);
            if (isValidCharacterId(fetchedId)) {
              console.log("[CharacterCreation] Fetched ID is valid.");
              // Optionally, could manually update localStorage here too
              // localStorage.setItem('battleNadsCharacterId', fetchedId);
            } else {
              console.warn("[CharacterCreation] Fetched ID is NOT valid (still zero address?).");
            }
          } catch (fetchErr: any) {
            console.error("[CharacterCreation] Error directly fetching character ID:", fetchErr);
          }
        }
        // -----------------------------------------

        // --- Invalidate queries AFTER confirmation ---
        console.log("Invalidating queries after confirmation...");
        queryClient.invalidateQueries({ queryKey: ['uiSnapshot', injectedWallet?.address] });
        queryClient.invalidateQueries({ queryKey: ['characterId', injectedWallet?.address] });

        if (onCharacterCreated) onCharacterCreated();

      } catch (waitError: any) {
        console.error("Error waiting for transaction confirmation:", waitError);
        toast.close('tx-wait-toast');
        toast({
          title: 'Confirmation Error',
          description: `Failed to confirm transaction ${result.hash}: ${waitError.message}`,
          status: 'error',
          duration: 7000,
          isClosable: true,
        });
      }
    },
    onError: (err: Error) => {
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

    // --- Check if buy-in amount is loaded and valid --- 
    if (isLoadingBuyIn || buyInAmount === undefined || buyInAmount <= BigInt(0)) {
        toast({ 
            title: 'Error', 
            description: 'Waiting for creation cost estimate or estimate is invalid.', 
            status: 'warning' 
        });
        return;
    }
    // --------------------------------------------------
    
    // --- Calculate value with buffer ---
    const valueWithBuffer = buyInAmount + (buyInAmount / BigInt(10)); // Add 10% buffer
    // ---------------------------------

    console.log("Initiating character creation mutation...", {
      name,
      strength: BigInt(strength),
      vitality: BigInt(vitality),
      dexterity: BigInt(dexterity),
      quickness: BigInt(quickness),
      sturdiness: BigInt(sturdiness),
      luck: BigInt(luck),
      sessionKey: embeddedWallet.address,
      sessionKeyDeadline: BigInt(0), // Keep BigInt version for clarity
      value: valueWithBuffer // Use value with buffer
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
      sessionKeyDeadline: BigInt(0), 
      value: valueWithBuffer // Pass the value with buffer
    });
  };
  
  // Combine loading states
  const isPageLoading = createCharacterMutation.isPending || isLoadingBuyIn;

  if (isPageLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="xl" color="gold" />
          <p className="text-yellow-500">
            {createCharacterMutation.isPending ? 'Creating character...' : 'Fetching creation cost...'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center pt-6 pb-16"
      style={{ backgroundImage: "url('/assets/bg/dark-smoky-bg.png')" }}
    >
      <div className="max-w-[600px] w-full mx-auto px-4">
        <div className="flex flex-col space-y-6">
          <img 
            src="/BattleNadsLogo.png" 
            alt="Battle Nads Logo"
            className="max-w-[400px] mx-auto"
          />
          
          <h2 className="text-center text-4xl font-semibold uppercase mb-6 gold-text tracking-wider">
            CREATE YOUR CHAMPION
          </h2>
          
          <div>
          <h3 className="text-center text-3xl font-semibold uppercase mb-6 gold-text">
              Character Name
            </h3>
            <div className="relative">
              {/* The actual input - invisible but functional */}
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter your character name"
                disabled={createCharacterMutation.isPending}
                className="w-full h-[60px] bg-transparent text-transparent text-[31px] px-6 py-3 
                  border-2 border-[#8B6914] rounded-md
                  focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-opacity-50
                  shadow-[0_0_10px_rgba(212,175,55,0.2)]
                  placeholder-transparent absolute inset-0 z-10"
              />
              
              {/* Background element */}
              <div className="w-full h-[60px] bg-black/90 rounded-md border-2 border-[#8B6914] shadow-[0_0_10px_rgba(212,175,55,0.2)]"></div>
              
              {/* Gold text overlay that shows the input value */}
              <div className="absolute inset-0 flex items-center px-6 pointer-events-none">
                {name ? (
                  <span className="gold-text text-3xl">{name}</span>
                ) : (
                  <span className="text-gray-500 text-2xl">Enter your character name</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="relative py-4 px-8 my-6">
            {/* Background image - Points Allocation */}
            <img 
              src="/assets/components/points-allocated-bg.png" 
              alt="" 
              className="absolute inset-0 w-full h-full object-fill z-0" 
            />
            
            {/* Content */}
            <p className="relative z-10 text-center text-3xl font-bold gold-text">
              Points Remaining: {unspentAttributePoints}
            </p>
          </div>
          
          <div className="flex flex-col space-y-4 text-3xl">
            <AttributeInput 
              value={strength} 
              onChange={setStrength} 
              label="Strength" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + strength > 0 ? unspentAttributePoints + strength : strength}
            />
            <AttributeInput 
              value={dexterity} 
              onChange={setDexterity} 
              label="Dexterity" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + dexterity > 0 ? unspentAttributePoints + dexterity : dexterity}
            />
            <AttributeInput 
              value={vitality} 
              onChange={setVitality} 
              label="Constitution" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + vitality > 0 ? unspentAttributePoints + vitality : vitality}
            />
            <AttributeInput 
              value={quickness} 
              onChange={setQuickness} 
              label="Intelligence" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + quickness > 0 ? unspentAttributePoints + quickness : quickness}
            />
            <AttributeInput 
              value={sturdiness} 
              onChange={setSturdiness} 
              label="Wisdom" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + sturdiness > 0 ? unspentAttributePoints + sturdiness : sturdiness}
            />
            <AttributeInput 
              value={luck} 
              onChange={setLuck} 
              label="Charisma" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + luck > 0 ? unspentAttributePoints + luck : luck}
            />
          </div>
          
          <div className="relative mt-6 group">
            {/* Background image - Create Character Button */}
            <img 
              src="/assets/buttons/create-character.png" 
              alt="" 
              className="absolute inset-0 w-full h-[85px] object-fill z-0 transition-all duration-200 
                group-hover:brightness-125 group-hover:scale-[1.02] group-active:brightness-90 group-active:scale-[0.98]" 
            />
            
            <button 
              className={`relative h-[85px] w-full text-4xl font-bold uppercase z-10 bg-transparent border-0
                ${(unspentAttributePoints !== 0 || !name || createCharacterMutation.isPending || isLoadingBuyIn || !buyInAmount || buyInAmount <= BigInt(0)) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''}`}
              onClick={handleCreateCharacter}
              disabled={unspentAttributePoints !== 0 || !name || createCharacterMutation.isPending || isLoadingBuyIn || !buyInAmount || buyInAmount <= BigInt(0)}
            >
              <p className='gold-text transition-transform duration-200 group-hover:scale-105 group-active:scale-95'>
                {createCharacterMutation.isPending ? 'Creating...' : 'Create Character'}
              </p>
            </button>
          </div>
          
          <button
            className={`border border-gray-600 text-gray-300 py-2 rounded 
              ${createCharacterMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:bg-opacity-5'}`}
            onClick={onOpen}
            disabled={createCharacterMutation.isPending}
          >
            Already Created? Lookup by Transaction
          </button>
        </div>
      </div>
      
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.900" borderColor="gray.700" borderWidth={1}>
          <ModalHeader color="gold">Look Up Character by Transaction</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel color="gold">Transaction Hash</FormLabel>
              <Input
                placeholder="0x..."
                value={transactionHash || ''}
                onChange={(e) => setTransactionHash(e.target.value)}
                bg="gray.800"
                color="white"
                borderColor="gray.600"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button 
              bg="rgba(139, 69, 19, 0.8)"
              color="gold"
              mr={3} 
              onClick={handleTransactionLookup}
              _hover={{ bg: "rgba(139, 69, 19, 0.9)" }}
            >
              Look Up
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              color="gray.300"
              borderColor="gray.600"
              _hover={{ bg: "rgba(255,255,255,0.05)" }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default CharacterCreation; 