import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import {
  createTable,
  insertMeasurement,
  getCurrentPricePerAcre,
  getDrivers,
  Driver,
  getBrokers,
  Broker,
} from "../db";

import WebView, { WebViewMessageEvent } from "react-native-webview";

const ACCENT = "#000";
const DARK = "#ffffff";
const CARD = "#23252b";
const GRAY = "#a1a1aa";

// WebView Message Format
type MeasurementData =
  | { type: "MEASUREMENT_UPDATE"; area: string; perimeter: string }
  | { type: "MEASUREMENT_COMPLETE" };

export default function LandMeasurementScreen() {
  const [area, setArea] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerMobile, setOwnerMobile] = useState("");
  const [ownerNIC, setOwnerNIC] = useState("");
  const [pricePerAcre, setPricePerAcre] = useState(0);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    createTable();
    loadData();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showResults ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [showResults]);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await getCurrentPricePerAcre();
        setPricePerAcre(price || 0);
      } catch (error) {
        setErrorMessage("Failed to load price data.");
      }
    };
    fetchPrice();
  }, []);

  const loadData = async () => {
    try {
      const fetchedDrivers = await getDrivers();
      setDrivers(fetchedDrivers);
      setSelectedDriver(fetchedDrivers[0]?.first_name || "");
      const fetchedBrokers = await getBrokers();
      setBrokers(fetchedBrokers);
      setSelectedBroker(fetchedBrokers[0]?.first_name || null);
    } catch (error) {
      setErrorMessage("Failed to load driver/broker data.");
    }
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data: MeasurementData = JSON.parse(event.nativeEvent.data);
      console.log("WebView message received:", event.nativeEvent.data);

  
      if (data.type === "MEASUREMENT_UPDATE") {
        const parsedArea = parseFloat(data.area);
        if (!isNaN(parsedArea)) {
          setArea(parsedArea); // ✅ Sets area value
        }
      }
  
      if (data.type === "MEASUREMENT_COMPLETE") {
        setShowResults(true); // ✅ Opens result panel
      }
    } catch (error) {
      console.error("Error parsing message from WebView:", error);
    }
  };
  
  const saveMeasurement = async () => {
    if (area <= 0.009)
      return setErrorMessage("Invalid measurement. Area is zero.");
    if (!ownerName.trim() || !ownerMobile.trim())
      return setErrorMessage("Land Owner Name and Mobile Number are required.");
    if (!/^(\+94|0)?7\d{8}$/.test(ownerMobile.trim()))
      return setErrorMessage("Please enter a valid Sri Lankan mobile number.");

    try {
      const createdAt = new Date().toISOString();
      const total = Math.round(area * pricePerAcre);
      await insertMeasurement(
        area,
        pricePerAcre,
        total,
        ownerName.trim(),
        ownerMobile.trim(),
        ownerNIC.trim(),
        selectedDriver,
        selectedBroker || "",
        createdAt
      );
      setOwnerName("");
      setOwnerMobile("");
      setOwnerNIC("");
      setArea(0);
      setShowResults(false);
      Alert.alert("Success", "Measurement saved successfully!", [
        { text: "OK", onPress: () => router.push("/HomeScreen") },
      ]);
    } catch (e) {
      setErrorMessage("Failed to save measurement. Please check logs.");
    }
  };

  const panelHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 598],
  });

  const total = area * pricePerAcre;

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <WebView
          source={{
            uri: "https://hashithamadusankawaa.github.io/newMap/",
          }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          style={{ flex: 1 }}
        />
      </View>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <Animated.View style={[styles.resultsPanel, { maxHeight: panelHeight }]}>
        <View style={styles.cornerTab} />
        <Text style={styles.resultsTitle}>Measurement Results</Text>
        <Text style={styles.resultText}>
          ACR: {isNaN(area) ? "0.00" : area.toFixed(2)}
        </Text>
        <Text style={styles.resultText}>
          Price/Acre: Rs. {pricePerAcre.toLocaleString()}
        </Text>
        <Text style={styles.resultText}>
          Total: Rs. {isNaN(total) ? "0" : total.toLocaleString()}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Land Owner Name"
          placeholderTextColor="#999"
          value={ownerName}
          onChangeText={setOwnerName}
        />
        <TextInput
          style={styles.input}
          placeholder="Mobile Number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={ownerMobile}
          onChangeText={setOwnerMobile}
        />
        <TextInput
          style={styles.input}
          placeholder="NIC"
          placeholderTextColor="#999"
          value={ownerNIC}
          onChangeText={setOwnerNIC}
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDriver}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedDriver(itemValue)}
          >
            {drivers.length > 0 ? (
              drivers.map((driver) => (
                <Picker.Item
                  key={driver.id}
                  label={driver.first_name}
                  value={driver.first_name}
                />
              ))
            ) : (
              <Picker.Item label="No Drivers Available" value="" />
            )}
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedBroker}
            style={styles.picker}
            onValueChange={(itemValue: string | null) =>
              setSelectedBroker(itemValue)
            }
          >
            <Picker.Item label="Select Broker" value={null} color="#999" />
            {brokers.length > 0 ? (
              brokers.map((broker) => (
                <Picker.Item
                  key={broker.id}
                  label={broker.first_name}
                  value={broker.first_name}
                />
              ))
            ) : (
              <Picker.Item label="No Brokers Available" value="" color="#999" />
            )}
          </Picker>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveMeasurement}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  errorContainer: {
    padding: 12,
    backgroundColor: "#ff3333cc",
    margin: 10,
    borderRadius: 10,
  },
  errorText: { color: "#fff", fontWeight: "bold" },
  resultsPanel: {
    backgroundColor: CARD,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 30,
    overflow: "hidden",
  },
  cornerTab: {
    width: 55,
    height: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 10,
  },
  resultsTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 10,
    color: ACCENT,
  },
  resultText: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 4,
    color: ACCENT,
  },
  input: {
    backgroundColor: DARK,
    borderColor: ACCENT,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    color: ACCENT,
  },
  pickerContainer: {
    backgroundColor: DARK,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    marginVertical: 8,
  },
  picker: { color: ACCENT, height: 50, width: "100%" },
  saveButton: {
    backgroundColor: ACCENT,
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: { fontWeight: "bold", fontSize: 20, color: DARK },
});
