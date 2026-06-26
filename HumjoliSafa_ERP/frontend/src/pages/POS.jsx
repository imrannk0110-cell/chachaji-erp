import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { FileText, Plus, IndianRupee } from 'lucide-react';

const POS = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [managers, setManagers] = useState([]);
  const [settings, setSettings] = useState({});
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [gstApplied, setGstApplied] = useState(false);
  const [advancePaid, setAdvancePaid] = useState(0);

  const [items, setItems] = useState([
    { productId: '', type: 'Pant', fabricMeters: 1.2, flatDiscount: 0, stitchingOverride: 0 }
  ]);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/customers').then(res => res.json()),
      fetch('http://localhost:5000/api/products').then(res => res.json()),
      fetch('http://localhost:5000/api/managers').then(res => res.json()),
      fetch('http://localhost:5000/api/settings').then(res => res.json())
    ]).then(([custs, prods, mgrs, sets]) => {
      setCustomers(custs); setProducts(prods); setManagers(mgrs);
      
      if(sets.stitching_rates) {
        setSettings(JSON.parse(sets.stitching_rates));
      }
    }).catch(console.error);
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', type: 'Pant', fabricMeters: 1.2, flatDiscount: 0, stitchingOverride: 0 }]);
  };

  // Math Profit Engine
  let subTotal = 0;
  let costBasisTotal = 0;
  let totalDiscounts = 0;

  items.forEach(item => {
    const product = products.find(p => p.id == item.productId);
    const fabricPrice = product ? (product.selling_price * item.fabricMeters) : 0;
    const fabricCost = product ? (product.landing_cost * item.fabricMeters) : 0;
    
    const defaultStitchCost = settings[item.type] || 0;
    const stitchPrice = item.stitchingOverride > 0 ? parseFloat(item.stitchingOverride) : defaultStitchCost;
    
    // Revenue side
    const itemTotal = (fabricPrice + stitchPrice) - parseFloat(item.flatDiscount || 0);
    subTotal += itemTotal;
    totalDiscounts += parseFloat(item.flatDiscount || 0);

    // Cost side
    costBasisTotal += (fabricCost + defaultStitchCost);
  });

  const grandTotal = gstApplied ? subTotal + (subTotal * 0.05) : subTotal; // Assuming 5% apparel GST
  const balanceDue = grandTotal - advancePaid;
  const netProfit = grandTotal - costBasisTotal;

  const generatePDF = (orderId) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id == selectedCustomerId);

    doc.setFontSize(22);
    doc.text("HUMJOLI SAFA", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("Mens Clothing, Tailoring & Safa Boutique", 105, 26, { align: "center" });
    
    doc.line(20, 30, 190, 30);
    
    doc.setFontSize(12);
    doc.text(`Order ID: ${orderId}`, 20, 40);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 40);
    
    doc.text(`Customer: ${customer ? customer.name : 'Walk-in'}`, 20, 50);
    doc.text(`Phone: ${customer ? customer.phone : 'N/A'}`, 20, 56);

    doc.line(20, 62, 190, 62);
    
    doc.setFontSize(10);
    doc.text("Item", 20, 70);
    doc.text("Fabric Price", 80, 70);
    doc.text("Stitch Cost", 120, 70);
    doc.text("Total", 170, 70);
    
    doc.line(20, 72, 190, 72);

    let y = 80;
    items.forEach((item) => {
      const product = products.find(p => p.id == item.productId);
      const fabricPrice = product ? (product.selling_price * item.fabricMeters) : 0;
      const stitchPrice = item.stitchingOverride || settings[item.type] || 0;
      const itemTot = fabricPrice + parseFloat(stitchPrice) - parseFloat(item.flatDiscount || 0);
      
      doc.text(`${item.type} (SKU: ${product ? product.sku_takano : 'N/A'})`, 20, y);
      doc.text(`Rs. ${fabricPrice.toFixed(2)}`, 80, y);
      doc.text(`Rs. ${parseFloat(stitchPrice).toFixed(2)}`, 120, y);
      doc.text(`Rs. ${itemTot.toFixed(2)}`, 170, y);
      y += 10;
    });

    doc.line(20, y, 190, y);
    y += 10;

    doc.text(`Sub Total: Rs. ${subTotal.toFixed(2)}`, 140, y);
    if(gstApplied) {
      y += 6;
      doc.text(`GST (5%): Rs. ${(subTotal * 0.05).toFixed(2)}`, 140, y);
    }
    y += 10;
    doc.setFontSize(14);
    doc.text(`Grand Total: Rs. ${grandTotal.toFixed(2)}`, 130, y);
    doc.setFontSize(10);
    y += 8;
    doc.text(`Advance Paid: Rs. ${advancePaid.toFixed(2)}`, 140, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Balance Due: Rs. ${balanceDue.toFixed(2)}`, 135, y);

    doc.save(`Humjoli_Invoice_${orderId}.pdf`);
  };

  const handleCheckout = async () => {
    if(!selectedCustomerId || !selectedManagerId) return alert('Select Customer and Manager');
    
    const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
    
    const res = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId,
        customer_id: selectedCustomerId,
        manager_id: selectedManagerId,
        items_json: items,
        measurements_json: {}, // Assuming fetched from CRM state in full build
        sub_total: subTotal,
        discount_amount: totalDiscounts,
        grand_total: grandTotal,
        advance_paid: advancePaid,
        balance_due: balanceDue,
        cost_basis_total: costBasisTotal,
        net_profit: netProfit,
        status: 'Booked',
        gst_applied: gstApplied,
        booked_date: new Date().toISOString(),
        handover_target_date: new Date(Date.now() + 86400000 * 2).toISOString(), // +2 days default
        delivery_date: new Date(Date.now() + 86400000 * 7).toISOString() // +7 days default
      })
    });
    
    const data = await res.json();
    if(!data.error) {
      alert(`Order Booked! Net Profit Margin Tracked: ₹${netProfit.toFixed(2)}`);
      generatePDF(orderId);
      // reset
      setItems([{ productId: '', type: 'Pant', fabricMeters: 1.2, flatDiscount: 0, stitchingOverride: 0 }]);
      setAdvancePaid(0);
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      
      {/* Build Invoice */}
      <div className="card">
        <h2 className="mb-4">POS Checkout Details</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <select value={selectedCustomerId} onChange={e=>setSelectedCustomerId(e.target.value)} className="w-full">
            <option value="">-- Select Customer --</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
          </select>

          <select value={selectedManagerId} onChange={e=>setSelectedManagerId(e.target.value)} className="w-full">
            <option value="">-- Assign Manager/Workshop --</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name} - W{m.workshop_number}</option>)}
          </select>
        </div>

        <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />

        {items.map((item, index) => (
          <div key={index} className="mb-4 p-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
            <div className="flex justify-between items-center mb-2">
              <h4 style={{ margin: 0 }}>Item {index + 1}</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select value={item.type} onChange={e=>handleItemChange(index, 'type', e.target.value)}>
                <option value="Pant">Pant</option>
                <option value="Shirt">Shirt</option>
                <option value="Kurta">Kurta</option>
                <option value="Coat">Coat</option>
                <option value="Safa">Safa</option>
              </select>
              <select value={item.productId} onChange={e=>handleItemChange(index, 'productId', e.target.value)}>
                <option value="">-- Select Fabric SKU --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku_takano} (₹{p.selling_price}/m)</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="Meters" step="0.1" value={item.fabricMeters} onChange={e=>handleItemChange(index, 'fabricMeters', parseFloat(e.target.value))} />
              <input type="number" placeholder="Flat Disct." value={item.flatDiscount} onChange={e=>handleItemChange(index, 'flatDiscount', parseFloat(e.target.value))} />
              <input type="number" placeholder="Stitch Override (Opt)" value={item.stitchingOverride} onChange={e=>handleItemChange(index, 'stitchingOverride', parseFloat(e.target.value))} />
            </div>
          </div>
        ))}
        
        <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={addItem}>
          <Plus size={18} /> Add Another Item
        </button>

      </div>

      {/* Math Profit Engine Panel */}
      <div className="card h-full flex flex-col justify-between">
        <div>
          <h2 className="mb-4">Mathematical Profit Engine</h2>
          
          <div className="flex justify-between items-center p-3 mb-2" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
            <span>Sub Total:</span>
            <span style={{ fontSize: '1.2rem' }}>₹{subTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center p-3 mb-2" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              Apply Global GST (5%)
              <input 
                type="checkbox" 
                checked={gstApplied} 
                onChange={e => setGstApplied(e.target.checked)} 
                style={{ width: '20px', height: '20px' }}
              />
            </span>
            <span style={{ fontSize: '1.2rem' }}>{gstApplied ? `₹${(subTotal * 0.05).toFixed(2)}` : '₹0.00'}</span>
          </div>

          <div className="flex justify-between items-center p-3 mb-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px', color: 'var(--accent-gold)' }}>
            <span style={{ fontWeight: 'bold' }}>Grand Total Revenue:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center p-3 mb-2">
            <span>Advance Received (₹):</span>
            <input 
              type="number" 
              value={advancePaid} 
              onChange={e => setAdvancePaid(parseFloat(e.target.value) || 0)}
              style={{ width: '150px', textAlign: 'right' }}
            />
          </div>

          <div className="flex justify-between items-center p-3 mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>Balance Due:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{balanceDue.toFixed(2)}</span>
          </div>
          
          <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />

          <div className="flex justify-between items-center p-3" style={{ border: '1px solid var(--success)', color: 'var(--success)', borderRadius: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Projected Net Profit Margin:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>₹{netProfit.toFixed(2)}</span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
            *Calculated dynamically by subtracting in-house fabric landing cost and stitching costs from Grand Total.
          </p>

        </div>

        <button className="btn-primary w-full mt-6 flex items-center justify-center gap-2" style={{ padding: '1rem' }} onClick={handleCheckout}>
          <FileText size={20} />
          Confirm Order & Generate PDF Receipt
        </button>
      </div>

    </div>
  );
};

export default POS;
