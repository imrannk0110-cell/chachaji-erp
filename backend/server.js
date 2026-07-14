const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Routes Definition
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

// --- ARTICLES / BLOG POSTS ROUTES ---
apiRouter.get('/articles', (req, res) => {
    db.all('SELECT * FROM articles ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/articles', (req, res) => {
    const { title, content, image } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }
    db.run('INSERT INTO articles (title, content, image) VALUES (?, ?, ?)',
        [title, content, image || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, content, image });
    });
});

apiRouter.put('/articles/:id', (req, res) => {
    const { title, content, image } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }
    db.run('UPDATE articles SET title = ?, content = ?, image = ? WHERE id = ?',
        [title, content, image || null, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

apiRouter.delete('/articles/:id', (req, res) => {
    db.run('DELETE FROM articles WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Helper for safe JSON parsing to prevent crash on corrupted DB records
const safeJSONParse = (str, fallback) => {
    if (!str) return fallback;
    try { return JSON.parse(str); }
    catch (e) { return fallback; }
};

// --- DASHBOARD SUMMARY API ---
apiRouter.get('/dashboard/summary', (req, res) => {
    const summary = { totalReceivables: 0, totalPayables: 0, graphData: [] };
    
    // 1. Receivables (Customer Udhaari)
    db.get("SELECT SUM(balance_due) as total FROM orders WHERE balance_due > 0", [], (err, row) => {
        if (!err && row) summary.totalReceivables = row.total || 0;
        
        // 2. Payables (Suppliers)
        db.get("SELECT SUM(opening_balance) as open_bal FROM suppliers", [], (err, sRow) => {
            let supplierBal = (sRow && sRow.open_bal) ? sRow.open_bal : 0;
            
            db.all("SELECT transaction_type, amount FROM supplier_ledger", [], (err, slRows) => {
                if(slRows) slRows.forEach(r => {
                    if (r.transaction_type === 'Cr_Purchase') supplierBal += r.amount;
                    if (r.transaction_type === 'Dr_Payment') supplierBal -= r.amount;
                });
                
                // 3. Payables (Factory Units / Workers)
                db.all("SELECT transaction_type, amount FROM factory_ledger", [], (err, flRows) => {
                    let factoryBal = 0;
                    if(flRows) flRows.forEach(r => {
                        if (r.transaction_type === 'Cr_Manufacturing') factoryBal += r.amount;
                        if (r.transaction_type === 'Dr_Advance') factoryBal -= r.amount;
                    });
                    
                    summary.totalPayables = supplierBal + factoryBal;
                    
                    // 4. Graph Data (Last 7 Days Daybook)
                    db.all("SELECT type, amount, date(created_at, 'localtime') as log_date FROM daybook_expenses WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-7 days') ORDER BY created_at ASC", [], (err, dbRows) => {
                        
                        // Group by date (Last 7 days)
                        const grouped = {};
                        for(let i=6; i>=0; i--) {
                            const d = new Date();
                            d.setDate(d.getDate() - i);
                            const key = d.toISOString().split('T')[0];
                            grouped[key] = { name: d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}), Income: 0, Expense: 0 };
                        }

                        if(dbRows) dbRows.forEach(r => {
                            const dateStr = r.log_date; // SQLite date() returns YYYY-MM-DD
                            if(grouped[dateStr]) {
                                if (r.type.startsWith('Income')) grouped[dateStr].Income += r.amount;
                                if (r.type.startsWith('Expense')) grouped[dateStr].Expense += r.amount;
                            }
                        });

                        summary.graphData = Object.values(grouped);
                        res.json(summary);
                    });
                });
            });
        });
    });
});

// --- ROUNDOFFS ANALYTICS ---
apiRouter.get('/dashboard/roundoffs', (req, res) => {
    db.get("SELECT SUM(discount_amount) as total_discount, COUNT(id) as discount_count FROM orders WHERE discount_amount > 0", [], (err, orderRow) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get("SELECT SUM(amount) as total_bad_debt, COUNT(DISTINCT customer_id) as bad_debt_count FROM bad_debts_cleared", [], (err, badDebtRow) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                preBookTotal: orderRow.total_discount || 0,
                preBookCount: orderRow.discount_count || 0,
                postDeliveryTotal: badDebtRow.total_bad_debt || 0,
                postDeliveryCount: badDebtRow.bad_debt_count || 0
            });
        });
    });
});

// --- DAYBOOK ROUTES ---
apiRouter.get('/daybook', (req, res) => {
    db.all('SELECT * FROM daybook_expenses ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/daybook', (req, res) => {
    const { type, category, amount, description } = req.body;
    db.run('INSERT INTO daybook_expenses (type, category, amount, description) VALUES (?, ?, ?, ?)',
        [type, category, amount, description], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// --- FACTORY UNITS (Alias: Managers) ROUTES ---
const getFactoryUnits = (req, res) => {
    db.all('SELECT * FROM factory_units', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Return with aliases for older frontend files compatibility
        const mapped = rows.map(r => ({
            id: r.id,
            name: r.name,
            workshop_number: r.unit_number,
            unit_number: r.unit_number,
            mobile_number: r.mobile_number,
            stitching_rates: r.stitching_rates || '{}',
            is_active: r.is_active
        }));
        res.json(mapped);
    });
};

apiRouter.get('/factory-units', getFactoryUnits);
apiRouter.get('/managers', getFactoryUnits);

const createFactoryUnit = (req, res) => {
    const { name, unit_number, workshop_number, mobile_number, is_active } = req.body;
    const unitNo = unit_number || workshop_number || '';
    const activeFlag = is_active !== undefined ? is_active : 1;
    db.run('INSERT INTO factory_units (name, unit_number, mobile_number, is_active) VALUES (?, ?, ?, ?)', 
        [name, unitNo, mobile_number, activeFlag], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
};

apiRouter.post('/factory-units', createFactoryUnit);
apiRouter.post('/managers', createFactoryUnit);

const updateFactoryUnit = (req, res) => {
    const { name, unit_number, workshop_number, mobile_number, is_active } = req.body;
    const unitNo = unit_number || workshop_number;
    
    let query = 'UPDATE factory_units SET name = ?';
    let params = [name];

    if (unitNo !== undefined) {
        query += ', unit_number = ?';
        params.push(unitNo);
    }
    if (mobile_number !== undefined) {
        query += ', mobile_number = ?';
        params.push(mobile_number);
    }
    if (is_active !== undefined) {
        query += ', is_active = ?';
        params.push(is_active);
    }
    
    query += ' WHERE id = ?';
    params.push(req.params.id);

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Factory Unit updated' });
    });
};

const updateFactoryRates = (req, res) => {
    const { stitching_rates, mobile_number } = req.body;
    const ratesStr = typeof stitching_rates === 'object' ? JSON.stringify(stitching_rates) : stitching_rates;
    db.run('UPDATE factory_units SET stitching_rates = ?, mobile_number = ? WHERE id = ?',
        [ratesStr, mobile_number, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Factory Unit rates updated' });
    });
};

apiRouter.put('/factory-units/:id', updateFactoryUnit);
apiRouter.put('/managers/:id', updateFactoryUnit);
apiRouter.put('/factory-units/:id/rates', updateFactoryRates);
apiRouter.put('/managers/:id/rates', updateFactoryRates);

const deleteFactoryUnit = (req, res) => {
    db.get('SELECT COUNT(*) as count FROM orders WHERE factory_unit_id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.count > 0) {
            return res.status(400).json({ error: 'Cannot delete Factory Unit because they have existing orders assigned.' });
        }
        
        db.run('DELETE FROM factory_units WHERE id = ?', [req.params.id], function(deleteErr) {
            if (deleteErr) return res.status(500).json({ error: deleteErr.message });
            res.json({ success: true });
        });
    });
};

apiRouter.delete('/factory-units/:id', deleteFactoryUnit);
apiRouter.delete('/managers/:id', deleteFactoryUnit);

// --- SUPPLIERS & LEDGER ROUTES ---
apiRouter.get('/suppliers', (req, res) => {
    db.all(`
        SELECT s.*, 
        s.opening_balance + IFNULL(SUM(CASE WHEN sl.transaction_type = 'Cr_Purchase' THEN sl.amount ELSE 0 END), 0) 
        - IFNULL(SUM(CASE WHEN sl.transaction_type = 'Dr_Payment' THEN sl.amount ELSE 0 END), 0) as net_outstanding
        FROM suppliers s
        LEFT JOIN supplier_ledger sl ON s.id = sl.supplier_id
        GROUP BY s.id
        ORDER BY s.name ASC
    `, [], (err, rows) => {
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
        
        // Auto-log to daybook if it's a payment outgoing
        if (transaction_type === 'Dr_Payment' && parseFloat(amount) > 0) {
            db.run(`INSERT INTO daybook_expenses (type, category, amount, description) VALUES (?, ?, ?, ?)`,
                ['Expense_Supplier', 'Supplier_Payment', parseFloat(amount), `Payment to Supplier ${supplier_id} (Ref: ${reference_no || invoice_no})`]);
        }
        
        res.json({ id: this.lastID });
    });
});

// --- NEXT INVOICE NUMBER API ---
apiRouter.get('/supplier_ledger/next-invoice-no', (req, res) => {
    // Query max invoice_no from both supplier_ledger and products tables
    db.get(`
        SELECT MAX(inv_num) as max_inv FROM (
            SELECT CAST(REPLACE(invoice_no, 'INV-', '') AS INTEGER) as inv_num 
            FROM supplier_ledger WHERE invoice_no LIKE 'INV-%'
            UNION ALL
            SELECT CAST(REPLACE(invoice_no, 'INV-', '') AS INTEGER) as inv_num 
            FROM products WHERE invoice_no LIKE 'INV-%'
        )
    `, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const lastNum = (row && row.max_inv) ? parseInt(row.max_inv) : 1000;
        const nextNo = `INV-${lastNum + 1}`;
        res.json({ next_invoice_no: nextNo });
    });
});

// --- PRODUCTS ROUTES (STOVE INVENTORY) ---
apiRouter.get('/products', (req, res) => {
    db.all(`SELECT p.id, p.sku, p.sku as sku_takano, p.name, p.name as article_name, p.category, p.category as shade_id, p.subcategory, p.total_stock, p.total_stock as total_meters, p.manufacturing_cost, p.manufacturing_cost as purchase_rate, p.retail_price, p.retail_price as selling_price, p.wholesale_price, p.image, p.image as shade_image, p.supplier_id, p.invoice_no, s.name as supplier_name FROM products p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.get('/products/:id', (req, res) => {
    db.get(`SELECT p.id, p.sku, p.sku as sku_takano, p.name, p.name as article_name, p.category, p.category as shade_id, p.subcategory, p.total_stock, p.total_stock as total_meters, p.manufacturing_cost, p.manufacturing_cost as purchase_rate, p.retail_price, p.retail_price as selling_price, p.wholesale_price, p.image, p.image as shade_image, p.supplier_id, p.invoice_no, s.name as supplier_name FROM products p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Product not found" });
        res.json(row);
    });
});

apiRouter.get('/products/invoice/:invoice_no', (req, res) => {
    db.all(`SELECT p.*, s.name as supplier_name FROM products p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id 
            WHERE p.invoice_no = ?`, [req.params.invoice_no], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/products', (req, res) => {
    let { sku, sku_takano, name, article_name, category, shade_id, subcategory, total_stock, total_meters, manufacturing_cost, purchase_rate, retail_price, selling_price, wholesale_price, image, shade_image, supplier_id, invoice_no } = req.body;
    
    const prodSku = sku || sku_takano;
    const prodName = name || article_name;
    const prodCat = category || shade_id;
    const stockQty = total_stock !== undefined ? parseInt(total_stock) : (total_meters !== undefined ? parseInt(total_meters) : 0);
    const mCost = parseFloat(manufacturing_cost) || parseFloat(purchase_rate) || 0;
    const rPrice = parseFloat(retail_price) || parseFloat(selling_price) || 0;
    const wPrice = parseFloat(wholesale_price) || rPrice; // Default wholesale to retail if empty
    const imgBase64 = image || shade_image || null;

    db.run(`INSERT INTO products 
        (sku, name, category, subcategory, total_stock, manufacturing_cost, retail_price, wholesale_price, image, supplier_id, invoice_no) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [prodSku, prodName, prodCat, subcategory, stockQty, mCost, rPrice, wPrice, imgBase64, supplier_id, invoice_no], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, landing_cost: mCost });
    });
});

apiRouter.put('/products/:id/selling_price', (req, res) => {
    const { selling_price, retail_price, wholesale_price } = req.body;
    const rPrice = retail_price || selling_price;
    
    let query = 'UPDATE products SET retail_price = ?';
    let params = [rPrice];
    if (wholesale_price !== undefined) {
        query += ', wholesale_price = ?';
        params.push(wholesale_price);
    }
    query += ' WHERE id = ?';
    params.push(req.params.id);

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

apiRouter.put('/products/:id', (req, res) => {
    let { sku, sku_takano, name, article_name, category, shade_id, subcategory, total_stock, total_meters, manufacturing_cost, purchase_rate, retail_price, selling_price, wholesale_price, supplier_id, invoice_no } = req.body;
    
    const prodSku = sku || sku_takano;
    const prodName = name || article_name;
    const prodCat = category || shade_id;
    const stockQty = total_stock !== undefined ? parseInt(total_stock) : (total_meters !== undefined ? parseInt(total_meters) : 0);
    const mCost = parseFloat(manufacturing_cost) || parseFloat(purchase_rate) || 0;
    const rPrice = parseFloat(retail_price) || parseFloat(selling_price) || 0;
    const wPrice = parseFloat(wholesale_price) || rPrice;

    db.run(`UPDATE products 
        SET sku = ?, name = ?, category = ?, subcategory = ?, total_stock = ?, manufacturing_cost = ?, retail_price = ?, wholesale_price = ?, supplier_id = ?, invoice_no = ? 
        WHERE id = ?`,
        [prodSku, prodName, prodCat, subcategory, stockQty, mCost, rPrice, wPrice, supplier_id, invoice_no, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, landing_cost: mCost });
    });
});

// --- CUSTOMERS ROUTES ---
apiRouter.get('/customers', (req, res) => {
    db.all(`
        SELECT c.*, 
               IFNULL(total_udhaari_table.total_udhaari, 0) as total_udhaari,
               latest_order.id as latest_order_id,
               latest_order.items_json as latest_items_json,
               latest_order.factory_unit_name as latest_manager_name
        FROM customers c
        LEFT JOIN (
            SELECT customer_id, SUM(balance_due) as total_udhaari
            FROM orders
            GROUP BY customer_id
        ) total_udhaari_table ON c.id = total_udhaari_table.customer_id
        LEFT JOIN (
            SELECT o.customer_id, o.id, o.items_json, f.name as factory_unit_name,
                   ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.booked_date DESC) as rn
            FROM orders o
            LEFT JOIN factory_units f ON o.factory_unit_id = f.id
        ) latest_order ON c.id = latest_order.customer_id AND latest_order.rn = 1
        ORDER BY c.name ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Map notes back to master_measurements_json for compatibility
        const mapped = rows.map(r => ({
            ...r,
            master_measurements_json: '{}'
        }));
        res.json(mapped);
    });
});

apiRouter.post('/customers', (req, res) => {
    const { name, phone, faith_tag, dob, email, notes } = req.body;
    const now = new Date().toISOString();
    db.run('INSERT INTO customers (name, phone, faith_tag, dob, email, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, phone, faith_tag, dob, email, notes || '', now], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

apiRouter.get('/customers/search', (req, res) => {
    const q = req.query.q || '';
    const searchPattern = `%${q}%`;
    db.all(`
        SELECT c.*, 
               IFNULL(total_udhaari_table.total_udhaari, 0) as total_udhaari,
               latest_order.id as latest_order_id,
               latest_order.items_json as latest_items_json,
               latest_order.factory_unit_name as latest_manager_name
        FROM customers c
        LEFT JOIN (
            SELECT customer_id, SUM(balance_due) as total_udhaari
            FROM orders
            GROUP BY customer_id
        ) total_udhaari_table ON c.id = total_udhaari_table.customer_id
        LEFT JOIN (
            SELECT o.customer_id, o.id, o.items_json, f.name as factory_unit_name,
                   ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.booked_date DESC) as rn
            FROM orders o
            LEFT JOIN factory_units f ON o.factory_unit_id = f.id
        ) latest_order ON c.id = latest_order.customer_id AND latest_order.rn = 1
        WHERE c.name LIKE ? OR c.phone LIKE ?
        ORDER BY c.name ASC
    `, [searchPattern, searchPattern], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/customers/:id/clear-debt', (req, res) => {
    // Sum the balance_due for all orders of this customer
    db.get("SELECT SUM(balance_due) as total_udhaari FROM orders WHERE customer_id = ? AND balance_due > 0", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const totalUdhaari = row ? (row.total_udhaari || 0) : 0;
        if (totalUdhaari <= 0) return res.status(400).json({ error: "No debt to clear." });
        
        // Log into bad_debts_cleared
        db.run("INSERT INTO bad_debts_cleared (customer_id, amount) VALUES (?, ?)", [req.params.id, totalUdhaari], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Set balance_due to 0 for all their orders
            db.run("UPDATE orders SET balance_due = 0 WHERE customer_id = ? AND balance_due > 0", [req.params.id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, cleared_amount: totalUdhaari });
            });
        });
    });
});

apiRouter.get('/customers/:id/orders', (req, res) => {
    db.all(`SELECT o.*, c.name as customer_name, c.phone as customer_phone 
            FROM orders o 
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.customer_id = ?
            ORDER BY o.booked_date DESC`, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const parsedRows = rows.map(r => ({
            ...r,
            items_json: safeJSONParse(r.items_json, []),
            measurements_json: safeJSONParse(r.custom_specs_json, {}) // Map back for layout
        }));
        res.json(parsedRows);
    });
});

// --- ORDERS ROUTES ---
apiRouter.get('/orders', (req, res) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Auto-transition 'Booked' to 'In Factory' if manager/factory is assigned and date is past
    db.run(`UPDATE orders SET status = 'In Factory' WHERE status = 'Booked' AND factory_unit_id IS NOT NULL AND substr(booked_date, 1, 10) < ?`, [todayStr], (updateErr) => {
        if (updateErr) console.error("Auto-transition error:", updateErr);

        db.all(`SELECT o.*, o.factory_unit_id as manager_id, o.custom_specs_json as measurements_json, o.factory_notes as partial_handover_note, o.factory_done as workshop_done, c.name as customer_name, c.phone as customer_phone, f.name as manager_name 
                FROM orders o 
                LEFT JOIN customers c ON o.customer_id = c.id
                LEFT JOIN factory_units f ON o.factory_unit_id = f.id
                ORDER BY o.booked_date DESC`, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            // Parse JSON fields
            const parsedRows = rows.map(r => ({
                ...r,
                items_json: safeJSONParse(r.items_json, []),
                measurements_json: safeJSONParse(r.measurements_json, {})
            }));
            res.json(parsedRows);
        });
    });
});

apiRouter.post('/orders', (req, res) => {
    const { 
        id, customer_id, manager_id, factory_unit_id, items_json, measurements_json, custom_specs_json,
        sub_total, discount_amount, grand_total, advance_paid, 
        balance_due, cost_basis_total, net_profit, status, gst_applied, 
        booked_date, handover_target_date, delivery_target_date, delivery_date,
        sale_type, order_type
    } = req.body;

    const factId = factory_unit_id || manager_id || null;
    const specsStr = JSON.stringify(custom_specs_json || measurements_json || {});
    const targetDate = delivery_target_date || handover_target_date || null;
    const ordType = order_type || (factId ? 'Custom' : 'Direct');
    const sType = sale_type || 'Retail';

    const initialPaymentHistory = [];
    if (parseFloat(advance_paid) > 0) {
        initialPaymentHistory.push({
            date: new Date().toISOString(),
            amount: parseFloat(advance_paid),
            mode: 'Cash',
            note: ordType === 'Custom' ? 'Advance' : 'Payment'
        });
    }

    db.run(`INSERT INTO orders 
        (id, customer_id, factory_unit_id, items_json, custom_specs_json, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, sale_type, order_type, booked_date, delivery_target_date, delivery_date, payment_history_json) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, customer_id, factId, JSON.stringify(items_json), specsStr, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, sType, ordType, booked_date, targetDate, delivery_date, JSON.stringify(initialPaymentHistory)], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Auto-log to daybook if payment made
        if (parseFloat(advance_paid) > 0) {
            db.run(`INSERT INTO daybook_expenses (type, category, amount, description) VALUES (?, ?, ?, ?)`,
                ['Income_POS', ordType === 'Custom' ? 'Customer_Advance' : 'Customer_Sale', parseFloat(advance_paid), `Payment received for Order ${id}`]);
        }

        // Deduct Inventory Stock (in Pieces)
        const parsedItems = Array.isArray(items_json) ? items_json : [];
        parsedItems.forEach(item => {
            const prodId = item.productId || item.id;
            if (prodId) {
                const qty = parseInt(item.qty) || parseInt(item.fabricMeters) || 1;
                db.run(`UPDATE products SET total_stock = total_stock - ? WHERE id = ?`, [qty, prodId]);
            }
        });

        res.json({ id });
    });
});

apiRouter.put('/orders/:id', (req, res) => {
    const { status, manager_id, factory_unit_id, handover_target_date, delivery_target_date, delivery_date, deliveryPayment, workshop_done, factory_done, partial_handover_note, factory_notes } = req.body;
    
    const factId = factory_unit_id || manager_id;
    const targetDate = delivery_target_date || handover_target_date;
    const factDone = factory_done !== undefined ? (factory_done ? 1 : 0) : (workshop_done !== undefined ? (workshop_done ? 1 : 0) : null);
    const factNote = factory_notes !== undefined ? factory_notes : partial_handover_note;

    db.get('SELECT status, factory_unit_id, cost_basis_total, balance_due, factory_done, factory_notes, items_json, payment_history_json FROM orders WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Order not found' });
        
        const previousStatus = row.status;
        let newBalance = parseFloat(row.balance_due) || 0;
        const newFactoryDone = factDone !== null ? factDone : row.factory_done;
        const newFactoryNote = factNote !== undefined ? factNote : row.factory_notes;
        const finalFactId = factId !== undefined ? factId : row.factory_unit_id;
        
        let itemsData = [];
        try { itemsData = JSON.parse(row.items_json || '[]'); } catch(e){}
        let paymentHistory = [];
        try { paymentHistory = JSON.parse(row.payment_history_json || '[]'); } catch(e){}

        if (status === 'Delivered') {
            itemsData = itemsData.map(item => {
                if (!item.delivered_at) item.delivered_at = new Date().toISOString();
                return item;
            });
        }

        let paymentAmount = 0;
        if (deliveryPayment && deliveryPayment.amount > 0 && status === 'Delivered') {
            paymentAmount = parseFloat(deliveryPayment.amount);
            newBalance = newBalance - paymentAmount;
            if (newBalance < 0) newBalance = 0;
            
            paymentHistory.push({
                date: new Date().toISOString(),
                amount: paymentAmount,
                mode: deliveryPayment.mode || 'Cash',
                note: 'Delivery Payment'
            });

            // Add to Daybook
            db.run(`INSERT INTO daybook_expenses (type, category, amount, description) VALUES (?, ?, ?, ?)`,
                [`Income_${deliveryPayment.mode || 'Cash'}`, 'Customer_Payment', paymentAmount, `Final Delivery Payment for Order ${req.params.id}`]);
        }
        
        db.run(
            'UPDATE orders SET status = ?, factory_unit_id = ?, delivery_target_date = ?, delivery_date = ?, balance_due = ?, factory_done = ?, factory_notes = ?, items_json = ?, payment_history_json = ? WHERE id = ?', 
            [status, finalFactId, targetDate, delivery_date, newBalance, newFactoryDone, newFactoryNote, JSON.stringify(itemsData), JSON.stringify(paymentHistory), req.params.id], 
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                // If status changed to Delivered, and it wasn't already, credit the Factory Unit for labor
                const isCompleted = status === 'Delivered';
                const wasCompleted = previousStatus === 'Delivered';
                
                if (isCompleted && !wasCompleted && finalFactId) {
                    let factoryPayoutTotal = 0;
                    itemsData.forEach(item => {
                        factoryPayoutTotal += (parseFloat(item.managerPayout) || 0);
                    });

                    if (factoryPayoutTotal > 0) {
                        db.run(`INSERT INTO factory_ledger (factory_unit_id, order_id, transaction_type, amount, payment_mode, reference_no) VALUES (?, ?, ?, ?, ?, ?)`,
                            [finalFactId, req.params.id, 'Cr_Manufacturing', factoryPayoutTotal, 'Credit', `Earned from custom fabrication of ${req.params.id}`]);
                    }
                }
                
                res.json({ success: true, balance_due: newBalance });
            }
        );
    });
});

apiRouter.put('/orders/:id/update-date', (req, res) => {
    const { field, value } = req.body;
    let dbField = field;
    if (field === 'handover_target_date') dbField = 'delivery_target_date';

    if (!['delivery_target_date', 'handover_target_date', 'delivery_date'].includes(field)) {
        return res.status(400).json({ error: 'Invalid field' });
    }
    db.run(`UPDATE orders SET ${dbField} = ? WHERE id = ?`, [value, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

apiRouter.put('/orders/:id/undo-delivery', (req, res) => {
    db.get('SELECT status, balance_due, payment_history_json, factory_unit_id FROM orders WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || row.status !== 'Delivered') return res.status(400).json({ error: 'Order is not delivered.' });

        let paymentHistory = [];
        try { paymentHistory = JSON.parse(row.payment_history_json || '[]'); } catch(e){}
        
        let amountToRevert = 0;
        if (paymentHistory.length > 0 && paymentHistory[paymentHistory.length - 1].note === 'Delivery Payment') {
            const lastPayment = paymentHistory.pop();
            amountToRevert = lastPayment.amount;
            
            // Revert daybook
            db.run(`DELETE FROM daybook_expenses WHERE description = ? AND amount = ?`, 
                [`Final Delivery Payment for Order ${req.params.id}`, amountToRevert]);
        }

        const newBalance = parseFloat(row.balance_due) + amountToRevert;

        // Remove factory unit credit
        if (row.factory_unit_id) {
            db.run(`DELETE FROM factory_ledger WHERE order_id = ? AND transaction_type = 'Cr_Manufacturing'`, 
                [req.params.id]);
        }

        db.run('UPDATE orders SET status = ?, balance_due = ?, payment_history_json = ? WHERE id = ?', 
            ['Ready for Trial', newBalance, JSON.stringify(paymentHistory), req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, reverted_amount: amountToRevert });
        });
    });
});

apiRouter.put('/orders/:id/undo-handover', (req, res) => {
    db.run('UPDATE orders SET status = ?, factory_done = 0 WHERE id = ? AND factory_done = 1', 
        ['In Factory', req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

apiRouter.post('/orders/:id/split', (req, res) => {
    const { itemsDoneText, pendingItemsText, newHandoverDate, newDeliveryDate } = req.body;
    
    db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Order not found' });
        
        const newOrderId = `${row.id}-${Math.floor(1000 + Math.random() * 9000)}`;
        const dummyItems = JSON.stringify([{ name: `Pending: ${pendingItemsText}`, qty: 1, price: 0 }]);
        const originalNote = (row.factory_notes ? row.factory_notes + '\n' : '') + `[Split] Items received: ${itemsDoneText}. Pending items split to ${newOrderId}.`;
        const newNote = `[Split from ${row.id}] Pending: ${pendingItemsText}`;
        
        // Update original order
        db.run('UPDATE orders SET factory_notes = ?, status = ? WHERE id = ?', 
            [originalNote, 'Ready for Trial', row.id], function(updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                
                // Insert new sub-order
                db.run(`INSERT INTO orders 
                    (id, customer_id, factory_unit_id, status, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, items_json, booked_date, delivery_target_date, delivery_date, factory_notes, factory_done) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        newOrderId, row.customer_id, row.factory_unit_id, 'In Factory', 
                        0, 0, 0, 0, 0, 0, 
                        dummyItems, row.booked_date, newHandoverDate, newDeliveryDate, newNote, 0
                    ], 
                    function(insertErr) {
                        if (insertErr) return res.status(500).json({ error: insertErr.message });
                        res.json({ success: true, newOrderId, message: 'Order successfully split.' });
                    }
                );
            }
        );
    });
});

apiRouter.put('/orders/:id/clear-debt', (req, res) => {
    const { amount, type, paymentMode } = req.body;
    
    db.get('SELECT balance_due, payment_history_json FROM orders WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Order not found' });
        
        let newBalance = parseFloat(row.balance_due) || 0;
        const settlementAmount = parseFloat(amount) || 0;
        
        let paymentHistory = [];
        try { paymentHistory = JSON.parse(row.payment_history_json || '[]'); } catch(e){}

        if (settlementAmount > 0) {
            paymentHistory.push({
                date: new Date().toISOString(),
                amount: settlementAmount,
                mode: paymentMode || 'Cash',
                note: type === 'Payment' ? 'Debt Cleared' : 'Bad Debt Write-off'
            });
        }

        newBalance -= settlementAmount;
        if (newBalance < 0) newBalance = 0;
        
        db.run('UPDATE orders SET balance_due = ?, payment_history_json = ? WHERE id = ?', [newBalance, JSON.stringify(paymentHistory), req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // If it's an actual payment, add to daybook
            if (type === 'Payment' && settlementAmount > 0) {
                db.run(`INSERT INTO daybook_expenses (type, category, amount, description) VALUES (?, ?, ?, ?)`,
                    [`Income_${paymentMode || 'Cash'}`, 'Customer_Payment', settlementAmount, `Cleared Dues for Order ${req.params.id}`]);
            }
            
            res.json({ success: true, balance_due: newBalance });
        });
    });
});

// --- FACTORY LEDGER (Alias: Manager Ledger) ROUTES ---
const getFactoryLedger = (req, res) => {
    db.all('SELECT * FROM factory_ledger WHERE factory_unit_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

apiRouter.get('/factory-units/:id/ledger', getFactoryLedger);
apiRouter.get('/managers/:id/ledger', getFactoryLedger);

const createFactoryLedger = (req, res) => {
    const { factory_unit_id, manager_id, amount, payment_mode, reference_no } = req.body;
    const fId = factory_unit_id || manager_id;
    
    db.run(`INSERT INTO factory_ledger (factory_unit_id, transaction_type, amount, payment_mode, reference_no) VALUES (?, ?, ?, ?, ?)`,
        [fId, 'Dr_Advance', amount, payment_mode, reference_no], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Auto-log into Daybook as an Expense
        db.run(`INSERT INTO daybook_expenses (type, category, amount, description) VALUES (?, ?, ?, ?)`,
            ['Expense_Factory', `FactoryUnit_${fId}`, amount, `Advance paid to Factory Unit: ${reference_no}`]);

        res.json({ id: this.lastID });
    });
};

apiRouter.post('/factory-ledger', createFactoryLedger);
apiRouter.post('/manager_ledger', createFactoryLedger);

// --- EXPORT ROUTES ---
const { Parser } = require('json2csv');

apiRouter.get('/export/master', (req, res) => {
    const tables = ['suppliers', 'supplier_ledger', 'products', 'customers', 'orders', 'factory_units'];
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

apiRouter.get('/export/master/json', (req, res) => {
    const tables = ['suppliers', 'supplier_ledger', 'products', 'customers', 'orders', 'factory_units', 'factory_ledger', 'daybook_expenses', 'bad_debts_cleared', 'settings'];
    let results = {};
    let completed = 0;

    tables.forEach(table => {
        db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
            // Alias map for compatibility
            let outputRows = rows || [];
            if (table === 'factory_units') {
                outputRows = outputRows.map(r => ({ ...r, workshop_number: r.unit_number }));
            }
            if (!err && outputRows.length > 0) {
                results[table] = outputRows;
            } else {
                results[table] = [];
            }
            completed++;
            if (completed === tables.length) {
                res.json(results);
            }
        });
    });
});

apiRouter.get('/export/database', (req, res) => {
    // Force WAL checkpoint to ensure all data is written to the main .db file before downloading
    db.run('PRAGMA wal_checkpoint(TRUNCATE)', (err) => {
        if (err) console.error("Checkpoint error:", err);
        
        const dbPath = path.resolve(__dirname, 'hd_safa.db');
        res.download(dbPath, `ChachajiUdyog_Backup_${new Date().toISOString().split('T')[0]}.db`, (downloadErr) => {
            if (downloadErr) {
                console.error("Database download error:", downloadErr);
                if (!res.headersSent) res.status(500).send("Error downloading database file");
            }
        });
    });
});

apiRouter.get('/customers/:id/measurements', (req, res) => {
    db.get('SELECT notes FROM customers WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || !row.notes) return res.json({});
        res.json({ notes: row.notes });
    });
});

apiRouter.post('/customers/:id/measurements', (req, res) => {
    const { notes } = req.body;
    db.run('UPDATE customers SET notes = ? WHERE id = ?', [notes || '', req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- LEADS / INQUIRIES ROUTES ---
apiRouter.post('/leads', (req, res) => {
    const { name, phone, email, type, message } = req.body;
    if (!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required' });
    }
    db.run(
        'INSERT INTO leads (name, phone, email, type, message, status) VALUES (?, ?, ?, ?, ?, ?)',
        [name, phone, email || '', type || 'General Enquiry', message || '', 'Pending'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, leadId: this.lastID });
        }
    );
});

apiRouter.get('/leads', (req, res) => {
    db.all('SELECT * FROM leads ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.put('/leads/:id', (req, res) => {
    const { status } = req.body;
    db.run(
        'UPDATE leads SET status = ? WHERE id = ?',
        [status, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

apiRouter.delete('/leads/:id', (req, res) => {
    db.run('DELETE FROM leads WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
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
        db.run('PRAGMA wal_checkpoint(TRUNCATE)', (err) => {
            if (err) console.error("Auto-backup checkpoint error:", err);
            
            fs.copyFile(sourceFile, backupFile, (err) => {
                if (err) {
                    console.error('Backup failed:', err);
                } else {
                    console.log(`Auto-backup completed: ${backupFile}`);
                }
            });
        });
    }
}

// Run backup every 4 hours
setInterval(performBackup, 14400000);
// Also run a backup 10 seconds after boot
setTimeout(performBackup, 10000);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
    });
}

app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`=============================================`);
    console.log(` Chachaji Udyog ERP Backend Started`);
    console.log(` -> Local Network Access: http://${localIp}:${PORT}`);
    console.log(` -> Frontend Network Access (Expected): http://${localIp}:3000`);
    console.log(`=============================================`);
});
