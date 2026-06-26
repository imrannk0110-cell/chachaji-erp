const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            // Suppliers
            db.run(`CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                gstin TEXT,
                address TEXT,
                mobile TEXT,
                opening_balance REAL DEFAULT 0
            )`);

            // Supplier Ledger
            db.run(`CREATE TABLE IF NOT EXISTS supplier_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_id INTEGER,
                invoice_no TEXT,
                transaction_type TEXT, -- 'Cr_Purchase' or 'Dr_Payment'
                amount REAL,
                payment_mode TEXT,
                reference_no TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
            )`);

            // Products
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku_takano TEXT UNIQUE,
                shade_id TEXT, -- max 7 chars enforced in app logic
                total_meters REAL,
                purchase_rate REAL,
                gst_percentage REAL,
                landing_cost REAL,
                selling_price REAL,
                shade_image TEXT, -- Base64
                supplier_id INTEGER,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
            )`);

            // Customers
            db.run(`CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT UNIQUE,
                faith_tag TEXT, -- 'General', 'Hindu', 'Muslim'
                dob TEXT -- YYYY-MM-DD
            )`);

            // Orders
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                customer_id INTEGER,
                manager_id INTEGER,
                items_json TEXT,
                measurements_json TEXT,
                sub_total REAL,
                discount_amount REAL,
                grand_total REAL,
                advance_paid REAL,
                balance_due REAL,
                cost_basis_total REAL,
                net_profit REAL,
                status TEXT, -- 'Booked', 'In Workshop', 'Ready for Trial', 'Delivered'
                gst_applied BOOLEAN,
                booked_date TEXT,
                handover_target_date TEXT,
                delivery_date TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (manager_id) REFERENCES managers (id)
            )`);

            // Managers
            db.run(`CREATE TABLE IF NOT EXISTS managers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                workshop_number TEXT,
                mobile_number TEXT
            )`);

            // Settings
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`);

            // Initial Settings seed
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('stitching_rates', '{"Pant": 500, "Shirt": 400, "Kurta": 450, "Coat": 2500, "Safa": 100}')`);
        });
    }
});

module.exports = db;
