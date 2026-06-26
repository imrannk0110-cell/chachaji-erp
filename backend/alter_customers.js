const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('hd_safa.db');
db.run("ALTER TABLE customers ADD COLUMN master_measurements_json TEXT DEFAULT '{}'", (err) => {
    if (err) console.error(err.message);
    else console.log("Added master_measurements_json to customers");
    db.close();
});
