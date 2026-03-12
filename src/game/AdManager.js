// src/game/AdManager.js
// Centralized AdMob integration.
// Handles interstitial ads (shown on game over) and rewarded ads (free power-up).
//
// Requires: react-native-google-mobile-ads
// Install:  add "react-native-google-mobile-ads" to package.json
// Plugin:   see app.json for required plugin config

import { Platform } from "react-native";

const AD_UNITS = {
  interstitial: Platform.select({
    android: "ca-app-pub-4492202957160787/2046846583",
    ios: "ca-app-pub-4492202957160787/9039154984",
    default: "ca-app-pub-3940256099942544/1033173712", // test fallback
  }),
  rewarded: Platform.select({
    android: "ca-app-pub-4492202957160787/9222181919",
    ios: "ca-app-pub-4492202957160787~8381871404",
    default: "ca-app-pub-3940256099942544/5224354917", // test fallback
  }),
};

// ─── Ad state ─────────────────────────────────────────────────────────────────
let _interstitial = null;
let _rewarded = null;
let _ready = false;
let _Ads = null; // lazy-loaded module

async function _load() {
  if (_ready) return true;
  try {
    _Ads = await import("react-native-google-mobile-ads");
    await _Ads.MobileAds().initialize();
    _ready = true;
    return true;
  } catch (e) {
    console.warn("AdManager: react-native-google-mobile-ads unavailable", e);
    return false;
  }
}

// ─── Interstitial ─────────────────────────────────────────────────────────────

async function loadInterstitial() {
  if (!(await _load())) return;
  try {
    const { InterstitialAd, AdEventType } = _Ads;
    _interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });
    await new Promise((resolve) => {
      const unsub = _interstitial.addAdEventListener(AdEventType.LOADED, () => {
        unsub();
        resolve();
      });
      _interstitial.load();
    });
  } catch (e) {
    console.warn("AdManager: interstitial load failed", e);
    _interstitial = null;
  }
}

async function showInterstitial() {
  try {
    if (_interstitial) {
      await _interstitial.show();
      _interstitial = null;
      // Pre-load next one in the background
      loadInterstitial();
    }
  } catch (e) {
    console.warn("AdManager: interstitial show failed", e);
  }
}

// ─── Rewarded ─────────────────────────────────────────────────────────────────

async function loadRewarded() {
  if (!(await _load())) return;
  try {
    const { RewardedAd, RewardedAdEventType } = _Ads;
    _rewarded = RewardedAd.createForAdRequest(AD_UNITS.rewarded, {
      requestNonPersonalizedAdsOnly: false,
    });
    await new Promise((resolve) => {
      const unsub = _rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          unsub();
          resolve();
        },
      );
      _rewarded.load();
    });
  } catch (e) {
    console.warn("AdManager: rewarded load failed", e);
    _rewarded = null;
  }
}

// Returns true if the user earned the reward, false otherwise
async function showRewarded() {
  try {
    if (!_rewarded) return false;
    const { RewardedAdEventType, AdEventType } = _Ads;
    return await new Promise((resolve) => {
      const unsubReward = _rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          unsubReward();
          resolve(true);
        },
      );
      const unsubClose = _rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubClose();
          resolve(false);
        },
      );
      _rewarded.show().catch(() => resolve(false));
    });
  } catch (e) {
    console.warn("AdManager: rewarded show failed", e);
    return false;
  } finally {
    _rewarded = null;
    loadRewarded();
  }
}

function isRewardedReady() {
  return _rewarded !== null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

const AdManager = {
  // Call once on app start or game screen mount
  async init() {
    await _load();
    await Promise.all([loadInterstitial(), loadRewarded()]);
  },

  // Show interstitial — call on game over before navigating to end screen
  showInterstitial,

  // Show rewarded ad — returns true if reward was earned
  showRewarded,

  // Check if rewarded ad is loaded and ready to show
  isRewardedReady,

  // Pre-load both ad types (call after showing to keep pipeline full)
  preload() {
    loadInterstitial();
    loadRewarded();
  },
};

export default AdManager;
