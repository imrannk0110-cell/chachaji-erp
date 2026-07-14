const db = require('./database');
const { exec } = require('child_process');
const path = require('path');

setTimeout(() => {
    db.get("SELECT COUNT(*) as count FROM products", [], (err, row) => {
        if (err) {
            // If the table still doesn't exist, it means the DB is completely fresh and empty anyway.
            // But just in case, we will catch it and run the seeder anyway.
            console.log("Products table doesn't exist yet or error: " + err.message);
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
            return;
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
            console.log(`Database already has ${row?.count || 0} products. Skipping automatic seed.`);
            process.exit(0);
        }
    });
}, 1500); // Wait 1.5 seconds for the database to finish creating tables
