import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface Settings {
  kmPerLiter: number;
  fuelPricePerLiter: number;
  costPerKmExtra: number;
  minGoodValuePerKm: number;
  minGoodValuePerMinute: number;
  minGoodValuePerHour: number;
}

export interface Trip {
  id: string;
  date: string;
  grossValue: number;
  distanceKm: number;
  durationMinutes: number;
  passengerRating: number;
  fuelCost: number;
  extraCost: number;
  netValue: number;
  notes?: string;
}

interface AppContextValue {
  settings: Settings;
  trips: Trip[];
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  addTrip: (trip: Omit<Trip, "id" | "fuelCost" | "extraCost" | "netValue">) => Promise<void>;
  removeTrip: (id: string) => Promise<void>;
  isLoaded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  kmPerLiter: 12,
  fuelPricePerLiter: 6.0,
  costPerKmExtra: 0.1,
  minGoodValuePerKm: 2.5,
  minGoodValuePerMinute: 0.5,
  minGoodValuePerHour: 30,
};

const AppContext = createContext<AppContextValue | null>(null);

const SETTINGS_KEY = "@motoganhos:settings";
const TRIPS_KEY = "@motoganhos:trips";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [rawSettings, rawTrips] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(TRIPS_KEY),
        ]);
        if (rawSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
        if (rawTrips) setTrips(JSON.parse(rawTrips));
      } catch (e) {
        console.error("Load error", e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const calcCosts = useCallback(
    (distanceKm: number, grossValue: number) => {
      const fuelCost = (distanceKm / settings.kmPerLiter) * settings.fuelPricePerLiter;
      const extraCost = distanceKm * settings.costPerKmExtra;
      const netValue = grossValue - fuelCost - extraCost;
      return { fuelCost, extraCost, netValue };
    },
    [settings]
  );

  const addTrip = useCallback(
    async (raw: Omit<Trip, "id" | "fuelCost" | "extraCost" | "netValue">) => {
      const { fuelCost, extraCost, netValue } = calcCosts(raw.distanceKm, raw.grossValue);
      const trip: Trip = {
        ...raw,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        fuelCost,
        extraCost,
        netValue,
      };
      setTrips((prev) => {
        const next = [trip, ...prev];
        AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(next));
        return next;
      });
    },
    [calcCosts]
  );

  const removeTrip = useCallback(async (id: string) => {
    setTrips((prev) => {
      const next = prev.filter((t) => t.id !== id);
      AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, trips, updateSettings, addTrip, removeTrip, isLoaded }),
    [settings, trips, updateSettings, addTrip, removeTrip, isLoaded]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export interface TripAnalysis {
  valuePerKm: number;
  valuePerHour: number;
  valuePerMinute: number;
  netValue: number;
  fuelCost: number;
  signal: "green" | "yellow" | "red";
  score: number;
}

export function analyzeTripQuality(
  grossValue: number,
  distanceKm: number,
  durationMinutes: number,
  settings: Settings
): TripAnalysis {
  const fuelCost = (distanceKm / settings.kmPerLiter) * settings.fuelPricePerLiter;
  const extraCost = distanceKm * settings.costPerKmExtra;
  const netValue = grossValue - fuelCost - extraCost;

  const valuePerKm = distanceKm > 0 ? netValue / distanceKm : 0;
  const valuePerMinute = durationMinutes > 0 ? netValue / durationMinutes : 0;
  const valuePerHour = valuePerMinute * 60;

  const kmGood = valuePerKm >= settings.minGoodValuePerKm;
  const kmOk = valuePerKm >= settings.minGoodValuePerKm * 0.6;
  const minGood = valuePerMinute >= settings.minGoodValuePerMinute;
  const minOk = valuePerMinute >= settings.minGoodValuePerMinute * 0.6;
  const hourGood = valuePerHour >= settings.minGoodValuePerHour;
  const hourOk = valuePerHour >= settings.minGoodValuePerHour * 0.6;

  let score = 0;
  if (kmGood) score += 34;
  else if (kmOk) score += 17;
  if (minGood) score += 33;
  else if (minOk) score += 16;
  if (hourGood) score += 33;
  else if (hourOk) score += 16;

  const signal: "green" | "yellow" | "red" =
    score >= 70 ? "green" : score >= 40 ? "yellow" : "red";

  return { valuePerKm, valuePerHour, valuePerMinute, netValue, fuelCost, signal, score };
}

// Substitua a função parseUberText no contexts/AppContext.tsx por esta versão:

export function parseUberText(text: string): {
  grossValue: number;
  distanceKm: number;
  durationMinutes: number;
  passengerRating: number;
} | null {
  if (!text || text.length < 3) return null;

  // ── 1. Valor ────────────────────────────────────────────────────────────
  const moneyMatch = /R\$\s*(\d{1,4}[.,]\d{1,2})/i.exec(text);
  const grossValue = moneyMatch
    ? parseFloat(moneyMatch[1].replace(",", "."))
    : null;
  if (!grossValue || grossValue < 3 || grossValue > 2000) return null;

  // ── 2. Somar busca + corrida ─────────────────────────────────────────────
  // Formato Uber: "4 min (1.2 km)" + "10 minutos (3.9 km)"
  const timeDistPattern = /(\d+)\s*min(?:uto(?:s)?)?\s*\((\d+[.,]\d+|\d+)\s*km\)/gi;
  const allMatches = [...text.matchAll(timeDistPattern)];

  let durationMinutes: number | null = null;
  let distanceKm: number | null = null;

  if (allMatches.length > 0) {
    // Soma todos os pares encontrados (busca + corrida)
    durationMinutes = allMatches.reduce((sum, m) => sum + (parseFloat(m[1]) || 0), 0);
    distanceKm = allMatches.reduce(
      (sum, m) => sum + (parseFloat(m[2].replace(",", ".")) || 0),
      0
    );
  } else {
    // Fallback: pegar primeiro min e primeiro km separados
    const minMatch = /(\d+)\s*min/i.exec(text);
    const kmMatch = /(\d+[.,]\d+|\d+)\s*km/i.exec(text);
    durationMinutes = minMatch ? parseFloat(minMatch[1]) : null;
    distanceKm = kmMatch ? parseFloat(kmMatch[1].replace(",", ".")) : null;
  }

  if (!durationMinutes || !distanceKm) return null;
  if (durationMinutes <= 0 || distanceKm <= 0) return null;

  // ── 3. Rating ────────────────────────────────────────────────────────────
  // "★ 4,89 (261)" ou "4,89 ★" ou "4,89 (261)"
  const ratingPatterns = [
    /[★⭐*]\s*(\d[.,]\d{1,2})/,
    /(\d[.,]\d{1,2})\s*[★⭐*]/,
    /(\d[.,]\d{1,2})\s*\(\d+\)/,
    /nota[:\s]+(\d[.,]\d{1,2})/i,
  ];
  let passengerRating = 0;
  for (const p of ratingPatterns) {
    const m = p.exec(text);
    if (m) {
      const v = parseFloat(m[1].replace(",", "."));
      if (v >= 1 && v <= 5) { passengerRating = v; break; }
    }
  }

  return { grossValue, distanceKm, durationMinutes, passengerRating };
}
