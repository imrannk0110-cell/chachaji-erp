const { getDb } = require('./database');

const seedData = async () => {
  console.log('Seeding data to hd_safa.db...');

  try {
    const db = await getDb();
    
    // 1. Insert products (with is_starred, location_rack, and unit_type/uom)
    const stmtProduct = await db.prepare(`
      INSERT OR IGNORE INTO products (sku, name, uom, purchase_price, selling_price, current_stock, is_starred, location_rack)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Low stock starred items for testing alerts (stock < 100)
    await stmtProduct.run('SAFA-GLD-02', 'Premium Safa - Gold Turban', 'pieces', 250, 600, 12, 1, 'Rack A-2');
    await stmtProduct.run('FAB-COT-01', 'Cotton Linen Fabric - Royal White', 'meters', 150, 300, 4.5, 1, 'Rack B-1');
    
    // Normal items
    await stmtProduct.run('SAFA-RED-01', 'Premium Safa - Banarasi Red', 'pieces', 200, 500, 150, 0, 'Rack A-1');
    await stmtProduct.run('FAB-SLK-02', 'Pure Silk Blend Fabric', 'meters', 400, 800, 75, 0, 'Rack B-3');
    await stmtProduct.run('ACC-BTN-01', 'Royal Brass Buttons (Set of 6)', 'pieces', 50, 120, 200, 0, 'Counter Drawer 3');
    
    await stmtProduct.finalize();

    // Get current date to seed birthday celebrations matching today's month/day
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayDOB = `1992-${mm}-${dd}`; // Matches today's MM-DD

    // 2. Insert customers with religious/group tags and DOBs
    const stmtCustomer = await db.prepare(`
      INSERT OR IGNORE INTO customers (name, phone, group_tag, dob)
      VALUES (?, ?, ?, ?)
    `);
    
    await stmtCustomer.run('Rahul Sharma', '9876543210', 'Hindu', todayDOB); // Birthday today!
    await stmtCustomer.run('Sufyan Khan', '9988776655', 'Muslim', '1995-10-15');
    await stmtCustomer.run('Aman Varma', '8877665544', 'General', '1988-03-24');
    await stmtCustomer.run('Amit Patel', '9123456789', 'Hindu', '1990-12-05');
    await stmtCustomer.run('Zaid Malik', '9898989898', 'Muslim', '1994-07-20');
    
    await stmtCustomer.finalize();

    // 3. Insert tailors (Karigars)
    const stmtTailor = await db.prepare(`
      INSERT OR IGNORE INTO tailors (name, phone, base_stitching_rate)
      VALUES (?, ?, ?)
    `);
    
    await stmtTailor.run('Imran Khan (Masterji)', '9560412356', 350.0);
    await stmtTailor.run('Ramesh Kumar', '9812456789', 300.0);
    
    await stmtTailor.finalize();

    // 4. Insert dummy tailor orders
    const stmtTailorOrder = await db.prepare(`
      INSERT OR IGNORE INTO tailor_orders (tailor_id, customer_name, outfit_type, stitching_cost, advance_paid, payout_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    await stmtTailorOrder.run(1, 'Rahul Sharma', 'Sherwani', 1500, 500, 'Pending');
    await stmtTailorOrder.run(1, 'Sufyan Khan', 'Kurta Pajama', 800, 0, 'Pending');
    await stmtTailorOrder.run(2, 'Aman Varma', 'Traditional Safa Styling', 400, 200, 'Pending');
    await stmtTailorOrder.run(2, 'Amit Patel', 'Nehru Jacket', 1000, 1000, 'Paid'); // Already settled
    
    await stmtTailorOrder.finalize();

    console.log('Seeding complete successfully.');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

seedData();
