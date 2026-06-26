const express = require('express');
const cors = require('cors');
const os = require('os');

const { getDb } = require('./database');
const productRepo = require('./repositories/ProductRepository');
const customerRepo = require('./repositories/CustomerRepository');
const salesRepo = require('./repositories/SalesRepository');
const dashboardRepo = require('./repositories/DashboardRepository');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// --- Helper to get Local Network IP Address ---
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// Route to get current local IP
app.get('/api/local-ip', (req, res) => {
  const localIp = getLocalIpAddress();
  res.json({ localIp, port: 3000 }); // Frontend is running on 3000
});

// --- Dashboard & Analytics Routes ---
app.get('/api/dashboard', async (req, res) => {
  try {
    const dashboardData = await dashboardRepo.getStats();
    const recentSales = await salesRepo.getRecentSales(5);
    res.json({ stats: dashboardData, recentSales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Smart Inventory alerts route ---
app.get('/api/inventory/alerts', async (req, res) => {
  try {
    const db = await getDb();
    // starred products falling below 100.0 units
    const lowStockStarred = await db.all(
      'SELECT * FROM products WHERE is_starred = 1 AND current_stock < 100.0 ORDER BY name ASC'
    );
    res.json(lowStockStarred);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle star status of product
app.post('/api/products/:id/toggle-star', async (req, res) => {
  try {
    const { is_starred } = req.body;
    await productRepo.toggleStar(req.params.id, is_starred);
    res.json({ success: true, is_starred });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Smart Marketing (Festival Targeting & Birthday celebrations) ---
app.get('/api/dashboard/marketing', async (req, res) => {
  try {
    const db = await getDb();
    // Checks if any festival is coming up in the next 14 days (inclusive of 2 weeks delta)
    const upcomingFestivals = await db.all(`
      SELECT * FROM festivals 
      WHERE date(festival_date) >= date('now', 'localtime') 
        AND date(festival_date) <= date('now', '+14 days', 'localtime')
    `);

    // For each upcoming festival, grab target customer audience (Hindu or Muslim matching target_tag)
    const campaigns = [];
    for (const fest of upcomingFestivals) {
      const customers = await db.all('SELECT * FROM customers WHERE group_tag = ?', [fest.target_tag]);
      campaigns.push({
        festival: fest,
        customers
      });
    }

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/celebrations', async (req, res) => {
  try {
    const db = await getDb();
    // Matches today's calendar MM-DD against customer DOB strings (YYYY-MM-DD)
    const birthdayCustomers = await db.all(`
      SELECT * FROM customers 
      WHERE strftime('%m-%d', dob) = strftime('%m-%d', 'now', 'localtime')
    `);
    res.json(birthdayCustomers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Tailor / Karigar Ledger Routes ---
app.get('/api/tailors', async (req, res) => {
  try {
    const db = await getDb();
    // Aggregation query: Earned, Advance, Balance due for pending payouts
    const tailors = await db.all(`
      SELECT 
        t.*,
        IFNULL(SUM(CASE WHEN o.payout_status = 'Pending' THEN o.stitching_cost ELSE 0 END), 0) as total_earned,
        IFNULL(SUM(CASE WHEN o.payout_status = 'Pending' THEN o.advance_paid ELSE 0 END), 0) as total_advance,
        IFNULL(SUM(CASE WHEN o.payout_status = 'Pending' THEN (o.stitching_cost - o.advance_paid) ELSE 0 END), 0) as net_balance_due
      FROM tailors t
      LEFT JOIN tailor_orders o ON t.id = o.tailor_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `);
    res.json(tailors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tailors', async (req, res) => {
  try {
    const db = await getDb();
    const { name, phone, base_stitching_rate } = req.body;
    const result = await db.run(
      'INSERT INTO tailors (name, phone, base_stitching_rate) VALUES (?, ?, ?)',
      [name, phone, base_stitching_rate || 0]
    );
    res.status(201).json({ id: result.lastID, name, phone, base_stitching_rate });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/tailors/:id/orders', async (req, res) => {
  try {
    const db = await getDb();
    const orders = await db.all(
      'SELECT * FROM tailor_orders WHERE tailor_id = ? ORDER BY assigned_date DESC',
      [req.params.id]
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tailor-orders', async (req, res) => {
  try {
    const db = await getDb();
    const { tailor_id, customer_name, outfit_type, stitching_cost, advance_paid } = req.body;
    const result = await db.run(`
      INSERT INTO tailor_orders (tailor_id, customer_name, outfit_type, stitching_cost, advance_paid, payout_status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `, [tailor_id, customer_name, outfit_type, stitching_cost, advance_paid || 0]);
    res.status(201).json({ id: result.lastID, tailor_id, customer_name, outfit_type, stitching_cost, advance_paid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/tailors/:id/payout', async (req, res) => {
  try {
    const db = await getDb();
    await db.run(
      "UPDATE tailor_orders SET payout_status = 'Paid' WHERE tailor_id = ? AND payout_status = 'Pending'",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await productRepo.getAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const newProduct = await productRepo.create(req.body);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updatedProduct = await productRepo.update(req.params.id, req.body);
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await productRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Customer Routes ---
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await customerRepo.getAll();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/customers/search', async (req, res) => {
  try {
    const query = req.query.q;
    const customers = await customerRepo.search(query);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const existing = await customerRepo.getByPhone(req.body.phone);
    if (existing) {
      // Return updated fields if name/tag changes
      const updated = await customerRepo.update(existing.id, { ...existing, ...req.body });
      return res.status(200).json(updated);
    }
    const newCustomer = await customerRepo.create(req.body);
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await customerRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Measurement Routes ---
app.get('/api/customers/:id/measurements', async (req, res) => {
  try {
    const measurements = await customerRepo.getMeasurements(req.params.id);
    res.json(measurements || {
      collar: 0,
      chest: 0,
      waist_upper: 0,
      hips: 0,
      shoulder: 0,
      sleeve_length: 0,
      arm_hole: 0,
      upper_length: 0,
      waist_lower: 0,
      thigh: 0,
      bottom_mori: 0,
      lower_length: 0,
      head_size: 0,
      fit_type: 'Regular',
      notes: ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers/:id/measurements', async (req, res) => {
  try {
    const saved = await customerRepo.saveMeasurements(req.params.id, req.body);
    res.json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Sales Routes ---
app.post('/api/sales', async (req, res) => {
  try {
    const saleResult = await salesRepo.createSale(req.body);
    res.status(201).json(saleResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/sales/:id', async (req, res) => {
  try {
    const saleDetails = await salesRepo.getSaleDetails(req.params.id);
    if (!saleDetails) return res.status(404).json({ error: 'Sale not found' });
    res.json(saleDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize DB then start server
getDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIpAddress();
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Local Network Address: http://${localIp}:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
