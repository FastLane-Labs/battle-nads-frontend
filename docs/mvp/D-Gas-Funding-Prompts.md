# E – Gas Funding Prompts

|  |  |
|---|---|
| **Goal** | Warn when MON/shMON too low and provide top-up |
| **Primary Data** | `balanceShortfall`, `sessionKeyData.balance` |
| **UI** | Sticky banner + modal amount picker |
| **Logic** | Tier colours: yellow <0.02 MON, red <0.005; recommended amount = `balanceShortfall*1.1` |
| **Edge Cases** | Insufficient wallet balance → disable CTA, link to bridge |
