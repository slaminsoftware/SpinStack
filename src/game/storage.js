// src/game/storage.js
// Persistent storage using AsyncStorage (via @react-native-async-storage/async-storage).
// All data survives app restarts and reinstalls on the same device.
//
// Keys are namespaced under "spinstack:" to avoid collisions.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = {
  highScores:       'spinstack:highScores',
  achievements:     'spinstack:achievements',
  totalBombs:       'spinstack:totalBombs',
  colorblindMode:   'spinstack:colorblindMode',
  tutorialComplete: 'spinstack:tutorialComplete',
  adsRemoved:       'spinstack:adsRemoved',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function setJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('storage.setJSON error:', e.message);
  }
}

// ─── High Scores ──────────────────────────────────────────────────────────────

export async function getHighScores() {
  return getJSON(KEY.highScores, {});
}

export async function saveHighScore(levelIndex, score) {
  const scores = await getHighScores();
  const prev = scores[levelIndex] ?? 0;
  if (score > prev) {
    scores[levelIndex] = score;
    await setJSON(KEY.highScores, scores);
    return true; // new best
  }
  return false;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export async function getUnlockedAchievements() {
  return getJSON(KEY.achievements, []);
}

export async function unlockAchievement(id) {
  const list = await getUnlockedAchievements();
  if (list.includes(id)) return false;
  await setJSON(KEY.achievements, [...list, id]);
  return true;
}

// ─── Cumulative bomb count ────────────────────────────────────────────────────

export async function getTotalBombs() {
  return getJSON(KEY.totalBombs, 0);
}

export async function incrementBombs() {
  const total = (await getTotalBombs()) + 1;
  await setJSON(KEY.totalBombs, total);
  return total;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getColorblindMode() {
  return getJSON(KEY.colorblindMode, false);
}

export async function setColorblindModePref(enabled) {
  return setJSON(KEY.colorblindMode, enabled);
}

export async function getTutorialComplete() {
  return getJSON(KEY.tutorialComplete, false);
}

export async function setTutorialComplete() {
  return setJSON(KEY.tutorialComplete, true);
}

// ─── Ads Removed ──────────────────────────────────────────────────────────────
// setAdsRemoved() is called both after a successful IAP and after restoring
// a previous purchase. It flips the local flag so the app doesn't need to
// hit RevenueCat's servers on every cold start once the user has paid.

export async function getAdsRemoved() {
  return getJSON(KEY.adsRemoved, false);
}

export async function setAdsRemoved() {
  return setJSON(KEY.adsRemoved, true);
}
