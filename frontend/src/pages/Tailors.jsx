import { useState, useEffect } from 'react';
import { Plus, Scissors, Phone, DollarSign, List, CheckCircle, RefreshCw, Briefcase } from 'lucide-react';

export default function Tailors() {
  const [tailors, setTailors] = useState([]);
  const [selectedTailor, setSelectedTailor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddTailorModal, setShowAddTailorModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Forms state
  const [newTailor, setNewTailor] = useState({ name: '', phone: '', base_stitching_rate: 0 });
  const [newOrder, setNewOrder] = useState({
    tailor_id: '',
    customer_name: '',
    outfit_type: 'Sherwani',
    stitching_cost: 0,
    advance_paid: 0
  });

  const fetchTailors = async () => {
    try {
      const res = await fetch('/api/tailors');
      const data = await res.json();
      setTailors(data);
      if (selectedTailor) {
        // Refresh selected tailor details
        const updatedSelected = data.find(t => t.id === selectedTailor.id);
        if (updatedSelected) setSelectedTailor(updatedSelected);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTailorOrders = async (tailor) => {
    try {
      const res = await fetch(`/api/tailors/${tailor.id}/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTailors();
  }, []);

  const handleAddTailor = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tailors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTailor)
      });
      if (res.ok) {
        setShowAddTailorModal(false);
        setNewTailor({ name: '', phone: '', base_stitching_rate: 0 });
        fetchTailors();
      } else {
        alert('Failed to register tailor.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tailor-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (res.ok) {
        setShowAddOrderModal(false);
        setNewOrder({
          tailor_id: '',
          customer_name: '',
          outfit_type: 'Sherwani',
          stitching_cost: 0,
          advance_paid: 0
        });
        fetchTailors();
      } else {
        alert('Failed to record tailoring order.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearPayout = async (tailorId) => {
    if (!confirm('Are you sure you want to clear all pending payouts for this tailor? This marks all pending jobs as Paid.')) return;
    try {
      const res = await fetch(`/api/tailors/${tailorId}/payout`, { method: 'POST' });
      if (res.ok) {
        fetchTailors();
        if (selectedTailor && selectedTailor.id === tailorId) {
          fetchTailorOrders(selectedTailor);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenHistory = async (tailor) => {
    setSelectedTailor(tailor);
    await fetchTailorOrders(tailor);
    setShowHistoryModal(true);
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading tailor system databases...</div>;

  return (
    <div className="flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-3xl font-bold" style={{ letterSpacing: '-0.03em' }}>Karigar Ledger & Stitching Hub</h1>
          <p className="text-muted" style={{ fontSize: '0.95rem', marginTop: '0.25rem' }}>Track tailor payouts, advance payouts, stitching receipts, and job logs.</p>
        </div>
        <div className="flex gap-3 mobile-stack-buttons">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => setShowAddTailorModal(true)}>
            <Plus size={16} /> Register Karigar
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={() => {
            if (tailors.length === 0) return alert('Register at least one Karigar first!');
            setNewOrder(prev => ({ ...prev, tailor_id: tailors[0].id }));
            setShowAddOrderModal(true);
          }}>
            <Scissors size={16} /> Assign Stitching Order
          </button>
        </div>
      </div>

      {/* Main Karigars Grid */}
      <div className="grid grid-cols-2 gap-6" style={{ display: 'grid' }}>
        {tailors.map(t => {
          return (
            <div key={t.id} className="card flex-col gap-4" style={{ 
              background: 'rgba(255,255,255,0.02)', 
              borderColor: 'var(--border-color)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative side accent based on pending balance */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: t.net_balance_due > 0 ? 'var(--accent-primary)' : '#10b981'
              }} />

              <div className="flex justify-between items-start mobile-card-header" style={{ paddingLeft: '0.5rem' }}>
                <div>
                  <h3 className="text-xl font-bold" style={{ margin: 0, color: 'var(--text-primary)' }}>{t.name}</h3>
                  <p className="text-muted flex items-center gap-1" style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    <Phone size={12} style={{ color: 'var(--accent-primary)' }} />
                    +91 {t.phone} | Rate: ₹{t.base_stitching_rate}/job
                  </p>
                </div>
                {t.net_balance_due > 0 ? (
                  <button 
                    onClick={() => handleClearPayout(t.id)}
                    className="btn flex items-center gap-1"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.4rem 0.8rem', 
                      background: 'rgba(197, 160, 89, 0.1)', 
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--accent-primary)',
                      borderRadius: '0.5rem',
                      fontWeight: 700
                    }}
                  >
                    Clear Payout
                  </button>
                ) : (
                  <span className="badge badge-success flex items-center gap-1" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                    <CheckCircle size={12} /> Settled
                  </span>
                )}
              </div>

              {/* Aggregation summaries */}
              <div className="karigar-stats-grid" style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Earned</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{t.total_earned}</span>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Advance</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{t.total_advance}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Balance Due</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: t.net_balance_due > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    ₹{t.net_balance_due}
                  </span>
                </div>
              </div>

              {/* View History Button */}
              <button 
                onClick={() => handleOpenHistory(t)}
                className="btn btn-secondary flex items-center justify-center gap-2" 
                style={{ width: '100%', padding: '0.5rem 0', fontSize: '0.85rem', borderRadius: '0.5rem' }}
              >
                <List size={14} /> View Ledger Sheets
              </button>
            </div>
          );
        })}
        {tailors.length === 0 && (
          <div className="card span-2 flex-col items-center justify-center text-center text-muted" style={{ padding: '6rem 1rem' }}>
            <Briefcase size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
            <h3 style={{ margin: 0, fontWeight: 700 }}>No Registered Karigars</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '300px', marginTop: '0.25rem' }}>Add tailors to monitor stitching cost allocations and advance ledgers.</p>
          </div>
        )}
      </div>

      {/* Add Tailor Modal */}
      {showAddTailorModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', alignSelf: 'center' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Register Karigar</h2>
            <form onSubmit={handleAddTailor} className="flex-col gap-4">
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Karigar Name</label>
                <input required placeholder="e.g. Salim Tailor" value={newTailor.name} onChange={e => setNewTailor({...newTailor, name: e.target.value})} />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Phone Number</label>
                <input required placeholder="10-digit phone" pattern="[0-9]{10}" value={newTailor.phone} onChange={e => setNewTailor({...newTailor, phone: e.target.value})} />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Base Stitching Cost (₹/Outfit)</label>
                <input type="number" step="1" required placeholder="0.00" value={newTailor.base_stitching_rate} onChange={e => setNewTailor({...newTailor, base_stitching_rate: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="flex justify-between" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ width: '45%' }} onClick={() => setShowAddTailorModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: '45%' }}>Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Stitching Order Modal */}
      {showAddOrderModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', alignSelf: 'center' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Assign Stitching Job</h2>
            <form onSubmit={handleAddOrder} className="flex-col gap-4">
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Select Karigar</label>
                <select value={newOrder.tailor_id} onChange={e => setNewOrder({...newOrder, tailor_id: e.target.value})}>
                  {tailors.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Rate: ₹{t.base_stitching_rate})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Customer Name</label>
                <input required placeholder="Client legal name" value={newOrder.customer_name} onChange={e => setNewOrder({...newOrder, customer_name: e.target.value})} />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Outfit Type</label>
                <select value={newOrder.outfit_type} onChange={e => setNewOrder({...newOrder, outfit_type: e.target.value})}>
                  <option value="Sherwani">Sherwani</option>
                  <option value="Kurta-Salwar">Kurta Salwar</option>
                  <option value="Jodhpuri-Suit">Jodhpuri Suit</option>
                  <option value="Safa-Turban">Safa Turban</option>
                  <option value="Nehru-Jacket">Nehru Jacket</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Stitching Cost (₹)</label>
                  <input type="number" step="1" required placeholder="0.00" value={newOrder.stitching_cost} onChange={e => setNewOrder({...newOrder, stitching_cost: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Advance Paid (₹)</label>
                  <input type="number" step="1" placeholder="0.00" value={newOrder.advance_paid} onChange={e => setNewOrder({...newOrder, advance_paid: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="flex justify-between" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ width: '45%' }} onClick={() => setShowAddOrderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: '45%' }}>Assign Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Historical Ledger Sheets Modal */}
      {showHistoryModal && selectedTailor && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '640px', padding: '2.5rem', alignSelf: 'center', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ marginBottom: '1.25rem', letterSpacing: '-0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <Scissors size={20} style={{ color: 'var(--accent-primary)' }} />
              Ledger Book: {selectedTailor.name}
            </h2>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Date</th>
                    <th>Customer</th>
                    <th>Outfit</th>
                    <th>Cost</th>
                    <th>Advance</th>
                    <th>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                      <td style={{ padding: '0.75rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(o.assigned_date).toLocaleDateString()}
                      </td>
                      <td className="font-bold">{o.customer_name}</td>
                      <td>{o.outfit_type}</td>
                      <td>₹{o.stitching_cost}</td>
                      <td>₹{o.advance_paid}</td>
                      <td>
                        <span className={`badge ${o.payout_status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                          {o.payout_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
                        No stitching jobs recorded in historical registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>Close Ledger</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
