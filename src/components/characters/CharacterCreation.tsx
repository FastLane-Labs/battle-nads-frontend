'use client';

import React, { useState, useMemo } from 'react';
import { 
  Button, 
  FormControl, 
  FormLabel, 
  Input, 
  Spinner,
  useToast,
  useDisclosure,
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalFooter, 
  ModalBody, 
  ModalCloseButton,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/providers/WalletProvider';
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { useGame } from '@/hooks/game/useGame';
import { useBattleNadsClient } from '@/hooks/contracts/useBattleNadsClient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { MAX_SESSION_KEY_VALIDITY_BLOCKS } from '@/config/env';

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
  <div className="flex w-full items-center justify-between mb-2">
    <span className="gold-text font-bold flex-1">{label}</span>
    <div className="flex space-x-1 flex-1 justify-end items-center">
      <button 
        className={`relative flex items-center justify-center w-[50px] h-[50px] ${isDisabled || value <= min ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform duration-200'}`}
        onClick={() => value > min && onChange(value - 1)}
        disabled={isDisabled || value <= min}
      >
        <img 
          src="/assets/buttons/-.webp" 
          alt="-" 
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 rounded-md bg-red-400/20 filter blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
      </button>
      <div className='bg-black/85 px-4 pt-1 pb-2 min-w-[68px] sm:min-w-[80px] rounded-md border-2 border-zinc-400/25 shadow-[0_0_8px_rgba(100,100,100,0.3)] flex items-center justify-center'>
        <div className="gold-text text-3xl sm:text-4xl font-bold leading-none">
          {value}
        </div>
      </div>
      <button 
        className={`relative flex items-center justify-center w-[50px] h-[50px] ${isDisabled || value >= max ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform duration-200'}`}
        onClick={() => value < max && onChange(value + 1)}
        disabled={isDisabled || value >= max}
      >
        <img 
          src="/assets/buttons/+.webp" 
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
  const [isNameInputFocused, setIsNameInputFocused] = useState(false);
  
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const queryClient = useQueryClient();

  const { client } = useBattleNadsClient();
  const { embeddedWallet, injectedWallet } = useWallet();

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
          status: 'error',
          isClosable: true
        });
        return BigInt(0); // Return 0 on error
      }
    },
    enabled: !!client, // Only fetch when client is ready
    staleTime: Infinity, // This value rarely changes
    refetchOnWindowFocus: false, // No need to refetch on focus
  });
  // -------------------------------------

  // --- Fetch current block number for session key deadline ---
  const { data: currentBlock, isLoading: isLoadingBlock } = useQuery({
    queryKey: ['currentBlock'],
    queryFn: async () => {
      if (!client) return BigInt(0);
      try {
        const blockNumber = await client.getLatestBlockNumber();
        console.log("[CharacterCreation] Current block number:", blockNumber);
        return blockNumber;
      } catch (err) {
        console.error("[CharacterCreation] Error fetching current block:", err);
        toast({
          title: 'Block Fetch Error',
          description: 'Could not retrieve current block number.',
          status: 'error',
          isClosable: true
        });
        return BigInt(0);
      }
    },
    enabled: !!client,
    staleTime: 600000, // Refresh at most once per 10 minutes
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

        // --- ADD NAVIGATION: Redirect to home page after success ---
        console.log("[CharacterCreation] Character created successfully, redirecting to /...");
        router.push('/'); 
        // ---------------------------------------------------------

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
        toast({ title: 'Error', description: 'Client not available for lookup', status: 'error', isClosable: true });
        return null;
     }
     console.warn("getCharacterIdByTransactionHash not implemented on client yet");
     toast({ title: 'Info', description: 'Transaction lookup not implemented yet.', status: 'info', isClosable: true });
     return null; 
  };
  
  const handleTransactionLookup = async () => {
    if (!transactionHash) {
      toast({ title: 'Error', description: 'Please enter a transaction hash', status: 'error', isClosable: true });
      return;
    }
    try {
      const foundCharacterId = await getCharacterIdByTransactionHash(transactionHash);
      if (foundCharacterId && isValidCharacterId(foundCharacterId)) {
        toast({ title: 'Success', description: `Found character ID: ${foundCharacterId}`, status: 'success', isClosable: true });
        localStorage.setItem('battleNadsCharacterId', foundCharacterId);
         router.push('/game');
      } else if (foundCharacterId === null) {
         // Function not implemented yet or lookup failed cleanly
         // Toast already shown in getCharacterIdByTransactionHash
      } else {
        toast({ title: 'Error', description: 'Could not find valid character ID for this transaction', status: 'error', isClosable: true });
      }
    } catch (err: any) {
      toast({ title: 'Lookup Error', description: err.message || 'Lookup failed', status: 'error', isClosable: true });
    } finally {
       onClose();
    }
  };
  
  const handleCreateCharacter = () => {
    if (!name) {
      toast({ title: 'Error', description: 'Please enter a name', status: 'error', isClosable: true });
      return;
    }
    if (unspentAttributePoints !== 0) {
      toast({ title: 'Error', description: `Please allocate all ${TOTAL_POINTS} attribute points. Remaining: ${unspentAttributePoints}`, status: 'error', isClosable: true });
      return;
    }
    if (!embeddedWallet?.address || !ethers.isAddress(embeddedWallet.address)) {
      toast({ title: 'Error', description: 'Valid Session key wallet not available.', status: 'error', isClosable: true });
      return;
    }
    if (!injectedWallet?.address) {
      toast({ title: 'Error', description: 'Owner wallet not connected.', status: 'error', isClosable: true });
      return;
    }

    // --- Check if buy-in amount is loaded and valid --- 
    if (isLoadingBuyIn || buyInAmount === undefined || buyInAmount <= BigInt(0)) {
        toast({ 
            title: 'Error', 
            description: 'Waiting for creation cost estimate or estimate is invalid.', 
            status: 'warning',
            isClosable: true
        });
        return;
    }
    // --------------------------------------------------
    
    // --- Check if current block is loaded --- 
    if (isLoadingBlock || !currentBlock) {
        toast({ 
            title: 'Error', 
            description: 'Waiting for current block number.', 
            status: 'warning',
            isClosable: true
        });
        return;
    }
    // --------------------------------------------------
    
    // --- Calculate session key deadline ---
    const sessionKeyDeadline = currentBlock + BigInt(MAX_SESSION_KEY_VALIDITY_BLOCKS);
    console.log(`[CharacterCreation] Setting session key deadline: current(${currentBlock}) + validity(${MAX_SESSION_KEY_VALIDITY_BLOCKS}) = ${sessionKeyDeadline}`);
    // ---------------------------------
    
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
      sessionKeyDeadline, // Use calculated deadline
      value: valueWithBuffer // Use value with buffer
    });
    
    console.log('Stats totals check:', strength, vitality, dexterity, quickness, sturdiness, luck);
    console.log('Total points used:', usedPoints, 'Required:', TOTAL_POINTS);
    console.log('Validation check:', unspentAttributePoints !== 0);
    
    createCharacterMutation.mutate({
      name,
      strength: BigInt(strength),
      vitality: BigInt(vitality),
      dexterity: BigInt(dexterity),
      quickness: BigInt(quickness),
      sturdiness: BigInt(sturdiness),
      luck: BigInt(luck),
      sessionKey: embeddedWallet.address,
      sessionKeyDeadline, // Use calculated deadline
      value: valueWithBuffer // Pass the value with buffer
    });
  };
  
  // Combine loading states
  const isPageLoading = createCharacterMutation.isPending || isLoadingBuyIn || isLoadingBlock;

  if (isPageLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="xl" color="gold" />
          <p className="text-yellow-500">
            {createCharacterMutation.isPending ? 'Creating character...' : 
             isLoadingBlock ? 'Getting current block...' : 
             'Fetching creation cost...'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center pt-6 pb-16"
      style={{ backgroundImage: "url('/assets/bg/dark-smoky-bg.webp')" }}
    >
      <div className="max-w-[600px] w-full mx-auto px-4">
        <div className="flex flex-col space-y-6">
          <img 
            src="/BattleNadsLogo.webp" 
            alt="Battle Nads Logo"
            className="max-w-[300px] md:max-w-[335px] mx-auto"
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
                onFocus={() => setIsNameInputFocused(true)}
                onBlur={() => setIsNameInputFocused(false)}
                placeholder="Enter your character name"
                disabled={createCharacterMutation.isPending}
                className="w-full h-[60px] bg-transparent text-transparent text-[31px] px-6 py-3 
                  border-2 border-[#8B6914] rounded-md
                  focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-opacity-50
                  shadow-[0_0_10px_rgba(212,175,55,0.2)]
                  placeholder-transparent absolute inset-0 z-[2]"
              />
              
              {/* Background element */}
              <div className="w-full h-[60px] bg-black/90 rounded-md border-2 border-[#8B6914] shadow-[0_0_10px_rgba(212,175,55,0.2)]"></div>
              
              {/* Gold text overlay that shows the input value */}
              <div className="absolute inset-0 flex items-center px-6 pointer-events-none">
                {name ? (
                  <div className="flex items-center">
                    <span className="gold-text text-3xl">{name}</span>
                    {isNameInputFocused && (
                      <span className="gold-text text-3xl ml-1 animate-[cursor-blink_1s_infinite]">|</span>
                    )}
                  </div>
                ) : isNameInputFocused ? (
                  <span className="gold-text text-3xl animate-[cursor-blink_1s_infinite]">|</span>
                ) : (
                  <span className="text-gray-500 text-2xl">Enter your character name</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="relative py-4 px-8 my-6">
            {/* Background image - Points Allocation */}
            <img 
              src="/assets/components/points-allocated-bg.webp" 
              alt="" 
              className="absolute inset-0 w-full h-full object-fill z-0" 
            />
            
            {/* Content */}
            <p className="relative text-center text-3xl font-bold gold-text">
              Points Remaining: {unspentAttributePoints}
            </p>
          </div>
          
          <div className="flex flex-col space-y-4 text-2xl sm:text-3xl">
            <AttributeInput 
              value={strength} 
              onChange={setStrength} 
              label="Strength" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + strength > 0 ? unspentAttributePoints + strength : strength}
            />
              <AttributeInput 
                value={vitality} 
                onChange={setVitality} 
                label="Vitality" 
                isDisabled={createCharacterMutation.isPending}
                max={unspentAttributePoints + vitality > 0 ? unspentAttributePoints + vitality : vitality}
              />
            <AttributeInput 
              value={dexterity} 
              onChange={setDexterity} 
              label="Dexterity" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + dexterity > 0 ? unspentAttributePoints + dexterity : dexterity}
            />
            <AttributeInput 
              value={quickness} 
              onChange={setQuickness} 
              label="Quickness" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + quickness > 0 ? unspentAttributePoints + quickness : quickness}
            />
            <AttributeInput 
              value={sturdiness} 
              onChange={setSturdiness} 
              label="Sturdiness" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + sturdiness > 0 ? unspentAttributePoints + sturdiness : sturdiness}
            />
            <AttributeInput 
              value={luck} 
              onChange={setLuck} 
              label="Luck" 
              isDisabled={createCharacterMutation.isPending}
              max={unspentAttributePoints + luck > 0 ? unspentAttributePoints + luck : luck}
            />
          </div>
          
          <div className="relative mt-6 group">
            {/* Background image - Create Character Button */}
            <img 
              src="/assets/buttons/create-character.webp" 
              alt="" 
              className="absolute inset-0 w-full h-[75px] sm:h-[85px] object-fill z-0 transition-all duration-200 
                group-hover:brightness-125 group-hover:scale-[1.02] group-active:brightness-90 group-active:scale-[0.98]" 
            />
            
            <button 
              className={`relative h-[75px] sm:h-[85px] w-full text-2xl sm:text-4xl font-bold uppercase z-[2] bg-transparent border-0
                ${(unspentAttributePoints !== 0 || !name || createCharacterMutation.isPending || isLoadingBuyIn || !buyInAmount || buyInAmount <= BigInt(0) || isLoadingBlock || !currentBlock) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''}`}
              onClick={handleCreateCharacter}
              disabled={unspentAttributePoints !== 0 || !name || createCharacterMutation.isPending || isLoadingBuyIn || !buyInAmount || buyInAmount <= BigInt(0) || isLoadingBlock || !currentBlock}
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