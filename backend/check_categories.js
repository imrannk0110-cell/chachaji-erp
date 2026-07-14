const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'hd_safa.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err);
        return;
    }
    db.get("SELECT value FROM settings WHERE key = 'categories'", (err, row) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Current Categories key value in DB:", row ? row.value : "None");
        }
        db.close();
    });
});
