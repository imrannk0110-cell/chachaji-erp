const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err);
    else console.log('Connected to db');
});

const today = new Date();
const formatDate = (date) => date.toISOString().split('T')[0];

const yest = new Date(today); yest.setDate(yest.getDate() - 1);
const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 1);

const r = Math.floor(Math.random() * 1000);

db.serialize(() => {
    // Managers
    db.run(`INSERT INTO managers (name, workshop_number, mobile_number) VALUES ('Masterji Raju', 'W-01', '9876500000')`);
    
    // Customers
    db.run(`INSERT OR IGNORE INTO customers (name, phone, dob, faith_tag) VALUES ('Rahul Sharma', '9876543210', '1990-12-11', 'Hindu')`);
    db.run(`INSERT OR IGNORE INTO customers (name, phone, dob, faith_tag) VALUES ('Imran Khan', '9876543211', '${formatDate(today)}', 'Muslim')`); 
    db.run(`INSERT OR IGNORE INTO customers (name, phone, dob, faith_tag) VALUES ('Vikram Singh', '9876543212', '1985-05-05', 'Hindu')`);
    db.run(`INSERT OR IGNORE INTO customers (name, phone, dob, faith_tag) VALUES ('Amit Patel', '9876543213', '1992-08-15', 'Hindu')`);
    
    // Orders - 1: Overdue Delivery (Yesterday) -> Should be RED on left side
    db.run(`INSERT OR IGNORE INTO orders (id, customer_id, manager_id, items_json, measurements_json, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied, booked_date, handover_target_date, delivery_date, workshop_done) 
            VALUES ('ORD-1001-${r}', 1, 1, '[{\"name\":\"Pant\"}]', '{}', 1500, 0, 1500, 500, 1000, 500, 1000, 'Ready for Trial', 0, '${formatDate(yest)}', '${formatDate(yest)}', '${formatDate(yest)}', 1)`);
            
    // Orders - 2: Today Delivery -> Should be normal color on left side
    db.run(`INSERT OR IGNORE INTO orders (id, customer_id, manager_id, items_json, measurements_json, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied, booked_date, handover_target_date, delivery_date, workshop_done) 
            VALUES ('ORD-1002-${r}', 2, 1, '[{\"name\":\"Shirt\"}]', '{}', 1000, 0, 1000, 0, 1000, 400, 600, 'Ready for Trial', 0, '${formatDate(yest)}', '${formatDate(today)}', '${formatDate(today)}', 1)`);
            
    // Orders - 3: Overdue Handover (Yesterday) -> Should be RED on right side
    db.run(`INSERT OR IGNORE INTO orders (id, customer_id, manager_id, items_json, measurements_json, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied, booked_date, handover_target_date, delivery_date, workshop_done) 
            VALUES ('ORD-1003-${r}', 3, 1, '[{\"name\":\"Suit\"}]', '{}', 5000, 0, 5000, 1000, 4000, 2000, 3000, 'In Workshop', 0, '${formatDate(yest)}', '${formatDate(yest)}', '${formatDate(tmrw)}', 0)`);
            
    // Orders - 4: Tomorrow Handover -> Should be normal color on right side
    db.run(`INSERT OR IGNORE INTO orders (id, customer_id, manager_id, items_json, measurements_json, sub_total, discount_amount, grand_total, advance_paid, balance_due, cost_basis_total, net_profit, status, gst_applied, booked_date, handover_target_date, delivery_date, workshop_done) 
            VALUES ('ORD-1004-${r}', 4, 1, '[{\"name\":\"Sherwani\"}]', '{}', 10000, 0, 10000, 2000, 8000, 4000, 6000, 'In Workshop', 0, '${formatDate(today)}', '${formatDate(tmrw)}', '${formatDate(tmrw)}', 0)`);
});
console.log('Dummy data script executed successfully.');
