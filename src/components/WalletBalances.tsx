import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Text, 
  Flex, 
  Badge, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText,
  Button,
  Tooltip,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads } from '../hooks/useBattleNads';
import { useContracts } from '../hooks/useContracts';

// Simple ABI for the shMONAD contract with just the balanceOfBonded function
const SHMONAD_PARTIAL_ABI = [
  // Simple function signature for balanceOfBonded
  "function balanceOfBonded(uint64 policyID, address account) external view returns (uint256)"
];

const MONAD_RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds
const LOW_SESSION_KEY_THRESHOLD = 0.16; // Show direct funding button when balance is below 0.16 ETH
const DIRECT_FUNDING_AMOUNT = "0.3"; // Amount to transfer directly to session key

const WalletBalances: React.FC = () => {
  const { injectedWallet, embeddedWallet, sessionKey } = useWallet();
  const { 
    replenishGasBalance, 
    setSessionKeyToEmbeddedWallet, 
    getCurrentSessionKey,
    characterId
  } = useBattleNads();
  const { readContract, injectedContract } = useContracts();
  
  const [ownerBalance, setOwnerBalance] = useState<string>('0');
  const [sessionKeyBalance, setSessionKeyBalance] = useState<string>('0');
  const [bondedBalance, setBondedBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReplenishing, setIsReplenishing] = useState(false);
  const [isDirectFunding, setIsDirectFunding] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [shmonadAddress, setShmonadAddress] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState<bigint | null>(null);
  const [balanceShortfall, setBalanceShortfall] = useState<bigint | null>(null);
  
  const toast = useToast();

  // Get SHMONAD contract address and POLICY_ID once
  useEffect(() => {
    const fetchContractInfo = async () => {
      try {
        console.log("Fetching contract info for SHMONAD address and POLICY_ID...");
        console.log("Read contract available:", !!readContract);
        
        if (readContract) {
          // Debug readContract to understand its structure
          console.log("Contract object type:", Object.prototype.toString.call(readContract));
          console.log("Contract object keys:", Object.keys(readContract));
          
          // Try to inspect runner which is often used in ethers.js v6 for contract functions
          if (readContract.runner) {
            console.log("Contract runner is available");
            console.log("Runner type:", typeof readContract.runner);
            
            if (typeof readContract.runner === 'object' && readContract.runner !== null) {
              console.log("Runner keys:", Object.keys(readContract.runner));
            }
          }
          
          // Inspect the interface
          if (readContract.interface) {
            console.log("Contract interface available");
            
            // Check if interface has functions
            const functionFragments = readContract.interface.fragments.filter((fragment: any) => {
              return fragment.type === 'function';
            });
            
            console.log("Total function fragments:", functionFragments.length);
            
            // Look specifically for SHMONAD and POLICY_ID functions
            const shmonadFunctions = functionFragments.filter((fragment: any) => {
              return fragment.name?.toLowerCase() === 'shmonad';
            });
            
            const policyFunctions = functionFragments.filter((fragment: any) => {
              return fragment.name?.toLowerCase() === 'policy_id';
            });
            
            console.log("SHMONAD functions found:", shmonadFunctions.length);
            console.log("POLICY_ID functions found:", policyFunctions.length);
            
            // If found, log their details
            if (shmonadFunctions.length > 0) {
              console.log("SHMONAD function details:", shmonadFunctions[0]);
            }
            
            if (policyFunctions.length > 0) {
              console.log("POLICY_ID function details:", policyFunctions[0]);
            }
          }
          
          // Check what contract methods we can call
          console.log("Checking available contract methods...");
          
          // Get all methods on the contract object
          const allMethods = Object.getOwnPropertyNames(
            Object.getPrototypeOf(readContract)
          ).filter(name => {
            const descriptor = Object.getOwnPropertyDescriptor(
              Object.getPrototypeOf(readContract), name
            );
            return descriptor && typeof descriptor.value === 'function';
          });
          
          console.log("Contract prototype methods:", allMethods);
          
          // Check for getter methods
          const allProps = [];
          try {
            for (const key in readContract) {
              allProps.push(key);
            }
            console.log("All enumerable properties:", allProps);
          } catch (e) {
            console.log("Error enumerating properties:", e);
          }
          
          // Try to call SHMONAD and POLICY_ID as functions
          try {
            console.log("Calling contract for state variables...");
            
            try {
              // Try getFunction from the interface if available
              if (readContract.interface && typeof readContract.interface.getFunction === 'function') {
                console.log("Testing interface.getFunction('SHMONAD')");
                const shmonadFunc = readContract.interface.getFunction('SHMONAD');
                console.log("SHMONAD function:", shmonadFunc);
                
                if (shmonadFunc) {
                  console.log("Trying to call function via interface");
                  // This might not work directly but worth debugging
                }
              }
            } catch (funcErr) {
              console.log("Error getting function:", funcErr);
            }
            
            // Try direct call
            try {
              console.log("Trying direct call: await readContract.SHMONAD()");
              const shmonadResult = await readContract.SHMONAD();
              console.log("SHMONAD direct result:", shmonadResult);
              
              if (shmonadResult && typeof shmonadResult === 'string' && 
                  shmonadResult.startsWith('0x') && shmonadResult.length === 42) {
                console.log("✅ Valid SHMONAD address found:", shmonadResult);
                setShmonadAddress(shmonadResult);
              }
            } catch (callErr: any) {
              console.log("Direct call error:", callErr.message);
            }
            
            // Try for POLICY_ID
            try {
              console.log("Trying direct call: await readContract.POLICY_ID()");
              const policyResult = await readContract.POLICY_ID();
              console.log("POLICY_ID direct result:", policyResult);
              
              if (policyResult) {
                try {
                  const policyBigInt = BigInt(policyResult.toString());
                  console.log("✅ POLICY_ID converted to BigInt:", policyBigInt.toString());
                  setPolicyId(policyBigInt);
                } catch (conversionError) {
                  console.error("Failed to convert POLICY_ID to BigInt:", conversionError);
                }
              }
            } catch (policyErr: any) {
              console.log("POLICY_ID call error:", policyErr.message);
            }
          } catch (accessError: any) {
            console.error("Error accessing contract methods:", accessError.message);
          }
        } else {
          console.error("❌ readContract is not available");
          
          // Log injectedContract status as well
          console.log("Injected contract available:", !!injectedContract);
          if (injectedContract) {
            console.log("Injected contract keys:", Object.keys(injectedContract));
            
            // Safely access any address property
            if (typeof injectedContract === 'object') {
              const injectedAddress = 
                'target' in injectedContract && 
                typeof injectedContract.target === 'object' && 
                injectedContract.target !== null && 
                'address' in injectedContract.target ? 
                  injectedContract.target.address : 
                  ('address' in injectedContract ? injectedContract.address : null);
              
              console.log("Injected contract address:", injectedAddress);
            }
          }
        }
      } catch (error: any) {
        console.error("Error in fetchContractInfo:", error);
        console.error("Stack trace:", error.stack);
      }
    };
    
    fetchContractInfo();
  }, [readContract, injectedContract]);

  // Function to fetch the MON balances
  const fetchBalances = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Log current state of our required parameters
      console.log("Current parameter state at fetchBalances:");
      console.log("- SHMONAD address:", shmonadAddress || "not set");
      console.log("- POLICY_ID:", policyId ? policyId.toString() : "not set");
      console.log("- injectedWallet.address:", injectedWallet?.address || "not set");
      
      // Create provider for balance checks
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      console.log("Provider created with URL:", MONAD_RPC_URL);
      
      // Get owner wallet balance
      if (injectedWallet?.address) {
        const balance = await provider.getBalance(injectedWallet.address);
        setOwnerBalance(ethers.formatEther(balance));
        console.log("Owner balance updated:", ethers.formatEther(balance));
        
        // Fetch bonded shMONAD balance
        try {
          if (!shmonadAddress) {
            console.error("❌ SHMONAD address is not set");
            setBondedBalance("Address not set");
            return;
          }
          
          if (policyId === null) {
            console.error("❌ POLICY_ID is not set");
            setBondedBalance("Policy ID not set");
            return;
          }
          
          // Ensure contract address is valid and normalized
          let normalizedAddress;
          try {
            normalizedAddress = ethers.getAddress(shmonadAddress); // This normalizes the address case
            console.log("Normalized SHMONAD address:", normalizedAddress);
          } catch (addrError) {
            console.error("❌ Invalid SHMONAD address format:", addrError);
            setBondedBalance("Invalid address");
            return;
          }
          
          console.log("Fetching bonded balance with:");
          console.log("- SHMONAD address:", normalizedAddress);
          console.log("- POLICY_ID:", policyId.toString());
          console.log("- Owner address:", injectedWallet.address);
          
          // Create a new contract instance
          console.log("Creating SHMONAD contract instance...");
          const shmonadContract = new ethers.Contract(
            normalizedAddress,
            SHMONAD_PARTIAL_ABI,
            provider
          );
          
          // Log available methods on the contract
          console.log("SHMONAD contract methods:", 
            Object.keys(shmonadContract)
              .filter(k => typeof shmonadContract[k] === 'function')
              .join(", ")
          );
          
          // Verify the contract has our method before calling
          if (typeof shmonadContract.balanceOfBonded !== 'function') {
            console.error("❌ balanceOfBonded function not found on contract");
            setBondedBalance("Function not found");
            return;
          }
          
          // Analyze policyId more carefully 
          console.log("policyId type:", typeof policyId);
          console.log("policyId toString:", policyId.toString());
          console.log("policyId value:", policyId);
          
          // Try to ensure policyId is a proper uint64
          let policyIdFormatted;
          try {
            // ethers v6 handles BigInt natively, but we'll ensure it's in the right range for uint64
            // uint64 max value: 18446744073709551615
            const MAX_UINT64 = BigInt("18446744073709551615");
            
            if (policyId > MAX_UINT64) {
              console.warn("Policy ID exceeds uint64 max value, will use modulo");
              policyIdFormatted = policyId % MAX_UINT64;
            } else {
              policyIdFormatted = policyId;
            }
            
            console.log("policyIdFormatted:", policyIdFormatted.toString());
          } catch (formatError) {
            console.error("Error formatting policyId:", formatError);
            policyIdFormatted = policyId; // Fallback to original value
          }
          
          // Directly log the function we're about to call
          console.log(`About to call: shmonadContract.balanceOfBonded(${policyIdFormatted.toString()}, "${injectedWallet.address}")`);
          
          // Try with direct parameter formatting first
          console.log("Trying direct contract call...");
          try {
            // Call balanceOfBonded with proper parameter types
            const bondedBalanceResult = await shmonadContract.balanceOfBonded(
              policyIdFormatted,
              injectedWallet.address
            );
            
            console.log("Raw bonded balance result:", bondedBalanceResult, "type:", typeof bondedBalanceResult);
            
            if (bondedBalanceResult !== undefined) {
              const formattedBalance = ethers.formatEther(bondedBalanceResult);
              console.log("✅ Formatted bonded balance:", formattedBalance);
              setBondedBalance(formattedBalance);
            } else {
              console.error("❌ Bonded balance result is undefined");
              setBondedBalance("Error: undefined result");
            }
          } catch (directCallError: any) {
            console.error("❌ Direct contract call failed:", directCallError);
            console.error("Error details:", {
              message: directCallError.message,
              code: directCallError.code,
              data: directCallError.data
            });
            
            // Try with explicit encoding
            console.log("Trying with explicit parameter encoding...");
            try {
              // Create new interface for explicit encoding
              const iface = new ethers.Interface([
                "function balanceOfBonded(uint64,address) external view returns (uint256)"
              ]);
              
              // Explicitly encode the parameters
              const encodedData = iface.encodeFunctionData("balanceOfBonded", [
                policyIdFormatted,
                injectedWallet.address
              ]);
              
              console.log("Encoded function call data:", encodedData);
              
              // Make a direct call using the provider
              const callResult = await provider.call({
                to: normalizedAddress,
                data: encodedData
              });
              
              console.log("Raw call result:", callResult);
              
              if (callResult && callResult !== "0x") {
                const decodedResult = iface.decodeFunctionResult("balanceOfBonded", callResult);
                console.log("Decoded result:", decodedResult);
                
                const explicitBalance = ethers.formatEther(decodedResult[0]);
                console.log("✅ Explicit balance:", explicitBalance);
                setBondedBalance(explicitBalance);
              } else {
                throw new Error("Empty result from explicit call");
              }
            } catch (explicitError: any) {
              console.error("❌ Explicit encoding also failed:", explicitError);
              console.error("Error message:", explicitError.message);
              
              // Log as much detail as possible about the contract and parameters
              console.error("Contract details:", {
                address: normalizedAddress,
                policyId: policyIdFormatted.toString(),
                account: injectedWallet.address
              });
              
              // Check if the contract exists by getting its code
              try {
                const contractCode = await provider.getCode(normalizedAddress);
                console.log("Contract code length:", contractCode.length);
                if (contractCode === "0x" || contractCode === "0x0") {
                  console.error("❌ No contract exists at the provided address");
                  setBondedBalance("No contract");
                } else {
                  console.log("✅ Contract exists at address");
                  setBondedBalance("Error fetching");
                }
              } catch (codeError: any) {
                console.error("Failed to check contract code:", codeError);
                console.error("Error message:", codeError.message);
                setBondedBalance("Error fetching");
              }
            }
          }
        } catch (bondedError: any) {
          console.error("❌ Error fetching bonded balance:", bondedError);
          console.error("Error details:", {
            message: bondedError.message,
            code: bondedError.code,
            data: bondedError.data
          });
          setBondedBalance("Error fetching");
        }
      }
      
      // Get session key balance
      if (sessionKey) {
        const balance = await provider.getBalance(sessionKey);
        setSessionKeyBalance(ethers.formatEther(balance));
      } else if (embeddedWallet?.address) {
        const balance = await provider.getBalance(embeddedWallet.address);
        setSessionKeyBalance(ethers.formatEther(balance));
      }
      
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error in fetchBalances:', error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      toast({
        title: 'Error',
        description: `Failed to fetch wallet balances: ${error.message || String(error)}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [injectedWallet?.address, embeddedWallet?.address, sessionKey, toast, shmonadAddress, policyId]);

  // Function to replenish session key balance
  const handleReplenishBalance = async () => {
    try {
      setIsReplenishing(true);
      
      // First ensure session key is set to embedded wallet if needed
      if (!sessionKey && embeddedWallet?.address) {
        await setSessionKeyToEmbeddedWallet();
      }
      
      if (!injectedWallet?.address) {
        throw new Error('Owner wallet not connected. Please connect your wallet first.');
      }
      
      // Get owner balance
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const ownerBalanceWei = await provider.getBalance(injectedWallet.address);
      
      // Calculate replenish amount - use only the exact contract-reported shortfall
      let replenishAmount: string;
      
      if (balanceShortfall) {
        // Convert balanceShortfall to ethers (it's in wei)
        const shortfallEth = ethers.formatEther(balanceShortfall);
        console.log(`Balance shortfall: ${shortfallEth} ETH`);
        
        // Owner balance in ETH
        const ownerBalanceEth = ethers.formatEther(ownerBalanceWei);
        console.log(`Owner balance: ${ownerBalanceEth} ETH`);
        
        // Use the exact shortfall amount if owner has enough balance
        if (BigInt(ownerBalanceWei.toString()) < balanceShortfall) {
          // If owner has less than the shortfall, use almost all of owner's balance (leave some for gas)
          const safeBalance = ownerBalanceWei - ethers.parseEther("0.001"); // Leave 0.001 ETH for gas
          replenishAmount = safeBalance > 0 ? ethers.formatEther(safeBalance) : "0";
        } else {
          // Otherwise use the exact shortfall amount
          replenishAmount = shortfallEth;
          console.log(`Will replenish with ${replenishAmount} ETH`);
        }
      } else {
        // Error if no shortfall is detected but button was clicked
        throw new Error("No balance shortfall detected from contract");
      }
      
      // Don't proceed if amount is too small
      if (parseFloat(replenishAmount) < 0.001) {
        throw new Error("Replenish amount too small or wallet has insufficient funds");
      }
      
      // Replenish with calculated amount
      await replenishGasBalance(replenishAmount);
      
      toast({
        title: 'Success',
        description: `Session key balance replenished with ${replenishAmount} MON`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh balances and reset shortfall
      await fetchBalances();
      setBalanceShortfall(null);
      
    } catch (error: any) {
      console.error('Error replenishing balance:', error);
      toast({
        title: 'Error',
        description: `Failed to replenish balance: ${error.message || String(error)}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsReplenishing(false);
    }
  };

  // Function to directly fund session key from owner wallet
  const handleDirectFunding = async () => {
    try {
      setIsDirectFunding(true);
      
      // First ensure session key is set to embedded wallet if needed
      if (!sessionKey && embeddedWallet?.address) {
        await setSessionKeyToEmbeddedWallet();
      }
      
      if (!injectedWallet?.address) {
        throw new Error('Owner wallet not connected. Please connect your wallet first.');
      }
      
      if (!sessionKey) {
        throw new Error('Session key not set. Please set up a session key first.');
      }
      
      // Get owner balance
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const ownerBalanceWei = await provider.getBalance(injectedWallet.address);
      const ownerBalanceEth = ethers.formatEther(ownerBalanceWei);
      console.log(`Owner balance: ${ownerBalanceEth} ETH`);
      
      // Check if owner has enough balance
      const transferAmount = ethers.parseEther(DIRECT_FUNDING_AMOUNT);
      if (ownerBalanceWei < transferAmount + ethers.parseEther("0.001")) {
        throw new Error(`Insufficient funds in owner wallet. Need at least ${DIRECT_FUNDING_AMOUNT} ETH plus gas.`);
      }
      
      console.log(`Sending ${DIRECT_FUNDING_AMOUNT} ETH from ${injectedWallet.address} to ${sessionKey}`);
      
      // Create a transaction to send funds directly
      const tx = await injectedWallet.signer?.sendTransaction({
        to: sessionKey,
        value: transferAmount,
      });
      
      if (!tx) {
        throw new Error('Failed to send transaction - signer not available');
      }
      
      console.log(`Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`Transaction confirmed: ${receipt?.hash}`);
      
      toast({
        title: 'Success',
        description: `Successfully sent ${DIRECT_FUNDING_AMOUNT} ETH to your session key wallet`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh balances
      await fetchBalances();
      
    } catch (error: any) {
      console.error('Error in direct funding:', error);
      toast({
        title: 'Error',
        description: `Failed to fund session key: ${error.message || String(error)}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDirectFunding(false);
    }
  };

  // Fetch balances on component mount and when wallets change or contract info changes
  useEffect(() => {
    if (injectedWallet?.address || embeddedWallet?.address) {
      fetchBalances();
    }
  }, [injectedWallet?.address, embeddedWallet?.address, sessionKey, fetchBalances, shmonadAddress, policyId]);
  
  // Set up auto-refresh interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (injectedWallet?.address || embeddedWallet?.address) {
      // Add event listeners for balance updates from getFullFrontendData
      const handleSessionKeyBalanceUpdate = (event: any) => {
        if (event.detail && event.detail.balance) {
          console.log(`[WalletBalances] Received sessionKeyBalance update event: ${event.detail.balance}`);
          setSessionKeyBalance(ethers.formatEther(event.detail.balance));
          setLastUpdated(new Date());
        }
      };
      
      const handleBondedBalanceUpdate = (event: any) => {
        if (event.detail && event.detail.balance) {
          console.log(`[WalletBalances] Received bondedBalance update event: ${event.detail.balance}`);
          setBondedBalance(ethers.formatEther(event.detail.balance));
          setLastUpdated(new Date());
        }
      };
      
      // Add event listeners
      window.addEventListener('sessionKeyBalanceUpdated', handleSessionKeyBalanceUpdate);
      window.addEventListener('bondedBalanceUpdated', handleBondedBalanceUpdate);
      
      // Still keep the direct refresh as a fallback
      intervalId = setInterval(() => {
        fetchBalances();
      }, AUTO_REFRESH_INTERVAL);
      
      // Clean up event listeners and interval on component unmount
      return () => {
        window.removeEventListener('sessionKeyBalanceUpdated', handleSessionKeyBalanceUpdate);
        window.removeEventListener('bondedBalanceUpdated', handleBondedBalanceUpdate);
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [injectedWallet?.address, embeddedWallet?.address, fetchBalances]);

  // Check for balance shortfall periodically
  useEffect(() => {
    const checkBalanceShortfall = async () => {
      try {
        if (!readContract || !characterId) {
          return;
        }
        
        // Get session key balance directly for comparison
        const sessionBalanceValue = parseFloat(sessionKeyBalance);
        console.log(`Current session key balance: ${sessionBalanceValue} MON`);
        
        // Try to get shortfall data from contract
        const shortfall = await readContract.shortfallToRecommendedBalanceInMON(characterId);
        console.log(`Raw shortfall from contract: ${shortfall ? shortfall.toString() : 'null'}`);
        
        // Only use the contract-reported shortfall, no fallbacks
        if (shortfall && BigInt(shortfall.toString()) > BigInt(0)) {
          console.log(`Balance shortfall detected: ${ethers.formatEther(shortfall)} MON`);
          setBalanceShortfall(BigInt(shortfall.toString()));
        } else {
          console.log('No balance shortfall detected from contract');
          setBalanceShortfall(null);
        }
      } catch (error) {
        console.error("Error checking balance shortfall:", error);
      }
    };

    // Check balance shortfall whenever session balance changes
    checkBalanceShortfall();
    
    // Also set up a periodic check (less frequent than balance refresh)
    const shortfallIntervalId = setInterval(() => {
      if (injectedWallet?.address && characterId) {
        checkBalanceShortfall();
      }
    }, AUTO_REFRESH_INTERVAL * 2); // Check shortfall every 10 seconds
    
    return () => {
      clearInterval(shortfallIntervalId);
    };
  }, [injectedWallet?.address, characterId, readContract, lastUpdated, sessionKeyBalance]);

  if (isLoading) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800" color="white">
        <Flex justify="center" align="center" minH="100px">
          <Spinner mr={3} />
          <Text>Loading wallet balances...</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box p={3} borderWidth="1px" borderRadius="lg" bg="gray.800" color="white">
      <Text fontSize="md" fontWeight="bold" mb={2}>Gas Balances</Text>

      <Flex direction="column" gap={3}>
        {/* Session Key Wallet */}
        <Stat size="sm">
          <StatLabel>
            <Flex align="center" gap={1}>
              <Text fontSize="sm">Session Key</Text>
              <Badge colorScheme="purple" size="sm">MON</Badge>
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">{parseFloat(sessionKeyBalance).toFixed(4)} MON</StatNumber>
        </Stat>
        
        {/* Bonded shMONAD Balance */}
        <Stat size="sm">
          <StatLabel>
            <Flex align="center" gap={1}>
              <Text fontSize="sm">Bonded Balance</Text>
              <Badge colorScheme="orange" size="sm">shMONAD</Badge>
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">
            {bondedBalance === 'Not available yet' || 
             bondedBalance === 'Error fetching' || 
             bondedBalance === 'Address not set' || 
             bondedBalance === 'Policy ID not set' || 
             bondedBalance === 'Invalid address' || 
             bondedBalance === 'Function not found' || 
             bondedBalance === 'No contract' || 
             bondedBalance === 'Error: undefined result' ? 
              <Tooltip 
                label={`Error: ${bondedBalance}. Check console for details.`}
                hasArrow
                placement="top"
              >
                <Text color="red.300">{bondedBalance}</Text>
              </Tooltip> 
              : 
              `${parseFloat(bondedBalance).toFixed(4)} shMONAD`}
          </StatNumber>
        </Stat>

        {/* Direct Session Key Funding Button */}
        {sessionKey && parseFloat(sessionKeyBalance) < LOW_SESSION_KEY_THRESHOLD && (
          <Box 
            mt={1} 
            p={2} 
            bg="blue.100" 
            border="1px" 
            borderColor="blue.300" 
            borderRadius="md"
          >
            <Text fontWeight="bold" fontSize="sm" color="blue.800">
              Low Session Key Balance
            </Text>
            <Text fontSize="sm" color="blue.800" mb={2}>
              Your session key has less than {LOW_SESSION_KEY_THRESHOLD} MON. Send funds directly?
            </Text>
            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleDirectFunding}
              isLoading={isDirectFunding}
              loadingText="Sending..."
              width="full"
            >
              Send {DIRECT_FUNDING_AMOUNT} MON to Session Key
            </Button>
          </Box>
        )}

        {/* Balance Shortfall Warning */}
        {balanceShortfall && balanceShortfall > 0 && (
          <Box 
            mt={1} 
            p={2} 
            bg="yellow.100" 
            border="1px" 
            borderColor="yellow.300" 
            borderRadius="md"
          >
            <Text fontWeight="bold" fontSize="sm" color="yellow.800">
              Low Gas Balances
            </Text>
            <Text fontSize="sm" color="yellow.800" mb={2}>
              Your app-committed shMONAD balance is running low - gasless transactions may stop working.
            </Text>
            <Button
              colorScheme="yellow"
              size="sm"
              onClick={handleReplenishBalance}
              isLoading={isReplenishing}
              loadingText="Replenishing..."
              width="full"
            >
              Commit More ShMONAD
            </Button>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default WalletBalances; 