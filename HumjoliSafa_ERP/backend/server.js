const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = 5000;

app.use(cors());
// Increase payload limit for Base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Utility: Get Local IP
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// Routes Definition (Modularized for speed)
const apiRouter = express.Router();

// --- SYSTEM ROUTES ---
apiRouter.get('/system/ip', (req, res) => {
    res.json({ ip: getLocalIp(), backendPort: PORT, frontendPort: 3000 });
});

// --- SETTINGS ROUTES ---
apiRouter.get('/settings', (req, res) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

apiRouter.post('/settings', (req, res) => {
    const { key, value } = req.body;
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- MANAGERS ROUTES ---
apiRouter.get('/managers', (req, res) => {
    db.all('SELECT * FROM managers', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/managers', (req, res) => {
    const { name, workshop_number, mobile_number } = req.body;
    db.run('INSERT INTO managers (name, workshop_number, mobile_number) VALUES (?, ?, ?)', 
        [name, workshop_number, mobile_number], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// --- SUPPLIERS & LEDGER ROUTES ---
apiRouter.get('/suppliers', (req, res) => {
    db.all('SELECT * FROM suppliers', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/suppliers', (req, res) => {
    const { name, gstin, address, mobile, opening_balance } = req.body;
    db.run('INSERT INTO suppliers (name, gstin, address, mobile, opening_balance) VALUES (?, ?, ?, ?, ?)',
        [name, gstin, address, mobile, opening_balance || 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

apiRouter.get('/suppliers/:id/ledger', (req, res) => {
    db.all('SELECT * FROM supplier_ledger WHERE supplier_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/supplier_ledger', (req, res) => {
    const { supplier_id, invoice_no, transaction_type, amount, payment_mode, reference_no } = req.body;
    db.run(`INSERT INTO supplier_ledger 
        (supplier_id, invoice_no, transaction_type, amount, payment_mode, reference_no) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [supplier_id, invoice_no, transaction_type, amount, payment_mode, reference_no], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// --- PRODUCTS ROUTES ---
apiRouter.get('/products', (req, res) => {
    db.all(`SELECT p.*, s.name as supplier_name FROM products p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/products', (req, res) => {
    let { sku_takano, shade_id, total_meters, purchase_rate, gst_percentage, selling_price, shade_image, supplier_id } = req.body;
    
    // Logic: enforce max 7 chars for shade_id
    if (shade_id && shade_id.length > 7) {
        return res.status(400).json({ error: "Shade ID must be 7 characters or less." });
    }

    // Logic: auto-calculate landing cost
    const pr = parseFloat(purchase_rate) || 0;
    const gst = parseFloat(gst_percentage) || 0;
    const landing_cost = pr + (pr * (gst / 100));

    db.run(`INSERT INTO products 
        (sku_takano, shade_id, total_meters, purchase_rate, gst_percentage, landing_cost, selling_price, shade_image, supplier_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sku_takano, shade_id, total_meters, purchase_rate, gst_percentage, landing_cost, selling_price, shade_image, supplier_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, landing_cost });
    });
});

// --- CUSTOMERS ROUTES ---
apiRouter.get('/customers', (req, res) => {
    db.all('SELECT * FROM customers', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/customers', (req, res) => {
    const { name, phone, faith_tag, dob } = req.body;
    db.run('INSERT INTO customers (name, phone, faith_tag, dob) VALUES (?, ?, ?, ?)',
        [name, phone, faith_tag, dob], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// --- ORDERS ROUTES ---
apiRouter.get('/orders', (req, res) => {
    db.all(`SELECT o.*, c.name as customer_name, c.phone as customer_phone, m.name as manager_name 
            FROM orders o 
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN managers m ON o.manager_id = m.id
            ORDER BY o.booked_date DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse JSON fields
        const parsedRows = rows.map(r => ({
            ...r,
            items_json: JSON.parse(r.items_json || '[]'),
            measurements_json: JSON.parse(r.measurements_json || '{}')
        }));
        res.json(parsedRows);
    });
});

apiRouter.post('/orders', (req, res) => {
    const { 
        id, customer_id, manager_id, items_json, measurements_json, 
        sub_total, discount_amount, grand_total, advance_paid, 
        balance_due, cost_basis_total, net_profit, status, gst_applied, 
        booked_date, handover_target_date, delivery_date 
    } = req.body;

    db.run(`INSERT INTO orders 
        (id, customer_id, manager_id, items_json, measurements_json, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied, booked_date, handover_target_date, delivery_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, customer_id, manager_id, JSON.stringify(items_json), JSON.stringify(measurements_json), sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied ? 1 : 0, booked_date, handover_target_date, delivery_date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id });
    });
});

apiRouter.put('/orders/:id/status', (req, res) => {
    const { status, manager_id } = req.body;
    db.run('UPDATE orders SET status = ?, manager_id = ? WHERE id = ?', [status, manager_id, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- EXPORT ROUTES ---
const { Parser } = require('json2csv');

apiRouter.get('/export/master', (req, res) => {
    const tables = ['suppliers', 'supplier_ledger', 'products', 'customers', 'orders', 'managers'];
    let results = {};
    let completed = 0;

    tables.forEach(table => {
        db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
            if (!err && rows.length > 0) {
                const json2csvParser = new Parser();
                results[table] = json2csvParser.parse(rows);
            } else {
                results[table] = "";
            }
            completed++;
            if (completed === tables.length) {
                res.json(results);
            }
        });
    });
});


app.use('/api', apiRouter);

// --- AUTOMATED BACKUP DAEMON ---
function performBackup() {
    const dateObj = new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const timeStr = `${String(hours).padStart(2, '0')}-${minutes}-${ampm}`;

    const backupDir = path.join(__dirname, 'backups', dateStr);
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `backup_${timeStr}.db`);
    const sourceFile = path.join(__dirname, 'hd_safa.db');

    if (fs.existsSync(sourceFile)) {
        fs.copyFile(sourceFile, backupFile, (err) => {
            if (err) {
                console.error('Backup failed:', err);
            } else {
                console.log(`Auto-backup completed: ${backupFile}`);
            }
        });
    }
}

// Run backup every 4 hours (14400000 ms)
setInterval(performBackup, 14400000);
// Also run a backup 10 seconds after boot to ensure it works
setTimeout(performBackup, 10000);

app.listen(PORT, () => {
    const localIp = getLocalIp();
    console.log(`=============================================`);
    console.log(` Humjoli Safa ERP Backend Started`);
    console.log(` -> Local Network Access: http://${localIp}:${PORT}`);
    console.log(` -> Frontend Network Access (Expected): http://${localIp}:3000`);
    console.log(`=============================================`);
});
