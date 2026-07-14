import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Edit, X, Flame, Activity, Users, ArrowRight } from 'lucide-react';

const Workshop = () => {
  const [orders, setOrders] = useState([]);
  const [factoryUnits, setFactoryUnits] = useState([]);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // Factory Ledger Profile State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitLedger, setUnitLedger] = useState([]);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Delivery Settlement State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliverySettlement, setDeliverySettlement] = useState({ type: 'Full', amount: 0, mode: 'Cash' });

  useEffect(() => {
    fetchOrders();
    fetchFactoryUnits();
  }, []);

  const fetchOrders = async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(data);
  };

  const fetchFactoryUnits = async () => {
    const res = await fetch('/api/factory-units');
    const data = await res.json();
    setFactoryUnits(data);
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    
    const originalOrder = orders.find(o => o.id === editingOrder.id);
    const isNowDelivered = editingOrder.status === 'Delivered' && originalOrder.status !== 'Delivered';
    const balanceDue = parseFloat(originalOrder.balance_due) || 0;

    if (isNowDelivered && balanceDue > 0) {
        setDeliverySettlement({ type: 'Full', amount: balanceDue, mode: 'Cash' });
        setShowDeliveryModal(true);
        return;
    }

    await executeOrderUpdate();
  };

  const executeOrderUpdate = async (paymentOverride = null) => {
      await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            status: editingOrder.status, 
            factory_unit_id: editingOrder.factory_unit_id,
            manager_id: editingOrder.factory_unit_id, // alias backward compatibility
            handover_target_date: editingOrder.handover_target_date,
            delivery_date: editingOrder.delivery_date,
            deliveryPayment: paymentOverride
        })
      });
      setShowEditModal(false);
      setShowDeliveryModal(false);
      fetchOrders();
  };

  const handleDeliveryConfirm = () => {
      let finalAmount = 0;
      if (deliverySettlement.type === 'Full') {
          const originalOrder = orders.find(o => o.id === editingOrder.id);
          finalAmount = parseFloat(originalOrder.balance_due);
      } else if (deliverySettlement.type === 'Partial') {
          finalAmount = parseFloat(deliverySettlement.amount);
      }
      
      executeOrderUpdate({ type: deliverySettlement.type, amount: finalAmount, mode: deliverySettlement.mode });
  };

  const handleWhatsAppReady = (order) => {
    const phone = order.customer_phone;
    if(!phone) return alert('No phone number attached to this customer.');
    
    const text = `Hello ${order.customer_name},\n\nYour order is ready for delivery at Chachaji Udyog!\nOrder ID: ${order.id}\nBalance Due: Rs. ${order.balance_due}\n\nPlease contact us for dispatch. Thank you!`;
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleUnitClick = async (unit) => {
    setSelectedUnit(unit);
    const res = await fetch(`/api/factory-units/${unit.id}/ledger`);
    const data = await res.json();
    setUnitLedger(data);
    setShowUnitModal(true);
  };

  const handleSaveAdvance = async (e) => {
    e.preventDefault();
    if(!advanceAmount) return;
    await fetch('/api/factory-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            factory_unit_id: selectedUnit.id,
            amount: parseFloat(advanceAmount),
            payment_mode: paymentMode,
            reference_no: `PMT-FC-${Date.now().toString().slice(-5)}`
        })
    });
    setAdvanceAmount('');
    handleUnitClick(selectedUnit); // refresh ledger
  };

  const statuses = ['Booked', 'In Fabrication', 'Ready to Deliver', 'Delivered'];

  const getUnitMetrics = (unitId) => {
      const activeOrders = orders.filter(o => o.factory_unit_id == unitId && o.status !== 'Delivered');
      let orderCount = activeOrders.length;
      let itemCount = 0;
      activeOrders.forEach(o => {
          const items = Array.isArray(o.items_json) ? o.items_json : [];
          items.forEach(i => {
            itemCount += parseInt(i.qty) || 1;
          });
      });
      return { orderCount, itemCount };
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
         <div>
           <h1 style={{ margin: 0 }}>Factory Floor Monitor</h1>
           <p className="subtext">Track real-time fabrication stages, stove quantities, and floor workers.</p>
         </div>
      </div>

      {/* TOP DASHBOARD: Factory Units Grid */}
      <div className="grid grid-cols-4 gap-6" style={{ marginBottom: '2.5rem' }}>
         {factoryUnits.slice(0, 4).map((unit, idx) => {
             const metrics = getUnitMetrics(unit.id);
             const colors = ['#e05a10', '#38bdf8', '#fbbf24', '#f43f5e'];
             const color = colors[idx % 4];
             return (
                  <div key={unit.id} className="card shadow-lg hover-row" style={{ borderTop: `4px solid ${color}`, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => handleUnitClick(unit)}>
                      <div className="flex justify-between items-center mb-4">
                         <div>
                           <p className="subtext m-0" style={{ fontSize: '0.8rem' }}>Floor Unit #{unit.unit_number || 'A'}</p>
                           <h3 style={{ margin: 0 }}>{unit.name}</h3>
                         </div>
                         <Activity size={24} color={color} />
                      </div>
                      <div className="flex justify-between mt-6">
                         <div className="text-center">
                             <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{metrics.orderCount}</h2>
                             <p className="subtext" style={{ fontSize: '0.8rem' }}>Pending Orders</p>
                         </div>
                         <div className="text-center" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                             <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{metrics.itemCount}</h2>
                             <p className="subtext" style={{ fontSize: '0.8rem' }}>Qty (Stoves)</p>
                         </div>
                      </div>
                  </div>
             )
         })}
         {factoryUnits.length === 0 && (
              <div className="col-span-4 p-8 text-center card subtext">No factory units configured in settings.</div>
         )}
      </div>

      {/* TIMELINE PROGRESS BOARD */}
      <div className="card" style={{ minHeight: '600px' }}>
         <h2 className="mb-6">Active Fabrication Timeline</h2>

         <div className="grid grid-cols-4 gap-6 h-full items-stretch">
            {statuses.map((statusCol, index) => (
               <div key={statusCol} className="flex flex-col" style={{ backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  
                  <div className="flex items-center gap-3 mb-4 pb-2" style={{ borderBottom: index === statuses.length - 1 ? '2px solid var(--success)' : '2px solid var(--accent-gold)' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: index === statuses.length - 1 ? 'var(--success)' : 'var(--accent-gold)', color: index === statuses.length - 1 ? '#000' : 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                         {index + 1}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{statusCol}</h3>
                  </div>
                  
                  <div className="flex flex-col gap-4 flex-1">
                    {orders.filter(o => o.status === statusCol).map(order => (
                      <div key={order.id} className="p-4" style={{ backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                         
                         <button 
                           className="btn-icon" 
                           style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--accent-gold)' }}
                           onClick={() => {
                               setEditingOrder({
                                   id: order.id,
                                   status: order.status,
                                   factory_unit_id: order.factory_unit_id || '',
                                   handover_target_date: order.handover_target_date?.split('T')[0] || '',
                                   delivery_date: order.delivery_date?.split('T')[0] || ''
                               });
                               setShowEditModal(true);
                           }}
                         >
                            <Edit size={16} />
                         </button>

                         <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{order.id}</span>
                         <p className="subtext mt-1 mb-3" style={{ fontSize: '0.8rem' }}>Floor Unit: <span style={{ color: 'var(--accent-gold)' }}>{order.factory_unit_name || order.manager_name || 'Unassigned'}</span></p>

                         <div className="flex items-center gap-2 mb-4" style={{ fontSize: '0.9rem' }}>
                            <Users size={14} color="var(--text-secondary)" />
                            {order.customer_name}
                         </div>

                         {/* Status Progress Bar */}
                         <div className="flex gap-1 mb-4">
                             {statuses.map((s, i) => (
                                 <div key={s} style={{ 
                                     height: '4px', 
                                     flex: 1, 
                                     backgroundColor: i <= index ? (index === 3 ? 'var(--success)' : 'var(--accent-gold)') : 'var(--border-color)', 
                                     borderRadius: '2px' 
                                 }}></div>
                             ))}
                         </div>

                         {statusCol === 'Ready to Deliver' && (
                             <button 
                                className="btn-secondary w-full flex items-center justify-center gap-2" 
                                style={{ padding: '0.6rem', fontSize: '0.85rem', borderColor: 'rgba(37, 211, 102, 0.4)', color: '#25D366', backgroundColor: 'rgba(37, 211, 102, 0.1)' }}
                                onClick={() => handleWhatsAppReady(order)}
                             >
                               <MessageCircle size={16} /> WhatsApp Ready Alert
                             </button>
                         )}

                      </div>
                    ))}
                    {orders.filter(o => o.status === statusCol).length === 0 && (
                        <div className="flex-1 flex items-center justify-center">
                           <p className="subtext text-center m-0">No active orders</p>
                        </div>
                    )}
                  </div>

               </div>
            ))}
         </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && editingOrder && (
         <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
             <div className="card shadow-lg" style={{ width: '450px', position: 'relative' }}>
                 <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowEditModal(false)}>
                    <X size={20} />
                 </button>
                 
                 <h2 className="mb-6">Edit Order <span style={{ color: 'var(--accent-gold)' }}>{editingOrder.id}</span></h2>
                 
                 <form onSubmit={handleUpdateOrder} className="flex flex-col gap-4">
                    <div className="form-group mb-0">
                       <label className="form-label">Current Status</label>
                       <select value={editingOrder.status} onChange={e=>setEditingOrder({...editingOrder, status: e.target.value})} className="w-full">
                           {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>

                    <div className="form-group mb-0">
                       <label className="form-label">Assigned Factory Floor Unit</label>
                       <select value={editingOrder.factory_unit_id} onChange={e=>setEditingOrder({...editingOrder, factory_unit_id: e.target.value})} className="w-full">
                           {factoryUnits.filter(m => m.is_active !== 0 || m.id == editingOrder.factory_unit_id).map(m => <option key={m.id} value={m.id}>{m.name} (Unit #{m.unit_number})</option>)}
                       </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                           <label className="form-label">Fabrication Target</label>
                           <input type="date" value={editingOrder.handover_target_date} onChange={e=>setEditingOrder({...editingOrder, handover_target_date: e.target.value})} className="w-full" style={{ borderColor: 'var(--accent-gold)' }} />
                        </div>
                        <div className="form-group mb-0">
                           <label className="form-label">Delivery Date</label>
                           <input type="date" value={editingOrder.delivery_date} onChange={e=>setEditingOrder({...editingOrder, delivery_date: e.target.value})} className="w-full" style={{ borderColor: 'var(--success)' }} />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary w-full mt-4 flex justify-center items-center gap-2">
                       Save Changes <ArrowRight size={18} />
                    </button>
                 </form>

             </div>
         </div>
      )}

      {/* DELIVERY SETTLEMENT MODAL */}
      {showDeliveryModal && editingOrder && (() => {
          const originalOrder = orders.find(o => o.id === editingOrder.id);
          const balance = parseFloat(originalOrder.balance_due) || 0;
          return (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                  <div className="card shadow-lg" style={{ width: '500px', position: 'relative', borderTop: '4px solid var(--success)' }}>
                      <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowDeliveryModal(false)}>
                         <X size={20} />
                      </button>
                      
                      <h2 className="mb-2">Final Dispatch Settlement</h2>
                      <p className="subtext mb-6">Order {editingOrder.id} is ready for dispatch.</p>
                      
                      <div className="flex justify-between items-center p-3 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div>
                              <p className="subtext m-0 text-xs">Total Bill: ₹{originalOrder.grand_total}</p>
                              <p className="subtext m-0 text-xs">Advance Paid: ₹{originalOrder.advance_paid}</p>
                          </div>
                          <div className="text-right">
                              <p className="subtext m-0 text-xs">Pending Udhaari</p>
                              <h3 className="m-0 text-[var(--accent-gold)]">₹{balance}</h3>
                          </div>
                      </div>

                      <p className="form-label mb-3">Settle remaining ₹{balance} balance now?</p>
                      
                      <div className="flex gap-3 mb-4">
                          <button className={`flex-1 p-3 rounded-lg border ${deliverySettlement.type === 'Full' ? 'border-[var(--success)] bg-[rgba(37,211,102,0.1)] text-[var(--success)]' : 'border-[var(--border-color)] bg-[var(--bg-color)] subtext'}`} onClick={() => setDeliverySettlement({...deliverySettlement, type: 'Full'})}>
                              Yes, Fully Received
                          </button>
                          <button className={`flex-1 p-3 rounded-lg border ${deliverySettlement.type === 'None' ? 'border-[var(--danger)] bg-[rgba(244,63,94,0.1)] text-[var(--danger)]' : 'border-[var(--border-color)] bg-[var(--bg-color)] subtext'}`} onClick={() => setDeliverySettlement({...deliverySettlement, type: 'None'})}>
                              Keep outstanding
                          </button>
                          <button className={`flex-1 p-3 rounded-lg border ${deliverySettlement.type === 'Partial' ? 'border-[var(--accent-gold)] bg-[rgba(255,215,0,0.1)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-color)] subtext'}`} onClick={() => setDeliverySettlement({...deliverySettlement, type: 'Partial'})}>
                              Partially
                          </button>
                      </div>

                      {deliverySettlement.type === 'Partial' && (
                          <div className="form-group mb-4">
                              <label className="form-label">Partial Amount Paid</label>
                              <input type="number" className="w-full" value={deliverySettlement.amount} onChange={e => setDeliverySettlement({...deliverySettlement, amount: e.target.value})} placeholder={`Enter amount (max ${balance})`} />
                          </div>
                      )}

                      {(deliverySettlement.type === 'Full' || deliverySettlement.type === 'Partial') && (
                          <div className="form-group mb-6">
                              <label className="form-label">Payment Mode</label>
                              <select className="w-full" value={deliverySettlement.mode} onChange={e => setDeliverySettlement({...deliverySettlement, mode: e.target.value})}>
                                  <option>Cash</option>
                                  <option>UPI</option>
                                  <option>Bank Transfer</option>
                              </select>
                          </div>
                      )}

                      <button className="btn-primary w-full mt-2" style={{ backgroundColor: 'var(--success)', color: '#000' }} onClick={handleDeliveryConfirm}>
                          Settle & Mark Dispatched
                      </button>
                  </div>
              </div>
          );
      })()}

      {/* FACTORY FLOOR LEDGER MODAL */}
      {showUnitModal && selectedUnit && (() => {
          const metrics = getUnitMetrics(selectedUnit.id);
          const totalEarned = unitLedger.filter(l => l.transaction_type === 'Cr_Stitching').reduce((a, b) => a + parseFloat(b.amount), 0);
          const totalAdvance = unitLedger.filter(l => l.transaction_type === 'Dr_Advance').reduce((a, b) => a + parseFloat(b.amount), 0);
          const netBalance = totalEarned - totalAdvance;

          return (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="card shadow-lg" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                  <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowUnitModal(false)}>
                     <X size={20} />
                  </button>
                  <h2>{selectedUnit.name} Ledger</h2>
                  <p className="subtext mb-6">Floor Unit #{selectedUnit.unit_number || 'A'}</p>
                  
                  {/* Detailed KPI Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                     <div className="card p-3" style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                         <p className="subtext text-xs m-0">Pending Work</p>
                         <h3 className="m-0 text-sm" style={{ color: 'var(--text-primary)' }}>{metrics.orderCount} Orders</h3>
                         <p className="subtext text-xs m-0">{metrics.itemCount} pending stoves</p>
                     </div>
                     <div className="card p-3" style={{ borderTop: '2px solid var(--success)', backgroundColor: 'rgba(37, 211, 102, 0.05)' }}>
                         <p className="subtext text-xs m-0">Total Earned</p>
                         <h3 className="m-0 text-sm text-success">₹{totalEarned.toLocaleString()}</h3>
                     </div>
                     <div className="card p-3" style={{ borderTop: '2px solid var(--danger)', backgroundColor: 'rgba(244, 63, 94, 0.05)' }}>
                         <p className="subtext text-xs m-0">Total Paid Out</p>
                         <h3 className="m-0 text-sm text-danger">₹{totalAdvance.toLocaleString()}</h3>
                     </div>
                     <div className="card p-3" style={{ borderTop: `2px solid ${netBalance > 0 ? 'var(--accent-gold)' : (netBalance < 0 ? 'var(--success)' : 'var(--success)')}`, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                         <p className="subtext text-xs m-0">Net Outstanding</p>
                         <h3 className="m-0 text-sm" style={{ color: netBalance > 0 ? 'var(--accent-gold)' : (netBalance < 0 ? 'var(--danger)' : 'var(--success)') }}>
                         ₹{Math.abs(netBalance).toLocaleString()}
                         </h3>
                         <p className="subtext text-xs m-0" style={{ color: netBalance > 0 ? 'var(--accent-gold)' : (netBalance < 0 ? 'var(--success)' : 'var(--success)') }}>
                             {netBalance > 0 ? 'Dues Pending' : 'Clear'}
                         </p>
                     </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                     <input type="number" placeholder="Payment Amount (₹)" className="w-full" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
                     <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                        <option>Cash</option><option>Bank Transfer</option><option>UPI</option>
                     </select>
                     <button className="btn-primary" onClick={handleSaveAdvance}>Record Payment</button>
                  </div>

                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead><tr className="subtext text-left"><th className="pb-2">Date</th><th className="pb-2">Ref</th><th className="pb-2 text-right">Amount</th></tr></thead>
                        <tbody>
                           {unitLedger.map((entry) => (
                              <tr key={entry.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                 <td className="py-2">{new Date(entry.created_at).toLocaleDateString()}</td>
                                 <td className="py-2 text-xs">
                                   {entry.reference_no} 
                                   <br/><span style={{color: 'var(--text-secondary)'}}>{entry.transaction_type === 'Cr_Stitching' ? 'Fabrication Labor Pay' : 'Worker Disbursement'}</span>
                                 </td>
                                 <td className="py-2 text-right" style={{ color: entry.transaction_type === 'Cr_Stitching' ? 'var(--success)' : 'var(--danger)' }}>
                                   {entry.transaction_type === 'Cr_Stitching' ? '+' : '-'}₹{parseFloat(entry.amount).toLocaleString()}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
              </div>
          </div>
          );
      })()}

    </div>
  );
};

export default Workshop;
