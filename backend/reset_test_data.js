const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('Error opening database', err.message);

    console.log('Connected to database. Starting reset of test data...');

    db.serialize(() => {
        // We will clear all transactional and entity tables except 'managers' and 'settings'
        const tablesToClear = [
            'orders', 
            'customers', 
            'products', 
            'suppliers', 
            'supplier_ledger', 
            'daybook_expenses', 
            'manager_ledger'
        ];

        tablesToClear.forEach(table => {
            db.run(`DELETE FROM ${table}`, (err) => {
                if (err) {
                    console.error(`Error clearing table ${table}:`, err.message);
                } else {
                    console.log(`Cleared all records from ${table}`);
                }
            });
            // Reset auto-increment
            db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`, (err) => {
                // Ignore error if sqlite_sequence doesn't exist for the table
            });
        });

        // Run a VACUUM command to reclaim space and optimize the DB after mass delete
        db.run('VACUUM', (err) => {
            if (err) console.error('Error running VACUUM:', err.message);
            else console.log('Database compacted successfully.');
            
            console.log('All dummy/test data reset completed successfully!');
            db.close();
        });
    });
});
