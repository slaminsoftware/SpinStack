// src/components/DangerOvertime.jsx
// Shown when the grid would overflow — gives player 5 seconds to clear a row.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { palette } from '../theme';

export default function DangerOvertime({ active, secondsLeft }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (active) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.06, duration: 200, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 200, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulse.setValue(1);
    }
    return () => loopRef.current?.stop();
  }, [active]);

  if (!active) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulse }] }]} pointerEvents="none">
      <Text style={styles.title}>🚨 DANGER!</Text>
      <Text style={styles.body}>CLEAR A ROW TO SURVIVE</Text>
      <Text style={styles.timer}>{secondsLeft}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(200,0,0,0.92)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 200,
    borderWidth: 2,
    borderColor: '#ff4444',
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
  },
  body: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
    marginTop: 2,
  },
  timer: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
