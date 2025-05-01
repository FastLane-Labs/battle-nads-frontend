# Battle-Nads Frontend — High-Level Execution Plan

Grouping features by Must-Have (MVP) vs Next-Wave (Nice-to-Have / Polish) so you can slice them into breakout tasks later.  No code details—just the WHAT & WHY.

⸻

1. Guiding Principles

Principle	Rationale
Gameplay First	Ship a fully playable core loop (move → combat → loot → level-up).
Single Source of Truth	Keep polling + query cache ( useUiSnapshot ) as the canonical data feed.
Gas UX	Session-key & funding flows must never block actions.
Async Visibility	Players should always know why they’re waiting (tasks, cooldowns).



⸻

2. Must-Have Features (MVP)

#	Feature Group	Impact	Key User Story
A	Combat & Event Log Rendering	🔥 Critical—explains what just happened	“After I attack, I want to see hits, crits, XP gained, and loot messages.”
B	Area View (Other Entities)	🔥 Situational awareness & targeting	“I can see nearby monsters/players with health bars & select a target.”
C	Ability Use & Cooldown Indicators	🔥 Core combat mechanic	“I can pick an ability, see if it’s on cooldown, and know when it’s ready.”
D	Session Key Management UI	🔥 Blocks every transaction	“I can create, view expiry/balance, and deactivate my session key.”
E	Gas / shMON Funding Prompts	🔥 Prevents soft-locks	“If my balances are low, I’m warned and can top-up in-app.”
F	Chat History Rendering	💬 Social glue	“I see zone chat scroll in real time while I play.”
G	Async Feedback & Loading States	🧭 Aligns expectations	“Whenever an action is pending (task queued), I see a spinner/progress badge.”

Delivery Goal: A player can create a character, explore, fight, chat, and manage gas without leaving the browser.

⸻

3. Next-Wave Features (High ROI but Not Blocking MVP)

#	Feature Group	Benefit	Notes
H	Equipment Inventory Management	Deepens RPG loop	View backpack, equip/unequip items. Relies on poll data & useEquipment.
I	Stat Allocation UI	Player progression	Spend level-up points; small contract write (allocatePoints).
J	Monster & Boss Visual Differentiation	Immersion & clarity	Icons/colors for elites, bosses, dead entities.
K	Task & Ability Timers	Transparency	Real-time countdown (block→seconds). Builds on cooldown meta from MVP.
L	Error Boundary & Typed Errors	Stability	Central wrapper around game routes using existing custom errors.
M	Event Listeners (Log Subscriptions)	Snappier UX	Supplement polling for near-instant updates; graceful fallback to polling.



⸻

4. Polish & Long-Term Enhancements

#	Feature Group	Purpose
N	Death / Revival Flow	Full loop handling—death screen, options, redirect.
O	Depth & Dungeon Progress UI	Sense of long-term progress, map overview.
P	Onboarding / Guided Tutorial	New-player conversion.
Q	Mobile & Accessibility Pass	Broader reach & compliance.
R	Sepukku UI	Niche but fun “rage-quit” action.
S	Class Visualization During Creation	Immediate feedback on build choices.



⸻

5. Sequencing & Dependencies
	1.	Foundation
	•	Finalize mocked data contracts for logs, combatants, ability cooldowns to unblock UI work.
	•	Confirm pollForFrontendData shape stability.
	2.	MVP Track (A → G)
	•	Tackle A & B in parallel (shared snapshot data).
	•	Slipstream D & E once gas data surfaces in the same snapshot.
	•	Implement C after core combat targets (B) are interactive.
	•	Integrate F & G continuously; they’re mostly UI wrappers.
	3.	Hardening & Expansion
	•	Layer H-M iteratively, leveraging the stable snapshot and existing hooks.
	•	Each adds depth without massive contract changes.
	4.	Polish Track
	•	Schedule N-S post-launch or when design bandwidth allows.

⸻

6. Outcome-Based Milestones

Milestone	Feature Completion
M0 – Internal Alpha	A, B (basic), G
M1 – Testnet Beta	A–G fully functional
M2 – Feature-Complete Beta	+ H, I, K, L
M3 – Public Mainnet	+ J, M, selected N-S
