// src/components/AchievementToast.jsx
// Animated toast that appears when a new achievement is unlocked mid-game.

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { palette } from '../theme';

export default function AchievementToast({ achievement }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!achievement) return;
    translateY.setValue(-80);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 150, friction: 10, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [achievement]);

  if (!achievement) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.unlocked}>ACHIEVEMENT UNLOCKED</Text>
      <View style={styles.row}>
        <Text style={styles.emoji}>{achievement.emoji}</Text>
        <View>
          <Text style={styles.label}>{achievement.label}</Text>
          <Text style={styles.desc}>{achievement.desc}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: '#ffd700',
    zIndex: 999,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 20,
  },
  unlocked: {
    fontSize: 9,
    color: '#ffd700',
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: { fontSize: 26 },
  label: {
    fontSize: 14,
    fontWeight: '900',
    color: palette.textPrimary,
    letterSpacing: 1,
  },
  desc: {
    fontSize: 11,
    color: palette.textMuted,
    marginTop: 2,
  },
});
