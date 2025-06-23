import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { getMeasurementPaymentSummary } from "../db";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const ACCENT = "#000";
const DARK = "#ffffff";
const CARD = "#23252b";
const GRAY = "#a1a1aa";

type SummaryRow = {
  measurement_id: number;
  owner_name: string;
  total: number;
  paid_amount: number;
};

export default function MeasurementPaymentSummaryScreen() {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      const data = await getMeasurementPaymentSummary();
      setRows(data);
      setLoading(false);
    };
    loadSummary();
  }, []);

  const exportToPDF = async () => {
    if (rows.length === 0) {
      alert("No data to export.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #fff; color: #000; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f7ee6d; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .complete { color: green; font-weight: bold; }
            .pending { color: orange; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Payment Summary by Measurement</h1>
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Total (Rs.)</th>
                <th>Paid (Rs.)</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((row) => {
                  const balance = row.total - row.paid_amount;
                  const isComplete = balance <= 0;
                  return `
                    <tr>
                      <td>${row.owner_name}</td>
                      <td>${row.total.toLocaleString()}</td>
                      <td>${row.paid_amount.toLocaleString()}</td>
                      <td class="${isComplete ? "complete" : "pending"}">
                        ${isComplete ? "✔ Completed" : `Rs. ${balance.toLocaleString()}`}
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const fileName = `Measurement_Payment_Summary_${Date.now()}.pdf`;
      const newPath = FileSystem.documentDirectory + fileName;

      await FileSystem.copyAsync({ from: uri, to: newPath });
      await Sharing.shareAsync(newPath, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (err) {
      console.error("❌ Failed to export PDF:", err);
      alert("Failed to generate PDF.");
    }
  };

  const renderItem = ({ item }: { item: SummaryRow }) => {
    const balance = item.total - item.paid_amount;
    const isComplete = balance <= 0;

    return (
      <View style={styles.card}>
        <Text style={styles.owner}>👤 {item.owner_name}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total:</Text>
          <Text style={styles.value}>Rs. {item.total.toLocaleString()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Paid:</Text>
          <Text style={[styles.value, { color: "#2dd4bf" }]}>
            Rs. {item.paid_amount.toLocaleString()}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Balance:</Text>
          <Text
            style={[
              styles.value,
              {
                color: isComplete ? "limegreen" : "orange",
                fontWeight: "bold",
              },
            ]}
          >
            {isComplete
              ? "✔️ Completed"
              : `Rs. ${balance.toLocaleString()}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💳 Payment Summary by Measurement</Text>
      {loading ? (
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.measurement_id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No data found.</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <TouchableOpacity style={styles.exportButton} onPress={exportToPDF}>
        <Text style={styles.exportText}>Export to PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: ACCENT,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#2e2e2e",
  },
  owner: {
    fontSize: 18,
    fontWeight: "bold",
    color: DARK,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    color: GRAY,
    fontSize: 14,
  },
  value: {
    color: "#fff",
    fontSize: 14,
  },
  empty: {
    marginTop: 40,
    textAlign: "center",
    color: GRAY,
    fontSize: 16,
  },
  exportButton: {
    backgroundColor: ACCENT,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  exportText: {
    color: DARK,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});
