// src/components/EndScreen.jsx
// Shown after the game ends (win or loss).
// Displays final score, high score comparison, session stats,
// unlocked achievements, and encouraging messages.
// Includes a fully wired "Remove Ads" IAP using IAPManager (RevenueCat).

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { shared, palette } from '../theme';
import { saveHighScore, getHighScores, getUnlockedAchievements, getAdsRemoved, setAdsRemoved } from '../game/storage';
import { ACHIEVEMENTS } from '../game/constants';
import IAPManager from '../game/IAPManager';

const LOSS_MESSAGES = [
  "So close! Give it another shot 💪",
  "One more row would've done it!",
  "You've got this — try again!",
  "That was intense! Ready for round 2?",
  "The cubes won this time... for now.",
];

const WIN_MESSAGES = [
  "Absolutely crushed it! 🏆",
  "The cubes never stood a chance!",
  "Master of SpinStack! Play again?",
  "Flawless. Simply flawless.",
];

export default function EndScreen({ didWin, score, sessionStats, selectedLevelIndex, wave = 1, onRestart, onMenu }) {
  const [isNewBest,       setIsNewBest]       = useState(false);
  const [prevBest,        setPrevBest]        = useState(null);
  const [unlockedIds,     setUnlockedIds]     = useState([]);
  const [adsRemoved,      setAdsRemovedState] = useState(false);
  const [price,           setPrice]           = useState('$1.99');
  const [purchasing,      setPurchasing]      = useState(false);
  const [restoring,       setRestoring]       = useState(false);

  const [message] = useState(() => {
    const pool = didWin ? WIN_MESSAGES : LOSS_MESSAGES;
    return pool[Math.floor(Math.random() * pool.length)];
  });

  useEffect(() => {
    (async () => {
      const [wasNew, scores, ids, removed, storePrice] = await Promise.all([
        saveHighScore(selectedLevelIndex ?? 0, score),
        getHighScores(),
        getUnlockedAchievements(),
        getAdsRemoved(),
        IAPManager.getRemoveAdsPrice(),
      ]);
      setIsNewBest(wasNew);
      setPrevBest(scores[selectedLevelIndex ?? 0] ?? 0);
      setUnlockedIds(ids);
      setAdsRemovedState(removed);
      setPrice(storePrice);

      // If local flag says not removed, double-check with RevenueCat
      // in case the user purchased on another device.
      if (!removed) {
        const entitled = await IAPManager.checkEntitlement();
        if (entitled) {
          await setAdsRemoved();
          setAdsRemovedState(true);
        }
      }
    })();
  }, []);

  // ── Purchase flow ────────────────────────────────────────────────────────────
  const handleRemoveAds = useCallback(async () => {
    if (purchasing || restoring) return;

    Alert.alert(
      'Remove Ads',
      `Purchase "Remove Ads" for ${price} to permanently remove all interstitial ads.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Purchase (${price})`,
          onPress: async () => {
            setPurchasing(true);
            try {
              const result = await IAPManager.purchaseRemoveAds();
              if (result.success) {
                await setAdsRemoved();
                setAdsRemovedState(true);
                Alert.alert('Thank you! 🎉', 'Ads have been permanently removed. Enjoy SpinStack!');
              } else if (!result.cancelled) {
                Alert.alert('Purchase Failed', result.error ?? 'Something went wrong. Please try again.');
              }
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
  }, [purchasing, restoring, price]);

  // ── Restore flow ─────────────────────────────────────────────────────────────
  // Required by App Store review guidelines for any non-consumable IAP.
  const handleRestore = useCallback(async () => {
    if (purchasing || restoring) return;
    setRestoring(true);
    try {
      const result = await IAPManager.restorePurchases();
      if (!result.success) {
        Alert.alert('Restore Failed', result.error ?? 'Please check your internet connection and try again.');
        return;
      }
      if (result.restored) {
        await setAdsRemoved();
        setAdsRemovedState(true);
        Alert.alert('Purchases Restored', 'Ads have been removed. Welcome back!');
      } else {
        Alert.alert('Nothing to Restore', 'No previous purchase of Remove Ads was found on this account.');
      }
    } finally {
      setRestoring(false);
    }
  }, [purchasing, restoring]);

  const unlockedDefs = ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id));

  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={shared.card}>
        <Text style={styles.trophy}>{didWin ? '🏆' : '💀'}</Text>

        <Text style={[shared.logoTitle, { fontSize: 28, marginBottom: 4 }]}>
          {didWin ? 'YOU WIN!' : 'GAME OVER'}
        </Text>
        <Text style={styles.message}>{message}</Text>

        {/* Score panel */}
        <View style={shared.scorePanel}>
          <View style={shared.scoreLine}>
            <Text style={shared.scoreLabel}>FINAL SCORE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isNewBest && <Text style={styles.newBest}>🏆 NEW BEST!</Text>}
              <Text style={shared.scoreNum}>{score.toLocaleString()}</Text>
            </View>
          </View>

          {prevBest > 0 && !isNewBest && (
            <View style={[shared.scoreLine, { marginTop: 8 }]}>
              <Text style={shared.scoreLabel}>BEST</Text>
              <Text style={[shared.scoreNum, { fontSize: 18, color: palette.gold }]}>
                {prevBest.toLocaleString()}
              </Text>
            </View>
          )}

          {/* Session stats */}
          {sessionStats && (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{wave}</Text>
                <Text style={styles.statName}>WAVE REACHED</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{sessionStats.rowsCleared ?? 0}</Text>
                <Text style={styles.statName}>ROWS CLEARED</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{sessionStats.levelIndex !== undefined ? `L${sessionStats.levelIndex + 1}` : '-'}</Text>
                <Text style={styles.statName}>LEVEL</Text>
              </View>
            </View>
          )}
        </View>

        {/* Achievements */}
        {unlockedDefs.length > 0 && (
          <View style={styles.achievementsBox}>
            <Text style={styles.achievementsTitle}>ACHIEVEMENTS</Text>
            <View style={styles.achievementsList}>
              {unlockedDefs.map(a => (
                <View key={a.id} style={styles.achievementChip}>
                  <Text style={styles.achievementEmoji}>{a.emoji}</Text>
                  <Text style={styles.achievementLabel}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={shared.primaryBtn} onPress={onRestart} activeOpacity={0.85}>
          <Text style={shared.primaryBtnText}>PLAY AGAIN</Text>
        </TouchableOpacity>

        <TouchableOpacity style={shared.secondaryBtn} onPress={onMenu} activeOpacity={0.75}>
          <Text style={shared.secondaryBtnText}>MAIN MENU</Text>
        </TouchableOpacity>

        {/* Remove Ads IAP */}
        {!adsRemoved && (
          <View style={styles.iapBlock}>
            <TouchableOpacity
              style={[styles.removeAdsBtn, (purchasing || restoring) && styles.removeAdsBtnDisabled]}
              onPress={handleRemoveAds}
              activeOpacity={0.8}
              disabled={purchasing || restoring}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color={palette.textMuted} />
              ) : (
                <Text style={styles.removeAdsBtnText}>🚫 Remove Ads — {price}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              activeOpacity={0.7}
              disabled={purchasing || restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={palette.textMuted} style={{ marginVertical: 2 }} />
              ) : (
                <Text style={styles.restoreText}>Restore Purchase</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  trophy: { fontSize: 52, marginBottom: 8 },
  message: {
    fontSize: 13,
    color: palette.textSub,
    textAlign: 'center',
    marginBottom: 14,
    fontStyle: 'italic',
  },
  newBest: {
    fontSize: 11,
    color: palette.gold,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: palette.bg,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#a0a0ff',
  },
  statName: {
    fontSize: 9,
    color: palette.textMuted,
    letterSpacing: 1,
    fontWeight: '700',
    marginTop: 4,
  },
  achievementsBox: {
    width: '100%',
    marginBottom: 14,
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.gold + '44',
  },
  achievementsTitle: {
    fontSize: 9,
    color: palette.gold,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  achievementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.card,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: palette.gold + '66',
  },
  achievementEmoji: { fontSize: 14 },
  achievementLabel: {
    fontSize: 11,
    color: palette.textSub,
    fontWeight: '600',
  },
  iapBlock: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
    gap: 4,
  },
  removeAdsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
    alignItems: 'center',
    minWidth: 180,
    minHeight: 38,
    justifyContent: 'center',
  },
  removeAdsBtnDisabled: {
    opacity: 0.5,
  },
  removeAdsBtnText: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  restoreBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 11,
    color: palette.textMuted,
    opacity: 0.6,
    letterSpacing: 0.3,
  },
});
