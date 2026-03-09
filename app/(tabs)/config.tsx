import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

interface SettingFieldProps {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  suffix?: string;
  prefix?: string;
  iconColor?: string;
}

function SettingField({
  label,
  description,
  icon,
  value,
  onChange,
  onBlur,
  suffix,
  prefix,
  iconColor,
}: SettingFieldProps) {
  const C = Colors.dark;
  const c = iconColor ?? Colors.accent;
  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldTop}>
        <View style={[styles.fieldIcon, { backgroundColor: c + "22" }]}>
          <Ionicons name={icon} size={18} color={c} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldDesc}>{description}</Text>
        </View>
      </View>
      <View style={styles.fieldInputRow}>
        {prefix ? <Text style={styles.inputAffix}>{prefix}</Text> : null}
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          keyboardType="decimal-pad"
          placeholderTextColor={C.textMuted}
          placeholder="0"
          selectTextOnFocus
        />
        {suffix ? <Text style={styles.inputAffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export default function ConfigScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();
  const C = Colors.dark;

  const [kmPerLiter, setKmPerLiter] = useState(String(settings.kmPerLiter));
  const [fuelPrice, setFuelPrice] = useState(String(settings.fuelPricePerLiter));
  const [costPerKm, setCostPerKm] = useState(String(settings.costPerKmExtra));
  const [minGoodValuePerKm, setMinGoodValuePerKm] = useState(
    String(settings.minGoodValuePerKm)
  );
  const [minGoodValuePerMin, setMinGoodValuePerMin] = useState(
    String(settings.minGoodValuePerMinute)
  );
  const [minGoodValuePerHour, setMinGoodValuePerHour] = useState(
    String(settings.minGoodValuePerHour)
  );

  useEffect(() => {
    setKmPerLiter(String(settings.kmPerLiter));
    setFuelPrice(String(settings.fuelPricePerLiter));
    setCostPerKm(String(settings.costPerKmExtra));
    setMinGoodValuePerKm(String(settings.minGoodValuePerKm));
    setMinGoodValuePerMin(String(settings.minGoodValuePerMinute));
    setMinGoodValuePerHour(String(settings.minGoodValuePerHour));
  }, [settings]);

  const save = (key: string, raw: string) => {
    const v = parseFloat(raw.replace(",", "."));
    if (!isNaN(v) && v > 0) {
      updateSettings({ [key]: v });
    }
  };

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const costPerKmTotal =
    settings.fuelPricePerLiter / settings.kmPerLiter + settings.costPerKmExtra;

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Configurações</Text>

        <Text style={styles.sectionTitle}>Veículo e combustível</Text>

        <SettingField
          label="KM por litro"
          description="Consumo médio do seu carro"
          icon="speedometer-outline"
          value={kmPerLiter}
          onChange={setKmPerLiter}
          suffix="km/l"
          onBlur={() => save("kmPerLiter", kmPerLiter)}
        />
        <SettingField
          label="Preço do litro"
          description="Valor atual do combustível"
          icon="flame-outline"
          value={fuelPrice}
          onChange={setFuelPrice}
          prefix="R$"
          iconColor="#FF6B35"
          onBlur={() => save("fuelPricePerLiter", fuelPrice)}
        />
        <SettingField
          label="Custo extra por KM"
          description="Manutenção, pneus, óleo, etc."
          icon="construct-outline"
          value={costPerKm}
          onChange={setCostPerKm}
          prefix="R$"
          suffix="/km"
          iconColor="#9B59FF"
          onBlur={() => save("costPerKmExtra", costPerKm)}
        />

        <View style={styles.infoCard}>
          <Ionicons name="calculator-outline" size={18} color={Colors.accent} />
          <Text style={styles.infoText}>
            Custo total por KM:{" "}
            <Text style={{ color: Colors.accent, fontFamily: "Inter_700Bold" }}>
              R$ {costPerKmTotal.toFixed(3)}/km
            </Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Thresholds do semáforo</Text>
        <Text style={styles.sectionDesc}>
          Valores mínimos para uma corrida ser considerada boa (verde)
        </Text>

        <SettingField
          label="Valor mínimo por KM"
          description="Limiar para corrida boa"
          icon="map-outline"
          value={minGoodValuePerKm}
          onChange={setMinGoodValuePerKm}
          prefix="R$"
          suffix="/km"
          iconColor={Colors.accent}
          onBlur={() => save("minGoodValuePerKm", minGoodValuePerKm)}
        />
        <SettingField
          label="Valor mínimo por minuto"
          description="Limiar para corrida boa"
          icon="time-outline"
          value={minGoodValuePerMin}
          onChange={setMinGoodValuePerMin}
          prefix="R$"
          suffix="/min"
          iconColor={Colors.warning}
          onBlur={() => save("minGoodValuePerMinute", minGoodValuePerMin)}
        />
        <SettingField
          label="Valor mínimo por hora"
          description="Quanto deseja ganhar por hora"
          icon="hourglass-outline"
          value={minGoodValuePerHour}
          onChange={setMinGoodValuePerHour}
          prefix="R$"
          suffix="/h"
          iconColor="#4D9FFF"
          onBlur={() => save("minGoodValuePerHour", minGoodValuePerHour)}
        />

        <View style={[styles.infoCard, { marginTop: 4 }]}>
          <Ionicons name="information-circle-outline" size={18} color="#4D9FFF" />
          <Text style={styles.infoText}>
            Os valores são salvos automaticamente ao sair do campo
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  title: {
    color: Colors.dark.text,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    marginTop: 8,
  },
  sectionDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  fieldCard: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  fieldTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  fieldDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  fieldInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  fieldInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  inputAffix: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoText: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
