import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  deleteMeasurement,
  ensurePaidAmountColumn,
  getMeasurements,
  insertPayment,
  updateMeasurement,
  updateMeasurementPayment,
} from "../../db";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import Modal from "react-native-modal";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";

const ACCENT = "#000";
const DARK = "#ffffff";
const CARD = "#23252b";
const GRAY = "#a1a1aa";

const SavedMeasurementsScreen = () => {
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [filteredMeasurements, setFilteredMeasurements] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  // Editable fields
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editACR, setEditACR] = useState("");
  const [editPricePerAcre, setEditPricePerAcre] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editDate, setEditDate] = useState("");

  // Add state for payment modal and payment input
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentItem, setPaymentItem] = useState<any>(null);

  const loadData = async () => {
    try {
      const data = await getMeasurements();
      setMeasurements(data);
      setFilteredMeasurements(data);
    } catch (err) {
      Alert.alert("Error", "Could not load measurements.");
      console.error(err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    ensurePaidAmountColumn().then(() => {
      loadData(); 
    });
  }, []);
  
  
  

  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();

    const filtered = measurements.filter(
      (item) =>
        item.owner_name.toLowerCase().includes(lowerQuery) ||
        (item.mobile && item.mobile.toLowerCase().includes(lowerQuery)) ||
        (item.nic && item.nic.toLowerCase().includes(lowerQuery))
    );

    setFilteredMeasurements(filtered);
  }, [searchQuery, measurements]);

  const openModal = (item: any) => {
    setSelectedItem(item);
    setEditOwnerName(item.owner_name);
    setEditACR(item.acr.toString());
    setEditPricePerAcre(item.price_per_acre.toString());
    setEditTotal(item.total.toString());
    setEditDate(item.created_at);
    setIsEditing(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!editOwnerName.trim()) {
      Alert.alert("Validation", "Owner name cannot be empty.");
      return;
    }

    const acr = parseFloat(editACR) || 0;
    const pricePerAcre = parseFloat(editPricePerAcre) || 0;
    const total = parseFloat(editTotal) || 0;

    try {
      await updateMeasurement(
        selectedItem.id,
        acr,
        pricePerAcre,
        total,
        editOwnerName,
        selectedItem.mobile || "",
        selectedItem.nic || "",
        selectedItem.driver_name || "",
        selectedItem.broker_name || ""
      );

      const updatedItem = {
        ...selectedItem,
        acr,
        price_per_acre: pricePerAcre,
        total,
        owner_name: editOwnerName,
        updated_at: new Date().toISOString(),
      };

      const updatedMeasurements = measurements.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      );

      setMeasurements(updatedMeasurements);
      setSelectedItem(updatedItem);
      setIsEditing(false);
      setModalVisible(false);
    } catch (err) {
      Alert.alert("Error", "Failed to update the measurement.");
      console.error("Update error:", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMeasurement(id);

      const updated = measurements.filter((m) => m.id !== id);
      setMeasurements(updated);
      setFilteredMeasurements(updated); // if using filtered search list
    } catch (err) {
      Alert.alert("Error", "Failed to delete the measurement.");
    }
  };

  const exportAsPDF = async (item: any) => {
    const html = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            padding: 0;
            margin: 0;
            background: #f9f9f9;
            color: #333;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            padding: 60px;
            background: #fff;
            border: 1px solid #eee;
            box-shadow: 0 0 10px rgba(0,0,0,0.15);
          }
          .company-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .company-logo {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          .company-info {
            text-align: right;
            font-size: 14px;
            color: #666;
          }
          .invoice-title {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 30px;
            color: #000;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 16px;
          }
          .info-label {
            font-weight: bold;
            color: #555;
          }
          .info-value {
            color: #333;
          }
          .section {
            margin-top: 30px;
            border-top: 1px dashed #ccc;
            padding-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            font-size: 12px;
            color: #aaa;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          
          
    
          <div class="invoice-title">Land Harvesting Invoice</div>
    
          <div class="info-row">
            <div class="info-label">Owner Name:</div>
            <div class="info-value">${item.owner_name}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Acreage (ACR):</div>
            <div class="info-value">${item.acr}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Price per Acre:</div>
            <div class="info-value">Rs. ${item.price_per_acre?.toLocaleString()}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Total Amount:</div>
            <div class="info-value"><strong>Rs. ${item.total?.toLocaleString()}</strong></div>
          </div>
          <div class="info-row">
            <div class="info-label">Paid:</div>
            <div class="info-value">Rs. ${(item.paid_amount || 0).toLocaleString()}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Balance:</div>
            <div class="info-value">Rs. ${(item.total - (item.paid_amount || 0)).toLocaleString()}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Date:</div>
            <div class="info-value">${item.created_at}</div>
          </div>
    
          <div class="section">
            ${item.mobile ? `
            <div class="info-row">
              <div class="info-label">Mobile:</div>
              <div class="info-value">${item.mobile}</div>
            </div>` : ""}
            
            ${item.nic ? `
            <div class="info-row">
              <div class="info-label">NIC:</div>
              <div class="info-value">${item.nic}</div>
            </div>` : ""}
    
            ${item.driver_name ? `
            <div class="info-row">
              <div class="info-label">Driver Name:</div>
              <div class="info-value">${item.driver_name}</div>
            </div>` : ""}
    
            ${item.broker_name ? `
            <div class="info-row">
              <div class="info-label">Broker Name:</div>
              <div class="info-value">${item.broker_name}</div>
            </div>` : ""}
          </div>
    
          <div class="footer">Thank you for choosing HarvestPro! 🌾</div>
        </div>
      </body>
    </html>
    `;
    

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error("❌ PDF Export Error:", err);
      Alert.alert("Error", "Failed to export PDF.");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View>
  <Text style={styles.owner}>{item.owner_name}</Text>
  <Text style={styles.details}>ACR: {item.acr.toFixed(2)}</Text>
  <Text style={styles.details}>Total: Rs. {item.total.toLocaleString()}</Text>
  <Text style={styles.details}>Paid: Rs. {(item.paid_amount || 0).toLocaleString()}</Text>
  <Text style={styles.details}>Balance: Rs. {(item.total - (item.paid_amount || 0)).toLocaleString()}</Text>
  <Text style={styles.details}>Date: {item.created_at}</Text>
  {item.mobile && <Text style={styles.details}>Mobile: {item.mobile}</Text>}
  {item.nic && <Text style={styles.details}>NIC: {item.nic}</Text>}
</View>
<View style={styles.actions}>
  <TouchableOpacity onPress={() => exportAsPDF(item)}>
    <Ionicons name="share-social-outline" size={20} color={DARK} />
  </TouchableOpacity>

  <TouchableOpacity onPress={() => openModal(item)}>
    <Ionicons name="create-outline" size={20} color={DARK} />
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() =>
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this measurement?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDelete(item.id),
          },
        ]
      )
    }
  >
    <Ionicons name="trash-outline" size={20} color="red" />
  </TouchableOpacity>

  <TouchableOpacity onPress={() => openPaymentModal(item)}>
    <Ionicons
      name={
        item.paid_amount >= item.total
          ? "checkmark-done-circle-outline"
          : "cash-outline"
      }
      size={20}
      color={item.paid_amount >= item.total ? "limegreen" : DARK}
    />
    <Text
      style={{
        color: item.paid_amount >= item.total ? "limegreen" : DARK,
        fontSize: 12,
        marginTop: 4,
        textAlign: "center",
      }}
    >
      {item.paid_amount >= item.total ? "Completed" : "Pending"}
    </Text>
  </TouchableOpacity>
</View>
    </View>
  );

  const openPaymentModal = (item: any) => {
    setPaymentItem(item);
    setPaymentAmount(""); // reset input
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setPaymentItem(null);
    setPaymentAmount("");
  };

  const submitPayment = async () => {
    if (!paymentItem) return;
  
    const amountToPay = parseFloat(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
      return;
    }
  
    const currentPaid = paymentItem.paid_amount || 0;
    const balance = paymentItem.total - currentPaid;
  
    if (amountToPay > balance) {
      Alert.alert("Too Much", "Payment cannot exceed remaining balance.");
      return;
    }
  
    const newPaidAmount = currentPaid + amountToPay;
  
    try {
      // 1. Insert the payment record
      await insertPayment(paymentItem.id, amountToPay, ""); // optional: add a note field
  
      // 2. Update paid_amount in the measurements table
      await updateMeasurementPayment(paymentItem.id, newPaidAmount);
  
      // 3. Update local state
      const updated = measurements.map((m) =>
        m.id === paymentItem.id ? { ...m, paid_amount: newPaidAmount } : m
      );
      setMeasurements(updated);
  
      Alert.alert("Payment Successful", `Rs. ${amountToPay} paid successfully.`);
      closePaymentModal();
    } catch (err) {
      Alert.alert("Error", "Failed to process payment.");
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>සුරකින ලද මිනුම්</Text>

      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="හිමිකරුගේ නම, mobile හෝ NIC එක අනුව සොයන්න"
        placeholderTextColor={GRAY}
      />

      <FlatList
        data={filteredMeasurements}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal
        isVisible={modalVisible}
        onBackdropPress={closeModal}
        style={styles.modal}
        avoidKeyboard={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContent}
        >
          {selectedItem && (
            <>
              <Text style={styles.modalTitle}>
                {isEditing ? "Edit Measurement" : "Measurement Details"}
              </Text>

              {isEditing ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={editOwnerName}
                    onChangeText={setEditOwnerName}
                    placeholder="Owner Name"
                    placeholderTextColor={GRAY}
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editACR}
                    onChangeText={setEditACR}
                    placeholder="ACR"
                    placeholderTextColor={GRAY}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editPricePerAcre}
                    onChangeText={setEditPricePerAcre}
                    placeholder="Price per Acre"
                    placeholderTextColor={GRAY}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editTotal}
                    onChangeText={setEditTotal}
                    placeholder="Total"
                    placeholderTextColor={GRAY}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editDate}
                    onChangeText={setEditDate}
                    placeholder="Date"
                    placeholderTextColor={GRAY}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      onPress={saveEdit}
                      style={styles.saveButton}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsEditing(false)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.details}>
                    Owner: {selectedItem.owner_name}
                  </Text>
                  <Text style={styles.details}>
                    ACR: {selectedItem.acr.toFixed(2)}
                  </Text>
                  <Text style={styles.details}>
                    Price/Acre: {selectedItem.price_per_acre}
                  </Text>
                  <Text style={styles.details}>
                    Total: Rs. {selectedItem.total.toLocaleString()}
                  </Text>
                  <Text style={styles.details}>
                    Date: {selectedItem.created_at}
                  </Text>
                  {selectedItem.mobile && (
                    <Text style={styles.details}>
                      Mobile: {selectedItem.mobile}
                    </Text>
                  )}
                  {selectedItem.nic && (
                    <Text style={styles.details}>NIC: {selectedItem.nic}</Text>
                  )}

                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.editButton}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={closeModal}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </Modal>

<Modal
  isVisible={paymentModalVisible}
  onBackdropPress={closePaymentModal}
  style={{ justifyContent: "flex-end", margin: 0 }}
  avoidKeyboard={true}
>
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    style={{
      backgroundColor: DARK,
      padding: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 250,
    }}
  >
    {paymentItem && (
      <>
        <Text style={{ color: ACCENT, fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
          Make a Payment
        </Text>

        <Text style={{ color: GRAY, marginBottom: 8 }}>
          Total: Rs. {paymentItem.total.toLocaleString()}
        </Text>
        <Text style={{ color: GRAY, marginBottom: 8 }}>
          Paid: Rs. {(paymentItem.paid_amount || 0).toLocaleString()}
        </Text>
        <Text style={{ color: GRAY, marginBottom: 20 }}>
          Balance: Rs. {(paymentItem.total - (paymentItem.paid_amount || 0)).toLocaleString()}
        </Text>

        <TextInput
          placeholder="Enter payment amount"
          placeholderTextColor={GRAY}
          keyboardType="numeric"
          style={{
            backgroundColor: CARD,
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 40,
            color: "#fff",
            marginBottom: 20,
          }}
          value={paymentAmount}
          onChangeText={setPaymentAmount}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity
            onPress={submitPayment}
            style={{
              backgroundColor: ACCENT,
              paddingVertical: 12,
              borderRadius: 10,
              flex: 1,
              marginRight: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: DARK, fontWeight: "bold", fontSize: 16 }}>Pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={closePaymentModal}
            style={{
              backgroundColor: GRAY,
              paddingVertical: 12,
              borderRadius: 10,
              flex: 1,
              marginLeft: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: DARK, fontWeight: "bold", fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </>
    )}
  </KeyboardAvoidingView>
</Modal>


    </View>



  );
};

export default SavedMeasurementsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  searchInput: {
    backgroundColor: CARD,
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  header: {
    color:CARD,
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  owner: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  details: {
    color: GRAY,
    fontSize: 14,
    marginTop: 2,
  },
  actions: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    backgroundColor: DARK,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 350,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: ACCENT,
    marginBottom: 20,
  },
  editInput: {
    backgroundColor: CARD,
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: DARK,
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: GRAY,
    borderRadius: 10,
    paddingVertical: 12,
    marginLeft: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: DARK,
    fontWeight: "bold",
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 10,
  },
  editButton: {
    marginTop: 20,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  editButtonText: {
    color: DARK,
    fontWeight: "bold",
    fontSize: 16,
  },
  closeButton: {
    marginTop: 12,
    backgroundColor: GRAY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: DARK,
    fontWeight: "bold",
    fontSize: 16,
  },
});
