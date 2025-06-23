import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getDriverCommissionPerLand, getAllDriverNamesFromMeasurements } from '../db';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type CommissionRow = {
  id: number;
  owner_name: string;
  total: number;
  commission_amount: number;
  driver_name?: string | null;
  acr: number; // Add acr to the type
  created_at: string; // Add created_at to the type
};

const ACCENT = "#000";
const DARK = "#ffffff";
const CARD = "#23252b";
const GRAY = "#a1a1aa";

export default function AmountDriver() {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [totalCommission, setTotalCommission] = useState<number>(0);
  const [totalAcr, setTotalAcr] = useState<number>(0); // New state for total ACR
  const [drivers, setDrivers] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDriversAndInitialData = async () => {
      setLoading(true);
      try {
        const allDriverNames = await getAllDriverNamesFromMeasurements();
        setDrivers(allDriverNames);

        let initialSelectedDriver: string | null = null;
        if (allDriverNames.length > 0) {
          initialSelectedDriver = allDriverNames[0];
          setSelectedDriver(initialSelectedDriver);
        } else {
          setSelectedDriver(null);
        }

        if (initialSelectedDriver) {
          const data = await getDriverCommissionPerLand(initialSelectedDriver);
          setRows(data);
          const totalComm = data.reduce((sum, item) => sum + item.commission_amount, 0);
          setTotalCommission(totalComm);
          const totalA = data.reduce((sum, item) => sum + item.acr, 0); // Calculate total ACR
          setTotalAcr(totalA); // Set total ACR
        } else {
          setRows([]);
          setTotalCommission(0);
          setTotalAcr(0); // Reset total ACR
        }
      } catch (error) {
        console.error("Error loading drivers or initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDriversAndInitialData();
  }, []);

  useEffect(() => {
    const fetchCommissionForSelectedDriver = async () => {
      if (selectedDriver) {
        setLoading(true);
        try {
          const data = await getDriverCommissionPerLand(selectedDriver);
          setRows(data);
          const totalComm = data.reduce((sum, item) => sum + item.commission_amount, 0);
          setTotalCommission(totalComm);
          const totalA = data.reduce((sum, item) => sum + item.acr, 0); // Calculate total ACR
          setTotalAcr(totalA); // Set total ACR
        } catch (error) {
          console.error(`Error fetching commission for ${selectedDriver}:`, error);
        } finally {
          setLoading(false);
        }
      } else {
        setRows([]);
        setTotalCommission(0);
        setTotalAcr(0); // Reset total ACR
        setLoading(false);
      }
    };

    fetchCommissionForSelectedDriver();
  }, [selectedDriver]);

  const renderItem = ({ item }: { item: CommissionRow }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.owner_name}</Text>
      <Text style={styles.cell}>{item.acr.toFixed(2)}</Text>
      <Text style={styles.cell}>{new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</Text>
      <Text style={styles.cell}>Rs {item.total.toFixed(2)}</Text>
      <Text style={styles.cellHighlight}>Rs {item.commission_amount.toFixed(2)}</Text>
    </View>
  );

  const exportToPdf = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: sans-serif; padding: 16px; }
              h1 { color: #f7ee6d; background: #181a20; padding: 10px; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
              th { background-color: #23252b; color: white; }
              tr:nth-child(even) { background-color: #2e2e2e; color: white; }
            </style>
          </head>
          <body>
            <h1>Commission Report: ${selectedDriver || 'Unknown Driver'}</h1>
            <table>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>ACR</th>
                  <th>Date</th>
                  <th>Total (Rs)</th>
                  <th>Commission (Rs)</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(item => `
                  <tr>
                    <td>${item.owner_name}</td>
                    <td>${item.acr.toFixed(2)}</td>
                    <td>${new Date(item.created_at).toLocaleDateString()}</td>
                    <td>${item.total.toFixed(2)}</td>
                    <td>${item.commission_amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
  
            <p><strong>Total ACR:</strong> ${totalAcr.toFixed(2)}</p>
            <p><strong>Total Commission:</strong> Rs ${totalCommission.toFixed(2)}</p>
          </body>
        </html>
      `;
  
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
  
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Commission</Text>

      {loading ? (
        <ActivityIndicator size="large" color={ACCENT} style={styles.pickerLoading} />
      ) : drivers.length > 0 ? (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Driver:</Text>
          <Picker
            selectedValue={selectedDriver}
            style={styles.picker}
            dropdownIconColor={DARK}
            onValueChange={(itemValue) => setSelectedDriver(itemValue)}
          >
            {drivers.map((driver, index) => (
              <Picker.Item
                key={index}
                label={driver}
                value={driver}
                color={CARD}
              />
            ))}
          </Picker>
        </View>
      ) : (
        <Text style={styles.noDriversText}>No drivers found with recorded measurements.</Text>
      )}

<TouchableOpacity onPress={exportToPdf} style={{ backgroundColor: ACCENT, padding: 10, borderRadius: 5, marginBottom: 10 }}>
  <Text style={{ color: DARK, fontWeight: 'bold', textAlign: 'center' }}>Export to PDF</Text>
</TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerCell}>Owner</Text>
        <Text style={styles.headerCell}>ACR</Text>
        <Text style={styles.headerCell}>Date</Text>
        <Text style={styles.headerCell}>Total</Text>
        <Text style={styles.headerCell}>Commission</Text>
      </View>

      {loading && rows.length === 0 ? (
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No commission data for this driver.</Text>
          }
        />
      )}

      <View style={styles.footer}>
        {/* Display Total ACR */}
        <Text style={styles.footerText}>
          Total ACR for {selectedDriver || 'Selected Driver'}:
        </Text>
        <Text style={styles.footerAmount}>{totalAcr.toFixed(2)}</Text>

        {/* Display Total Commission */}
        <Text style={styles.footerText}>
          Total Commission for {selectedDriver || 'Selected Driver'}:
        </Text>
        <Text style={styles.footerAmount}>Rs {totalCommission.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: DARK, flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', color: ACCENT, marginBottom: 12, textAlign: 'center' },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: CARD,
    borderRadius: 5,
    overflow: 'hidden',
  },
  pickerLabel: {
    paddingLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: GRAY,
  },
  picker: {
    flex: 1,
    height: 60,
    color: '#fff',
    backgroundColor: CARD,
  },
  pickerLoading: {
    marginBottom: 10,
  },
  noDriversText: {
    textAlign: 'center',
    marginBottom: 10,
    color: GRAY,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: CARD,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: GRAY,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
    color: DARK,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderColor: GRAY,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: CARD,
  },
  cellHighlight: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    color: ACCENT,
  },
  footer: {
    marginTop: 16,
    // Change to column to stack the total ACR and total commission
    flexDirection: 'column',
    justifyContent: 'space-between', // This will now apply vertically
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: CARD,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CARD,
    marginBottom: 4, // Add some space between the lines
  },
  footerAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ACCENT,
    marginBottom: 8, // Add some space between the lines
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: GRAY,
  },
});