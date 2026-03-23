/**
 * Match-3 design rules (v1) — blockers, specials, combo order
 *
 * Blockers (Option A — crate cell): A cell may hold `blocker: { hp }` with `piece: null`.
 * Blockers do not move with gravity. Pieces stack above them within the column. Swaps are
 * only allowed when both cells have a piece and neither has a blocker. Blockers lose 1 HP
 * when a piece on an orthogonally adjacent cell is cleared (match clear or special blast).
 * At 0 HP the blocker is removed; the cell can then hold falling pieces.
 *
 * Special tiles (piece.special):
 * - Spawn: From a single simultaneous match set after a swap or cascade:
 *   priority: color_bomb (straight line of 5+ same kind) > bomb (L/T intersection of 3+
 *   same kind in both axes) > line (exactly 4 in a row) > none (plain 3 match).
 *   Spawn cell prefers the swap "target" (second selected cell) if it lies in the match;
 *   otherwise the lexicographically smallest (y,x) in the matched set.
 * - line_h / line_v: When included in any match clear, also clears that entire row / column.
 * - bomb: When included in a match clear, also clears a 3×3 orthogonally around its cell.
 * - color_bomb: Does not participate in automatic 3+ line detection. Activates when swapped
 *   with an adjacent normal piece: clears every piece of that neighbor's kind (specials included).
 *   Two color_bombs swapped clear the whole board (pieces only; blockers damaged by adjacency
 *   if we blast those cells — v1 clears all pieces and damages blockers on blasted cells).
 *
 * Combo / resolution order (one cascade step):
 * 1) Detect 3+ matches (excluding color_bomb as a line member — it cannot start/extend a run).
 * 2) Union of matched cells. Expand with special activations: any matched line_h/line_v/bomb
 *    adds its blast cells to the clear set (blast does not recurse new specials in v1).
 * 3) Compute special spawn from the geometry of matched normal+striped+bomb pieces only
 *    (exclude color_bomb from spawn detection set). At most one spawn per step; spawn replaces
 *    the spawn cell instead of emptying it.
 * 4) Clear all targeted cells (pieces removed; blockers adjacent to cleared piece cells take 1 HP).
 * 5) Gravity + spawn new pieces in empty non-blocker cells.
 * 6) Repeat from 1 until stable; then if no legal moves, reshuffle.
 *
 * Swap activation: Swapping two adjacent specials triggers both (striped+bomb etc.) using the
 * same blast rules as if they had been match-cleared, without requiring a color match.
 */

export {};
