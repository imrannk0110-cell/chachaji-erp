import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { FileText, Plus, IndianRupee, CheckCircle, Send, Users, X } from 'lucide-react';

const POS = () => {
  const location = useLocation();
  const crmState = location.state || {};
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [managers, setManagers] = useState([]);
  const [settings, setSettings] = useState({});
  
  const [selectedCustomerId, setSelectedCustomerId] = useState(crmState.customerId || '');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [gstApplied, setGstApplied] = useState(false);
  const [advancePaid, setAdvancePaid] = useState(0);

  // Dates
  const [bookedDate, setBookedDate] = useState(new Date().toISOString().split('T')[0]);
  const [handoverDate, setHandoverDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);

  const [items, setItems] = useState([
    { productId: '', type: 'Pant', fabricMeters: 1.2, flatDiscount: 0, stitchingOverride: 0 }
  ]);

  // Modal State
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(res => res.json()),
      fetch('/api/products').then(res => res.json()),
      fetch('/api/managers').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([custs, prods, mgrs, sets]) => {
      setCustomers(custs); setProducts(prods); setManagers(mgrs);
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
  const selectedManager = managers.find(m => m.id == selectedManagerId);
  const managerStitchingRates = selectedManager && selectedManager.stitching_rates ? JSON.parse(selectedManager.stitching_rates) : {};

  let subTotal = 0;
  let costBasisTotal = 0;
  let totalDiscounts = 0;

  items.forEach(item => {
    const product = products.find(p => p.id == item.productId);
    const fabricPrice = product ? (product.selling_price * item.fabricMeters) : 0;
    const fabricCost = product ? (product.landing_cost * item.fabricMeters) : 0;
    
    const defaultStitchCost = managerStitchingRates[item.type] || 0;
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
    doc.text("HUMJOLI ETHNIC", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("Mens Clothing, Tailoring & Safa Boutique", 105, 26, { align: "center" });
    
    doc.line(20, 30, 190, 30);
    
    doc.setFontSize(12);
    doc.text(`Order ID: ${orderId}`, 20, 40);
    doc.text(`Date: ${bookedDate}`, 140, 40);
    
    doc.text(`Customer: ${customer ? customer.name : 'Walk-in'}`, 20, 50);
    doc.text(`Phone: ${customer ? customer.phone : 'N/A'}`, 20, 56);

    doc.line(20, 62, 190, 62);
    
    doc.setFontSize(10);
    doc.text("Item", 20, 70);
    doc.text("Fabric Base", 65, 70);
    doc.text("Stitch", 95, 70);
    doc.text("Discount", 125, 70);
    doc.text("Net Total", 160, 70);
    
    doc.line(20, 72, 190, 72);

    let y = 80;
    items.forEach((item) => {
      const product = products.find(p => p.id == item.productId);
      const fabricPrice = product ? (product.selling_price * item.fabricMeters) : 0;
      const stitchPrice = item.stitchingOverride || managerStitchingRates[item.type] || 0;
      const discount = parseFloat(item.flatDiscount || 0);
      const itemTot = fabricPrice + parseFloat(stitchPrice) - discount;
      
      doc.text(`${item.type} (${product ? product.sku_takano : 'N/A'})`, 20, y);
      doc.text(`Rs. ${fabricPrice.toFixed(2)}`, 65, y);
      doc.text(`Rs. ${parseFloat(stitchPrice).toFixed(2)}`, 95, y);
      doc.text(`-Rs. ${discount.toFixed(2)}`, 125, y);
      doc.text(`Rs. ${itemTot.toFixed(2)}`, 160, y);
      y += 10;
    });

    doc.line(20, y, 190, y);
    y += 10;

    doc.text(`Sub Total: Rs. ${subTotal.toFixed(2)}`, 130, y);
    if(gstApplied) {
      y += 6;
      doc.text(`Global GST (5%): Rs. ${(subTotal * 0.05).toFixed(2)}`, 130, y);
    }
    y += 10;
    doc.setFontSize(14);
    doc.text(`Grand Total: Rs. ${grandTotal.toFixed(2)}`, 120, y);
    doc.setFontSize(10);
    y += 8;
    doc.text(`Advance Received: Rs. ${advancePaid.toFixed(2)}`, 130, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Final Balance Due: Rs. ${balanceDue.toFixed(2)}`, 120, y);

    doc.save(`Humjoli_Ethnic_Invoice_${orderId}.pdf`);
  };

  const handleCheckout = async () => {
    if(!selectedCustomerId || !selectedManagerId) return alert('Select Customer and Manager');
    
    const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
    
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId,
        customer_id: selectedCustomerId,
        manager_id: selectedManagerId,
        items_json: items,
        measurements_json: crmState.measurements_json || {}, // Forwarded from CRM dialer
        sub_total: subTotal,
        discount_amount: totalDiscounts,
        grand_total: grandTotal,
        advance_paid: advancePaid,
        balance_due: balanceDue,
        cost_basis_total: costBasisTotal,
        net_profit: netProfit,
        status: 'Booked',
        gst_applied: gstApplied,
        booked_date: bookedDate,
        handover_target_date: handoverDate,
        delivery_date: deliveryDate
      })
    });
    
    const data = await res.json();
    if(!data.error) {
      generatePDF(orderId);
      setConfirmedOrder({ orderId, grandTotal, advancePaid, balanceDue, deliveryDate });
      setShowConfirmation(true);
      // reset forms
      setItems([{ productId: '', type: 'Pant', fabricMeters: 1.2, flatDiscount: 0, stitchingOverride: 0 }]);
      setAdvancePaid(0);
    } else {
      alert(data.error);
    }
  };

  // WhatsApp Message Generators
  const sendWhatsAppCustomer = () => {
    const cust = customers.find(c => c.id == selectedCustomerId);
    if(!cust || !cust.phone) return alert("Customer phone not found.");
    
    const msg = `Thank you ${cust.name}! Order ID ${confirmedOrder.orderId} booked at Humjoli Ethnic.\n\nTotal: ₹${confirmedOrder.grandTotal.toFixed(2)}\nAdvance Paid: ₹${confirmedOrder.advancePaid.toFixed(2)}\nBalance Due: ₹${confirmedOrder.balanceDue.toFixed(2)}.\n\nExpected Delivery: ${new Date(confirmedOrder.deliveryDate).toDateString()}.`;
    
    const url = `https://wa.me/91${cust.phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const sendWhatsAppManager = () => {
    const mgr = managers.find(m => m.id == selectedManagerId);
    if(!mgr || !mgr.mobile_number) return alert("Manager phone not found.");

    const itemsText = items.map(i => {
        const p = products.find(p=>p.id==i.productId);
        return `${i.type} (${i.fabricMeters}m of SKU: ${p?p.sku_takano:'N/A'})`;
    }).join(', ');

    // Parse Measurements nicely
    const meas = crmState.measurements_json || {};
    let specsText = "";
    Object.keys(meas).forEach(outfit => {
      specsText += `\n[${outfit}]: `;
      Object.keys(meas[outfit]).forEach(spec => {
        if(meas[outfit][spec]) {
           specsText += `${spec}: ${meas[outfit][spec]} | `;
        }
      });
    });
    if(!specsText) specsText = "No specs provided from CRM.";

    const msg = `New Workshop Order ${confirmedOrder.orderId} Assigned.\n\nMaterial Cut:\n${itemsText}\n\nMeasurement Specifications:${specsText}\n\nComplete handover by: ${new Date(handoverDate).toDateString()}.`;
    
    const url = `https://wa.me/91${mgr.mobile_number}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="grid grid-pos gap-6">
      
      {/* Build Invoice */}
      <div className="card">
        <h2 className="mb-6">Checkout Details</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="form-group mb-0">
            <label className="form-label">Customer Profile</label>
            <select value={selectedCustomerId} onChange={e=>setSelectedCustomerId(e.target.value)} className="w-full">
              <option value="">-- Select Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Assign Manager</label>
            <select value={selectedManagerId} onChange={e=>setSelectedManagerId(e.target.value)} className="w-full">
              <option value="">-- Assign Manager/Workshop --</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name} - W{m.workshop_number}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 p-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
          <div className="form-group mb-0">
            <label className="form-label">Booked Date</label>
            <input type="date" value={bookedDate} onChange={e=>setBookedDate(e.target.value)} className="w-full" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Workshop Handover Target</label>
            <input type="date" value={handoverDate} onChange={e=>setHandoverDate(e.target.value)} className="w-full" style={{ borderColor: 'var(--accent-gold)' }} />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Customer Delivery Date</label>
            <input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} className="w-full" style={{ borderColor: 'var(--success)' }} />
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />

        {items.map((item, index) => (
          <div key={index} className="mb-4 p-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 className="mb-3">Item {index + 1}</h4>
            
            <div className="grid grid-cols-5 gap-3">
              <div className="form-group mb-0">
                <label className="form-label">Type</label>
                <select value={item.type} onChange={e=>handleItemChange(index, 'type', e.target.value)} className="w-full">
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

              <div className="form-group mb-0">
                <label className="form-label">Fabric SKU</label>
                <select value={item.productId} onChange={e=>handleItemChange(index, 'productId', e.target.value)} className="w-full">
                  <option value="">-- Select --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.sku_takano}</option>)}
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Meters</label>
                <input type="number" step="0.1" value={item.fabricMeters} onChange={e=>handleItemChange(index, 'fabricMeters', parseFloat(e.target.value))} className="w-full" />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Discount</label>
                <input type="number" value={item.flatDiscount} onChange={e=>handleItemChange(index, 'flatDiscount', parseFloat(e.target.value))} className="w-full" />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Stitch Cost</label>
                <input type="number" placeholder="Default" value={item.stitchingOverride} onChange={e=>handleItemChange(index, 'stitchingOverride', parseFloat(e.target.value))} className="w-full" />
              </div>
            </div>
          </div>
        ))}
        
        <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={addItem}>
          <Plus size={18} /> Add Another Item
        </button>

      </div>

      {/* Math Profit Engine Panel */}
      <div className="card h-full flex flex-col justify-between" style={{ backgroundColor: '#0f141a' }}>
        <div>
          <h2 className="mb-6">Order Summary</h2>
          
          <div className="flex justify-between items-center py-2 mb-2" style={{ borderBottom: '1px dashed var(--border-color)' }}>
            <span className="subtext">Sub Total</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>₹{subTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-2 mb-4" style={{ borderBottom: '1px dashed var(--border-color)' }}>
            <span className="subtext flex items-center gap-2">
              Apply Global GST (5%)
              <input 
                type="checkbox" 
                checked={gstApplied} 
                onChange={e => setGstApplied(e.target.checked)} 
              />
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{gstApplied ? `+ ₹${(subTotal * 0.05).toFixed(2)}` : '₹0.00'}</span>
          </div>

          <div className="flex justify-between items-center p-4 mb-6" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--accent-gold)' }}>
            <span style={{ fontWeight: '600', color: 'var(--accent-gold)' }}>Grand Total</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>₹{grandTotal.toFixed(2)}</span>
          </div>

          <div className="form-group">
            <label className="form-label">Advance Received (₹)</label>
            <input 
              type="number" 
              value={advancePaid} 
              onChange={e => setAdvancePaid(parseFloat(e.target.value) || 0)}
              style={{ fontSize: '1.25rem', padding: '0.75rem', fontWeight: '600' }}
            />
          </div>

          <div className="flex justify-between items-center p-4 mb-4" style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)', borderRadius: '8px' }}>
            <span style={{ fontWeight: '600', color: 'var(--danger)' }}>Balance Due</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>₹{balanceDue.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center p-3 mt-4" style={{ border: '1px dashed var(--success)', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Projected Net Profit:</span>
            <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--success)' }}>₹{netProfit.toFixed(2)}</span>
          </div>

        </div>

        <button className="btn-primary w-full mt-6 flex items-center justify-center gap-2" style={{ padding: '1.2rem', fontSize: '1.1rem' }} onClick={handleCheckout}>
          <FileText size={20} /> Confirm Order
        </button>
      </div>

      {/* SUCCESS MODAL WITH WHATSAPP INTEGRATION */}
      {showConfirmation && confirmedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card shadow-lg" style={{ width: '600px', textAlign: 'center', padding: '3rem 2rem', position: 'relative' }}>
            <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowConfirmation(false)}>
              <X size={24} />
            </button>
            
            <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h2 className="mb-2">Order Successfully Booked!</h2>
            <p className="subtext mb-6">Order ID: <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{confirmedOrder.orderId}</span></p>

            <div className="flex gap-4 justify-center mt-8">
              <button 
                className="btn-secondary flex items-center justify-center gap-2 flex-1" 
                style={{ padding: '1rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                onClick={sendWhatsAppCustomer}
              >
                <Users size={20} />
                Send Invoice to Customer
              </button>
              
              <button 
                className="btn-primary flex items-center justify-center gap-2 flex-1" 
                style={{ padding: '1rem', backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff' }}
                onClick={sendWhatsAppManager}
              >
                <Send size={20} />
                Send Specs to Manager
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default POS;
