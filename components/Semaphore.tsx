import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";

interface Props {
  signal: "green" | "yellow" | "red" | null;
  size?: number;
}

export function Semaphore({ signal, size = 26 }: Props) {
  const greenAnim = useRef(new Animated.Value(signal === "green" ? 1 : 0.12)).current;
  const yellowAnim = useRef(new Animated.Value(signal === "yellow" ? 1 : 0.12)).current;
  const redAnim = useRef(new Animated.Value(signal === "red" ? 1 : 0.12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(greenAnim, {
        toValue: signal === "green" ? 1 : 0.12,
        useNativeDriver: false,
      }),
      Animated.spring(yellowAnim, {
        toValue: signal === "yellow" ? 1 : 0.12,
        useNativeDriver: false,
      }),
      Animated.spring(redAnim, {
        toValue: signal === "red" ? 1 : 0.12,
        useNativeDriver: false,
      }),
    ]).start();
  }, [signal]);

  return (
    <View style={[styles.housing, { width: size + 12, paddingVertical: 8 }]}>
      <Animated.View
        style={[
          styles.light,
          { width: size, height: size, borderRadius: size / 2 },
          { backgroundColor: "#FF4B4B", opacity: redAnim },
        ]}
      />
      <Animated.View
        style={[
          styles.light,
          { width: size, height: size, borderRadius: size / 2 },
          { backgroundColor: "#FFB800", opacity: yellowAnim },
        ]}
      />
      <Animated.View
        style={[
          styles.light,
          { width: size, height: size, borderRadius: size / 2 },
          { backgroundColor: "#00D96F", opacity: greenAnim },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  housing: {
    backgroundColor: "#111",
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "#2A2A2A",
  },
  light: {
    shadowColor: "#fff",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
