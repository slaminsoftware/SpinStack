// src/components/PowerupToast.jsx
// Brief toast notification shown when a special brick is activated.

import React, { useRef, useEffect } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { palette } from '../theme';

export default function PowerupToast({ message }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    zIndex: 100,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a0a0ff',
    letterSpacing: 2,
  },
});
