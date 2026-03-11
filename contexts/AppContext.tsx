import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

const TRIPS_KEY    = "@motoganhos:trips";
const SETTINGS_KEY = "@motoganhos:settings";

export interface Trip {
  id:              string;
  grossValue:      number;
  distanceKm:      number;
  durationMinutes: number;
  passengerRating: number;
  createdAt:       string;
}

export interface AppSettings {
  kmPerLiter:            number;
  fuelPricePerLiter:     number;
  costPerKmExtra:        number;
  minGoodValuePerKm:     number;
  minGoodValuePerMinute: number;
  minGoodValuePerHour:   number;
}

export interface TripAnalysis {
  valuePerKm:     number;
  valuePerHour:   number;
  valuePerMinute: number;
  netValue:       number;
  fuelCost:       number;
  signal:         "green" | "yellow" | "red";
  score:          number;
}

interface AppContextValue {
  trips:          Trip[];
  settings:       AppSettings;
  isLoading:      boolean;
  addTrip:        (trip: Omit<Trip, "id" | "createdAt">) => Promise<void>;
  deleteTrip:     (id: string) => Promise<void>;
  updateTrip:     (id: string, data: Partial<Omit<Trip, "id" | "createdAt">>) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  kmPerLiter:            10,
  fuelPricePerLiter:     6.0,
  costPerKmExtra:        0.10,
  minGoodValuePerKm:     1.50,
  minGoodValuePerMinute: 0.50,
  minGoodValuePerHour:   30.0,
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

// Sincroniza settings com SharedPreferences para uso pelo TripReaderService em background
function syncSettingsToNative(s: AppSettings) {
  if (Platform.OS === "android" && NativeModules.SettingsModule) {
    NativeModules.SettingsModule.saveSettings(
      s.kmPerLiter,
      s.fuelPricePerLiter,
      s.costPerKmExtra,
      s.minGoodValuePerKm,
      s.minGoodValuePerMinute,
      s.minGoodValuePerHour,
    ).catch(() => {});
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [trips,     setTrips]     = useState<Trip[]>([]);
  const [settings,  setSettings]  = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tripsRaw, settingsRaw] = await Promise.all([
          AsyncStorage.getItem(TRIPS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);

        if (tripsRaw) setTrips(JSON.parse(tripsRaw));

        const loadedSettings = settingsRaw
          ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) }
          : DEFAULT_SETTINGS;

        setSettings(loadedSettings);

        // Sincronizar com SharedPreferences no boot
        syncSettingsToNative(loadedSettings);
      } catch (e) {
        console.warn("AppContext load error:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const addTrip = useCallback(
    async (data: Omit<Trip, "id" | "createdAt">) => {
      const trip: Trip = {
        ...data,
        id:        Math.random().toString(36).slice(2) + Date.now().toString(36),
        createdAt: new Date().toISOString(),
      };
      const updated = [trip, ...trips];
      setTrips(updated);
      await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
    },
    [trips]
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      const updated = trips.filter((t) => t.id !== id);
      setTrips(updated);
      await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
    },
    [trips]
  );

  const updateTrip = useCallback(
    async (id: string, data: Partial<Omit<Trip, "id" | "createdAt">>) => {
      const updated = trips.map((t) => t.id === id ? { ...t, ...data } : t);
      setTrips(updated);
      await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
    },
    [trips]
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const updated = { ...settings, ...patch };
      setSettings(updated);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      // Sincronizar com SharedPreferences para o TripReaderService em background
      syncSettingsToNative(updated);
    },
    [settings]
  );

  return (
    <AppContext.Provider
      value={{ trips, settings, isLoading, addTrip, deleteTrip, updateTrip, updateSettings }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function analyzeTripQuality(
  grossValue:      number,
  distanceKm:      number,
  durationMinutes: number,
  settings:        AppSettings
): TripAnalysis {
  const fuelCost     = (distanceKm / settings.kmPerLiter) * settings.fuelPricePerLiter;
  const extraCost    = distanceKm * settings.costPerKmExtra;
  const netValue     = grossValue - fuelCost - extraCost;

  const valuePerKm     = distanceKm      > 0 ? netValue / distanceKm      : 0;
  const valuePerMinute = durationMinutes > 0 ? netValue / durationMinutes : 0;
  const valuePerHour   = valuePerMinute * 60;

  const kmGood   = valuePerKm     >= settings.minGoodValuePerKm;
  const kmOk     = valuePerKm     >= settings.minGoodValuePerKm     * 0.6;
  const minGood  = valuePerMinute >= settings.minGoodValuePerMinute;
  const minOk    = valuePerMinute >= settings.minGoodValuePerMinute  * 0.6;
  const hourGood = valuePerHour   >= settings.minGoodValuePerHour;
  const hourOk   = valuePerHour   >= settings.minGoodValuePerHour    * 0.6;

  let score = 0;
  if (kmGood)   score += 34; else if (kmOk)   score += 17;
  if (minGood)  score += 33; else if (minOk)  score += 16;
  if (hourGood) score += 33; else if (hourOk) score += 16;

  const signal: "green" | "yellow" | "red" =
    score >= 70 ? "green" : score >= 40 ? "yellow" : "red";

  return { valuePerKm, valuePerHour, valuePerMinute, netValue, fuelCost, signal, score };
}

export function parseUberText(text: string): {
  grossValue:      number;
  distanceKm:      number;
  durationMinutes: number;
  passengerRating: number;
} | null {
  if (!text || text.length < 3) return null;

  const moneyPatterns = [
    /R\$\s*(\d+[.,]\d{1,2})/gi,
    /(\d+[.,]\d{2})\s*reais/gi,
    /valor[\s:]+R?\$?\s*(\d+[.,]\d{1,2})/gi,
  ];

  const pairPattern = /(\d+)\s*min(?:uto(?:s)?)?\s*\((\d+[.,]\d+|\d+)\s*km\)/gi;
  let totalDist = 0;
  let totalDur  = 0;
  let pairMatch: RegExpExecArray | null;
  while ((pairMatch = pairPattern.exec(text)) !== null) {
    totalDur  += parseFloat(pairMatch[1]);
    totalDist += parseFloat(pairMatch[2].replace(",", "."));
  }

  if (totalDist === 0) {
    const distPatterns = [
      /(\d+[.,]\d{1,2})\s*km/gi,
      /(\d+)\s*km/gi,
    ];
    totalDist = findFirst(text, distPatterns) ?? 0;
  }
  if (totalDur === 0) {
    const timePatterns = [
      /(\d+)\s*min(?:uto(?:s)?)?/gi,
      /(\d+)\s*h(?:ora(?:s)?)?\s*(\d+)\s*min/gi,
    ];
    totalDur = findFirst(text, timePatterns) ?? 0;
  }

  const ratingPatterns = [
    /★\s*(\d[.,]\d{1,2})/gi,
    /(\d[.,]\d{1,2})\s*★/gi,
    /(\d[.,]\d{1,2})\s*\(\d+\)/gi,
    /(\d[.,]\d{1,2})\s*[*⭐]/gi,
    /nota[\s:]+(  \d[.,]\d{1,2})/gi,
    /avalia[çc][aã]o[\s:]+(\d[.,]\d{1,2})/gi,
  ];

  const grossValue      = findFirst(text, moneyPatterns);
  const distanceKm      = totalDist > 0 ? totalDist : null;
  const durationMinutes = totalDur  > 0 ? totalDur  : null;
  const passengerRating = findFirst(text, ratingPatterns) ?? 0;

  if (!grossValue || !distanceKm || !durationMinutes) return null;
  if (grossValue <= 0 || distanceKm <= 0 || durationMinutes <= 0) return null;

  return { grossValue, distanceKm, durationMinutes, passengerRating };
}

function findFirst(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    p.lastIndex = 0;
    const m = p.exec(text);
    if (m) {
      const v = parseFloat((m[1] ?? "0").replace(",", "."));
      if (v > 0) return v;
    }
  }
  return null;
}
