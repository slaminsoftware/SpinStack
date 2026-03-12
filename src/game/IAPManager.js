// src/game/IAPManager.js
// In-app purchase manager using RevenueCat (react-native-purchases).
//
// Setup checklist before going live:
//   1. Create a RevenueCat account at https://app.revenuecat.com
//   2. Add your app (iOS + Android) and paste the API keys below.
//   3. In App Store Connect: create a non-consumable IAP with product ID
//      "spinstack_remove_ads" and price tier $1.99.
//   4. In Google Play Console: create a non-consumable in-app product with
//      product ID "spinstack_remove_ads" and price $1.99.
//   5. In RevenueCat dashboard: add both store products under an Entitlement
//      named "remove_ads", then attach them to an Offering.
//   6. Replace the placeholder API keys below with your real ones.
//
// Usage:
//   import IAPManager from '../game/IAPManager';
//   await IAPManager.init();
//   const price = await IAPManager.getRemoveAdsPrice();   // e.g. "$1.99"
//   const result = await IAPManager.purchaseRemoveAds();  // { success, error? }
//   const result = await IAPManager.restorePurchases();   // { success, restored }

import { Platform } from "react-native";

// ─── RevenueCat API keys ───────────────────────────────────────────────────────
// Replace these with your real keys from the RevenueCat dashboard.
const RC_API_KEY_IOS = "test_hWbqcdXxbhUNSZVLczFRvKcoscO";
const RC_API_KEY_ANDROID = "test_hWbqcdXxbhUNSZVLczFRvKcoscO";

// Product / Entitlement identifiers — must match what you created in the stores
// and in RevenueCat exactly.
const ENTITLEMENT_ID = "remove_ads";
const PRODUCT_ID = "spinstack_remove_ads";

// ─── Internal state ───────────────────────────────────────────────────────────
let Purchases = null; // lazily imported so web builds don't crash
let _initialized = false;
let _cachedPrice = "$1.99"; // fallback shown before SDK loads

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _load() {
  if (Purchases) return Purchases;
  try {
    // Dynamic import keeps the web bundle clean
    const mod = await import("react-native-purchases");
    Purchases = mod.default ?? mod.Purchases ?? mod;
    return Purchases;
  } catch (e) {
    console.warn("IAPManager: react-native-purchases not available", e.message);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const IAPManager = {
  /**
   * Call once at app startup (e.g. in App.js or SpinStackApp.jsx useEffect).
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async init() {
    if (_initialized) return;
    const rc = await _load();
    if (!rc) return;

    try {
      const apiKey =
        Platform.OS === "ios" ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
      await rc.configure({ apiKey });

      // Eagerly fetch the price so it shows correctly in the UI
      await IAPManager._refreshPrice();

      _initialized = true;
    } catch (e) {
      console.warn("IAPManager.init error:", e.message);
    }
  },

  /**
   * Returns the localised price string for the remove-ads product, e.g. "$1.99".
   * Falls back to "$1.99" if the SDK hasn't loaded yet.
   */
  async getRemoveAdsPrice() {
    return _cachedPrice;
  },

  /**
   * Refreshes the cached price from the store — called internally after init.
   */
  async _refreshPrice() {
    const rc = await _load();
    if (!rc) return;
    try {
      const offerings = await rc.getOfferings();
      const pkg =
        offerings?.current?.availablePackages?.find(
          (p) => p.product?.productIdentifier === PRODUCT_ID,
        ) ?? offerings?.current?.availablePackages?.[0];
      if (pkg?.product?.priceString) {
        _cachedPrice = pkg.product.priceString;
      }
    } catch (e) {
      console.warn("IAPManager._refreshPrice error:", e.message);
    }
  },

  /**
   * Checks whether the user has already purchased remove_ads.
   * Returns true/false. Queries RevenueCat's backend so it works across
   * reinstalls and devices.
   */
  async checkEntitlement() {
    const rc = await _load();
    if (!rc) return false;
    try {
      const info = await rc.getCustomerInfo();
      return !!info?.entitlements?.active?.[ENTITLEMENT_ID];
    } catch (e) {
      console.warn("IAPManager.checkEntitlement error:", e.message);
      return false;
    }
  },

  /**
   * Triggers the native purchase sheet for the remove-ads product.
   *
   * Returns:
   *   { success: true }                        — purchase completed
   *   { success: false, cancelled: true }      — user dismissed sheet
   *   { success: false, error: string }        — something went wrong
   */
  async purchaseRemoveAds() {
    const rc = await _load();
    if (!rc) return { success: false, error: "Store unavailable" };

    try {
      const offerings = await rc.getOfferings();
      const pkg =
        offerings?.current?.availablePackages?.find(
          (p) => p.product?.productIdentifier === PRODUCT_ID,
        ) ?? offerings?.current?.availablePackages?.[0];

      if (!pkg) {
        return {
          success: false,
          error: "Product not found. Please try again later.",
        };
      }

      const { customerInfo } = await rc.purchasePackage(pkg);
      const granted = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
      return granted
        ? { success: true }
        : {
            success: false,
            error:
              "Purchase completed but entitlement not granted. Please restore purchases.",
          };
    } catch (e) {
      // RevenueCat throws a PurchasesError with a specific code for cancellation
      if (e?.userCancelled || e?.code === "1") {
        return { success: false, cancelled: true };
      }
      console.warn("IAPManager.purchaseRemoveAds error:", e.message);
      return {
        success: false,
        error: e.message ?? "Purchase failed. Please try again.",
      };
    }
  },

  /**
   * Restores previous purchases — required by App Store review guidelines.
   * Call this when the user taps "Restore Purchases".
   *
   * Returns:
   *   { success: true, restored: true }   — entitlement found and restored
   *   { success: true, restored: false }  — no prior purchase found
   *   { success: false, error: string }   — network or store error
   */
  async restorePurchases() {
    const rc = await _load();
    if (!rc) return { success: false, error: "Store unavailable" };

    try {
      const customerInfo = await rc.restorePurchases();
      const restored = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
      return { success: true, restored };
    } catch (e) {
      console.warn("IAPManager.restorePurchases error:", e.message);
      return {
        success: false,
        error: e.message ?? "Restore failed. Please try again.",
      };
    }
  },
};

export default IAPManager;
