const { getDb } = require('../database');
const productRepository = require('./ProductRepository');

class SalesRepository {
  async createSale(saleData) {
    const db = await getDb();
    const { customer_id, items, discount_percentage, discount_flat } = saleData;

    let sub_total = 0;
    let total_cost_basis = 0;
    const processedItems = [];

    try {
      await db.run('BEGIN TRANSACTION');

      // 1. Process each item sequentially
      for (const item of items) {
        // Query product by sku
        const product = await db.get('SELECT * FROM products WHERE sku = ?', [item.sku]);
        if (!product) {
          throw new Error(`Product with SKU ${item.sku} not found`);
        }
        if (product.current_stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.current_stock}`);
        }

        const unit_price = product.selling_price;
        const item_flat_discount = item.flat_discount || 0;
        const line_total = (unit_price * item.quantity) - item_flat_discount;

        sub_total += line_total;
        total_cost_basis += (product.purchase_price * item.quantity);

        // Track item details in json
        processedItems.push({
          sku: product.sku,
          name: product.name,
          uom: product.uom,
          quantity: item.quantity,
          unit_price,
          flat_discount: item_flat_discount,
          line_total,
          purchase_price: product.purchase_price
        });

        // Deduct from stock
        await db.run('UPDATE products SET current_stock = current_stock - ? WHERE sku = ?', [item.quantity, item.sku]);
      }

      // 2. Multi-level grand discount logic
      let discount_applied = 0;
      if (discount_percentage && discount_percentage > 0) {
        discount_applied += sub_total * (discount_percentage / 100);
      }
      if (discount_flat && discount_flat > 0) {
        discount_applied += discount_flat;
      }

      let grand_total = sub_total - discount_applied;
      if (grand_total < 0) {
        grand_total = 0;
        discount_applied = sub_total; // Cap the discount applied to avoid negative billing
      }

      // Calculate net margin
      const net_margin = grand_total - total_cost_basis;

      // 3. Save into sales table
      const items_json = JSON.stringify(processedItems);
      const saleResult = await db.run(`
        INSERT INTO sales (customer_id, items_json, sub_total, discount_applied, grand_total, total_cost_basis, net_margin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [customer_id || null, items_json, sub_total, discount_applied, grand_total, total_cost_basis, net_margin]);

      const saleId = saleResult.lastID;

      await db.run('COMMIT');

      return {
        sale_id: saleId,
        sub_total,
        discount_applied,
        grand_total,
        total_cost_basis,
        net_margin,
        items: processedItems
      };

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  async getRecentSales(limit = 10) {
    const db = await getDb();
    const sales = await db.all(`
      SELECT s.*, c.name as customer_name, s.sale_date as created_at, s.grand_total as total_revenue
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.sale_date DESC
      LIMIT ?
    `, [limit]);

    // Parse items_json
    return sales.map(s => ({
      ...s,
      items: s.items_json ? JSON.parse(s.items_json) : []
    }));
  }

  async getSaleDetails(saleId) {
    const db = await getDb();
    const sale = await db.get(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, s.sale_date as created_at
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [saleId]);

    if (!sale) return null;

    sale.items = sale.items_json ? JSON.parse(sale.items_json) : [];
    return sale;
  }
}

module.exports = new SalesRepository();
