const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath);

const suppliers = [
    // 6 Suppliers we owe money to (Udhaari)
    { name: 'Oswal Fabrics', mobile: '9800011111', opening: 15000 },
    { name: 'Siyaram Silks', mobile: '9800011112', opening: 24500 },
    { name: 'Raymond Wholesale', mobile: '9800011113', opening: 8500 },
    { name: 'Gwalior Suitings', mobile: '9800011114', opening: 42000 },
    { name: 'Arvind Mills Dist.', mobile: '9800011115', opening: 12400 },
    { name: 'Donear Traders', mobile: '9800011116', opening: 5600 },
    // 4 Suppliers we gave advance to (Negative balance)
    { name: 'Linen Club Connect', mobile: '9800011117', opening: -10000 },
    { name: 'Vimal Textiles', mobile: '9800011118', opening: -5000 },
    { name: 'Grasim Bhiwani', mobile: '9800011119', opening: -25000 },
    { name: 'Mafatlal Fabrics', mobile: '9800011120', opening: -8000 },
];

const customers = [
    { name: 'Rahul Sharma', phone: '9900011101' },
    { name: 'Vikram Singh', phone: '9900011102' },
    { name: 'Anil Gupta', phone: '9900011103' },
    { name: 'Prakash Verma', phone: '9900011104' },
    { name: 'Ramesh Patel', phone: '9900011105' },
    { name: 'Suresh Kumar', phone: '9900011106' },
    { name: 'Dinesh Yadav', phone: '9900011107' },
    { name: 'Amit Jain', phone: '9900011108' },
    { name: 'Sunil Choudhary', phone: '9900011109' },
    { name: 'Rajesh Mishra', phone: '9900011110' },
];

db.serialize(() => {
    console.log("Seeding dummy data for Udhaari...");

    // Insert Suppliers
    const stmtSupplier = db.prepare('INSERT INTO suppliers (name, mobile, opening_balance) VALUES (?, ?, ?)');
    suppliers.forEach(s => {
        stmtSupplier.run([s.name, s.mobile, s.opening]);
    });
    stmtSupplier.finalize();

    // Insert Customers and their Orders
    const stmtCustomer = db.prepare('INSERT INTO customers (name, phone, faith_tag) VALUES (?, ?, ?)');
    const stmtOrder = db.prepare(`
        INSERT INTO orders (
            id, customer_id, items_json, measurements_json, 
            sub_total, discount_amount, grand_total, 
            advance_paid, balance_due, status, booked_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let custCounter = 0;
    
    // Process each customer
    customers.forEach((c, index) => {
        stmtCustomer.run([c.name, c.phone, 'Hindu'], function(err) {
            if (err) {
                console.log("Customer insert error:", err.message);
                return;
            }
            const customerId = this.lastID;
            
            // Create a dummy order for this customer
            const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
            
            // Make some full Udhaari (0 advance), some half Udhaari
            const grandTotal = 2000 + Math.floor(Math.random() * 5000); 
            const advancePaid = index % 2 === 0 ? 0 : Math.floor(grandTotal / 2); // Even index -> 0 advance, Odd index -> 50% advance
            const balanceDue = grandTotal - advancePaid;
            
            const itemsJson = JSON.stringify([{name: 'Dummy Safa/Sherwani', price: grandTotal}]);
            
            // Random date in the last 10 days
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 10));
            const bookedDate = date.toISOString();

            stmtOrder.run([
                orderId, customerId, itemsJson, '{}', 
                grandTotal, 0, grandTotal, 
                advancePaid, balanceDue, 'In workshop', bookedDate
            ], (err) => {
                if (err) console.log("Order insert error:", err.message);
            });
            
            custCounter++;
            if (custCounter === customers.length) {
                console.log("Successfully seeded 10 suppliers and 10 customers with Udhaari records!");
                db.close();
            }
        });
    });
});
