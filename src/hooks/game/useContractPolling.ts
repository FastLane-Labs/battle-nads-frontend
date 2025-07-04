import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { contract } from '../../types';
import { POLL_INTERVAL } from '../../config/env';
import { debugAbilityData, debugCombatantAbilities } from '../../debug/testAbilityData';

/**
 * Layer 1: Pure contract data polling
 * Focused only on fetching fresh contract data without transformations
 */
export const useContractPolling = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const { embeddedWallet } = useWallet();
  const requestCounterRef = React.useRef(0);

  return useQuery<contract.PollFrontendDataReturn, Error>({
    queryKey: ['contractPolling', owner, embeddedWallet?.address],
    enabled: !!owner && !!client,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: POLL_INTERVAL,
    
    queryFn: async () => {
      if (!client || !owner) throw new Error('Missing client or owner');
      
      requestCounterRef.current += 1;
      const startBlock = BigInt(requestCounterRef.current);
      
      const rawArrayData = await client.getUiSnapshot(owner, startBlock);
      const fetchTimestamp = Date.now();
      
      if (!rawArrayData || typeof (rawArrayData as any)[0] === 'undefined' || typeof (rawArrayData as any)[11] === 'undefined') {
        throw new Error("Invalid data structure received from getUiSnapshot");
      }
      
      const dataAsAny = rawArrayData as any;
      
      // Debug log raw character data
      console.log('[useContractPolling] Raw character data from contract:', {
        character: dataAsAny[2],
        activeAbility: dataAsAny[2]?.activeAbility,
        activeTask: dataAsAny[2]?.activeTask,
        stats: dataAsAny[2]?.stats
      });
      
      // Run detailed debug on ability data
      debugAbilityData(dataAsAny[2]);
      debugCombatantAbilities(dataAsAny[3]);
      
      return {
        characterID: dataAsAny[0],
        sessionKeyData: dataAsAny[1],
        character: dataAsAny[2],
        combatants: dataAsAny[3],
        noncombatants: dataAsAny[4],
        equipableWeaponIDs: dataAsAny[5],
        equipableWeaponNames: dataAsAny[6],
        equipableArmorIDs: dataAsAny[7],
        equipableArmorNames: dataAsAny[8],
        dataFeeds: dataAsAny[9] || [],
        balanceShortfall: dataAsAny[10],
        endBlock: dataAsAny[11],
        fetchTimestamp: fetchTimestamp,
      };
    },
    
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    structuralSharing: false
  });
};