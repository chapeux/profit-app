import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
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
import { useApp } from "@/contexts/AppContext";
import { TripCard } from "@/components/TripCard";

type Filter = "all" | "today" | "week" | "month" | "custom";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "custom", label: "Intervalo" },
];

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseLocalDate(str: string): Date | null {
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year || year.length < 4) return null;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return isNaN(d.getTime()) ? null : d;
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = digits;
  if (digits.length > 4) out = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
  else if (digits.length > 2) out = digits.slice(0, 2) + "/" + digits.slice(2);
  return out;
}

interface DashboardProps {
  filtered: ReturnType<typeof useApp>["trips"];
  label: string;
}

function Dashboard({ filtered, label }: DashboardProps) {
  const C = Colors.dark;
  const net = filtered.reduce((s, t) => s + t.netValue, 0);
  const gross = filtered.reduce((s, t) => s + t.grossValue, 0);
  const km = filtered.reduce((s, t) => s + t.distanceKm, 0);
  const fuel = filtered.reduce((s, t) => s + t.fuelCost, 0);
  const extra = filtered.reduce((s, t) => s + t.extraCost, 0);
  const totalMin = filtered.reduce((s, t) => s + t.durationMinutes, 0);
  const avgPerKm = km > 0 ? net / km : 0;
  const avgPerHour = totalMin > 0 ? (net / totalMin) * 60 : 0;
  const avgTrip = filtered.length > 0 ? net / filtered.length : 0;

  if (filtered.length === 0) return null;

  return (
    <View style={dash.card}>
      <Text style={dash.period}>{label}</Text>
      <View style={dash.heroRow}>
        <View style={{ flex: 1 }}>
          <Text style={dash.heroLabel}>Lucro líquido</Text>
          <Text style={[dash.heroValue, { color: net >= 0 ? Colors.accent : Colors.danger }]}>
            {formatCurrency(net)}
          </Text>
        </View>
        <View style={dash.heroRight}>
          <Text style={dash.heroLabel}>Receita bruta</Text>
          <Text style={dash.heroBruto}>{formatCurrency(gross)}</Text>
        </View>
      </View>

      <View style={dash.divider} />

      <View style={dash.grid}>
        <View style={dash.cell}>
          <Ionicons name="car-outline" size={14} color={C.textSecondary} />
          <Text style={dash.cellValue}>{filtered.length}</Text>
          <Text style={dash.cellLabel}>Corridas</Text>
        </View>
        <View style={dash.cellDivider} />
        <View style={dash.cell}>
          <Ionicons name="speedometer-outline" size={14} color={C.textSecondary} />
          <Text style={dash.cellValue}>{km.toFixed(0)} km</Text>
          <Text style={dash.cellLabel}>Distância</Text>
        </View>
        <View style={dash.cellDivider} />
        <View style={dash.cell}>
          <Ionicons name="time-outline" size={14} color={C.textSecondary} />
          <Text style={dash.cellValue}>{totalMin >= 60 ? (totalMin / 60).toFixed(1) + "h" : totalMin.toFixed(0) + "min"}</Text>
          <Text style={dash.cellLabel}>Tempo total</Text>
        </View>
      </View>

      <View style={dash.divider} />

      <View style={dash.grid}>
        <View style={dash.cell}>
          <Ionicons name="map-outline" size={14} color={C.textSecondary} />
          <Text style={dash.cellValue}>{formatCurrency(avgPerKm)}</Text>
          <Text style={dash.cellLabel}>Por KM</Text>
        </View>
        <View style={dash.cellDivider} />
        <View style={dash.cell}>
          <Ionicons name="hourglass-outline" size={14} color={C.textSecondary} />
          <Text style={dash.cellValue}>{formatCurrency(avgPerHour)}</Text>
          <Text style={dash.cellLabel}>Por hora</Text>
        </View>
        <View style={dash.cellDivider} />
        <View style={dash.cell}>
          <Ionicons name="trending-up-outline" size={14} color={C.textSecondary} />
          <Text style={dash.cellValue}>{formatCurrency(avgTrip)}</Text>
          <Text style={dash.cellLabel}>Média/corrida</Text>
        </View>
      </View>

      <View style={dash.divider} />

      <View style={dash.costsRow}>
        <View style={dash.costItem}>
          <Ionicons name="flame-outline" size={13} color={Colors.danger} />
          <Text style={dash.costLabel}>Combustível</Text>
          <Text style={[dash.costValue, { color: Colors.danger }]}>{formatCurrency(fuel)}</Text>
        </View>
        <View style={dash.costItem}>
          <Ionicons name="construct-outline" size={13} color="#9B59FF" />
          <Text style={dash.costLabel}>Manutenção</Text>
          <Text style={[dash.costValue, { color: "#9B59FF" }]}>{formatCurrency(extra)}</Text>
        </View>
        <View style={dash.costItem}>
          <Ionicons name="remove-circle-outline" size={13} color={C.textSecondary} />
          <Text style={dash.costLabel}>Total custos</Text>
          <Text style={dash.costValue}>{formatCurrency(fuel + extra)}</Text>
        </View>
      </View>
    </View>
  );
}

const dash = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  period: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  heroLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 3,
  },
  heroValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  heroRight: {
    alignItems: "flex-end",
  },
  heroBruto: {
    color: Colors.dark.text,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  grid: {
    flexDirection: "row",
    alignItems: "center",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  cellDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.dark.border,
  },
  cellValue: {
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  cellLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  costsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  costItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  costLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  costValue: {
    color: Colors.dark.text,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const { trips, removeTrip } = useApp();
  const C = Colors.dark;
  const [filter, setFilter] = useState<Filter>("all");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date | null>(null);
  const [dateError, setDateError] = useState("");

  const periodLabel = useMemo(() => {
    if (filter === "all") return "Todas as corridas";
    if (filter === "today") return "Hoje";
    if (filter === "week") return "Últimos 7 dias";
    if (filter === "month") {
      const now = new Date();
      return now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    if (filter === "custom" && appliedFrom && appliedTo) {
      return (
        appliedFrom.toLocaleDateString("pt-BR") +
        " – " +
        appliedTo.toLocaleDateString("pt-BR")
      );
    }
    return "Personalizado";
  }, [filter, appliedFrom, appliedTo]);

  const filtered = useMemo(() => {
    const now = new Date();
    return trips.filter((t) => {
      const d = new Date(t.date);
      if (filter === "today") return d.toDateString() === now.toDateString();
      if (filter === "week") {
        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff < 7;
      }
      if (filter === "month")
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (filter === "custom" && appliedFrom && appliedTo) {
        const to = new Date(appliedTo);
        to.setHours(23, 59, 59, 999);
        return d >= appliedFrom && d <= to;
      }
      return true;
    });
  }, [trips, filter, appliedFrom, appliedTo]);

  const applyCustom = () => {
    const from = parseLocalDate(fromDate);
    const to = parseLocalDate(toDate);
    if (!from) { setDateError("Data inicial inválida (use DD/MM/AAAA)"); return; }
    if (!to) { setDateError("Data final inválida (use DD/MM/AAAA)"); return; }
    if (from > to) { setDateError("Data inicial deve ser menor que a final"); return; }
    setAppliedFrom(from);
    setAppliedTo(to);
    setFilter("custom");
    setShowCustomModal(false);
    setDateError("");
  };

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.topBar, { paddingTop: topInset + 16 }]}>
        <Text style={styles.title}>Corridas</Text>
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/nova-corrida");
          }}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={C.bg} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={async () => {
              await Haptics.selectionAsync();
              if (f.key === "custom") {
                setShowCustomModal(true);
              } else {
                setFilter(f.key);
              }
            }}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterActive,
            ]}
          >
            {f.key === "custom" && (
              <Ionicons
                name="calendar-outline"
                size={13}
                color={filter === "custom" ? C.bg : C.textSecondary}
              />
            )}
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TripCard trip={item} onDelete={removeTrip} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListHeaderComponent={
          <Dashboard filtered={filtered} label={periodLabel} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>Nenhuma corrida encontrada</Text>
            <Text style={styles.emptySub}>
              {filter === "all"
                ? "Toque no + para adicionar"
                : "Tente outro período ou adicione corridas"}
            </Text>
          </View>
        }
      />

      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Intervalo personalizado</Text>
            <Text style={modal.label}>Data inicial</Text>
            <View style={modal.inputWrap}>
              <Ionicons name="calendar-outline" size={16} color={C.textSecondary} />
              <TextInput
                style={modal.input}
                value={fromDate}
                onChangeText={(v) => setFromDate(formatDateInput(v))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <Text style={modal.label}>Data final</Text>
            <View style={modal.inputWrap}>
              <Ionicons name="calendar-outline" size={16} color={C.textSecondary} />
              <TextInput
                style={modal.input}
                value={toDate}
                onChangeText={(v) => setToDate(formatDateInput(v))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            {dateError ? <Text style={modal.error}>{dateError}</Text> : null}
            <View style={modal.btnRow}>
              <Pressable
                style={modal.cancelBtn}
                onPress={() => { setShowCustomModal(false); setDateError(""); }}
              >
                <Text style={modal.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={modal.applyBtn} onPress={applyCustom}>
                <Text style={modal.applyText}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersScroll: { maxHeight: 44, marginBottom: 12 },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.bgCard,
    gap: 5,
  },
  filterActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  filterTextActive: {
    color: Colors.dark.bg,
  },
  list: { paddingHorizontal: 16 },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  emptySub: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.dark.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  error: {
    color: Colors.danger,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.bgElevated,
    alignItems: "center",
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
  },
  applyText: {
    color: Colors.dark.bg,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
