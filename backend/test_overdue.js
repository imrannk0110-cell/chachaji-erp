const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hd_safa.db');
db.serialize(() => {
    db.run(`INSERT INTO customers (name, phone, faith_tag) VALUES ('Red Test Handover', '1111111111', 'Hindu')`, function(err) {
        if(err) console.error(err);
        const cid = this.lastID;
        db.run(`INSERT INTO orders (id, customer_id, status, handover_target_date, balance_due, workshop_done) 
                VALUES ('ORD-TEST-HND', ${cid}, 'In Workshop', '2026-06-24', 2000, 0)`);
    });
    db.run(`INSERT INTO customers (name, phone, faith_tag) VALUES ('Red Test Delivery', '2222222222', 'Hindu')`, function(err) {
        if(err) console.error(err);
        const cid = this.lastID;
        db.run(`INSERT INTO orders (id, customer_id, status, delivery_date, balance_due) 
                VALUES ('ORD-TEST-DEL', ${cid}, 'Ready for Trial', '2026-06-24', 3000)`);
    });
});
setTimeout(() => { db.close(); console.log('Dummy records inserted.'); }, 1000);
