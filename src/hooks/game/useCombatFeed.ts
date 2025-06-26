import { useMemo } from "react";
import type { EventMessage } from "@/types/domain/dataFeed";
import { enrichLog, type LogEntryRaw, type LogEntryRich } from "@/utils/log-builder";

export function useCombatFeed(rawLogs: EventMessage[], playerIndex?: number | null, playerWeaponName?: string, currentAreaId?: bigint, playerCharacterName?: string): LogEntryRich[] {
  return useMemo(
    () => rawLogs.map((log) => enrichLog(log as LogEntryRaw, playerIndex, playerWeaponName, currentAreaId, playerCharacterName)),
    [rawLogs, playerIndex, playerWeaponName, currentAreaId, playerCharacterName]
  );
}