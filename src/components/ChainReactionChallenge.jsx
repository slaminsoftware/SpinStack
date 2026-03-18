// src/components/ChainReactionChallenge.jsx
// Inter-wave challenge: rows are pre-filled with 5/6 cells already matching.
// The player taps a cell in each row to complete the match and clear it.
// Chaining clears within 1 second earns a multiplier bonus.

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
const CHALLENGE_ROWS   = 4;   // pre-filled rows to clear
const POINTS_PER_CLEAR = 200; // per row cleared
const CHAIN_BONUS      = 150; // extra per row when chaining (cleared within 1s)
const PERFECT_BONUS    = 400; // all rows cleared
const COUNTDOWN_SECS   = 3;
const TIME_LIMIT_SECS  = 15;  // total time to clear as many rows as possible

// Build rows where 5 of 6 cells already match — one tap clears each
function buildRows(wave) {
  const numRows = Math.min(CHALLENGE_ROWS + Math.floor(wave / 3), 6);
  return Array.from({ length: numRows }, () => {
    const winColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const otherColors = COLORS.filter(c => c !== winColor);
    const oddColor = otherColors[Math.floor(Math.random() * otherColors.length)];
    const oddIndex = Math.floor(Math.random() * COLS);
    return {
      cells: Array.from({ length: COLS }, (_, i) => i === oddIndex ? oddColor : winColor),
      winColor,
      oddIndex,
      cleared: false,
      clearing: false, // animation in progress
    };
  });
}

export default function ChainReactionChallenge({ wave, onComplete }) {
  const [phase, setPhase] = useState('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [rows, setRows] = useState(() => buildRows(wave));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECS);
  const [clearedCount, setClearedCount] = useState(0);
  const [chainCount, setChainCount] = useState(0);
  const [bonusScore, setBonusScore] = useState(0);
  const [lastChainLabel, setLastChainLabel] = useState(null);

  const lastClearTime = useRef(0);
  const chainRef = useRef(0);
  const clearedRef = useRef(0);
  const timerRef = useRef(null);
  const endCalledRef = useRef(false);

  const numRows = rows.length;

  // Row flash animations — one per row
  const rowFlash = useRef(rows.map(() => new Animated.Value(1))).current;

  // ── Countdown ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('playing'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Countdown timer once playing ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!endCalledRef.current) endChallenge(clearedRef.current, chainRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Tap a cell ─────────────────────────────────────────────────────────────────
  const handleCellTap = useCallback((rowIdx, colIdx) => {
    if (phase !== 'playing') return;

    setRows(prev => {
      const row = prev[rowIdx];
      if (!row || row.cleared || row.clearing) return prev;

      // Only the odd-one-out cell needs to be tapped to complete the match
      if (colIdx !== row.oddIndex) return prev;

      // Flash animation
      Animated.sequence([
        Animated.timing(rowFlash[rowIdx], { toValue: 0.3, duration: 80, useNativeDriver: true }),
        Animated.timing(rowFlash[rowIdx], { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start();

      const now = Date.now();
      const isChain = now - lastClearTime.current < 1000;
      lastClearTime.current = now;

      if (isChain) {
        chainRef.current += 1;
        setChainCount(c => c + 1);
        const label = `🔥 CHAIN x${chainRef.current + 1}!`;
        setLastChainLabel(label);
        setTimeout(() => setLastChainLabel(null), 900);
      } else {
        chainRef.current = 0;
      }

      clearedRef.current += 1;
      setClearedCount(c => {
        const next = c + 1;
        if (next >= numRows) {
          setTimeout(() => endChallenge(next, chainRef.current), 400);
        }
        return next;
      });

      return prev.map((r, i) =>
        i === rowIdx ? { ...r, clearing: true, cleared: true } : r,
      );
    });
  }, [phase, numRows]);

  // ── End challenge ──────────────────────────────────────────────────────────────
  const endChallenge = useCallback((cleared, chains) => {
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    clearInterval(timerRef.current);
    const perfect = cleared >= numRows;
    const pts =
      cleared * POINTS_PER_CLEAR +
      chains * CHAIN_BONUS +
      (perfect ? PERFECT_BONUS : 0);
    setBonusScore(pts);
    setPhase('result');
  }, [numRows]);

  const handleContinue = useCallback(() => {
    onComplete(bonusScore);
  }, [bonusScore, onComplete]);

  const perfect = clearedCount >= numRows;

  // ── Countdown screen ───────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centreBox}>
          <Text style={styles.challengeLabel}>🔥 CHAIN REACTION</Text>
          <Text style={styles.subLabel}>Tap the odd cell to clear each row!</Text>
          <Text style={styles.countdownNum}>{countdown || 'GO!'}</Text>
          <Text style={styles.hintText}>
            {numRows} rows · {TIME_LIMIT_SECS}s · chain clears for bonus!
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
            <Text style={styles.resultEmoji}>{perfect ? '🔥' : clearedCount > 0 ? '⚡' : '😅'}</Text>
            <Text style={styles.resultTitle}>
              {perfect ? 'CHAIN MASTER!' : clearedCount > 0 ? 'NICE CHAIN!' : 'NO CLEARS!'}
            </Text>
            <Text style={styles.resultSub}>{clearedCount} / {numRows} rows cleared</Text>

            <View style={shared.scorePanel}>
              <View style={shared.scoreLine}>
                <Text style={shared.scoreLabel}>ROWS CLEARED</Text>
                <Text style={shared.scoreNum}>{clearedCount} × {POINTS_PER_CLEAR}</Text>
              </View>
              {chainCount > 0 && (
                <View style={[shared.scoreLine, { marginTop: 8 }]}>
                  <Text style={[shared.scoreLabel, { color: '#ff8c00' }]}>CHAIN BONUS</Text>
                  <Text style={[shared.scoreNum, { color: '#ff8c00', fontSize: 20 }]}>
                    +{chainCount * CHAIN_BONUS}
                  </Text>
                </View>
              )}
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

  // ── Playing screen ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.playContainer}>
        <View style={styles.header}>
          <Text style={styles.challengeLabel}>🔥 CHAIN REACTION</Text>
          <View style={styles.headerStats}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>TIME</Text>
              <Text style={[styles.statPillValue, timeLeft <= 5 && { color: palette.danger }]}>
                {timeLeft}s
              </Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>CLEARED</Text>
              <Text style={styles.statPillValue}>{clearedCount}/{numRows}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.instruction}>Tap the odd-colored cell in each row</Text>

        {lastChainLabel && (
          <Text style={styles.chainLabel}>{lastChainLabel}</Text>
        )}

        <View style={styles.board}>
          {rows.map((row, rowIdx) => (
            <Animated.View
              key={rowIdx}
              style={[styles.row, { opacity: row.cleared ? 0.25 : rowFlash[rowIdx] }]}
            >
              {row.cells.map((color, colIdx) => (
                <TouchableOpacity
                  key={colIdx}
                  style={[
                    styles.cell,
                    { backgroundColor: color },
                    colIdx === row.oddIndex && !row.cleared && styles.cellOdd,
                  ]}
                  onPress={() => handleCellTap(rowIdx, colIdx)}
                  activeOpacity={0.7}
                  disabled={row.cleared}
                />
              ))}
            </Animated.View>
          ))}
        </View>

        <Text style={styles.legendText}>
          🔥 Clear rows within 1s of each other to chain!
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
    color: '#ff8c00', textAlign: 'center', paddingHorizontal: 16,
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
  statPillLabel: {
    fontSize: 8, color: palette.textMuted, letterSpacing: 1, fontWeight: '700',
  },
  statPillValue: { fontSize: 16, fontWeight: '900', color: '#a0a0ff' },

  instruction: {
    fontSize: 12, color: palette.textMuted, letterSpacing: 1,
    marginBottom: 6, textAlign: 'center', paddingHorizontal: 16,
  },
  chainLabel: {
    fontSize: 20, fontWeight: '900', color: '#ff8c00',
    letterSpacing: 1, marginBottom: 8, textAlign: 'center',
  },

  board: {
    backgroundColor: palette.surface, borderRadius: 12,
    padding: 10, borderWidth: 2, borderColor: palette.surfaceBorder, gap: 4,
  },
  row: { flexDirection: 'row', gap: 4 },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE, borderRadius: 8,
  },
  cellOdd: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
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
