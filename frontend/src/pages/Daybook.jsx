import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, X, List } from 'lucide-react';

const Daybook = () => {
  const [transactions, setTransactions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Expense_Shop',
    category: '',
    category_custom: '',
    supplier_id: '',
    amount: '',
    description: ''
  });

  const categories = {
      'Expense_Shop': ['Tea/Snacks', 'Electricity', 'Petrol/Travel', 'Salary', 'Misc Expense'],
      'Income_Manual': ['Cash Deposit', 'Misc Income']
  };

  useEffect(() => {
    fetchDaybook();
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        setSuppliers(await res.json());
      }
    } catch(e) {
      console.error(e);
    }
  };

  const fetchDaybook = async () => {
    try {
      const res = await fetch('/api/daybook');
      if (res.ok) {
         let data = await res.json();
         const parseDate = (d) => new Date(d.includes('Z') ? d : d.replace(' ', 'T') + 'Z').getTime();
         data.sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
         setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return alert('Amount required');

    let finalCategory = formData.category;
    if (formData.type !== 'Expense_Supplier') {
       if (!formData.category) return alert('Category required');
       if (formData.category === 'Other') {
           if (!formData.category_custom) return alert('Custom category required');
           finalCategory = formData.category_custom;
       }
    } else {
       if (!formData.supplier_id) return alert('Supplier required');
    }

    try {
      let res;
      if (formData.type === 'Expense_Supplier') {
        res = await fetch('/api/supplier_ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplier_id: formData.supplier_id,
            transaction_type: 'Dr_Payment',
            amount: parseFloat(formData.amount),
            payment_mode: 'Cash',
            reference_no: formData.description || 'Daybook Payment',
            invoice_no: ''
          })
        });
      } else {
        res = await fetch('/api/daybook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              type: formData.type,
              category: finalCategory,
              description: formData.description,
              amount: parseFloat(formData.amount)
          })
        });
      }

      if (!res.ok) {
        const errText = await res.text();
        try { throw new Error(JSON.parse(errText).error); } catch(err) { throw new Error(errText); }
      }
      
      setShowAddModal(false);
      setFormData({ type: 'Expense_Shop', category: '', category_custom: '', supplier_id: '', amount: '', description: '' });
      fetchDaybook();
    } catch (err) {
      alert("Error saving transaction: " + err.message);
    }
  };

  // Calculations
  const totalIncome = transactions.filter(t => t.type.startsWith('Income')).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type.startsWith('Expense')).reduce((sum, t) => sum + t.amount, 0);
  const netGalla = totalIncome - totalExpense;

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1>Daily Daybook</h1>
          <p className="subtext">Track all incoming and outgoing cash flows.</p>
        </div>
        <button className="btn-primary flex items-center justify-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add Shop Expense
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
         <div className="card shadow-lg flex flex-col justify-between" style={{ borderTop: '3px solid var(--accent-gold)' }}>
             <div className="flex items-center gap-3">
                 <Wallet size={24} color="var(--accent-gold)" />
                 <p className="form-label m-0 text-sm">Net Galla (Cash in Hand)</p>
             </div>
             <h2 className="mt-4 mb-0" style={{ fontSize: '2.2rem', color: 'var(--accent-gold)' }}>₹{netGalla.toLocaleString()}</h2>
         </div>

         <div className="card shadow-lg flex flex-col justify-between">
             <div className="flex items-center gap-3">
                 <TrendingUp size={24} color="var(--success)" />
                 <p className="form-label m-0 text-sm">Total Income</p>
             </div>
             <h2 className="mt-4 mb-0 text-[var(--success)]" style={{ fontSize: '1.8rem' }}>₹{totalIncome.toLocaleString()}</h2>
         </div>

         <div className="card shadow-lg flex flex-col justify-between">
             <div className="flex items-center gap-3">
                 <TrendingDown size={24} color="var(--danger)" />
                 <p className="form-label m-0 text-sm">Total Expenses</p>
             </div>
             <h2 className="mt-4 mb-0 text-[var(--danger)]" style={{ fontSize: '1.8rem' }}>₹{totalExpense.toLocaleString()}</h2>
         </div>
      </div>

      <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <List size={20} color="var(--accent-gold)" />
              <h3 className="m-0">Running Cash Log</h3>
          </div>

          <div className="flex flex-col gap-3">
             {transactions.length === 0 && <p className="subtext text-center py-8">No transactions logged yet.</p>}
             {transactions.map(t => {
                 const isIncome = t.type.startsWith('Income');
                 const date = new Date(t.created_at).toLocaleString();
                 return (
                     <div key={t.id} className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: 'var(--surface-light)', borderLeft: `4px solid ${isIncome ? 'var(--success)' : 'var(--danger)'}` }}>
                         <div className="flex flex-col">
                             <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{t.category}</span>
                             <span className="subtext text-sm">{t.description || t.type}</span>
                             <span className="subtext text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{date}</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isIncome ? 'var(--success)' : 'var(--danger)' }}>
                                 {isIncome ? '+' : '-'} ₹{t.amount.toLocaleString()}
                             </span>
                         </div>
                     </div>
                 )
             })}
          </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card shadow-lg" style={{ width: '450px', position: 'relative' }}>
            <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowAddModal(false)}>
              <X size={24} />
            </button>
            <h2 className="mb-6">Log Manual Transaction</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
               
               <div className="form-group mb-0">
                  <label className="form-label">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value, category: '', supplier_id: ''})} className="w-full">
                      <option value="Expense_Shop">Shop Expense (Outgoing)</option>
                      <option value="Expense_Supplier">Supplier Payment (Outgoing)</option>
                      <option value="Income_Manual">Manual Income (Incoming)</option>
                  </select>
               </div>

               {formData.type === 'Expense_Supplier' ? (
                 <div className="form-group mb-0">
                    <label className="form-label">Select Supplier</label>
                    <select value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})} className="w-full">
                        <option value="">-- Select Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (GST: {s.gstin || 'N/A'})</option>)}
                    </select>
                 </div>
               ) : (
                 <div className="form-group mb-0">
                    <label className="form-label">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full">
                        <option value="">-- Select Category --</option>
                        {categories[formData.type]?.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="Other">Other</option>
                    </select>
                    {formData.category === 'Other' && (
                        <input type="text" placeholder="Enter custom category" className="w-full mt-2" 
                               value={formData.category_custom}
                               onChange={e => setFormData({...formData, category_custom: e.target.value})} />
                    )}
                 </div>
               )}

               <div className="form-group mb-0">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full" />
               </div>

               <div className="form-group mb-0">
                  <label className="form-label">Description / Remarks</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full" placeholder="Optional notes..." />
               </div>

               <button type="submit" className="btn-primary w-full mt-4">Save Transaction</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Daybook;
