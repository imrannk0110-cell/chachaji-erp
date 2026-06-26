const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'hd_safa.db');

// --- Auto Backup Mechanism ---
const backupDir = path.resolve(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}
const todayString = new Date().toISOString().split('T')[0];
const backupFile = path.join(backupDir, `hd_safa_backup_${todayString}.db`);

if (fs.existsSync(dbPath) && !fs.existsSync(backupFile)) {
    try {
        fs.copyFileSync(dbPath, backupFile);
        console.log(`[Backup] Successfully created daily backup: ${backupFile}`);
    } catch (err) {
        console.error('[Backup Error] Failed to create backup:', err);
    }
}
// -----------------------------

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // --- Critical Performance PRAGMAs for Windows/Localhost ---
        db.run('PRAGMA journal_mode = WAL;');
        db.run('PRAGMA busy_timeout = 5000;');
        db.run('PRAGMA synchronous = NORMAL;');
        
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
                article_name TEXT,
                shade_id TEXT, -- max 7 chars enforced in app logic
                total_meters REAL,
                purchase_rate REAL,
                gst_percentage REAL,
                landing_cost REAL,
                selling_price REAL,
                shade_image TEXT, -- Base64
                supplier_id INTEGER,
                invoice_no TEXT,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
            )`);

            // Customers
            db.run(`CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT UNIQUE,
                faith_tag TEXT, -- 'General', 'Hindu', 'Muslim'
                dob TEXT, -- YYYY-MM-DD
                master_measurements_json TEXT DEFAULT '{}'
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
                payment_history_json TEXT DEFAULT '[]',
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (manager_id) REFERENCES managers (id)
            )`);

            // Managers
            db.run(`CREATE TABLE IF NOT EXISTS managers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                workshop_number TEXT,
                mobile_number TEXT,
                stitching_rates TEXT DEFAULT '{}'
            )`);

            // Manager Ledger
            db.run(`CREATE TABLE IF NOT EXISTS manager_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                manager_id INTEGER,
                order_id TEXT,
                transaction_type TEXT, -- 'Cr_Stitching' or 'Dr_Advance'
                amount REAL,
                payment_mode TEXT,
                reference_no TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (manager_id) REFERENCES managers (id)
            )`);

            // Settings
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`);

            // Initial Settings seed
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('stitching_rates', '{"Pant": 500, "Shirt": 400, "Kurta": 450, "Pajama": 300, "Sherwani": 5000, "Coat": 2500, "Nehru Jacket": 1500, "V-Jacket": 1200, "Indowestern": 4000, "Achkan": 4500}')`);
            
            // Daybook & Expenses
            db.run(`CREATE TABLE IF NOT EXISTS daybook_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT, -- 'Income_POS', 'Income_Manual', 'Expense_Supplier', 'Expense_Shop'
                category TEXT,
                amount REAL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }
});

module.exports = db;
