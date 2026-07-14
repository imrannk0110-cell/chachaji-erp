import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [managers, setManagers] = useState([]);
  const [newManager, setNewManager] = useState({ name: '', workshop_number: '', mobile_number: '' });
  
  const [selectedManagerForRates, setSelectedManagerForRates] = useState(null);
  const [managerRates, setManagerRates] = useState({});

  const [identity, setIdentity] = useState({ shopName: '', gstin: '', address: '', mobile: '', terms: '' });
  const [templates, setTemplates] = useState({ 
    booked: 'Hello {{customer_name}},\\nYour gas stove fabrication order at {{shop_name}} has been booked.\\nOrder ID: {{order_id}}\\nBalance Due: Rs. {{balance_due}}', 
    trial: 'Hello {{customer_name}},\\nYour custom stove at {{shop_name}} is Ready to Deliver!\\nOrder ID: {{order_id}}\\nBalance Due: Rs. {{balance_due}}', 
    delivered: 'Hello {{customer_name}},\\nThank you for choosing {{shop_name}}.\\nYour Gas Stove Order {{order_id}} has been delivered!' 
  });

  useEffect(() => {
    fetchManagers();
    fetchSettings();
  }, []);

  const fetchManagers = async () => {
    const res = await fetch('/api/factory-units');
    const data = await res.json();
    setManagers(data);
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if(data.business_identity) {
      setIdentity(JSON.parse(data.business_identity));
    }
    if(data.whatsapp_templates) {
      setTemplates(JSON.parse(data.whatsapp_templates));
    }
  };

  const handleAddManager = async (e) => {
    e.preventDefault();
    await fetch('/api/factory-units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newManager)
    });
    setNewManager({ name: '', workshop_number: '', mobile_number: '' });
    fetchManagers();
  };

  const handleDeleteManager = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete Floor Unit "${name}"? This action cannot be undone.`)) return;
    
    await fetch(`/api/factory-units/${id}`, {
      method: 'DELETE'
    });
    fetchManagers();
  };

  const handleOpenRatesModal = (manager) => {
    setSelectedManagerForRates(manager);
    const defaultRates = {
        'Single Stove Burner - SS': 150,
        'Single Stove Burner - Iron (MS)': 120,
        'Double Stove Burner': 250,
        'Commercial Burner': 400,
        'Spare Parts & Accessories': 50
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
    await fetch(`/api/factory-units/${selectedManagerForRates.id}/rates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        stitching_rates: managerRates,
        mobile_number: selectedManagerForRates.mobile_number
      })
    });
    alert(`Floor Unit "${selectedManagerForRates.name}" Details Updated!`);
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
        {/* Factory Units Settings */}
        <div className="card h-fit">
        <h2 className="mb-6">Factory Floor Units</h2>
        
        <form onSubmit={handleAddManager} className="flex flex-col gap-3 mb-6">
          <div className="form-group mb-0">
            <label className="form-label">Floor Worker/Unit Name</label>
            <input type="text" placeholder="e.g. Ramesh Kumar" required value={newManager.name} onChange={e=>setNewManager({...newManager, name: e.target.value})} className="w-full" style={{ padding: '0.6rem' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group mb-0">
              <label className="form-label">Unit Number / Floor No.</label>
              <input type="text" placeholder="e.g., 1, 2, 3" required value={newManager.workshop_number} onChange={e=>setNewManager({...newManager, workshop_number: e.target.value})} className="w-full" style={{ padding: '0.6rem' }} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Mobile Number</label>
              <input type="text" placeholder="10 digits" required value={newManager.mobile_number} onChange={e=>setNewManager({...newManager, mobile_number: e.target.value})} className="w-full" style={{ padding: '0.6rem' }} />
            </div>
          </div>
          <button type="submit" className="btn-primary mt-3">Add Factory Unit</button>
        </form>

        <h3 className="mb-2">Active Factory Units</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {managers.map(m => (
            <div key={m.id} className="flex justify-between items-center p-3 mb-2" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--accent-gold)' }}>{m.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Mobile: {m.mobile_number}
                  {m.is_active === 0 && <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: 'var(--danger)', color: 'white', borderRadius: '4px', fontSize: '0.7rem' }}>Inactive</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ padding: '4px 10px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', fontSize: '0.8rem' }}>
                  Unit {m.workshop_number}
                </span>
                <button 
                  onClick={() => handleOpenRatesModal(m)}
                  style={{ 
                      padding: '4px 10px', 
                      backgroundColor: 'rgba(224, 90, 16, 0.1)', 
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
                  title="Delete Factory Unit"
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
               <label className="form-label">Shop / Company Name</label>
               <input type="text" className="w-full" value={identity.shopName} onChange={e=>setIdentity({...identity, shopName: e.target.value})} style={{ padding: '0.6rem' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group mb-0">
                 <label className="form-label">GSTIN</label>
                 <input type="text" className="w-full" value={identity.gstin} onChange={e=>setIdentity({...identity, gstin: e.target.value})} style={{ padding: '0.6rem' }} />
              </div>
              <div className="form-group mb-0">
                 <label className="form-label">Mobile Number</label>
                 <input type="text" className="w-full" value={identity.mobile} onChange={e=>setIdentity({...identity, mobile: e.target.value})} style={{ padding: '0.6rem' }} />
              </div>
            </div>
            <div className="form-group mb-0">
               <label className="form-label">Full Address</label>
               <input type="text" className="w-full" value={identity.address} onChange={e=>setIdentity({...identity, address: e.target.value})} style={{ padding: '0.6rem' }} />
            </div>
            <div className="form-group mb-0">
               <label className="form-label">Terms & Conditions (Printed on Bill)</label>
               <textarea className="w-full" rows="3" value={identity.terms} onChange={e=>setIdentity({...identity, terms: e.target.value})} placeholder="e.g. 1. 1 Year Warranty on Brass Burners. 2. 50% advance for custom fabrication." style={{ padding: '0.6rem' }}></textarea>
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
               <textarea className="w-full" rows="3" value={templates.booked} onChange={e=>setTemplates({...templates, booked: e.target.value})} style={{ padding: '0.6rem' }}></textarea>
            </div>
            <div className="form-group mb-0">
               <label className="form-label">Ready to Deliver Template</label>
               <textarea className="w-full" rows="3" value={templates.trial} onChange={e=>setTemplates({...templates, trial: e.target.value})} style={{ padding: '0.6rem' }}></textarea>
            </div>
            <div className="form-group mb-0">
               <label className="form-label">Order Delivered Template</label>
               <textarea className="w-full" rows="3" value={templates.delivered} onChange={e=>setTemplates({...templates, delivered: e.target.value})} style={{ padding: '0.6rem' }}></textarea>
            </div>
          </div>
          <button className="btn-primary w-full mt-6" onClick={handleSaveTemplates}>Save Templates</button>
        </div>

      </div>

    </div>

      {/* Factory Unit Rates Modal */}
      {selectedManagerForRates && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', alignSelf: 'center', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="mb-2">{selectedManagerForRates.name}'s Assembly Details</h2>
            <p className="subtext mb-6">
              Update assembly floor unit contact number and manufacturing assembly rates.
            </p>

            <div className="flex gap-4 mb-6">
              <div className="form-group flex-1 mb-0">
                <label className="form-label">Unit Mobile Number</label>
                <input 
                  type="text" 
                  value={selectedManagerForRates.mobile_number} 
                  onChange={e => setSelectedManagerForRates({...selectedManagerForRates, mobile_number: e.target.value})}
                  className="w-full"
                  style={{ padding: '0.6rem' }}
                />
              </div>
              <div className="form-group flex-1 mb-0">
                <label className="form-label">Active Status</label>
                <select 
                  className="w-full"
                  value={selectedManagerForRates.is_active !== undefined ? selectedManagerForRates.is_active : 1}
                  onChange={e => setSelectedManagerForRates({...selectedManagerForRates, is_active: parseInt(e.target.value)})}
                  style={{ padding: '0.6rem' }}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive (Closed/Left)</option>
                </select>
              </div>
            </div>

            <h3 className="mb-4">Assembly Fabrication Labor Rates</h3>
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
