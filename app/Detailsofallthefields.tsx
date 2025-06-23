import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { getMeasurements } from '../db'; // 👉 make sure path is correct
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// 🎨 Theme colors
const ACCENT = "#000";
const DARK = "#ffffff";
const CARD = "#23252b";
const GRAY = "#a1a1aa";

export default function Detailsofallthefields() {
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await getMeasurements();
    setMeasurements(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const exportToPDF = async () => {
    if (measurements.length === 0) {
      Alert.alert("No Data", "There is no data to export.");
      return;
    }

    const totalAcr = measurements.reduce((sum, m) => sum + m.acr, 0);
    const totalValue = measurements.reduce((sum, m) => sum + m.total, 0);

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; background: #fff; color: #000; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; }
            th { background-color: #f7ee6d; color: #000; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .summary { margin-top: 30px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>All Measurements Report</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Owner</th>
                <th>ACR</th>
                <th>Price/Acre</th>
                <th>Total</th>
                <th>Mobile</th>
                <th>NIC</th>
                <th>Driver</th>
                <th>Broker</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              ${measurements.map(m => `
                <tr>
                  <td>${m.id}</td>
                  <td>${m.owner_name}</td>
                  <td>${m.acr.toFixed(2)}</td>
                  <td>Rs ${m.price_per_acre.toFixed(2)}</td>
                  <td>Rs ${m.total.toFixed(2)}</td>
                  <td>${m.mobile || 'N/A'}</td>
                  <td>${m.nic || 'N/A'}</td>
                  <td>${m.driver_name || 'N/A'}</td>
                  <td>${m.broker_name || 'N/A'}</td>
                  <td>${new Date(m.created_at).toLocaleDateString()}</td>
                  <td>${m.updated_at ? new Date(m.updated_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <p>Total ACR: ${totalAcr.toFixed(2)}</p>
            <p>Total Land Value: Rs ${totalValue.toFixed(2)}</p>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading measurements...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>සියලුම කුඹුරුවල මිනුම්</Text>

      <TouchableOpacity style={styles.button} onPress={exportToPDF}>
        <Text style={styles.buttonText}>Export to PDF</Text>
      </TouchableOpacity>

      {measurements.map((m) => (
        <View key={m.id} style={styles.card}>
          <Text style={styles.cardTitle}>හිමිකරු : {m.owner_name}</Text>
          <Text style={styles.field}>ACR: {m.acr.toFixed(2)}</Text>
          <Text style={styles.field}>Price/Acre: Rs {m.price_per_acre.toFixed(2)}</Text>
          <Text style={styles.field}>Total: Rs {m.total.toFixed(2)}</Text>
          {m.mobile && <Text style={styles.field}>Mobile: {m.mobile}</Text>}
          {m.nic && <Text style={styles.field}>NIC: {m.nic}</Text>}
          {m.driver_name && <Text style={styles.field}>Driver: {m.driver_name}</Text>}
          {m.broker_name && <Text style={styles.field}>Broker: {m.broker_name}</Text>}
          <Text style={styles.field}>Created At: {new Date(m.created_at).toLocaleDateString()}</Text>
          <Text style={styles.field}>Updated At: {m.updated_at ? new Date(m.updated_at).toLocaleDateString() : 'N/A'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DARK,
    padding: 16,
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DARK,
  },
  loadingText: {
    color: GRAY,
    marginTop: 10,
  },
  title: {
    color: ACCENT,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: CARD,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderColor: ACCENT,
    borderWidth: 0.5,
  },
  cardTitle: {
    color: DARK,
    fontSize: 18,
    marginBottom: 8,
    fontWeight: '600',
  },
  field: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    backgroundColor: ACCENT,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: DARK,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
