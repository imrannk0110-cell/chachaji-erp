const { getDb } = require('../database');

class CustomerRepository {
  async getAll() {
    const db = await getDb();
    return db.all('SELECT * FROM customers ORDER BY name ASC');
  }

  async getById(id) {
    const db = await getDb();
    return db.get('SELECT * FROM customers WHERE id = ?', [id]);
  }

  async getByPhone(phone) {
    const db = await getDb();
    return db.get('SELECT * FROM customers WHERE phone = ?', [phone]);
  }

  async create(customer) {
    const db = await getDb();
    const { name, phone, group_tag, dob } = customer;
    const result = await db.run(`
      INSERT INTO customers (name, phone, group_tag, dob)
      VALUES (?, ?, ?, ?)
    `, [name, phone, group_tag || 'General', dob || null]);
    return { id: result.lastID, name, phone, group_tag, dob };
  }

  async update(id, customer) {
    const db = await getDb();
    const { name, phone, group_tag, dob } = customer;
    await db.run(`
      UPDATE customers
      SET name = ?, phone = ?, group_tag = ?, dob = ?
      WHERE id = ?
    `, [name, phone, group_tag || 'General', dob || null, id]);
    return { id, name, phone, group_tag, dob };
  }

  async search(query) {
    const db = await getDb();
    return db.all('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 10', [`%${query}%`, `%${query}%`]);
  }

  async getMeasurements(customerId) {
    const db = await getDb();
    return db.get('SELECT * FROM measurements WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1', [customerId]);
  }

  async saveMeasurements(customerId, measurements) {
    const db = await getDb();
    const { 
      collar, chest, waist_upper, hips, shoulder, sleeve_length, 
      arm_hole, upper_length, waist_lower, thigh, bottom_mori, 
      lower_length, head_size, fit_type, notes 
    } = measurements;
    
    const existing = await db.get('SELECT id FROM measurements WHERE customer_id = ?', [customerId]);
    if (existing) {
      await db.run(`
        UPDATE measurements
        SET collar = ?, chest = ?, waist_upper = ?, hips = ?, shoulder = ?, sleeve_length = ?, 
            arm_hole = ?, upper_length = ?, waist_lower = ?, thigh = ?, bottom_mori = ?, 
            lower_length = ?, head_size = ?, fit_type = ?, notes = ?
        WHERE customer_id = ?
      `, [collar, chest, waist_upper, hips, shoulder, sleeve_length, 
          arm_hole, upper_length, waist_lower, thigh, bottom_mori, 
          lower_length, head_size, fit_type, notes, customerId]);
    } else {
      await db.run(`
        INSERT INTO measurements (
          customer_id, collar, chest, waist_upper, hips, shoulder, sleeve_length, 
          arm_hole, upper_length, waist_lower, thigh, bottom_mori, lower_length, 
          head_size, fit_type, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [customerId, collar, chest, waist_upper, hips, shoulder, sleeve_length, 
          arm_hole, upper_length, waist_lower, thigh, bottom_mori, lower_length, 
          head_size, fit_type, notes]);
    }
    return { customer_id: customerId, ...measurements };
  }

  async delete(id) {
    const db = await getDb();
    await db.run('DELETE FROM customers WHERE id = ?', [id]);
    await db.run('DELETE FROM measurements WHERE customer_id = ?', [id]);
    return true;
  }
}

module.exports = new CustomerRepository();
