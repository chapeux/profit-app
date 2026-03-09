import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { analyzeTripQuality, useApp } from "@/contexts/AppContext";
import { Semaphore } from "@/components/Semaphore";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function NovaCorrida() {
  const insets = useSafeAreaInsets();
  const { addTrip, settings } = useApp();
  const C = Colors.dark;

  const [grossValue, setGrossValue] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [passengerRating, setPassengerRating] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const preview = React.useMemo(() => {
    const gross = parseFloat(grossValue.replace(",", ".")) || 0;
    const dist = parseFloat(distanceKm.replace(",", ".")) || 0;
    const dur = parseFloat(durationMinutes.replace(",", ".")) || 0;
    if (gross <= 0 || dist <= 0 || dur <= 0) return null;
    return analyzeTripQuality(gross, dist, dur, settings);
  }, [grossValue, distanceKm, durationMinutes, settings]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!grossValue || parseFloat(grossValue.replace(",", ".")) <= 0)
      errs.grossValue = "Informe o valor";
    if (!distanceKm || parseFloat(distanceKm.replace(",", ".")) <= 0)
      errs.distanceKm = "Informe a distância";
    if (!durationMinutes || parseFloat(durationMinutes.replace(",", ".")) <= 0)
      errs.durationMinutes = "Informe a duração";
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTrip({
      date: new Date().toISOString(),
      grossValue: parseFloat(grossValue.replace(",", ".")),
      distanceKm: parseFloat(distanceKm.replace(",", ".")),
      durationMinutes: parseFloat(durationMinutes.replace(",", ".")),
      passengerRating: parseFloat(passengerRating.replace(",", ".")) || 0,
      notes: notes.trim() || undefined,
    });
    router.back();
  };

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const SIGNAL_COLORS = {
    green: Colors.accent,
    yellow: Colors.warning,
    red: Colors.danger,
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.modalHandle, { marginTop: Math.max(topInset, 12) }]}>
        <View style={styles.handle} />
      </View>

      <View style={styles.topBar}>
        <Text style={styles.title}>Nova Corrida</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={C.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Valor bruto (R$) *</Text>
            <View style={[styles.inputWrap, errors.grossValue ? styles.inputError : null]}>
              <Ionicons name="cash-outline" size={16} color={C.textSecondary} />
              <TextInput
                style={styles.input}
                value={grossValue}
                onChangeText={(v) => {
                  setGrossValue(v);
                  setErrors((e) => ({ ...e, grossValue: "" }));
                }}
                placeholder="0,00"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            {errors.grossValue ? (
              <Text style={styles.errorText}>{errors.grossValue}</Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Distância (km) *</Text>
            <View style={[styles.inputWrap, errors.distanceKm ? styles.inputError : null]}>
              <Ionicons name="navigate-outline" size={16} color={C.textSecondary} />
              <TextInput
                style={styles.input}
                value={distanceKm}
                onChangeText={(v) => {
                  setDistanceKm(v);
                  setErrors((e) => ({ ...e, distanceKm: "" }));
                }}
                placeholder="0,0"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            {errors.distanceKm ? (
              <Text style={styles.errorText}>{errors.distanceKm}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Duração (min) *</Text>
            <View style={[styles.inputWrap, errors.durationMinutes ? styles.inputError : null]}>
              <Ionicons name="time-outline" size={16} color={C.textSecondary} />
              <TextInput
                style={styles.input}
                value={durationMinutes}
                onChangeText={(v) => {
                  setDurationMinutes(v);
                  setErrors((e) => ({ ...e, durationMinutes: "" }));
                }}
                placeholder="0"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            {errors.durationMinutes ? (
              <Text style={styles.errorText}>{errors.durationMinutes}</Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Nota do passageiro</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="star-outline" size={16} color={C.textSecondary} />
              <TextInput
                style={styles.input}
                value={passengerRating}
                onChangeText={setPassengerRating}
                placeholder="5,0"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>
        </View>

        <Text style={styles.label}>Observações (opcional)</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="create-outline" size={16} color={C.textSecondary} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observações sobre a corrida..."
            placeholderTextColor={C.textMuted}
            returnKeyType="done"
            multiline={false}
          />
        </View>

        {preview && (
          <View style={styles.preview}>
            <View style={styles.previewLeft}>
              <Semaphore signal={preview.signal} size={24} />
            </View>
            <View style={styles.previewCenter}>
              <Text
                style={[
                  styles.previewSignal,
                  { color: SIGNAL_COLORS[preview.signal] },
                ]}
              >
                {preview.signal === "green"
                  ? "Corrida excelente"
                  : preview.signal === "yellow"
                  ? "Corrida razoável"
                  : "Corrida fraca"}
              </Text>
              <Text style={styles.previewStats}>
                {formatCurrency(preview.valuePerKm)}/km ·{" "}
                {formatCurrency(preview.valuePerMinute)}/min
              </Text>
            </View>
            <View style={styles.previewRight}>
              <Text style={styles.previewNet}>Líquido</Text>
              <Text style={[styles.previewNetValue, { color: SIGNAL_COLORS[preview.signal] }]}>
                {formatCurrency(
                  (parseFloat(grossValue.replace(",", ".")) || 0) -
                    ((parseFloat(distanceKm.replace(",", ".")) || 0) / settings.kmPerLiter) *
                      settings.fuelPricePerLiter -
                    (parseFloat(distanceKm.replace(",", ".")) || 0) *
                      settings.costPerKmExtra
                )}
              </Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: pressed || saving ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="checkmark" size={20} color={C.bg} />
          <Text style={styles.saveBtnText}>
            {saving ? "Salvando..." : "Salvar corrida"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  modalHandle: { alignItems: "center", marginBottom: 8 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 20, gap: 14 },
  row: { flexDirection: "row", gap: 12 },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    color: Colors.danger,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 12,
  },
  previewLeft: {},
  previewCenter: { flex: 1 },
  previewSignal: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  previewStats: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  previewRight: { alignItems: "flex-end" },
  previewNet: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  previewNetValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: Colors.dark.bg,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
