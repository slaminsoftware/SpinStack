// src/game/constants.js
// Single source of truth for all game tuning values and special brick definitions.

export const COLORS = [
  '#FF0000',
  '#FF5F1F',
  '#FFFF33',
  '#39FF14',
  '#1F51FF',
  '#FF00FF',
];

// Colorblind-friendly palette (replaces green + adjusts red/orange contrast)
export const COLORS_COLORBLIND = [
  '#E84040', // red (slightly softened)
  '#FF8C00', // dark orange (higher contrast from red)
  '#FFD700', // gold/yellow
  '#00CED1', // teal (replaces neon green — safe for red/green colorblindness)
  '#4488FF', // softer blue
  '#CC44CC', // purple-pink
];

export const COLS          = 6;
export const TOTAL_ROWS    = 12;
export const DANGER_START  = 6;
export const CLICKS_PER_NEW_ROW  = 8;
export const POINTS_PER_CLICK    = 5;
export const POINTS_PER_ROW      = 100;
export const SPECIAL_SPAWN_CHANCE = 0.06;
export const SIDES = 4; // Rubik's cube: front, right, back, left

// Level definitions — retuned for a more gradual difficulty curve.
// Level 1: 12 clicks/row (was 10) — more breathing room for new players
// Level 2: 9 clicks/row (was 7)
// Level 3: 6 clicks/row (was 5)
// Level 4: 4 clicks/row (was 3) — still hard, now survivable
// Level 5: NEW "Insane" — 3 clicks/row, the original brutal ceiling
export const LEVELS = [
  { level: 1, label: 'Level 1', difficulty: 'Easy',   clicksPerRow: 12, specialChance: 0.04, startRows: 3 },
  { level: 2, label: 'Level 2', difficulty: 'Medium', clicksPerRow: 9,  specialChance: 0.06, startRows: 5 },
  { level: 3, label: 'Level 3', difficulty: 'Hard',   clicksPerRow: 6,  specialChance: 0.08, startRows: 6 },
  { level: 4, label: 'Level 4', difficulty: 'Brutal', clicksPerRow: 4,  specialChance: 0.10, startRows: 7 },
  { level: 5, label: 'Level 5', difficulty: 'Insane', clicksPerRow: 3,  specialChance: 0.12, startRows: 8 },
];

// Each brick cell is either a plain color string OR one of these special objects.
export const SPECIALS = {
  BOMB: {
    type: 'BOMB',
    emoji: '💣',
    label: 'BOMB',
    bg: '#c0392b',
    desc: 'Destroys its entire row',
  },
  LIGHTNING: {
    type: 'LIGHTNING',
    emoji: '⚡',
    label: 'LIGHTNING',
    bg: '#8e44ad',
    desc: 'Obliterates the row below',
  },
  RAINBOW: {
    type: 'RAINBOW',
    emoji: '🌈',
    label: 'RAINBOW',
    bg: '#1a6b8a',
    desc: 'Paints the whole row the dominant color',
  },
  STAR: {
    type: 'STAR',
    emoji: '⭐',
    label: 'STAR',
    bg: '#b8860b',
    desc: '+500 bonus points!',
  },
  FREEZE: {
    type: 'FREEZE',
    emoji: '❄️',
    label: 'FREEZE',
    bg: '#2471a3',
    desc: 'Delays the next new row by 8 clicks',
  },
};

// Achievements definition
export const ACHIEVEMENTS = [
  { id: 'clean_sweep',       emoji: '🧹', label: 'Clean Sweep',       desc: 'Clear 3 rows in a single game' },
  { id: 'chain_reaction',    emoji: '⚡', label: 'Chain Reaction',    desc: 'Clear 2 rows within 1 second' },
  { id: 'chill_out',         emoji: '❄️', label: 'Chill Out',         desc: 'Use 3 Freeze bricks in one game' },
  { id: 'demolition_expert', emoji: '💣', label: 'Demolition Expert', desc: 'Use 5 Bomb bricks total (all-time)' },
  { id: 'efficient',         emoji: '🎯', label: 'Hyper Efficient',   desc: 'Clear a row in 3 taps or fewer' },
  { id: 'full_spectrum',     emoji: '🌈', label: 'Full Spectrum',     desc: 'Clear a row containing all 6 colors' },
];
