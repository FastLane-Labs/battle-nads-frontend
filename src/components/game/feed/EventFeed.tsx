import React, { useMemo, useRef } from 'react';
import { Box, Heading, Text, Spinner, Center, VStack } from '@chakra-ui/react';
import { domain } from '@/types';
import { EventLogItemRenderer } from './EventLogItemRenderer';
import { useVirtualizer } from '@tanstack/react-virtual';

interface EventFeedProps {
  playerIndex: number | null;
  eventLogs: domain.EventMessage[];
  combatants: domain.CharacterLite[];
  isCacheLoading: boolean;
  // Add equipment names for lookup
  equipableWeaponIDs?: number[];
  equipableWeaponNames?: string[];
  equipableArmorIDs?: number[];
  equipableArmorNames?: string[];
}

const EventFeed: React.FC<EventFeedProps> = ({ 
  playerIndex,
  eventLogs,
  combatants, 
  isCacheLoading,
  equipableWeaponIDs,
  equipableWeaponNames,
  equipableArmorIDs,
  equipableArmorNames
}) => {
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter out chat messages (type 4) from event logs
  // Also filter out combat events with dead players
  const filteredEventLogs = useMemo(() => {
    return eventLogs.filter(event => {
      // Filter out chat messages (type 4)
      if (Number(event.type) === 4) {
        return false;
      }
      
      // Filter out combat events involving "Unnamed the Initiate"
      if ((Number(event.type) === 0 || Number(event.type) === 1) &&
          ((event.defender && event.defender.name?.includes("Unnamed the Initiate")) ||
           (event.attacker && event.attacker.name?.includes("Unnamed the Initiate")))) {
        return false;
      }
      
      // Keep all other events
      return true;
    });
  }, [eventLogs]);

  const rowVirtualizer = useVirtualizer({ 
    count: filteredEventLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });
  
  const combatantIds = useMemo(() => new Set(combatants.map(c => c.id)), [combatants]);

  // Create equipment name lookup functions
  const getWeaponName = useMemo(() => {
    return (weaponId: number): string => {
      if (!equipableWeaponIDs || !equipableWeaponNames) {
        return `Weapon ${weaponId}`;
      }
      
      // Convert weaponId to number if it's not already
      const numericWeaponId = Number(weaponId);
      
      // Find the index of this weapon ID in the array
      const index = equipableWeaponIDs.findIndex(id => Number(id) === numericWeaponId);
      
      if (index >= 0 && equipableWeaponNames[index]) {
        return equipableWeaponNames[index];
      }
      
      return `Weapon ${weaponId}`;
    };
  }, [equipableWeaponIDs, equipableWeaponNames]);

  const getArmorName = useMemo(() => {
    return (armorId: number): string => {
      if (!equipableArmorIDs || !equipableArmorNames) {
        return `Armor ${armorId}`;
      }
      
      // Convert armorId to number if it's not already
      const numericArmorId = Number(armorId);
      
      // Find the index of this armor ID in the array
      const index = equipableArmorIDs.findIndex(id => Number(id) === numericArmorId);
      
      if (index >= 0 && equipableArmorNames[index]) {
        return equipableArmorNames[index];
      }
      
      return `Armor ${armorId}`;
    };
  }, [equipableArmorIDs, equipableArmorNames]);

  return (
    <Box h="100%" display="flex" flexDirection="column">
      <h1 className='copper-text text-2xl font-bold tracking-tight text-center mb-2'>Event Log</h1>
      <Box 
        ref={parentRef}
        h="100%" 
        overflowY="auto" 
        className="bg-dark-brown rounded-lg border border-black/40 p-3 text-center"
      >
        {isCacheLoading ? (
          <Center h="100%">
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : (
          <>
            <Box 
              // height={`${rowVirtualizer.getTotalSize()}px`} 
              width="100%" 
              className='h-full min-h-full max-h-32'
            >
              {filteredEventLogs.length > 0 ? (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const event = filteredEventLogs[virtualRow.index];
                  if (!event) return null; 

                  const itemKey = `${event.timestamp}-${event.logIndex}-${virtualRow.index}`;
                  
                  let bgColor = "gray.700";
                  const involvesCombatant = 
                    (event.attacker && combatantIds.has(event.attacker.id)) || 
                    (event.defender && combatantIds.has(event.defender.id));
                  const isPlayerAction = !!playerIndex && event.attacker?.index === playerIndex;
                  
                  if (involvesCombatant) bgColor = "red.900"; 
                  if (isPlayerAction) bgColor = "blue.900";

                  return (
                    <Box 
                      key={itemKey} 
                      // top={0} 
                      // left={0} 
                      width="100%" 
                      // height={`${virtualRow.size}px`} 
                      // transform={`translateY(${virtualRow.start}px)`}
                      className='py-1'
                    >
                      <Box
                        // bg={bgColor} 
                        borderRadius="md" 
                        h="100%"
                      >
                        <EventLogItemRenderer 
                          event={event} 
                          playerIndex={playerIndex}
                          getWeaponName={getWeaponName}
                          getArmorName={getArmorName}
                        />
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <div className="flex items-center justify-center !h-full !w-full !min-h-full text-lg gold-text-light">
                  <Text>No events yet</Text>
                </div>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default EventFeed; 