import React, { useEffect, useState, createContext } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAcr, getTotal } from "../../db";
import { lightTheme, darkTheme } from "../../theme";
import { supabase } from "../../supabase";
import { useFocusEffect } from "@react-navigation/native";

const ACCENT = "#000";
const DARK = "#ffffff";
const CARD = "#23252b";
const GRAY = "#a1a1aa";
const LIGHT_GRAY_TRANSPARENT = "rgba(161, 161, 170, 0.2)";

const testHistory = [
  { id: "1", name: "ගොයම් කැපූ සියලු කුඹුරු වල විස්තර", date: "🗂️ Field Summary" },
  { id: "2", name: "රියදුරාට ගෙවිය යුතු ප්‍රමාණය ", date: "🚚 Driver Payout" },
  { id: "3", name: "තැරැව්කරුට ගෙවිය යුතු ප්‍රමාණය ", date: "🤝 Broker Commission" },
  { id: "4", name: "සියලුම කුඹුරු වල ගෙවීම් පිළිබඳ විස්තර  ", date: "💰 Payment Log" },
];

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

export default function HomeScreen() {
  const ThemeContext = createContext({ theme: darkTheme, toggleTheme: () => {} });
  const [showTutorial, setShowTutorial] = useState(false);
  const [totalAcr, setTotalAcr] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState<boolean | null>(null);

  const checkLicense = async () => {
    try {
      const deviceId = Device.osInternalBuildId || Device.modelId || "unknown-device";
  
      const stored = await AsyncStorage.getItem("license_valid");
      if (stored === "true") {
        setValid(true);
        setLoading(false);
        return;
      }
  
      const { data, error } = await supabase
        .from("licenses")
        .select("*")
        .eq("device_id", deviceId)
        .single();
  
      if (error && error.code === "PGRST116") {
        // 🔺 No license found, insert a new inactive license
        const { error: insertError } = await supabase.from("licenses").insert([
          {
            device_id: deviceId,
            license_key: "TRIAL-" + Math.floor(Math.random() * 1000000),
            is_active: false, // deactivate by default
          },
        ]);
  
        if (insertError) console.error("Insert error:", insertError);
  
        setValid(false);
      } else if (data && data.is_active) {
        await AsyncStorage.setItem("license_valid", "true");
        setValid(true);
      } else {
        setValid(false);
      }
    } catch (err) {
      console.error("License check failed:", err);
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  
  

  useEffect(() => {
    checkLicense();
  }, []);

  useEffect(() => {
    if (valid) {
      const checkFirstLaunch = async () => {
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        if (!hasLaunched) {
          setShowTutorial(true);
          await AsyncStorage.setItem("hasLaunched", "true");
        }
      };
      checkFirstLaunch();

      const fetchStats = async () => {
        const acr = await getAcr();
        const total = await getTotal();
        setTotalAcr(acr);
        setTotalAmount(total);
      };
      fetchStats();
      
    }
  }, [valid]);



  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  if (!valid) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red", fontSize: 20, textAlign: "center" }}>
          ❌ License Invalid. Please contact support.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>සාරාංශය</Text>
      <Text style={styles.subtitle}>දැනට කපා ඇති අක්කර ගණන සහ එකතු කිරීමට ඇති මුළු මුදල් ප්‍රමාණය</Text>
      <View style={styles.statsRow}>
        <View style={styles.statsBox}>
          <Ionicons name="timer-outline" size={24} color={DARK} style={styles.icon} />
          <Text style={styles.statsNumber}>{totalAcr.toFixed(2)}</Text>
          <Text style={styles.statsLabel}>සම්පූර්ණ අක්කර ප්‍රමාණය </Text>
        </View>
        <View style={styles.statsBoxAccent}>
          <MaterialCommunityIcons
            name="currency-rupee"
            size={24}
            color={DARK}
            style={styles.icon}
          />
          <Text style={styles.statsPercent}>{totalAmount.toFixed(2)}</Text>
          <Text style={styles.statsLabelAccent}>උපායා ගත් මුළු මුදල </Text>
        </View>
      </View>

      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Reports</Text>
      </View>

      <FlatList
        data={testHistory}
        keyExtractor={(item) => item.id}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingBottom: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.historyItem}
            onPress={() => {
              if (item.id === "1") router.push("/Detailsofallthefields");
              else if (item.id === "2") router.push("/Amountdriver");
              else if (item.id === "3") router.push("/AmountBroker");
              else if (item.id === "4") router.push("/PaymentHistoryScreen");
            }}
          >
            <View>
              <Text style={styles.historyName}>{item.name}</Text>
              <Text style={styles.historyDate}>{item.date}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={GRAY} />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.newTestButton}
        onPress={() => router.push("/land-measurement")}
      >
        <Text style={styles.newTestButtonText}>කුඹුර මැනීම ආරම්භ කරන්න.</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
  © 2025 WAKTA GoyamKapana App. All rights reserved.
</Text>

      {showTutorial && (
        <View style={styles.overlay}>
          <View style={styles.tooltipContainer}>
            <Text style={styles.tooltipText}>
              Press this button to access your profile settings and manage drivers/brokers!
            </Text>
            <View style={styles.arrow} />
          </View>
          <View style={styles.profileHighlight} />
          <TouchableOpacity style={styles.skipButton} onPress={() => setShowTutorial(false)}>
            <Text style={styles.skipText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
    marginTop: 10,
  },
  
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    color: GRAY,
    fontSize: 14,
    marginTop: 3,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    columnGap:10
    
  },
  statsBox: {
    backgroundColor: CARD,
    borderRadius: 15,
    padding: 18,
    width: CARD_WIDTH,
    alignItems: "flex-start",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsBoxAccent: {
    backgroundColor: ACCENT,
    borderRadius: 15,
    padding: 18,
    width: CARD_WIDTH,
    alignItems: "flex-start",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginBottom: 12,
  },
  statsNumber: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statsLabel: {
    color: GRAY,
    fontSize: 13,
    marginTop: 2,
  },
  statsPercent: {
    color: DARK,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statsLabelAccent: {
    color: DARK,
    fontSize: 13,
    marginTop: 2,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GRAY_TRANSPARENT,
    paddingBottom: 10,
  },
  historyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  historyItem: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2.22,
    elevation: 3,
  },
  historyName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  historyDate: {
    color: GRAY,
    fontSize: 12,
    marginTop: 2,
  },
  newTestButton: {
    backgroundColor: ACCENT,
    borderRadius: 15,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  newTestButtonText: {
    color: DARK,
    fontSize: 18,
    fontWeight: "bold",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 999,
    paddingBottom: 90,
  },
  tooltipContainer: {
    backgroundColor: ACCENT,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: "center",
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  tooltipText: {
    fontSize: 17,
    fontWeight: "600",
    color: DARK,
    textAlign: "center",
    lineHeight: 24,
  },
  arrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: ACCENT,
    position: "absolute",
    bottom: -18,
    alignSelf: "center",
  },
  profileHighlight: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    position: "absolute",
    bottom: 10,
    right: 25,
    borderColor: ACCENT,
    borderWidth: 3,
    zIndex: 998,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButton: {
    backgroundColor: CARD,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  skipText: {
    color: ACCENT,
    fontWeight: "bold",
    fontSize: 16,
  },
});
