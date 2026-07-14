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

            // Products (Stove Inventory)
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT UNIQUE,
                name TEXT NOT NULL,
                category TEXT,
                subcategory TEXT,
                total_stock INTEGER DEFAULT 0,
                manufacturing_cost REAL DEFAULT 0,
                retail_price REAL DEFAULT 0,
                wholesale_price REAL DEFAULT 0,
                image TEXT, -- Base64 product image
                supplier_id INTEGER,
                invoice_no TEXT,
                FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
            )`);

            // Customers
            db.run(`CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT UNIQUE,
                email TEXT,
                dob TEXT, -- YYYY-MM-DD
                notes TEXT DEFAULT '',
                created_at TEXT
            )`);

            // Factory Units (Replaced Managers/Workshops)
            db.run(`CREATE TABLE IF NOT EXISTS factory_units (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                unit_number TEXT,
                mobile_number TEXT,
                is_active INTEGER DEFAULT 1,
                stitching_rates TEXT DEFAULT '{}'
            )`);
            
            db.run("ALTER TABLE factory_units ADD COLUMN stitching_rates TEXT DEFAULT '{}'", (err) => {
                // Ignore error if column already exists
            });

            // Orders
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                customer_id INTEGER,
                factory_unit_id INTEGER,
                items_json TEXT, -- [{productId, name, qty, price, type}]
                custom_specs_json TEXT, -- {dimensions, burnerType, bodyMaterial, regulatorType, instructions}
                sub_total REAL,
                discount_amount REAL,
                grand_total REAL,
                advance_paid REAL,
                balance_due REAL,
                cost_basis_total REAL,
                net_profit REAL,
                status TEXT, -- 'Booked', 'In Factory', 'Ready for Trial', 'Delivered'
                sale_type TEXT, -- 'Retail' or 'Wholesale'
                order_type TEXT, -- 'Direct' or 'Custom'
                booked_date TEXT,
                delivery_target_date TEXT,
                delivery_date TEXT,
                payment_history_json TEXT DEFAULT '[]',
                factory_notes TEXT,
                factory_done INTEGER DEFAULT 0,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (factory_unit_id) REFERENCES factory_units (id)
            )`);

            // Bad Debts Cleared (Post-Delivery Roundoff)
            db.run(`CREATE TABLE IF NOT EXISTS bad_debts_cleared (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                amount REAL,
                cleared_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Factory Ledger (Replaced Manager Ledger)
            db.run(`CREATE TABLE IF NOT EXISTS factory_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                factory_unit_id INTEGER,
                order_id TEXT,
                transaction_type TEXT, -- 'Cr_Manufacturing' or 'Dr_Advance'
                amount REAL,
                payment_mode TEXT,
                reference_no TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (factory_unit_id) REFERENCES factory_units (id)
            )`);

            // Settings
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`);

            // Initial Settings seed for Chachaji Udyog
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_number', '7300070513')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('categories', '["Single Stove Burner - SS", "Single Stove Burner - Iron (MS)", "Double Stove Burner", "Three Stove Burner", "Four Stove Burner", "Commercial Burner", "Regulator", "Spare Parts"]')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_name', 'Chachaji Udyog')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_phone', '7300070513')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_address', 'Industrial Area Phase II, Jaipur, Rajasthan, 302012')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('social_facebook', 'https://facebook.com')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('social_instagram', 'https://instagram.com')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('social_youtube', 'https://youtube.com')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('social_linkedin', 'https://linkedin.com')`);

            // Auto-migrate categories and product references if old format exists
            db.get("SELECT value FROM settings WHERE key = 'categories'", [], (err, row) => {
                if (!err && row) {
                    try {
                        const cats = JSON.parse(row.value);
                        if (cats.includes("Single Stove Burner") && !cats.includes("Single Stove Burner - SS")) {
                            const newCats = [
                                "Single Stove Burner - SS",
                                "Single Stove Burner - Iron (MS)",
                                ...cats.filter(c => c !== "Single Stove Burner")
                            ];
                            db.run("UPDATE settings SET value = ? WHERE key = 'categories'", [JSON.stringify(newCats)]);
                            db.run("UPDATE products SET category = 'Single Stove Burner - SS' WHERE category = 'Single Stove Burner'");
                            console.log("[Migration] Categories and products updated to include Single Stove Burner varieties.");
                        }
                    } catch (e) {
                        console.error("[Migration Error] Failed to parse categories settings:", e);
                    }
                }
            });
            
            // Articles / Posts
            db.run(`CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                image TEXT, -- Base64 article image
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Daybook & Expenses
            db.run(`CREATE TABLE IF NOT EXISTS daybook_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT, -- 'Income_POS', 'Income_Manual', 'Expense_Supplier', 'Expense_Factory', 'Expense_Shop'
                category TEXT,
                amount REAL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Leads / Inquiries from public website
            db.run(`CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                type TEXT, -- 'Custom Manufacturing', 'Commercial Fitting', 'Product Purchase', 'General Enquiry'
                message TEXT,
                status TEXT DEFAULT 'Pending', -- 'Pending', 'Contacted', 'Completed'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }
});

module.exports = db;
