const db = require('./database');
const { exec } = require('child_process');
const path = require('path');

db.get("SELECT COUNT(*) as count FROM products", [], (err, row) => {
    if (err) {
        console.error("Error checking products table:", err);
        process.exit(1);
    }
    if (row && row.count === 0) {
        console.log("Database is completely empty! Automatically running seed script to populate products and images...");
        const seedPath = path.join(__dirname, 'seed_dummy_data.js');
        exec(`node "${seedPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Seed error: ${error.message}`);
                process.exit(1);
            }
            console.log(stdout);
            console.log("Seeding complete.");
            process.exit(0);
        });
    } else {
        console.log(`Database already has ${row.count} products. Skipping automatic seed.`);
        process.exit(0);
    }
});
