import React, { useState, useEffect, useRef } from 'react';

const SupplierLedger = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  
  // Ledger State
  const [ledger, setLedger] = useState([]);
  
  // Forms
  const [productForm, setProductForm] = useState({
    sku_takano: '', shade_id: '', total_meters: '', purchase_rate: '', 
    gst_percentage: '', selling_price: ''
  });
  const [shadeImage, setShadeImage] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const res = await fetch('http://localhost:5000/api/suppliers');
    const data = await res.json();
    setSuppliers(data);
  };

  const fetchLedger = async (id) => {
    const res = await fetch(`http://localhost:5000/api/suppliers/${id}/ledger`);
    const data = await res.json();
    setLedger(data);
  };

  const handleSupplierSelect = (e) => {
    const id = e.target.value;
    setSelectedSupplierId(id);
    if(id) fetchLedger(id);
    else setLedger([]);
  };

  // WebP Compression Hack
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // compress to WebP at 0.5 quality to keep it ~50KB
        const webpBase64 = canvas.toDataURL('image/webp', 0.5);
        setShadeImage(webpBase64);
      }
    };
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if(!selectedSupplierId) return alert('Select Supplier first');
    if(productForm.shade_id.length > 7) return alert('Shade ID max 7 chars');

    const res = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...productForm,
        shade_image: shadeImage,
        supplier_id: selectedSupplierId
      })
    });
    const data = await res.json();
    if(data.error) alert(data.error);
    else {
      alert(`Product Saved. Auto-Calculated Landing Cost: ₹${data.landing_cost}`);
      setProductForm({sku_takano: '', shade_id: '', total_meters: '', purchase_rate: '', gst_percentage: '', selling_price: ''});
      setShadeImage(null);
    }
  };

  const handleLedgerEntry = async (type) => {
    if(!selectedSupplierId) return alert('Select Supplier first');
    const amount = prompt(`Enter Amount for ${type}:`);
    const reference_no = prompt(`Enter Reference/Invoice No for ${type}:`);
    
    if(!amount || !reference_no) return;

    const res = await fetch('http://localhost:5000/api/supplier_ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: selectedSupplierId,
        invoice_no: type === 'Cr_Purchase' ? reference_no : '',
        transaction_type: type,
        amount: parseFloat(amount),
        payment_mode: 'Bank/Cash',
        reference_no: reference_no
      })
    });
    const data = await res.json();
    if(!data.error) fetchLedger(selectedSupplierId);
  };

  // Compute Outstanding
  let netOutstanding = 0;
  if (selectedSupplierId) {
    const s = suppliers.find(x => x.id == selectedSupplierId);
    let opening = s ? s.opening_balance : 0;
    let cr = ledger.filter(l => l.transaction_type === 'Cr_Purchase').reduce((a,b) => a + b.amount, 0);
    let dr = ledger.filter(l => l.transaction_type === 'Dr_Payment').reduce((a,b) => a + b.amount, 0);
    netOutstanding = (opening + cr) - dr;
  }

  return (
    <div>
      <h1 className="mb-4">Supplier Accounting & Textile Stock</h1>
      
      <div className="card mb-4 flex gap-4 items-center">
        <select value={selectedSupplierId} onChange={handleSupplierSelect} className="w-full">
          <option value="">-- Select Supplier --</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (GST: {s.gstin})</option>)}
        </select>
        <button className="btn-secondary" onClick={() => {
           const name = prompt('Supplier Name');
           if(name) {
             fetch('http://localhost:5000/api/suppliers', {
               method:'POST', headers:{'Content-Type':'application/json'},
               body: JSON.stringify({ name })
             }).then(()=>fetchSuppliers());
           }
        }}>+ New Supplier</button>
      </div>

      {selectedSupplierId && (
        <div className="grid grid-cols-2 gap-4">
          
          {/* LEDGER COMPONENT */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2>Clean Ledger</h2>
              <h3 style={{ color: netOutstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                Net Outstanding: ₹{netOutstanding.toFixed(2)}
              </h3>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button className="btn-secondary w-full" style={{borderColor: 'var(--danger)', color: 'var(--danger)'}} onClick={() => handleLedgerEntry('Cr_Purchase')}>
                Record Purchase (Cr)
              </button>
              <button className="btn-secondary w-full" style={{borderColor: 'var(--success)', color: 'var(--success)'}} onClick={() => handleLedgerEntry('Dr_Payment')}>
                Pay Supplier (Dr)
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="p-4">Date</th>
                    <th className="p-4">Ref/Inv</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="p-4">{new Date(l.created_at).toLocaleDateString()}</td>
                      <td className="p-4">{l.reference_no || l.invoice_no}</td>
                      <td className="p-4" style={{ color: l.transaction_type === 'Cr_Purchase' ? 'var(--danger)' : 'var(--success)' }}>
                        {l.transaction_type}
                      </td>
                      <td className="p-4">₹{l.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* NEW PRODUCT ADD COMPONENT */}
          <div className="card">
            <h2 className="mb-4">Add Textile Stock (Thaan)</h2>
            <form onSubmit={handleProductSubmit} className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Takano / SKU No" required value={productForm.sku_takano} onChange={e=>setProductForm({...productForm, sku_takano: e.target.value})} />
              <input type="text" placeholder="Shade ID (Max 7 Chars)" maxLength="7" required value={productForm.shade_id} onChange={e=>setProductForm({...productForm, shade_id: e.target.value})} />
              <input type="number" placeholder="Total Meters" required value={productForm.total_meters} onChange={e=>setProductForm({...productForm, total_meters: e.target.value})} />
              <input type="number" placeholder="Purchase Rate / Mtr" required value={productForm.purchase_rate} onChange={e=>setProductForm({...productForm, purchase_rate: e.target.value})} />
              <input type="number" placeholder="GST %" required value={productForm.gst_percentage} onChange={e=>setProductForm({...productForm, gst_percentage: e.target.value})} />
              <input type="number" placeholder="Selling Price / Mtr" required value={productForm.selling_price} onChange={e=>setProductForm({...productForm, selling_price: e.target.value})} />
              
              <div className="col-span-2">
                <label className="block mb-2 text-sm text-[var(--text-secondary)]">Thaan Image (Auto WebP Compression)</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full" />
                {shadeImage && <img src={shadeImage} alt="preview" style={{ marginTop: '10px', maxHeight: '100px', borderRadius: '8px' }} />}
              </div>

              <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2' }}>Save Product & Calc Landing Cost</button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};

export default SupplierLedger;
