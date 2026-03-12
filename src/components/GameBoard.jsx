// src/components/GameBoard.jsx
// Renders the full 12-row game board.
//
// Animations:
//   - Brick tap ripple: radial white ring that expands + fades on press
//   - Row shake: horizontal vibration before a row clears
//   - New-row entrance: slides in from below with a bounce
//   - Side-rotation slide: board slides out/in when rotating sides
//   - Special brick shimmer: rotating glow overlay in addition to scale pulse
//   - Danger divider pulse: opacity throbs based on board fill level
//   - Long-press tooltip: shows power-up description on long press

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLS, DANGER_START, SPECIALS } from '../game/constants';
import { isSpecial, cellColor } from '../game/gridHelpers';
import { shared } from '../theme';

const BRICK_HEIGHT = 44;
const ROW_GAP      = 5;
const BOARD_PAD    = 10;
const SCREEN_W     = Dimensions.get('window').width;

const DIVIDER_TOP =
  BOARD_PAD + DANGER_START * (BRICK_HEIGHT + ROW_GAP) - ROW_GAP / 2;

// Ripple overlay shown on brick tap
function TapRipple({ trigger }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    scale.setValue(0);
    opacity.setValue(0.6);
    Animated.parallel([
      Animated.timing(scale,   { toValue: 3, duration: 350, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [trigger]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ripple, { opacity, transform: [{ scale }] }]}
    />
  );
}

// Single animated brick
function Brick({ cell, onPress, isFlashing, isRemoving, onLongPress }) {
  const special      = isSpecial(cell);
  const bg           = cellColor(cell);
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const pulseLoop    = useRef(null);
  const shimmerAnim  = useRef(new Animated.Value(0)).current;
  const shimmerLoop  = useRef(null);
  const [ripple, setRipple] = useState(0);

  useEffect(() => {
    if (special && !isRemoving) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 850, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 850, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();

      shimmerLoop.current = Animated.loop(
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: false })
      );
      shimmerLoop.current.start();
    }
    return () => { pulseLoop.current?.stop(); shimmerLoop.current?.stop(); };
  }, [special, isRemoving]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1], outputRange: [0.05, 0.4, 0.05],
  });

  return (
    <Animated.View style={[styles.brickWrap, special && { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={isRemoving ? undefined : (e) => { setRipple(r => r + 1); onPress(e); }}
        onLongPress={special && !isRemoving ? onLongPress : undefined}
        delayLongPress={400}
        style={[
          styles.brick,
          { backgroundColor: bg },
          isFlashing && { borderWidth: 2, borderColor: '#fff' },
        ]}
      >
        <View style={styles.shine} pointerEvents="none" />
        {special && (
          <Animated.View pointerEvents="none" style={[styles.shimmer, { opacity: shimmerOpacity }]} />
        )}
        <TapRipple trigger={ripple} />
        {special && <Text style={styles.specialEmoji}>{cell.emoji}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Single animated row
function BrickRow({ row, rowIdx, isNull, isRemoving, isFlashing, isDanger, onBrickPress, onBrickLongPress, isNew }) {
  const opacity    = useRef(new Animated.Value(1)).current;
  const scaleY     = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  // Track whether this specific instance has already played its entrance animation
  const didAnimIn  = useRef(false);

  // Bounce entrance — only fires once per component mount when isNew is true
  useEffect(() => {
    if (isNew && !didAnimIn.current) {
      didAnimIn.current = true;
      translateY.setValue(60);
      Animated.spring(translateY, {
        toValue: 0, tension: 180, friction: 8, useNativeDriver: true,
      }).start();
    }
  }, [isNew]);

  // Shake then collapse on clear
  useEffect(() => {
    if (isRemoving) {
      Animated.sequence([
        Animated.sequence([
          Animated.timing(translateX, { toValue: -8, duration: 50, useNativeDriver: true }),
          Animated.timing(translateX, { toValue:  8, duration: 50, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -6, duration: 40, useNativeDriver: true }),
          Animated.timing(translateX, { toValue:  6, duration: 40, useNativeDriver: true }),
          Animated.timing(translateX, { toValue:  0, duration: 30, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleY,  { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      opacity.setValue(1);
      scaleY.setValue(1);
    }
  }, [isRemoving]);

  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ scaleY }, { translateX }, { translateY }] }]}>
      {isNull
        ? Array.from({ length: COLS }).map((_, ci) => (
            <View key={ci} style={[styles.emptySlot, isDanger ? styles.emptySlotDanger : styles.emptySlotSafe]} />
          ))
        : row.map((cell, colIdx) => (
            <Brick key={colIdx} cell={cell} isFlashing={isFlashing} isRemoving={isRemoving}
              onPress={(e) => onBrickPress(rowIdx, colIdx, e)}
              onLongPress={() => onBrickLongPress && onBrickLongPress(cell)}
            />
          ))
      }
    </Animated.View>
  );
}

// Slides board in from opposite side when currentSide changes
function SideSlideWrapper({ currentSide, children }) {
  const slideX   = useRef(new Animated.Value(0)).current;
  const prevSide = useRef(currentSide);

  useEffect(() => {
    if (prevSide.current === currentSide) return;
    const dir = ((currentSide - prevSide.current + 4) % 4 <= 2) ? 1 : -1;
    prevSide.current = currentSide;
    slideX.setValue(dir * SCREEN_W * 0.9);
    Animated.spring(slideX, { toValue: 0, tension: 200, friction: 20, useNativeDriver: true }).start();
  }, [currentSide]);

  return (
    <Animated.View style={{ transform: [{ translateX: slideX }] }}>
      {children}
    </Animated.View>
  );
}

// Danger divider that pulses faster as urgency increases
function DangerDivider({ urgency }) {
  const anim     = useRef(new Animated.Value(0.45)).current;
  const loopRef  = useRef(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (urgency <= 0) { anim.setValue(0.45); return; }
    const dur = 300 + (1 - urgency) * 700;
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.95, duration: dur, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0.2,  duration: dur, useNativeDriver: false }),
      ])
    );
    loopRef.current.start();
    return () => loopRef.current?.stop();
  }, [urgency]);

  const bgColor = anim.interpolate({
    inputRange: [0.2, 0.95],
    outputRange: ['rgba(244,67,54,0.2)', 'rgba(244,67,54,0.95)'],
  });

  return (
    <Animated.View
      style={[shared.boardDivider, { top: DIVIDER_TOP, backgroundColor: bgColor }]}
      pointerEvents="none"
    />
  );
}

// Tooltip overlay for special brick long-press
function SpecialTooltip({ special, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!special) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [special]);

  if (!special) return null;
  return (
    <TouchableOpacity
      style={styles.tooltipOverlay}
      onPress={onDismiss}
      activeOpacity={1}
    >
      <Animated.View style={[styles.tooltip, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.tooltipEmoji}>{special.emoji}</Text>
        <Text style={styles.tooltipLabel}>{special.label}</Text>
        <Text style={styles.tooltipDesc}>{special.desc}</Text>
        <Text style={styles.tooltipDismiss}>Tap to dismiss</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Full board
export default function GameBoard({ grid, currentSide, removingRows, flashRows, onBrickClick, rotateFlash, newRowIndex, dangerUrgency, emptySlots }) {
  const [tooltip, setTooltip] = useState(null);
  const DANGER_THRESHOLD = 4;

  // Assign each row a stable identity that survives grid compaction.
  // We tag rows with a uid when they're first seen so that React never
  // re-uses a BrickRow component instance for a different logical row,
  // which is what caused the entrance-animation flicker.
  const rowUids = useRef(new WeakMap());
  const uidCounter = useRef(0);
  grid.forEach(row => {
    if (row && !rowUids.current.has(row)) {
      rowUids.current.set(row, ++uidCounter.current);
    }
  });

  // Resolve the new-row's uid by object reference, not by index.
  // After compaction the new row may have shifted to a different index,
  // which was causing the existing row to incorrectly receive isNew=true
  // and replay its bounce animation.
  const newRowObject = (newRowIndex !== null && newRowIndex !== undefined) ? grid[newRowIndex] : null;
  const newRowUid    = newRowObject ? rowUids.current.get(newRowObject) : null;

  return (
    <>
      <View style={shared.board}>
        <DangerDivider urgency={dangerUrgency ?? 0} />
        {rotateFlash && <View style={shared.rotateFlash} pointerEvents="none" />}
        <SideSlideWrapper currentSide={currentSide}>
          {grid.map((row, rowIdx) => {
            const uid = row ? rowUids.current.get(row) : null;
            return (
              <BrickRow
                key={row ? uid : `empty-${rowIdx}`}
                row={row === null ? null : row.sides[currentSide]}
                rowIdx={rowIdx}
                isNull={row === null}
                isRemoving={removingRows.has(rowIdx)}
                isFlashing={flashRows.has(rowIdx)}
                isDanger={rowIdx >= DANGER_START}
                onBrickPress={onBrickClick}
                onBrickLongPress={(cell) => isSpecial(cell) && setTooltip(cell)}
                isNew={uid !== null && uid === newRowUid}
              />
            );
          })}
        </SideSlideWrapper>
      </View>

      {/* Only show danger label when actually in danger */}
      {emptySlots <= DANGER_THRESHOLD && (
        <Text style={shared.dangerLabel}>
          ⚠️ DANGER ZONE — {emptySlots} slot{emptySlots !== 1 ? 's' : ''} remaining
        </Text>
      )}

      <View style={shared.powerupBar}>
        {Object.values(SPECIALS).map((s) => (
          <View key={s.type} style={[shared.powerupChip, { borderColor: s.bg + '55' }]}>
            <Text style={{ fontSize: 13 }}>{s.emoji}</Text>
            <Text style={shared.powerupChipText}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Long-press tooltip */}
      <SpecialTooltip special={tooltip} onDismiss={() => setTooltip(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: ROW_GAP,
    marginBottom: ROW_GAP,
  },
  brickWrap: { flex: 1 },
  brick: {
    flex: 1,
    height: BRICK_HEIGHT,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  shine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  ripple: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  specialEmoji: { fontSize: 20, zIndex: 1 },
  emptySlot: { flex: 1, height: BRICK_HEIGHT, borderRadius: 6, borderStyle: 'dashed', borderWidth: 1 },
  emptySlotSafe:   { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' },
  emptySlotDanger: { backgroundColor: 'rgba(244,67,54,0.06)',   borderColor: 'rgba(244,67,54,0.22)'   },
  tooltipOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
  },
  tooltip: {
    backgroundColor: '#1a1a3e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5533ff',
    shadowColor: '#5533ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 20,
    maxWidth: 240,
  },
  tooltipEmoji: { fontSize: 36, marginBottom: 8 },
  tooltipLabel: { fontSize: 16, fontWeight: '900', color: '#e0e0ff', letterSpacing: 2, marginBottom: 6 },
  tooltipDesc: { fontSize: 13, color: '#aaaacc', textAlign: 'center', lineHeight: 18 },
  tooltipDismiss: { fontSize: 10, color: '#555577', marginTop: 10, letterSpacing: 1 },
});
