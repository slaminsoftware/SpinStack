// src/components/TutorialScreen.jsx
// Interactive 3-step tutorial that teaches mechanics by doing, not reading.
// Step 1: Tap a brick to change its color
// Step 2: Match all bricks in a row to clear it (pre-seeded row, 1 tap away)
// Step 3: Swipe to rotate to another side

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { palette } from '../theme';
import { COLORS } from '../game/constants';

const SCREEN_W = Dimensions.get('window').width;
const WIN_COLOR = '#1F51FF';

const STEPS = [
  {
    step: 1,
    title: '👆 Tap a Brick',
    body: 'Tap any brick below to change its color.',
  },
  {
    step: 2,
    title: '🎯 Match to Clear',
    body: 'All bricks in a row must match to clear it. Tap the odd brick out!',
  },
  {
    step: 3,
    title: '🔄 Rotate to See More',
    body: 'Each row has 4 sides! Swipe left or right to reveal hidden colors.',
  },
];

function TutorialBrick({ color, onPress, highlight }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (highlight) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 600, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [highlight]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)'],
  });

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Animated.View style={[styles.brick, { backgroundColor: color, borderColor }]}>
          {highlight && <Text style={styles.tapHint}>👆</Text>}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TutorialScreen({ onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [step1Color, setStep1Color] = useState(COLORS[0]);
  const [step2Row, setStep2Row]     = useState([
    WIN_COLOR, WIN_COLOR, WIN_COLOR, WIN_COLOR, WIN_COLOR, COLORS[2],
  ]);
  const [step2Done, setStep2Done]   = useState(false);
  const [step3Done, setStep3Done]   = useState(false);
  const [side, setSide]             = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  // Keep a ref so the PanResponder closure always reads the current stepIdx.
  // PanResponder is created once at mount, so stepIdx would otherwise be
  // permanently stale (always 0) inside onPanResponderRelease.
  const stepIdxRef = useRef(stepIdx);
  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);

  useEffect(() => {
    fadeIn.setValue(0);
    Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [stepIdx]);

  // PanResponder for step 3 swipe
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 40 && stepIdxRef.current === 2) {
          const dir = g.dx > 0 ? -1 : 1;
          setSide(s => (s + dir + 4) % 4);
          slideX.setValue(dir * SCREEN_W * 0.5);
          Animated.spring(slideX, { toValue: 0, tension: 200, friction: 20, useNativeDriver: true }).start();
          setStep3Done(true);
        }
      },
    })
  ).current;

  const canAdvance = () => {
    if (stepIdx === 0) return true;
    if (stepIdx === 1) return step2Done;
    if (stepIdx === 2) return step3Done;
    return true;
  };

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(s => s + 1);
    } else {
      onComplete();
    }
  };

  const SIDE_COLORS = [
    ['#FF0000','#FF5F1F','#FFFF33','#39FF14','#1F51FF','#FF00FF'],
    ['#FF00FF','#1F51FF','#39FF14','#FFFF33','#FF5F1F','#FF0000'],
    ['#39FF14','#FF0000','#FF00FF','#1F51FF','#FFFF33','#FF5F1F'],
    ['#FFFF33','#FF5F1F','#FF0000','#FF00FF','#39FF14','#1F51FF'],
  ];

  const renderStep = () => {
    if (stepIdx === 0) {
      // Step 1: tap any brick to change color
      return (
        <View style={styles.row}>
          {[0,1,2,3,4,5].map(i => (
            <TutorialBrick
              key={i}
              color={i === 2 ? step1Color : COLORS[i % COLORS.length]}
              highlight={i === 2}
              onPress={() => {
                const next = COLORS[(COLORS.indexOf(step1Color) + 1) % COLORS.length];
                setStep1Color(next);
              }}
            />
          ))}
        </View>
      );
    }

    if (stepIdx === 1) {
      // Step 2: clear the row by tapping the odd brick
      const oddIdx = step2Row.findIndex(c => c !== WIN_COLOR);
      return (
        <View>
          <View style={styles.row}>
            {step2Row.map((color, i) => (
              <TutorialBrick
                key={i}
                color={color}
                highlight={!step2Done && i === oddIdx}
                onPress={() => {
                  if (step2Done) return;
                  if (i === oddIdx) {
                    const newRow = step2Row.map(() => WIN_COLOR);
                    setStep2Row(newRow);
                    setTimeout(() => setStep2Done(true), 300);
                  }
                }}
              />
            ))}
          </View>
          {step2Done && (
            <Text style={styles.successMsg}>✅ Row cleared! +100 pts</Text>
          )}
        </View>
      );
    }

    if (stepIdx === 2) {
      // Step 3: swipe to rotate
      const SIDE_NAMES = ['FRONT', 'RIGHT', 'BACK', 'LEFT'];
      return (
        <View {...panResponder.panHandlers}>
          <Text style={styles.sideLabel}>{SIDE_NAMES[side]}</Text>
          <Animated.View style={{ transform: [{ translateX: slideX }] }}>
            <View style={styles.row}>
              {SIDE_COLORS[side].map((color, i) => (
                <TutorialBrick key={i} color={color} highlight={false} onPress={() => {}} />
              ))}
            </View>
          </Animated.View>
          {!step3Done && (
            <Text style={styles.swipeHint}>← swipe left or right →</Text>
          )}
          {step3Done && (
            <Text style={styles.successMsg}>✅ You rotated the cube!</Text>
          )}
        </View>
      );
    }
  };

  const step = STEPS[stepIdx];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIdx && styles.dotActive]} />
          ))}
        </View>

        <Animated.View style={{ opacity: fadeIn, width: '100%', alignItems: 'center' }}>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.demoArea}>
            {renderStep()}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canAdvance()}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>
            {stepIdx < STEPS.length - 1 ? 'NEXT →' : 'START PLAYING!'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onComplete} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip tutorial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.surfaceBorder,
  },
  dotActive: {
    backgroundColor: palette.accent,
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: palette.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  demoArea: {
    width: '100%',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  brick: {
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  tapHint: {
    fontSize: 16,
  },
  sideLabel: {
    fontSize: 11,
    color: palette.textMuted,
    letterSpacing: 3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  swipeHint: {
    fontSize: 12,
    color: palette.accent,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 1,
  },
  successMsg: {
    fontSize: 13,
    color: '#39FF14',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  nextBtn: {
    backgroundColor: palette.accent,
    borderRadius: 12,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnDisabled: {
    backgroundColor: '#333366',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  skipBtn: {
    marginTop: 14,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 12,
    color: palette.textMuted,
    letterSpacing: 1,
  },
});
