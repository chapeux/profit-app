import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { StatCard } from "@/components/StatCard";
import { TripCard } from "@/components/TripCard";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { trips, removeTrip } = useApp();
  const C = Colors.dark;

  const today = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    return trips.filter((t) => new Date(t.date).toDateString() === todayStr);
  }, [trips]);

  const stats = useMemo(() => {
    const allNet = trips.reduce((s, t) => s + t.netValue, 0);
    const allGross = trips.reduce((s, t) => s + t.grossValue, 0);
    const todayNet = today.reduce((s, t) => s + t.netValue, 0);
    const todayGross = today.reduce((s, t) => s + t.grossValue, 0);
    const totalKm = trips.reduce((s, t) => s + t.distanceKm, 0);
    const avgNet =
      trips.length > 0
        ? trips.reduce((s, t) => s + t.netValue, 0) / trips.length
        : 0;
    const fuelTotal = trips.reduce((s, t) => s + t.fuelCost, 0);
    return { allNet, allGross, todayNet, todayGross, totalKm, avgNet, fuelTotal };
  }, [trips, today]);

  const handleAddTrip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/nova-corrida");
  };

  const topInset =
    Platform.OS === "web"
      ? Math.max(insets.top, 67)
      : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topInset + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, motorista!</Text>
            <Text style={styles.subtitle}>Acompanhe seus ganhos</Text>
          </View>
          <Pressable
            onPress={handleAddTrip}
            style={styles.addBtn}
            testID="add-trip-btn"
            accessibilityLabel="Adicionar corrida"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={24} color={C.bg} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Lucro líquido hoje</Text>
          <Text style={[styles.heroValue, { color: stats.todayNet >= 0 ? Colors.accent : Colors.danger }]}>
            {formatCurrency(stats.todayNet)}
          </Text>
          <Text style={styles.heroSub}>
            Bruto: {formatCurrency(stats.todayGross)} · {today.length} corrida{today.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <View style={styles.grid}>
          <StatCard
            label="Total líquido"
            value={formatCurrency(stats.allNet)}
            icon="wallet-outline"
            color={Colors.accent}
          />
          <StatCard
            label="Total bruto"
            value={formatCurrency(stats.allGross)}
            icon="cash-outline"
            color="#4D9FFF"
          />
        </View>

        <View style={styles.grid}>
          <StatCard
            label="KM rodados"
            value={stats.totalKm.toFixed(0) + " km"}
            icon="speedometer-outline"
            color="#9B59FF"
          />
          <StatCard
            label="Média/corrida"
            value={formatCurrency(stats.avgNet)}
            icon="trending-up-outline"
            color={Colors.warning}
          />
        </View>

        <View style={styles.grid}>
          <StatCard
            label="Gasto combustível"
            value={formatCurrency(stats.fuelTotal)}
            icon="flame-outline"
            color={Colors.danger}
          />
          <StatCard
            label="Total de corridas"
            value={String(trips.length)}
            icon="car-outline"
            color="#4D9FFF"
          />
        </View>

        {today.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Corridas de hoje</Text>
            {today.map((t) => (
              <TripCard key={t.id} trip={t} onDelete={removeTrip} />
            ))}
          </>
        )}

        {trips.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>Nenhuma corrida registrada</Text>
            <Text style={styles.emptySub}>Toque no + para adicionar sua primeira corrida</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    color: Colors.dark.text,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  heroLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  heroSub: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
    marginBottom: 12,
  },
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
  },
});
