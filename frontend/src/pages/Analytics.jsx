import React, { useState, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { IndianRupee, ClipboardList, Users, Package, AlertTriangle, Star, Activity, Settings, TrendingUp, AlertCircle, ShoppingCart, Hammer } from 'lucide-react';

const COLORS = ['var(--accent-gold)', '#38bdf8', '#10b981', '#f43f5e', '#a78bfa', '#06b6d4'];

const Analytics = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    netProfit: 0,
    aov: 0,
    totalReceivables: 0,
    totalPayables: 0,
    totalFloorLabor: 0,
    
    // Custom Fabrication margins
    customRevenue: 0,
    customProfit: 0,
    customCount: 0,
    
    // Direct Counter sales margins
    directRevenue: 0,
    directProfit: 0,
    directCount: 0,
    
    // B2C vs B2B Channels
    retailRevenue: 0,
    retailProfit: 0,
    retailCount: 0,
    wholesaleRevenue: 0,
    wholesaleProfit: 0,
    wholesaleCount: 0,
    
    // Low stock items warning list
    lowStockItems: [],
    
    // Recharts Data
    graphData: [],
    channelMix: [],
    topSellingStoves: [],
    floorWorkload: [],
    
    // Lists
    topDefaulters: [],
    vipCustomers: [],
    roundoffs: { preBookTotal: 0, preBookCount: 0, postDeliveryTotal: 0, postDeliveryCount: 0 },
    
    // Raw lists
    allDaybook: [],
    allOrders: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [incomeExpenseFilter, setIncomeExpenseFilter] = useState('7 Days');

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/orders').then(res => res.json()),
      fetch('/api/dashboard/summary').then(res => res.json()),
      fetch('/api/customers').then(res => res.json()),
      fetch('/api/managers').then(res => res.json()),
      fetch('/api/daybook').then(res => res.json()),
      fetch('/api/dashboard/roundoffs').then(res => res.json()),
      fetch('/api/products').then(res => res.json())
    ]).then(([orders, summary, customers, managers, daybook, roundoffs, products]) => {
      
      let totalSales = 0;
      let netProfit = 0;
      let totalFloorLabor = 0;
      
      let customRevenue = 0;
      let customProfit = 0;
      let customCount = 0;
      
      let directRevenue = 0;
      let directProfit = 0;
      let directCount = 0;
      
      let retailRevenue = 0;
      let retailProfit = 0;
      let retailCount = 0;
      
      let wholesaleRevenue = 0;
      let wholesaleProfit = 0;
      let wholesaleCount = 0;
      
      let articleCounts = {};

      (orders || []).forEach(o => {
          const grandTotal = parseFloat(o.grand_total) || 0;
          const orderProfit = parseFloat(o.net_profit) || 0;
          
          totalSales += grandTotal;
          netProfit += orderProfit;

          // Parse items
          let items = [];
          if (typeof o.items_json === 'string') {
              try { items = JSON.parse(o.items_json); } catch(e){}
          } else if (Array.isArray(o.items_json)) {
              items = o.items_json;
          }
          
          // Accrued Floor Labor charges
          if (o.status === 'Delivered') {
              items.forEach(item => {
                  const qty = parseInt(item.qty) || 1;
                  totalFloorLabor += (parseFloat(item.managerPayout) || parseFloat(item.stitchingPayout) || 0) * qty;
              });
          }

          // Top selling articles count
          items.forEach(item => {
              const name = item.articleName || item.name || 'Unknown Item';
              const qty = parseInt(item.qty) || 1;
              articleCounts[name] = (articleCounts[name] || 0) + qty;
          });

          // Group by Custom vs Direct
          if (o.order_type === 'Custom') {
              customRevenue += grandTotal;
              customProfit += orderProfit;
              customCount += 1;
          } else {
              directRevenue += grandTotal;
              directProfit += orderProfit;
              directCount += 1;
          }

          // Group by Channel B2C Retail vs B2B Wholesale
          if (o.sale_type === 'Wholesale') {
              wholesaleRevenue += grandTotal;
              wholesaleProfit += orderProfit;
              wholesaleCount += 1;
          } else {
              retailRevenue += grandTotal;
              retailProfit += orderProfit;
              retailCount += 1;
          }
      });

      // Average Order Value (AOV)
      const aov = orders.length > 0 ? (totalSales / orders.length) : 0;

      // Channel Mix chart data
      const channelMix = [
          { name: 'B2B Wholesale Dealers', value: wholesaleRevenue },
          { name: 'B2C Retail Customers', value: retailRevenue }
      ];

      // Top Selling Stoves chart data
      const topSellingStoves = Object.keys(articleCounts)
          .map(k => ({ name: k, value: articleCounts[k] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

      // Floor Workloads
      const floorWorkload = (managers || []).map(m => {
          const mOrders = (orders || []).filter(o => (o.factory_unit_id == m.id || o.manager_id == m.id) && o.status !== 'Delivered');
          let pendingStoves = 0;
          mOrders.forEach(o => {
              let items = [];
              if (typeof o.items_json === 'string') {
                  try { items = JSON.parse(o.items_json); } catch(e){}
              } else if (Array.isArray(o.items_json)) {
                  items = o.items_json;
              }
              items.forEach(i => {
                  pendingStoves += parseInt(i.qty) || 1;
              });
          });
          return { name: m.name, 'Pending Stoves': pendingStoves };
      }).filter(w => w['Pending Stoves'] > 0);

      // Top Defaulters & VIPs
      const sortedByUdhaari = [...(customers || [])].sort((a, b) => parseFloat(b.total_udhaari || 0) - parseFloat(a.total_udhaari || 0));
      const topDefaulters = sortedByUdhaari.filter(c => parseFloat(c.total_udhaari || 0) > 0).slice(0, 5);

      const customerSpend = {};
      (orders || []).forEach(o => {
          if (o.customer_id) {
              customerSpend[o.customer_id] = (customerSpend[o.customer_id] || 0) + parseFloat(o.grand_total || 0);
          }
      });
      const vipCustomers = [...(customers || [])]
          .map(c => ({ ...c, totalSpent: customerSpend[c.id] || 0 }))
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);

      // Low Stock items warning list (spares/materials <= 10 stock)
      const lowStockItems = (products || [])
          .filter(p => p.total_stock <= 10)
          .sort((a, b) => a.total_stock - b.total_stock)
          .slice(0, 5);

      setStats({
        totalSales,
        netProfit,
        aov,
        totalReceivables: summary?.totalReceivables || 0,
        totalPayables: summary?.totalPayables || 0,
        totalFloorLabor,
        customRevenue,
        customProfit,
        customCount,
        directRevenue,
        directProfit,
        directCount,
        retailRevenue,
        retailProfit,
        retailCount,
        wholesaleRevenue,
        wholesaleProfit,
        wholesaleCount,
        lowStockItems,
        graphData: summary?.graphData || [],
        channelMix,
        topSellingStoves,
        floorWorkload,
        topDefaulters,
        vipCustomers,
        roundoffs: roundoffs || { preBookTotal: 0, preBookCount: 0, postDeliveryTotal: 0, postDeliveryCount: 0 },
        allDaybook: daybook || [],
        allOrders: orders || []
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
      
      if (!stats.allDaybook || stats.allDaybook.length === 0) return stats.graphData;

      if (incomeExpenseFilter === '7 Days' || incomeExpenseFilter === '1 Month' || incomeExpenseFilter === '3 Months') {
          let days = 7;
          if (incomeExpenseFilter === '1 Month') days = 30;
          if (incomeExpenseFilter === '3 Months') days = 90;

          for (let i = days - 1; i >= 0; i--) {
              const d = new Date(todayDate);
              d.setDate(d.getDate() - i);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const key = `${y}-${m}-${day}`;
              const label = days === 7 ? d.toLocaleDateString('en-GB', {weekday: 'short'}) : d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
              graphMap[key] = { name: label, Income: 0, Expense: 0 };
          }

          stats.allDaybook.forEach(r => {
              const dateStr = (r.created_at || '').substring(0, 10);
              if (graphMap[dateStr]) {
                  if (r.type && r.type.startsWith('Income')) graphMap[dateStr].Income += parseFloat(r.amount) || 0;
                  if (r.type && r.type.startsWith('Expense')) graphMap[dateStr].Expense += parseFloat(r.amount) || 0;
              }
          });
          return Object.values(graphMap);
      } else {
          let months = incomeExpenseFilter === '6 Months' ? 6 : 12;
          for (let i = months - 1; i >= 0; i--) {
              const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const key = `${y}-${m}`;
              graphMap[key] = { name: d.toLocaleDateString('en-GB', {month: 'short'}), Income: 0, Expense: 0 };
          }

          stats.allDaybook.forEach(r => {
              const dateStr = (r.created_at || '').substring(0, 7);
              if (graphMap[dateStr]) {
                  if (r.type && r.type.startsWith('Income')) graphMap[dateStr].Income += parseFloat(r.amount) || 0;
                  if (r.type && r.type.startsWith('Expense')) graphMap[dateStr].Expense += parseFloat(r.amount) || 0;
              }
          });
          return Object.values(graphMap);
      }
  };

  const dynamicGraphData = getGraphData();

  // Gross profit percentage
  const grossMarginPercent = stats.totalSales > 0 ? ((stats.netProfit / stats.totalSales) * 100).toFixed(1) : 0;

  return (
    <div className="container mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 style={{ margin: 0 }}>Business Analytics</h1>
          <p className="subtext">Kitchen Equipment Manufacturing & Wholesale Dealer Performance Insights</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-gold)]"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* 1. HIGH-IMPACT INDUSTRIAL KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Gross Sales */}
              <div className="card p-4 flex items-center justify-between" style={{ borderTop: '3px solid var(--accent-gold)' }}>
                  <div>
                      <p className="subtext text-[10px] m-0 mb-1 uppercase tracking-wider font-bold">Total Sales Revenue</p>
                      <h3 className="m-0 text-xl font-bold text-[var(--text-primary)]">₹{stats.totalSales.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                      <p className="m-0 text-[10px] text-[var(--text-secondary)] mt-1">{stats.allOrders.length} orders total</p>
                  </div>
                  <IndianRupee size={22} color="var(--accent-gold)" opacity={0.6} />
              </div>
              
              {/* Net Profit & Margin */}
              <div className="card p-4 flex items-center justify-between" style={{ borderTop: '3px solid var(--success)' }}>
                  <div>
                      <p className="subtext text-[10px] m-0 mb-1 uppercase tracking-wider font-bold">Net Profit Margin</p>
                      <h3 className="m-0 text-xl font-bold text-success">₹{stats.netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                      <span className="badge text-[10px] mt-1" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                          {grossMarginPercent}% Margin
                      </span>
                  </div>
                  <TrendingUp size={22} color="var(--success)" opacity={0.6} />
              </div>

              {/* AOV B2B vs B2C */}
              <div className="card p-4 flex items-center justify-between" style={{ borderTop: '3px solid #3b82f6' }}>
                  <div>
                      <p className="subtext text-[10px] m-0 mb-1 uppercase tracking-wider font-bold">Average Ticket Size</p>
                      <h3 className="m-0 text-xl font-bold text-[var(--text-primary)]">₹{stats.aov.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                      <div className="flex gap-2 text-[9px] subtext mt-1">
                          <span>B2B: ₹{(stats.wholesaleRevenue / (stats.wholesaleCount || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                      </div>
                  </div>
                  <ShoppingCart size={22} color="#3b82f6" opacity={0.6} />
              </div>

              {/* Pending Udhaari */}
              <div className="card p-4 flex items-center justify-between" style={{ borderTop: '3px solid var(--danger)' }}>
                  <div>
                      <p className="subtext text-[10px] m-0 mb-1 uppercase tracking-wider font-bold">Pending Udhaari</p>
                      <h3 className="m-0 text-xl font-bold text-danger">₹{stats.totalReceivables.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                      <p className="m-0 text-[10px] text-danger mt-1">Receivables due</p>
                  </div>
                  <AlertTriangle size={22} color="var(--danger)" opacity={0.6} />
              </div>

              {/* Factory Labor Cost */}
              <div className="card p-4 flex items-center justify-between" style={{ borderTop: '3px solid #a78bfa' }}>
                  <div>
                      <p className="subtext text-[10px] m-0 mb-1 uppercase tracking-wider font-bold">Floor Labor Costs</p>
                      <h3 className="m-0 text-xl font-bold text-[#a78bfa]">₹{stats.totalFloorLabor.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                      <p className="m-0 text-[10px] text-[#a78bfa] mt-1">Accrued worker wages</p>
                  </div>
                  <Hammer size={22} color="#a78bfa" opacity={0.6} />
              </div>
          </div>

          {/* 2. CUSTOM FABRICATION VS COUNTER SALES COMPARISON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Custom projects */}
              <div className="card p-5 relative overflow-hidden" style={{ borderLeft: '5px solid var(--accent-gold)' }}>
                  <div className="flex justify-between items-start mb-3">
                      <div>
                          <span className="badge text-[9px] uppercase font-bold" style={{ backgroundColor: 'rgba(218, 165, 32, 0.15)', color: 'var(--accent-gold)' }}>Heavy Duty Fabrication</span>
                          <h3 className="m-0 mt-2 text-lg font-bold">Custom Kitchen Fabrication</h3>
                      </div>
                      <Settings size={28} className="text-[var(--accent-gold)] opacity-20" />
                  </div>
                  <p className="subtext text-xs mb-4">Custom designer stoves, high-pressure burners, commercial setups, pipeline fittings.</p>
                  <div className="grid grid-cols-3 gap-2 text-center bg-[var(--surface-light)] p-3 rounded-lg border border-[var(--border-color)]">
                      <div>
                          <p className="subtext text-[10px] m-0">Revenue</p>
                          <span className="font-bold text-sm text-[var(--text-primary)]">₹{stats.customRevenue.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div className="border-x border-[var(--border-color)]">
                          <p className="subtext text-[10px] m-0">Net Margin</p>
                          <span className="font-bold text-sm text-[var(--accent-gold)]">₹{stats.customProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div>
                          <p className="subtext text-[10px] m-0">Completed</p>
                          <span className="font-bold text-sm text-[var(--text-primary)]">{stats.customCount} Projects</span>
                      </div>
                  </div>
              </div>

              {/* Direct OTC Counter & Spares */}
              <div className="card p-5 relative overflow-hidden" style={{ borderLeft: '5px solid #06b6d4' }}>
                  <div className="flex justify-between items-start mb-3">
                      <div>
                          <span className="badge text-[9px] uppercase font-bold" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>Ready-Made Spares</span>
                          <h3 className="m-0 mt-2 text-lg font-bold">OTC Counter & Spares Dealer</h3>
                      </div>
                      <ShoppingCart size={28} className="text-[#06b6d4] opacity-20" />
                  </div>
                  <p className="subtext text-xs mb-4">Direct stove sales, regulators, hose pipes, ready-made heavy duty domestic top burners.</p>
                  <div className="grid grid-cols-3 gap-2 text-center bg-[var(--surface-light)] p-3 rounded-lg border border-[var(--border-color)]">
                      <div>
                          <p className="subtext text-[10px] m-0">Revenue</p>
                          <span className="font-bold text-sm text-[var(--text-primary)]">₹{stats.directRevenue.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div className="border-x border-[var(--border-color)]">
                          <p className="subtext text-[10px] m-0">Net Margin</p>
                          <span className="font-bold text-sm text-[#06b6d4]">₹{stats.directProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div>
                          <p className="subtext text-[10px] m-0">Sold</p>
                          <span className="font-bold text-sm text-[var(--text-primary)]">{stats.directCount} Sales</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* 3. CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Income vs Expense Graph */}
              <div className="card lg:col-span-2 flex flex-col justify-between p-4" style={{ minWidth: 0 }}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="flex items-center gap-2 m-0 text-sm font-bold">
                          <Activity size={16} color="var(--accent-gold)" /> Daily Cash Ledger Trend
                      </h3>
                      <select 
                          className="bg-[var(--surface-light)] border border-[var(--border-color)] rounded text-xs p-1 outline-none text-[var(--text-primary)] cursor-pointer"
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
                  <div style={{ width: '100%', height: '220px' }}>
                      <ResponsiveContainer width="99%" height="100%" minHeight={220}>
                          <AreaChart data={dynamicGraphData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                              <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                              <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={45} />
                              <Tooltip contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} />
                              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                              <Area type="monotone" dataKey="Income" stroke="var(--success)" fillOpacity={1} fill="url(#colorIncome)" name="Inflow (POS/Manual)" strokeWidth={2} />
                              <Area type="monotone" dataKey="Expense" stroke="var(--danger)" fillOpacity={1} fill="url(#colorExpense)" name="Outflow (Suppliers/Wages)" strokeWidth={2} />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* B2B Wholesale vs B2C Retail channel revenue */}
              <div className="card flex flex-col justify-between p-4" style={{ minWidth: 0 }}>
                  <h3 className="flex items-center gap-2 m-0 mb-4 text-sm font-bold">
                      <ShoppingCart size={16} color="#3b82f6" /> Sales Channel Mix
                  </h3>
                  <div style={{ width: '100%', height: '180px' }}>
                      <ResponsiveContainer width="99%" height="100%" minHeight={180}>
                          <PieChart>
                              <Pie
                                  data={stats.channelMix}
                                  cx="50%"
                                  cy="48%"
                                  innerRadius={45}
                                  outerRadius={65}
                                  paddingAngle={4}
                                  dataKey="value"
                              >
                                  <Cell fill="#3b82f6" />
                                  <Cell fill="#10b981" />
                              </Pie>
                              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} />
                              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Top Selling Equipment Stoves models */}
              <div className="card flex flex-col justify-between p-4" style={{ minWidth: 0 }}>
                  <h3 className="flex items-center gap-2 m-0 mb-4 text-sm font-bold">
                      <Package size={16} color="var(--accent-gold)" /> Product Demand
                  </h3>
                  <div style={{ width: '100%', height: '180px' }}>
                      {stats.topSellingStoves.length === 0 ? (
                          <div className="h-full flex items-center justify-center subtext text-xs">No orders logged yet.</div>
                      ) : (
                          <ResponsiveContainer width="99%" height="100%" minHeight={180}>
                              <PieChart>
                                  <Pie
                                      data={stats.topSellingStoves}
                                      cx="50%"
                                      cy="48%"
                                      outerRadius={60}
                                      dataKey="value"
                                      label={({ name, percent, x, y, cx }) => (
                                          <text
                                              x={x}
                                              y={y}
                                              fill="var(--text-primary)"
                                              textAnchor={x > cx ? 'start' : 'end'}
                                              dominantBaseline="central"
                                              style={{ fontSize: '9px', fontWeight: '500' }}
                                          >
                                              {`${name.substring(0, 12)} (${(percent * 100).toFixed(0)}%)`}
                                          </text>
                                      )}
                                  >
                                      {stats.topSellingStoves.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      )}
                  </div>
              </div>
          </div>

          {/* 4. WORKLOAD & CRITICAL STOCK REORDER ALERTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Floor unit workload */}
              <div className="card p-4 flex flex-col justify-between lg:col-span-1">
                  <h3 className="flex items-center gap-2 m-0 mb-3 text-sm font-bold">
                      <Hammer size={16} color="#a78bfa" /> Floor Fabrication Workload
                  </h3>
                  <div style={{ width: '100%', height: '180px' }}>
                      {stats.floorWorkload.length === 0 ? (
                          <div className="h-full flex items-center justify-center subtext text-xs">All fabrication floors are clear.</div>
                      ) : (
                          <ResponsiveContainer width="99%" height="100%" minHeight={180}>
                              <BarChart data={stats.floorWorkload} layout="vertical" margin={{ top: 0, right: 15, left: -25, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} opacity={0.4} />
                                  <XAxis type="number" stroke="var(--text-secondary)" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
                                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={70} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                  <Bar dataKey="Pending Stoves" fill="#a78bfa" radius={[0, 4, 4, 0]} maxBarSize={15} name="Pending Units" />
                              </BarChart>
                          </ResponsiveContainer>
                      )}
                  </div>
              </div>

              {/* Critical stock warn list (raw material / burners <= 10 units) */}
              <div className="card p-4 lg:col-span-2">
                  <h3 className="flex items-center gap-2 m-0 mb-3 text-danger text-sm font-bold">
                      <AlertCircle size={16} color="var(--danger)" /> Spares & Raw Materials Stock Alerts (Reorder required)
                  </h3>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <th className="pb-2 font-bold subtext">SKU</th>
                                  <th className="pb-2 font-bold subtext">Item Name</th>
                                  <th className="pb-2 font-bold subtext">Category</th>
                                  <th className="pb-2 text-right font-bold subtext">Current Stock</th>
                              </tr>
                          </thead>
                          <tbody>
                              {stats.lowStockItems.length === 0 ? (
                                  <tr>
                                      <td colSpan={4} className="py-4 text-center subtext">All raw materials & spare parts levels are healthy.</td>
                                  </tr>
                              ) : (
                                  stats.lowStockItems.map((item, index) => (
                                      <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                          <td className="py-2.5 font-mono text-[11px] text-[var(--text-primary)]">{item.sku}</td>
                                          <td className="py-2.5 font-bold text-[var(--text-primary)]">{item.name}</td>
                                          <td className="py-2.5 text-[var(--text-secondary)]">{item.category}</td>
                                          <td className="py-2.5 text-right font-bold text-danger">
                                              <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(244,63,94,0.08)' }}>
                                                  {item.total_stock} pcs
                                              </span>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* 5. DEFICITS, VIP CLIENTS, AND DISCOUNTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* VIP B2B Dealers */}
              <div className="card p-4">
                  <h3 className="flex items-center gap-2 m-0 mb-3 text-success text-sm font-bold">
                      <Star size={16} color="var(--success)" /> Top VIP Wholesale Dealers
                  </h3>
                  <div className="flex flex-col gap-2">
                      {stats.vipCustomers.length === 0 ? (
                          <p className="subtext text-xs m-0">No dealer purchasing history yet.</p>
                      ) : (
                          stats.vipCustomers.slice(0, 4).map((c, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 rounded bg-[var(--surface-light)] border border-[var(--border-color)]">
                                  <div>
                                      <p className="m-0 font-bold text-xs text-[var(--text-primary)]">{c.name}</p>
                                      <p className="m-0 text-[9px] subtext">{c.phone || 'No phone'}</p>
                                  </div>
                                  <span className="font-bold text-success text-xs">₹{c.totalSpent.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              {/* Top outstanding Udhaari ledger accounts */}
              <div className="card p-4">
                  <h3 className="flex items-center gap-2 m-0 mb-3 text-danger text-sm font-bold">
                      <AlertTriangle size={16} color="var(--danger)" /> Udhaari Outstanding Ledgers
                  </h3>
                  <div className="flex flex-col gap-2">
                      {stats.topDefaulters.length === 0 ? (
                          <p className="subtext text-success text-xs m-0">All client ledgers are clear! No pending Udhaari.</p>
                      ) : (
                          stats.topDefaulters.slice(0, 4).map((c, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 rounded bg-[rgba(244,63,94,0.04)] border border-[rgba(244,63,94,0.15)]">
                                  <div>
                                      <p className="m-0 font-bold text-xs text-[var(--text-primary)]">{c.name}</p>
                                      <p className="m-0 text-[9px] subtext">{c.phone || 'No phone'}</p>
                                  </div>
                                  <span className="font-bold text-danger text-xs">₹{parseFloat(c.total_udhaari).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              {/* Losses & Discounts write-offs */}
              <div className="card p-4">
                  <h3 className="flex items-center gap-2 m-0 mb-3 text-sm font-bold text-[var(--text-primary)]">
                      <AlertCircle size={16} color="var(--accent-gold)" /> Negotiation Discount Write-offs
                  </h3>
                  <div className="flex flex-col gap-3">
                      {/* Prebook negotiations */}
                      <div className="flex items-center justify-between p-2.5 rounded bg-[var(--surface-light)] border border-[var(--border-color)]">
                          <div>
                              <p className="m-0 font-bold text-xs text-[var(--text-primary)]">Pre-Book Roundoff Adjustments</p>
                              <p className="m-0 text-[9px] subtext">Negotiation losses from {stats.roundoffs.preBookCount || 0} sales</p>
                          </div>
                          <div className="text-right">
                              <span className="font-bold text-danger text-xs">-₹{(stats.roundoffs.preBookTotal || 0).toLocaleString()}</span>
                          </div>
                      </div>
                      
                      {/* Post-delivery bad debt roundoffs */}
                      <div className="flex items-center justify-between p-2.5 rounded bg-[var(--surface-light)] border border-[var(--border-color)]">
                          <div>
                              <p className="m-0 font-bold text-xs text-[var(--text-primary)]">Post-Delivery Bad Debts</p>
                              <p className="m-0 text-[9px] subtext">Udhaari balance write-offs at delivery</p>
                          </div>
                          <div className="text-right">
                              <span className="font-bold text-danger text-xs">-₹{(stats.roundoffs.postDeliveryTotal || 0).toLocaleString()}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
