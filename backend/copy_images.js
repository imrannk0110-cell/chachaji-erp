const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Source image files in the brain folder
const srcDir = 'C:\\Users\\Owner\\.gemini\\antigravity\\brain\\0cda0330-c944-42b9-b01a-88e379d46ad3';
const destDir = 'd:\\ERP + CRM\\frontend\\public';

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Find the latest generated images in the source directory
const files = fs.readdirSync(srcDir);

const mappings = {
    'three_stove_burner': 'three_stove_burner.png',
    'dosa_bhatti': 'dosa_bhatti.png',
    'single_stove_burner': 'single_stove_burner.png',
    'gas_regulator': 'gas_regulator.png'
};

Object.entries(mappings).forEach(([key, destName]) => {
    // Find files matching key_*.png
    const matched = files.filter(f => f.startsWith(key + '_') && f.endsWith('.png'));
    if (matched.length > 0) {
        // Sort by name or stats to get the latest (usually there is only one anyway)
        matched.sort();
        const latestFile = matched[matched.length - 1];
        const srcPath = path.join(srcDir, latestFile);
        const destPath = path.join(destDir, destName);
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${latestFile} to public/${destName}`);
    } else {
        console.warn(`No file found starting with ${key}_`);
    }
});

// Update SQLite database product paths
const dbPath = path.resolve(__dirname, 'hd_safa.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err);
        return;
    }
    
    const updates = [
        { image: '/single_stove_burner.png', sku: 'ST-001' },
        { image: '/three_stove_burner.png', sku: 'ST-003' },
        { image: '/dosa_bhatti.png', sku: 'CM-002' },
        { image: '/gas_regulator.png', sku: 'RG-001' }
    ];

    let pending = updates.length;
    updates.forEach(u => {
        db.run("UPDATE products SET image = ? WHERE sku = ?", [u.image, u.sku], function(err) {
            if (err) {
                console.error(`Error updating SKU ${u.sku}:`, err);
            } else {
                console.log(`Updated SKU ${u.sku} with image path ${u.image} (Rows modified: ${this.changes})`);
            }
            pending--;
            if (pending === 0) {
                db.close();
                console.log("Database image paths update completed.");
            }
        });
    });
});
