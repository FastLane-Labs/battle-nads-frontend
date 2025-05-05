# BattleNads Frontend Gap Analysis

This document provides a systematic analysis of the current BattleNads frontend implementation against the smart contract game design document to identify missing features, functionality gaps, and opportunities for improvement.

## Step 1: Current Frontend Assessment

1.  **Screenshots and UI inventory**:
    *   **Create Character Screen:**
        *   Input for character name.
        *   Stat allocation UI (+/- buttons, current value display) for Strength, Vitality, Dexterity, Quickness, Sturdiness, Luck.
        *   Displays "Points Remaining".
        *   "Create Character" button.
        *   Link/button for "Already Created? Lookup by Transaction".
        *   Header with Logo, Session Key info, Wallet Address, Disconnect button, Settings icon.
    *   **Game Screen:**
        *   **Game Map:** Grid-based area view, shows player position (blue square), current level indicator.
        *   **Character Info Panel:** Displays Name, Health bar (current/max), Stats (Str, Vit, Dex, Qui, Stu, Luc), Equipment (Weapon, Armor - showing names/stats?), Progress (Experience bar), Level, shMON balance.
        *   **Event Log Panel:** Currently shows "No events yet".
        *   **Movement Panel:** Directional buttons (Up, Down, Left, Right).
        *   **Combat Panel:** Shows current target ("Venomous Snail" with health bar), Attack button.
        *   **Chat Panel:** Input field ("Type your message..."), Send button.
        *   **Gas Balances Panel:** Session Key Balance, Committed Balance (shMON), Owner Wallet Balance (MON).
        *   **Overall Layout:** Multi-panel dashboard style.

2.  **Current feature inventory** (Inferred from UI and Architecture):
    *   Wallet Connection (Privy/WalletProvider).
    *   Character Creation UI (Input/Stat Allocation).
    *   Basic Game View Layout.
    *   Character Stat Display.
    *   Health/XP Bar Display.
    *   Equipment Name Display (basic).
    *   Game Map/Minimap Display (basic player position).
    *   Movement Controls UI.
    *   Basic Combat Target Display and Attack Button UI.
    *   Chat Input UI.
    *   Event Log Area UI (empty).
    *   Wallet/Session Key/Bonded Balance Display (`WalletBalances` component, `useWalletBalances` hook).
    *   Polling for UI Snapshot (`useUiSnapshot`, `useBattleNads`).
    *   Session Key state management (`useSessionKey`, `useGameMachine`).
    *   Debug Panel (`DebugPanel.tsx`).

3.  **User flows**:
    *   Connect Wallet -> Create Character (UI exists, backend call likely via `CharacterCreation` component).
    *   Connect Wallet -> View Existing Character -> Enter Game View.
    *   In Game: View Stats -> View Map -> Use Movement Controls -> View Target -> Use Attack Button -> View Balances -> Use Chat Input.

4.  **Technical implementation details**:
    *   **Stack:** Next.js 14, React 18, TypeScript 5, Privy Auth, Tailwind CSS, Chakra UI, TanStack Query v5, XState 5, ethers v6.
    *   **Architecture:** App Router layout, components organized by feature (auth, characters, common, game), custom hooks for blockchain interaction (`useBattleNadsClient`), game state (`useBattleNads`, `useUiSnapshot`, `useCachedDataFeed`), specific features (`useCharacter`, `useCombat`, `useEquipment`, `useChat`, `useGame`, `useGameMachine`), session management (`useSessionKey`, `useSessionFunding`), data mapping layers (`mappers`), state machines (`machines/gameStateMachine.ts`), providers (`AuthProvider`, `WalletProvider`).
    *   **Key Decisions:** Centralized polling via `useUiSnapshot`, caching via TanStack Query and `useCachedDataFeed`, state orchestration via `useGame` and `useGameMachine`, distinct client adapters (`read`, `owner`, `session`) via `useBattleNadsClient`.

## Step 2: Gap Analysis Based on Game Design Document

**Character Creation & Management**
*   [✅] Character creation form with name input and stat allocation (must sum to 32, min 3 per stat) - *UI exists, validation likely handled by `CharacterCreation.tsx` / contract.*
*   [❌] Class visualization based on stat allocation - *No indication of class being displayed during creation.*
*   [✅] Display of character ID and all character attributes - *Game view shows attributes. Architecture implies ID is managed (`useCharacter`, `useBattleNads`).*
*   [🟡] Stat reallocation interface for unspent points - *Game design mentions `allocatePoints` function. No UI visible for this specifically, but structure exists (`useBattleNads`, potentially `CharacterInfo` component).*
*   [🟡] Equipment management UI (inventory view, equip/unequip functionality) - *Game view shows equipped items. Architecture has `useEquipment`, `equipableWeapon/ArmorIDs` in poll data. No explicit inventory view or equip/unequip controls visible.*
*   [✅] Character status visualization (health, buffs/debuffs, combat status) - *Health shown. Architecture includes buffs/debuffs in data structures (`BattleNadStats`, `BattleNadLite`), implying display capability, though not explicitly visible in the static screenshot.*

**Game State Visualization**
*   [✅] Location display (depth, x, y coordinates) - *Level (depth) shown. Coordinates likely available via `useBattleNads` but not explicitly displayed on the main game UI.*
*   [🟡] Area view showing other combatants and non-combatants - *Map shows player. Architecture (`useUiSnapshot` -> `combatants`, `noncombatants`) provides data. Map component (`GameBoard.tsx`) needs implementation to render others.*
*   [🟡] Visualization of each entity's class, health, level, status effects - *Combat panel shows target health. Data is available (`BattleNadLite` includes class, health, level, status), but rendering logic might be incomplete, especially on the map.*
*   [✅] Combat targeting interface (selecting by index) - *Combat panel shows a target. `useCombat` hook and `attack` function use `targetIndex`. Actual selection mechanism (click on map?) not fully clear but backend support exists.*
*   [❌] Ability cooldown timers and availability indicators - *No UI visible. Game design requires `useAbility` calls and tracking cooldowns (`AbilityTracker`, `abilityTargetBlock`).*

**Movement & Interaction**
*   [✅] Cardinal direction movement controls - *Visible in Movement Panel.*
*   [✅] Combat initiation controls - *Attack button visible.*
*   [❌] Ability selection and targeting interface - *No UI visible for selecting/using abilities.*
*   [✅] Zone chat functionality - *Chat input/send button visible. `useChat` hook exists.*

**Asynchronous Game Flow**
*   [❌] Task status visualization (pending spawn, combat turns, abilities) - *No UI visible. Data might be partly available (`activeTask`, `activeAbility` in `BattleNad`) but needs rendering.*
*   [❌] Cooldown timers for actions - *Related to ability/task visualization, not visible.*
*   [✅] Polling implementation for game state updates - *Core feature (`useUiSnapshot`).*
*   [🟡] Event listening for immediate feedback - *Game design recommends this. No explicit confirmation in architecture, but possible to add.*

**Asset Management**
*   [✅] MON/shMON balance display - *Visible in Gas Balances Panel (`WalletBalances` component).*
*   [🟡] Session key management interface - *Balance shown. Architecture has `useSessionKey` / `useSessionFunding` hooks. Full UI for creation/update/expiration likely missing (needs dedicated page/modal).*
*   [🟡] Gas replenishment prompts and interface - *Architecture calculates shortfall (`balanceShortfall`, `useWalletBalances`). Prompting logic and funding UI likely needed.*
*   [✅] Inventory shMON balance display - *Visible in Character Info Panel.*

**Game Logs & History**
*   [🟡] Combat log visualization - *Event Log panel exists. Data available via `pollForFrontendData` -> `dataFeeds`. Needs rendering logic.*
*   [❌] Movement history - *Data potentially available in `dataFeeds` (if logged), needs filtering/rendering.*
*   [🟡] Chat history - *Chat Panel exists. Data available via `pollForFrontendData` -> `dataFeeds`. Needs rendering logic.*
*   [🟡] Experience and level-up events - *XP bar shown. Event Log needs to render level-up events from `dataFeeds`.*

**Advanced Features**
*   [❌] Monster and boss visualization - *Basic target shown. Specific visualization for different monsters/bosses likely missing.*
*   [❌] Death and revival flows - *Core game mechanic, but no UI/handling described or visible.*
*   [❌] Sepukku functionality - *Contract function exists, no UI.*
*   [❌] Depth/dungeon progression visualization - *Level shown. No specific UI for visualizing dungeon layout or progression between depths.*

## Step 3: Technical Implementation Gaps

*   [✅] Integration with smart contract entry points - *`useBattleNadsClient` facade exists for read/owner/session calls.*
*   [✅] Polling mechanism for `pollForFrontendData` - *Implemented via `useUiSnapshot`.*
*   [🟡] Event listeners for real-time updates - *Recommended by design docs, potentially not yet implemented.*
*   [🟡] Session key management implementation - *Hooks exist (`useSessionKey`, `useSessionFunding`), but full UI flow might be missing.*
*   [✅] Gas abstraction handling - *Core part of the architecture (`useBattleNadsClient` session adapter, `useSessionKey`).*
*   [🟡] Error handling for failed transactions - *Architecture suggests improvements (Error Boundaries, custom errors). Current implementation level unclear.*
*   [❌] Cooldown management and visualization - *Needs frontend logic to track `targetBlock` from data and display timers/availability.*

## Step 4: User Experience Considerations

*   [❌] Onboarding flow for new players - *Beyond 'Create Character', no guided onboarding evident.*
*   [❌] Tutorial or guidance system - *Not evident.*
*   [🟡] Loading states and transaction feedback - *Likely basic handling via React Query, but explicit visualization of async task progress is missing.*
*   [?] Mobile responsiveness - *Cannot assess from screenshots/docs.*
*   [?] Accessibility considerations - *Cannot assess from screenshots/docs.*
*   [✅] Visual design alignment with game theme - *Screenshots show a consistent dark, fantasy RPG theme.*

## Step 5: Prioritization Framework

| Gap                                          | Criticality | Dependency | Complexity | User Impact | Notes                                                    |
| :------------------------------------------- | :---------- | :--------- | :--------- | :---------- | :------------------------------------------------------- |
| **Character/Management**                     |             |            |            |             |                                                          |
| Class visualization (Create)                 | Low         | Low        | Low        | Low         | Flavor, doesn't block creation.                          |
| Stat reallocation UI                         | Med         | Low        | Med        | Med         | Core progression mechanic.                               |
| Equipment Inventory/Management UI            | Med         | Low        | Med        | High        | Core RPG element.                                        |
| **Game State Visualization**                 |             |            |            |             |                                                          |
| Area view (others)                           | High        | Med        | Med        | High        | Essential for awareness/targeting.                       |
| Entity details (class, status)               | Med         | Low        | Med        | Med         | Important combat context.                                |
| Ability Cooldown/Availability UI             | High        | Low        | Med        | High        | Essential for using abilities effectively.               |
| **Movement & Interaction**                   |             |            |            |             |                                                          |
| Ability Selection/Targeting UI               | High        | Low        | Med        | High        | Core combat mechanic.                                    |
| **Async Flow**                               |             |            |            |             |                                                          |
| Task/Cooldown Visualization                  | Med         | Low        | Med        | Med         | Improves understanding of async nature.                  |
| Event Listening                              | Low         | Low        | Med        | Med         | UX refinement, polling is the fallback.                  |
| **Asset Management**                         |             |            |            |             |                                                          |
| Session Key Management UI                    | High        | Low        | Med        | High        | Essential for gas abstraction usability.                 |
| Gas Replenishment Prompts/UI                 | High        | Low        | Med        | High        | Prevents players from getting stuck.                     |
| **Logs & History**                           |             |            |            |             |                                                          |
| Combat/Event Log Rendering                   | High        | Low        | Med        | High        | Essential for understanding what happened.               |
| Chat History Rendering                       | Med         | Low        | Low        | Med         | Core social feature.                                     |
| **Advanced Features**                        |             |            |            |             |                                                          |
| Monster/Boss Visualization                   | Med         | Low        | Med-High   | Med         | Improves immersion/threat assessment.                    |
| Death/Revival Flow UI                        | High        | High       | Med        | High        | Fundamental game loop aspect (post-MVP).                 |
| Sepukku UI                                   | Low         | Low        | Low        | Low         | Niche utility.                                           |
| Depth Progression UI                         | Low         | Low        | Med        | Med         | Important for long-term sense of progress.               |
| **Technical Gaps**                           |             |            |            |             |                                                          |
| Robust Error Handling                        | Med         | Low        | Med        | Med         | Improves stability and user trust.                       |
| Cooldown Frontend Logic                      | High        | Med        | Med        | High        | Needed for Ability UI.                                   |
| **UX Considerations**                        |             |            |            |             |                                                          |
| Onboarding/Tutorial                          | Low         | Low        | High       | High        | Important for player retention (post-MVP).               |
| Loading/Tx Feedback (Async)                  | Med         | Low        | Med        | High        | Crucial for managing user expectations with async tasks. |

## Step 6: Implementation Roadmap

**MVP: Core Gameplay Loop Enablement**

1.  **Combat/Event Log Rendering:** Display basic logs from `dataFeeds`. *Criticality: High, Complexity: Med*
2.  **Area View (Combatants/Non-Combatants):** Render other entities on the map/list. *Criticality: High, Complexity: Med*
3.  **Session Key Management UI (Basic):** Allow creation/update/expiration view. *Criticality: High, Complexity: Med*
4.  **Gas Replenishment Prompts/UI (Basic):** Show warnings and allow funding. *Criticality: High, Complexity: Med*
5.  **Ability Cooldown/Frontend Logic:** Implement internal tracking. *Criticality: High, Complexity: Med*
6.  **Ability Selection/Targeting UI:** Basic interface to select and use abilities. *Criticality: High, Complexity: Med*
7.  **Chat History Rendering:** Display incoming chat messages. *Criticality: Med, Complexity: Low*
8.  **Loading/Tx Feedback (Async):** Basic indicators for pending actions. *Criticality: Med, Complexity: Med*

**Phase 2: Enhancements & Core RPG Features**

1.  **Equipment Inventory/Management UI:** Full interface to view and change gear. *Criticality: Med, Complexity: Med*
2.  **Stat Reallocation UI:** Interface to spend level-up points. *Criticality: Med, Complexity: Med*
3.  **Entity Details Visualization:** Show class, status effects clearly on map/target panel. *Criticality: Med, Complexity: Med*
4.  **Task/Cooldown Visualization:** Explicit timers/indicators for abilities/combat turns. *Criticality: Med, Complexity: Med*
5.  **Monster/Boss Visualization:** Distinct visuals for different enemies. *Criticality: Med, Complexity: Med-High*
6.  **Robust Error Handling:** Implement specific error displays and recovery options. *Criticality: Med, Complexity: Med*
7.  **Event Listening:** Add listeners for smoother real-time updates (supplement polling). *Criticality: Low, Complexity: Med*

**Phase 3: Advanced Features & Polish**

1.  **Death/Revival Flow UI:** Handle character death screen, potentially character selection/creation redirect. *Criticality: High (for full loop), Complexity: Med*
2.  **Depth Progression UI:** Visual cues or map changes for moving between dungeon levels. *Criticality: Low, Complexity: Med*
3.  **Onboarding/Tutorial:** Guided experience for new players. *Criticality: Low (post-MVP), Complexity: High*
4.  **Class Visualization (Create):** Show class preview during creation. *Criticality: Low, Complexity: Low*
5.  **Sepukku UI:** Button/confirmation for the sepukku action. *Criticality: Low, Complexity: Low*
6.  **Mobile Responsiveness / Accessibility:** Address platform/user needs. *Criticality: ?, Complexity: Med-High* 