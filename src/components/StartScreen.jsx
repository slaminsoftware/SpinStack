// src/components/StartScreen.jsx
// Initial screen shown before gameplay begins.
// Displays level selector, brief power-up reference, and Play button.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { shared, palette } from '../theme';

const DIFF_COLORS = {
  Easy:   '#39c939',
  Medium: '#f0a500',
  Hard:   '#e04040',
  Brutal: '#cc22cc',
  Insane: '#ff1111',
};

export default function StartScreen({ levels, selectedLevel, onSelectLevel, onStart, onTutorial }) {
  return (
    <ScrollView
      contentContainerStyle={shared.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={shared.card}>
        <Text style={shared.logoTitle}>SPINSTACK</Text>
        <Text style={shared.tagline}>ROTATE · MATCH · CLEAR</Text>

        {/* Quick power-up reference */}
        <View style={[shared.instructBox, { marginTop: 16 }]}>
          {[
            { icon: '💣', text: 'BOMB — Destroys an entire row instantly' },
            { icon: '⚡', text: 'LIGHTNING — Obliterates the row below' },
            { icon: '🌈', text: 'RAINBOW — Paints row with dominant color' },
            { icon: '⭐', text: 'STAR — +500 bonus points' },
            { icon: '❄️', text: 'FREEZE — Delays next row by 8 clicks' },
          ].map(({ icon, text }, i) => (
            <View key={i} style={[shared.instrRow, i === 4 && { marginBottom: 0 }]}>
              <Text style={shared.instrIcon}>{icon}</Text>
              <Text style={shared.instrText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Level selector — 5 levels in a 3+2 layout */}
        <View style={shared.levelGrid}>
          {levels.map((l, i) => (
            <TouchableOpacity
              key={i}
              style={[shared.levelBtn, selectedLevel === i && shared.levelBtnSelected]}
              onPress={() => onSelectLevel(i)}
              activeOpacity={0.75}
            >
              <Text style={shared.levelBtnLabel}>{l.label}</Text>
              <Text style={[shared.levelBtnDiff, { color: DIFF_COLORS[l.difficulty] ?? palette.textMuted }]}>
                {l.difficulty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={shared.primaryBtn} onPress={onStart} activeOpacity={0.85}>
          <Text style={shared.primaryBtnText}>PLAY</Text>
        </TouchableOpacity>

        <TouchableOpacity style={shared.secondaryBtn} onPress={onTutorial} activeOpacity={0.75}>
          <Text style={shared.secondaryBtnText}>📖 HOW TO PLAY</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

