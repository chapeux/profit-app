import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, color, sub }: Props) {
  const C = Colors.dark;
  const c = color ?? Colors.accent;

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: c + "22" }]}>
        <Ionicons name={icon} size={18} color={c} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minWidth: 0,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: {
    color: Colors.dark.text,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  sub: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
