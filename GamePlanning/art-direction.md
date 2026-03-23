# Match3 Art Direction

## Style

- Clean HD 2D icons for a bold idol-versus-demon board
- Neon concert energy with occult charm language
- High contrast silhouettes with punchy internal detail and readable color coding
- Transparent PNG background

## Matchable sprites

- `256x256` PNG
- Straight alpha
- Centered composition
- `1-2 px` transparent edge padding
- Center pivot
- No text, no shadows extending beyond the canvas
- One sprite per file

## Sprite list

- `item_blue_01.png`: cyan echo sigil
- `item_green_01.png`: green foxfire charm
- `item_red_01.png`: hot pink heart blade
- `item_gold_01.png`: gold speaker crest
- `item_purple_01.png`: violet moon mic
- `item_cream_01.png`: pale lightstick idol

## UI art

- `title_mark.png`: compact menu title mark, transparent background, wide lockup preferred
- Menu and HUD styling should feel stage-lit, fast, and celebratory

## Usage notes

- Sprites are displayed on square planes in Three.js.
- Keep the silhouette bold enough to read at small board scale.
- Avoid heavy perspective or lighting shifts that make one item feel from a different set.
- Preserve 1-2 px transparent edge padding after background cleanup so alpha edges stay clean in-game.
