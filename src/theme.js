// src/theme.js
// Design tokens and shared StyleSheet objects used across all screens.
// React Native does not support CSS — all styles are plain JS objects
// passed to StyleSheet.create().

import { StyleSheet, Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Design tokens ────────────────────────────────────────────────────────────
export const palette = {
  bg:            '#1a1a2e',
  card:          '#16213e',
  cardBorder:    '#2d2d6e',
  surface:       '#0f0f23',
  surfaceBorder: '#2d2d5e',
  accent:        '#5533ff',
  accentGlow:    'rgba(85,51,255,0.55)',
  textPrimary:   '#e0e0ff',
  textMuted:     '#8888aa',
  textSub:       '#aaaacc',
  gold:          '#ffd700',
  danger:        '#f44336',
  dangerFaint:   'rgba(244,67,54,0.45)',
};

// ─── Shared styles ────────────────────────────────────────────────────────────
export const shared = StyleSheet.create({
  // Full-screen wrapper
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  // Floating card (start / end screens)
  card: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },

  // Logo / title
  logoTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    color: palette.textPrimary,
    marginTop: 6,
  },
  tagline: {
    fontSize: 13,
    color: palette.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },

  // Instruction rows
  instructBox: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
    marginTop: 4,
  },
  instrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  instrIcon: {
    fontSize: 16,
    width: 26,
    textAlign: 'center',
    marginTop: 1,
  },
  instrText: {
    flex: 1,
    fontSize: 12,
    color: palette.textSub,
    lineHeight: 18,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: palette.accent,
    borderRadius: 12,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
  },
  secondaryBtn: {
    backgroundColor: '#1e1e44',
    borderRadius: 12,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3d3d7e',
    marginTop: 8,
  },
  secondaryBtnText: {
    color: '#aaaadd',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Score panel (end screen)
  scorePanel: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
    marginVertical: 14,
  },
  scoreLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    color: palette.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
  },
  scoreNum: {
    fontSize: 30,
    fontWeight: '900',
    color: '#a0a0ff',
  },

  // Level grid
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginVertical: 14,
  },
  levelBtn: {
    width: '47%',
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.surfaceBorder,
  },
  levelBtnSelected: {
    borderColor: palette.accent,
    backgroundColor: '#1e1e44',
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  levelBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  levelBtnDiff: {
    fontSize: 10,
    color: palette.textMuted,
  },

  // In-game layout
  gameScreen: {
    flexGrow: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    color: palette.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    maxWidth: 440,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
  },
  statLabel: {
    fontSize: 8,
    color: palette.textMuted,
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  statValue: {
    fontWeight: '900',
    color: '#a0a0ff',
    fontSize: 14,
  },

  // Side indicator
  sideIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sideDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#2d2d5e',
  },
  sideDotActive: {
    backgroundColor: '#5533ff',
    shadowColor: '#5533ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  sideLabel: {
    fontSize: 10,
    color: palette.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
  },
  rotateArrow: {
    fontSize: 14,
    color: palette.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  // Board container
  board: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: palette.surfaceBorder,
    width: '100%',
    maxWidth: 440,
  },
  boardDivider: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: 'rgba(244,67,54,0.45)',
    borderRadius: 2,
  },
  dangerLabel: {
    marginTop: 5,
    fontSize: 10,
    color: 'rgba(244,67,54,0.65)',
    letterSpacing: 1,
    fontWeight: '700',
  },

  // Swipe hints
  swipeHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 440,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  swipeHintText: {
    fontSize: 11,
    color: '#4444aa',
    letterSpacing: 1,
  },

  // Power-up reference bar
  powerupBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  powerupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  powerupChipText: {
    fontSize: 10,
    color: palette.textMuted,
    fontWeight: '600',
  },

  // Rotate flash overlay
  rotateFlash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(85,51,255,0.25)',
    pointerEvents: 'none',
  },
});
