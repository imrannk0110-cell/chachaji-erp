const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath);

console.log("Starting Hardcore Seed Script...");

// Utility to generate random dates
const today = new Date();
const formatDate = (date) => date.toISOString().split('T')[0];
const addDays = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return formatDate(d);
};

const runAsync = (query, params) => new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
    });
});

async function seed() {
    try {
        // Clear all tables for a fresh test
        console.log("Clearing old data...");
        await runAsync('DELETE FROM orders');
        await runAsync('DELETE FROM manager_ledger');
        await runAsync('DELETE FROM managers');
        await runAsync('DELETE FROM daybook_expenses');
        await runAsync('DELETE FROM products');
        await runAsync('DELETE FROM supplier_ledger');
        await runAsync('DELETE FROM suppliers');
        await runAsync('DELETE FROM customers');
        
        console.log("Seeding Managers...");
        const m1 = await runAsync('INSERT INTO managers (name, workshop_number, mobile_number) VALUES (?,?,?)', ['Akram', '1', '9876543210']);
        const m2 = await runAsync('INSERT INTO managers (name, workshop_number, mobile_number) VALUES (?,?,?)', ['Salim', '2', '8765432109']);
        const m3 = await runAsync('INSERT INTO managers (name, workshop_number, mobile_number) VALUES (?,?,?)', ['Raheem', '3', '7654321098']);

        console.log("Seeding Suppliers...");
        const suppliers = [
            ['Raymond Wholesale', '27AAACR1234F1Z1', 'Mumbai', '9988776655'],
            ['Siyaram Hub', '27BBBCR1234F1Z2', 'Surat', '9988776656'],
            ['Oswal Fabrics', '27CCCCR1234F1Z3', 'Delhi', '9988776657'],
            ['Gwalior Suitings', '27DDDDCR1234F1Z4', 'Ahmedabad', '9988776658'],
            ['Linen Club Bulk', '27EEEECR1234F1Z5', 'Bangalore', '9988776659']
        ];
        const supplierIds = [];
        for (const s of suppliers) {
            const id = await runAsync('INSERT INTO suppliers (name, gstin, address, mobile, opening_balance) VALUES (?,?,?,?,?)', [...s, 0]);
            supplierIds.push(id);
        }

        console.log("Seeding Products...");
        const products = [
            ['RAY-01', 'Raymond Fine Blend', 'BLK-01', 100, 450, 5, 472.5, 800, '', supplierIds[0], 'INV-1001'],
            ['RAY-02', 'Raymond Wool', 'NAV-02', 50, 800, 5, 840, 1500, '', supplierIds[0], 'INV-1002'],
            ['SIY-01', 'Siyaram PolyViscose', 'GRY-01', 200, 200, 5, 210, 400, '', supplierIds[1], 'INV-2001'],
            ['OSW-01', 'Oswal Tweed', 'BRN-01', 30, 1200, 12, 1344, 2500, '', supplierIds[2], 'INV-3001'],
            ['LIN-01', 'Pure Linen 60 Lea', 'WHT-01', 80, 600, 5, 630, 1200, '', supplierIds[4], 'INV-5001'],
        ];
        for (const p of products) {
            await runAsync('INSERT INTO products (sku_takano, article_name, shade_id, total_meters, purchase_rate, gst_percentage, landing_cost, selling_price, shade_image, supplier_id, invoice_no) VALUES (?,?,?,?,?,?,?,?,?,?,?)', p);
        }

        const todayStr = formatDate(today);
        const thisMonth = todayStr.split('-')[1];
        const thisDay = todayStr.split('-')[2];

        console.log("Seeding Customers...");
        const customers = [
            ['Rahul Sharma', '9000000001', 'Hindu', `1990-${thisMonth}-${thisDay}`], // Birthday is TODAY
            ['Imran Khan', '9000000002', 'Muslim', '1988-08-20'],
            ['Sahil Verma', '9000000003', 'Hindu', '1995-12-10'],
            ['Tariq Ali', '9000000004', 'Muslim', '1985-03-25'],
            ['Amit Patel', '9000000005', 'Hindu', '1992-07-07'],
            ['Zayed Sheikh', '9000000006', 'Muslim', '1998-11-11'],
            ['Rohan Gupta', '9000000007', 'Hindu', '1991-09-09']
        ];
        const customerIds = [];
        for (const c of customers) {
            const id = await runAsync('INSERT INTO customers (name, phone, faith_tag, dob) VALUES (?,?,?,?)', c);
            customerIds.push(id);
        }

        console.log("Seeding Orders...");
        const orders = [
            // 1. Delivered, Fully Paid (Past Order)
            ['ORD-1001', customerIds[0], m1, '[{"garment":"Pant","fabricSku":"RAY-01","fabricMeters":1.2}]', '{}', 1500, 0, 1500, 1500, 0, 500, 1000, 'Delivered', 0, addDays(-10), addDays(-5), addDays(-4)],
            // 2. Delivered, Has Udhaari (Past Order)
            ['ORD-1002', customerIds[1], m2, '[{"garment":"Coat","fabricSku":"OSW-01","fabricMeters":3}]', '{}', 10000, 0, 10000, 5000, 5000, 2500, 7500, 'Delivered', 0, addDays(-8), addDays(-2), addDays(-1)],
            // 3. Ready for Trial (Trial Today)
            ['ORD-1003', customerIds[2], m3, '[{"garment":"Shirt","fabricSku":"LIN-01","fabricMeters":1.6}]', '{}', 2000, 0, 2000, 500, 1500, 400, 1600, 'Ready for Trial', 0, addDays(-5), formatDate(today), addDays(2)],
            // 4. In Workshop (Urgent Tomorrow)
            ['ORD-1004', customerIds[3], m1, '[{"garment":"Kurta","fabricSku":"SIY-01","fabricMeters":2.5}]', '{}', 1500, 0, 1500, 1500, 0, 450, 1050, 'In Workshop', 0, addDays(-2), addDays(1), addDays(1)],
            // 5. Booked Today
            ['ORD-1005', customerIds[4], m2, '[{"garment":"Sherwani","fabricSku":"RAY-02","fabricMeters":4}]', '{}', 15000, 1000, 14000, 4000, 10000, 5000, 9000, 'Booked', 0, formatDate(today), addDays(7), addDays(10)],
            // 6. Booked Today
            ['ORD-1006', customerIds[5], m3, '[{"garment":"Pant","fabricSku":"RAY-01","fabricMeters":1.2},{"garment":"Shirt","fabricSku":"LIN-01","fabricMeters":1.6}]', '{}', 3500, 0, 3500, 1000, 2500, 900, 2600, 'Booked', 0, formatDate(today), addDays(5), addDays(8)],
            // 7. Delivered Today (No Udhaari)
            ['ORD-1007', customerIds[6], m1, '[{"garment":"Pajama","fabricSku":"SIY-01","fabricMeters":2}]', '{}', 1000, 0, 1000, 1000, 0, 300, 700, 'Delivered', 0, addDays(-3), addDays(-1), formatDate(today)]
        ];
        for (const o of orders) {
            await runAsync(`INSERT INTO orders (id, customer_id, manager_id, items_json, measurements_json, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied, booked_date, handover_target_date, delivery_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, o);
            
            // Advance in Daybook
            if (o[8] > 0) {
                await runAsync(`INSERT INTO daybook_expenses (type, category, amount, description, created_at) VALUES (?,?,?,?,?)`, ['Income_Cash', 'Customer_Advance', o[8], `Advance for ${o[0]}`, new Date(o[14]).toISOString()]);
            }
            // If delivered, credit manager
            if (o[12] === 'Delivered') {
                await runAsync(`INSERT INTO manager_ledger (manager_id, order_id, transaction_type, amount, payment_mode, reference_no, created_at) VALUES (?,?,?,?,?,?,?)`, [o[2], o[0], 'Cr_Stitching', o[10], 'Credit', `Earned from ${o[0]}`, new Date(o[16]).toISOString()]);
            }
        }

        console.log("Seeding Shop Expenses...");
        await runAsync(`INSERT INTO daybook_expenses (type, category, amount, description, created_at) VALUES (?,?,?,?,?)`, ['Expense_Shop', 'Tea & Snacks', 150, 'Evening tea for staff', new Date().toISOString()]);
        await runAsync(`INSERT INTO daybook_expenses (type, category, amount, description, created_at) VALUES (?,?,?,?,?)`, ['Expense_Shop', 'Electricity', 2500, 'Monthly Bill', addDays(-1)]);

        console.log("Seeding Manager Advances...");
        await runAsync(`INSERT INTO manager_ledger (manager_id, order_id, transaction_type, amount, payment_mode, reference_no, created_at) VALUES (?,?,?,?,?,?,?)`, [m1, null, 'Dr_Advance', 200, 'Cash', 'ADV-01', new Date().toISOString()]);
        await runAsync(`INSERT INTO daybook_expenses (type, category, amount, description, created_at) VALUES (?,?,?,?,?)`, ['Expense_Shop', 'Manager_Advance', 200, 'Advance to Akram', new Date().toISOString()]);

        console.log("Seeding Supplier Payments...");
        await runAsync(`INSERT INTO supplier_ledger (supplier_id, invoice_no, transaction_type, amount, payment_mode, reference_no, created_at) VALUES (?,?,?,?,?,?,?)`, [supplierIds[0], null, 'Dr_Payment', 5000, 'Bank', 'NEFT-123', new Date().toISOString()]);
        await runAsync(`INSERT INTO daybook_expenses (type, category, amount, description, created_at) VALUES (?,?,?,?,?)`, ['Expense_Supplier', 'Fabric_Payment', 5000, 'Payment to Raymond', new Date().toISOString()]);

        console.log("Seed successful!");
    } catch (err) {
        console.error("Seed error:", err);
    } finally {
        db.close();
    }
}

seed();
