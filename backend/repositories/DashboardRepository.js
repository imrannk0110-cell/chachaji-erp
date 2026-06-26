const { getDb } = require('../database');

class DashboardRepository {
  async getStats() {
    const db = await getDb();
    
    // Note: column names are grand_total and net_margin, date column is sale_date
    const todayStats = await db.get(`
      SELECT 
        IFNULL(SUM(grand_total), 0) as totalSales,
        IFNULL(SUM(net_margin), 0) as totalProfit,
        COUNT(id) as totalOrders
      FROM sales 
      WHERE date(sale_date, 'localtime') = date('now', 'localtime')
    `);

    const weekStats = await db.get(`
      SELECT 
        IFNULL(SUM(grand_total), 0) as totalSales,
        IFNULL(SUM(net_margin), 0) as totalProfit,
        COUNT(id) as totalOrders
      FROM sales 
      WHERE date(sale_date, 'localtime') >= date('now', '-7 days', 'localtime')
    `);

    const monthStats = await db.get(`
      SELECT 
        IFNULL(SUM(grand_total), 0) as totalSales,
        IFNULL(SUM(net_margin), 0) as totalProfit,
        COUNT(id) as totalOrders
      FROM sales 
      WHERE strftime('%Y-%m', sale_date, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
    `);

    // Dynamically calculate the last 7 days of performance
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const performance = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      
      const dayData = await db.get(`
        SELECT 
          IFNULL(SUM(grand_total), 0) as revenue,
          IFNULL(SUM(net_margin), 0) as profit
        FROM sales
        WHERE date(sale_date, 'localtime') = ?
      `, [dateStr]);
      
      performance.push({
        name: dayName,
        revenue: dayData.revenue,
        profit: dayData.profit
      });
    }

    return {
      today: todayStats,
      week: weekStats,
      month: monthStats,
      weeklyPerformance: performance
    };
  }
}

module.exports = new DashboardRepository();
