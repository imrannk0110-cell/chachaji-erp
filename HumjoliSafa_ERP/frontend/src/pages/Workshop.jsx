import React, { useState, useEffect } from 'react';
import { MessageCircle, Send } from 'lucide-react';

const Workshop = () => {
  const [orders, setOrders] = useState([]);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchManagers();
  }, []);

  const fetchOrders = async () => {
    const res = await fetch('http://localhost:5000/api/orders');
    const data = await res.json();
    setOrders(data);
  };

  const fetchManagers = async () => {
    const res = await fetch('http://localhost:5000/api/managers');
    const data = await res.json();
    setManagers(data);
  };

  const handleStatusChange = async (orderId, newStatus, newManagerId) => {
    await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, manager_id: newManagerId })
    });
    fetchOrders();
  };

  const handleWhatsAppCustomer = (order) => {
    const phone = order.customer_phone;
    if(!phone) return alert('No phone number attached to this customer.');
    
    const text = `Hello ${order.customer_name},\n\nYour order at Humjoli Safa (${order.id}) has been booked.\nGrand Total: Rs. ${order.grand_total}\nAdvance Paid: Rs. ${order.advance_paid}\nBalance Due: Rs. ${order.balance_due}\n\nExpected Delivery: ${new Date(order.delivery_date).toLocaleDateString()}\nThank you!`;
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppManager = (order) => {
    const manager = managers.find(m => m.id === order.manager_id);
    if(!manager || !manager.mobile_number) return alert('Assigned Manager has no valid mobile number.');

    // Build specs string
    let specs = `ORDER SPECS: ${order.id}\n`;
    const items = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : order.items_json;
    const measures = typeof order.measurements_json === 'string' ? JSON.parse(order.measurements_json) : order.measurements_json;
    
    items.forEach((item, i) => {
      specs += `\nItem ${i+1}: ${item.type}\n`;
      if(measures && measures[item.type]) {
         Object.keys(measures[item.type]).forEach(k => {
           specs += `- ${k}: ${measures[item.type][k]}"\n`;
         });
      }
    });

    specs += `\nHandover Target: ${new Date(order.handover_target_date).toLocaleDateString()}`;
    const url = `https://wa.me/91${manager.mobile_number}?text=${encodeURIComponent(specs)}`;
    window.open(url, '_blank');
  };

  const statuses = ['Booked', 'In Workshop', 'Ready for Trial', 'Delivered'];

  return (
    <div>
      <h1 className="mb-4">Workshop Timeline Monitor</h1>

      <div className="grid grid-cols-4 gap-4" style={{ height: '70vh', overflowY: 'auto' }}>
        {statuses.map(statusCol => (
          <div key={statusCol} style={{ backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ borderBottom: '2px solid var(--accent-gold)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>{statusCol}</h3>
            
            {orders.filter(o => o.status === statusCol).map(order => (
              <div key={order.id} className="glass-panel p-4" style={{ fontSize: '0.9rem' }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>{order.id}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {new Date(order.booked_date).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="mb-1"><Users size={12} style={{display:'inline'}}/> {order.customer_name}</p>
                
                <div className="mt-2 mb-2">
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Re-assign Manager:</label>
                  <select 
                    value={order.manager_id} 
                    onChange={(e) => handleStatusChange(order.id, order.status, e.target.value)}
                    className="w-full mt-1" 
                    style={{ padding: '4px', fontSize: '0.8rem' }}
                  >
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name} (W{m.workshop_number})</option>)}
                  </select>
                </div>

                {statusCol !== 'Delivered' && (
                  <div className="mt-2 mb-3">
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Update Status:</label>
                    <select 
                      value={order.status} 
                      onChange={(e) => handleStatusChange(order.id, e.target.value, order.manager_id)}
                      className="w-full mt-1"
                      style={{ padding: '4px', fontSize: '0.8rem' }}
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                <hr style={{ borderColor: 'var(--border-color)', margin: '10px 0' }} />

                <div className="flex gap-2">
                  <button 
                    className="btn-secondary w-full flex items-center justify-center gap-1" 
                    style={{ padding: '6px', fontSize: '0.75rem', borderColor: '#25D366', color: '#25D366' }}
                    onClick={() => handleWhatsAppCustomer(order)}
                  >
                    <MessageCircle size={14} /> To Customer
                  </button>
                  <button 
                    className="btn-secondary w-full flex items-center justify-center gap-1" 
                    style={{ padding: '6px', fontSize: '0.75rem' }}
                    onClick={() => handleWhatsAppManager(order)}
                  >
                    <Send size={14} /> To Manager
                  </button>
                </div>

              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
};

export default Workshop;
