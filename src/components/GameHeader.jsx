// src/components/GameHeader.jsx
// Displays the game title, score/row/next-row stats, pause button, and the
// side-rotation indicator with a visual cube thumbnail.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { shared, palette } from '../theme';
import { SIDES } from '../game/constants';

const SIDE_NAMES = ['FRONT', 'RIGHT', 'BACK', 'LEFT'];

// Mini isometric cube face indicator — shows which face is active
function CubeIndicator({ currentSide }) {
  // Each of 4 sides shown as a small colored square strip
  const sideColors = ['#5533ff', '#3322bb', '#221188', '#443399'];
  return (
    <View style={cubeStyles.wrap}>
      {[0, 1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            cubeStyles.face,
            {
              backgroundColor: i === currentSide ? sideColors[0] : '#1e1e44',
              borderColor: i === currentSide ? '#a0a0ff' : '#2d2d5e',
              transform: [{ scaleY: i === currentSide ? 1.2 : 1 }],
            },
          ]}
        >
          <Text style={cubeStyles.faceLabel}>{SIDE_NAMES[i][0]}</Text>
        </View>
      ))}
    </View>
  );
}

export default function GameHeader({
  score,
  activeCount,
  clicksUntilNew,
  currentSide,
  onRotate,
  onPause,
  onWatchAd,
  rewardedReady,
  wave = 1,
}) {
  return (
    <>
      {/* Title row with pause button */}
      <View style={hStyles.titleRow}>
        <Text style={shared.gameTitle}>SPINSTACK</Text>
        <TouchableOpacity
          onPress={onPause}
          activeOpacity={0.7}
          style={hStyles.pauseBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={hStyles.pauseIcon}>⏸</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={shared.statsRow}>
        <View style={shared.statBox}>
          <Text style={shared.statLabel}>SCORE</Text>
          <Text style={shared.statValue}>{score.toLocaleString()}</Text>
        </View>
        <View style={shared.statBox}>
          <Text style={shared.statLabel}>WAVE</Text>
          <Text style={[shared.statValue, { color: wave > 1 ? '#ffd700' : '#a0a0ff' }]}>{wave}</Text>
        </View>
        <View style={shared.statBox}>
          <Text style={shared.statLabel}>ROWS</Text>
          <Text style={shared.statValue}>{activeCount}</Text>
        </View>
        <View style={shared.statBox}>
          <Text style={shared.statLabel}>NEXT ROW</Text>
          <Text style={[shared.statValue, { color: clicksUntilNew <= 2 ? '#f44336' : '#a0a0ff' }]}>
            {clicksUntilNew}
          </Text>
        </View>
      </View>

      {/* Side indicator with cube visual and larger tap targets */}
      <View style={shared.sideIndicator}>
        <TouchableOpacity
          onPress={() => onRotate('right')}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 8 }}
          style={hStyles.arrowBtn}
        >
          <Text style={shared.rotateArrow}>◀</Text>
        </TouchableOpacity>

        <CubeIndicator currentSide={currentSide} />

        <Text style={shared.sideLabel}>{SIDE_NAMES[currentSide]}</Text>

        <TouchableOpacity
          onPress={() => onRotate('left')}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 8, right: 16 }}
          style={hStyles.arrowBtn}
        >
          <Text style={shared.rotateArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Rewarded ad button — only shown when an ad is loaded */}
      {rewardedReady && (
        <TouchableOpacity
          style={hStyles.rewardedBtn}
          onPress={onWatchAd}
          activeOpacity={0.8}
        >
          <Text style={hStyles.rewardedBtnText}>📺 Watch Ad → Free ❄️ Freeze</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const hStyles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 8,
  },
  pauseBtn: {
    position: 'absolute',
    right: 0,
    padding: 8,
    backgroundColor: palette.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
  },
  pauseIcon: {
    fontSize: 16,
    color: palette.textMuted,
  },
  arrowBtn: {
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardedBtn: {
    marginTop: 6,
    marginHorizontal: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#1a1a3e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#5533ff88',
    alignItems: 'center',
  },
  rewardedBtnText: {
    fontSize: 12,
    color: '#a0a0ff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const cubeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  face: {
    width: 20,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#a0a0ff',
    letterSpacing: 0,
  },
});
