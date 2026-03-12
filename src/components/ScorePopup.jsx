// src/components/ScorePopup.jsx
// Renders floating +pts popups that rise up from the tapped brick and fade out.
// Each popup receives an optional { x, y } screen coordinate. When present the
// label floats directly above the brick; when absent it falls back to the
// legacy top-right corner position so row-clear / power-up bonuses still show.

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { palette } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const POPUP_W  = 90; // approximate max label width — used to clamp near edges

function Popup({ text, position }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const scale      = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Pop-in scale, then float upward and fade
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -60,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // ── Positional popup — floats above the tapped brick ─────────────────────
  if (position) {
    // Clamp so label never runs off screen edges
    const clampedX = Math.min(
      Math.max(position.x - POPUP_W / 2, 4),
      SCREEN_W - POPUP_W - 4,
    );
    return (
      <Animated.Text
        style={[
          styles.popup,
          styles.popupPositioned,
          {
            left: clampedX,
            top: position.y,
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
        pointerEvents="none"
      >
        {text}
      </Animated.Text>
    );
  }

  // ── Fallback: stack in top-right corner (row-clear bonuses etc.) ──────────
  const translateX = useRef(new Animated.Value(0)).current;
  return (
    <Animated.Text
      style={[
        styles.popup,
        { opacity, transform: [{ translateY }, { translateX }, { scale }] },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

export default function ScorePopup({ popups }) {
  if (!popups.length) return null;

  // Positional popups are rendered into an absoluteFill layer so their
  // coordinates are relative to the whole screen. Corner popups sit inside
  // the legacy container anchored top-right.
  const positional = popups.filter((p) => p.position);
  const corner     = popups.filter((p) => !p.position);

  return (
    <>
      {/* Corner fallback container */}
      {corner.length > 0 && (
        <View style={styles.cornerContainer} pointerEvents="none">
          {corner.map((p, i) => (
            <Popup key={p.id} text={p.text} index={i} />
          ))}
        </View>
      )}

      {/* Full-screen layer for positional popups */}
      {positional.map((p) => (
        <Popup key={p.id} text={p.text} position={p.position} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  cornerContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  popup: {
    fontSize: 16,
    fontWeight: '900',
    color: palette.gold,
    marginBottom: 4,
    textShadowColor: palette.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  popupPositioned: {
    position: 'absolute',
    zIndex: 999,
    textAlign: 'center',
    fontSize: 18,
  },
});
