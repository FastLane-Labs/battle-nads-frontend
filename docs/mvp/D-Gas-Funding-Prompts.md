# D – Gas Funding Prompts

|  |  |
|---|---|
| **Goal** | Warn when MON/shMON too low and provide top-up; **MUST be clear prompts** |
| **Primary Data** | `sessionKeyData.balanceShortfall` from `pollForFrontendData` |
| **UI** | Sticky banner + modal amount picker |
| **Logic** | Tier colours: yellow <0.02 MON, red <0.005; recommended amount = `balanceShortfall*1.1` |
| **Edge Cases** | Insufficient wallet balance → disable CTA, link to bridge |

**Design Ref Notes:**
*   This is a CRITICAL MVP feature, part of Session Key UX.
*   Triggered by `sessionKeyData.balanceShortfall`.
