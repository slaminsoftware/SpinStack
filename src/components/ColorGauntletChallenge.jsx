// src/components/ColorGauntletChallenge.jsx
// Inter-wave challenge: colored pieces arrive one at a time on a conveyor.
// The player must drop each piece into a column whose bottom-most cell
// matches the piece's color. Wrong column = miss. Speed increases as
// the wave number climbs.

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
const CHALLENGE_ROWS   = 4;
const POINTS_PER_HIT   = 175;
const PERFECT_BONUS    = 500;
const COUNTDOWN_SECS   = 3;

function pieceCount(wave) {
  return Math.min(6 + Math.floor(wave / 2), 12);
}

// Base time (ms) each piece is available before it auto-misses — shrinks per wave
function pieceTime(wave) {
  return Math.max(1500, 3500 - wave * 150);
}

// Build a flat board — bottom row of each column is the "target" row the
// player needs to match. Fill the rest with random colors for visual noise.
function buildBoard() {
  return Array.from({ length: CHALLENGE_ROWS * COLS }, (_, i) => ({
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

// Generate the sequence of incoming pieces
function buildSequence(wave, board) {
  const count = pieceCount(wave);
  // Bottom row colors — these are what the player needs to match
  const bottomColors = Array.from({ length: COLS }, (_, c) =>
    board[(CHALLENGE_ROWS - 1) * COLS + c].color,
  );
  return Array.from({ length: count }, () => {
    // Bias toward colors that actually exist in the bottom row so it's fair
    const useBottom = Math.random() < 0.7;
    if (useBottom) {
      return bottomColors[Math.floor(Math.random() * bottomColors.length)];
    }
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  });
}

export default function ColorGauntletChallenge({ wave, onComplete }) {
  const [phase, setPhase] = useState('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [board] = useState(() => buildBoard());
  const [sequence, setSequence] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [bonusScore, setBonusScore] = useState(0);
  const [feedback, setFeedback] = useState(null); // '✓' | '✕'

  // Timer bar for current piece
  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerAnimRef = useRef(null);
  const hitsRef = useRef(0);
  const currentIdxRef = useRef(0);
  const endCalledRef = useRef(false);

  const total = sequence.length;
  const ms = pieceTime(wave);

  // Build sequence after board is ready
  useEffect(() => {
    setSequence(buildSequence(wave, board));
  }, []);

  // ── Countdown ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('playing'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Start timer for each piece ─────────────────────────────────────────────────
  const advancePiece = useCallback((nextIdx, currentHits) => {
    if (endCalledRef.current) return;
    if (nextIdx >= sequence.length && sequence.length > 0) {
      endChallenge(currentHits);
      return;
    }
    currentIdxRef.current = nextIdx;
    setCurrentIdx(nextIdx);
    // Reset and run timer bar
    timerAnim.setValue(1);
    if (timerAnimRef.current) timerAnimRef.current.stop();
    timerAnimRef.current = Animated.timing(timerAnim, {
      toValue: 0,
      duration: ms,
      useNativeDriver: false,
    });
    timerAnimRef.current.start(({ finished }) => {
      if (finished && !endCalledRef.current) {
        // Timed out — count as miss
        setMisses(m => m + 1);
        setFeedback('✕');
        setTimeout(() => setFeedback(null), 300);
        advancePiece(currentIdxRef.current + 1, hitsRef.current);
      }
    });
  }, [sequence, ms]);

  useEffect(() => {
    if (phase !== 'playing' || sequence.length === 0) return;
    advancePiece(0, 0);
    return () => {
      if (timerAnimRef.current) timerAnimRef.current.stop();
    };
  }, [phase, sequence.length]);

  // ── Player taps a column ───────────────────────────────────────────────────────
  const handleColumnTap = useCallback((col) => {
    if (phase !== 'playing' || endCalledRef.current) return;
    if (currentIdxRef.current >= sequence.length) return;

    const currentColor = sequence[currentIdxRef.current];
    const bottomCellColor = board[(CHALLENGE_ROWS - 1) * COLS + col].color;
    const isMatch = bottomCellColor === currentColor;

    if (timerAnimRef.current) timerAnimRef.current.stop();

    if (isMatch) {
      hitsRef.current += 1;
      setHits(hitsRef.current);
      setFeedback('✓');
    } else {
      setMisses(m => m + 1);
      setFeedback('✕');
    }
    setTimeout(() => setFeedback(null), 300);
    advancePiece(currentIdxRef.current + 1, hitsRef.current);
  }, [phase, sequence, board]);

  // ── End challenge ──────────────────────────────────────────────────────────────
  const endChallenge = useCallback((finalHits) => {
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    if (timerAnimRef.current) timerAnimRef.current.stop();
    const perfect = finalHits >= total;
    const pts = finalHits * POINTS_PER_HIT + (perfect ? PERFECT_BONUS : 0);
    setBonusScore(pts);
    setPhase('result');
  }, [total]);

  const handleContinue = useCallback(() => onComplete(bonusScore), [bonusScore, onComplete]);

  const currentColor = phase === 'playing' && sequence.length > 0
    ? sequence[Math.min(currentIdx, sequence.length - 1)]
    : null;

  const perfect = hits >= total && total > 0;

  // ── Countdown ─────────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centreBox}>
          <Text style={styles.challengeLabel}>🎨 COLOR GAUNTLET</Text>
          <Text style={styles.subLabel}>Match each piece to a column of the same color!</Text>
          <Text style={styles.countdownNum}>{countdown || 'GO!'}</Text>
          <Text style={styles.hintText}>
            {pieceCount(wave)} pieces · {(ms / 1000).toFixed(1)}s per piece
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <View style={shared.card}>
            <Text style={styles.resultEmoji}>{perfect ? '🎨' : hits > 0 ? '✅' : '😬'}</Text>
            <Text style={styles.resultTitle}>
              {perfect ? 'FLAWLESS!' : hits > 0 ? 'WELL PLAYED!' : 'NO MATCHES!'}
            </Text>
            <Text style={styles.resultSub}>{hits} / {total} pieces matched</Text>

            <View style={shared.scorePanel}>
              <View style={shared.scoreLine}>
                <Text style={shared.scoreLabel}>PIECES MATCHED</Text>
                <Text style={shared.scoreNum}>{hits} × {POINTS_PER_HIT}</Text>
              </View>
              {perfect && (
                <View style={[shared.scoreLine, { marginTop: 8 }]}>
                  <Text style={[shared.scoreLabel, { color: palette.gold }]}>PERFECT BONUS</Text>
                  <Text style={[shared.scoreNum, { color: palette.gold, fontSize: 20 }]}>+{PERFECT_BONUS}</Text>
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

  // ── Playing ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.playContainer}>
        <View style={styles.header}>
          <Text style={styles.challengeLabel}>🎨 COLOR GAUNTLET</Text>
          <View style={styles.headerStats}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>LEFT</Text>
              <Text style={styles.statPillValue}>{Math.max(0, total - currentIdx)}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>HITS</Text>
              <Text style={styles.statPillValue}>{hits}/{total}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.instruction}>Tap the column that matches this color</Text>

        {/* Incoming piece display */}
        <View style={styles.pieceDisplay}>
          {currentColor && (
            <View style={[styles.incomingPiece, { backgroundColor: currentColor }]}>
              {feedback && (
                <Text style={[styles.feedbackText, { color: feedback === '✓' ? '#00dc64' : palette.danger }]}>
                  {feedback}
                </Text>
              )}
            </View>
          )}
          <Animated.View style={[styles.timerBar, { width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>

        {/* Bottom row color indicators + tap zones */}
        <View style={styles.colTapRow}>
          {Array.from({ length: COLS }, (_, col) => {
            const bottomColor = board[(CHALLENGE_ROWS - 1) * COLS + col].color;
            const isMatch = currentColor === bottomColor;
            return (
              <TouchableOpacity
                key={col}
                style={[styles.colTapZone, isMatch && styles.colTapZoneMatch]}
                onPress={() => handleColumnTap(col)}
                activeOpacity={0.7}
              >
                <View style={[styles.colColorSwatch, { backgroundColor: bottomColor }]} />
                <Text style={styles.dropArrow}>▼</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Board — visual context only */}
        <View style={styles.board}>
          {Array.from({ length: CHALLENGE_ROWS }, (_, r) => (
            <View key={r} style={styles.row}>
              {Array.from({ length: COLS }, (_, c) => (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    { backgroundColor: board[r * COLS + c].color },
                    r === CHALLENGE_ROWS - 1 && styles.cellBottom,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.legendText}>Bottom row shows target colors — match your piece!</Text>
      </View>
    </SafeAreaView>
  );
}

const CELL_SIZE = 46;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  centreBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  challengeLabel: {
    fontSize: 16, fontWeight: '900', letterSpacing: 2,
    color: '#39ff14', textAlign: 'center', paddingHorizontal: 16,
  },
  subLabel: {
    fontSize: 13, color: palette.textSub, letterSpacing: 1,
    textAlign: 'center', paddingHorizontal: 16,
  },
  countdownNum: { fontSize: 80, fontWeight: '900', color: palette.textPrimary, lineHeight: 90 },
  hintText: {
    fontSize: 12, color: palette.textMuted, letterSpacing: 1,
    textAlign: 'center', paddingHorizontal: 16,
  },

  playContainer: {
    flex: 1, alignItems: 'center',
    paddingTop: 14, paddingHorizontal: 14, paddingBottom: 16,
  },
  header: {
    width: '100%', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  headerStats: { flexDirection: 'row', gap: 8 },
  statPill: {
    backgroundColor: palette.card, borderRadius: 10,
    paddingVertical: 4, paddingHorizontal: 10, alignItems: 'center',
    borderWidth: 1, borderColor: palette.surfaceBorder,
  },
  statPillLabel: { fontSize: 8, color: palette.textMuted, letterSpacing: 1, fontWeight: '700' },
  statPillValue: { fontSize: 16, fontWeight: '900', color: '#a0a0ff' },

  instruction: {
    fontSize: 12, color: palette.textMuted, letterSpacing: 1,
    marginBottom: 8, textAlign: 'center', paddingHorizontal: 16,
  },

  pieceDisplay: {
    alignItems: 'center',
    marginBottom: 10,
    width: CELL_SIZE * 2,
  },
  incomingPiece: {
    width: CELL_SIZE * 2,
    height: CELL_SIZE * 2,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 36,
    fontWeight: '900',
  },
  timerBar: {
    height: 5,
    backgroundColor: '#39ff14',
    borderRadius: 3,
    alignSelf: 'flex-start',
  },

  colTapRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  colTapZone: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  colTapZoneMatch: {
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  colColorSwatch: {
    width: CELL_SIZE - 10,
    height: 10,
    borderRadius: 3,
    marginBottom: 3,
  },
  dropArrow: { fontSize: 14, color: palette.accent, opacity: 0.6 },

  board: {
    backgroundColor: palette.surface, borderRadius: 12,
    padding: 10, borderWidth: 2, borderColor: palette.surfaceBorder, gap: 4,
  },
  row: { flexDirection: 'row', gap: 4 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 8 },
  cellBottom: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  legendText: {
    marginTop: 10, fontSize: 11, color: palette.textMuted,
    textAlign: 'center', letterSpacing: 0.5,
  },

  resultScroll: {
    flexGrow: 1, backgroundColor: palette.bg,
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  resultEmoji: { fontSize: 52, marginBottom: 8 },
  resultTitle: {
    fontSize: 24, fontWeight: '900', letterSpacing: 2,
    color: palette.textPrimary, marginBottom: 4,
    textAlign: 'center', paddingHorizontal: 8,
  },
  resultSub: {
    fontSize: 13, color: palette.textSub, marginBottom: 16,
    letterSpacing: 1, textAlign: 'center',
  },
});
