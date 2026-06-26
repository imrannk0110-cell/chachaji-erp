import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Scissors } from 'lucide-react';

const CRM = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', faith_tag: 'General', dob: '' });
  
  // Dialer State
  const [showDialer, setShowDialer] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Pant');
  const [activeMeasurementField, setActiveMeasurementField] = useState('Length');
  const [measurements, setMeasurements] = useState({
    Pant: { Length: '', Waist: '', Hip: '', Bottom: '' },
    Shirt: { Length: '', Chest: '', Shoulder: '', Sleeve: '' },
    Kurta: { Length: '', Chest: '', Shoulder: '', Sleeve: '' },
    Coat: { Length: '', Chest: '', Shoulder: '', Sleeve: '' }
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const res = await fetch('http://localhost:5000/api/customers');
    const data = await res.json();
    setCustomers(data);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomerForm)
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      setNewCustomerForm({ name: '', phone: '', faith_tag: 'General', dob: '' });
      fetchCustomers();
    }
  };

  const handleDialerInput = (val) => {
    setMeasurements(prev => {
      const currentVal = prev[activeCategory][activeMeasurementField];
      // if backspace
      if (val === 'DEL') {
        return {
          ...prev,
          [activeCategory]: {
            ...prev[activeCategory],
            [activeMeasurementField]: currentVal.slice(0, -1)
          }
        };
      }
      // logic to prevent multiple decimals
      if (val === '.' && currentVal.includes('.')) return prev;
      
      return {
        ...prev,
        [activeCategory]: {
          ...prev[activeCategory],
          [activeMeasurementField]: currentVal + val
        }
      };
    });
  };

  const dialerPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'];

  return (
    <div className="grid grid-cols-2 gap-4">
      
      {/* Customer List & Add */}
      <div className="card h-full flex-col">
        <h2 className="mb-4">CRM Profiles</h2>
        
        <form onSubmit={handleAddCustomer} className="flex gap-2 mb-4">
          <input type="text" placeholder="Name" required value={newCustomerForm.name} onChange={e=>setNewCustomerForm({...newCustomerForm, name: e.target.value})} className="w-full" />
          <input type="text" placeholder="Phone" required value={newCustomerForm.phone} onChange={e=>setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="w-full" />
          <select value={newCustomerForm.faith_tag} onChange={e=>setNewCustomerForm({...newCustomerForm, faith_tag: e.target.value})}>
            <option value="General">General</option>
            <option value="Hindu">Hindu</option>
            <option value="Muslim">Muslim</option>
          </select>
          <button type="submit" className="btn-primary"><UserPlus size={18} /></button>
        </form>

        <div style={{ overflowY: 'auto', flex: 1, maxHeight: '500px' }}>
          {customers.map(c => (
            <div 
              key={c.id} 
              className="flex justify-between items-center p-4 mb-2 cursor-pointer"
              style={{
                backgroundColor: selectedCustomer?.id === c.id ? 'rgba(197, 160, 89, 0.1)' : 'var(--surface-light)',
                borderRadius: '8px',
                border: selectedCustomer?.id === c.id ? '1px solid var(--accent-gold)' : '1px solid transparent'
              }}
              onClick={() => setSelectedCustomer(c)}
            >
              <div>
                <h4 style={{ margin: 0 }}>{c.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><Phone size={12}/> {c.phone}</p>
              </div>
              <span style={{ fontSize: '0.8rem', padding: '4px 8px', backgroundColor: 'var(--bg-color)', borderRadius: '12px' }}>
                {c.faith_tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dialer Overlay / Measurement Section */}
      <div className="card h-full relative flex-col">
        {selectedCustomer ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2>Measurements for {selectedCustomer.name}</h2>
              <button className="btn-secondary" onClick={() => setShowDialer(!showDialer)}>
                <Scissors size={18} style={{ marginRight: '8px' }} />
                Toggle Mobile Dialer
              </button>
            </div>

            <div className="flex gap-2 mb-4" style={{ overflowX: 'auto' }}>
              {['Pant', 'Shirt', 'Kurta', 'Coat'].map(cat => (
                <button 
                  key={cat}
                  className={`btn-secondary ${activeCategory === cat ? 'active' : ''}`}
                  style={activeCategory === cat ? { backgroundColor: 'var(--accent-gold)', color: 'var(--bg-color)' } : {}}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              {Object.keys(measurements[activeCategory]).map(field => (
                <div 
                  key={field}
                  onClick={() => setActiveMeasurementField(field)}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--surface-light)',
                    borderRadius: '8px',
                    border: activeMeasurementField === field && showDialer ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>{field}</label>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {measurements[activeCategory][field] || '0.0'}
                  </div>
                </div>
              ))}
            </div>

            {/* Fat-Finger Mobile Dialer Overlay */}
            {showDialer && (
              <div style={{
                position: 'absolute',
                bottom: '0', left: '0', right: '0',
                backgroundColor: 'var(--surface-color)',
                padding: '1.5rem',
                borderTop: '2px solid var(--accent-gold)',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
              }}>
                <div className="flex justify-between items-center mb-4">
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Editing: {activeCategory} - {activeMeasurementField}</span>
                  <button onClick={() => setShowDialer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}>Close</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {dialerPad.map(btn => (
                    <button 
                      key={btn}
                      onClick={() => handleDialerInput(btn)}
                      style={{
                        padding: '1.2rem',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        backgroundColor: btn === 'DEL' ? 'var(--danger)' : 'var(--surface-light)',
                        color: 'var(--text-primary)',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
               <button className="btn-primary w-full" onClick={() => alert("Measurements stored in session for POS Checkout.")}>
                 Save & Proceed to POS
               </button>
            </div>
          </>
        ) : (
          <div className="flex-col items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
            <Users size={48} className="mb-4" opacity={0.5} />
            <p>Select a customer profile to add measurements.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRM;
