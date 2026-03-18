// src/components/BlindDropChallenge.jsx
// Inter-wave challenge: targets are shown briefly then hidden.
// The player must drop pieces from memory onto where the targets were.
// Higher waves = more targets + shorter reveal window.

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
const PIECES_PER_ROUND = 6;
const POINTS_PER_HIT   = 200; // higher reward since it's harder
const PERFECT_BONUS    = 600;
const COUNTDOWN_SECS   = 3;

// How long targets are visible before going dark (ms) — shrinks with wave
function revealDuration(wave) {
  return Math.max(1200, 3000 - wave * 150);
}

// How many targets (scales with wave)
function targetCount(wave) {
  return Math.min(2 + Math.floor(wave / 2), 7);
}

function buildBoard(wave) {
  const totalCells = CHALLENGE_ROWS * COLS;
  const numTargets = targetCount(wave);
  const positions = new Set();
  while (positions.size < numTargets) {
    positions.add(Math.floor(Math.random() * totalCells));
  }
  return Array.from({ length: totalCells }, (_, i) => ({
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    isTarget: positions.has(i),
    isHit: false,
    isMissed: false,
  }));
}

// ── Phase flow: countdown → reveal → hidden → result ──────────────────────────
// 'reveal'  — targets are visibly glowing (memorize!)
// 'hidden'  — targets hidden, player drops pieces
// 'result'  — show outcome

export default function BlindDropChallenge({ wave, onComplete }) {
  const [phase, setPhase] = useState('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [board, setBoard] = useState(() => buildBoard(wave));
  const [piecesLeft, setPiecesLeft] = useState(PIECES_PER_ROUND);
  const [hitsThisRound, setHitsThisRound] = useState(0);
  const [bonusScore, setBonusScore] = useState(0);
  const [selectedCol, setSelectedCol] = useState(null);
  const [revealProgress, setRevealProgress] = useState(1); // 1 → 0 countdown bar

  const arrowAnim = useRef(new Animated.Value(0)).current;
  const cellScales = useRef(
    Array.from({ length: CHALLENGE_ROWS * COLS }, () => new Animated.Value(1)),
  ).current;
  const hitsRef = useRef(0);
  const numTargets = targetCount(wave);
  const reveal = revealDuration(wave);

  // ── Countdown ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('reveal'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Reveal phase — show targets, then hide them ────────────────────────────────
  useEffect(() => {
    if (phase !== 'reveal') return;
    // Animate the progress bar draining
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setRevealProgress(Math.max(0, 1 - elapsed / reveal));
    }, 50);
    const t = setTimeout(() => {
      clearInterval(interval);
      setRevealProgress(0);
      setPhase('hidden');
    }, reveal);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [phase]);

  // ── Arrow bounce (hidden phase) ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'hidden') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 8, duration: 400, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ).start();
    return () => arrowAnim.stopAnimation();
  }, [phase]);

  // ── Drop a piece ───────────────────────────────────────────────────────────────
  const dropIntoColumn = useCallback((col) => {
    if (phase !== 'hidden' || piecesLeft <= 0) return;

    setBoard(prev => {
      let landRow = -1;
      for (let r = CHALLENGE_ROWS - 1; r >= 0; r--) {
        const idx = r * COLS + col;
        if (!prev[idx].isHit && !prev[idx].isMissed) { landRow = r; break; }
      }
      if (landRow === -1) return prev;

      const idx = landRow * COLS + col;
      const isHit = prev[idx].isTarget;

      Animated.sequence([
        Animated.timing(cellScales[idx], { toValue: 1.35, duration: 120, useNativeDriver: true }),
        Animated.timing(cellScales[idx], { toValue: 1,    duration: 180, useNativeDriver: true }),
      ]).start();

      if (isHit) {
        hitsRef.current += 1;
        setHitsThisRound(hitsRef.current);
        if (hitsRef.current >= numTargets) {
          const next = prev.map((cell, i) =>
            i === idx ? { ...cell, isHit: true } : cell,
          );
          setTimeout(() => endChallenge(hitsRef.current, next), 300);
          return next;
        }
      }

      return prev.map((cell, i) =>
        i === idx ? { ...cell, isHit: isHit, isMissed: !isHit } : cell,
      );
    });

    setPiecesLeft(p => {
      const remaining = p - 1;
      if (remaining <= 0) {
        setTimeout(() => endChallenge(hitsRef.current, null), 400);
      }
      return remaining;
    });
  }, [phase, piecesLeft, numTargets]);

  // ── End challenge ──────────────────────────────────────────────────────────────
  const endChallenge = useCallback((hits, finalBoard) => {
    const perfect = hits >= numTargets;
    const pts = hits * POINTS_PER_HIT + (perfect ? PERFECT_BONUS : 0);
    setBonusScore(pts);
    setPhase('result');
    const reveal = (b) =>
      b.map(cell => cell.isTarget && !cell.isHit ? { ...cell, isMissed: true } : cell);
    if (finalBoard) setBoard(reveal(finalBoard));
    else setBoard(prev => reveal(prev));
  }, [numTargets]);

  const handleContinue = useCallback(() => onComplete(bonusScore), [bonusScore, onComplete]);

  const perfect = hitsThisRound >= numTargets;

  function renderCell(cell, idx, showTargets) {
    const scale = cellScales[idx];
    let overlay = null;
    if (cell.isHit) {
      overlay = (
        <View style={styles.hitOverlay} pointerEvents="none">
          <Text style={styles.hitIcon}>✓</Text>
        </View>
      );
    } else if (cell.isMissed) {
      overlay = (
        <View style={styles.missedOverlay} pointerEvents="none">
          <Text style={styles.missedIcon}>✕</Text>
        </View>
      );
    } else if (cell.isTarget && showTargets) {
      overlay = (
        <View style={styles.targetOverlay} pointerEvents="none">
          <Text style={styles.targetIcon}>👁</Text>
        </View>
      );
    }
    return (
      <Animated.View
        key={idx}
        style={[styles.cell, { backgroundColor: cell.color, transform: [{ scale }] }]}
      >
        {overlay}
      </Animated.View>
    );
  }

  // ── Countdown screen ───────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centreBox}>
          <Text style={styles.challengeLabel}>👁 BLIND DROP</Text>
          <Text style={styles.subLabel}>Memorize the targets — then drop from memory!</Text>
          <Text style={styles.countdownNum}>{countdown || 'GO!'}</Text>
          <Text style={styles.hintText}>
            {numTargets} target{numTargets !== 1 ? 's' : ''} · {(reveal / 1000).toFixed(1)}s to memorize
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Result screen ──────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <View style={shared.card}>
            <Text style={styles.resultEmoji}>{perfect ? '🧠' : hitsThisRound > 0 ? '👁' : '😵'}</Text>
            <Text style={styles.resultTitle}>
              {perfect ? 'PERFECT MEMORY!' : hitsThisRound > 0 ? 'GOOD RECALL!' : 'FORGOT ALREADY?'}
            </Text>
            <Text style={styles.resultSub}>{hitsThisRound} / {numTargets} targets hit</Text>

            <View style={styles.resultBoard}>
              {Array.from({ length: CHALLENGE_ROWS }, (_, r) => (
                <View key={r} style={styles.row}>
                  {Array.from({ length: COLS }, (_, c) => {
                    const cell = board[r * COLS + c];
                    return renderCell(cell, r * COLS + c, true);
                  })}
                </View>
              ))}
            </View>

            <View style={shared.scorePanel}>
              <View style={shared.scoreLine}>
                <Text style={shared.scoreLabel}>TARGET HITS</Text>
                <Text style={shared.scoreNum}>{hitsThisRound} × {POINTS_PER_HIT}</Text>
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

  const isReveal = phase === 'reveal';

  // ── Reveal / Hidden playing screen ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.playContainer}>
        <View style={styles.header}>
          <Text style={styles.challengeLabel}>👁 BLIND DROP</Text>
          <View style={styles.headerStats}>
            {isReveal ? (
              <View style={styles.statPill}>
                <Text style={styles.statPillLabel}>MEMORIZE!</Text>
                <Text style={[styles.statPillValue, { color: palette.gold }]}>👁</Text>
              </View>
            ) : (
              <>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>DROPS</Text>
                  <Text style={styles.statPillValue}>{piecesLeft}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>HITS</Text>
                  <Text style={styles.statPillValue}>{hitsThisRound}/{numTargets}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {isReveal ? (
          <>
            <Text style={styles.instruction}>Remember the 👁 positions!</Text>
            <View style={styles.revealBar}>
              <View style={[styles.revealBarFill, { width: `${revealProgress * 100}%` }]} />
            </View>
          </>
        ) : (
          <Text style={styles.instruction}>Drop from memory — where were the targets?</Text>
        )}

        {/* Column tap zones — only active when hidden */}
        {!isReveal && (
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
        )}

        <View style={styles.board}>
          {Array.from({ length: CHALLENGE_ROWS }, (_, r) => (
            <View key={r} style={styles.row}>
              {Array.from({ length: COLS }, (_, c) => {
                const cell = board[r * COLS + c];
                return renderCell(cell, r * COLS + c, isReveal);
              })}
            </View>
          ))}
        </View>

        <Text style={styles.legendText}>
          {isReveal
            ? `👁 = target — you have ${(reveal / 1000).toFixed(1)}s to memorize`
            : '🎯 Drop pieces where the targets were!'}
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
    color: '#b366ff', textAlign: 'center', paddingHorizontal: 16,
  },
  subLabel: {
    fontSize: 13, color: palette.textSub, letterSpacing: 1,
    textAlign: 'center', paddingHorizontal: 16,
  },
  countdownNum: {
    fontSize: 80, fontWeight: '900', color: palette.textPrimary, lineHeight: 90,
  },
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
    marginBottom: 6, textAlign: 'center', paddingHorizontal: 16,
  },

  revealBar: {
    width: '80%', height: 6, backgroundColor: palette.surfaceBorder,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  revealBarFill: {
    height: '100%', backgroundColor: '#b366ff', borderRadius: 3,
  },

  dropZone: {
    flexDirection: 'row',
    width: COLS * CELL_SIZE + (COLS - 1) * 4 + 20,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  colTapZone: { width: CELL_SIZE, alignItems: 'center', paddingVertical: 4 },
  dropArrow: { fontSize: 18, color: palette.accent, opacity: 0.5 },
  dropArrowActive: { opacity: 1, color: palette.gold },

  board: {
    backgroundColor: palette.surface, borderRadius: 12,
    padding: 10, borderWidth: 2, borderColor: palette.surfaceBorder, gap: 4,
  },
  row: { flexDirection: 'row', gap: 4 },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE, borderRadius: 8,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },

  targetOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(179,102,255,0.3)',
    borderRadius: 8, borderWidth: 2, borderColor: '#b366ff',
    justifyContent: 'center', alignItems: 'center',
  },
  targetIcon: { fontSize: 20 },
  hitOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,220,100,0.45)',
    borderRadius: 8, borderWidth: 2, borderColor: '#00dc64',
    justifyContent: 'center', alignItems: 'center',
  },
  hitIcon: { fontSize: 22, color: '#fff', fontWeight: '900' },
  missedOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(244,67,54,0.35)',
    borderRadius: 8, borderWidth: 2, borderColor: palette.danger,
    justifyContent: 'center', alignItems: 'center',
  },
  missedIcon: { fontSize: 18, color: palette.danger, fontWeight: '900' },

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
  resultBoard: {
    backgroundColor: palette.surface, borderRadius: 12,
    padding: 10, borderWidth: 2, borderColor: palette.surfaceBorder,
    gap: 4, marginBottom: 16,
  },
});
