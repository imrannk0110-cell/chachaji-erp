import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, UserPlus, Scissors, ChevronRight, X, Plus } from 'lucide-react';

const CRM = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  
  // Customer Form State
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', faith_tag: 'General', dob: '' });
  
  // Dialer / Measurement State
  const [showDialerModal, setShowDialerModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Pant');
  const [activeField, setActiveField] = useState('Length');
  const [sessionMeasurements, setSessionMeasurements] = useState({}); // { Pant: {...}, Shirt: {...} }
  
  const [currentOutfitFields, setCurrentOutfitFields] = useState({
    Pant: { Length: '', Waist: '', Hip: '', Thigh: '', Bottom: '' },
    Shirt: { Length: '', Chest: '', Stomach: '', Shoulder: '', Sleeve: '', Neck: '' },
    Kurta: { Length: '', Chest: '', Stomach: '', Shoulder: '', Sleeve: '', Neck: '' },
    Pajama: { Length: '', Waist: '', Hip: '', Thigh: '', Bottom: '' },
    Sherwani: { Length: '', Chest: '', Stomach: '', Hip: '', Shoulder: '', Sleeve: '', Neck: '' },
    Coat: { Length: '', Chest: '', Stomach: '', Hip: '', Shoulder: '', Sleeve: '' },
    'Nehru Jacket': { Length: '', Chest: '', Stomach: '', Shoulder: '', Neck: '' },
    'V-Jacket': { Length: '', Chest: '', Stomach: '', Shoulder: '' },
    Indowestern: { Length: '', Chest: '', Stomach: '', Hip: '', Shoulder: '', Sleeve: '', Neck: '' },
    Achkan: { Length: '', Chest: '', Stomach: '', Hip: '', Shoulder: '', Sleeve: '', Neck: '' }
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(data);
  };

  const handleDialerInput = (val) => {
    setCurrentOutfitFields(prev => {
      const currentVal = prev[activeCategory][activeField];
      if (val === 'CLEAR') {
         return { ...prev, [activeCategory]: { ...prev[activeCategory], [activeField]: '' } };
      }
      if (val === 'DEL') {
         return { ...prev, [activeCategory]: { ...prev[activeCategory], [activeField]: currentVal.slice(0, -1) } };
      }
      if (val === '.' && currentVal.includes('.')) return prev;
      
      return {
        ...prev,
        [activeCategory]: {
          ...prev[activeCategory],
          [activeField]: currentVal + val
        }
      };
    });
  };

  const handleInputChange = (field, value) => {
    setCurrentOutfitFields(prev => ({
      ...prev,
      [activeCategory]: {
        ...prev[activeCategory],
        [field]: value
      }
    }));
  };

  const dialerPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL', 'CLEAR'];

  const handleAddAnotherMeasurement = () => {
    // Save current active category to session
    setSessionMeasurements(prev => ({
      ...prev,
      [activeCategory]: currentOutfitFields[activeCategory]
    }));
    alert(`${activeCategory} specs saved to session! You can now select another outfit.`);
  };

  const handleSaveAndProceed = async () => {
    // 1. Ensure current outfit is saved
    const finalMeasurements = {
      ...sessionMeasurements,
      [activeCategory]: currentOutfitFields[activeCategory]
    };

    // 2. Validate Customer Form
    if(!newCustomerForm.name || !newCustomerForm.phone) {
        alert("Please fill in Customer Name and Phone before proceeding.");
        setShowDialerModal(false);
        return;
    }

    try {
      // 3. Create or Update Customer
      // For simplicity, we just create. In a real app we might check if phone exists.
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomerForm)
      });
      const data = await res.json();
      
      if(data.error && data.error.includes("UNIQUE")) {
          // If phone exists, we might want to fetch that customer ID instead.
          // For now, let's just alert.
          alert("Phone number already exists in CRM. Please use a unique number or select existing.");
          return;
      }
      
      if(data.id) {
          // 4. Redirect to POS with State
          navigate('/pos', { 
              state: { 
                  customerId: data.id, 
                  measurements_json: finalMeasurements 
              } 
          });
      }

    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* 1. Profile Registration Form */}
      <div className="card">
        <h2 className="mb-6 flex items-center gap-2"><UserPlus size={24} color="var(--accent-gold)" /> Register Client</h2>
        
        <div className="flex flex-col gap-4 mb-8">
          <div className="form-group mb-0">
            <label className="form-label">Full Name</label>
            <input type="text" placeholder="e.g. Rahul Sharma" required value={newCustomerForm.name} onChange={e=>setNewCustomerForm({...newCustomerForm, name: e.target.value})} className="w-full" style={{ padding: '0.8rem' }} />
          </div>
          
          <div className="form-group mb-0">
            <label className="form-label">Mobile Number (Unique)</label>
            <input type="tel" placeholder="10-digit number" required value={newCustomerForm.phone} onChange={e=>setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="w-full" style={{ padding: '0.8rem' }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Faith / Tag</label>
              <select value={newCustomerForm.faith_tag} onChange={e=>setNewCustomerForm({...newCustomerForm, faith_tag: e.target.value})} className="w-full" style={{ padding: '0.8rem' }}>
                <option value="General">General</option>
                <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Date of Birth</label>
              <input type="date" value={newCustomerForm.dob} onChange={e=>setNewCustomerForm({...newCustomerForm, dob: e.target.value})} className="w-full" style={{ padding: '0.8rem' }} />
            </div>
          </div>
        </div>

        <button 
          className="btn-primary w-full flex items-center justify-center gap-2" 
          style={{ padding: '1.2rem', fontSize: '1.1rem' }}
          onClick={() => {
              if(!newCustomerForm.name || !newCustomerForm.phone) {
                  return alert("Name and Phone are required.");
              }
              setShowDialerModal(true);
          }}
        >
          Proceed to Measurement <ChevronRight size={20} />
        </button>
      </div>

      {/* Database Quick View */}
      <div className="card h-full">
         <h2 className="mb-4">Recent Customers</h2>
         <div className="no-scrollbar" style={{ overflowY: 'auto', maxHeight: '500px' }}>
          {customers.slice().reverse().map(c => (
            <div 
              key={c.id} 
              className="flex justify-between items-center p-4 mb-3"
              style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
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

      {/* ============================================================================================== */}
      {/* 2. Touch-Friendly Dialer Interface (Measurement overlay modal) */}
      {/* ============================================================================================== */}
      {showDialerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          
          <div className="card shadow-lg flex flex-col" style={{ width: '900px', height: '80vh', position: 'relative', padding: '2rem' }}>
            <button className="btn-icon" style={{ position: 'absolute', top: '24px', right: '24px' }} onClick={() => setShowDialerModal(false)}>
              <X size={24} />
            </button>
            
            <div className="flex items-center gap-4 mb-8" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
               <Scissors size={28} color="var(--accent-gold)" />
               <h2 style={{ margin: 0 }}>Digital Measurement Sheet</h2>
               <span style={{ marginLeft: 'auto', marginRight: '40px', color: 'var(--text-secondary)' }}>Client: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{newCustomerForm.name}</span></span>
            </div>

            {/* Top Dropdown for Category */}
            <div className="flex flex-col items-center mb-8">
               <div className="flex gap-2 mb-4 justify-center flex-wrap">
                 {Object.entries(currentOutfitFields).map(([cat, fields]) => {
                    const hasData = Object.values(fields).some(v => v.trim() !== '');
                    if(hasData && cat !== activeCategory) {
                        return <span key={cat} style={{ padding: '4px 12px', fontSize: '0.85rem', borderRadius: '16px', backgroundColor: 'rgba(46, 160, 67, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', fontWeight: 'bold' }}>{cat} ✓</span>
                    }
                    return null;
                 })}
               </div>
               <div className="form-group w-1/2 mb-0 text-center">
                 <label className="form-label">Select Outfit Category</label>
                 <select 
                    value={activeCategory} 
                    onChange={e => {
                        setActiveCategory(e.target.value);
                        // Reset active field to first key of new category
                        setActiveField(Object.keys(currentOutfitFields[e.target.value])[0]);
                    }} 
                    className="w-full text-center" 
                    style={{ fontSize: '1.2rem', padding: '0.8rem', fontWeight: 'bold' }}
                 >
                   <option value="Pant">Pant</option>
                   <option value="Shirt">Shirt</option>
                   <option value="Kurta">Kurta</option>
                   <option value="Pajama">Pajama</option>
                   <option value="Sherwani">Sherwani</option>
                   <option value="Coat">Coat</option>
                   <option value="Nehru Jacket">Nehru Jacket</option>
                   <option value="V-Jacket">V-Jacket</option>
                   <option value="Indowestern">Indowestern</option>
                   <option value="Achkan">Achkan</option>
                 </select>
               </div>
            </div>

            <div className="flex gap-8 flex-1">
               {/* Left Column: Input Fields */}
               <div className={`flex-1 ${!isMobile ? 'grid grid-cols-2 lg:grid-cols-3 auto-rows-max gap-4' : 'flex flex-col gap-4'}`} style={{ overflowY: 'auto', paddingRight: '1rem', alignContent: 'start' }}>
                 {Object.keys(currentOutfitFields[activeCategory]).map(field => (
                    <div 
                      key={field}
                      onClick={() => setActiveField(field)}
                      style={{
                        padding: '1.5rem',
                        backgroundColor: activeField === field ? 'rgba(197, 160, 89, 0.1)' : 'var(--surface-light)',
                        borderRadius: '12px',
                        border: activeField === field ? '2px solid var(--accent-gold)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <label style={{ fontSize: '1.1rem', fontWeight: '600', color: activeField === field ? 'var(--accent-gold)' : 'var(--text-secondary)', cursor: 'pointer' }}>{field}</label>
                      <input 
                         type="text" 
                         readOnly={isMobile} // Suppress native soft-keyboard only on mobile
                         value={currentOutfitFields[activeCategory][field]} 
                         onChange={(e) => handleInputChange(field, e.target.value)}
                         placeholder="0.0"
                         style={{ 
                             width: '120px', 
                             textAlign: 'right', 
                             fontSize: '1.5rem', 
                             fontWeight: 'bold', 
                             backgroundColor: 'transparent',
                             border: 'none',
                             outline: 'none',
                             color: 'var(--text-primary)'
                         }} 
                      />
                    </div>
                 ))}
               </div>

               {/* Right Column: Custom Dialer Pad (Hidden on Desktop) */}
               {isMobile && (
                 <div className="w-[350px] flex flex-col justify-center">
                   <div className="grid grid-cols-3 gap-3">
                      {dialerPad.map(btn => (
                        <button 
                          key={btn}
                          onClick={() => handleDialerInput(btn)}
                          style={{
                            padding: '1.5rem',
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            backgroundColor: btn === 'DEL' || btn === 'CLEAR' ? 'rgba(248, 81, 73, 0.1)' : 'var(--surface-light)',
                            color: btn === 'DEL' || btn === 'CLEAR' ? 'var(--danger)' : 'var(--text-primary)',
                            border: btn === 'DEL' || btn === 'CLEAR' ? '1px solid rgba(248, 81, 73, 0.3)' : '1px solid var(--border-color)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            gridColumn: btn === 'CLEAR' ? 'span 3' : 'span 1'
                          }}
                          className="hover:opacity-80 active:scale-95 transition-transform"
                        >
                          {btn}
                        </button>
                      ))}
                   </div>
                 </div>
               )}
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
               <button className="btn-secondary flex-1 py-4 text-lg flex items-center justify-center gap-2" onClick={handleAddAnotherMeasurement}>
                 <Plus size={20} /> Add Another Measurement
               </button>
               <button className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2" onClick={handleSaveAndProceed}>
                 Save & Proceed to POS <ChevronRight size={20} />
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default CRM;
