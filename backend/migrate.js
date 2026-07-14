const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Running migrations...');
    
    db.run("ALTER TABLE orders ADD COLUMN payment_history_json TEXT DEFAULT '[]'", (err) => {
        if (err) console.log('Column payment_history_json might already exist.');
        else console.log('Added payment_history_json column.');
    });

    db.run("ALTER TABLE orders ADD COLUMN partial_handover_note TEXT", (err) => {
        if (err) console.log('Column partial_handover_note might already exist.');
        else console.log('Added partial_handover_note column.');
    });

    db.run("ALTER TABLE orders ADD COLUMN workshop_done INTEGER DEFAULT 0", (err) => {
        if (err) console.log('Column workshop_done might already exist.');
        else console.log('Added workshop_done column.');
    });

    db.run("ALTER TABLE orders ADD COLUMN manager_name TEXT", (err) => {
       // just in case manager_name was supposed to be there but we use a JOIN in queries.
       // actually we use a JOIN, so we don't need manager_name in orders table.
    });
});

setTimeout(() => {
    console.log('Migration completed.');
    process.exit(0);
}, 1000);
