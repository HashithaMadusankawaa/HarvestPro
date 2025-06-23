import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createTable,
  getDatabasePath,
  getFirstProfile,
  insertProfile,
  Profile,
  updateProfile,
  Driver,
  insertDriver,
  getDrivers,
  Broker,
  insertBroker,
  getBrokers,
  deleteBroker,
  DriverDetail,
  insertDriverDetail,
  deleteDatabase,
} from "../../db";
import { darkTheme } from "@/theme";

// Color constants for a consistent theme
const ACCENT = "#000";
const DARK = "#ffffff";
const CARD = "#23252b";
const GRAY = "#a1a1aa";
const LIGHT_GRAY = "#bbbbbb";
const LIGHT_GRAY_TRANSPARENT = "rgba(161, 161, 170, 0.2)";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

const ProfileTab = () => {
  // State for Farm Profile settings
  const [farmName, setFarmName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [pricePerAcre, setPricePerAcre] = useState("");
  const [driverCommission, setDriverCommission] = useState("");
  const [brokerCommissionOrAmount, setBrokerCommissionOrAmount] = useState("");
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [ownerNIC, setOwnerNIC] = useState(""); // This state variable is declared but not used in the provided JSX

  // State for adding a new driver to the 'driver' table
  const [newDriverName, setNewDriverName] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // State for adding a new broker to the 'broker' table
  const [newBrokerName, setNewBrokerName] = useState("");
  const [brokers, setBrokers] = useState<Broker[]>([]);

  // State for new Driver Details table fields
  const [driverDetailName, setDriverDetailName] = useState("");
  const [driverDetailContact, setDriverDetailContact] = useState("");
  const [driverDetailAddress, setDriverDetailAddress] = useState("");
  const [driverDetailNotes, setDriverDetailNotes] = useState("");

  const [loading, setLoading] = useState(false);

  // Tutorial state and refs
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0); // 0: Farm, 1: Drivers, 2: Brokers
  const farmProfileRef = useRef<View>(null);
  const manageDriversRef = useRef<View>(null);
  const manageBrokersRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Define the content and target refs for each tutorial step
  const tutorialStepsContent = [
    {
      ref: farmProfileRef,
      text: "ආයතනයේ ප්‍රධාන තොරතුරු මෙතනින් ඇතුලත් කරන්න. නිවැරදි ගණනය කිරීම් සඳහා මෙය අත්‍යවශ්‍යයි!",
      header: "ආයතනයේ පැතිකඩ",
    },
    {
      ref: manageDriversRef,
      text: "ඔබගේ රියදුරන්ගේ තොරතුරු මෙතනින් එකතු කරන්න. ඔබට අවශ්‍ය විටකදී මෙම කොටසින් රියදුරන් කළමනාකරණය කළ හැක.",
      header: "රියදුරු කළමනාකරණය",
    },
    {
      ref: manageBrokersRef,
      text: "තැරැව්කරුවන් මෙතනින් එකතු කරන්න. ඔබට කැමති තැරැව්කරුවෙකු පෙරනිමි තැරැව්කරුවෙකු ලෙස තෝරාගත හැක.",
      header: "තැරැව්කරුවන් කළමනාකරණය",
    },
  ];

  // --- Data Loading and Initialization ---
  const loadDrivers = useCallback(async () => {
    try {
      const fetchedDrivers = await getDrivers();
      setDrivers(fetchedDrivers);
    } catch (error) {
      console.error("❌ Error loading drivers:", error);
      Alert.alert("Error", "Failed to load drivers.");
    }
  }, []);

  const loadBrokers = useCallback(async () => {
    try {
      const fetchedBrokers = await getBrokers();
      setBrokers(fetchedBrokers);
    } catch (error) {
      console.error("❌ Error loading brokers:", error);
      Alert.alert("Error", "Failed to load brokers.");
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await createTable(); // Ensure tables are created

        const profile = await getFirstProfile();
        let initialSelectedBrokerFromProfile: string | null = null;

        if (profile) {
          setFarmName(profile.farm_name || "");
          setMobile(profile.mobile || "");
          setAddress(profile.address || "");
          setPricePerAcre(profile.price_per_acre?.toString() || "");
          setDriverCommission(profile.driver_commission?.toString() || "");
          setBrokerCommissionOrAmount(
            profile.broker_commission_or_amount?.toString() || ""
          );
          initialSelectedBrokerFromProfile =
            profile.selected_broker_name || null;
        }

        await loadDrivers();
        const fetchedBrokers = await getBrokers();
        setBrokers(fetchedBrokers);

        // Determine initial selected broker
        let defaultBrokerSelection: string | null = null;
        if (
          initialSelectedBrokerFromProfile &&
          fetchedBrokers.some(
            (b) => b.first_name === initialSelectedBrokerFromProfile
          )
        ) {
          defaultBrokerSelection = initialSelectedBrokerFromProfile;
        } else if (fetchedBrokers.length > 0) {
          // Use the first valid broker name as default
          const firstValidBroker = fetchedBrokers.find((b) => b.first_name);
          defaultBrokerSelection = firstValidBroker
            ? firstValidBroker.first_name
            : null;
        }
        setSelectedBroker(defaultBrokerSelection);

        console.log("📂 Database path:", getDatabasePath());

        let shouldShowTutorial = false;
        let initialTutorialStep = 0;

        // Check Farm Profile first
        const isFarmProfileIncomplete = !profile ||
                                        profile.farm_name === null || profile.farm_name.trim() === '' ||
                                        profile.mobile === null || 
                                        profile.price_per_acre === null || isNaN(Number(profile.price_per_acre));

        if (isFarmProfileIncomplete) {
            shouldShowTutorial = true;
            initialTutorialStep = 0;
        } else {
            // If Farm Profile is complete, check Drivers
            if (drivers.length === 0) {
                shouldShowTutorial = true;
                initialTutorialStep = 1;
            } else {
                // If Drivers are present, check Brokers
                if (fetchedBrokers.length === 0) {
                    shouldShowTutorial = true;
                    initialTutorialStep = 2;
                }
            }
        }

        // Check if the user has explicitly completed or skipped the tutorial before
        const hasUserCompletedProfileTutorial = await AsyncStorage.getItem('hasUserCompletedProfileTutorial');

        if (shouldShowTutorial && !hasUserCompletedProfileTutorial) {
            setShowTutorial(true);
            setTutorialStep(initialTutorialStep);

            // Scroll to the relevant section
            setTimeout(() => { // Add a small delay to ensure layout is ready
                if (initialTutorialStep === 0 && farmProfileRef.current && scrollViewRef.current) {
                    farmProfileRef.current.measureLayout(
                        scrollViewRef.current as any,
                        (x, y, width, height) => {
                            scrollViewRef.current?.scrollTo({ y: y - 50, animated: true });
                        },
                        () => {}
                    );
                } else if (initialTutorialStep === 1 && manageDriversRef.current && scrollViewRef.current) {
                    manageDriversRef.current.measureLayout(
                        scrollViewRef.current as any,
                        (x, y, width, height) => {
                            scrollViewRef.current?.scrollTo({ y: y - 50, animated: true });
                        },
                        () => {}
                    );
                } else if (initialTutorialStep === 2 && manageBrokersRef.current && scrollViewRef.current) {
                    manageBrokersRef.current.measureLayout(
                        scrollViewRef.current as any,
                        (x, y, width, height) => {
                            scrollViewRef.current?.scrollTo({ y: y - 50, animated: true });
                        },
                        () => {}
                    );
                }
            }, 100); // Small delay, adjust if needed

        } else {
            setShowTutorial(false);
        }

      } catch (error) {
        console.error("❌ Error initializing data:", error);
        Alert.alert("Error", "Failed to initialize app data.");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [loadDrivers, loadBrokers]);

  // This useEffect ensures that if the list of brokers changes
  // and the previously selected broker is no longer in the list,
  // it defaults to null or the first available broker.
  useEffect(() => {
    if (
      selectedBroker !== null &&
      !brokers.some((b) => b.first_name === selectedBroker)
    ) {
      const firstValidBroker = brokers.find((b) => b.first_name);
      setSelectedBroker(firstValidBroker ? firstValidBroker.first_name : null);
    }
  }, [brokers, selectedBroker]);

  // --- Input Handlers ---
  const handleMobileChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setMobile(cleaned);
  };

  const handlePriceChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      setPricePerAcre(text);
    }
  };

  // --- Core Logic Functions ---
  const handleAddDriver = async () => {
    const trimmedName = newDriverName.trim();
    if (!trimmedName) {
      Alert.alert("Validation", "Please enter a driver name.");
      return;
    }
    if (
      drivers.some(
        (d) => d.first_name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      Alert.alert("Validation", "This driver name already exists.");
      return;
    }

    setLoading(true);
    try {
      await insertDriver({ first_name: trimmedName });
      setNewDriverName("");
      await loadDrivers();
      Alert.alert("Success", "Driver added successfully!");
    } catch (error: any) {
      if (error.message && error.message.includes("UNIQUE constraint failed")) {
        Alert.alert("Error", "A driver with this name already exists.");
      } else {
        console.error("❌ Error adding driver:", error);
        Alert.alert("Error", "Failed to add driver.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddBroker = async () => {
    const trimmedName = newBrokerName.trim();
    if (!trimmedName) {
      Alert.alert("Validation", "Please enter a broker name.");
      return;
    }
    if (
      brokers.some(
        (b) => b.first_name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      Alert.alert("Validation", "This broker name already exists.");
      return;
    }

    setLoading(true);
    try {
      await insertBroker({ first_name: trimmedName });
      setNewBrokerName("");
      await loadBrokers();

      if (selectedBroker === null || brokers.length === 0) {
        setSelectedBroker(trimmedName);
      }
      Alert.alert("Success", "Broker added successfully!");
    } catch (error: any) {
      if (error.message && error.message.includes("UNIQUE constraint failed")) {
        Alert.alert("Error", "A broker with this name already exists.");
      } else {
        console.error("❌ Error adding broker:", error);
        Alert.alert("Error", "Failed to add broker.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBroker = async (brokerId: number, brokerName: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete broker: ${brokerName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteBroker(brokerId);
              await loadBrokers();

              if (selectedBroker === brokerName) {
                const firstValidBroker = brokers.find((b) => b.first_name);
                setSelectedBroker(
                  firstValidBroker ? firstValidBroker.first_name : null
                );
              }
              Alert.alert("Success", `${brokerName} deleted successfully!`);
            } catch (error) {
              console.error("❌ Error deleting broker:", error);
              Alert.alert("Error", "Failed to delete broker.");
            } finally {
              setLoading(false);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const handleSaveProfile = async () => {
    const trimmedFarmName = farmName.trim();
    const trimmedMobile = mobile.trim();
    const trimmedAddress = address.trim();
    const trimmedPrice = pricePerAcre.trim();

    if (!trimmedFarmName || !trimmedMobile || !trimmedPrice) {
      Alert.alert(
        "Validation",
        "Please fill in all required profile fields (Farm Name, Mobile Number, Price per Acre)."
      );
      return;
    }
    if (isNaN(Number(trimmedPrice))) {
      Alert.alert(
        "Validation",
        "Please enter a valid number for Price per Acre."
      );
      return;
    }
    if (driverCommission && isNaN(Number(driverCommission))) {
      Alert.alert("Validation", "Driver Commission must be a number.");
      return;
    }
    if (brokerCommissionOrAmount && isNaN(Number(brokerCommissionOrAmount))) {
      Alert.alert("Validation", "Broker Commission must be a number.");
      return;
    }

    setLoading(true);
    try {
      const price = parseFloat(trimmedPrice);
      const driverComm = parseFloat(driverCommission) || 0;
      const brokerComm = parseFloat(brokerCommissionOrAmount) || 0;

      const profileData: Profile = {
        farm_name: trimmedFarmName,
        mobile: trimmedMobile,
        address: trimmedAddress,
        price_per_acre: price,
        driver_commission: driverComm,
        broker_commission_or_amount: brokerComm,
        selected_broker_name: selectedBroker,
      };

      const existingProfile = await getFirstProfile();
      if (existingProfile?.id) {
        await updateProfile(existingProfile.id, profileData);
      } else {
        await insertProfile(profileData);
      }
      Alert.alert("Success", "Farm profile saved successfully.");
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      Alert.alert("Error", "Failed to save farm profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDriverDetails = async () => {
    const trimmedName = driverDetailName.trim();
    const trimmedContact = driverDetailContact.trim();
    const trimmedAddress = driverDetailAddress.trim();
    const trimmedNotes = driverDetailNotes.trim();

    if (!trimmedName) {
      Alert.alert("Validation", "Please enter the driver's name for details.");
      return;
    }

    setLoading(true);
    try {
      const driverDetailData: DriverDetail = {
        driver_name: trimmedName,
        contact_number: trimmedContact,
        address: trimmedAddress,
        notes: trimmedNotes,
      };
      await insertDriverDetail(driverDetailData);
      Alert.alert("Success", "Driver details saved successfully.");
      setDriverDetailName("");
      setDriverDetailContact("");
      setDriverDetailAddress("");
      setDriverDetailNotes("");
    } catch (error) {
      console.error("❌ Error saving driver details:", error);
      Alert.alert("Error", "Failed to save driver details.");
    } finally {
      setLoading(false);
    }
  };

  // --- Tutorial Logic ---
  const handleNextTutorialStep = async () => {
    Keyboard.dismiss();
    let canProceed = true;
    let validationMessage = "";

    // Validate current step before proceeding
    if (tutorialStep === 0) { // Farm Profile section
      if (!farmName.trim() || !mobile.trim() || !pricePerAcre.trim()) {
        canProceed = false;
        validationMessage = "Please fill in all required fields in the 'Company Profile' section (Company Name, Mobile Number, Price per Acre) before proceeding.";
      } else if (isNaN(Number(pricePerAcre))) {
        canProceed = false;
        validationMessage = "Please enter a valid number for 'Price per Acre'.";
      }
    } else if (tutorialStep === 1) { // Manage Drivers section
      if (drivers.length === 0) {
        canProceed = false;
        validationMessage = "Please add at least one driver before proceeding to the next section.";
      }
    } else if (tutorialStep === 2) { // Manage Brokers section
      if (brokers.length === 0) {
        canProceed = false;
        validationMessage = "Please add at least one broker before proceeding to the next section.";
      }
    }

    if (!canProceed) {
      
      return; // Stop here, do not proceed to next step
    }

    // If validation passes, proceed to the next step
    const nextStep = tutorialStep + 1;

    if (nextStep < tutorialStepsContent.length) {
      setTutorialStep(nextStep);
      const targetRef = tutorialStepsContent[nextStep].ref;
      if (targetRef.current && scrollViewRef.current) {
        // Measure the position of the target element relative to the scroll view
        targetRef.current.measureLayout(
          scrollViewRef.current as any,
          (x, y, width, height) => {
            scrollViewRef.current?.scrollTo({ y: y - 50, animated: true }); // Scroll with a small offset
          },
          () => {
            console.warn("Failed to measure layout for tutorial step.");
          }
        );
      }
    } else {
      setShowTutorial(false); // End tutorial
      setTutorialStep(0); // Reset for next time
      // Mark tutorial as completed in AsyncStorage
      await AsyncStorage.setItem('hasUserCompletedProfileTutorial', 'true');
    }
  };

  const skipTutorial = async () => {
    setShowTutorial(false);
    setTutorialStep(0);
    // Mark tutorial as skipped in AsyncStorage
    await AsyncStorage.setItem('hasUserCompletedProfileTutorial', 'true');
  };

  const renderTutorialOverlay = () => {
    if (!showTutorial) return null;

    const currentStep = tutorialStepsContent[tutorialStep];

    return (
      <View style={styles.overlay}>
        <View style={styles.tooltipContainer}>
          <Text style={styles.tooltipHeader}>{currentStep.header}</Text>
          <Text style={styles.tooltipText}>{currentStep.text}</Text>
          <View style={styles.arrowDown} />
        </View>

        {/* This transparent view is for interacting with the highlighted section */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { top: screenHeight * 0.15, left: screenWidth * 0.1, right: screenWidth * 0.1 }, // Adjust to center tooltip
            {
              // Dynamic positioning of the highlight rectangle, if needed.
              // For a simple full-screen overlay, this is just a visual guide.
            },
          ]}
          pointerEvents="box-none" // Allows touches to pass through unless on the tooltip
        />

        <View style={styles.tutorialButtons}>
          <TouchableOpacity style={styles.skipButton} onPress={skipTutorial}>
            <Text style={styles.skipText}>Skip Tutorial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={handleNextTutorialStep}>
            <Text style={styles.nextButtonText}>
              {tutorialStep < tutorialStepsContent.length - 1 ? "Next" : "Got it!"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Single ScrollView wrapping entire form */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Farm Profile Section */}
          {/* Add ref to the outermost View of the section */}
          <View ref={farmProfileRef} collapsable={false}>
            <Text style={styles.sectionHeader}>ආයතනයේ පැතිකඩ සැකසීම්</Text>
            <View style={styles.card}>
              <Text style={styles.label}>ආයතනයේ නම </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter farm name"
                placeholderTextColor={CARD}
                value={farmName}
                onChangeText={setFarmName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
              <Text style={styles.label}>දුරකථන අංකය</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                placeholderTextColor={GRAY}
                value={mobile}
                onChangeText={handleMobileChange}
                keyboardType="phone-pad"
                maxLength={15}
              />
              <Text style={styles.label}>ආයතනයේ ලිපිනය </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Enter farm address"
                placeholderTextColor={GRAY}
                value={address}
                onChangeText={setAddress}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.label}>අක්කරයක් කපන මිල  (Rs.)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 100000"
                placeholderTextColor={GRAY}
                value={pricePerAcre}
                onChangeText={handlePriceChange}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.label}>රියදුරුට ලැබෙන කොමිස් ප්‍රතිශතය  (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10"
                placeholderTextColor={GRAY}
                value={driverCommission}
                onChangeText={setDriverCommission}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.label}>තැරැව්කරුට අක්කරයකට දෙන මුදල  (Rs. per Acre)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5000"
                placeholderTextColor={GRAY}
                value={brokerCommissionOrAmount}
                onChangeText={setBrokerCommissionOrAmount}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={DARK} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Profile Settings</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Manage Drivers Section */}
          <View ref={manageDriversRef} collapsable={false}>
            <Text style={styles.sectionHeader}>රියදුරු කළමනාකරණය</Text>
            <View style={styles.card}>
              <Text style={styles.label}>නව රියදුරෙකු එක් කරන්න</Text>
              <View style={styles.inputWithButtonContainer}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="රියදුරුගේ නම "
                  placeholderTextColor={GRAY}
                  value={newDriverName}
                  onChangeText={setNewDriverName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.secondaryButton, loading && styles.buttonDisabled]}
                  onPress={handleAddDriver}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={DARK} size="small" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
              {drivers.length > 0 && (
                <View style={styles.listContainer}>
                  <Text style={styles.listHeader}>දැනට සිටින රියදුරන්</Text>
                  <FlatList
                    data={drivers.filter((d) => d.first_name)}
                    keyExtractor={(item) =>
                      item.id?.toString() || item.first_name || `driver-${Math.random()}`
                    }
                    renderItem={({ item }) => (
                      <View style={styles.listItem}>
                        <Text style={styles.listItemText}>{item.first_name}</Text>
                      </View>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.separator} />

          {/* Manage Brokers Section */}
          <View ref={manageBrokersRef} collapsable={false}>
            <Text style={styles.sectionHeader}>තැරැව්කරුවන් කළමනාකරණය</Text>
            <View style={styles.card}>
              <Text style={styles.label}>නව තැරැව්කරුවෙකු එක් කරන්න</Text>
              <View style={styles.inputWithButtonContainer}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="තැරැව්කරුගේ නම"
                  placeholderTextColor={GRAY}
                  value={newBrokerName}
                  onChangeText={setNewBrokerName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.secondaryButton, loading && styles.buttonDisabled]}
                  onPress={handleAddBroker}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={DARK} size="small" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>

              {brokers.length > 0 && (
                <View style={styles.listContainer}>
                  <Text style={styles.listHeader}>දැනට සිටින තැරැව්කරුවන්:</Text>
                  <FlatList
                    data={brokers.filter((b) => b.first_name)}
                    keyExtractor={(item) =>
                      item.id?.toString() || item.first_name || `broker-${Math.random()}`
                    }
                    renderItem={({ item }) => (
                      <View style={styles.listItem}>
                        <Text style={styles.listItemText}>{item.first_name}</Text>
                        <TouchableOpacity
                          onPress={() => item.id && handleDeleteBroker(item.id, item.first_name)}
                          style={styles.deleteButton}
                          disabled={loading}
                        >
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
                  />
                </View>
              )}

              {brokers.length > 0 && (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>සුපුරුදු තැරැව්කරු :</Text>
                  <Picker
                    selectedValue={selectedBroker}
                    style={styles.picker}
                    dropdownIconColor={ACCENT}
                    onValueChange={(itemValue: string | null) => setSelectedBroker(itemValue)}
                  >
                    <Picker.Item label="Select Broker (Optional)" value={null} color={CARD} />
                    {brokers.map(
                      (broker) =>
                        broker.first_name ? (
                          <Picker.Item
                            key={broker.id?.toString() || broker.first_name}
                            label={broker.first_name}
                            value={broker.first_name}
                            color={CARD}
                          />
                        ) : null
                    )}
                  </Picker>
                </View>
              )}
            </View>
          </View>

          <View style={styles.separator} />

          {/* Add Driver Details Section */}
          <Text style={styles.sectionHeader}>රියදුරුගේ අමතර විස්තර එකතු කරන්න</Text>
          <View style={styles.card}>
            <Text style={styles.label}>රියදුරුගේ නම (for details)</Text>
            <TextInput
              style={styles.input}
              placeholder="Name of driver for these details"
              placeholderTextColor={GRAY}
              value={driverDetailName}
              onChangeText={setDriverDetailName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
            <Text style={styles.label}>දුරකථන අංකය </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter contact number"
              placeholderTextColor={GRAY}
              value={driverDetailContact}
              onChangeText={setDriverDetailContact}
              keyboardType="phone-pad"
              maxLength={15}
            />
            <Text style={styles.label}>ලිපිනය</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Enter driver's address"
              placeholderTextColor={GRAY}
              value={driverDetailAddress}
              onChangeText={setDriverDetailAddress}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.label}>අමතර සටහන්</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Any additional notes about the driver"
              placeholderTextColor={GRAY}
              value={driverDetailNotes}
              onChangeText={setDriverDetailNotes}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSaveDriverDetails}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={DARK} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Driver Details</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {renderTutorialOverlay()}
    </KeyboardAvoidingView>
  );
};

export default ProfileTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "bold",
    color: ACCENT,
    marginBottom: 20,
    marginTop: 10,
    textAlign: "center",
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  label: {
    color: LIGHT_GRAY,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "500",
  },
  input: {
    backgroundColor: CARD,
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: GRAY,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  inputWithButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  flexInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  primaryButton: {
    backgroundColor: DARK,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 15,
  },
  primaryButtonText: {
    fontWeight: "bold",
    fontSize: 18,
    color: CARD,
  },
  secondaryButton: {
    backgroundColor: ACCENT, // Changed to ACCENT for better visibility
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: DARK,
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  separator: {
    height: 1,
    backgroundColor: GRAY,
    marginVertical: 30,
    width: "80%",
    alignSelf: "center",
    opacity: 0.2,
  },
  listContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  listHeader: {
    color: DARK,
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 10,
  },
  listItem: {
    backgroundColor: CARD,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemText: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  listItemSeparator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 5,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GRAY,
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 20,
  },
  pickerLabel: {
    paddingLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: GRAY,
  },
  picker: {
    flex: 1,
    height: 60,
    color: "#fff",
    backgroundColor: CARD,
  },
  deleteButton: {
    paddingLeft: 10,
  },

  // Tutorial Overlay Styles
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Darker, more opaque overlay
    justifyContent: 'space-between', // Distribute content top and bottom
    alignItems: 'center',
    zIndex: 1000,
    paddingVertical: 50, // Padding from top and bottom edges
    paddingHorizontal: 20,
  },
  tooltipContainer: {
    backgroundColor: ACCENT,
    borderRadius: 15, // Softer rounded corners
    padding: 20,
    marginHorizontal: 10, // Ensure it doesn't touch screen edges
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    alignItems: 'center',
    width: '90%', // Control width
    top: screenHeight * 0.1, // Position from top, adjusted to clear status bar/notch
  },
  tooltipHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 10,
    textAlign: 'center',
  },
  tooltipText: {
    fontSize: 16,
    color: DARK,
    textAlign: 'center',
    lineHeight: 24,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: ACCENT,
    borderLeftWidth: 20, // Larger arrow base
    borderRightWidth: 20,
    borderTopWidth: 20, // Larger arrow height
    position: 'absolute',
    bottom: -20, // Positioned to point downwards from the tooltip
    alignSelf: 'center',
  },
  tutorialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 0, // Adjust for iOS bottom safe area
  },
  nextButton: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  nextButtonText: {
    color: CARD,
    fontWeight: 'bold',
    fontSize: 17,
  },
  skipButton: {
    backgroundColor: CARD,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  skipText: {
    color: ACCENT,
    fontWeight: 'bold',
    fontSize: 17,
  },
});