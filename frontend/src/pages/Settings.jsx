import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [managers, setManagers] = useState([]);
  const [newManager, setNewManager] = useState({ name: '', workshop_number: '', mobile_number: '' });
  
  const [selectedManagerForRates, setSelectedManagerForRates] = useState(null);
  const [managerRates, setManagerRates] = useState({});

  const [identity, setIdentity] = useState({ shopName: '', gstin: '', address: '', mobile: '', terms: '' });
  const [templates, setTemplates] = useState({ 
    booked: 'Hello {{customer_name}},\\nYour order at {{shop_name}} has been booked.\\nOrder ID: {{order_id}}\\nBalance Due: Rs. {{balance_due}}', 
    trial: 'Hello {{customer_name}},\\nYour outfit at {{shop_name}} is Ready for Trial!\\nOrder ID: {{order_id}}\\nBalance Due: Rs. {{balance_due}}', 
    delivered: 'Hello {{customer_name}},\\nThank you for choosing {{shop_name}}.\\nYour Order {{order_id}} has been delivered!' 
  });

  useEffect(() => {
    fetchManagers();
    fetchSettings();
  }, []);

  const fetchManagers = async () => {
    const res = await fetch('/api/managers');
    const data = await res.json();
    setManagers(data);
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    // No longer using global stitching_rates
    if(data.business_identity) {
      setIdentity(JSON.parse(data.business_identity));
    }
    if(data.whatsapp_templates) {
      setTemplates(JSON.parse(data.whatsapp_templates));
    }
  };

  const handleAddManager = async (e) => {
    e.preventDefault();
    await fetch('/api/managers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newManager)
    });
    setNewManager({ name: '', workshop_number: '', mobile_number: '' });
    fetchManagers();
  };

  const handleDeleteManager = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete manager "${name}"? This action cannot be undone.`)) return;
    
    await fetch(`/api/managers/${id}`, {
      method: 'DELETE'
    });
    fetchManagers();
  };

  const handleOpenRatesModal = (manager) => {
    setSelectedManagerForRates(manager);
    const defaultRates = {
        Pant: 500, Shirt: 400, Kurta: 450, Pajama: 300, Sherwani: 5000, Coat: 2500, 'Nehru Jacket': 1500, 'V-Jacket': 1200, Indowestern: 4000, Achkan: 4500
    };
    try {
        const parsed = JSON.parse(manager.stitching_rates || '{}');
        setManagerRates({ ...defaultRates, ...parsed });
    } catch (e) {
        setManagerRates(defaultRates);
    }
  };

  const handleSaveManagerRates = async () => {
    if (!selectedManagerForRates) return;
    await fetch(`/api/managers/${selectedManagerForRates.id}/rates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stitching_rates: managerRates })
    });
    alert(`${selectedManagerForRates.name}'s Rates Updated!`);
    setSelectedManagerForRates(null);
    fetchManagers();
  };

  const handleSaveIdentity = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'business_identity', value: JSON.stringify(identity) })
    });
    alert('Business Identity Updated!');
  };

  const handleSaveTemplates = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'whatsapp_templates', value: JSON.stringify(templates) })
    });
    alert('WhatsApp Templates Updated!');
  };

  return (
    <>
    <div className="grid grid-cols-2 gap-6 pb-12">
      
      {/* Column 1 */}
      <div className="flex flex-col gap-6">
        {/* Managers Settings */}
        <div className="card h-fit">
        <h2 className="mb-6">Workshop Managers</h2>
        
        <form onSubmit={handleAddManager} className="flex flex-col gap-3 mb-6">
          <div className="form-group mb-0">
            <label className="form-label">Manager Name</label>
            <input type="text" placeholder="Manager Name" required value={newManager.name} onChange={e=>setNewManager({...newManager, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group mb-0">
              <label className="form-label">Workshop No.</label>
              <input type="text" placeholder="e.g., 1, 2, 3" required value={newManager.workshop_number} onChange={e=>setNewManager({...newManager, workshop_number: e.target.value})} className="w-full" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Mobile Number</label>
              <input type="text" placeholder="10 digits" required value={newManager.mobile_number} onChange={e=>setNewManager({...newManager, mobile_number: e.target.value})} className="w-full" />
            </div>
          </div>
          <button type="submit" className="btn-primary mt-3">Add Manager</button>
        </form>

        <h3 className="mb-2">Active Managers</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {managers.map(m => (
            <div key={m.id} className="flex justify-between items-center p-3 mb-2" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--accent-gold)' }}>{m.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mobile: {m.mobile_number}</p>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ padding: '4px 10px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', fontSize: '0.8rem' }}>
                  Workshop {m.workshop_number}
                </span>
                <button 
                  onClick={() => handleOpenRatesModal(m)}
                  style={{ 
                      padding: '4px 10px', 
                      backgroundColor: 'rgba(255, 215, 0, 0.1)', 
                      color: 'var(--accent-gold)', 
                      border: '1px solid var(--accent-gold)',
                      borderRadius: '12px', 
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                  }}
                >
                  Edit Rates
                </button>
                <button 
                  onClick={() => handleDeleteManager(m.id, m.name)}
                  style={{ 
                      padding: '4px 8px', 
                      backgroundColor: 'rgba(248, 81, 73, 0.1)', 
                      color: 'var(--danger)', 
                      border: '1px solid var(--danger)',
                      borderRadius: '12px', 
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                  }}
                  title="Delete Manager"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Column 2 */}
      <div className="flex flex-col gap-6">
        
        {/* Business Identity */}
        <div className="card h-fit">
          <h2 className="mb-2">Business Identity</h2>
          <p className="subtext mb-6">These details will be printed on customer invoices and receipts.</p>
          
          <div className="flex flex-col gap-3">
            <div className="form-group mb-0">
               <label className="form-label">Shop Name</label>
               <input type="text" className="w-full" value={identity.shopName} onChange={e=>setIdentity({...identity, shopName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group mb-0">
                 <label className="form-label">GSTIN</label>
                 <input type="text" className="w-full" value={identity.gstin} onChange={e=>setIdentity({...identity, gstin: e.target.value})} />
              </div>
              <div className="form-group mb-0">
                 <label className="form-label">Mobile Number</label>
                 <input type="text" className="w-full" value={identity.mobile} onChange={e=>setIdentity({...identity, mobile: e.target.value})} />
              </div>
            </div>
            <div className="form-group mb-0">
               <label className="form-label">Full Address</label>
               <input type="text" className="w-full" value={identity.address} onChange={e=>setIdentity({...identity, address: e.target.value})} />
            </div>
            <div className="form-group mb-0">
               <label className="form-label">Terms & Conditions (Printed on Bill)</label>
               <textarea className="w-full" rows="3" value={identity.terms} onChange={e=>setIdentity({...identity, terms: e.target.value})} placeholder="e.g. 1. No returns after 7 days."></textarea>
            </div>
          </div>
          <button className="btn-primary w-full mt-6" onClick={handleSaveIdentity}>Save Identity</button>
        </div>

        {/* WhatsApp Templates */}
        <div className="card h-fit">
          <h2 className="mb-2">WhatsApp Templates</h2>
          <p className="subtext mb-6">Available tags: <code style={{color: 'var(--accent-gold)'}}>{"{{customer_name}}, {{shop_name}}, {{order_id}}, {{balance_due}}"}</code></p>
          
          <div className="flex flex-col gap-4">
            <div className="form-group mb-0">
               <label className="form-label">Order Booked Template</label>
               <textarea className="w-full" rows="3" value={templates.booked} onChange={e=>setTemplates({...templates, booked: e.target.value})}></textarea>
            </div>
            <div className="form-group mb-0">
               <label className="form-label">Ready for Trial Template</label>
               <textarea className="w-full" rows="3" value={templates.trial} onChange={e=>setTemplates({...templates, trial: e.target.value})}></textarea>
            </div>
            <div className="form-group mb-0">
               <label className="form-label">Order Delivered Template</label>
               <textarea className="w-full" rows="3" value={templates.delivered} onChange={e=>setTemplates({...templates, delivered: e.target.value})}></textarea>
            </div>
          </div>
          <button className="btn-primary w-full mt-6" onClick={handleSaveTemplates}>Save Templates</button>
        </div>

      </div>

    </div>

      {/* Manager Rates Modal */}
      {selectedManagerForRates && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', alignSelf: 'center', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="mb-2">{selectedManagerForRates.name}'s Rates</h2>
            <p className="subtext mb-6">
              Set specific stitching rates for this manager. These will automatically apply in the New Order POS when this manager is selected.
            </p>

            <div className="flex flex-col gap-3">
              {Object.keys(managerRates).map(cat => (
                <div key={cat} className="flex justify-between items-center p-3" style={{ backgroundColor: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <label style={{ fontWeight: '600' }}>{cat}</label>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-secondary)' }}>₹</span>
                    <input 
                      type="number" 
                      value={managerRates[cat]} 
                      onChange={e => setManagerRates({...managerRates, [cat]: parseFloat(e.target.value) || 0})}
                      style={{ width: '100px', textAlign: 'right', margin: 0, padding: '0.4rem 0.6rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6 gap-4">
                <button className="btn-secondary flex-1" onClick={() => setSelectedManagerForRates(null)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={handleSaveManagerRates}>Save Rates</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
