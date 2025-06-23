// db.ts

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';



// Singleton database instance
let db: SQLite.SQLiteDatabase | null = null;

// Fallback default price
export const DEFAULT_PRICE_PER_ACRE = 19000;

// 📦 Get DB instance
export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    // Ensure the database file exists or is created
    db = SQLite.openDatabaseSync('land_measurements.db');
  }
  return db;
};

// 🧱 Create tables and handle schema updates
export const createTable = async (): Promise<void> => {
  try {
    const db = getDatabase();

    // Create measurements table with driver_name and broker_name
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        acr REAL NOT NULL,
        price_per_acre REAL NOT NULL,
        total REAL NOT NULL,
        owner_name TEXT NOT NULL,
        mobile TEXT,
        nic TEXT,
        driver_name TEXT,
        broker_name TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT
      );
    `);

    // Create profile table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_name TEXT NOT NULL,
        mobile TEXT,
        address TEXT,
        price_per_acre REAL NOT NULL,
        driver_commission REAL,
        broker_commission_or_amount REAL,
        selected_broker_name TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT
      );
    `);

    // Create driver table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS driver (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT
    );
  `);

    // Create broker table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS broker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT
    );
  `);

    // Create driverDeatils table (New table added)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS driverDeatils (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_name TEXT NOT NULL,
        contact_number TEXT,
        address TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT
      );
    `);

    // Create payment Table
    await db.execAsync(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    measurement_id INTEGER NOT NULL,
    amount_paid REAL NOT NULL,
    paid_at TEXT DEFAULT (datetime('now', 'localtime')),
    note TEXT,
    FOREIGN KEY (measurement_id) REFERENCES measurements(id) ON DELETE CASCADE
  );
`);




    // Add columns if they don't exist (existing logic, kept for completeness)
    const measurementColumns: any[] = await db.getAllAsync(`PRAGMA table_info(measurements);`);
    const measurementColumnNames = measurementColumns.map(col => col.name);
    if (!measurementColumnNames.includes('driver_name')) {
      await db.execAsync(`ALTER TABLE measurements ADD COLUMN driver_name TEXT;`);
    }
    if (!measurementColumnNames.includes('broker_name')) {
      await db.execAsync(`ALTER TABLE measurements ADD COLUMN broker_name TEXT;`);
    }

    const profileColumns: any[] = await db.getAllAsync(`PRAGMA table_info(profile);`);
    const profileColumnNames = profileColumns.map(col => col.name);

    if (!profileColumnNames.includes('driver_commission')) {
      await db.execAsync(`ALTER TABLE profile ADD COLUMN driver_commission REAL;`);
    }

    if (!profileColumnNames.includes('broker_commission_or_amount')) {
      await db.execAsync(`ALTER TABLE profile ADD COLUMN broker_commission_or_amount REAL;`);
    }

    // Add selected_broker_name column if it doesn't exist
    if (!profileColumnNames.includes('selected_broker_name')) {
      await db.execAsync(`ALTER TABLE profile ADD COLUMN selected_broker_name TEXT;`);
    }

  } catch (err) {
    console.error('❌ Error creating or updating tables:', err);
  }
};


// Make sure this runs once when the app starts
export const ensurePaidAmountColumn = async () => {
  try {
    await getDatabase().execAsync(`
      ALTER TABLE measurements ADD COLUMN paid_amount REAL DEFAULT 0;
    `);
    console.log("✅ 'paid_amount' column added to measurements.");
  } catch (err: any) {
    if (err.message.includes("duplicate column name")) {
      console.log("ℹ️ 'paid_amount' column already exists.");
    } else {
      console.error("❌ Failed to add 'paid_amount' column:", err);
    }
  }
};


//
// 🧮 MEASUREMENT CRUD
//

export const insertMeasurement = async (
  acr: number,
  pricePerAcre: number,
  total: number,
  ownerName: string,
  mobile: string,
  nic: string,
  driverName: string,
  brokerName: string,
  createdAt?: string
): Promise<void> => {
  const db = getDatabase();
  const now = createdAt || new Date().toISOString();
  try {
    await db.execAsync('BEGIN TRANSACTION;');
    await db.runAsync(
      `INSERT INTO measurements
        (acr, price_per_acre, total, owner_name, mobile, nic, driver_name, broker_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [acr, pricePerAcre, total, ownerName, mobile, nic, driverName, brokerName, now]
    );
    await db.execAsync('COMMIT;');
  } catch (err) {
    await db.execAsync('ROLLBACK;');
    console.error('❌ Error inserting measurement:', err);
  }
};

export const getMeasurements = async (): Promise<any[]> => {
  try {
    return await getDatabase().getAllAsync(`SELECT * FROM measurements ORDER BY id DESC;`);
  } catch (err) {
    console.error('❌ Error fetching measurements:', err);
    return [];
  }
};

export const getMeasurementById = async (id: number): Promise<any | null> => {
  try {
    return await getDatabase().getFirstAsync?.(`SELECT * FROM measurements WHERE id = ?;`, [id]) ?? null;
  } catch (err) {
    console.error('❌ Error fetching measurement by ID:', err);
    return null;
  }
};

export const updateMeasurement = async (
  id: number,
  acr: number,
  pricePerAcre: number,
  total: number,
  ownerName: string,
  mobile: string,
  nic: string,
  driverName: string,
  brokerName: string
): Promise<void> => {
  const db = getDatabase();
  const now = new Date().toISOString();
  try {
    await db.execAsync('BEGIN TRANSACTION;');
    await db.runAsync(
      `UPDATE measurements SET
        acr = ?, price_per_acre = ?, total = ?, owner_name = ?, mobile = ?, nic = ?, driver_name = ?, broker_name = ?, updated_at = ?
        WHERE id = ?;`,
      [acr, pricePerAcre, total, ownerName, mobile, nic, driverName, brokerName, now, id]
    );
    await db.execAsync('COMMIT;');
  } catch (err) {
    await db.execAsync('ROLLBACK;');
    console.error('❌ Error updating measurement:', err);
  }
};

export const deleteMeasurement = async (id: number): Promise<void> => {
  try {
    await getDatabase().runAsync(`DELETE FROM measurements WHERE id = ?;`, [id]);
  } catch (err) {
    console.error('❌ Error deleting measurement:', err);
  }
};

//
// 📋 PROFILE CRUD
//

export type Profile = {
  id?: number;
  farm_name: string;
  mobile?: string;
  address?: string;
  price_per_acre: number;
  driver_commission?: number;
  broker_commission_or_amount?: number;
  selected_broker_name?: string | null;
  created_at?: string;
  updated_at?: string;
  [x: string]: any;
};

export const insertProfile = async (profile: Profile): Promise<void> => {
  try {
    await getDatabase().runAsync(
      `INSERT INTO profile
        (farm_name, mobile, address, price_per_acre, driver_commission, broker_commission_or_amount, selected_broker_name)
        VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        profile.farm_name,
        profile.mobile ?? null,
        profile.address ?? null,
        profile.price_per_acre,
        profile.driver_commission ?? null,
        profile.broker_commission_or_amount ?? null,
        profile.selected_broker_name ?? null,
      ]
    );
  } catch (err) {
    console.error('❌ Error inserting profile:', err);
  }
};

export const updateProfile = async (id: number, profile: Profile): Promise<void> => {
  try {
    await getDatabase().runAsync(
      `UPDATE profile SET
          farm_name = ?,
          mobile = ?,
          address = ?,
          price_per_acre = ?,
          driver_commission = ?,
          broker_commission_or_amount = ?,
          selected_broker_name = ?,
          updated_at = datetime('now', 'localtime')
          WHERE id = ?;`,
      [
        profile.farm_name,
        profile.mobile ?? null,
        profile.address ?? null,
        profile.price_per_acre,
        profile.driver_commission ?? null,
        profile.broker_commission_or_amount ?? null,
        profile.selected_broker_name ?? null,
        id
      ]
    );
  } catch (err) {
    console.error('❌ Error updating profile:', err);
  }
};

export const getFirstProfile = async (): Promise<Profile | null> => {
  try {
    return await getDatabase().getFirstAsync?.<Profile>(`SELECT * FROM profile LIMIT 1;`) ?? null;
  } catch (err) {
    console.error('❌ Error fetching profile:', err);
    return null;
  }
};

export const getProfileCommissions = async (): Promise<{
  driver_commission: number | null;
  broker_commission_or_amount: number | null;
} | null> => {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync<{
      driver_commission: number | null;
      broker_commission_or_amount: number | null;
    }>(`SELECT driver_commission, broker_commission_or_amount FROM profile LIMIT 1;`);

    return result ?? null;
  } catch (err) {
    console.error('❌ Error fetching commissions:', err);
    return null;
  }
};

// Reusable type for commission rows (for both drivers and brokers)
export type CommissionRow = { // <--- Add 'export' here
  id: number;
  owner_name: string;
  total: number;
  commission_amount: number;
  acr: number;
  created_at: string;
  driver_name?: string | null; // Optional, only present for driver commission
  broker_name?: string | null; // Optional, only present for broker commission
};

export const getAllDriverNamesFromMeasurements = async (): Promise<string[]> => {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync<{ driver_name: string }>(`SELECT DISTINCT driver_name FROM measurements WHERE driver_name IS NOT NULL AND driver_name != '' ORDER BY driver_name ASC;`);
    return result.map(row => row.driver_name);
  } catch (err) {
    console.error('❌ Error fetching unique driver names:', err);
    return [];
  }
};

export const getDriverCommissionPerLand = async (driverName?: string): Promise<CommissionRow[]> => {
  const commissions = await getProfileCommissions();
  const driverCommission = commissions?.driver_commission ?? 0; // Default to 0 if not set

  let query = `SELECT id, owner_name, total, driver_name, acr, created_at FROM measurements`;
  const params: string[] = [];

  if (driverName) {
    query += ` WHERE driver_name = ?`;
    params.push(driverName);
  }
  query += ` ORDER BY created_at DESC;`;

  const measurements = await getDatabase().getAllAsync(query, params);

  return measurements.map((m: any) => ({
    id: m.id,
    owner_name: m.owner_name,
    total: m.total,
    commission_amount: (driverCommission / 100) * m.total, // Assuming driver_commission is a percentage
    driver_name: m.driver_name,
    acr: m.acr,
    created_at: m.created_at,
  }));
};

//
// 📝 BROKER COMMISSION FUNCTIONS (NEW ADDITIONS)
//

/**
 * Fetches all distinct broker names from the measurements table.
 * @returns {Promise<string[]>}
 */
export const getAllBrokerNamesFromMeasurements = async (): Promise<string[]> => {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync<{ broker_name: string }>(
      `SELECT DISTINCT broker_name FROM measurements WHERE broker_name IS NOT NULL AND broker_name != '' ORDER BY broker_name ASC;`
    );
    return result.map(row => row.broker_name);
  } catch (err) {
    console.error('❌ Error fetching unique broker names:', err);
    return [];
  }
};

/**
 * Fetches commission details per land for a given broker.
 * Calculates commission based on the 'broker_commission_or_amount' from the profile,
 * assuming it's a fixed amount per acre (Rs. per Acre).
 * @param {string} brokerName The name of the broker.
 * @returns {Promise<CommissionRow[]>} A promise that resolves to an array of commission rows.
 */
export const getBrokerCommissionPerLand = async (brokerName?: string): Promise<CommissionRow[]> => {
  try {
    const db = getDatabase();
    const commissionsProfile = await getProfileCommissions(); // Fetch profile commissions

    // --- DEBUG LOGS START ---
    console.log('DEBUG: getBrokerCommissionPerLand called with brokerName:', brokerName);
    console.log('DEBUG: Profile Commissions fetched:', commissionsProfile);
    // --- DEBUG LOGS END ---

    const brokerCommissionPerAcre = commissionsProfile?.broker_commission_or_amount ?? 0;

    // --- DEBUG LOGS START ---
    console.log('DEBUG: Calculated brokerCommissionPerAcre:', brokerCommissionPerAcre);
    // --- DEBUG LOGS END ---

    let query = `SELECT id, owner_name, total, acr, created_at, broker_name FROM measurements`;
    const params: (string | number)[] = [];

    if (brokerName) {
      query += ` WHERE broker_name = ?`;
      params.push(brokerName);
    }
    query += ` ORDER BY created_at DESC;`;

    // --- DEBUG LOGS START ---
    console.log('DEBUG: SQL Query:', query);
    console.log('DEBUG: SQL Params:', params);
    // --- DEBUG LOGS END ---

    const measurements = await db.getAllAsync<any>(query, params);

    // --- DEBUG LOGS START ---
    console.log('DEBUG: Raw measurements fetched:', measurements);
    if (measurements.length === 0) {
      console.warn('DEBUG: No measurements found for the given criteria.');
    }
    // --- DEBUG LOGS END ---

    return measurements.map((m: any) => ({
      id: m.id,
      owner_name: m.owner_name,
      total: m.total,
      acr: m.acr,
      created_at: m.created_at,
      broker_name: m.broker_name,
      commission_amount: m.acr * brokerCommissionPerAcre,
    }));
  } catch (err) {
    console.error('❌ Error fetching broker commission per land:', err);
    return [];
  }
};

export const getCurrentPricePerAcre = async (): Promise<number> => {
  try {
    const profile = await getFirstProfile();
    return typeof profile?.price_per_acre === 'number' ? profile.price_per_acre : DEFAULT_PRICE_PER_ACRE;
  } catch (err) {
    console.error('❌ Error getting price_per_acre:', err);
    return DEFAULT_PRICE_PER_ACRE;
  }
};

//
// 📤 SHARE DB
//

export const getDatabasePath = (): string =>
  FileSystem.documentDirectory + 'SQLite/land_measurements.db';

export const shareDatabase = async (): Promise<void> => {
  const dbPath = getDatabasePath();
  const file = await FileSystem.getInfoAsync(dbPath);
  if (file.exists) {
    await Sharing.shareAsync(dbPath);
  } else {
    console.warn('⚠️ Database file not found.');
  }
};


//
// 📋 DRIVER CRUD
//

export type Driver = {
  id?: number;
  first_name: string;
  created_at?: string;
  updated_at?: string;
};

export const insertDriver = async (driver: Driver): Promise<void> => {
  try {
    await getDatabase().runAsync(
      `INSERT INTO driver (first_name) VALUES (?);`,
      [driver.first_name]
    );
  } catch (err) {
    console.error('❌ Error inserting driver:', err);
    throw err; // Re-throw to allow component to catch and show specific message
  }
};

export const updateDriver = async (id: number, newName: string): Promise<void> => {
  try {
    await getDatabase().runAsync(
      `UPDATE driver
          SET first_name = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?;`,
      [newName, id]
    );
  } catch (err) {
    console.error('❌ Error updating driver:', err);
  }
};

export const deleteDriver = async (id: number): Promise<void> => {
  try {
    await getDatabase().runAsync(`DELETE FROM driver WHERE id = ?;`, [id]);
  } catch (err) {
    console.error('❌ Error deleting driver:', err);
  }
};

export const getDrivers = async (): Promise<Driver[]> => {
  try {
    const results = await getDatabase().getAllAsync<Driver>(`SELECT * FROM driver ORDER BY id DESC;`);
    return results || [];
  } catch (err) {
    console.error('❌ Error fetching drivers:', err);
    return [];
  }
};

//
// 📝 BROKER CRUD (Existing Section - included for completeness)
//

export type Broker = {
  id?: number;
  first_name: string;
  created_at?: string;
  updated_at?: string;
};

export const insertBroker = async (broker: Broker): Promise<void> => {
  try {
    await getDatabase().runAsync(
      `INSERT INTO broker (first_name) VALUES (?);`,
      [broker.first_name]
    );
  } catch (err) {
    console.error('❌ Error inserting broker:', err);
    throw err; // Re-throw to allow component to catch and show specific message
  }
};

export const updateBroker = async (id: number, newName: string): Promise<void> => {
  try {
    await getDatabase().runAsync(
      `UPDATE broker
          SET first_name = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?;`,
      [newName, id]
    );
  } catch (err) {
    console.error('❌ Error updating broker:', err);
  }
};

export const deleteBroker = async (id: number): Promise<void> => {
  try {
    await getDatabase().runAsync(`DELETE FROM broker WHERE id = ?;`, [id]);
  } catch (err) {
    console.error('❌ Error deleting broker:', err);
  }
};

export const getBrokers = async (): Promise<Broker[]> => {
  try {
    return await getDatabase().getAllAsync<Broker>(`SELECT * FROM broker ORDER BY id DESC;`);
  } catch (err) {
    console.error('❌ Error fetching brokers:', err);
    return [];
  }
};

//
// 📝 DRIVER_DETAILS CRUD
//

export type DriverDetail = {
  id?: number;
  driver_name: string;
  contact_number?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export const insertDriverDetail = async (detail: DriverDetail): Promise<void> => {
  try {
    await getDatabase().runAsync(
      `INSERT INTO driverDeatils
        (driver_name, contact_number, address, notes)
        VALUES (?, ?, ?, ?);`,
      [
        detail.driver_name,
        detail.contact_number ?? null,
        detail.address ?? null,
        detail.notes ?? null,
      ]
    );
    console.log('✅ Driver details inserted successfully.');
  } catch (err) {
    console.error('❌ Error inserting driver details:', err);
  }
};




export const getDriverDetails = async (): Promise<DriverDetail[]> => {
  try {
    return await getDatabase().getAllAsync<DriverDetail>(`SELECT * FROM driverDeatils ORDER BY id DESC;`);
  } catch (err) {
    console.error('❌ Error fetching driver details:', err);
    return [];
  }
};


export const deleteDatabase = async (): Promise<void> => {
  const dbPath = FileSystem.documentDirectory + 'SQLite/land_measurements.db';
  const info = await FileSystem.getInfoAsync(dbPath);
  if (info.exists) {
    await FileSystem.deleteAsync(dbPath);
    console.log('🗑️ Database deleted. Restart the app to recreate it.');
  } else {
    console.log('ℹ️ Database file does not exist.');
  }
};


//payment methods
export const insertPayment = async (
  measurementId: number,
  amountPaid: number,
  note: string = ""
) => {
  try {
    await getDatabase().runAsync(
      `INSERT INTO payments (measurement_id, amount_paid, note) VALUES (?, ?, ?);`,
      [measurementId, amountPaid, note]
    );
    console.log("✅ Payment saved.");
  } catch (err) {
    console.error("❌ Failed to insert payment:", err);
  }
};

export const updateMeasurementPayment = async (id: number, newPaidAmount: number) => {
  try {
    await getDatabase().runAsync(
      `UPDATE measurements SET paid_amount = ? WHERE id = ?;`,
      [newPaidAmount, id]
    );
    console.log("✅ Measurement payment updated.");
  } catch (err) {
    console.error("❌ Failed to update payment amount:", err);
  }
};



export const getPaymentsWithMeasurement = async (): Promise<any[]> => {
  try {
    return await getDatabase().getAllAsync(`
      SELECT
        payments.id AS payment_id,
        payments.amount_paid,
        payments.paid_at,
        payments.note,
        m.id AS measurement_id,
        m.owner_name,
        m.total,
        m.acr,
        m.price_per_acre,
        m.created_at
      FROM payments
      INNER JOIN measurements m ON payments.measurement_id = m.id
      ORDER BY payments.paid_at DESC;
    `);
  } catch (err) {
    console.error("❌ Error fetching joined payments:", err);
    return [];
  }
};


export const getMeasurementPaymentSummary = async (): Promise<any[]> => {
  try {
    return await getDatabase().getAllAsync(`
      SELECT
        m.id AS measurement_id,
        m.owner_name,
        m.total,
        IFNULL(SUM(p.amount_paid), 0) AS paid_amount
      FROM measurements m
      LEFT JOIN payments p ON p.measurement_id = m.id
      GROUP BY m.id
      ORDER BY m.id DESC;
    `);
  } catch (err) {
    console.error("❌ Error fetching payment summary:", err);
    return [];
  }
};


// Get the total of all 'acr' values
export const getAcr = async (): Promise<number> => {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ totalAcr: number }>(
    `SELECT SUM(acr) AS totalAcr FROM measurements`
  );
  return result?.totalAcr || 0;
};

// Get the total of all 'total' values
export const getTotal = async (): Promise<number> => {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ totalPrice: number }>(
    `SELECT SUM(total) AS totalPrice FROM measurements`
  );
  return result?.totalPrice || 0;
};


