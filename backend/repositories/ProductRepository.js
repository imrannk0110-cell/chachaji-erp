const { getDb } = require('../database');

class ProductRepository {
  async getAll() {
    const db = await getDb();
    return db.all('SELECT * FROM products ORDER BY name ASC');
  }

  async getById(id) {
    const db = await getDb();
    return db.get('SELECT * FROM products WHERE id = ?', [id]);
  }

  async getBySku(sku) {
    const db = await getDb();
    return db.get('SELECT * FROM products WHERE sku = ?', [sku]);
  }

  async create(product) {
    const db = await getDb();
    const { name, sku, uom, purchase_price, selling_price, current_stock, is_starred, location_rack } = product;
    const result = await db.run(`
      INSERT INTO products (name, sku, uom, purchase_price, selling_price, current_stock, is_starred, location_rack)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, sku, uom, purchase_price, selling_price, current_stock, is_starred ? 1 : 0, location_rack || '']);
    return { id: result.lastID, ...product };
  }

  async update(id, product) {
    const db = await getDb();
    const { name, sku, uom, purchase_price, selling_price, current_stock, is_starred, location_rack } = product;
    await db.run(`
      UPDATE products
      SET name = ?, sku = ?, uom = ?, purchase_price = ?, selling_price = ?, current_stock = ?, is_starred = ?, location_rack = ?
      WHERE id = ?
    `, [name, sku, uom, purchase_price, selling_price, current_stock, is_starred ? 1 : 0, location_rack || '', id]);
    return { id, ...product };
  }

  async toggleStar(id, isStarred) {
    const db = await getDb();
    await db.run('UPDATE products SET is_starred = ? WHERE id = ?', [isStarred ? 1 : 0, id]);
    return true;
  }

  async delete(id) {
    const db = await getDb();
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    return true;
  }

  async updateStock(id, quantityToSubtract) {
    const db = await getDb();
    await db.run('UPDATE products SET current_stock = current_stock - ? WHERE id = ?', [quantityToSubtract, id]);
  }
}

module.exports = new ProductRepository();
