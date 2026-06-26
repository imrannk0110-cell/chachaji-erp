const db = require('./database');

db.serialize(() => {
    db.run("ALTER TABLE orders ADD COLUMN workshop_done BOOLEAN DEFAULT 0;", (err) => {
        if(err) console.error("workshop_done Error or already exists:", err.message);
        else console.log("Added column workshop_done successfully!");
    });
    db.run("ALTER TABLE orders ADD COLUMN partial_handover_note TEXT;", (err) => {
        if(err) console.error("partial_handover_note Error or already exists:", err.message);
        else console.log("Added column partial_handover_note successfully!");
        db.close();
    });
});
