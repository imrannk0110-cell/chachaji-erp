const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');

    db.run("ALTER TABLE orders ADD COLUMN payment_history_json TEXT DEFAULT '[]'", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column payment_history_json already exists. No action taken.');
            } else {
                console.error('Error altering table:', err.message);
            }
        } else {
            console.log('Successfully added payment_history_json column to orders table.');
        }
        db.close();
    });
});
