import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { analyzeTripQuality, parseUberText, useApp } from "@/contexts/AppContext";
import { Semaphore } from "@/components/Semaphore";
import { TripReader } from "@/modules/TripReader";

const useNative = Platform.OS !== "web";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function InfoRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const SIGNAL_LABELS = {
  green:  "Corrida excelente!",
  yellow: "Corrida razoável",
  red:    "Corrida fraca — cuidado",
};

const SIGNAL_COLORS = {
  green:  Colors.accent,
  yellow: Colors.warning,
  red:    Colors.danger,
};

interface RealtimePopupProps {
  visible: boolean;
  data: ReturnType<typeof analyzeTripQuality> | null;
  rawValues: { gross: number; dist: number; dur: number; rating: number } | null;
  settings: ReturnType<typeof useApp>["settings"];
  source: "accessibility" | "clipboard";
  onDismiss: () => void;
}

function RealtimePopup({
  visible,
  data,
  rawValues,
  settings,
  source,
  onDismiss,
}: RealtimePopupProps) {
  const translateY = useRef(new Animated.Value(300)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: useNative, damping: 18 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: useNative }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 300, useNativeDriver: useNative }),
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: useNative }),
      ]).start();
    }
  }, [visible]);

  if (!data || !rawValues) return null;

  const sigColor = SIGNAL_COLORS[data.signal];

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onDismiss}>
      <Animated.View style={[popup.overlay, { opacity }]}>
        <Pressable style={{ flex: 1 }} onPress={onDismiss} />
        <Animated.View style={[popup.sheet, { transform: [{ translateY }] }]}>
          <View style={popup.dragHandle} />

          <View style={popup.badge}>
            <Ionicons
              name={source === "accessibility" ? "accessibility" : "flash"}
              size={11}
              color={Colors.accent}
            />
            <Text style={popup.badgeText}>
              {source === "accessibility"
                ? "Leitura via Acessibilidade"
                : "Leitura via Clipboard"}
            </Text>
          </View>

          <View style={popup.topRow}>
            <Semaphore signal={data.signal} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={[popup.signalLabel, { color: sigColor }]}>
                {SIGNAL_LABELS[data.signal]}
              </Text>
              <Text style={popup.scoreText}>Score: {data.score}/100</Text>
            </View>
          </View>

          <View style={popup.divider} />

          <View style={popup.valuesGrid}>
            <View style={popup.valueCell}>
              <Text style={[popup.valueBig, { color: sigColor }]}>
                {formatCurrency(data.valuePerKm)}
              </Text>
              <Text style={popup.valueLabel}>por km</Text>
            </View>
            <View style={popup.valueDivider} />
            <View style={popup.valueCell}>
              <Text style={[popup.valueBig, { color: sigColor }]}>
                {formatCurrency(data.valuePerHour)}
              </Text>
              <Text style={popup.valueLabel}>por hora</Text>
            </View>
            <View style={popup.valueDivider} />
            <View style={popup.valueCell}>
              <Text style={[popup.valueBig, { color: sigColor }]}>
                {formatCurrency(data.valuePerMinute)}
              </Text>
              <Text style={popup.valueLabel}>por min</Text>
            </View>
          </View>

          <View style={popup.divider} />

          <View style={popup.detailRow}>
            <View style={popup.detailItem}>
              <Text style={popup.detailLabel}>Valor bruto</Text>
              <Text style={popup.detailValue}>{formatCurrency(rawValues.gross)}</Text>
            </View>
            <View style={popup.detailItem}>
              <Text style={popup.detailLabel}>Distância</Text>
              <Text style={popup.detailValue}>{rawValues.dist.toFixed(1)} km</Text>
            </View>
            <View style={popup.detailItem}>
              <Text style={popup.detailLabel}>Duração</Text>
              <Text style={popup.detailValue}>{rawValues.dur.toFixed(0)} min</Text>
            </View>
            {rawValues.rating > 0 && (
              <View style={popup.detailItem}>
                <Text style={popup.detailLabel}>Passageiro</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="star" size={12} color={Colors.warning} />
                  <Text style={popup.detailValue}>{rawValues.rating.toFixed(1)}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={popup.netRow}>
            <Text style={popup.netLabel}>Lucro líquido estimado</Text>
            <Text
              style={[
                popup.netValue,
                { color: data.netValue >= 0 ? Colors.accent : Colors.danger },
              ]}
            >
              {formatCurrency(data.netValue)}
            </Text>
          </View>

          <Pressable style={popup.dismissBtn} onPress={onDismiss}>
            <Text style={popup.dismissText}>Fechar</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default function AnalisarScreen() {
  const insets   = useSafeAreaInsets();
  const { settings } = useApp();
  const C = Colors.dark;

  // ─── Realtime state ───────────────────────────────────────────────────────
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [a11yStatus, setA11yStatus]           = useState<"enabled" | "disabled" | "unavailable">(
    TripReader.isAvailable() ? "disabled" : "unavailable"
  );
  const [clipFound, setClipFound]             = useState(false);
  const [popupVisible, setPopupVisible]       = useState(false);
  const [popupSource, setPopupSource]         = useState<"accessibility" | "clipboard">("clipboard");
  const [realtimeData, setRealtimeData]       = useState<ReturnType<typeof analyzeTripQuality> | null>(null);
  const [realtimeRaw, setRealtimeRaw]         = useState<{ gross: number; dist: number; dur: number; rating: number } | null>(null);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubA11yRef  = useRef<(() => void) | null>(null);
  const lastClipboardRef = useRef<string>("");

  // ─── Manual form state ────────────────────────────────────────────────────
  const [grossValue,      setGrossValue]      = useState("");
  const [distanceKm,      setDistanceKm]      = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [passengerRating, setPassengerRating] = useState("");

  // ─── Check a11y status on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!TripReader.isAvailable()) return;
    TripReader.isAccessibilityEnabled().then((enabled) => {
      setA11yStatus(enabled ? "enabled" : "disabled");
    });
  }, []);

  const refreshA11yStatus = useCallback(async () => {
    if (!TripReader.isAvailable()) return;
    const enabled = await TripReader.isAccessibilityEnabled();
    setA11yStatus(enabled ? "enabled" : "disabled");
  }, []);

  // ─── Trip detection handler ───────────────────────────────────────────────
  const handleTripDetected = useCallback(
    (
      gross: number,
      dist: number,
      dur: number,
      rating: number,
      src: "accessibility" | "clipboard"
    ) => {
      const analysis = analyzeTripQuality(gross, dist, dur, settings);
      setRealtimeData(analysis);
      setRealtimeRaw({ gross, dist, dur, rating });
      setPopupSource(src);
      setPopupVisible(true);

      if (analysis.signal === "green") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (analysis.signal === "yellow") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [settings]
  );

  // ─── Clipboard polling (fallback) ─────────────────────────────────────────
  const checkClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || text === lastClipboardRef.current) return;
      lastClipboardRef.current = text;
      const parsed = parseUberText(text);
      if (!parsed) return;
      setClipFound(true);
      handleTripDetected(
        parsed.grossValue,
        parsed.distanceKm,
        parsed.durationMinutes,
        parsed.passengerRating,
        "clipboard"
      );
    } catch {
      // Clipboard unavailable
    }
  }, [handleTripDetected]);

  // ─── Start / stop realtime ────────────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    unsubA11yRef.current?.();
    unsubA11yRef.current = null;

    if (!realtimeEnabled) return;

    if (a11yStatus === "enabled") {
      TripReader.startListening();
      unsubA11yRef.current = TripReader.addListener((trip) => {
        handleTripDetected(
          trip.grossValue,
          trip.distanceKm,
          trip.durationMinutes,
          trip.passengerRating,
          "accessibility"
        );
      });
    } else {
      intervalRef.current = setInterval(checkClipboard, 2000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (a11yStatus === "enabled") {
        TripReader.stopListening();
        unsubA11yRef.current?.();
        unsubA11yRef.current = null;
      }
    };
  }, [realtimeEnabled, a11yStatus, checkClipboard, handleTripDetected]);

  const toggleRealtime = useCallback(
    async (val: boolean) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (val) await refreshA11yStatus();
      setClipFound(false);
      setRealtimeEnabled(val);
    },
    [refreshA11yStatus]
  );

  // ─── Manual form ──────────────────────────────────────────────────────────
  const manualResult = React.useMemo(() => {
    const gross = parseFloat(grossValue.replace(",", ".")) || 0;
    const dist  = parseFloat(distanceKm.replace(",", ".")) || 0;
    const dur   = parseFloat(durationMinutes.replace(",", ".")) || 0;
    if (gross <= 0 || dist <= 0 || dur <= 0) return null;
    return analyzeTripQuality(gross, dist, dur, settings);
  }, [grossValue, distanceKm, durationMinutes, settings]);

  const resultScale   = useSharedValue(0.9);
  const resultOpacity = useSharedValue(0);

  useEffect(() => {
    if (manualResult) {
      resultScale.value   = withSpring(1, { damping: 14 });
      resultOpacity.value = withSpring(1);
      if (manualResult.signal === "green") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (manualResult.signal === "yellow") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      resultScale.value   = withSpring(0.9);
      resultOpacity.value = withSpring(0);
    }
  }, [manualResult]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultOpacity.value,
  }));

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const realtimeSubtitle = (() => {
    if (!realtimeEnabled) {
      return a11yStatus === "enabled"
        ? "Monitoramento automático via acessibilidade"
        : "Copie o texto da oferta para análise automática";
    }
    if (a11yStatus === "enabled") return "Conectado — monitorando o Uber";
    if (a11yStatus === "disabled") return "Ative o serviço de acessibilidade abaixo";
    return clipFound ? "Corrida detectada!" : "Aguardando dados do Uber...";
  })();

  const toggleIconName = (() => {
    if (a11yStatus === "enabled") return realtimeEnabled ? "accessibility" : "accessibility-outline";
    return realtimeEnabled ? "flash" : "flash-outline";
  })();

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const rating   = parseFloat(passengerRating.replace(",", ".")) || 0;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop:    topInset + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Analisador</Text>

        {/* ─── REALTIME TOGGLE ────────────────────────────────────────── */}
        <View style={[styles.realtimeCard, realtimeEnabled && styles.realtimeCardActive]}>
          <View style={styles.realtimeLeft}>
            <View style={[styles.realtimeIcon, realtimeEnabled && styles.realtimeIconActive]}>
              <Ionicons
                name={toggleIconName as any}
                size={20}
                color={realtimeEnabled ? Colors.dark.bg : C.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.realtimeTitle}>Analisar em tempo real</Text>
              <Text style={styles.realtimeSub} numberOfLines={1}>
                {realtimeSubtitle}
              </Text>
            </View>
          </View>
          <Switch
            value={realtimeEnabled}
            onValueChange={toggleRealtime}
            trackColor={{ false: C.bgElevated, true: Colors.accent + "99" }}
            thumbColor={realtimeEnabled ? Colors.accent : C.textMuted}
          />
        </View>

        {/* ─── ACCESSIBILITY NOT ENABLED ─────────────────────────────── */}
        {realtimeEnabled && a11yStatus === "disabled" && (
          <View style={styles.a11yCard}>
            <View style={styles.a11yHeader}>
              <Ionicons name="shield-checkmark-outline" size={22} color={Colors.accent} />
              <Text style={styles.a11yTitle}>Serviço de Acessibilidade</Text>
            </View>
            <Text style={styles.a11yBody}>
              Para leitura automática das ofertas, ative o serviço
              "Moto Ganhos" nas configurações de acessibilidade do Android.
            </Text>
            <Pressable
              style={styles.a11yBtn}
              onPress={() => {
                TripReader.openAccessibilitySettings();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Ionicons name="settings-outline" size={16} color={Colors.dark.bg} />
              <Text style={styles.a11yBtnText}>Abrir Configurações de Acessibilidade</Text>
            </Pressable>
            <Pressable style={styles.a11yRefreshBtn} onPress={refreshA11yStatus}>
              <Ionicons name="refresh" size={14} color={Colors.accent} />
              <Text style={styles.a11yRefreshText}>Já ativei — verificar novamente</Text>
            </Pressable>
          </View>
        )}

        {/* ─── ACCESSIBILITY ENABLED ──────────────────────────────────── */}
        {realtimeEnabled && a11yStatus === "enabled" && (
          <View style={styles.instructionCard}>
            <View style={[styles.statusPill, { backgroundColor: Colors.accent + "22" }]}>
              <View style={[styles.statusDot, { backgroundColor: Colors.accent }]} />
              <Text style={[styles.statusText, { color: Colors.accent }]}>
                Conectado — monitorando o Uber Driver automaticamente
              </Text>
            </View>
            <Text style={styles.a11yHint}>
              Abra o Uber Driver. O semáforo aparece automaticamente ao receber
              uma oferta de corrida, sem precisar copiar nada.
            </Text>
          </View>
        )}

        {/* ─── CLIPBOARD FALLBACK ─────────────────────────────────────── */}
        {realtimeEnabled && a11yStatus === "unavailable" && (
          <View style={styles.instructionCard}>
            <View style={styles.instructionRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
              <Text style={styles.instructionText}>
                Abra o app do Uber e veja uma oferta de corrida
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
              <Text style={styles.instructionText}>
                Selecione e copie o texto com os detalhes (valor, km, tempo)
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>3</Text></View>
              <Text style={styles.instructionText}>
                Volte aqui — o semáforo aparece automaticamente!
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: Colors.accent + "22" }]}>
              <View style={[styles.statusDot, { backgroundColor: clipFound ? Colors.accent : Colors.warning }]} />
              <Text style={[styles.statusText, { color: clipFound ? Colors.accent : Colors.warning }]}>
                {clipFound
                  ? "Ultima leitura bem-sucedida"
                  : "Monitorando area de transferencia..."}
              </Text>
            </View>
          </View>
        )}

        {/* ─── DIVIDER ────────────────────────────────────────────────── */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou preencha manualmente</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.subtitle}>
          Insira os dados da corrida para análise instantânea
        </Text>

        {/* ─── MANUAL FORM ────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Valor bruto (R$)</Text>
              <View style={styles.inputField}>
                <Ionicons name="cash-outline" size={16} color={C.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={grossValue}
                  onChangeText={setGrossValue}
                  placeholder="0,00"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Distância (km)</Text>
              <View style={styles.inputField}>
                <Ionicons name="navigate-outline" size={16} color={C.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                  placeholder="0,0"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Duração (min)</Text>
              <View style={styles.inputField}>
                <Ionicons name="time-outline" size={16} color={C.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Nota passageiro</Text>
              <View style={styles.inputField}>
                <Ionicons name="star-outline" size={16} color={C.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={passengerRating}
                  onChangeText={setPassengerRating}
                  placeholder="5,0"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>
        </View>

        {/* ─── MANUAL RESULT ──────────────────────────────────────────── */}
        {manualResult && (
          <Reanimated.View style={[styles.resultCard, animStyle]}>
            <View style={styles.resultTop}>
              <Semaphore signal={manualResult.signal} size={32} />
              <View style={styles.resultInfo}>
                <Text style={[styles.signalLabel, { color: SIGNAL_COLORS[manualResult.signal] }]}>
                  {SIGNAL_LABELS[manualResult.signal]}
                </Text>
                <Text style={styles.signalScore}>Score: {manualResult.score}/100</Text>
              </View>
              {rating > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color={Colors.warning} />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            <View style={styles.rowDivider} />

            <InfoRow
              label="Valor por KM"
              value={formatCurrency(manualResult.valuePerKm) + "/km"}
              color={
                manualResult.valuePerKm >= settings.minGoodValuePerKm
                  ? Colors.accent
                  : manualResult.valuePerKm >= settings.minGoodValuePerKm * 0.6
                  ? Colors.warning
                  : Colors.danger
              }
            />
            <InfoRow
              label="Valor por hora"
              value={formatCurrency(manualResult.valuePerHour) + "/h"}
              color={
                manualResult.valuePerHour >= settings.minGoodValuePerHour
                  ? Colors.accent
                  : manualResult.valuePerHour >= settings.minGoodValuePerHour * 0.6
                  ? Colors.warning
                  : Colors.danger
              }
            />
            <InfoRow
              label="Valor por minuto"
              value={formatCurrency(manualResult.valuePerMinute) + "/min"}
              color={
                manualResult.valuePerMinute >= settings.minGoodValuePerMinute
                  ? Colors.accent
                  : manualResult.valuePerMinute >= settings.minGoodValuePerMinute * 0.6
                  ? Colors.warning
                  : Colors.danger
              }
            />
            <InfoRow
              label="Lucro líquido"
              value={formatCurrency(manualResult.netValue)}
              color={manualResult.netValue >= 0 ? Colors.accent : Colors.danger}
            />

            <View style={styles.rowDivider} />

            <View style={styles.thresholdsRow}>
              <View style={styles.threshold}>
                <Ionicons name="checkmark-circle" size={13} color={Colors.accent} />
                <Text style={styles.thresholdText}>
                  Min KM: {formatCurrency(settings.minGoodValuePerKm)}
                </Text>
              </View>
              <View style={styles.threshold}>
                <Ionicons name="checkmark-circle" size={13} color={Colors.accent} />
                <Text style={styles.thresholdText}>
                  Min/h: {formatCurrency(settings.minGoodValuePerHour)}
                </Text>
              </View>
              <View style={styles.threshold}>
                <Ionicons name="checkmark-circle" size={13} color={Colors.accent} />
                <Text style={styles.thresholdText}>
                  Min/min: {formatCurrency(settings.minGoodValuePerMinute)}
                </Text>
              </View>
            </View>
          </Reanimated.View>
        )}
      </ScrollView>

      <RealtimePopup
        visible={popupVisible}
        data={realtimeData}
        rawValues={realtimeRaw}
        settings={settings}
        source={popupSource}
        onDismiss={() => setPopupVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },

  // Realtime toggle card
  realtimeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  realtimeCardActive: {
    borderColor: Colors.accent + "55",
  },
  realtimeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  realtimeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  realtimeIconActive: {
    backgroundColor: Colors.accent,
  },
  realtimeTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  realtimeSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },

  // Accessibility card
  a11yCard: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.accent + "33",
    gap: 12,
  },
  a11yHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  a11yTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  a11yBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  a11yBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  a11yBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.bg,
  },
  a11yRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  a11yRefreshText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  a11yHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },

  // Instruction card (clipboard mode)
  instructionCard: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 12,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent + "22",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNum: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  instructionText: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },

  // Status pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // Input form
  inputGroup: { gap: 10, marginBottom: 20 },
  inputRow:   { flexDirection: "row", gap: 10 },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    marginBottom: 6,
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },

  // Result card
  resultCard: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 24,
  },
  resultTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  resultInfo:  { flex: 1 },
  signalLabel: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  signalScore: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.warning + "22",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  ratingText: {
    color: Colors.warning,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  thresholdsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  threshold: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  thresholdText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});

const popup = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.dark.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: Colors.dark.accentMuted ?? "rgba(0,217,111,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: Colors.accent,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  signalLabel: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  scoreText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 14,
  },
  valuesGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueCell: {
    flex: 1,
    alignItems: "center",
  },
  valueDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.dark.border,
  },
  valueBig: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  valueLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: { alignItems: "center" },
  detailLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  detailValue: {
    color: Colors.dark.text,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  netLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  netValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  dismissBtn: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 14,
  },
  dismissText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});