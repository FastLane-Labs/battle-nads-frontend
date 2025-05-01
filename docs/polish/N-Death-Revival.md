# N – Death & Revival

|  |  |
|---|---|
| **Goal** | UX for when character dies and post-death flow |
| **Primary Data** | `character.stats.health==0` |
| **UI** | Full-screen overlay with tombstone, stats recap, CTA "Create New" |
| **Logic** | Auto-redirect after 10 s; store last-death stats in localStorage for brag screen |
| **Edge Cases** | Player alt-tabs during death → show overlay on return | 