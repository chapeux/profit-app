import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Trip } from "@/contexts/AppContext";
import Colors from "@/constants/colors";

const useNative = Platform.OS !== "web";

interface Props {
  trip: Trip;
  onDelete: (id: string) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TripCard({ trip, onDelete }: Props) {
  const C = Colors.dark;
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: useNative }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: useNative }).start();
  };

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(trip.id);
  };

  const isPositive = trip.netValue > 0;
  const netColor = isPositive ? Colors.accent : Colors.danger;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="car" size={18} color={Colors.accent} />
          </View>
          <View style={styles.info}>
            <Text style={styles.date}>{formatDate(trip.date)}</Text>
            <View style={styles.stats}>
              <Text style={styles.stat}>
                {trip.distanceKm.toFixed(1)} km
              </Text>
              <View style={styles.dot} />
              <Text style={styles.stat}>
                {trip.durationMinutes} min
              </Text>
              {trip.passengerRating > 0 && (
                <>
                  <View style={styles.dot} />
                  <Ionicons name="star" size={11} color={Colors.warning} />
                  <Text style={[styles.stat, { marginLeft: 2 }]}>
                    {trip.passengerRating.toFixed(1)}
                  </Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.values}>
            <Text style={[styles.net, { color: netColor }]}>
              {formatCurrency(trip.netValue)}
            </Text>
            <Text style={styles.gross}>{formatCurrency(trip.grossValue)}</Text>
          </View>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
        {trip.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {trip.notes}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dark.accentMuted ?? "rgba(0,217,111,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  date: {
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 3,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stat: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.dark.textMuted,
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
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 4,
  },
  notes: {
    marginTop: 8,
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingLeft: 46,
  },
});
