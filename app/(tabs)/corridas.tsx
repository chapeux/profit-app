import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtKm(v: number) {
  return v.toFixed(1).replace(".", ",") + " km";
}

function fmtMin(mins: number) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${Math.round(mins)}min`;
}

function parseDate(iso: string) {
  return new Date(iso);
}

function formatTripDate(iso: string) {
  const d = parseDate(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── types ───────────────────────────────────────────────────────────────────

type FilterKey = "all" | "today" | "week" | "month" | "custom";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",    label: "Todas"  },
  { key: "today",  label: "Hoje"   },
  { key: "week",   label: "Semana" },
  { key: "month",  label: "Mês"    },
  { key: "custom", label: "📅 Intervalo" },
];

// ─── date range helpers ───────────────────────────────────────────────────────

function startOf(unit: "day" | "week" | "month"): Date {
  const now = new Date();
  if (unit === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (unit === "week") {
    const day = now.getDay(); // 0=sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function parseDMY(s: string): Date | null {
  const [d, m, y] = s.split("/").map(Number);
  if (!d || !m || !y || y < 2000) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

// ─── StatRow ─────────────────────────────────────────────────────────────────

function StatRow({
  icon,
  label,
  value,
  color,
  iconColor,
  border,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
  iconColor?: string;
  border?: boolean;
}) {
  const C = Colors.dark;
  return (
    <View style={[dashStyles.statRow, border && dashStyles.statRowBorder]}>
      <View style={dashStyles.statLeft}>
        <Ionicons name={icon as any} size={16} color={iconColor ?? C.textMuted} style={{ marginRight: 6 }} />
        <Text style={dashStyles.statLabel}>{label}</Text>
      </View>
      <Text style={[dashStyles.statValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard({
  trips,
  settings,
  label,
}: {
  trips: any[];
  settings: any;
  label: string;
}) {
  const C = Colors.dark;

  const stats = useMemo(() => {
    if (!trips.length) return null;
    const gross        = trips.reduce((s, t) => s + t.grossValue, 0);
    const distKm       = trips.reduce((s, t) => s + t.distanceKm, 0);
    const durMin       = trips.reduce((s, t) => s + t.durationMinutes, 0);
    const fuelCost     = trips.reduce((s, t) => s + (t.distanceKm / settings.kmPerLiter) * settings.fuelPricePerLiter, 0);
    const extraCost    = trips.reduce((s, t) => s + t.distanceKm * settings.costPerKmExtra, 0);
    const totalCost    = fuelCost + extraCost;
    const net          = gross - totalCost;
    const perKm        = distKm > 0 ? gross / distKm : 0;
    const perHour      = durMin > 0 ? (gross / durMin) * 60 : 0;
    const avgPerTrip   = trips.length > 0 ? gross / trips.length : 0;

    return { gross, distKm, durMin, fuelCost, extraCost, totalCost, net, perKm, perHour, avgPerTrip };
  }, [trips, settings]);

  if (!stats) {
    return (
      <View style={[dashStyles.card, { alignItems: "center", paddingVertical: 24 }]}>
        <Text style={{ color: C.textMuted, fontSize: 14 }}>Nenhuma corrida no período</Text>
      </View>
    );
  }

  return (
    <View style={dashStyles.card}>
      <Text style={dashStyles.period}>{label.toUpperCase()}</Text>

      {/* Lucro líquido em destaque */}
      <View style={dashStyles.heroRow}>
        <View>
          <Text style={dashStyles.heroLabel}>Lucro líquido</Text>
          <Text style={[dashStyles.heroValue, { color: Colors.accent }]}>{fmt(stats.net)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={dashStyles.heroLabel}>Receita bruta</Text>
          <Text style={dashStyles.heroSecondary}>{fmt(stats.gross)}</Text>
        </View>
      </View>

      <View style={dashStyles.divider} />

      {/* Linha 1: corridas / km / tempo */}
      <View style={dashStyles.statsGrid}>
        <View style={dashStyles.gridCell}>
          <Ionicons name="car-outline" size={18} color={C.textMuted} />
          <Text style={dashStyles.gridValue}>{trips.length}</Text>
          <Text style={dashStyles.gridLabel}>Corridas</Text>
        </View>
        <View style={[dashStyles.gridCell, dashStyles.gridCellBorder]}>
          <Ionicons name="speedometer-outline" size={18} color={C.textMuted} />
          <Text style={dashStyles.gridValue}>{fmtKm(stats.distKm)}</Text>
          <Text style={dashStyles.gridLabel}>Distância</Text>
        </View>
        <View style={[dashStyles.gridCell, dashStyles.gridCellBorder]}>
          <Ionicons name="time-outline" size={18} color={C.textMuted} />
          <Text style={dashStyles.gridValue}>{fmtMin(stats.durMin)}</Text>
          <Text style={dashStyles.gridLabel}>Tempo total</Text>
        </View>
      </View>

      <View style={dashStyles.divider} />

      {/* Linha 2: /km / /hora / média */}
      <View style={dashStyles.statsGrid}>
        <View style={dashStyles.gridCell}>
          <Ionicons name="map-outline" size={18} color={C.textMuted} />
          <Text style={dashStyles.gridValue}>{fmt(stats.perKm)}</Text>
          <Text style={dashStyles.gridLabel}>Por KM</Text>
        </View>
        <View style={[dashStyles.gridCell, dashStyles.gridCellBorder]}>
          <Ionicons name="hourglass-outline" size={18} color={C.textMuted} />
          <Text style={dashStyles.gridValue}>{fmt(stats.perHour)}</Text>
          <Text style={dashStyles.gridLabel}>Por hora</Text>
        </View>
        <View style={[dashStyles.gridCell, dashStyles.gridCellBorder]}>
          <Ionicons name="trending-up-outline" size={18} color={C.textMuted} />
          <Text style={dashStyles.gridValue}>{fmt(stats.avgPerTrip)}</Text>
          <Text style={dashStyles.gridLabel}>Média/corrida</Text>
        </View>
      </View>

      <View style={dashStyles.divider} />

      {/* Linha 3: custos */}
      <View style={dashStyles.statsGrid}>
        <View style={dashStyles.gridCell}>
          <Ionicons name="flame-outline" size={18} color="#FF6B35" />
          <Text style={dashStyles.gridLabel}>Combustível</Text>
          <Text style={[dashStyles.gridValue, { color: "#FF6B35" }]}>{fmt(stats.fuelCost)}</Text>
        </View>
        <View style={[dashStyles.gridCell, dashStyles.gridCellBorder]}>
          <Ionicons name="construct-outline" size={18} color="#9B59FF" />
          <Text style={dashStyles.gridLabel}>Manutenção</Text>
          <Text style={[dashStyles.gridValue, { color: "#9B59FF" }]}>{fmt(stats.extraCost)}</Text>
        </View>
        <View style={[dashStyles.gridCell, dashStyles.gridCellBorder]}>
          <Ionicons name="remove-circle-outline" size={18} color={C.textSecondary} />
          <Text style={dashStyles.gridLabel}>Total custos</Text>
          <Text style={dashStyles.gridValue}>{fmt(stats.totalCost)}</Text>
        </View>
      </View>
    </View>
  );
}

const dashStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  period: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  heroValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  heroSecondary: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  statsGrid: {
    flexDirection: "row",
  },
  gridCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  gridCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.border,
  },
  gridValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  gridLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  statLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
});

// ─── TripCard ────────────────────────────────────────────────────────────────

function TripCard({
  trip,
  netValue,
  onDelete,
  onEdit,
}: {
  trip: any;
  netValue: number;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const C = Colors.dark;

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        tripStyles.card,
        pressed && { opacity: 0.75 },
      ]}
    >
      {/* Icon */}
      <View style={tripStyles.iconBox}>
        <Ionicons name="car" size={22} color={Colors.accent} />
      </View>

      {/* Info */}
      <View style={tripStyles.info}>
        <Text style={tripStyles.date}>{formatTripDate(trip.createdAt)}</Text>
        <Text style={tripStyles.meta}>
          {fmtKm(trip.distanceKm)} • {fmtMin(trip.durationMinutes)}
        </Text>
      </View>

      {/* Values */}
      <View style={tripStyles.values}>
        <Text style={[tripStyles.net, { color: Colors.accent }]}>{fmt(netValue)}</Text>
        <Text style={tripStyles.gross}>{fmt(trip.grossValue)}</Text>
      </View>

      {/* Delete */}
      <Pressable
        onPress={onDelete}
        hitSlop={12}
        style={tripStyles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color={C.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const tripStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  date: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  values: {
    alignItems: "flex-end",
  },
  net: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  gross: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  deleteBtn: {
    paddingLeft: 4,
  },
});

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditTripModal({
  trip,
  visible,
  onClose,
  onSave,
}: {
  trip: any | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<any>) => void;
}) {
  const C = Colors.dark;

  const [gross,    setGross]    = useState("");
  const [dist,     setDist]     = useState("");
  const [dur,      setDur]      = useState("");
  const [rating,   setRating]   = useState("");

  // Preenche campos quando trip muda
  React.useEffect(() => {
    if (trip) {
      setGross(String(trip.grossValue).replace(".", ","));
      setDist(String(trip.distanceKm).replace(".", ","));
      setDur(String(trip.durationMinutes).replace(".", ","));
      setRating(trip.passengerRating > 0 ? String(trip.passengerRating).replace(".", ",") : "");
    }
  }, [trip]);

  const handleSave = () => {
    const g = parseFloat(gross.replace(",", "."));
    const d = parseFloat(dist.replace(",", "."));
    const m = parseFloat(dur.replace(",", "."));
    const r = parseFloat(rating.replace(",", ".")) || 0;

    if (!g || g <= 0) return Alert.alert("Erro", "Informe o valor bruto.");
    if (!d || d <= 0) return Alert.alert("Erro", "Informe a distância.");
    if (!m || m <= 0) return Alert.alert("Erro", "Informe a duração.");

    onSave(trip.id, { grossValue: g, distanceKm: d, durationMinutes: m, passengerRating: r });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={editStyles.overlay}
      >
        <Pressable style={editStyles.backdrop} onPress={onClose} />
        <View style={editStyles.sheet}>
          {/* Handle */}
          <View style={editStyles.handle} />

          <Text style={editStyles.title}>Editar corrida</Text>
          <Text style={editStyles.sub}>
            {trip ? formatTripDate(trip.createdAt) : ""}
          </Text>

          <View style={editStyles.fields}>
            <Field
              label="Valor bruto (R$)"
              value={gross}
              onChange={setGross}
              placeholder="Ex: 12,50"
              keyboardType="decimal-pad"
            />
            <Field
              label="Distância (km)"
              value={dist}
              onChange={setDist}
              placeholder="Ex: 5,2"
              keyboardType="decimal-pad"
            />
            <Field
              label="Duração (minutos)"
              value={dur}
              onChange={setDur}
              placeholder="Ex: 14"
              keyboardType="decimal-pad"
            />
            <Field
              label="Nota do passageiro"
              value={rating}
              onChange={setRating}
              placeholder="Ex: 4,9 (opcional)"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={editStyles.btnRow}>
            <Pressable style={editStyles.btnCancel} onPress={onClose}>
              <Text style={editStyles.btnCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={editStyles.btnSave} onPress={handleSave}>
              <Text style={editStyles.btnSaveText}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  const C = Colors.dark;
  return (
    <View style={editStyles.field}>
      <Text style={editStyles.fieldLabel}>{label}</Text>
      <TextInput
        style={editStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType ?? "default"}
        selectTextOnFocus
      />
    </View>
  );
}

const editStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: Colors.dark.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  fields: {
    gap: 14,
    marginBottom: 24,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  input: {
    backgroundColor: Colors.dark.bg,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.bg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  btnCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  btnSave: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center",
  },
  btnSaveText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
});

// ─── Custom Date Modal ────────────────────────────────────────────────────────

function CustomDateModal({
  visible,
  onClose,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (from: Date, to: Date) => void;
}) {
  const C = Colors.dark;
  const [from, setFrom] = useState("");
  const [to,   setTo]   = useState("");

  const handleApply = () => {
    const f = parseDMY(from);
    const t = parseDMY(to);
    if (!f) return Alert.alert("Data inválida", "Data inicial inválida. Use DD/MM/AAAA.");
    if (!t) return Alert.alert("Data inválida", "Data final inválida. Use DD/MM/AAAA.");
    if (f > t) return Alert.alert("Data inválida", "A data inicial deve ser antes da final.");
    // end of day
    t.setHours(23, 59, 59, 999);
    onApply(f, t);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={customDateStyles.card}>
          <Text style={customDateStyles.title}>Intervalo personalizado</Text>

          <Text style={customDateStyles.label}>De</Text>
          <TextInput
            style={customDateStyles.input}
            value={from}
            onChangeText={setFrom}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={customDateStyles.label}>Até</Text>
          <TextInput
            style={customDateStyles.input}
            value={to}
            onChangeText={setTo}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            maxLength={10}
          />

          <View style={customDateStyles.btnRow}>
            <Pressable style={customDateStyles.btnCancel} onPress={onClose}>
              <Text style={customDateStyles.btnCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={customDateStyles.btnApply} onPress={handleApply}>
              <Text style={customDateStyles.btnApplyText}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const customDateStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 20,
    padding: 24,
    width: "85%",
    zIndex: 10,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.dark.bg,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 14,
    fontFamily: "Inter_400Regular",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btnCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.dark.bg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  btnCancelText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  btnApply: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: "center",
  },
  btnApplyText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CorridasScreen() {
  const C            = Colors.dark;
  const insets       = useSafeAreaInsets();
  const router       = useRouter();
  const { trips, settings, deleteTrip, updateTrip } = useApp();

  const [filter,       setFilter]       = useState<FilterKey>("all");
  const [customFrom,   setCustomFrom]   = useState<Date | null>(null);
  const [customTo,     setCustomTo]     = useState<Date | null>(null);
  const [showCustom,   setShowCustom]   = useState(false);

  // Edit modal
  const [editTrip,     setEditTrip]     = useState<any | null>(null);
  const [showEdit,     setShowEdit]     = useState(false);

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  // ── filtered trips ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const sorted = [...trips].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filter === "all") return sorted;

    let from: Date, to: Date;
    const now = new Date();

    if (filter === "today") {
      from = startOf("day");
      to   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (filter === "week") {
      from = startOf("week");
      to   = new Date();
    } else if (filter === "month") {
      from = startOf("month");
      to   = new Date();
    } else if (filter === "custom" && customFrom && customTo) {
      from = customFrom;
      to   = customTo;
    } else {
      return sorted;
    }

    return sorted.filter((t) => {
      const d = new Date(t.createdAt);
      return d >= from && d <= to;
    });
  }, [trips, filter, customFrom, customTo]);

  // ── label for dashboard ────────────────────────────────────────────────────

  const dashLabel = useMemo(() => {
    if (filter === "all")    return "Todas as corridas";
    if (filter === "today")  return "Hoje";
    if (filter === "week")   return "Esta semana";
    if (filter === "month")  return "Este mês";
    if (filter === "custom" && customFrom && customTo) {
      const f = customFrom.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const t = customTo.toLocaleDateString("pt-BR",   { day: "2-digit", month: "short" });
      return `${f} – ${t}`;
    }
    return "Corridas";
  }, [filter, customFrom, customTo]);

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleFilterPress = (key: FilterKey) => {
    Haptics.selectionAsync();
    if (key === "custom") {
      setShowCustom(true);
    } else {
      setFilter(key);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Excluir corrida", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteTrip(id);
        },
      },
    ]);
  };

  const handleEdit = (trip: any) => {
    setEditTrip(trip);
    setShowEdit(true);
  };

  const handleSaveEdit = (id: string, data: Partial<any>) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateTrip(id, data);
  };

  const calcNet = (trip: any) => {
    const fuel  = (trip.distanceKm / settings.kmPerLiter) * settings.fuelPricePerLiter;
    const extra = trip.distanceKm * settings.costPerKmExtra;
    return trip.grossValue - fuel - extra;
  };

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
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Corridas</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/nova-corrida")}
          >
            <Ionicons name="add" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        {/* ── FILTROS ── scrollável, sem corte */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          style={styles.filtersScroll}
        >
          {FILTERS.map((f) => {
            const isActive = f.key === filter || (f.key === "custom" && filter === "custom");
            return (
              <Pressable
                key={f.key}
                style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                onPress={() => handleFilterPress(f.key)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── DASHBOARD ─────────────────────────────────── */}
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <Dashboard
            trips={filtered}
            settings={settings}
            label={dashLabel}
          />
        </View>

        {/* ── LISTA DE CORRIDAS ──────────────────────────── */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>Nenhuma corrida no período</Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => router.push("/nova-corrida")}
            >
              <Text style={styles.emptyBtnText}>Adicionar corrida</Text>
            </Pressable>
          </View>
        ) : (
          filtered.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              netValue={calcNet(trip)}
              onDelete={() => handleDelete(trip.id)}
              onEdit={() => handleEdit(trip)}
            />
          ))
        )}
      </ScrollView>

      {/* ── MODAL EDITAR ──────────────────────────────────── */}
      <EditTripModal
        trip={editTrip}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveEdit}
      />

      {/* ── MODAL INTERVALO ──────────────────────────────── */}
      <CustomDateModal
        visible={showCustom}
        onClose={() => setShowCustom(false)}
        onApply={(from, to) => {
          setCustomFrom(from);
          setCustomTo(to);
          setFilter("custom");
        }}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  // Filtros — sem corte nas bordas
  filtersScroll: {
    // sem paddingHorizontal aqui para não cortar
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    flexDirection: "row",
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  filterTextActive: {
    color: "#000",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.dark.textMuted,
    fontFamily: "Inter_400Regular",
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
});
