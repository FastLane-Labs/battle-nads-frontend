# J – Monster Visuals

|  |  |
|---|---|
| **Goal** | Differentiate monster classes + bosses visually |
| **Primary Data** | `class` enum + boss flag (`_isBoss`) via helper |
| **UI** | Sprite sheet; boss aura glow; health ring colour by rarity |
| **Logic** | Map class→sprite; boss overlay if hp > threshold |
| **Edge Cases** | Missing sprite → placeholder demon icon |

# K – Monster & Boss Visual Differentiation

|  |  |
|---|---|
| **Goal** | Easy recognition of threat levels |
| **Primary Data** | `entity.type`, `entity.stats` (derive tier?); Use presence in `combatants` list to identify active enemies for highlighting. |
| **UI** | Distinct icons/colours for elites, bosses; maybe dead state |
| **Logic** | Map entity type/stats to visual style |
| **Edge Cases** | New monster types added; colour-blind accessibility |

**Design Ref Notes:**
*   Leverages `combatants` list for highlighting enemies.
