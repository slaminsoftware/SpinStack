// src/components/QuestToast.jsx
import React, { useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { palette } from '../theme';

export default function QuestToast({ reward }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reward) return;
    translateY.setValue(-80);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 150, friction: 10, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(1800),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [reward]);

  if (!reward) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={styles.text}>Quest reward: +{reward.xp} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    backgroundColor: '#162244',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#a0a0ff',
    zIndex: 999,
  },
  text: { color: '#ffd700', fontWeight: '800', textAlign: 'center' },
});