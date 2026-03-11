import { NativeEventEmitter, NativeModules, Platform } from "react-native";

const { TripReaderModule } = NativeModules;

export interface TripReaderData {
  grossValue:      number;
  distanceKm:      number;
  durationMinutes: number;
  passengerRating: number;
  netValue:        number;
  valuePerKm:      number;
  valuePerHour:    number;
  valuePerMinute:  number;
  signal:          "green" | "yellow" | "red";
  score:           number;
}

const emitter = TripReaderModule
  ? new NativeEventEmitter(TripReaderModule)
  : null;

export const TripReader = {
  isAvailable(): boolean {
    return Platform.OS === "android" && !!TripReaderModule;
  },

  async isAccessibilityEnabled(): Promise<boolean> {
    if (!TripReaderModule) return false;
    return TripReaderModule.isAccessibilityEnabled();
  },

  async hasOverlayPermission(): Promise<boolean> {
    if (!TripReaderModule) return false;
    return TripReaderModule.hasOverlayPermission();
  },

  async requestOverlayPermission(): Promise<boolean> {
    if (!TripReaderModule) return false;
    return TripReaderModule.requestOverlayPermission();
  },

  startListening(): void {
    TripReaderModule?.startListening();
  },

  stopListening(): void {
    TripReaderModule?.stopListening();
  },

  openAccessibilitySettings(): void {
    TripReaderModule?.openAccessibilitySettings();
  },

  addListener(callback: (data: TripReaderData) => void): () => void {
    if (!emitter) return () => {};
    const sub = emitter.addListener("TripReaderDetected", callback);
    return () => sub.remove();
  },
};
