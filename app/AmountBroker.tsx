import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getBrokerCommissionPerLand, getAllBrokerNamesFromMeasurements } from '../db'; // Ensure this path is correct
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

type CommissionRow = {
  id: number;
  owner_name: string;
  total: number; // Total amount of the land (price_per_acre_at_measurement * acr)
  commission_amount: number; // Calculated broker commission for this land
  broker_name?: string | null; // Broker name for this row (Optional, primarily for debugging/clarity)
  acr: number;
  created_at: string;
};

const ACCENT = "#000";
const DARK = "#ffffff";
const CARD = "#23252b";
const GRAY = "#a1a1aa";

export default function AmountBroker() {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [totalCommission, setTotalCommission] = useState<number>(0);
  const [totalAcr, setTotalAcr] = useState<number>(0);
  const [brokers, setBrokers] = useState<string[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // --- Utility function to calculate totals ---
  const calculateTotals = useCallback((data: CommissionRow[]) => {
    const commission = data.reduce((sum, row) => sum + row.commission_amount, 0);
    const acr = data.reduce((sum, row) => sum + row.acr, 0);
    setTotalCommission(commission);
    setTotalAcr(acr);
  }, []);

  // --- Fetch Commission Data for Selected Broker ---
  const fetchCommissionForSelectedBroker = useCallback(async (brokerName: string | null) => {
    console.log('DEBUG: fetchCommissionForSelectedBroker triggered. Selected broker:', brokerName);
    setLoading(true);
    if (brokerName) {
      try {
        const data = await getBrokerCommissionPerLand(brokerName);
        setRows(data);
        calculateTotals(data); // Calculate totals whenever rows are updated
      } catch (error) {
        console.error(`❌ Error fetching commission for ${brokerName}:`, error);
        Alert.alert("Error", `Failed to load commission for ${brokerName}.`);
        setRows([]); // Clear rows on error
        calculateTotals([]); // Reset totals on error
      }
    } else {
      // If no broker is selected, clear data and totals
      setRows([]);
      calculateTotals([]);
    }
    setLoading(false);
  }, [calculateTotals]);

  // --- Initial Load: Get all broker names and set up initial data ---
  useEffect(() => {
    const loadBrokersAndInitialData = async () => {
      setLoading(true);
      try {
        const allBrokerNames = await getAllBrokerNamesFromMeasurements();
        setBrokers(allBrokerNames);

        let initialSelected: string | null = null;
        if (allBrokerNames.length > 0) {
          initialSelected = allBrokerNames[0];
          setSelectedBroker(initialSelected); // This sets the initial value for the Picker
          console.log('DEBUG: Initial selected broker:', initialSelected);
          // Directly fetch data for the initial selected broker
          await fetchCommissionForSelectedBroker(initialSelected);
        } else {
          setSelectedBroker(null);
          console.log('DEBUG: No brokers found in measurements.');
          setRows([]); // Ensure rows are empty if no brokers
          calculateTotals([]); // Ensure totals are zero if no brokers
        }
      } catch (error) {
        console.error("❌ Error loading brokers or initial data:", error);
        Alert.alert("Error", "Failed to load broker data. Please ensure brokers are assigned to measurements.");
        setRows([]);
        calculateTotals([]);
      } finally {
        setLoading(false);
      }
    };

    loadBrokersAndInitialData();
  }, [fetchCommissionForSelectedBroker, calculateTotals]); // Add dependencies

  // --- Effect to re-fetch data when selectedBroker changes (from picker) ---
  useEffect(() => {
    // This useEffect will now only trigger when selectedBroker state explicitly changes
    // after the initial load. The initial fetch is handled by the first useEffect.
    if (selectedBroker !== null || brokers.length === 0) { // Only fetch if a broker is selected OR if there are no brokers
        fetchCommissionForSelectedBroker(selectedBroker);
    }
  }, [selectedBroker, fetchCommissionForSelectedBroker, brokers.length]); // Add brokers.length as a dependency for edge cases

  // Renders each row in the FlatList
  const renderItem = ({ item }: { item: CommissionRow }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.owner_name}</Text>
      <Text style={styles.cell}>{item.acr.toFixed(2)}</Text>
      <Text style={styles.cell}>
        {new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
      </Text>
      <Text style={styles.cell}>Rs {item.total.toFixed(2)}</Text>
      <Text style={styles.cellHighlight}>Rs {item.commission_amount.toFixed(2)}</Text>
    </View>
  );

  const exportToPdf = async () => {
    if (!selectedBroker || rows.length === 0) {
      Alert.alert("No Data", "There is no data to export for the selected broker.");
      return;
    }

    try {
      const htmlContent = `
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f0f0f0; color: #333; }
            h1 { color: ${ACCENT}; text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: ${CARD}; color: ${ACCENT}; font-weight: bold; }
            .total-section { margin-top: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .total-section p { margin: 5px 0; font-size: 16px; }
            .total-section strong { color: ${DARK}; }
            .commission-highlight { color: ${ACCENT}; font-weight: bold; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <h1>Broker Commission Report for ${selectedBroker}</h1>
          <table>
            <thead>
              <tr>
                <th>Owner Name</th>
                <th>ACR</th>
                <th>Date</th>
                <th>Total Land Value (Rs.)</th>
                <th>Commission (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td>${row.owner_name}</td>
                  <td class="text-center">${row.acr.toFixed(2)}</td>
                  <td class="text-center">${new Date(row.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                  <td class="text-center">Rs ${row.total.toFixed(2)}</td>
                  <td class="text-center commission-highlight">Rs ${row.commission_amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-section">
            <p><strong>Total ACR for ${selectedBroker}:</strong> ${totalAcr.toFixed(2)}</p>
            <p><strong>Total Commission for ${selectedBroker}:</strong> Rs ${totalCommission.toFixed(2)}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      const fileName = `Broker_Commission_Report_${selectedBroker.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.pdf`;
      const newPath = FileSystem.documentDirectory + fileName;

      await FileSystem.copyAsync({ from: uri, to: newPath });

      await Sharing.shareAsync(newPath, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });

    } catch (error) {
      console.error('❌ PDF export failed:', error);
      Alert.alert("Export Failed", "Could not generate or share the PDF. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Broker Commission</Text>

      {/* Conditional rendering for the broker picker */}
      {loading && brokers.length === 0 ? (
        <ActivityIndicator size="large" color={ACCENT} style={styles.pickerLoading} />
      ) : brokers.length > 0 ? (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Broker:</Text>
          <Picker
            selectedValue={selectedBroker}
            style={styles.picker}
            dropdownIconColor={DARK}
            onValueChange={(itemValue: string | null) => setSelectedBroker(itemValue)}
          >
            {/* Add an optional "Select All" or "No Broker" option if useful */}
            {/* <Picker.Item label="All Brokers" value={null} color={GRAY} /> */}
            {brokers.map((broker, index) => (
              <Picker.Item
                key={broker || `empty-${index}`} // Ensure a valid key even if broker name is empty string
                label={broker || "Unknown Broker"} // Fallback label
                value={broker}
                color={CARD}
              />
            ))}
          </Picker>
        </View>
      ) : (
        <Text style={styles.noDataText}>No brokers found with recorded measurements.</Text>
      )}

      {/* Export to PDF Button */}
      <TouchableOpacity onPress={exportToPdf} style={styles.exportButton} disabled={!selectedBroker || rows.length === 0}>
        <Text style={styles.exportButtonText}>Export to PDF</Text>
      </TouchableOpacity>

      {/* Table Header */}
      <View style={styles.header}>
        <Text style={styles.headerCell}>Owner</Text>
        <Text style={styles.headerCell}>ACR</Text>
        <Text style={styles.headerCell}>Date</Text>
        <Text style={styles.headerCell}>Total Land Value</Text>
        <Text style={styles.headerCell}>Commission</Text>
      </View>

      {/* Commission Data List */}
      {loading && selectedBroker ? ( // Show loading indicator only when a broker is selected and data is being fetched
        <ActivityIndicator size="large" color={CARD} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.noDataText}>
              {selectedBroker ? `No commission data for ${selectedBroker}.` : "Select a broker to view commission data."}
            </Text>
          }
        />
      )}

      {/* Footer displaying total ACR and total commission */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Total ACR for {selectedBroker || 'Selected Broker'}:
        </Text>
        <Text style={styles.footerAmount}>{totalAcr.toFixed(2)}</Text>

        <Text style={styles.footerText}>
          Total Commission for {selectedBroker || 'Selected Broker'}:
        </Text>
        <Text style={styles.footerAmount}>Rs {totalCommission.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: DARK, flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: ACCENT, marginBottom: 20, textAlign: 'center' },

  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: GRAY,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: CARD,
  },
  pickerLabel: {
    paddingLeft: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: GRAY,
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#fff',
  },
  pickerLoading: {
    marginBottom: 15,
  },
  noDataText: {
    textAlign: 'center',
    marginBottom: 15,
    color: GRAY,
    fontSize: 15,
  },

  exportButton: {
    backgroundColor: ACCENT,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exportButtonText: {
    color: DARK,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },

  header: {
    flexDirection: 'row',
    backgroundColor: DARK,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: GRAY,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
    color: ACCENT,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: DARK,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: CARD,
    fontSize: 12,
  },
  cellHighlight: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    color: ACCENT,
    fontSize: 12,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 30,
    color: GRAY,
    fontSize: 16,
  },

  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderColor: GRAY,
    backgroundColor: CARD,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 5,
  },
  footerAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 10,
  },
});