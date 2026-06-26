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

// --- DASHBOARD SUMMARY API ---
apiRouter.get('/dashboard/summary', (req, res) => {
    const summary = { totalReceivables: 0, totalPayables: 0, graphData: [] };
    
    // 1. Receivables
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
                
                // 3. Payables (Managers)
                db.all("SELECT transaction_type, amount FROM manager_ledger", [], (err, mlRows) => {
                    let managerBal = 0;
                    if(mlRows) mlRows.forEach(r => {
                        if (r.transaction_type === 'Cr_Stitching') managerBal += r.amount;
                        if (r.transaction_type === 'Dr_Advance') managerBal -= r.amount;
                    });
                    
                    summary.totalPayables = supplierBal + managerBal;
                    
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

apiRouter.put('/managers/:id/rates', (req, res) => {
    const { stitching_rates } = req.body;
    // Ensure stitching_rates is a valid JSON string before saving
    let ratesString = '{}';
    if (typeof stitching_rates === 'object') ratesString = JSON.stringify(stitching_rates);
    else if (typeof stitching_rates === 'string') ratesString = stitching_rates;

    db.run('UPDATE managers SET stitching_rates = ? WHERE id = ?', 
        [ratesString, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Stitching rates updated' });
    });
});

apiRouter.delete('/managers/:id', (req, res) => {
    db.run('DELETE FROM managers WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

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

// --- PRODUCTS ROUTES ---
apiRouter.get('/products', (req, res) => {
    db.all(`SELECT p.id, p.sku_takano, p.article_name, p.shade_id, p.total_meters, p.purchase_rate, p.gst_percentage, p.landing_cost, p.selling_price, p.supplier_id, p.invoice_no, s.name as supplier_name FROM products p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
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
    let { sku_takano, article_name, shade_id, total_meters, purchase_rate, gst_percentage, selling_price, shade_image, supplier_id, invoice_no } = req.body;
    
    // Logic: enforce max 7 chars for shade_id
    if (shade_id && shade_id.length > 7) {
        return res.status(400).json({ error: "Shade ID must be 7 characters or less." });
    }

    // Logic: auto-calculate landing cost
    const pr = parseFloat(purchase_rate) || 0;
    const gst = parseFloat(gst_percentage) || 0;
    const landing_cost = pr + (pr * (gst / 100));

    db.run(`INSERT INTO products 
        (sku_takano, article_name, shade_id, total_meters, purchase_rate, gst_percentage, landing_cost, selling_price, shade_image, supplier_id, invoice_no) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sku_takano, article_name, shade_id, total_meters, purchase_rate, gst_percentage, landing_cost, selling_price, shade_image, supplier_id, invoice_no], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, landing_cost });
    });
});

apiRouter.put('/products/:id/selling_price', (req, res) => {
    const { selling_price } = req.body;
    db.run('UPDATE products SET selling_price = ? WHERE id = ?', [selling_price, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- CUSTOMERS ROUTES ---
apiRouter.get('/customers', (req, res) => {
    db.all(`
        SELECT c.*, 
               IFNULL(total_udhaari_table.total_udhaari, 0) as total_udhaari,
               latest_order.id as latest_order_id,
               latest_order.items_json as latest_items_json,
               latest_order.manager_name as latest_manager_name
        FROM customers c
        LEFT JOIN (
            SELECT customer_id, SUM(balance_due) as total_udhaari
            FROM orders
            GROUP BY customer_id
        ) total_udhaari_table ON c.id = total_udhaari_table.customer_id
        LEFT JOIN (
            SELECT o.customer_id, o.id, o.items_json, m.name as manager_name,
                   ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.booked_date DESC) as rn
            FROM orders o
            LEFT JOIN managers m ON o.manager_id = m.id
        ) latest_order ON c.id = latest_order.customer_id AND latest_order.rn = 1
        ORDER BY c.name ASC
    `, [], (err, rows) => {
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

apiRouter.get('/customers/search', (req, res) => {
    const q = req.query.q || '';
    const searchPattern = `%${q}%`;
    db.all(`
        SELECT c.*, 
               IFNULL(total_udhaari_table.total_udhaari, 0) as total_udhaari,
               latest_order.id as latest_order_id,
               latest_order.items_json as latest_items_json,
               latest_order.manager_name as latest_manager_name
        FROM customers c
        LEFT JOIN (
            SELECT customer_id, SUM(balance_due) as total_udhaari
            FROM orders
            GROUP BY customer_id
        ) total_udhaari_table ON c.id = total_udhaari_table.customer_id
        LEFT JOIN (
            SELECT o.customer_id, o.id, o.items_json, m.name as manager_name,
                   ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.booked_date DESC) as rn
            FROM orders o
            LEFT JOIN managers m ON o.manager_id = m.id
        ) latest_order ON c.id = latest_order.customer_id AND latest_order.rn = 1
        WHERE c.name LIKE ? OR c.phone LIKE ?
        ORDER BY c.name ASC
    `, [searchPattern, searchPattern], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
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
            items_json: JSON.parse(r.items_json || '[]'),
            measurements_json: JSON.parse(r.measurements_json || '{}')
        }));
        res.json(parsedRows);
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

    const initialPaymentHistory = [];
    if (parseFloat(advance_paid) > 0) {
        initialPaymentHistory.push({
            date: new Date().toISOString(),
            amount: parseFloat(advance_paid),
            mode: 'Cash',
            note: 'Advance'
        });
    }

    db.run(`INSERT INTO orders 
        (id, customer_id, manager_id, items_json, measurements_json, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied, booked_date, handover_target_date, delivery_date, payment_history_json) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, customer_id, manager_id, JSON.stringify(items_json), JSON.stringify(measurements_json), sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied ? 1 : 0, booked_date, handover_target_date, delivery_date, JSON.stringify(initialPaymentHistory)], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Auto-log to daybook if advance paid
        if (parseFloat(advance_paid) > 0) {
            db.run(`INSERT INTO daybook_expenses (type, category, amount, description) VALUES (?, ?, ?, ?)`,
                ['Income_POS', 'Customer_Advance', parseFloat(advance_paid), `Advance received for Order ${id}`]);
        }

        res.json({ id });
    });
});

apiRouter.put('/orders/:id', (req, res) => {
    const { status, manager_id, handover_target_date, delivery_date, deliveryPayment, workshop_done, partial_handover_note } = req.body;
    
    // First, check previous status to avoid double crediting
    db.get('SELECT status, cost_basis_total, balance_due, workshop_done, partial_handover_note, items_json, payment_history_json FROM orders WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const previousStatus = row ? row.status : '';
        const costBasisTotal = row ? row.cost_basis_total : 0;
        let newBalance = row ? parseFloat(row.balance_due) : 0;
        const newWorkshopDone = workshop_done !== undefined ? (workshop_done ? 1 : 0) : (row ? row.workshop_done : 0);
        const newPartialNote = partial_handover_note !== undefined ? partial_handover_note : (row ? row.partial_handover_note : null);
        
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
            'UPDATE orders SET status = ?, manager_id = ?, handover_target_date = ?, delivery_date = ?, balance_due = ?, workshop_done = ?, partial_handover_note = ?, items_json = ?, payment_history_json = ? WHERE id = ?', 
            [status, manager_id, handover_target_date, delivery_date, newBalance, newWorkshopDone, newPartialNote, JSON.stringify(itemsData), JSON.stringify(paymentHistory), req.params.id], 
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                // If status changed to Delivered, and it wasn't already, credit the manager
                const isCompleted = status === 'Delivered';
                const wasCompleted = previousStatus === 'Delivered';
                
                if (isCompleted && !wasCompleted && manager_id && costBasisTotal > 0) {
                    db.run(`INSERT INTO manager_ledger (manager_id, order_id, transaction_type, amount, payment_mode, reference_no) VALUES (?, ?, ?, ?, ?, ?)`,
                        [manager_id, req.params.id, 'Cr_Stitching', costBasisTotal, 'Credit', `Earned from ${req.params.id}`]);
                }
                
                res.json({ success: true, balance_due: newBalance });
            }
        );
    });
});

apiRouter.post('/orders/:id/split', (req, res) => {
    const { itemsDoneText, pendingItemsText, newHandoverDate, newDeliveryDate } = req.body;
    
    db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Order not found' });
        
        const newOrderId = `${row.id}-${Math.floor(1000 + Math.random() * 9000)}`;
        const dummyItems = JSON.stringify([{ name: `Pending: ${pendingItemsText}`, price: 0 }]);
        const originalNote = (row.partial_handover_note ? row.partial_handover_note + '\n' : '') + `[Split] Items received: ${itemsDoneText}. Pending items split to ${newOrderId}.`;
        const newNote = `[Split from ${row.id}] Pending: ${pendingItemsText}`;
        
        // Update original order
        db.run('UPDATE orders SET partial_handover_note = ?, status = ? WHERE id = ?', 
            [originalNote, 'Ready for Trial', row.id], function(updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                
                // Insert new sub-order
                db.run(`INSERT INTO orders 
                    (id, customer_id, manager_id, status, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, items_json, booked_date, handover_target_date, delivery_date, partial_handover_note, workshop_done) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        newOrderId, row.customer_id, row.manager_id, 'In workshop', 
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
            // If type === 'BadDebt', we do not insert into daybook as per requirements.
            
            res.json({ success: true, balance_due: newBalance });
        });
    });
});

// --- MANAGER LEDGER ROUTES ---
apiRouter.get('/managers/:id/ledger', (req, res) => {
    db.all('SELECT * FROM manager_ledger WHERE manager_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/manager_ledger', (req, res) => {
    const { manager_id, amount, payment_mode, reference_no } = req.body;
    
    db.run(`INSERT INTO manager_ledger (manager_id, transaction_type, amount, payment_mode, reference_no) VALUES (?, ?, ?, ?, ?)`,
        [manager_id, 'Dr_Advance', amount, payment_mode, reference_no], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Auto-log into Daybook as an Expense
        db.run(`INSERT INTO daybook_expenses (type, category, amount, description) VALUES (?, ?, ?, ?)`,
            ['Expense_Shop', `Manager_${manager_id}`, amount, `Advance paid to Manager: ${reference_no}`]);

        res.json({ id: this.lastID });
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

apiRouter.get('/customers/:id/measurements', (req, res) => {
    db.get('SELECT master_measurements_json FROM customers WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || !row.master_measurements_json) return res.json({});
        try {
            res.json(JSON.parse(row.master_measurements_json));
        } catch (e) {
            res.json({});
        }
    });
});

apiRouter.post('/customers/:id/measurements', (req, res) => {
    db.run('UPDATE customers SET master_measurements_json = ? WHERE id = ?', [JSON.stringify(req.body), req.params.id], function(err) {
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

// --- SERVE FRONTEND IN PRODUCTION ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
    });
}

app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`=============================================`);
    console.log(` Humjoli Safa ERP Backend Started`);
    console.log(` -> Local Network Access: http://${localIp}:${PORT}`);
    console.log(` -> Frontend Network Access (Expected): http://${localIp}:3000`);
    console.log(`=============================================`);
});
