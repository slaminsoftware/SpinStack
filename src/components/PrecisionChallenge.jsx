// src/components/PrecisionChallenge.jsx
// Inter-wave bonus challenge shown after the player clears a wave.
// The board displays a small grid with glowing "target" cells.
// The player taps any cell — if the tapped cell is a target, it scores.
// After all pieces are placed (or all targets are hit), the challenge ends
// and a bonus score is awarded before the next wave begins.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, shared } from '../theme';
import { COLS, COLORS } from '../game/constants';

// ── Tuning ─────────────────────────────────────────────────────────────────────
const CHALLENGE_ROWS   = 5;   // rows in the mini-board
const PIECES_PER_ROUND = 8;   // how many piece drops the player gets
const POINTS_PER_HIT   = 150; // base bonus per target hit
const PERFECT_BONUS    = 500; // extra bonus for hitting every target
const COUNTDOWN_SECS   = 3;   // pre-challenge countdown

// How many targets appear (scales with wave number, capped)
function targetCount(wave) {
  return Math.min(3 + Math.floor(wave / 2), 8);
}

// Generate a flat board of colored cells with `numTargets` marked cells
function buildBoard(wave) {
  const totalCells = CHALLENGE_ROWS * COLS;
  const numTargets = targetCount(wave);

  // Pick random target positions (no duplicates)
  const positions = new Set();
  while (positions.size < numTargets) {
    positions.add(Math.floor(Math.random() * totalCells));
  }

  // Fill each cell with a random color
  return Array.from({ length: totalCells }, (_, i) => ({
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    isTarget: positions.has(i),
    isHit: false,
    isMissed: false, // target that was never hit (shown at end)
  }));
}

export default function PrecisionChallenge({ wave, onComplete }) {
  // ── Phase: 'countdown' | 'playing' | 'result'
  const [phase, setPhase] = useState('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [board, setBoard] = useState(() => buildBoard(wave));
  const [piecesLeft, setPiecesLeft] = useState(PIECES_PER_ROUND);
  const [hitsThisRound, setHitsThisRound] = useState(0);
  const [bonusScore, setBonusScore] = useState(0);
  const [selectedCol, setSelectedCol] = useState(null); // column the drop-arrow hovers

  // Animate the drop arrow bobbing
  const arrowAnim = useRef(new Animated.Value(0)).current;
  // Pulse each hit cell
  const cellScales = useRef(
    Array.from({ length: CHALLENGE_ROWS * COLS }, () => new Animated.Value(1)),
  ).current;

  const numTargets = targetCount(wave);

  // ── Countdown ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Arrow bounce animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 8, duration: 400, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ).start();
    return () => arrowAnim.stopAnimation();
  }, [phase]);

  // ── Drop a piece into a column ─────────────────────────────────────────────
  const dropIntoColumn = useCallback(
    (col) => {
      if (phase !== 'playing' || piecesLeft <= 0) return;

      // Find the lowest empty-ish row in this column — but the board is always
      // "filled" visually. We just treat the bottom-most unoccupied slot as
      // row CHALLENGE_ROWS-1 down to 0, sequentially per column. Since every
      // cell already has a color, we instead scan for the lowest NON-HIT,
      // NON-MISSED target in this column; if none, we simply mark the bottom
      // non-hit cell as a plain miss.
      setBoard((prev) => {
        // Find the lowest row in this col that hasn't been hit yet
        let landRow = -1;
        for (let r = CHALLENGE_ROWS - 1; r >= 0; r--) {
          const idx = r * COLS + col;
          if (!prev[idx].isHit && !prev[idx].isMissed) {
            landRow = r;
            break;
          }
        }
        if (landRow === -1) return prev; // column full — do nothing

        const idx = landRow * COLS + col;
        const isHit = prev[idx].isTarget;

        // Animate this cell
        Animated.sequence([
          Animated.timing(cellScales[idx], { toValue: 1.35, duration: 120, useNativeDriver: true }),
          Animated.timing(cellScales[idx], { toValue: 1,    duration: 180, useNativeDriver: true }),
        ]).start();

        const next = prev.map((cell, i) =>
          i === idx
            ? { ...cell, isHit: isHit, isMissed: !isHit }
            : cell,
        );

        if (isHit) {
          setHitsThisRound((h) => {
            const newHits = h + 1;
            // Check if all targets hit — end early
            if (newHits >= numTargets) {
              setTimeout(() => endChallenge(newHits, next), 300);
            }
            return newHits;
          });
        }

        return next;
      });

      setPiecesLeft((p) => {
        const remaining = p - 1;
        if (remaining <= 0) {
          setTimeout(() => endChallenge(hitsThisRound, null), 400);
        }
        return remaining;
      });
    },
    [phase, piecesLeft, hitsThisRound, numTargets],
  );

  // ── End challenge, tally score ─────────────────────────────────────────────
  const endChallenge = useCallback(
    (hits, finalBoard) => {
      const perfect = hits >= numTargets;
      const pts = hits * POINTS_PER_HIT + (perfect ? PERFECT_BONUS : 0);
      setBonusScore(pts);
      setPhase('result');

      // Mark any unhit targets as "missed" so they show on result screen
      if (finalBoard) {
        setBoard(
          finalBoard.map((cell) =>
            cell.isTarget && !cell.isHit ? { ...cell, isMissed: true } : cell,
          ),
        );
      } else {
        setBoard((prev) =>
          prev.map((cell) =>
            cell.isTarget && !cell.isHit ? { ...cell, isMissed: true } : cell,
          ),
        );
      }
    },
    [numTargets],
  );

  // ── Continue to next wave ──────────────────────────────────────────────────
  const handleContinue = useCallback(() => {
    onComplete(bonusScore);
  }, [bonusScore, onComplete]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const perfect = hitsThisRound >= numTargets;

  function renderCell(cell, idx) {
    const scale = cellScales[idx];
    const col = idx % COLS;

    let bg = cell.color;
    let overlay = null;

    if (cell.isHit) {
      // Green glow overlay
      overlay = (
        <View style={styles.hitOverlay} pointerEvents="none">
          <Text style={styles.hitIcon}>✓</Text>
        </View>
      );
    } else if (cell.isMissed) {
      // Show the target marker that was never hit
      overlay = (
        <View style={styles.missedOverlay} pointerEvents="none">
          <Text style={styles.missedIcon}>✕</Text>
        </View>
      );
    } else if (cell.isTarget && phase === 'playing') {
      // Glowing target
      overlay = (
        <View style={styles.targetOverlay} pointerEvents="none">
          <Text style={styles.targetIcon}>🎯</Text>
        </View>
      );
    }

    return (
      <Animated.View
        key={idx}
        style={[styles.cell, { backgroundColor: bg, transform: [{ scale }] }]}
      >
        {overlay}
      </Animated.View>
    );
  }

  // ── Countdown screen ───────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centreBox}>
          <Text style={styles.challengeLabel}>⚡ PRECISION CHALLENGE</Text>
          <Text style={styles.subLabel}>Hit the glowing targets!</Text>
          <Text style={styles.countdownNum}>{countdown || 'GO!'}</Text>
          <Text style={styles.hintText}>
            {numTargets} target{numTargets !== 1 ? 's' : ''} · {PIECES_PER_ROUND} drops
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <View style={shared.card}>
            <Text style={styles.resultEmoji}>{perfect ? '🏆' : hitsThisRound > 0 ? '🎯' : '😅'}</Text>
            <Text style={styles.resultTitle}>
              {perfect ? 'PERFECT!' : hitsThisRound > 0 ? 'NICE WORK!' : 'MISSED THEM ALL!'}
            </Text>
            <Text style={styles.resultSub}>
              {hitsThisRound} / {numTargets} targets hit
            </Text>

            {/* Mini board showing hits/misses */}
            <View style={styles.resultBoard}>
              {Array.from({ length: CHALLENGE_ROWS }, (_, r) => (
                <View key={r} style={styles.row}>
                  {Array.from({ length: COLS }, (_, c) => {
                    const cell = board[r * COLS + c];
                    return renderCell(cell, r * COLS + c);
                  })}
                </View>
              ))}
            </View>

            {/* Score breakdown */}
            <View style={shared.scorePanel}>
              <View style={shared.scoreLine}>
                <Text style={shared.scoreLabel}>TARGET HITS</Text>
                <Text style={shared.scoreNum}>{hitsThisRound} × {POINTS_PER_HIT}</Text>
              </View>
              {perfect && (
                <View style={[shared.scoreLine, { marginTop: 8 }]}>
                  <Text style={[shared.scoreLabel, { color: palette.gold }]}>PERFECT BONUS</Text>
                  <Text style={[shared.scoreNum, { color: palette.gold, fontSize: 20 }]}>
                    +{PERFECT_BONUS}
                  </Text>
                </View>
              )}
              <View style={[shared.scoreLine, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.surfaceBorder }]}>
                <Text style={[shared.scoreLabel, { color: palette.textPrimary }]}>BONUS ADDED</Text>
                <Text style={[shared.scoreNum, { color: '#7aff7a' }]}>+{bonusScore}</Text>
              </View>
            </View>

            <TouchableOpacity style={shared.primaryBtn} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={shared.primaryBtnText}>NEXT WAVE →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Playing screen ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.playContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.challengeLabel}>⚡ PRECISION CHALLENGE</Text>
          <View style={styles.headerStats}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>DROPS</Text>
              <Text style={styles.statPillValue}>{piecesLeft}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>HITS</Text>
              <Text style={styles.statPillValue}>
                {hitsThisRound}/{numTargets}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.instruction}>Tap a column to drop your piece</Text>

        {/* Column tap zones with drop arrows */}
        <View style={styles.dropZone}>
          {Array.from({ length: COLS }, (_, col) => (
            <TouchableOpacity
              key={col}
              style={styles.colTapZone}
              onPress={() => dropIntoColumn(col)}
              onPressIn={() => setSelectedCol(col)}
              onPressOut={() => setSelectedCol(null)}
              activeOpacity={0.7}
            >
              <Animated.Text
                style={[
                  styles.dropArrow,
                  selectedCol === col && styles.dropArrowActive,
                  { transform: [{ translateY: selectedCol === col ? arrowAnim : 0 }] },
                ]}
              >
                ▼
              </Animated.Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Board */}
        <View style={styles.board}>
          {Array.from({ length: CHALLENGE_ROWS }, (_, r) => (
            <View key={r} style={styles.row}>
              {Array.from({ length: COLS }, (_, c) => {
                const cell = board[r * COLS + c];
                return renderCell(cell, r * COLS + c);
              })}
            </View>
          ))}
        </View>

        {/* Target legend */}
        <Text style={styles.legendText}>
          🎯 = target cell · hit all {numTargets} for a perfect bonus!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const CELL_SIZE = 46;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
  },

  // ── Countdown ──────────────────────────────────────────────────────────────
  centreBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  challengeLabel: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: palette.gold,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  subLabel: {
    fontSize: 13,
    color: palette.textSub,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  countdownNum: {
    fontSize: 80,
    fontWeight: '900',
    color: palette.textPrimary,
    lineHeight: 90,
  },
  hintText: {
    fontSize: 12,
    color: palette.textMuted,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // ── Playing ────────────────────────────────────────────────────────────────
  playContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    backgroundColor: palette.card,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
  },
  statPillLabel: {
    fontSize: 8,
    color: palette.textMuted,
    letterSpacing: 1,
    fontWeight: '700',
  },
  statPillValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#a0a0ff',
  },
  instruction: {
    fontSize: 12,
    color: palette.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Column tap zone
  dropZone: {
    flexDirection: 'row',
    width: COLS * CELL_SIZE + (COLS - 1) * 4 + 20, // matches board width
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  colTapZone: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dropArrow: {
    fontSize: 18,
    color: palette.accent,
    opacity: 0.5,
  },
  dropArrowActive: {
    opacity: 1,
    color: palette.gold,
  },

  // Board
  board: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: palette.surfaceBorder,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cell overlays
  targetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetIcon: {
    fontSize: 20,
  },
  hitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,220,100,0.45)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00dc64',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hitIcon: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '900',
  },
  missedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244,67,54,0.35)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missedIcon: {
    fontSize: 18,
    color: palette.danger,
    fontWeight: '900',
  },

  legendText: {
    marginTop: 10,
    fontSize: 11,
    color: palette.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // ── Result ─────────────────────────────────────────────────────────────────
  resultScroll: {
    flexGrow: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  resultEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    color: palette.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  resultSub: {
    fontSize: 13,
    color: palette.textSub,
    marginBottom: 16,
    letterSpacing: 1,
    textAlign: 'center',
  },
  resultBoard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: palette.surfaceBorder,
    gap: 4,
    marginBottom: 16,
  },
});
