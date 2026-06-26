import React, { useState, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { IndianRupee, ClipboardList, Users, Scissors, Package, AlertTriangle, Star } from 'lucide-react';

const COLORS = ['var(--accent-gold)', '#38bdf8', '#fbbf24', '#f43f5e', '#a78bfa', '#34d399'];

const Analytics = () => {
  const [stats, setStats] = useState({
    fabricMargin: 0,
    stitchingMargin: 0,
    totalReceivables: 0,
    totalPayables: 0,
    graphData: [],
    allOrders: [],
    allCustomers: [],
    allManagers: [],
    allDaybook: [],
    
    // Calculated Insights
    aov: 0,
    topDefaulters: [],
    vipCustomers: [],
    articlesData: [],
    demographicsData: [],
    managerWorkload: [],
    cashFlowRatio: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [ordersTrendFilter, setOrdersTrendFilter] = useState('Week');
  const [incomeExpenseFilter, setIncomeExpenseFilter] = useState('7 Days');

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/orders').then(res => res.json()),
      fetch('/api/dashboard/summary').then(res => res.json()),
      fetch('/api/customers').then(res => res.json()),
      fetch('/api/managers').then(res => res.json()),
      fetch('/api/daybook').then(res => res.json())
    ]).then(([orders, summary, customers, managers, daybook]) => {
      
      let fabricMargin = 0;
      let stitchingMargin = 0;
      let totalRevenue = 0;

      // Product parsing
      let articleCounts = {};

      (orders || []).forEach(o => {
          fabricMargin += (o.net_profit || 0) * 0.6; 
          stitchingMargin += (o.net_profit || 0) * 0.4;
          totalRevenue += (parseFloat(o.grand_total) || 0);
          
          let items = [];
          if (typeof o.items_json === 'string') {
              try { items = JSON.parse(o.items_json); } catch(e){}
          } else if (Array.isArray(o.items_json)) {
              items = o.items_json;
          }
          
          items.forEach(item => {
              const name = item.articleName || 'Unknown';
              articleCounts[name] = (articleCounts[name] || 0) + 1;
          });
      });

      // AOV
      const aov = orders.length > 0 ? (totalRevenue / orders.length) : 0;

      // Cash flow ratio
      const totalAdvance = orders.reduce((sum, o) => sum + (parseFloat(o.advance_paid) || 0), 0);
      const totalPending = orders.reduce((sum, o) => sum + (parseFloat(o.balance_due) || 0), 0);
      
      const cashFlowRatio = [
          { name: 'Cash/Advance', value: totalAdvance },
          { name: 'Pending Udhaari', value: totalPending }
      ];

      // Top Defaulters & VIPs
      const sortedByUdhaari = [...customers].sort((a, b) => parseFloat(b.total_udhaari || 0) - parseFloat(a.total_udhaari || 0));
      const topDefaulters = sortedByUdhaari.filter(c => parseFloat(c.total_udhaari || 0) > 0).slice(0, 5);

      // We need to calculate VIP by finding their total spent from orders
      const customerSpend = {};
      orders.forEach(o => {
          if (o.customer_id) {
              customerSpend[o.customer_id] = (customerSpend[o.customer_id] || 0) + parseFloat(o.grand_total || 0);
          }
      });
      const vipCustomers = [...customers]
          .map(c => ({ ...c, totalSpent: customerSpend[c.id] || 0 }))
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);

      // Articles Data for Pie Chart
      const articlesData = Object.keys(articleCounts)
          .map(k => ({ name: k, value: articleCounts[k] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

      // Demographics Data
      const groupCounts = {};
      customers.forEach(c => {
          const group = c.group_tag || 'General';
          groupCounts[group] = (groupCounts[group] || 0) + 1;
      });
      const demographicsData = Object.keys(groupCounts).map(k => ({ name: k, value: groupCounts[k] }));

      // Manager Workload
      const managerWorkload = managers.map(m => {
          const mOrders = orders.filter(o => o.manager_id == m.id && o.status !== 'Delivered');
          let suits = 0;
          mOrders.forEach(o => {
              let items = [];
              if (typeof o.items_json === 'string') {
                  try { items = JSON.parse(o.items_json); } catch(e){}
              } else if (Array.isArray(o.items_json)) {
                  items = o.items_json;
              }
              suits += items.length;
          });
          return { name: m.name, 'Pending Items': suits };
      });

      setStats({
        fabricMargin,
        stitchingMargin,
        totalReceivables: summary?.totalReceivables || 0,
        totalPayables: summary?.totalPayables || 0,
        graphData: summary?.graphData || [],
        allOrders: orders || [],
        allCustomers: customers || [],
        allManagers: managers || [],
        allDaybook: daybook || [],
        aov,
        topDefaulters,
        vipCustomers,
        articlesData,
        demographicsData,
        managerWorkload,
        cashFlowRatio
      });
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, []);

  const getGraphData = () => {
      const todayDate = new Date();
      const graphMap = {};
      
      if (!stats.allDaybook || stats.allDaybook.length === 0) return stats.graphData; // fallback

      if (incomeExpenseFilter === '7 Days' || incomeExpenseFilter === '1 Month' || incomeExpenseFilter === '3 Months') {
          let days = 7;
          if (incomeExpenseFilter === '1 Month') days = 30;
          if (incomeExpenseFilter === '3 Months') days = 90;

          for (let i = days - 1; i >= 0; i--) {
              const d = new Date(todayDate);
              d.setDate(d.getDate() - i);
              const key = d.toISOString().split('T')[0];
              const label = days === 7 ? d.toLocaleDateString('en-GB', {weekday: 'short'}) : d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
              graphMap[key] = { name: label, Income: 0, Expense: 0 };
          }

          stats.allDaybook.forEach(r => {
              const dateStr = (r.created_at || '').split('T')[0];
              if (graphMap[dateStr]) {
                  if (r.type && r.type.startsWith('Income')) graphMap[dateStr].Income += parseFloat(r.amount) || 0;
                  if (r.type && r.type.startsWith('Expense')) graphMap[dateStr].Expense += parseFloat(r.amount) || 0;
              }
          });
          return Object.values(graphMap);
      } else {
          // 6 Months or 1 Year (Group by Month)
          let months = incomeExpenseFilter === '6 Months' ? 6 : 12;
          for (let i = months - 1; i >= 0; i--) {
              const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
              const key = d.toISOString().slice(0, 7); // YYYY-MM
              graphMap[key] = { name: d.toLocaleDateString('en-GB', {month: 'short'}), Income: 0, Expense: 0 };
          }

          stats.allDaybook.forEach(r => {
              const dateStr = (r.created_at || '').slice(0, 7);
              if (graphMap[dateStr]) {
                  if (r.type && r.type.startsWith('Income')) graphMap[dateStr].Income += parseFloat(r.amount) || 0;
                  if (r.type && r.type.startsWith('Expense')) graphMap[dateStr].Expense += parseFloat(r.amount) || 0;
              }
          });
          return Object.values(graphMap);
      }
  };

  const dynamicGraphData = getGraphData();

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1>Business Analytics</h1>
          <p className="subtext">Detailed financial insights and business overview</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-gold)]"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mb-4">

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-4">
              <div className="card p-3 flex items-center justify-between" style={{ borderTop: '3px solid var(--accent-gold)' }}>
                  <div>
                      <p className="subtext text-[11px] m-0 mb-1 uppercase tracking-wider font-semibold">Total Market Value</p>
                      <h3 className="m-0 text-xl">₹{(stats.totalReceivables + stats.totalPayables + stats.fabricMargin + stats.stitchingMargin).toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                  </div>
                  <IndianRupee size={24} color="var(--accent-gold)" opacity={0.4} />
              </div>
              <div className="card p-3 flex items-center justify-between" style={{ borderTop: '3px solid var(--success)' }}>
                  <div>
                      <p className="subtext text-[11px] m-0 mb-1 uppercase tracking-wider font-semibold">Average Ticket Size</p>
                      <h3 className="m-0 text-xl">₹{stats.aov.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                  </div>
                  <Package size={24} color="var(--success)" opacity={0.4} />
              </div>
              <div className="card p-3 flex items-center justify-between" style={{ borderTop: '3px solid var(--danger)' }}>
                  <div>
                      <p className="subtext text-[11px] m-0 mb-1 uppercase tracking-wider font-semibold">Pending Market Udhaari</p>
                      <h3 className="m-0 text-xl text-danger">₹{stats.totalReceivables.toLocaleString()}</h3>
                  </div>
                  <AlertTriangle size={24} color="var(--danger)" opacity={0.4} />
              </div>
              <div className="card p-3 flex items-center justify-between" style={{ borderTop: '3px solid #38bdf8' }}>
                  <div>
                      <p className="subtext text-[11px] m-0 mb-1 uppercase tracking-wider font-semibold">Total Customers</p>
                      <h3 className="m-0 text-xl">{stats.allCustomers.length}</h3>
                  </div>
                  <Users size={24} color="#38bdf8" opacity={0.4} />
              </div>
          </div>

          {/* Row 2: Charts (50%, 25%, 25%) */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
            {/* Business Overview Chart */}
            <div className="card flex flex-col justify-between" style={{ padding: '1rem' }}>
            <div className="flex flex-wrap justify-between items-center mb-2 gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="flex items-center gap-2 m-0 text-[15px]"><IndianRupee size={16} /> Income vs Expense</h3>
                    <select 
                        className="bg-[var(--surface-light)] border border-[var(--border-color)] rounded text-xs p-1 outline-none text-white cursor-pointer"
                        value={incomeExpenseFilter}
                        onChange={e => setIncomeExpenseFilter(e.target.value)}
                    >
                        <option value="7 Days">7 Days</option>
                        <option value="1 Month">1 Month</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                        <option value="1 Year">1 Year</option>
                    </select>
                </div>
                <div className="flex flex-wrap gap-4">
                    <div className="text-right">
                        <p className="subtext text-[10px] m-0">Est. Fabric Profit</p>
                        <span className="font-bold text-[var(--accent-gold)] text-sm">₹{stats.fabricMargin.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                        <p className="subtext text-[10px] m-0">Est. Stitching Profit</p>
                        <span className="font-bold text-[var(--success)] text-sm">₹{stats.stitchingMargin.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            <div style={{ width: '100%', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicGraphData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                        <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} width={40} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '12px' }} />
                        <Bar dataKey="Income" fill="var(--success)" radius={[4, 4, 0, 0]} name="Daily Income" maxBarSize={40} />
                        <Bar dataKey="Expense" fill="var(--danger)" radius={[4, 4, 0, 0]} name="Daily Expense" maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            </div>

            {/* Cash Flow Doughnut */}
            <div className="card flex flex-col justify-between" style={{ padding: '1rem' }}>
              <h3 className="flex items-center gap-2 m-0 mb-2 text-[15px]"><PieChart size={16} /> Cash Flow Ratio</h3>
              <div style={{ width: '100%', height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={stats.cashFlowRatio}
                              cx="50%"
                              cy="45%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {stats.cashFlowRatio.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--success)' : 'var(--danger)'} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }} />
                          <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
            </div>

            {/* Manager Workload */}
            <div className="card" style={{ padding: '1rem' }}>
              <h3 className="flex items-center gap-2 m-0 mb-2 text-[15px]"><Scissors size={16} /> Workshop Output</h3>
              <div style={{ width: '100%', height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.managerWorkload} layout="vertical" margin={{ top: 0, right: 15, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                          <XAxis type="number" stroke="#888" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" stroke="#888" width={80} tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="Pending Items" fill="var(--accent-gold)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: Product & Demographics (50%, 50%) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Product Insights */}
            <div className="card" style={{ padding: '1rem' }}>
              <h3 className="flex items-center gap-2 m-0 mb-2 text-[15px]"><Package size={16} /> Top Articles</h3>
              <div style={{ width: '100%', height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={stats.articlesData}
                              cx="50%"
                              cy="50%"
                              outerRadius={65}
                              dataKey="value"
                              label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                              style={{ fontSize: '10px' }}
                          >
                              {stats.articlesData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
            </div>
            
            {/* Customer Demographics */}
            <div className="card" style={{ padding: '1rem' }}>
              <h3 className="flex items-center gap-2 m-0 mb-2 text-[15px]"><Users size={16} /> Audience Demographics</h3>
              <div style={{ width: '100%', height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={stats.demographicsData}
                              cx="50%"
                              cy="45%"
                              outerRadius={60}
                              dataKey="value"
                              label={{ fontSize: '10px' }}
                          >
                              {stats.demographicsData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['var(--accent-gold)', 'var(--success)', '#38bdf8', '#a78bfa'][index % 4]} />
                              ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }} />
                          <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 4: Lists (50%, 50%) */}
          <div className="grid grid-cols-2 gap-4">
            {/* VIP Customers */}
            <div className="card" style={{ padding: '1rem' }}>
              <h3 className="flex items-center gap-2 m-0 mb-3 text-success text-[15px]"><Star size={16} /> Top VIP Customers</h3>
              <div className="flex flex-col gap-2">
                  {stats.vipCustomers.length === 0 ? <p className="subtext text-xs m-0">No VIPs found.</p> : stats.vipCustomers.slice(0, 3).map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded bg-[var(--surface-light)] border border-[var(--border-color)]">
                          <div>
                              <p className="m-0 font-bold text-sm">{c.name}</p>
                              <p className="m-0 text-[10px] subtext">{c.phone}</p>
                          </div>
                          <span className="font-bold text-success text-sm">₹{c.totalSpent.toLocaleString()}</span>
                      </div>
                  ))}
              </div>
            </div>

            {/* Top Defaulters */}
            <div className="card" style={{ padding: '1rem' }}>
              <h3 className="flex items-center gap-2 m-0 mb-3 text-danger text-[15px]"><AlertTriangle size={16} /> Top Udhaari Defaulters</h3>
              <div className="flex flex-col gap-2">
                  {stats.topDefaulters.length === 0 ? <p className="subtext text-success text-xs m-0">All clear! No pending udhaari.</p> : stats.topDefaulters.slice(0, 3).map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded bg-[rgba(244,63,94,0.05)] border border-[rgba(244,63,94,0.2)]">
                          <div>
                              <p className="m-0 font-bold text-sm">{c.name}</p>
                              <p className="m-0 text-[10px] subtext">{c.phone}</p>
                          </div>
                          <span className="font-bold text-danger text-sm">₹{parseFloat(c.total_udhaari).toLocaleString()}</span>
                      </div>
                  ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
