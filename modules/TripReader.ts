import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription } from "react-native";

export interface TripReaderData {
  grossValue: number;
  distanceKm: number;
  durationMinutes: number;
  passengerRating: number;
  rawText: string;
}

const { TripReaderModule: _native } = NativeModules;
const _isAvailable = Platform.OS === "android" && !!_native;
let _emitter: NativeEventEmitter | null = null;
if (_isAvailable) _emitter = new NativeEventEmitter(_native);

export const TripReader = {
  isAvailable(): boolean { return _isAvailable; },
  async isAccessibilityEnabled(): Promise<boolean> {
    if (!_isAvailable) return false;
    try { return await _native.isAccessibilityEnabled(); } catch { return false; }
  },
  async isServiceRunning(): Promise<boolean> {
    if (!_isAvailable) return false;
    try { return await _native.isServiceRunning(); } catch { return false; }
  },
  openAccessibilitySettings(): void { if (_isAvailable) _native.openAccessibilitySettings(); },
  startListening(): void { if (_isAvailable) _native.startListening(); },
  stopListening(): void { if (_isAvailable) _native.stopListening(); },
  addListener(callback: (data: TripReaderData) => void): () => void {
    if (!_isAvailable || !_emitter) return () => {};
    const sub: EmitterSubscription = _emitter.addListener("TripReaderDetected", callback);
    return () => sub.remove();
  },
} as const;
