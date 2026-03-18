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
//
// NOTE: RevenueCat implementation temporarily disabled.
//       All methods are stubbed — re-enable by restoring the implementation below.

// import { Platform } from "react-native"; // RevenueCat — temporarily disabled

// ─── RevenueCat API keys ───────────────────────────────────────────────────────
// Replace these with your real keys from the RevenueCat dashboard.
// const RC_API_KEY_IOS     = "test_hWbqcdXxbhUNSZVLczFRvKcoscO"; // RevenueCat — temporarily disabled
// const RC_API_KEY_ANDROID = "test_hWbqcdXxbhUNSZVLczFRvKcoscO"; // RevenueCat — temporarily disabled

// Product / Entitlement identifiers — must match what you created in the stores
// and in RevenueCat exactly.
// const ENTITLEMENT_ID = "remove_ads";       // RevenueCat — temporarily disabled
// const PRODUCT_ID     = "spinstack_remove_ads"; // RevenueCat — temporarily disabled

// ─── Internal state ───────────────────────────────────────────────────────────
// let Purchases    = null;    // RevenueCat — temporarily disabled
// let _initialized = false;   // RevenueCat — temporarily disabled
// let _cachedPrice = "$1.99"; // RevenueCat — temporarily disabled

// ─── Helpers ──────────────────────────────────────────────────────────────────

// async function _load() {                                  // RevenueCat — temporarily disabled
//   if (Purchases) return Purchases;
//   try {
//     const mod = await import("react-native-purchases");
//     Purchases = mod.default ?? mod.Purchases ?? mod;
//     return Purchases;
//   } catch (e) {
//     console.warn("IAPManager: react-native-purchases not available", e.message);
//     return null;
//   }
// }

// ─── Public API ───────────────────────────────────────────────────────────────
// All methods are stubbed while RevenueCat is disabled.
// To re-enable: uncomment the implementation above and below, and restore the
// original method bodies from git history or the setup checklist comments.

const IAPManager = {
  async init() {
    // RevenueCat — temporarily disabled
    // if (_initialized) return;
    // const rc = await _load();
    // if (!rc) return;
    // try {
    //   const apiKey = Platform.OS === "ios" ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
    //   await rc.configure({ apiKey });
    //   await IAPManager._refreshPrice();
    //   _initialized = true;
    // } catch (e) {
    //   console.warn("IAPManager.init error:", e.message);
    // }
  },

  async getRemoveAdsPrice() {
    return "$1.99"; // RevenueCat — temporarily disabled (static fallback)
    // return _cachedPrice;
  },

  async _refreshPrice() {
    // RevenueCat — temporarily disabled
    // const rc = await _load();
    // if (!rc) return;
    // try {
    //   const offerings = await rc.getOfferings();
    //   const pkg =
    //     offerings?.current?.availablePackages?.find(
    //       (p) => p.product?.productIdentifier === PRODUCT_ID,
    //     ) ?? offerings?.current?.availablePackages?.[0];
    //   if (pkg?.product?.priceString) {
    //     _cachedPrice = pkg.product.priceString;
    //   }
    // } catch (e) {
    //   console.warn("IAPManager._refreshPrice error:", e.message);
    // }
  },

  async checkEntitlement() {
    return false; // RevenueCat — temporarily disabled
    // const rc = await _load();
    // if (!rc) return false;
    // try {
    //   const info = await rc.getCustomerInfo();
    //   return !!info?.entitlements?.active?.[ENTITLEMENT_ID];
    // } catch (e) {
    //   console.warn("IAPManager.checkEntitlement error:", e.message);
    //   return false;
    // }
  },

  async purchaseRemoveAds() {
    return { success: false, error: "Store unavailable" }; // RevenueCat — temporarily disabled
    // const rc = await _load();
    // if (!rc) return { success: false, error: "Store unavailable" };
    // try {
    //   const offerings = await rc.getOfferings();
    //   const pkg =
    //     offerings?.current?.availablePackages?.find(
    //       (p) => p.product?.productIdentifier === PRODUCT_ID,
    //     ) ?? offerings?.current?.availablePackages?.[0];
    //   if (!pkg) return { success: false, error: "Product not found. Please try again later." };
    //   const { customerInfo } = await rc.purchasePackage(pkg);
    //   const granted = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    //   return granted
    //     ? { success: true }
    //     : { success: false, error: "Purchase completed but entitlement not granted. Please restore purchases." };
    // } catch (e) {
    //   if (e?.userCancelled || e?.code === "1") return { success: false, cancelled: true };
    //   console.warn("IAPManager.purchaseRemoveAds error:", e.message);
    //   return { success: false, error: e.message ?? "Purchase failed. Please try again." };
    // }
  },

  async restorePurchases() {
    return { success: true, restored: false }; // RevenueCat — temporarily disabled
    // const rc = await _load();
    // if (!rc) return { success: false, error: "Store unavailable" };
    // try {
    //   const customerInfo = await rc.restorePurchases();
    //   const restored = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    //   return { success: true, restored };
    // } catch (e) {
    //   console.warn("IAPManager.restorePurchases error:", e.message);
    //   return { success: false, error: e.message ?? "Restore failed. Please try again." };
    // }
  },
};

export default IAPManager;
