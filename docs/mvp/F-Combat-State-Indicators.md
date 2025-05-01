---
title: MVP Feature - Combat State Indicators
---

# F - Combat State Indicators

*(Implementation details below)*

**Design Ref Notes:**
*   **Goal:** Indicate when the player is in combat to prevent confusion when actions like movement are blocked.
*   **Logic:** State is active if the `combatants: CharacterLite[]` list from `useUiSnapshot` is not empty.
*   **Core Functionality:** While active, movement actions MUST be disabled.
*   **Related:** Part of core combat loop feedback; complements Area View (Feature H) which highlights specific combatants.

**UI & Implementation Details:**

1.  **"In Combat" Banner:**
    *   **Placement:** Display prominently but unobtrusively (e.g., top center, near character status, or above action bar).
    *   **Appearance:** Use a distinct background (muted red/orange), a clear icon (e.g., ⚔️, 🛡️, ❗), concise text ("IN COMBAT"), and potentially a subtle pulse/glow.
    *   **Transition:** Use fade-in/fade-out (200-300ms) for smoother appearance/disappearance.

2.  **Disabled Movement Buttons:**
    *   **Appearance:** Standard greyed-out state. Consider adding a small lock icon (🔒) overlay specifically when disabled *due to combat*.
    *   **Tooltip (MVP Critical):** On hover, MUST display an explicit tooltip: "Cannot move while in combat". (Note: The original plan marked tooltips as nice-to-have, but the conversation emphasized their importance for clarity, making them MVP Critical).

3.  **Interaction:**
    *   Banner and button states must update reactively based on the `combatants` list in the polled data. 