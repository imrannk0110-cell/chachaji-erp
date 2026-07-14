const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath);

const todayMonthDay = '07-02';

db.all('SELECT id FROM customers', (err, rows) => {
    if (err) return console.error(err);
    if (rows.length >= 2) {
        // Set two random customers' birthday to today
        const ids = [rows[0].id, rows[1].id];
        db.run(`UPDATE customers SET dob = '1990-${todayMonthDay}' WHERE id = ?`, [ids[0]]);
        db.run(`UPDATE customers SET dob = '1985-${todayMonthDay}' WHERE id = ?`, [ids[1]], () => {
            console.log('Birthdays updated successfully.');
            db.close();
        });
    }
});
