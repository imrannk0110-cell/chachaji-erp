import { useState, useEffect } from 'react';
import { Search, Users, Calendar, Plus, Trash2, User, Filter, X, ShoppingBag } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Customers() {
  const location = useLocation();
  const [filterUdhaari, setFilterUdhaari] = useState(location.state?.filter === 'Udhaari');
  const [showItemsForId, setShowItemsForId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  // Add Customer modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', group_tag: 'General', dob: '' });

  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [profileCustomer, setProfileCustomer] = useState(null);

  // Clear Dues modal states
  const [showClearDuesModal, setShowClearDuesModal] = useState(false);
  const [clearingOrder, setClearingOrder] = useState(null);
  const [clearDuesData, setClearDuesData] = useState({ amount: 0, type: 'Payment', paymentMode: 'Cash' });

  const fetchCustomers = async (q = '') => {
    try {
      const url = q ? `/api/customers/search?q=${q}` : '/api/customers';
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewCustomer({ name: '', phone: '', group_tag: 'General', dob: '' });
        fetchCustomers();
      } else {
        alert('Failed to register customer. Note: Phone numbers must be unique.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenProfile = async (customer) => {
      setProfileCustomer(customer);
      try {
          const res = await fetch(`/api/customers/${customer.id}/orders`);
          const data = await res.json();
          setCustomerOrders(data);
          setShowProfileModal(true);
      } catch (err) {
          console.error(err);
      }
  };

  const handleOpenClearDues = (order) => {
      setClearingOrder(order);
      setClearDuesData({ amount: order.balance_due, type: 'Payment', paymentMode: 'Cash' });
      setShowClearDuesModal(true);
  };

  const handleConfirmClearDues = async () => {
      try {
          await fetch(`/api/orders/${clearingOrder.id}/clear-debt`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(clearDuesData)
          });
          setShowClearDuesModal(false);
          handleOpenProfile(profileCustomer);
          fetchCustomers();
      } catch(err) {
          console.error(err);
      }
  };

  const handleClearAllDues = async (customer) => {
      if (!confirm(`Are you sure you want to waive off the full pending Udhaari of ₹${customer.total_udhaari} for ${customer.name}? This will mark all their pending orders as paid via Bad Debt roundoff.`)) return;
      try {
          const res = await fetch(`/api/customers/${customer.id}/clear-debt`, {
              method: 'POST'
          });
          if (res.ok) {
              alert("All dues cleared and logged as Post-Delivery Roundoff.");
              handleOpenProfile(customer);
              fetchCustomers();
          } else {
              alert("Failed to clear dues.");
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleDeleteCustomer = async (id) => {
    if (!confirm('Are you sure you want to delete this customer record?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers();
      } else {
        alert('Failed to delete customer record.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading CRM...</div>;

  const filteredCustomers = filterUdhaari 
    ? customers.filter(c => parseFloat(c.total_udhaari || 0) > 0)
    : customers;

  return (
    <div>
      <div className={!isMobile ? "flex justify-between items-center" : "flex flex-col gap-4 items-start"} style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-bold" style={{ letterSpacing: '-0.03em', fontSize: isMobile ? '1.8rem' : '1.875rem', margin: 0 }}>Customer Registry (CRM)</h1>
          <p className="text-muted" style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', marginTop: '0.25rem' }}>Manage B2B dealers, retail customers, marketing cohorts, and customer accounts.</p>
        </div>
        
        <div className={`flex gap-4 ${isMobile ? 'flex-col w-full' : 'items-center'}`}>
          <form onSubmit={handleSearch} style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <input 
              className="search-input w-full"
              placeholder="Search clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 38px', fontSize: '0.9rem' }}
            />
          </form>

          <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
            <button 
               className={`btn-secondary flex items-center justify-center gap-2 flex-1 ${filterUdhaari ? 'active' : ''}`} 
               style={{ ...(filterUdhaari ? { borderColor: 'var(--danger)', color: 'var(--danger)', backgroundColor: 'rgba(244,63,94,0.1)' } : {}), padding: isMobile ? '0.6rem' : '' }}
               onClick={() => setFilterUdhaari(!filterUdhaari)}
            >
               <Filter size={16} /> Pending Dues
            </button>

            <button className="btn btn-primary flex items-center justify-center gap-2 flex-1" style={{ padding: isMobile ? '0.6rem' : '' }} onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Register Customer
            </button>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="compact-customers" style={{ minWidth: isMobile ? '800px' : '100%' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer Name</th>
              <th>Phone Number</th>
              <th>DOB (Birthday)</th>
              <th>Created On</th>
              <th>Latest Order ID</th>
              <th>Items Purchased</th>
              <th>Total Pending Udhaari</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(c => (
              <tr key={c.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>#{c.id}</td>
                <td>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '1rem', fontWeight: 'bold' }} onClick={() => handleOpenProfile(c)}>
                        {c.name}
                    </button>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{c.phone}</td>
                <td className="text-muted" style={{ fontSize: '0.9rem' }}>
                  {c.dob ? new Date(c.dob).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'General'}
                </td>
                <td className="text-muted">
                  <div className="flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
                    <Calendar size={14} />
                    <span>{new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </td>
                <td>
                  <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                     {c.latest_order_id || '-'}
                  </span>
                </td>
                <td style={{ position: 'relative' }}>
                  {(() => {
                    if (!c.latest_items_json) return <span className="text-muted">-</span>;
                    try {
                      const items = JSON.parse(c.latest_items_json);
                      if (!Array.isArray(items) || items.length === 0) return <span className="text-muted">-</span>;
                      
                      const typeCount = {};
                      items.forEach(item => {
                         const typeName = item.type || item.name || 'Stove';
                         typeCount[typeName] = (typeCount[typeName] || 0) + (parseInt(item.qty) || 1);
                      });
                      const details = Object.entries(typeCount).map(([name, count]) => `${count}x ${name}`).join(', ');

                      return (
                        <div style={{ position: 'relative' }}>
                          <button 
                            onClick={() => setShowItemsForId(showItemsForId === c.id ? null : c.id)}
                            className="btn-secondary"
                            style={{ padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '4px' }}
                          >
                            <ShoppingBag size={14}/> {items.length} Items
                          </button>
                          
                          {showItemsForId === c.id && (
                             <div 
                               style={{ 
                                 position: 'absolute', top: '100%', left: '0', zIndex: 50, 
                                 backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', 
                                 padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem', 
                                 boxShadow: '0 4px 12px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
                                 fontSize: '0.85rem'
                               }}
                             >
                               {details}
                               <button 
                                 onClick={() => setShowItemsForId(null)}
                                 style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                 <X size={12} />
                               </button>
                             </div>
                          )}
                        </div>
                      );
                    } catch(e) {
                      return <span className="text-muted">-</span>;
                    }
                  })()}
                </td>
                <td>
                  <span style={{ fontWeight: 'bold', color: parseFloat(c.total_udhaari || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    ₹{parseFloat(c.total_udhaari || 0).toLocaleString()}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => handleDeleteCustomer(c.id)}
                    style={{ 
                      color: 'var(--danger)', 
                      padding: '0.5rem', 
                      background: 'rgba(239, 68, 68, 0.05)', 
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      margin: '0 auto'
                    }}
                    className="flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '5rem 1rem' }}>
                  <Users size={40} style={{ marginBottom: '1rem', color: 'var(--border-color)', margin: '0 auto' }} />
                  <p>No customer profiles matched your query.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Register Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', alignSelf: 'center' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: '1.75rem', letterSpacing: '-0.02em' }}>
              Register Customer Profile
            </h2>
            <form onSubmit={handleAddCustomer} className="flex-col gap-5">
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>Customer Name</label>
                <input required placeholder="e.g. Amit Kumar" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full" style={{ padding: '0.6rem' }} />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>Contact Phone</label>
                <input required placeholder="10-digit number" pattern="[0-9]{10}" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full" style={{ padding: '0.6rem' }} />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>Date of Birth (For Anniversary/Birthday coupons)</label>
                <input type="date" value={newCustomer.dob} onChange={e => setNewCustomer({...newCustomer, dob: e.target.value})} className="w-full" style={{ padding: '0.6rem' }} />
              </div>
              
              <div className="flex justify-between" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ width: '45%' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: '45%' }}>Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE MODAL */}
      {showProfileModal && profileCustomer && (() => {
          const totalValue = customerOrders.reduce((sum, o) => sum + (parseFloat(o.grand_total) || 0), 0);
          const totalUdhaari = customerOrders.reduce((sum, o) => sum + (parseFloat(o.balance_due) || 0), 0);
          
          return (
             <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                 <div className="card shadow-lg" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                      <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowProfileModal(false)}>
                        <X size={20} />
                      </button>
                      
                      <div className="flex items-center gap-3 mb-6">
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e05a10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                             <User size={24} />
                          </div>
                          <div>
                              <h2 className="m-0">{profileCustomer.name}</h2>
                              <p className="subtext m-0">{profileCustomer.phone}{profileCustomer.group_tag && !['General', 'Hindu', 'Muslim'].includes(profileCustomer.group_tag) ? ` • ${profileCustomer.group_tag}` : ''}</p>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                              <p className="subtext text-xs m-0">Lifetime Purchase Value</p>
                              <h3 className="m-0 text-[var(--accent-gold)]">₹{totalValue.toLocaleString()}</h3>
                          </div>
                          <div className="p-4 rounded-lg flex justify-between items-center gap-4" style={{ backgroundColor: totalUdhaari > 0 ? 'rgba(244,63,94,0.05)' : 'rgba(37,211,102,0.05)', border: `1px solid ${totalUdhaari > 0 ? 'rgba(244,63,94,0.3)' : 'rgba(37,211,102,0.3)'}` }}>
                              <div>
                                  <p className="subtext text-xs m-0">Total Outstanding Udhaari</p>
                                  <h3 className="m-0" style={{ color: totalUdhaari > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{totalUdhaari.toLocaleString()}</h3>
                              </div>
                              {totalUdhaari > 0 && (
                                  <button className="btn-secondary text-xs" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleClearAllDues(profileCustomer)}>
                                      Waive Off Dues
                                  </button>
                              )}
                          </div>
                      </div>

                      <h3 className="mb-4">Order History</h3>
                      <div className="flex flex-col gap-3">
                          {customerOrders.length === 0 ? (
                              <p className="subtext">No orders found for this customer.</p>
                          ) : (
                              customerOrders.map(o => (
                                  <div key={o.id} className="p-4 rounded-lg flex justify-between items-center" style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-white">{o.id}</span>
                                              <span className="badge badge-secondary text-xs">{o.status}</span>
                                          </div>
                                          <p className="subtext text-xs m-0">{new Date(o.booked_date).toLocaleDateString()} • Bill: ₹{o.grand_total}</p>
                                      </div>
                                      <div className="text-right flex items-center gap-4">
                                          <div>
                                              <p className="subtext text-xs m-0">Pending</p>
                                              <span className="font-bold" style={{ color: o.balance_due > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                  ₹{o.balance_due}
                                              </span>
                                          </div>
                                          {o.balance_due > 0 && (
                                              <button className="btn-secondary text-xs" style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} onClick={() => handleOpenClearDues(o)}>
                                                  Clear Dues
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                 </div>
             </div>
          );
      })()}

      {/* CLEAR DUES MODAL */}
      {showClearDuesModal && clearingOrder && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
             <div className="card shadow-lg" style={{ width: '450px', position: 'relative', borderTop: '4px solid var(--accent-gold)' }}>
                 <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowClearDuesModal(false)}>
                    <X size={20} />
                 </button>
                 
                 <h2 className="mb-2">Clear Pending Dues</h2>
                 <p className="subtext mb-6">Order {clearingOrder.id} has a pending balance of <span className="text-[var(--danger)] font-bold">₹{clearingOrder.balance_due}</span></p>

                 <div className="flex gap-3 mb-4">
                     <button className={`flex-1 p-3 rounded-lg border text-sm ${clearDuesData.type === 'Payment' ? 'border-[var(--success)] bg-[rgba(37,211,102,0.1)] text-[var(--success)]' : 'border-[var(--border-color)] bg-[var(--bg-color)] subtext'}`} onClick={() => setClearDuesData({...clearDuesData, type: 'Payment'})}>
                         Payment Received
                     </button>
                     <button className={`flex-1 p-3 rounded-lg border text-sm ${clearDuesData.type === 'BadDebt' ? 'border-[var(--danger)] bg-[rgba(244,63,94,0.1)] text-[var(--danger)]' : 'border-[var(--border-color)] bg-[var(--bg-color)] subtext'}`} onClick={() => setClearDuesData({...clearDuesData, type: 'BadDebt'})}>
                         Bad Debt / Round Off
                     </button>
                 </div>

                 {clearDuesData.type === 'Payment' && (
                     <div className="form-group mb-4">
                         <label className="form-label">Payment Mode</label>
                         <select className="w-full" value={clearDuesData.paymentMode} onChange={e => setClearDuesData({...clearDuesData, paymentMode: e.target.value})} style={{ padding: '0.6rem' }}>
                             <option>Cash</option>
                             <option>UPI</option>
                             <option>Bank Transfer</option>
                         </select>
                     </div>
                 )}
                 {clearDuesData.type === 'BadDebt' && (
                     <p className="subtext text-xs mb-4 p-2 rounded bg-[rgba(244,63,94,0.1)] text-[var(--danger)]">
                         Note: This will clear the Udhaari but will NOT add any money to your Daybook (Galla).
                     </p>
                 )}

                 <div className="form-group mb-6">
                     <label className="form-label">Amount to Clear</label>
                     <input type="number" className="w-full" value={clearDuesData.amount} onChange={e => setClearDuesData({...clearDuesData, amount: e.target.value})} max={clearingOrder.balance_due} style={{ padding: '0.6rem' }} />
                 </div>

                 <button className="btn-primary w-full" onClick={handleConfirmClearDues}>Confirm Action</button>
             </div>
          </div>
      )}

    </div>
  );
}
