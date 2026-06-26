import React, { useState, useEffect } from 'react';
import { Search, Filter, ClipboardList, Eye } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const AllOrders = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(location.state?.search || '');
  const [activeFilter, setActiveFilter] = useState(location.state?.filter || 'All'); // 'All', 'In workshop', 'Ready for trial', 'Delivered', "Today's Orders"
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = orders;

    // Apply Filter
    if (activeFilter !== 'All') {
      if (activeFilter === 'In workshop') {
        result = result.filter(o => o.status?.toLowerCase() === 'in workshop' || o.status?.toLowerCase() === 'workshop' || o.status?.toLowerCase() === 'processing');
      } else if (activeFilter === 'Ready for trial') {
        result = result.filter(o => o.status?.toLowerCase() === 'ready for trial' || o.status?.toLowerCase() === 'trial ready');
      } else if (activeFilter === 'Delivered') {
        result = result.filter(o => o.status?.toLowerCase() === 'delivered');
      } else if (activeFilter === "Today's Orders") {
        const today = new Date().toISOString().split('T')[0];
        result = result.filter(o => {
          if(!o.booked_date) return false;
          return new Date(o.booked_date).toISOString().split('T')[0] === today;
        });
      }
    }

    // Apply Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.customer_phone && o.customer_phone.toLowerCase().includes(q))
      );
    }

    setFilteredOrders(result);
  }, [orders, activeFilter, searchQuery]);

  const filters = ['All', "Today's Orders", 'In workshop', 'Ready for trial', 'Delivered'];

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1>All Orders</h1>
          <p className="subtext">Lifetime order history and management</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex" style={{ flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: '1', minWidth: '250px', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search by Order ID, Name, Phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 48px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
            {filters.map(filter => {
              const isActive = activeFilter === filter;
              const count = orders.filter(o => {
                if (filter === 'All') return true;
                if (filter === "Today's Orders") {
                   const today = new Date().toISOString().split('T')[0];
                   return o.booked_date && new Date(o.booked_date).toISOString().split('T')[0] === today;
                }
                if (filter === 'In workshop') return o.status?.toLowerCase() === 'in workshop' || o.status?.toLowerCase() === 'workshop' || o.status?.toLowerCase() === 'processing';
                if (filter === 'Ready for trial') return o.status?.toLowerCase() === 'ready for trial' || o.status?.toLowerCase() === 'trial ready';
                if (filter === 'Delivered') return o.status?.toLowerCase() === 'delivered';
                return false;
              }).length;

              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className="btn-secondary flex items-center gap-2"
                  style={{
                    backgroundColor: isActive ? 'var(--accent-gold)' : 'var(--surface-light)',
                    color: isActive ? '#000' : 'var(--text-primary)',
                    borderColor: isActive ? 'var(--accent-gold)' : 'var(--border-color)',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem'
                  }}
                >
                  {filter === 'All' && <ClipboardList size={16} />}
                  {filter}
                  <span className="badge" style={{ 
                    backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'var(--bg-color)', 
                    color: isActive ? '#000' : 'var(--text-secondary)',
                    marginLeft: '4px'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card table-wrapper">
        {isLoading ? (
          <div className="flex justify-center items-center" style={{ padding: '3rem' }}>
            <p className="subtext">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <ClipboardList size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
            <p className="subtext">No orders found matching your criteria.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{order.id}</td>
                  <td>{order.booked_date ? new Date(order.booked_date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{order.customer_name}</div>
                    <div className="subtext" style={{ fontSize: '0.75rem' }}>{order.customer_phone}</div>
                  </td>
                  <td style={{ fontWeight: '600' }}>₹{(order.grand_total || 0).toLocaleString()}</td>
                  <td>
                    <span className={order.status === 'Delivered' ? 'badge badge-success' : 'badge'} style={{
                      backgroundColor: order.status === 'Ready for trial' ? 'rgba(59, 130, 246, 0.15)' : 
                                       order.status === 'Delivered' ? undefined : 'rgba(197, 160, 89, 0.15)',
                      color: order.status === 'Ready for trial' ? '#3b82f6' : 
                             order.status === 'Delivered' ? undefined : 'var(--accent-gold)',
                      border: order.status === 'Ready for trial' ? '1px solid rgba(59, 130, 246, 0.4)' : 
                              order.status === 'Delivered' ? undefined : '1px solid rgba(197, 160, 89, 0.4)'
                    }}>
                      {order.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AllOrders;
