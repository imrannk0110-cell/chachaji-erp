import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Image as ImageIcon, IndianRupee, Store, TrendingDown, ArrowRightLeft, X, FileText, CheckCircle, Banknote, Filter } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const SupplierLedger = () => {
  const location = useLocation();
  const [filterDena, setFilterDena] = useState(location.state?.filter === 'Dena');
  const [view, setView] = useState('STATEMENT'); // 'STATEMENT' | 'PURCHASE'
  
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [ledger, setLedger] = useState([]);
  const [supplierSearchText, setSupplierSearchText] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  
  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'Bank' });

  // New Supplier Modal
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', gstin: '', address: '', mobile: '', opening_balance: 0 });

  // Invoice Details Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceThaans, setInvoiceThaans] = useState([]);

  // Purchase Form State
  const [invoiceForm, setInvoiceForm] = useState({ invoice_no: '', date: new Date().toISOString().split('T')[0], advance_amount: '', payment_mode: 'Cash' });
  const [thaans, setThaans] = useState([
    { sku_takano: '', article_name: '', shade_id: '', total_meters: '', purchase_rate: '', gst_percentage: '5', shade_image: null, landing_cost: 0 }
  ]);

  const handleSaveNewSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplierForm.name) return alert("Supplier Name is required.");
    
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplierForm)
      });
      const data = await res.json();
      if(data.error) throw new Error(data.error);
      
      alert('Supplier Added Successfully!');
      setShowNewSupplierModal(false);
      setNewSupplierForm({ name: '', gstin: '', address: '', mobile: '', opening_balance: 0 });
      fetchSuppliers();
    } catch (err) {
      alert("Error adding supplier: " + err.message);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const res = await fetch('/api/suppliers');
    const data = await res.json();
    setSuppliers(data);
  };

  const fetchLedger = async (id) => {
    const res = await fetch(`/api/suppliers/${id}/ledger`);
    const data = await res.json();
    setLedger(data);
  };

  const handleSupplierSearchChange = (e) => {
    const val = e.target.value;
    setSupplierSearchText(val);

    const match = suppliers.find(s => `${s.name} (GST: ${s.gstin || 'N/A'})` === val);
    if (match) {
      setSelectedSupplierId(match.id);
      fetchLedger(match.id);
    } else {
      setSelectedSupplierId('');
      setLedger([]);
    }
  };

  // ----------------------------------------------------
  // Purchase View Logic
  // ----------------------------------------------------
  const handleAddThaan = () => {
    setThaans([...thaans, { sku_takano: '', article_name: '', shade_id: '', total_meters: '', purchase_rate: '', gst_percentage: '5', shade_image: null, landing_cost: 0 }]);
  };

  const handleRemoveThaan = (index) => {
    const newThaans = [...thaans];
    newThaans.splice(index, 1);
    setThaans(newThaans);
  };

  const handleThaanChange = (index, field, value) => {
    const newThaans = [...thaans];
    newThaans[index][field] = value;
    
    // Auto calculate landing cost dynamically
    const pr = parseFloat(newThaans[index].purchase_rate) || 0;
    const gst = parseFloat(newThaans[index].gst_percentage) || 0;
    newThaans[index].landing_cost = pr + (pr * (gst / 100));
    
    setThaans(newThaans);
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const webpBase64 = canvas.toDataURL('image/webp', 0.5);
        handleThaanChange(index, 'shade_image', webpBase64);
      }
    };
  };

  const calculateInvoiceTotal = () => {
    return thaans.reduce((acc, thaan) => {
      const m = parseFloat(thaan.total_meters) || 0;
      const lc = parseFloat(thaan.landing_cost) || 0;
      return acc + (m * lc);
    }, 0);
  };

  const handleSavePurchase = async () => {
    if(!selectedSupplierId) return alert("Please select a supplier at the top.");
    if(!invoiceForm.invoice_no) return alert("Invoice Number is required.");
    
    for(let i=0; i<thaans.length; i++) {
        if(thaans[i].shade_id && thaans[i].shade_id.length > 7) {
            return alert(`Row ${i+1}: Shade ID max 7 chars.`);
        }
    }

    const totalAmount = calculateInvoiceTotal();

    try {
      // 1. Create Ledger Entry for the Invoice
      const ledgerRes = await fetch('/api/supplier_ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedSupplierId,
          invoice_no: invoiceForm.invoice_no,
          transaction_type: 'Cr_Purchase',
          amount: totalAmount,
          payment_mode: 'Credit',
          reference_no: invoiceForm.invoice_no
        })
      });
      const ledgerData = await ledgerRes.json();
      if(ledgerData.error) throw new Error(ledgerData.error);

      // 1.5. Log Advance Payment if provided
      const advAmount = parseFloat(invoiceForm.advance_amount) || 0;
      if (advAmount > 0) {
        const advRes = await fetch('/api/supplier_ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplier_id: selectedSupplierId,
            invoice_no: '',
            transaction_type: 'Dr_Payment',
            amount: advAmount,
            payment_mode: invoiceForm.payment_mode,
            reference_no: `ADV-${invoiceForm.invoice_no}`
          })
        });
        const advData = await advRes.json();
        if(advData.error) throw new Error(advData.error);
      }

      // 2. Save all Thaans
      for(const thaan of thaans) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku_takano: thaan.sku_takano,
            article_name: thaan.article_name,
            shade_id: thaan.shade_id,
            total_meters: thaan.total_meters,
            purchase_rate: thaan.purchase_rate,
            gst_percentage: thaan.gst_percentage,
            selling_price: parseFloat(thaan.landing_cost) * 1.5, // Auto-set 50% margin default
            shade_image: thaan.shade_image,
            supplier_id: selectedSupplierId,
            invoice_no: invoiceForm.invoice_no
          })
        });
      }

      alert('Purchase Invoice Recorded Successfully!');
      setInvoiceForm({ invoice_no: '', date: new Date().toISOString().split('T')[0], advance_amount: '', payment_mode: 'Cash' });
      setThaans([{ sku_takano: '', article_name: '', shade_id: '', total_meters: '', purchase_rate: '', gst_percentage: '5', shade_image: null, landing_cost: 0 }]);
      setView('STATEMENT');
      fetchLedger(selectedSupplierId);

    } catch(err) {
      alert("Error saving purchase: " + err.message);
    }
  };

  // ----------------------------------------------------
  // Statement View Logic
  // ----------------------------------------------------
  let totalPurchased = 0;
  let totalPaid = 0;
  let netOutstanding = 0;

  if (selectedSupplierId) {
    const s = suppliers.find(x => x.id == selectedSupplierId);
    const opening = s ? s.opening_balance : 0;
    
    totalPurchased = ledger.filter(l => l.transaction_type === 'Cr_Purchase').reduce((a,b) => a + b.amount, 0);
    totalPaid = ledger.filter(l => l.transaction_type === 'Dr_Payment').reduce((a,b) => a + b.amount, 0);
    netOutstanding = (opening + totalPurchased) - totalPaid;
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if(!selectedSupplierId) return;

    const res = await fetch('/api/supplier_ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: selectedSupplierId,
        invoice_no: '',
        transaction_type: 'Dr_Payment',
        amount: parseFloat(paymentForm.amount),
        payment_mode: paymentForm.mode,
        reference_no: `PAY-${Date.now().toString().slice(-6)}`
      })
    });
    const data = await res.json();
    if(!data.error) {
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'Bank' });
      fetchLedger(selectedSupplierId);
    }
  };

  const openInvoiceDetails = async (invoice_no) => {
    setSelectedInvoice(invoice_no);
    const res = await fetch(`/api/products/invoice/${invoice_no}`);
    const data = await res.json();
    setInvoiceThaans(data);
    setShowInvoiceModal(true);
  };


  return (
    <div>
      <div className={!isMobile ? "flex justify-between items-end mb-6" : "flex flex-col gap-4 mb-6"}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.8rem' : '2.5rem' }}>Supplier Operations</h1>
          <p className="subtext" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>Manage purchases, ledgers, and textile stock entries.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            className={`btn-secondary flex-1 ${view === 'STATEMENT' ? 'active' : ''}`}
            style={{ ...(view === 'STATEMENT' ? { borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' } : {}), padding: isMobile ? '0.6rem' : '' }}
            onClick={() => setView('STATEMENT')}
          >
            Statement
          </button>
          <button 
            className={`btn-secondary flex-1 ${view === 'PURCHASE' ? 'active' : ''}`}
            style={{ ...(view === 'PURCHASE' ? { borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' } : {}), padding: isMobile ? '0.6rem' : '' }}
            onClick={() => setView('PURCHASE')}
          >
            + Purchase
          </button>
        </div>
      </div>
      
      {/* Universal Supplier Selector */}
      <div className={`card mb-6 flex ${isMobile ? 'flex-col' : 'items-center'} gap-4 shadow-lg`} style={{ border: '1px solid var(--accent-gold)', padding: isMobile ? '1rem' : '1.5rem' }}>
        <div className="form-group mb-0 flex-1 w-full">
          <label className="form-label" style={{ color: 'var(--accent-gold)', fontSize: isMobile ? '0.85rem' : '1rem' }}>Active Supplier Profile</label>
          <input 
            list="suppliers-list"
            value={supplierSearchText}
            onChange={handleSupplierSearchChange}
            placeholder="-- Search or Select Supplier Account --"
            className="w-full"
            style={{ backgroundColor: 'var(--bg-color)', padding: '0.6rem 1rem', fontSize: isMobile ? '0.9rem' : '1rem' }}
          />
          <datalist id="suppliers-list">
            {suppliers.map(s => <option key={s.id} value={`${s.name} (GST: ${s.gstin || 'N/A'})`} />)}
          </datalist>
        </div>
        <div className={`flex gap-2 w-full ${!isMobile ? 'mt-4 w-auto' : ''}`}>
          <button className="btn-secondary flex-1 justify-center flex items-center" onClick={() => setShowNewSupplierModal(true)} style={{ padding: isMobile ? '0.6rem' : '' }}>
            <Plus size={16} style={{marginRight:'4px'}}/> New
          </button>
          <button 
            className={`btn-secondary flex-1 justify-center flex items-center ${filterDena ? 'active' : ''}`} 
            style={{ ...(filterDena ? { borderColor: 'var(--danger)', color: 'var(--danger)', backgroundColor: 'rgba(244,63,94,0.1)' } : {}), padding: isMobile ? '0.6rem' : '' }}
            onClick={() => setFilterDena(!filterDena)}
          >
            <Filter size={16} style={{marginRight:'4px'}}/> Payables
          </button>
        </div>
      </div>

      {!selectedSupplierId && filterDena && (
        <div className="card mb-6 shadow-lg" style={{ borderTop: '4px solid var(--danger)' }}>
          <h3 className="mb-4 text-[var(--danger)] flex items-center gap-2"><TrendingDown size={20} /> Suppliers with Pending Payables</h3>
          <div className="grid grid-cols-3 gap-4">
             {suppliers.filter(s => parseFloat(s.net_outstanding || 0) > 0).map(s => (
                 <button key={s.id} className="btn-secondary flex flex-col items-start p-4" onClick={() => {
                      setSupplierSearchText(`${s.name} (GST: ${s.gstin || 'N/A'})`);
                      setSelectedSupplierId(s.id);
                      fetchLedger(s.id);
                 }}>
                     <span className="font-bold">{s.name}</span>
                     <span className="text-[var(--danger)] text-sm">Owe: ₹{parseFloat(s.net_outstanding || 0).toLocaleString()}</span>
                 </button>
             ))}
             {suppliers.filter(s => parseFloat(s.net_outstanding || 0) > 0).length === 0 && (
                <p className="subtext p-4">You do not owe money to any suppliers.</p>
             )}
          </div>
        </div>
      )}

      {!selectedSupplierId && !filterDena && (
        <div className="card text-center" style={{ padding: isMobile ? '2rem 1rem' : '4rem 2rem', borderStyle: 'dashed' }}>
          <Store size={isMobile ? 32 : 48} style={{ margin: '0 auto 1rem auto', color: 'var(--border-color)' }} />
          <h3 className="subtext" style={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }}>Please select a supplier from the dropdown above to view their statement or add a purchase.</h3>
        </div>
      )}

      {/* ============================================================================================== */}
      {/* VIEW 1: NEW PURCHASE FORM */}
      {/* ============================================================================================== */}
      {selectedSupplierId && view === 'PURCHASE' && (
        <div className="card shadow-lg">
          <h2 className="mb-6 flex items-center gap-2"><FileText size={20} color="var(--accent-gold)" /> Enter Purchase Invoice</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-8 p-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '12px' }}>
             <div className="form-group mb-0">
               <label className="form-label">Invoice Number</label>
               <input type="text" placeholder="e.g. INV-1002" required value={invoiceForm.invoice_no} onChange={e=>setInvoiceForm({...invoiceForm, invoice_no: e.target.value})} className="w-full" />
             </div>
             <div className="form-group mb-0">
               <label className="form-label">Invoice Date</label>
               <input type="date" required value={invoiceForm.date} onChange={e=>setInvoiceForm({...invoiceForm, date: e.target.value})} className="w-full" />
             </div>
             <div className="form-group mb-0 flex flex-col justify-center">
               <label className="form-label">Calculated Invoice Total</label>
               <h2 style={{ margin: 0, color: 'var(--accent-gold)' }}>₹{calculateInvoiceTotal().toFixed(2)}</h2>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8 p-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '12px', marginTop: '-1rem' }}>
             <div className="form-group mb-0">
               <label className="form-label">On-Spot Advance Paid (₹)</label>
               <input type="number" placeholder="0.00" value={invoiceForm.advance_amount} onChange={e=>setInvoiceForm({...invoiceForm, advance_amount: e.target.value})} className="w-full" style={{ color: 'var(--success)', fontWeight: 'bold' }} />
             </div>
             <div className="form-group mb-0">
               <label className="form-label">Payment Mode</label>
               <select value={invoiceForm.payment_mode} onChange={e=>setInvoiceForm({...invoiceForm, payment_mode: e.target.value})} className="w-full">
                 <option value="Cash">Cash</option>
                 <option value="Bank">Bank Transfer / UPI</option>
                 <option value="Cheque">Cheque</option>
               </select>
             </div>
             <div className="form-group mb-0 flex flex-col justify-center">
               <label className="form-label">Net Credit Added To Ledger</label>
               <h2 style={{ margin: 0, color: 'var(--danger)' }}>₹{Math.max(0, calculateInvoiceTotal() - (parseFloat(invoiceForm.advance_amount) || 0)).toFixed(2)}</h2>
             </div>
          </div>

          <h3 className="mb-4">Thaan Entry</h3>
          
          <div className="table-wrapper mb-6">
            <table style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Takano/SKU</th>
                  <th style={{ width: '150px' }}>Article Name</th>
                  <th style={{ width: '100px' }}>Shade ID</th>
                  <th style={{ width: '90px' }}>Meters</th>
                  <th style={{ width: '110px' }}>Price/Mtr</th>
                  <th style={{ width: '80px' }}>GST %</th>
                  <th style={{ width: '130px' }}>Landing Cost</th>
                  <th style={{ width: '120px' }}>Shade Photo</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {thaans.map((thaan, i) => (
                  <tr key={i}>
                    <td><input type="text" placeholder="SKU" value={thaan.sku_takano} onChange={e=>handleThaanChange(i, 'sku_takano', e.target.value)} className="w-full" style={{ padding: '0.4rem', fontSize: '0.8rem' }} /></td>
                    <td><input type="text" placeholder="e.g. GOLDEE TR" value={thaan.article_name} onChange={e=>handleThaanChange(i, 'article_name', e.target.value)} className="w-full" style={{ padding: '0.4rem', fontSize: '0.8rem' }} /></td>
                    <td><input type="text" placeholder="ID" maxLength="7" value={thaan.shade_id} onChange={e=>handleThaanChange(i, 'shade_id', e.target.value)} className="w-full" style={{ padding: '0.4rem', fontSize: '0.8rem' }} /></td>
                    <td><input type="number" placeholder="0.0" step="0.1" value={thaan.total_meters} onChange={e=>handleThaanChange(i, 'total_meters', e.target.value)} className="w-full" style={{ padding: '0.4rem', fontSize: '0.8rem' }} /></td>
                    <td><input type="number" placeholder="₹" value={thaan.purchase_rate} onChange={e=>handleThaanChange(i, 'purchase_rate', e.target.value)} className="w-full" style={{ padding: '0.4rem', fontSize: '0.8rem' }} /></td>
                    <td>
                      <select value={thaan.gst_percentage} onChange={e=>handleThaanChange(i, 'gst_percentage', e.target.value)} className="w-full" style={{ padding: '0.4rem', fontSize: '0.8rem' }}>
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ padding: '0.4rem', backgroundColor: 'var(--surface-color)', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                        ₹{thaan.landing_cost.toFixed(2)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: 'var(--surface-color)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                           <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(i, e)} />
                           <ImageIcon size={16} />
                        </label>
                        {thaan.shade_image && (
                          <img src={thaan.shade_image} alt="shade" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--accent-gold)' }} />
                        )}
                      </div>
                    </td>
                    <td>
                      {thaans.length > 1 && (
                        <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveThaan(i)}><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <button className="btn-secondary flex items-center gap-2" onClick={handleAddThaan}>
              <Plus size={16} /> Add Thaan Row
            </button>
            <button className="btn-primary flex items-center gap-2" style={{ padding: '0.75rem 2rem' }} onClick={handleSavePurchase}>
              <CheckCircle size={18} /> Save Complete Purchase Invoice
            </button>
          </div>

        </div>
      )}

      {/* ============================================================================================== */}
      {/* VIEW 2: SUPPLIER STATEMENT UI */}
      {/* ============================================================================================== */}
      {selectedSupplierId && view === 'STATEMENT' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="card flex items-center justify-between" style={{ borderTop: '4px solid var(--accent-gold)' }}>
              <div>
                <p className="form-label">Total Purchased (Cr)</p>
                <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--accent-gold)' }}>₹{totalPurchased.toFixed(2)}</h2>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--accent-gold-dim)', borderRadius: '12px', color: 'var(--accent-gold)' }}><ArrowRightLeft size={24} /></div>
            </div>
            
            <div className="card flex items-center justify-between" style={{ borderTop: '4px solid var(--success)' }}>
              <div>
                <p className="form-label">Total Paid (Dr)</p>
                <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--success)' }}>₹{totalPaid.toFixed(2)}</h2>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(46, 160, 67, 0.1)', borderRadius: '12px', color: 'var(--success)' }}><Banknote size={24} /></div>
            </div>

            <div className="card flex items-center justify-between" style={{ borderTop: netOutstanding > 0 ? '4px solid var(--danger)' : '4px solid var(--border-color)', animation: netOutstanding > 0 ? 'pulse 2s infinite' : 'none' }}>
              <div>
                <p className="form-label">Net Owed Balance</p>
                <h2 style={{ fontSize: '2rem', margin: 0, color: netOutstanding > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>₹{netOutstanding.toFixed(2)}</h2>
              </div>
              <div style={{ padding: '1rem', backgroundColor: netOutstanding > 0 ? 'rgba(248, 81, 73, 0.1)' : 'var(--surface-light)', borderRadius: '12px', color: netOutstanding > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}><TrendingDown size={24} /></div>
            </div>
          </div>

          <div className="card">
             <div className="flex justify-between items-center mb-6">
                <h2 style={{ margin: 0 }}>Ledger Timeline History</h2>
                <button className="btn-secondary" style={{ borderColor: 'var(--success)', color: 'var(--success)', backgroundColor: 'rgba(46, 160, 67, 0.1)' }} onClick={() => setShowPaymentModal(true)}>
                  Record Payment (Dr)
                </button>
             </div>

             <div className="table-wrapper" style={{ maxHeight: '500px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction details</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map(l => (
                      <tr key={l.id} 
                          onClick={() => l.transaction_type === 'Cr_Purchase' ? openInvoiceDetails(l.invoice_no || l.reference_no) : null}
                          style={{ cursor: l.transaction_type === 'Cr_Purchase' ? 'pointer' : 'default' }}
                          className={l.transaction_type === 'Cr_Purchase' ? 'hover-row' : ''}
                      >
                        <td>{new Date(l.created_at).toLocaleDateString()}</td>
                        <td>
                          {l.transaction_type === 'Cr_Purchase' ? (
                            <span style={{ fontWeight: '500' }}>Purchase Invoice: <span style={{ color: 'var(--accent-gold)' }}>{l.invoice_no || l.reference_no}</span></span>
                          ) : (
                            <span>Payment Reference: {l.reference_no} ({l.payment_mode})</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${l.transaction_type === 'Cr_Purchase' ? 'badge-danger' : 'badge-success'}`}>
                            {l.transaction_type === 'Cr_Purchase' ? '+ Cr' : '- Dr'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: l.transaction_type === 'Cr_Purchase' ? 'var(--danger)' : 'var(--success)' }}>
                          ₹{l.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {ledger.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }} className="subtext">No transactions recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </>
      )}

      {/* ============================================================================================== */}
      {/* MODALS */}
      {/* ============================================================================================== */}
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card shadow-lg" style={{ width: '400px', position: 'relative' }}>
            <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowPaymentModal(false)}>
              <X size={20} />
            </button>
            <h2 className="mb-6">Record Payment</h2>
            
            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label className="form-label">Payment Amount (₹)</label>
                <input type="number" required value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full" style={{ fontSize: '1.5rem', padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" required value={paymentForm.date} onChange={e=>setPaymentForm({...paymentForm, date: e.target.value})} className="w-full" />
              </div>
              <div className="form-group mb-6">
                <label className="form-label">Payment Mode</label>
                <select value={paymentForm.mode} onChange={e=>setPaymentForm({...paymentForm, mode: e.target.value})} className="w-full">
                  <option value="Bank">Bank Transfer / UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full" style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>Confirm Payment</button>
            </form>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplierModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card shadow-lg" style={{ width: '500px', position: 'relative' }}>
            <button type="button" className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowNewSupplierModal(false)}>
              <X size={20} />
            </button>
            <h2 className="mb-6">Add New Supplier</h2>
            
            <form onSubmit={handleSaveNewSupplier}>
              <div className="form-group">
                <label className="form-label">Supplier/Business Name *</label>
                <input type="text" required value={newSupplierForm.name} onChange={e=>setNewSupplierForm({...newSupplierForm, name: e.target.value})} className="w-full" placeholder="e.g. OCM FAB TEX" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-group mb-0">
                  <label className="form-label">Contact / Mobile No.</label>
                  <input type="text" value={newSupplierForm.mobile} onChange={e=>setNewSupplierForm({...newSupplierForm, mobile: e.target.value})} className="w-full" placeholder="Phone Number" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">GST No. / Udyam</label>
                  <input type="text" value={newSupplierForm.gstin} onChange={e=>setNewSupplierForm({...newSupplierForm, gstin: e.target.value})} className="w-full" placeholder="GSTIN / Udyam" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea rows="2" value={newSupplierForm.address} onChange={e=>setNewSupplierForm({...newSupplierForm, address: e.target.value})} className="w-full" placeholder="Full Address"></textarea>
              </div>
              <div className="form-group mb-6">
                <label className="form-label">Opening Balance (Cr)</label>
                <input type="number" value={newSupplierForm.opening_balance} onChange={e=>setNewSupplierForm({...newSupplierForm, opening_balance: e.target.value})} className="w-full" placeholder="Previous Dues (if any)" />
              </div>
              <button type="submit" className="btn-primary w-full">Save Supplier</button>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {showInvoiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card shadow-lg" style={{ width: '800px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowInvoiceModal(false)}>
              <X size={20} />
            </button>
            <h2 className="mb-2">Invoice: <span style={{ color: 'var(--accent-gold)' }}>{selectedInvoice}</span></h2>
            <p className="subtext mb-6">Details of all Thaans purchased in this bill.</p>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Takano / SKU</th>
                    <th>Article Name</th>
                    <th>Shade</th>
                    <th>Meters</th>
                    <th>Landing Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceThaans.map(t => (
                    <tr key={t.id}>
                      <td>
                        {t.shade_image ? (
                           <img src={t.shade_image} alt="shade" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        ) : (
                           <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--surface-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <ImageIcon size={16} color="var(--text-secondary)" />
                           </div>
                        )}
                      </td>
                      <td style={{ fontWeight: '500' }}>{t.sku_takano || 'N/A'}</td>
                      <td>{t.article_name || 'N/A'}</td>
                      <td><span className="badge">{t.shade_id}</span></td>
                      <td>{t.total_meters} m</td>
                      <td style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₹{t.landing_cost.toFixed(2)}/m</td>
                    </tr>
                  ))}
                  {invoiceThaans.length === 0 && (
                    <tr><td colSpan="5" className="text-center p-4 subtext">No Thaan records found for this invoice.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="btn-secondary" onClick={() => setShowInvoiceModal(false)}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for hover-row added here for simplicity, though best placed in index.css */}
      <style>{`
        .hover-row:hover {
          background-color: rgba(197, 160, 89, 0.05);
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(248, 81, 73, 0); }
          100% { box-shadow: 0 0 0 0 rgba(248, 81, 73, 0); }
        }
      `}</style>
    </div>
  );
};

export default SupplierLedger;
