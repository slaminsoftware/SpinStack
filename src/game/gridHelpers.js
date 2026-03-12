// src/game/gridHelpers.js
// Pure functions for creating and manipulating the game grid.
// No React imports — safe to unit test in isolation.

import {
  COLORS,
  COLORS_COLORBLIND,
  COLS,
  TOTAL_ROWS,
  DANGER_START,
  SPECIAL_SPAWN_CHANCE,
  SPECIALS,
  SIDES,
} from './constants';

// ─── Cell utilities ───────────────────────────────────────────────────────────

// Active color palette — toggled by colorblind mode
let _activeColors = COLORS;
export const setColorblindMode = (enabled) => {
  _activeColors = enabled ? COLORS_COLORBLIND : COLORS;
};
export const getActiveColors = () => _activeColors;

/** Returns a random plain color string from the active palette. */
export const randomColor = () =>
  _activeColors[Math.floor(Math.random() * _activeColors.length)];

/** Returns true if a cell is a special power-up object (not a plain color). */
export const isSpecial = (cell) =>
  cell !== null && typeof cell === 'object';

/** Returns the background color to render for any cell type. */
export const cellColor = (cell) =>
  isSpecial(cell) ? cell.bg : cell;

// ─── Row / Grid factories ─────────────────────────────────────────────────────

/**
 * Creates one side (array of COLS cells).
 * At most ONE special brick is allowed per side.
 */
export const makeSide = (spawnChance = SPECIAL_SPAWN_CHANCE) => {
  let hasSpecial = false;
  return Array.from({ length: COLS }, () => {
    if (!hasSpecial && Math.random() < spawnChance) {
      hasSpecial = true;
      const keys = Object.keys(SPECIALS);
      return { ...SPECIALS[keys[Math.floor(Math.random() * keys.length)]] };
    }
    return randomColor();
  });
};

/**
 * Creates a row with SIDES faces, each being an independent side of cells.
 */
export const makeRowSides = (spawnChance = SPECIAL_SPAWN_CHANCE) =>
  Array.from({ length: SIDES }, () => makeSide(spawnChance));

/**
 * Creates the full initial grid of TOTAL_ROWS entries.
 * For Level 1 (startRows ≤ 3), the LAST active row is pre-seeded so that
 * 5 of 6 cells already match — one tap clears it immediately, teaching the
 * core loop in the first 5 seconds.
 */
export const makeInitialGrid = (levelConfig = null) => {
  const startRows   = levelConfig?.startRows    ?? DANGER_START;
  const spawnChance = levelConfig?.specialChance ?? SPECIAL_SPAWN_CHANCE;
  const isTutorialLevel = startRows <= 3;

  return Array.from({ length: TOTAL_ROWS }, (_, i) => {
    if (i >= startRows) return null;
    // Last starting row on easy mode → pre-seeded near-complete row
    if (isTutorialLevel && i === startRows - 1) {
      return { sides: makeSeedRow() };
    }
    return { sides: makeRowSides(spawnChance) };
  });
};

/**
 * Creates a row where the current-facing side has 5 cells matching and 1 different.
 * Players can clear it in a single tap — instant dopamine on first play.
 */
const makeSeedRow = () => {
  const winColor = randomColor();
  const otherColor = _activeColors.find(c => c !== winColor) ?? randomColor();
  // Side 0 (FRONT): 5 matching, 1 different at a random position
  const seedSide = Array.from({ length: COLS }, (_, i) => winColor);
  seedSide[Math.floor(Math.random() * COLS)] = otherColor;
  // Other sides are normal random rows
  return [
    seedSide,
    makeSide(0.04),
    makeSide(0.04),
    makeSide(0.04),
  ];
};

/**
 * Compacts the grid so all non-null rows float to the top
 * and null (empty) slots fill the bottom.
 */
export const compactGrid = (grid) => {
  const active = grid.filter((r) => r !== null);
  return [...active, ...Array(TOTAL_ROWS - active.length).fill(null)];
};
