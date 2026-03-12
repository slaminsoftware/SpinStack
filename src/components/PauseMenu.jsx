// src/components/PauseMenu.jsx
// Overlay shown when the player pauses mid-game.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { palette, shared } from '../theme';

export default function PauseMenu({ visible, onResume, onMenu, colorblindMode, onToggleColorblind }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>⏸ PAUSED</Text>

          <TouchableOpacity style={shared.primaryBtn} onPress={onResume} activeOpacity={0.85}>
            <Text style={shared.primaryBtnText}>▶ RESUME</Text>
          </TouchableOpacity>

          {/* Colorblind toggle */}
          <TouchableOpacity style={styles.toggleRow} onPress={onToggleColorblind} activeOpacity={0.7}>
            <View style={[styles.toggleDot, colorblindMode && styles.toggleDotOn]} />
            <Text style={styles.toggleLabel}>Colorblind Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity style={shared.secondaryBtn} onPress={onMenu} activeOpacity={0.75}>
            <Text style={shared.secondaryBtnText}>MAIN MENU</Text>
          </TouchableOpacity>

          <Text style={styles.warning}>⚠ Returning to menu ends the current game</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 24,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: palette.textPrimary,
    letterSpacing: 4,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: palette.surface,
    borderRadius: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#333366',
    borderWidth: 2,
    borderColor: '#555588',
  },
  toggleDotOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleLabel: {
    fontSize: 13,
    color: palette.textSub,
    fontWeight: '600',
    letterSpacing: 1,
  },
  warning: {
    fontSize: 10,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
