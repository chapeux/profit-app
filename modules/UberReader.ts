/**
 * UberReader — TypeScript bridge for the native Android Accessibility Service.
 *
 * When running in a compiled APK/AAB (built with `eas build` or `expo run:android`):
 *   - isAvailable() → true
 *   - The full accessibility-service flow is used.
 *
 * When running in Expo Go (or on iOS / web):
 *   - isAvailable() → false
 *   - The caller should fall back to clipboard monitoring.
 *
 * Event name emitted by the native module: "UberReaderTripDetected"
 */

import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  EmitterSubscription,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UberTripData {
  grossValue: number;       // R$ value shown in the offer
  distanceKm: number;       // km to destination
  durationMinutes: number;  // estimated trip duration in minutes
  passengerRating: number;  // passenger star rating (0 if not shown)
  rawText: string;          // raw text extracted from screen (for debugging)
}

// ─── Internal ─────────────────────────────────────────────────────────────────

const { UberReaderModule: _native } = NativeModules;

const _isAndroid  = Platform.OS === "android";
const _isAvailable = _isAndroid && !!_native;

let _emitter: NativeEventEmitter | null = null;
if (_isAvailable) {
  _emitter = new NativeEventEmitter(_native);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const UberReader = {
  /**
   * Returns true only on a compiled Android build with the native module present.
   * Returns false in Expo Go, iOS, and web — caller should use clipboard fallback.
   */
  isAvailable(): boolean {
    return _isAvailable;
  },

  /**
   * Checks whether the user has enabled the Accessibility Service in Settings.
   * Always resolves to false when !isAvailable().
   */
  async isAccessibilityEnabled(): Promise<boolean> {
    if (!_isAvailable) return false;
    try {
      return await _native.isAccessibilityEnabled();
    } catch {
      return false;
    }
  },

  /**
   * Returns true if the service process is actively running.
   * Always resolves to false when !isAvailable().
   */
  async isServiceRunning(): Promise<boolean> {
    if (!_isAvailable) return false;
    try {
      return await _native.isServiceRunning();
    } catch {
      return false;
    }
  },

  /**
   * Opens the Android Accessibility Settings screen so the user can
   * enable "Moto Ganhos" in the list of services.
   * No-op when !isAvailable().
   */
  openAccessibilitySettings(): void {
    if (_isAvailable) _native.openAccessibilitySettings();
  },

  /**
   * Tells the native service to start forwarding detected trips to JS.
   * Call this before addListener(). No-op when !isAvailable().
   */
  startListening(): void {
    if (_isAvailable) _native.startListening();
  },

  /**
   * Stops forwarding trips to JS. No-op when !isAvailable().
   */
  stopListening(): void {
    if (_isAvailable) _native.stopListening();
  },

  /**
   * Subscribes to trip-detected events from the accessibility service.
   * Returns an unsubscribe function.
   *
   * @example
   * const unsub = UberReader.addListener((trip) => { ... });
   * // later:
   * unsub();
   */
  addListener(callback: (data: UberTripData) => void): () => void {
    if (!_isAvailable || !_emitter) return () => {};

    const sub: EmitterSubscription = _emitter.addListener(
      "UberReaderTripDetected",
      callback
    );

    return () => sub.remove();
  },
} as const;
