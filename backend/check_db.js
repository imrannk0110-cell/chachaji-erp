const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error(err);

    db.all("SELECT id, name FROM customers", [], (err, customers) => {
        console.log("\n--- CUSTOMERS ---");
        customers.forEach(c => console.log(`${c.id}: ${c.name}`));
        
        db.all("SELECT id, customer_id, status FROM orders", [], (err, orders) => {
            console.log("\n--- ORDERS ---");
            orders.forEach(o => console.log(`${o.id} (Cust: ${o.customer_id}) - ${o.status}`));
            
            db.all("SELECT id, article_name, sku_takano FROM products", [], (err, products) => {
                console.log("\n--- PRODUCTS ---");
                products.forEach(p => console.log(`${p.id}: ${p.article_name} (${p.sku_takano})`));
                db.close();
            });
        });
    });
});
