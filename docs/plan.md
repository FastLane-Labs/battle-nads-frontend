---
title: Updated Battle-Nads Frontend — High-Level Execution Plan
---

# Updated Battle-Nads Frontend — High-Level Execution Plan

Based on the conversation logs, I've updated the roadmap to reflect the current priorities and deprioritized features. I've reorganized features according to the team's discussion about what's crucial for the MVP versus what can come later.

---

## 1. Guiding Principles

| Principle         | Rationale                                                                  |
|:------------------|:---------------------------------------------------------------------------|
| Gameplay First    | Ship a fully playable core loop (move → combat → loot → level-up).           |
| Single Source of Truth | Keep polling + query cache (`useUiSnapshot`) as the canonical data feed.     |
| Gas UX            | Session-key & funding flows must never block actions.                      |
| Async Visibility  | Players should always know why they're waiting (tasks, cooldowns).          |

---

## 2. Must-Have Features (MVP) - UPDATED

| # | Feature Group                   | Impact                               | Key User Story                                                                 |
|:--|:--------------------------------|:-------------------------------------|:-------------------------------------------------------------------------------|
| A | Combat & Event Log Rendering    | 🔥 Critical—explains what just happened -> ✅ Implemented | "After I attack, I want to see hits, crits, XP gained, and loot messages."       |
| B | Ability Use & Cooldown Indicators | 🔥 Core combat mechanic -> ✅ COMPLETE | "I can pick an ability, see if it's on cooldown, and know when it's ready."    |
| C | Session Key Management UI       | 🔥 Blocks every transaction -> ✅ Implemented | "I can create, view expiry/balance, and deactivate my session key."          |
| D | Gas / shMON Funding Prompts     | 🔥 Prevents soft-locks                 | "If my balances are low, I'm warned and can top-up in-app."                   |
| E | Async Feedback & Loading States | 🧭 Aligns expectations                 | "Whenever an action is pending (task queued), I see a spinner/progress badge." |
| F | Combat State Indicators         | 🔥 User awareness -> ✅ Implemented    | "I can see when I'm in combat and what actions are available to me."           |
| G | Equipment Inventory Management  | 🔥 Core gameplay mechanic -> ✅ Implemented | "I can equip items that I find or start with."                                 |

**Delivery Goal:** A player can create a character, explore, fight, manage equipment, and handle gas without leaving the browser.

---

## 3. Next-Wave Features (High ROI but Not Blocking MVP) - UPDATED

| # | Feature Group                        | Benefit                            | Notes                                                                       |
|:--|:-------------------------------------|:-----------------------------------|:----------------------------------------------------------------------------|
| H | Area View (Other Entities)           | Situational awareness & targeting  | "I can see nearby monsters/players with health bars & select a target."     |
| I | Stat Allocation UI                   | Player progression                 | Spend level-up points; small contract write (`allocatePoints`).             |
| J | Chat Functionality (history)         | Basic social interaction           | "I can send and receive messages in my current zone."                       |
| K | Monster & Boss Visual Differentiation| Immersion & clarity                | Icons/colors for elites, bosses, dead entities.                             |
| L | Task & Ability Timers                | Transparency                       | Real-time countdown (block→seconds). Builds on cooldown meta from MVP.      |
| M | Error Boundary & Typed Errors        | Stability                          | Central wrapper around game routes using existing custom errors.            |

---

## 4. Polish & Long-Term Enhancements - UPDATED

| # | Feature Group                      | Purpose                                       |
|:--|:-----------------------------------|:----------------------------------------------|
| N | Chat History Rendering             | Expanded chat functionality with history      |
| O | Mini-map / Area Visualization      | Spatial awareness and navigation aid          |
| P | Event Listeners (Log Subscriptions) | Snappier UX                                 |
| Q | Death / Revival Flow               | Full loop handling—death screen, options, redirect. |
| R | Depth & Dungeon Progress UI        | Sense of long-term progress, map overview.    |
| S | Onboarding / Guided Tutorial       | New-player conversion.                        |
| T | Transaction History UI             | Debug and information tool for players.       |
| U | Mobile & Accessibility Pass        | Broader reach & compliance.                   |
| V | Sepukku UI                         | Character deletion/"rage-quit" action.        |

---

## 5. Sequencing & Dependencies - UPDATED

1.  **Foundation**
    *   Finalize mocked data contracts for logs, combatants, ability cooldowns to unblock UI work.
    *   Confirm `pollForFrontendData` shape stability.
    *   Fix identified bugs (character health display, is_dead flag, etc.)

2.  **MVP Track (A → G)**
    *   Focus on combat functionality (A, B, F) as the core gameplay loop.
    *   ✅ Fix equipment management (G) to ensure basic character functionality.
    *   Ensure session key and gas management (C, D) work consistently.
    *   Integrate E continuously as it wraps all actions.

3.  **Hardening & Expansion**
    *   Add Area View (H) once core mechanics are stable.
    *   Implement Stat Allocation (I) to complete the character progression loop.
    *   Add basic Chat (J) for minimal social interaction.
    *   Layer in K-M to improve the player experience.

4.  **Polish Track**
    *   Schedule N-V post-launch or when design/development bandwidth allows.

---

## 6. Outcome-Based Milestones - UPDATED

| Milestone             | Feature Completion          |
|:----------------------|:----------------------------|
| M0 – Internal Alpha   | ✅ A, B, E, F, G               |
| M1 – Testnet Beta     | A–G fully functional        |
| M2 – Feature-Complete Beta | + H, I, J, M           |
| M3 – Public Mainnet   | + K, L, selected N-V        |

This updated roadmap reflects the team's discussion about prioritizing the core gameplay mechanics while deprioritizing features like the mini-map, extensive chat history, and area view for later stages. The focus is now on ensuring that combat, equipment, and session management work properly before expanding to other features.

---

## 7. Bug Fixes Log

### Combat System Fixes

| Date       | Issue                                   | Fix Description                                      | Files Modified                                                    |
|:-----------|:----------------------------------------|:----------------------------------------------------|:------------------------------------------------------------------|
| YYYY-MM-DD | Dead enemies appearing in combatants list | Added filtering to prevent dead characters (marked with `isDead: true`) from appearing in combat targets, combat indicators, and combat state calculations | `CombatTargets.tsx`, `CharacterInfo.tsx`, `AppInitializer.tsx`, `useGame.ts` |

> 🚨 **Combat Bug Fix:** Dead enemies were appearing in the target list with names like "Unnamed the Initiate". This occurred because the `isDead` flag wasn't being checked when displaying combatants. Filters were added at multiple levels to ensure dead characters are excluded from combat UI components and combat state calculations.

## Implementation Progress

### Recent Additions

#### Transaction Balance Validation (December 2024)
- **Feature**: Added minimum balance validation for transaction-requiring buttons
- **Implementation**: 
  - Created `useTransactionBalance` hook that validates session key balance against 0.05 MON minimum
  - Applied to `AbilityButton`, `EquipmentPanel` (weapon/armor buttons), and `ChatPanel` (Send button) as initial implementation
  - Buttons are disabled when balance is insufficient with clear visual indicators and tooltip messages
  - Input fields are also disabled and visually dimmed when balance is insufficient
- **Configuration**: Added `MIN_TRANSACTION_BALANCE = 0.05` to `src/config/wallet.ts`
- **Status**: ✅ Implemented for initial components, ready for rollout to other transaction buttons

#### Character Death Handling (December 2024)
- **Feature**: Added "YOU DIED" modal for character death scenarios
- **Implementation**: 
  - Created `DeathModal` component with red text on black background and darkened overlay
  - Added death detection in `AppInitializer` to show modal when player character's `isDead` flag is true
  - Provides "Create New Character" button that clears localStorage and redirects to character creation
  - Modal is non-dismissible (cannot be closed with ESC or overlay click) to ensure proper flow

## Recent Updates

### Chat Caching Simplification (Latest)
- **Unified Character Lookup**: All chat and event processing now uses the same `findCharacterParticipantByIndex` helper in `contractToWorldSnapshot`
- **Removed Duplicate Processing**: Eliminated `processChatFeedsToDomain` - all chat processing happens in one place
- **Removed Optimistic Chat Updates**: With 500ms polling, optimistic updates were unnecessary overhead
- **Fixed Main Character Messages**: Main character is now properly included in character lookups, fixing the issue where their messages were skipped
- **Simplified Data Flow**: Contract → `contractToWorldSnapshot` → UI with no intermediate processing

## Active Development