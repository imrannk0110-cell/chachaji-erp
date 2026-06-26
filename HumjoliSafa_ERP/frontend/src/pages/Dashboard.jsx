import React, { useState, useEffect } from 'react';
import { Download, Users, Store, IndianRupee, Hammer } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSuppliers: 0,
    activeOrders: 0,
    revenue: 0
  });

  useEffect(() => {
    // In a real scenario, fetch stats from a dedicated backend endpoint
    // For now, doing parallel fetches to get rough counts
    Promise.all([
      fetch('http://localhost:5000/api/customers').then(res => res.json()),
      fetch('http://localhost:5000/api/suppliers').then(res => res.json()),
      fetch('http://localhost:5000/api/orders').then(res => res.json())
    ]).then(([customers, suppliers, orders]) => {
      setStats({
        totalCustomers: customers.length || 0,
        totalSuppliers: suppliers.length || 0,
        activeOrders: (orders || []).filter(o => o.status !== 'Delivered').length,
        revenue: (orders || []).reduce((acc, curr) => acc + (curr.grand_total || 0), 0)
      });
    }).catch(console.error);
  }, []);

  const handleExport = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/export/master');
      const data = await res.json();
      
      // trigger download for each table
      Object.keys(data).forEach((table) => {
        if (!data[table]) return;
        const blob = new Blob([data[table]], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HumjoliSafa_${table}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
      alert('Master Data Exported Successfully!');
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome to Humjoli Safa Management Panel</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleExport}>
          <Download size={18} />
          Export Master Data (CSV)
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4">
        
        <div className="card flex items-center justify-between">
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Revenue</p>
            <h2 style={{ fontSize: '2rem', color: 'var(--accent-gold)' }}>₹{stats.revenue.toLocaleString()}</h2>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(197, 160, 89, 0.1)', borderRadius: '12px', color: 'var(--accent-gold)' }}>
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Active Orders</p>
            <h2 style={{ fontSize: '2rem' }}>{stats.activeOrders}</h2>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
            <Hammer size={24} />
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Customers</p>
            <h2 style={{ fontSize: '2rem' }}>{stats.totalCustomers}</h2>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Active Suppliers</p>
            <h2 style={{ fontSize: '2rem' }}>{stats.totalSuppliers}</h2>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
            <Store size={24} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
