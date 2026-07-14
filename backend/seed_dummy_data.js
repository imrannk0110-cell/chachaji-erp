const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = require('./database');


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(daysAgoMin, daysAgoMax) {
  const date = new Date('2026-07-02T10:00:00Z');
  const daysAgo = getRandomInt(daysAgoMin, daysAgoMax);
  date.setDate(date.getDate() - daysAgo);
  
  const hour = getRandomInt(10, 19);
  const min = getRandomInt(0, 59);
  date.setHours(hour, min, 0, 0);
  
  return date.toISOString();
}

function generateId(prefix = 'ORD') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const suppliersData = [
  { name: 'Sharda Castings Ltd.', gstin: '27AABCS3456D1Z5', address: 'Jaipur Industrial Area', mobile: '9829012345' },
  { name: 'Gas Tech Valves & Brass', gstin: '27AABCG1234E1Z4', address: 'Ahmedabad', mobile: '9879055443' },
  { name: 'Super Steel Sheets Co.', gstin: '03AABCS9988F1Z3', address: 'Ludhiana', mobile: '9988443322' }
];

const factoryUnitsData = [
  { name: 'Assembly Line A', unit_number: 'UNIT-01', mobile_number: '9870001111' },
  { name: 'Welding Division B', unit_number: 'UNIT-02', mobile_number: '9870002222' },
  { name: 'Custom Fabrication Unit', unit_number: 'UNIT-03', mobile_number: '9870003333' }
];

const customersData = [
  { name: 'Sharma Kitchen Equipments', phone: '9001001001', dob: '1990-05-15', email: 'sharma.kitchen@gmail.com', notes: 'Wholesaler in Delhi NCR' },
  { name: 'Jodhpur Restaurant Supplies', phone: '9001001002', dob: '1985-08-20', email: 'jodhpur.rest@yahoo.com', notes: 'Frequent buyer of Commercial Bhattis' },
  { name: 'Sandeep Singh (Retail)', phone: '9001001003', dob: '1992-12-10', email: 'sandeep@outlook.com', notes: 'Bought 3-burner glass top for home' },
  { name: 'Royal Catering Services', phone: '9001001004', dob: '1988-03-25', email: 'royal.caterers@rediffmail.com', notes: 'Commercial orders only' },
  { name: 'Zaid Gas Agencies', phone: '9001001005', dob: '1995-11-05', email: 'zaid.gas@gmail.com', notes: 'Distributor for spare burners' },
];

const productsData = [
  { sku: 'ST-001', name: 'Single Stove Burner (Stainless Steel)', category: 'Single Stove Burner - SS', subcategory: 'Steel Body', total_stock: 45, manufacturing_cost: 450, retail_price: 850, wholesale_price: 650, image: '/single_stove_burner.png' },
  { sku: 'ST-001-MS', name: 'Single Stove Burner (Iron Body)', category: 'Single Stove Burner - Iron (MS)', subcategory: 'Iron Body', total_stock: 25, manufacturing_cost: 380, retail_price: 720, wholesale_price: 550, image: '/single_stove_burner.png' },
  { sku: 'ST-002', name: 'Double Stove Burner (Glass Top)', category: 'Double Stove Burner', subcategory: 'Glass Top', total_stock: 30, manufacturing_cost: 1100, retail_price: 2200, wholesale_price: 1650, image: '/double_stove_burner.png' },
  { sku: 'ST-003', name: 'Three Stove Burner (Platform)', category: 'Three Stove Burner', subcategory: 'Stainless Steel', total_stock: 20, manufacturing_cost: 1650, retail_price: 3200, wholesale_price: 2450, image: '/three_stove_burner.png' },
  { sku: 'ST-004', name: 'Four Stove Burner (Crustal MC-423)', category: 'Four Stove Burner', subcategory: 'Glass Premium', total_stock: 15, manufacturing_cost: 2500, retail_price: 4800, wholesale_price: 3600, image: '/four_stove_burner.png' },
  { sku: 'CM-001', name: 'High Pressure Commercial Bhatti 12x12', category: 'Commercial Burner', subcategory: 'Gas Bhatti', total_stock: 12, manufacturing_cost: 1800, retail_price: 3500, wholesale_price: 2700, image: '/commercial_bhatti.png' },
  { sku: 'CM-002', name: 'Dosa Bhatti 17x41 Stand Steel', category: 'Commercial Burner', subcategory: 'Stand Steel', total_stock: 8, manufacturing_cost: 4200, retail_price: 8500, wholesale_price: 6800, image: '/dosa_bhatti.png' },
  { sku: 'RG-001', name: 'F-Type Gas Regulator', category: 'Regulator', subcategory: 'Regulators', total_stock: 120, manufacturing_cost: 90, retail_price: 250, wholesale_price: 150, image: '/gas_regulator.png' },
  { sku: 'SP-001', name: 'T-35 Burner Head (Heavy Brass)', category: 'Spare Parts', subcategory: 'Burner Heads', total_stock: 85, manufacturing_cost: 180, retail_price: 450, wholesale_price: 300, image: '/brass_burner_head.png' }
];

const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const runAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function seedData() {
    console.log('Starting seed...');
    
    const tablesToClear = [
        'daybook_expenses', 'factory_ledger', 'factory_units', 'bad_debts_cleared', 
        'orders', 'customers', 'products', 'supplier_ledger', 'suppliers'
    ];
    for (let table of tablesToClear) {
        await runQuery(`DELETE FROM ${table}`);
        await runQuery(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
    }
    
    console.log('Cleared existing database.');
    
    // 1. Seed Suppliers & Products
    for (let s of suppliersData) {
        let res = await runQuery('INSERT INTO suppliers (name, gstin, address, mobile) VALUES (?, ?, ?, ?)', [s.name, s.gstin, s.address, s.mobile]);
        let supplierId = res.lastID;
        
        let openingBal = getRandomInt(10000, 50000);
        await runQuery('UPDATE suppliers SET opening_balance = ? WHERE id = ?', [openingBal, supplierId]);
        
        // Products from this supplier
        const supProds = productsData.filter((_, idx) => (idx % suppliersData.length) === (supplierId % suppliersData.length));
        for (let p of (supProds.length > 0 ? supProds : productsData.slice(0,2))) {
            await runQuery(
                'INSERT INTO products (sku, name, category, subcategory, total_stock, manufacturing_cost, retail_price, wholesale_price, image, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [p.sku, p.name, p.category, p.subcategory, p.total_stock, p.manufacturing_cost, p.retail_price, p.wholesale_price, p.image || null, supplierId]
            );
        }
        
        // Supplier Ledgers (Outgoings & Purchases)
        for (let d = 30; d >= 0; d-=7) {
            let date = getRandomDate(d, d+2);
            await runQuery('INSERT INTO supplier_ledger (supplier_id, transaction_type, amount, payment_mode, reference_no, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
            [supplierId, 'Dr_Payment', getRandomInt(5000, 15000), 'Bank Transfer', 'TXN' + getRandomInt(10000, 99999), date]);
        }
    }
    
    // 2. Seed Factory Units
    for (let f of factoryUnitsData) {
        await runQuery('INSERT INTO factory_units (name, unit_number, mobile_number) VALUES (?, ?, ?)', [f.name, f.unit_number, f.mobile_number]);
    }
    const dbFactoryUnits = await runAll('SELECT id FROM factory_units');
    
    // 3. Seed Customers
    for (let c of customersData) {
        await runQuery('INSERT INTO customers (name, phone, dob, email, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
        [c.name, c.phone, c.dob, c.email, c.notes, getRandomDate(25, 30)]);
    }
    const dbCustomers = await runAll('SELECT id FROM customers');
    
    // Get seeded products to link to orders
    const dbProducts = await runAll('SELECT * FROM products');
    
    // 4. Seed Orders & Ledgers over last 30 days
    for (let i = 0; i < 35; i++) {
        let orderId = generateId('CHJ');
        let customerId = dbCustomers[getRandomInt(0, dbCustomers.length - 1)].id;
        
        let orderDate = getRandomDate(0, 30);
        let orderType = getRandomInt(0, 4) === 0 ? 'Custom' : 'Direct'; // 20% custom orders
        let saleType = getRandomInt(0, 1) === 0 ? 'Retail' : 'Wholesale';
        
        let status = 'Delivered';
        if (orderType === 'Custom') {
            const statusList = ['Booked', 'In Factory', 'Ready for Trial', 'Delivered'];
            status = statusList[getRandomInt(0, 3)];
        }
        
        // Choose 1-3 random items
        const numItems = getRandomInt(1, 3);
        const orderItems = [];
        let sub_total = 0;
        let cost_basis = 0;
        
        for (let j = 0; j < numItems; j++) {
            const prod = dbProducts[getRandomInt(0, dbProducts.length - 1)];
            const price = saleType === 'Wholesale' ? prod.wholesale_price : prod.retail_price;
            const qty = getRandomInt(1, 5);
            const total = price * qty;
            
            sub_total += total;
            cost_basis += (prod.manufacturing_cost * qty);
            orderItems.push({
                productId: prod.id,
                name: prod.name,
                qty: qty,
                price: price,
                total: total
            });
        }
        
        let discount = getRandomInt(0, Math.floor(sub_total * 0.05));
        let grand_total = sub_total - discount;
        let advance = status === 'Delivered' ? grand_total : getRandomInt(Math.floor(grand_total * 0.3), grand_total);
        let balance = grand_total - advance;
        let net_profit = grand_total - cost_basis;
        
        let customSpecs = {};
        let factoryUnitId = null;
        
        if (orderType === 'Custom') {
            factoryUnitId = dbFactoryUnits[getRandomInt(0, dbFactoryUnits.length - 1)].id;
            customSpecs = {
                dimensions: '2.5 x 4.5 ft Custom Stand',
                burnerType: 'T-35 Cap Type & Jumbo W/L',
                bodyMaterial: 'Stainless Steel Heavy Gauge',
                regulatorType: 'High Pressure Regulator',
                instructions: 'Provide double support on legs for catering load.'
            };
        }
        
        let paymentHistory = [
            { amount: advance, date: orderDate, mode: getRandomInt(0, 1) === 0 ? 'UPI' : 'Cash', note: orderType === 'Custom' ? 'Advance' : 'Direct payment' }
        ];
        if (status === 'Delivered' && balance > 0) {
            paymentHistory.push({ amount: balance, date: getRandomDate(0, 5), mode: 'Cash', note: 'Final Delivery Payment' });
            balance = 0;
        }
        
        await runQuery(`INSERT INTO orders (
            id, customer_id, factory_unit_id, items_json, custom_specs_json, 
            sub_total, discount_amount, grand_total, advance_paid, balance_due, 
            cost_basis_total, net_profit, status, sale_type, order_type, 
            booked_date, payment_history_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            orderId, customerId, factoryUnitId, JSON.stringify(orderItems), JSON.stringify(customSpecs),
            sub_total, discount, grand_total, advance, balance, cost_basis, net_profit, 
            status, saleType, orderType, orderDate, JSON.stringify(paymentHistory)
        ]);
        
        // Daybook Income from order
        await runQuery('INSERT INTO daybook_expenses (type, category, amount, description, created_at) VALUES (?, ?, ?, ?, ?)', 
            ['Income_POS', orderType === 'Custom' ? 'Customer_Advance' : 'Customer_Sale', advance, 'Order ' + orderId, orderDate]
        );
        
        // If Custom and Delivered, credit factory labor
        if (orderType === 'Custom' && status === 'Delivered') {
            const laborCredit = Math.floor(sub_total * 0.15); // 15% labor cost
            await runQuery('INSERT INTO factory_ledger (factory_unit_id, order_id, transaction_type, amount, payment_mode, reference_no, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [factoryUnitId, orderId, 'Cr_Manufacturing', laborCredit, 'Credit', `Stitching charges for Custom order ${orderId}`, orderDate]
            );
            
            // Advance paid to factory unit
            if (getRandomInt(0, 1) === 1) {
                const advPay = getRandomInt(500, 2000);
                await runQuery('INSERT INTO factory_ledger (factory_unit_id, transaction_type, amount, payment_mode, reference_no, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [factoryUnitId, 'Dr_Advance', advPay, 'Cash', `Advance given to Factory Floor ${factoryUnitId}`, getRandomDate(0, 5)]
                );
            }
        }
    }
    
    // 5. Seed some bad debts cleared
    for (let i = 0; i < 3; i++) {
        await runQuery('INSERT INTO bad_debts_cleared (customer_id, amount, cleared_at) VALUES (?, ?, ?)',
            [dbCustomers[getRandomInt(0, dbCustomers.length - 1)].id, getRandomInt(50, 200), getRandomDate(0, 15)]
        );
    }
    
    // 6. Daybook Expenses
    const expCategories = ['Labor_Wages', 'Factory_Electricity', 'Freight_Transport', 'Office_Stationery', 'Rent'];
    const expDescs = ['Weekly worker wages', 'Factory power bill', 'Delivery transport charges', 'Printing bills & ledger sheets', 'Showroom monthly rent'];
    for (let i = 0; i < 15; i++) {
        const idx = getRandomInt(0, expCategories.length - 1);
        await runQuery('INSERT INTO daybook_expenses (type, category, amount, description, created_at) VALUES (?, ?, ?, ?, ?)',
            ['Expense_Shop', expCategories[idx], getRandomInt(500, 5000), expDescs[idx], getRandomDate(0, 30)]
        );
    }
    
    console.log('Database Seeded Successfully with Gas Stove Manufacturing dummy data!');
}

setTimeout(() => {
    seedData().catch(err => console.error(err)).finally(() => db.close());
}, 1000);

