import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [managers, setManagers] = useState([]);
  const [newManager, setNewManager] = useState({ name: '', workshop_number: '', mobile_number: '' });
  
  const [rates, setRates] = useState({
    Pant: 500, Shirt: 400, Kurta: 450, Coat: 2500, Safa: 100
  });

  useEffect(() => {
    fetchManagers();
    fetchSettings();
  }, []);

  const fetchManagers = async () => {
    const res = await fetch('http://localhost:5000/api/managers');
    const data = await res.json();
    setManagers(data);
  };

  const fetchSettings = async () => {
    const res = await fetch('http://localhost:5000/api/settings');
    const data = await res.json();
    if(data.stitching_rates) {
      setRates(JSON.parse(data.stitching_rates));
    }
  };

  const handleAddManager = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:5000/api/managers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newManager)
    });
    setNewManager({ name: '', workshop_number: '', mobile_number: '' });
    fetchManagers();
  };

  const handleSaveRates = async () => {
    await fetch('http://localhost:5000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'stitching_rates', value: JSON.stringify(rates) })
    });
    alert('Global Stitching Rates Updated!');
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      
      {/* Managers Settings */}
      <div className="card h-full">
        <h2 className="mb-4">Workshop Managers</h2>
        
        <form onSubmit={handleAddManager} className="flex flex-col gap-2 mb-6">
          <input type="text" placeholder="Manager Name" required value={newManager.name} onChange={e=>setNewManager({...newManager, name: e.target.value})} />
          <div className="flex gap-2">
            <input type="text" placeholder="Workshop No (e.g., 1, 2, 3)" required value={newManager.workshop_number} onChange={e=>setNewManager({...newManager, workshop_number: e.target.value})} className="w-full" />
            <input type="text" placeholder="Mobile Number (10 digits)" required value={newManager.mobile_number} onChange={e=>setNewManager({...newManager, mobile_number: e.target.value})} className="w-full" />
          </div>
          <button type="submit" className="btn-primary mt-2">Add Manager</button>
        </form>

        <h3 className="mb-2">Active Managers</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {managers.map(m => (
            <div key={m.id} className="flex justify-between items-center p-3 mb-2" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--accent-gold)' }}>{m.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mobile: {m.mobile_number}</p>
              </div>
              <span style={{ padding: '4px 10px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', fontSize: '0.8rem' }}>
                Workshop {m.workshop_number}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Global Rates Settings */}
      <div className="card h-full flex flex-col justify-between">
        <div>
          <h2 className="mb-4">Global Default Stitching Rates</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            These rates are used by the POS Math Profit Engine to calculate the default stitching cost per category before any manual overrides.
          </p>

          <div className="flex flex-col gap-4">
            {Object.keys(rates).map(cat => (
              <div key={cat} className="flex justify-between items-center p-3" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <label style={{ fontWeight: 'bold' }}>{cat}</label>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>₹</span>
                  <input 
                    type="number" 
                    value={rates[cat]} 
                    onChange={e => setRates({...rates, [cat]: parseFloat(e.target.value) || 0})}
                    style={{ width: '100px', textAlign: 'right', margin: 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary w-full mt-6" onClick={handleSaveRates}>
          Save Configuration
        </button>
      </div>

    </div>
  );
};

export default Settings;
