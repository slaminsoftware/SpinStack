// src/components/SequenceDropChallenge.jsx
// Inter-wave challenge: a sequence of column numbers is shown briefly.
// The player must then drop pieces in that exact order from memory.
// Wrong order = miss. Sequence length and reveal time scale with wave.

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
const POINTS_PER_HIT   = 200;
const PERFECT_BONUS    = 600;
const COUNTDOWN_SECS   = 3;

// Sequence length grows with wave
function sequenceLength(wave) {
  return Math.min(3 + Math.floor(wave / 2), 8);
}

// How long the full sequence is shown (ms) — tighter at higher waves
function revealDuration(wave) {
  return Math.max(1500, 4000 - wave * 175);
}

function buildBoard() {
  return Array.from({ length: CHALLENGE_ROWS * COLS }, () => ({
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

function buildSequence(wave) {
  const len = sequenceLength(wave);
  // Allow repeats but avoid the same column 3x in a row
  const seq = [];
  for (let i = 0; i < len; i++) {
    let col;
    do {
      col = Math.floor(Math.random() * COLS);
    } while (seq.length >= 2 && seq[seq.length - 1] === col && seq[seq.length - 2] === col);
    seq.push(col);
  }
  return seq;
}

export default function SequenceDropChallenge({ wave, onComplete }) {
  const [phase, setPhase] = useState('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [board] = useState(() => buildBoard());
  const [sequence] = useState(() => buildSequence(wave));
  const [dropIdx, setDropIdx] = useState(0);  // which step player is on
  const [hits, setHits] = useState(0);
  const [bonusScore, setBonusScore] = useState(0);
  const [revealProgress, setRevealProgress] = useState(1);
  const [activeCol, setActiveCol] = useState(null); // flash on tap

  // Per-step feedback: null | 'hit' | 'miss'
  const [stepFeedback, setStepFeedback] = useState(null);

  const hitsRef = useRef(0);
  const dropIdxRef = useRef(0);
  const endCalledRef = useRef(false);
  const reveal = revealDuration(wave);
  const total = sequence.length;

  // Column flash animations
  const colFlash = useRef(
    Array.from({ length: COLS }, () => new Animated.Value(1)),
  ).current;

  // ── Countdown ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('reveal'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Reveal phase ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reveal') return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setRevealProgress(Math.max(0, 1 - elapsed / reveal));
    }, 50);
    const t = setTimeout(() => {
      clearInterval(interval);
      setRevealProgress(0);
      setPhase('playing');
    }, reveal);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [phase]);

  // ── Player taps a column ───────────────────────────────────────────────────────
  const handleColumnTap = useCallback((col) => {
    if (phase !== 'playing' || endCalledRef.current) return;
    const idx = dropIdxRef.current;
    if (idx >= total) return;

    const correct = sequence[idx];
    const isHit = col === correct;

    // Flash the tapped column
    setActiveCol(col);
    Animated.sequence([
      Animated.timing(colFlash[col], { toValue: 0.4, duration: 80, useNativeDriver: true }),
      Animated.timing(colFlash[col], { toValue: 1,   duration: 180, useNativeDriver: true }),
    ]).start(() => setActiveCol(null));

    setStepFeedback(isHit ? 'hit' : 'miss');
    setTimeout(() => setStepFeedback(null), 400);

    if (isHit) {
      hitsRef.current += 1;
      setHits(hitsRef.current);
    }

    const nextIdx = idx + 1;
    dropIdxRef.current = nextIdx;
    setDropIdx(nextIdx);

    if (nextIdx >= total) {
      setTimeout(() => endChallenge(hitsRef.current), 450);
    }
  }, [phase, sequence, total]);

  // ── End challenge ──────────────────────────────────────────────────────────────
  const endChallenge = useCallback((finalHits) => {
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    const perfect = finalHits >= total;
    const pts = finalHits * POINTS_PER_HIT + (perfect ? PERFECT_BONUS : 0);
    setBonusScore(pts);
    setPhase('result');
  }, [total]);

  const handleContinue = useCallback(() => onComplete(bonusScore), [bonusScore, onComplete]);

  const perfect = hits >= total;
  const isReveal = phase === 'reveal';
  const progress = `${Math.min(dropIdx, total)} / ${total}`;

  // ── Countdown ─────────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centreBox}>
          <Text style={styles.challengeLabel}>🔢 SEQUENCE DROP</Text>
          <Text style={styles.subLabel}>Memorize the column order — then drop in sequence!</Text>
          <Text style={styles.countdownNum}>{countdown || 'GO!'}</Text>
          <Text style={styles.hintText}>
            {sequenceLength(wave)} steps · {(reveal / 1000).toFixed(1)}s to memorize
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
            <Text style={styles.resultEmoji}>{perfect ? '🧠' : hits > 0 ? '🔢' : '😵'}</Text>
            <Text style={styles.resultTitle}>
              {perfect ? 'PERFECT ORDER!' : hits > 0 ? 'GOOD MEMORY!' : 'OUT OF ORDER!'}
            </Text>
            <Text style={styles.resultSub}>{hits} / {total} steps correct</Text>

            {/* Show the correct sequence for review */}
            <View style={styles.sequenceReview}>
              <Text style={styles.sequenceReviewLabel}>THE SEQUENCE WAS:</Text>
              <View style={styles.sequencePills}>
                {sequence.map((col, i) => (
                  <View key={i} style={styles.seqPill}>
                    <Text style={styles.seqPillText}>{col + 1}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={shared.scorePanel}>
              <View style={shared.scoreLine}>
                <Text style={shared.scoreLabel}>CORRECT STEPS</Text>
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

  // ── Reveal / Playing ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.playContainer}>
        <View style={styles.header}>
          <Text style={styles.challengeLabel}>🔢 SEQUENCE DROP</Text>
          <View style={styles.headerStats}>
            {isReveal ? (
              <View style={styles.statPill}>
                <Text style={styles.statPillLabel}>MEMORIZE!</Text>
                <Text style={[styles.statPillValue, { color: palette.gold }]}>👁</Text>
              </View>
            ) : (
              <>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>STEP</Text>
                  <Text style={styles.statPillValue}>{progress}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>HITS</Text>
                  <Text style={styles.statPillValue}>{hits}/{total}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {isReveal ? (
          <>
            <Text style={styles.instruction}>Remember this column order!</Text>
            <View style={styles.revealBar}>
              <View style={[styles.revealBarFill, { width: `${revealProgress * 100}%` }]} />
            </View>
            {/* Show numbered sequence prominently */}
            <View style={styles.sequenceDisplay}>
              {sequence.map((col, i) => (
                <View key={i} style={styles.seqStep}>
                  <Text style={styles.seqStepNum}>{i + 1}</Text>
                  <View style={styles.seqStepArrow}>
                    <Text style={styles.seqColNum}>{col + 1}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.instruction}>
              {stepFeedback === 'hit' ? '✓ Correct!' : stepFeedback === 'miss' ? '✕ Wrong column!' : `Drop into column ${(sequence[dropIdx] ?? 0) + 1}...`}
            </Text>
            {/* Progress dots */}
            <View style={styles.progressDots}>
              {sequence.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < dropIdx && styles.dotDone,
                    i === dropIdx && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </>
        )}

        {/* Column tap zones */}
        <View style={styles.colTapRow}>
          {Array.from({ length: COLS }, (_, col) => {
            const isNext = !isReveal && sequence[dropIdx] === col;
            return (
              <Animated.View key={col} style={{ opacity: colFlash[col] }}>
                <TouchableOpacity
                  style={[styles.colTapZone, isNext && styles.colTapZoneNext]}
                  onPress={() => handleColumnTap(col)}
                  disabled={isReveal}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.colNum, isNext && styles.colNumNext]}>{col + 1}</Text>
                  <Text style={styles.dropArrow}>▼</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Board — visual backdrop */}
        <View style={styles.board}>
          {Array.from({ length: CHALLENGE_ROWS }, (_, r) => (
            <View key={r} style={styles.row}>
              {Array.from({ length: COLS }, (_, c) => (
                <View key={c} style={[styles.cell, { backgroundColor: board[r * COLS + c].color }]} />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.legendText}>
          {isReveal ? 'Numbers = column positions (1–6)' : 'Tap the columns in the order you memorized'}
        </Text>
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
    color: '#00cfff', textAlign: 'center', paddingHorizontal: 16,
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
    fontSize: 13, color: palette.textMuted, letterSpacing: 0.5,
    marginBottom: 6, textAlign: 'center', paddingHorizontal: 16, fontWeight: '600',
  },

  revealBar: {
    width: '80%', height: 6, backgroundColor: palette.surfaceBorder,
    borderRadius: 3, overflow: 'hidden', marginBottom: 10,
  },
  revealBarFill: { height: '100%', backgroundColor: '#00cfff', borderRadius: 3 },

  sequenceDisplay: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 8,
  },
  seqStep: { alignItems: 'center', gap: 2 },
  seqStepNum: { fontSize: 9, color: palette.textMuted, fontWeight: '700' },
  seqStepArrow: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#00cfff22', borderWidth: 2, borderColor: '#00cfff',
    justifyContent: 'center', alignItems: 'center',
  },
  seqColNum: { fontSize: 18, fontWeight: '900', color: '#00cfff' },

  progressDots: {
    flexDirection: 'row', gap: 6, marginBottom: 8,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: palette.surfaceBorder,
  },
  dotDone: { backgroundColor: '#7aff7a' },
  dotActive: { backgroundColor: '#00cfff', transform: [{ scale: 1.3 }] },

  colTapRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  colTapZone: {
    width: CELL_SIZE, alignItems: 'center', paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: 'transparent',
  },
  colTapZoneNext: {
    borderColor: '#00cfff',
    backgroundColor: 'rgba(0,207,255,0.1)',
  },
  colNum: { fontSize: 13, fontWeight: '900', color: palette.textMuted },
  colNumNext: { color: '#00cfff' },
  dropArrow: { fontSize: 14, color: palette.accent, opacity: 0.6 },

  board: {
    backgroundColor: palette.surface, borderRadius: 12,
    padding: 10, borderWidth: 2, borderColor: palette.surfaceBorder, gap: 4,
  },
  row: { flexDirection: 'row', gap: 4 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 8 },

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
  sequenceReview: {
    width: '100%', alignItems: 'center', marginBottom: 12,
  },
  sequenceReviewLabel: {
    fontSize: 9, color: palette.textMuted, letterSpacing: 2,
    fontWeight: '700', marginBottom: 8,
  },
  sequencePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  seqPill: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#00cfff22', borderWidth: 2, borderColor: '#00cfff',
    justifyContent: 'center', alignItems: 'center',
  },
  seqPillText: { fontSize: 15, fontWeight: '900', color: '#00cfff' },
});
