'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Box, Center, Spinner, Text, VStack, Button } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads } from '../hooks/useBattleNads';
import { ethers } from 'ethers';

// This component handles the entire wallet and session key initialization flow
export default function GameInitializer() {
  const router = useRouter();
  const { 
    address, 
    injectedWallet, 
    embeddedWallet, 
    connectMetamask, 
    connectPrivyEmbedded 
  } = useWallet();
  
  const { 
    getPlayerCharacterID, 
    characterId, 
    getCurrentSessionKey,
    updateSessionKey,
    setSessionKeyToEmbeddedWallet
  } = useBattleNads();
  
  const [status, setStatus] = useState<string>('checking');
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track transaction state across renders
  const processingRef = useRef(false);
  const transactionSentRef = useRef(false);
  
  // Step 1: Ensure owner wallet (injected wallet) is connected
  useEffect(() => {
    // Don't re-initialize if already processing or transaction was sent
    if (processingRef.current || transactionSentRef.current) {
      console.log("Skipping initialization due to flags:", {
        processing: processingRef.current,
        transactionSent: transactionSentRef.current
      });
      return;
    }
    
    // Set processing flag to prevent multiple executions
    processingRef.current = true;
    
    console.log("Starting game initialization flow");
    
    // Debug: Print available functions from useBattleNads
    console.log("Available functions in useBattleNads:", {
      getPlayerCharacterID: typeof getPlayerCharacterID === 'function',
      characterId: characterId,
      getCurrentSessionKey: typeof getCurrentSessionKey === 'function',
      updateSessionKey: typeof updateSessionKey === 'function',
      setSessionKeyToEmbeddedWallet: typeof setSessionKeyToEmbeddedWallet === 'function'
    });

    async function initializeGame() {
      try {
        await checkOwnerWallet();
      } catch (error) {
        console.error("Error during game initialization:", error);
        setError("Game initialization failed: " + ((error as Error)?.message || "Unknown error"));
        setStatus('error');
        processingRef.current = false;
      }
    }
    
    async function checkOwnerWallet() {
      try {
        setStatus('checking-owner-wallet');
        console.log("Checking owner wallet...", { 
          address, 
          injectedWallet: injectedWallet?.address,
          walletType: injectedWallet?.walletClientType 
        });
        
        if (!injectedWallet?.address) {
          console.log("Owner wallet not connected");
          setStatus('need-owner-wallet');
          processingRef.current = false;
          return;
        }
        
        console.log("Owner wallet connected:", injectedWallet.address);
        // Owner wallet is connected, proceed to check embedded wallet
        await checkEmbeddedWallet();
      } catch (error) {
        console.error("Error checking owner wallet:", error);
        setError("Failed to check owner wallet connection");
        setStatus('error');
        processingRef.current = false;
      }
    }
    
    async function checkEmbeddedWallet() {
      try {
        setStatus('checking-embedded-wallet');
        console.log("Checking embedded wallet...", { 
          embeddedWallet: embeddedWallet?.address,
          walletType: embeddedWallet?.walletClientType
        });
        
        if (!embeddedWallet?.address) {
          console.log("Embedded wallet not available");
          // Need to create or get embedded wallet
          setStatus('need-embedded-wallet');
          processingRef.current = false;
          return;
        }
        
        console.log("Embedded wallet available:", embeddedWallet.address);
        // Embedded wallet is available, proceed to check character
        await checkCharacter();
      } catch (error) {
        console.error("Error checking embedded wallet:", error);
        setError("Failed to check embedded wallet");
        setStatus('error');
        processingRef.current = false;
      }
    }
    
    async function checkCharacter() {
      try {
        setStatus('checking-character');
        console.log("Checking for character...");
        
        // Try to get character ID if it's not already in state
        const charId = characterId || await getPlayerCharacterID(injectedWallet?.address || '');
        console.log("Character check result:", { characterId: charId });
        
        if (!charId) {
          console.log("No character found, redirecting to character creation");
          // No character found, redirect to character creation
          setStatus('redirecting');
          router.push('/create');
          processingRef.current = false;
          return;
        }
        
        console.log("Character found with ID:", charId);
        // Character exists, check if session key is correct
        await checkSessionKey(charId);
      } catch (error) {
        console.error("Error checking character:", error);
        setError("Failed to check character");
        setStatus('error');
        processingRef.current = false;
      }
    }
    
    async function checkSessionKey(charId: string) {
      try {
        // Skip if a transaction has already been sent
        if (transactionSentRef.current) {
          console.log("Transaction already sent, skipping session key check");
          return;
        }
        
        setStatus('checking-session-key');
        console.log("Checking session key for character:", charId);
        
        // Create a provider and contract instance for read-only operations
        const provider = new ethers.JsonRpcProvider("https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24");
        
        const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0xbD4511F188B606e5a74A62b7b0F516d0139d76D5";
        const ENTRYPOINT_ABI = [
          "function getCurrentSessionKey(bytes32 characterID) public view returns (tuple(address key, uint64 expiration) sessionKey)",
          "function shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)"
        ];
        
        // Create a read-only contract
        const contract = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, provider);
        
        // Get the current session key
        const sessionKeyInfo = await contract.getCurrentSessionKey(charId);
        console.log("Session key info from direct contract call:", sessionKeyInfo);
        
        if (!sessionKeyInfo) {
          setError("Failed to get current session key from contract");
          setStatus('error');
          processingRef.current = false;
          return;
        }
        
        const currentSessionKey = sessionKeyInfo.key;
        console.log("Current session key:", currentSessionKey);
        console.log("Embedded wallet address:", embeddedWallet?.address);
        
        // Make sure embedded wallet is defined
        if (!embeddedWallet?.address) {
          setError("Embedded wallet not available");
          setStatus('error');
          processingRef.current = false;
          return;
        }
        
        // Check if current session key matches the embedded wallet
        if (currentSessionKey.toLowerCase() !== embeddedWallet.address.toLowerCase()) {
          console.log("Session key mismatch. Updating session key...");
          console.log("Current session key:", currentSessionKey);
          console.log("Embedded wallet address:", embeddedWallet.address);
          
          // Skip if a transaction has already been sent
          if (transactionSentRef.current) {
            console.log("Transaction already sent, skipping update");
            return;
          }
          
          // Session key needs to be updated
          await updateSessionKeyOnce(charId);
        } else {
          console.log("Session key already matches embedded wallet!");
          // All checks passed, redirect to game
          setStatus('redirecting');
          router.push('/game');
          processingRef.current = false;
        }
      } catch (error) {
        console.error("Error checking session key:", error);
        setError("Failed to verify session key: " + ((error as Error)?.message || "Unknown error"));
        setStatus('error');
        processingRef.current = false;
      }
    }
    
    async function updateSessionKeyOnce(charId: string) {
      // Absolutely prevent sending multiple transactions
      if (transactionSentRef.current) {
        console.log("PREVENTING DUPLICATE TRANSACTION: Transaction already sent");
        return;
      }
      
      try {
        // Set flag immediately to prevent multiple transactions
        transactionSentRef.current = true;
        console.log("Setting transaction sent flag to prevent duplicates");
        
        setStatus('updating-session-key');
        
        // We need the owner wallet (injected wallet) to update session keys
        if (!injectedWallet?.signer) {
          throw new Error("Owner wallet not available for session key update");
        }
        
        const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0xbD4511F188B606e5a74A62b7b0F516d0139d76D5";
        const MAX_SAFE_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
        
        // Create provider for read-only operations to get recommended balance
        const provider = new ethers.JsonRpcProvider("https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24");
        const readContract = new ethers.Contract(
          ENTRYPOINT_ADDRESS,
          ["function shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)"],
          provider
        );
        
        // Get recommended balance
        console.log("Getting recommended balance for character:", charId);
        let recommendedBalance;
        try {
          recommendedBalance = await readContract.shortfallToRecommendedBalanceInMON(charId);
          console.log("Recommended balance from contract:", recommendedBalance.toString());
        } catch (balanceError) {
          console.error("Error getting recommended balance:", balanceError);
          // Default to a small amount if we can't get the recommended balance
          recommendedBalance = ethers.parseEther("0.0001");
        }
        
        // Ensure we're sending at least some ETH
        const valueToSend = recommendedBalance.toString() === "0" 
          ? ethers.parseEther("0.0001") 
          : recommendedBalance;
        
        console.log(`Using ETH value for transaction: ${ethers.formatEther(valueToSend)} ETH`);
        
        // Safety check for embedded wallet
        if (!embeddedWallet?.address) {
          throw new Error("Embedded wallet not available for session key update");
        }

        // Try a more direct approach using Contract instead of manual encoding
        console.log("Creating contract with signer:", await injectedWallet.signer.getAddress());
        
        // Use the Contract approach with the signer
        const contract = new ethers.Contract(
          ENTRYPOINT_ADDRESS,
          [
            "function updateSessionKey(bytes32 characterID, address sessionKey, uint256 sessionKeyDeadline) external payable returns (address previousKey, uint256 balanceOnPreviousKey)",
            "function shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)",
            "function updateSessionKey(address sessionKey, uint256 sessionKeyDeadline) external payable returns (address previousKey, uint256 balanceOnPreviousKey)",
          ],
          injectedWallet.signer
        );
        
        console.log("Contract created");
        
        // Check for gas limit - with proper null checks
        let gasLimit = BigInt(850000); // Default gas limit
        try {
          if (injectedWallet.signer.provider) {
            const gasEstimate = await injectedWallet.signer.provider.estimateGas({
              to: ENTRYPOINT_ADDRESS,
              value: valueToSend
            });
            console.log("Gas estimate:", gasEstimate.toString());
            
            // Use twice the estimated gas as the limit
            gasLimit = gasEstimate * BigInt(2);
          }
        } catch (gasError) {
          console.error("Error estimating gas:", gasError);
          // Continue with default gas limit
        }
        console.log("Using gas limit:", gasLimit.toString());
        
        // Try to call using the contract - first the version with character ID
        let tx;
        console.log(`Calling updateSessionKey with characterID: [${charId}, ${embeddedWallet.address}, ${MAX_SAFE_UINT256}]`);
        console.log(`Character ID Type: ${typeof charId}`);
        
        // Convert to bytes32 explicitly
        let cleanedCharId = charId;
        if (charId.startsWith('0x')) {
          cleanedCharId = charId;
        } else {
          cleanedCharId = '0x' + charId.padStart(64, '0');
        }
        console.log(`Cleaned character ID: ${cleanedCharId}`);
        
        // First try to use injected wallet's ethereum provider directly for more compatibility
        if (window.ethereum) {
          console.log("Using window.ethereum directly");
          
          try {
            // ABI encode the function call
            const abi = [
              "function updateSessionKey(bytes32 characterID, address sessionKey, uint256 sessionKeyDeadline) external payable returns (address previousKey, uint256 balanceOnPreviousKey)"
            ];
            const iface = new ethers.Interface(abi);
            const data = iface.encodeFunctionData("updateSessionKey", [
              cleanedCharId,
              embeddedWallet.address,
              MAX_SAFE_UINT256
            ]);
            
            // Send directly with ethereum provider
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const from = accounts[0];
            
            console.log("Sending transaction with eth_sendTransaction", {
              from,
              to: ENTRYPOINT_ADDRESS,
              value: "0x" + valueToSend.toString(16),
              data,
              gas: "0x" + (850000).toString(16)
            });
            
            const txHash = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [{
                from,
                to: ENTRYPOINT_ADDRESS,
                value: "0x" + valueToSend.toString(16),
                data,
                gas: "0x" + (850000).toString(16)
              }]
            });
            
            console.log("Transaction sent with hash:", txHash);
            
            // Wait for transaction receipt
            console.log("Waiting for transaction confirmation...");
            const receipt = await provider.waitForTransaction(txHash);
            console.log("Session key updated successfully:", receipt);
            
            // All done, redirect to game
            setStatus('redirecting');
            router.push('/game');
            return;
          } catch (directError) {
            console.error("Error using window.ethereum directly:", directError);
            // Fall back to using ethers
          }
        }
        
        // If direct ethereum approach fails, try the contract approach
        try {
          console.log("Trying contract approach...");
          
          // Directly execute the function with a specific overload
          tx = await contract["updateSessionKey(bytes32,address,uint256)"](
            cleanedCharId,
            embeddedWallet.address,
            MAX_SAFE_UINT256,
            {
              value: valueToSend,
              gasLimit: 850000
            }
          );
          
          console.log("Transaction sent via contract:", tx.hash);
        } catch (error) {
          console.error("Error with first approach:", error);
          
          // Try the simpler version with just session key and deadline
          console.log("Trying alternative updateSessionKey signature...");
          tx = await contract["updateSessionKey(address,uint256)"](
            embeddedWallet.address,
            MAX_SAFE_UINT256,
            {
              value: valueToSend,
              gasLimit: 850000
            }
          );
          
          console.log("Transaction sent via alternative method:", tx.hash);
        }
        
        // Wait for transaction to be mined
        console.log("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        console.log("Session key updated successfully:", receipt);
        
        // All done, redirect to game
        setStatus('redirecting');
        router.push('/game');
      } catch (error) {
        console.error("Error updating session key:", error);
        
        // Try to extract error details
        if ((error as any)?.receipt) {
          console.error("Transaction receipt:", (error as any).receipt);
        }
        
        // Extract more detailed revert reason if possible
        try {
          if ((error as any)?.data) {
            console.error("Transaction error data:", (error as any).data);
          }
          
          if ((error as any)?.error?.data) {
            const data = (error as any).error.data;
            console.error("Transaction error.data:", data);
            
            // Try to decode error data if it looks like a revert string
            if (typeof data === 'string' && data.startsWith('0x08c379a0')) {
              // This is the signature of Error(string)
              const decodedError = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + data.substring(10));
              console.error("Decoded revert reason:", decodedError[0]);
            }
          }
          
          // Log detailed transaction information
          if ((error as any)?.transaction) {
            console.error("Transaction object:", (error as any).transaction);
            console.error("Transaction data field:", (error as any).transaction.data);
          }
        } catch (decodeError) {
          console.error("Error extracting revert reason:", decodeError);
        }
        
        setError("Failed to update session key: " + ((error as Error)?.message || "Unknown error"));
        setStatus('error');
      } finally {
        processingRef.current = false;
        // Keep transactionSentRef.current as true to prevent future attempts
      }
    }
    
    // Start the initialization flow
    initializeGame();
    
    // Cleanup function
    return () => {
      console.log("Cleaning up GameInitializer component");
    };
  }, [
    injectedWallet, 
    embeddedWallet, 
    characterId, 
    getPlayerCharacterID, 
    router
  ]);
  
  // Handle connecting the owner wallet (MetaMask)
  const handleConnectOwnerWallet = async () => {
    try {
      setStatus('connecting-owner-wallet');
      await connectMetamask();
    } catch (error) {
      console.error("Error connecting owner wallet:", error);
      setError("Failed to connect owner wallet");
      setStatus('error');
    }
  };
  
  // Handle creating or connecting embedded wallet
  const handleConnectEmbeddedWallet = async () => {
    try {
      setStatus('connecting-embedded-wallet');
      await connectPrivyEmbedded();
    } catch (error) {
      console.error("Error connecting embedded wallet:", error);
      setError("Failed to connect embedded wallet");
      setStatus('error');
    }
  };
  
  // Loading spinner with descriptive text
  if (status.startsWith('checking') || status === 'updating-session-key' || status === 'redirecting') {
    const messageMap: Record<string, string> = {
      'checking': 'Initializing game...',
      'checking-owner-wallet': 'Checking if owner wallet is connected...',
      'checking-embedded-wallet': 'Checking if session key is available...',
      'checking-character': 'Checking if character exists...',
      'checking-session-key': 'Verifying session key...',
      'updating-session-key': 'Updating session key...',
      'redirecting': 'Loading game...',
    };
    
    return (
      <Center height="80vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.400" />
          <Text color="white">{messageMap[status] || 'Loading...'}</Text>
        </VStack>
      </Center>
    );
  }
  
  // Error state
  if (status === 'error') {
    return (
      <Center height="80vh">
        <VStack spacing={4}>
          <Text color="red.400" fontSize="xl">Error: {error}</Text>
          <Button 
            colorScheme="blue" 
            onClick={() => {
              // Reset the transaction flag on retry
              transactionSentRef.current = false;
              processingRef.current = false;
              window.location.reload();
            }}
          >
            Try Again
          </Button>
        </VStack>
      </Center>
    );
  }
  
  // Need to connect owner wallet
  if (status === 'need-owner-wallet') {
    return (
      <Center height="80vh">
        <VStack spacing={6}>
          <Text color="white" fontSize="xl">Please connect your owner wallet to continue</Text>
          <Button 
            colorScheme="blue" 
            size="lg"
            onClick={handleConnectOwnerWallet}
          >
            Connect Owner Wallet (MetaMask)
          </Button>
        </VStack>
      </Center>
    );
  }
  
  // Need to connect embedded wallet
  if (status === 'need-embedded-wallet') {
    return (
      <Center height="80vh">
        <VStack spacing={6}>
          <Text color="white" fontSize="xl">Please set up your session key to continue</Text>
          <Button 
            colorScheme="purple" 
            size="lg"
            onClick={handleConnectEmbeddedWallet}
          >
            Set Up Session Key
          </Button>
        </VStack>
      </Center>
    );
  }
  
  // Default fallback - should not reach here
  return (
    <Center height="80vh">
      <Spinner size="xl" color="blue.400" />
    </Center>
  );
} 