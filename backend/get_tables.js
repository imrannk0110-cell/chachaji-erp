const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath, (err) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        console.log(tables);
        db.close();
    });
});
