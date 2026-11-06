# Credits

WICK: Down the Cellar is original work. Some sprites are built on free asset packs. The packs'
own files are in `assets/packs/` (as downloaded) and the pieces the game uses are copied into
`assets/sprites/`. The game recolors, outlines and combines them at load time
(`src/engine/packart.js`, `src/data/packArt.js`). No sprite comes from, or was made for, The
Binding of Isaac.

## Art

| Pack | Author | License | Link | Used for |
|---|---|---|---|---|
| Dungeon Crawl 32x32 tiles (Dungeon Crawl Stone Soup, full set) | The Dungeon Crawl Stone Soup team and the original RLTiles artists | CC0 1.0 (public domain) | https://opengameart.org/content/dungeon-crawl-32x32-tiles | statues, altars, chests, fountains, fire altars, torches, banners, traps, wall textures (eyes, bones), the starry floor, books, the crystal ball, cards, the skull lantern, gold, keys, the crawlspace's earth and dirt |
| 80s Arcade Tile Set | RUOK | CC0 1.0 (public domain) | https://opengameart.org/content/80s-arcade-tile-set | the arcade's carpet |
| Tiny Dungeon | Kenney (kenney.nl) | CC0 1.0 (public domain) | https://opengameart.org/content/tiny-dungeon | downloaded as a reference; not used in the game yet |
| 1-Bit Pack | Kenney (kenney.nl) | CC0 1.0 (public domain) | https://opengameart.org/content/1-bit-pack | the big map's room icons |

CC0 asks for no credit; it's given here anyway, with thanks.

Everything else (Wick and the other characters, enemies, bosses, items, rooms, the machines and
beggars, beds, bookshelves, the telescope, doors, the HUD) is drawn in code for this game.

## Music

Music files in `assets/music/`, all from OpenGameArt.org under **CC0 1.0** (public domain; no
credit required, given anyway with thanks). Where a file is missing or can't play, the game uses
its own generated music instead (`src/engine/music.js`).

| File | Plays in | Track | Author | Link |
|---|---|---|---|---|
| `chapter1.ogg` | chapter 1, the title screen | Loopable Dungeon Ambience | JaggedStone | https://opengameart.org/node/29778 |
| `chapter2.ogg` | chapter 2 | Dark Cavern Ambient (loop) | Paul Wortmann | https://opengameart.org/content/dark-cavern-ambient |
| `chapter3.ogg` | chapter 3 | Abandoned passages (horror ambience loop) | congusbongus | https://opengameart.org/content/abandoned-passages-horror-ambience-loop |
| `chapter4.ogg` | chapter 4 and the finale | Heavy Battle 2 | MintoDog | https://opengameart.org/node/183145 |
| `boss.ogg` | boss fights | Heavy Boss Battle 2 | MintoDog | https://opengameart.org/content/heavy-boss-battle-2 |
| `final.ogg` | The Snuffer | Inferior Deity | Centurion_of_war | https://opengameart.org/content/inferior-deity |
| `devil.ogg` | The Bargain | Hell's God (edit) | Centurion_of_war | https://opengameart.org/content/hells-god-part-1 |
| `angel.ogg` | The Vigil | Heavenly Loop | isaiah658 | https://opengameart.org/content/heavenly-loop |
| `shop.ogg` | the shop, the black market | Creepy Ambient Loop | epb9000 | https://opengameart.org/content/creepy-ambient-loop |
| `secret.ogg` | secret rooms, red rooms, the crawlspace | Dungeon Ambience | yd | https://opengameart.org/content/dungeon-ambience |

## Sound

All sound effects are generated in code (`src/engine/audio.js`).
