# J – Monster Visuals

|  |  |
|---|---|
| **Goal** | Differentiate monster classes + bosses visually |
| **Primary Data** | `class` enum + boss flag (`_isBoss`) via helper |
| **UI** | Sprite sheet; boss aura glow; health ring colour by rarity |
| **Logic** | Map class→sprite; boss overlay if hp > threshold |
| **Edge Cases** | Missing sprite → placeholder demon icon |
