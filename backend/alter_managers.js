const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('hd_safa.db');
db.run("ALTER TABLE managers ADD COLUMN stitching_rates TEXT DEFAULT '{}'", (err) => {
    if (err) console.error(err.message);
    else console.log("Added stitching_rates to managers");
    db.close();
});
