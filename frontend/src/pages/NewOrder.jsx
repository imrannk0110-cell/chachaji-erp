import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Phone, UserPlus, Scissors, Plus, FileText, CheckCircle, Send, Users, X, ChevronRight } from 'lucide-react';

const NewOrder = () => {
  // 1. CRM STATE
  const [customers, setCustomers] = useState([]);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', faith_tag: 'General', dob: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Measurement State (Modal)
  const [activeCategory, setActiveCategory] = useState('Pant');
  const [currentOutfitFields, setCurrentOutfitFields] = useState({
    Pant: { 'लम्बाई': '', 'कमर': '', 'हिप': '', 'जांघ': '', 'मोहरी': '' },
    Shirt: { 'लम्बाई': '', 'छाती': '', 'पेट': '', 'कंधा': '', 'आस्तीन': '', 'गला': '' },
    Kurta: { 'लम्बाई': '', 'छाती': '', 'पेट': '', 'कंधा': '', 'आस्तीन': '', 'गला': '' },
    Pajama: { 'लम्बाई': '', 'कमर': '', 'हिप': '', 'जांघ': '', 'मोहरी': '' },
    Sherwani: { 'लम्बाई': '', 'छाती': '', 'पेट': '', 'हिप': '', 'कंधा': '', 'आस्तीन': '', 'गला': '' },
    Coat: { 'लम्बाई': '', 'छाती': '', 'पेट': '', 'हिप': '', 'कंधा': '', 'आस्तीन': '' },
    'Nehru Jacket': { 'लम्बाई': '', 'छाती': '', 'पेट': '', 'कंधा': '', 'गला': '' },
    'V-Jacket': { 'लम्बाई': '', 'छाती': '', 'पेट': '', 'कंधा': '' },
    Indowestern: { 'लम्बाई': '', 'छाती': '', 'पेट': '', 'हिप': '', 'कंधा': '', 'आस्तीन': '', 'गला': '' },
    Achkan: { 'लम्बाई': '', 'छाती': '', 'पेट': '', 'हिप': '', 'कंधा': '', 'आस्तीन': '', 'गला': '' }
  });
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  // 2. POS STATE
  const [products, setProducts] = useState([]);
  const [managers, setManagers] = useState([]);
  const [settings, setSettings] = useState({});
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [gstApplied, setGstApplied] = useState(false);
  const [advancePaid, setAdvancePaid] = useState(0);

  const [bookedDate, setBookedDate] = useState(new Date().toISOString().split('T')[0]);
  const [handoverDate, setHandoverDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);

  const [items, setItems] = useState([
    { productId: '', type: 'Pant', fabricMeters: 1.2, flatDiscount: 0, stitchingOverride: 0 }
  ]);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  // EFFECTS
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // CRM LOGIC
  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(data);
  };

  const handleAddCustomer = async () => {
    if(!newCustomerForm.name || !newCustomerForm.phone) {
        return alert("Name and Phone are required.");
    }
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomerForm)
    });
    const data = await res.json();
    if(data.error && data.error.includes("UNIQUE")) {
        alert("Phone number already exists in CRM. Please select existing customer from the list.");
        return;
    }
    if(data.id) {
        alert("Customer successfully registered!");
        setNewCustomerForm({ name: '', phone: '', faith_tag: 'General', dob: '' });
        fetchCustomers();
        setSelectedCustomerId(data.id);
    }
  };

  const handleInputChange = (field, value) => {
    setCurrentOutfitFields(prev => ({
      ...prev, [activeCategory]: { ...prev[activeCategory], [field]: value }
    }));
  };

  // POS LOGIC
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { productId: '', type: 'Pant', fabricMeters: 1.2, flatDiscount: 0, stitchingOverride: 0 }]);

  // Math Profit Engine
  const selectedManager = managers.find(m => m.id == selectedManagerId);
  const managerStitchingRates = selectedManager && selectedManager.stitching_rates ? JSON.parse(selectedManager.stitching_rates) : {};

  let subTotal = 0; let costBasisTotal = 0; let totalDiscounts = 0;
  items.forEach(item => {
    const product = products.find(p => p.id == item.productId);
    const fabricPrice = product ? (product.selling_price * item.fabricMeters) : 0;
    const fabricCost = product ? (product.landing_cost * item.fabricMeters) : 0;
    const defaultStitchCost = managerStitchingRates[item.type] || 0;
    const stitchPrice = item.stitchingOverride > 0 ? parseFloat(item.stitchingOverride) : defaultStitchCost;
    const itemTotal = (fabricPrice + stitchPrice) - parseFloat(item.flatDiscount || 0);
    subTotal += itemTotal;
    totalDiscounts += parseFloat(item.flatDiscount || 0);
    costBasisTotal += (fabricCost + defaultStitchCost);
  });

  const grandTotal = gstApplied ? subTotal + (subTotal * 0.05) : subTotal;
  const balanceDue = grandTotal - (advancePaid || 0);
  const netProfit = grandTotal - costBasisTotal;

  const generatePDF = (orderId) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id == selectedCustomerId);

    // Header styling
    doc.setFillColor(15, 20, 26); // Dark theme matching app
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(197, 160, 89); // Accent gold
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("HUMJOLI ETHNIC", 105, 20, { align: "center" });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Mens Clothing, Tailoring & Ethnic Wear", 105, 28, { align: "center" });
    
    // Reset Text Color for body
    doc.setTextColor(0, 0, 0);

    // Invoice details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 20, 55);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Order ID: ${orderId}`, 20, 65);
    doc.text(`Date: ${bookedDate}`, 20, 71);
    
    // Customer Details aligned right
    doc.text(`Bill To:`, 140, 65);
    doc.setFont("helvetica", "bold");
    doc.text(`${customer ? customer.name : 'Walk-in'}`, 140, 71);
    doc.setFont("helvetica", "normal");
    doc.text(`Phone: ${customer ? customer.phone : 'N/A'}`, 140, 77);

    // Table Data
    const tableColumn = ["Item Description", "Article Name", "Stitch (Rs)", "Discount", "Net Total (Rs)"];
    const tableRows = [];

    items.forEach((item) => {
      const product = products.find(p => p.id == item.productId);
      const fabricPrice = product ? (product.selling_price * item.fabricMeters) : 0;
      const stitchPrice = item.stitchingOverride || managerStitchingRates[item.type] || 0;
      const discount = parseFloat(item.flatDiscount || 0);
      const itemTot = fabricPrice + parseFloat(stitchPrice) - discount;
      
      const itemData = [
        item.type,
        product ? (product.article_name || product.sku_takano) : 'N/A',
        parseFloat(stitchPrice).toFixed(2),
        `- ${discount.toFixed(2)}`,
        itemTot.toFixed(2)
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      startY: 85,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 20, 26], textColor: [197, 160, 89] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    
    // Summary Box
    doc.setFillColor(245, 245, 245);
    doc.rect(110, finalY - 5, 80, 55, 'F');

    doc.setFontSize(10);
    doc.text(`Sub Total:`, 120, finalY);
    doc.text(`Rs. ${subTotal.toFixed(2)}`, 180, finalY, { align: "right" });

    if(gstApplied) {
      finalY += 8;
      doc.text(`Global GST (5%):`, 120, finalY);
      doc.text(`Rs. ${(subTotal * 0.05).toFixed(2)}`, 180, finalY, { align: "right" });
    }

    finalY += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total:`, 120, finalY);
    doc.text(`Rs. ${grandTotal.toFixed(2)}`, 180, finalY, { align: "right" });
    doc.setFont("helvetica", "normal");

    finalY += 8;
    doc.text(`Advance Paid:`, 120, finalY);
    doc.text(`Rs. ${advancePaid.toFixed(2)}`, 180, finalY, { align: "right" });

    finalY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69); // Red for balance
    doc.text(`Balance Due:`, 120, finalY);
    doc.text(`Rs. ${balanceDue.toFixed(2)}`, 180, finalY, { align: "right" });

    // Footer
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for shopping at Humjoli Ethnic!", 105, 280, { align: "center" });

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
        measurements_json: currentOutfitFields,
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
      setItems([{ productId: '', type: 'Pant', fabricMeters: 1.2, flatDiscount: 0, stitchingOverride: 0 }]);
      setAdvancePaid(0);
      // Reset Measurements? Let's leave them for now in case of double-check
    } else {
      alert(data.error);
    }
  };

  // WhatsApp
  const sendWhatsAppCustomer = () => {
    const cust = customers.find(c => c.id == selectedCustomerId);
    if(!cust || !cust.phone) return alert("Customer phone not found.");
    const msg = `Thank you ${cust.name}! Order ID ${confirmedOrder.orderId} booked at Humjoli Ethnic.\n\nTotal: ₹${confirmedOrder.grandTotal.toFixed(2)}\nAdvance Paid: ₹${confirmedOrder.advancePaid.toFixed(2)}\nBalance Due: ₹${confirmedOrder.balanceDue.toFixed(2)}.\n\nExpected Delivery: ${new Date(confirmedOrder.deliveryDate).toDateString()}.`;
    window.open(`https://wa.me/91${cust.phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendWhatsAppManager = () => {
    const mgr = managers.find(m => m.id == selectedManagerId);
    if(!mgr || !mgr.mobile_number) return alert("Manager phone not found.");
    const itemsText = items.map(i => {
        const p = products.find(p=>p.id==i.productId);
        return `${i.type} (${i.fabricMeters}m of Article: ${p?(p.article_name || p.sku_takano):'N/A'})`;
    }).join(', ');

    let specsText = "";
    Object.keys(currentOutfitFields).forEach(outfit => {
      const outfitHasData = Object.values(currentOutfitFields[outfit]).some(val => val.trim() !== '');
      if(outfitHasData) {
        specsText += `\n[${outfit}]: `;
        Object.keys(currentOutfitFields[outfit]).forEach(spec => {
          if(currentOutfitFields[outfit][spec]) {
             specsText += `${spec}: ${currentOutfitFields[outfit][spec]} | `;
          }
        });
      }
    });
    if(!specsText) specsText = "No specs provided.";

    const msg = `New Workshop Order ${confirmedOrder.orderId} Assigned.\n\nMaterial Cut:\n${itemsText}\n\nMeasurement Specifications:${specsText}\n\nComplete handover by: ${new Date(handoverDate).toDateString()}.`;
    window.open(`https://wa.me/91${mgr.mobile_number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. TOP SECTION: CRM */}
      <div className={!isMobile ? "grid grid-cols-2 gap-6" : "flex flex-col gap-6"}>
        <div className="card">
          <h2 className="mb-6 flex items-center gap-2"><UserPlus size={24} color="var(--accent-gold)" /> Register Client</h2>
          <div className="flex flex-col gap-4 mb-4">
            <div className="form-group mb-0">
              <label className="form-label">Full Name</label>
              <input type="text" placeholder="e.g. Rahul Sharma" value={newCustomerForm.name} onChange={e=>setNewCustomerForm({...newCustomerForm, name: e.target.value})} className="w-full" style={{ padding: '0.8rem' }} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Mobile Number (Unique)</label>
              <input type="tel" placeholder="10-digit number" value={newCustomerForm.phone} onChange={e=>setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="w-full" style={{ padding: '0.8rem' }} />
            </div>
            <div className={!isMobile ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}>
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
          <button className="btn-primary w-full" onClick={handleAddCustomer} style={{ padding: '1rem', fontSize: '1rem' }}>
            Register & Select Client
          </button>
        </div>

        <div className="card flex flex-col">
           <h2 className="mb-4">Today's Customers</h2>
           <div className="form-group mb-4">
             <label className="form-label">Select Registered Customer for Order</label>
             <select 
               value={selectedCustomerId} 
               onChange={e=>setSelectedCustomerId(e.target.value)} 
               className="w-full" 
               style={{ padding: '0.8rem', backgroundColor: 'var(--surface-light)', border: '1px solid var(--accent-gold)' }}
             >
               <option value="">-- Or Select Existing Customer --</option>
               {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
             </select>
           </div>
           
           <div className="no-scrollbar flex-1" style={{ overflowY: 'auto', maxHeight: '250px' }}>
            {customers.slice().reverse().map(c => (
              <div 
                key={c.id} 
                className="flex justify-between items-center p-3 mb-2 cursor-pointer"
                style={{ 
                  backgroundColor: selectedCustomerId == c.id ? 'rgba(197, 160, 89, 0.1)' : 'var(--surface-light)', 
                  borderRadius: '8px', 
                  border: selectedCustomerId == c.id ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)' 
                }}
                onClick={() => setSelectedCustomerId(c.id)}
              >
                <div>
                  <h4 style={{ margin: 0, color: selectedCustomerId == c.id ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{c.name}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><Phone size={12}/> {c.phone}</p>
                </div>
                <span style={{ fontSize: '0.8rem', padding: '4px 8px', backgroundColor: 'var(--bg-color)', borderRadius: '12px' }}>
                  {c.faith_tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MIDDLE SECTION: MEASUREMENT BUTTON */}
      <div className="card p-4 flex justify-between items-center" style={{ backgroundColor: 'var(--surface-light)' }}>
        <div className="flex items-center gap-3">
          <Scissors size={24} color="var(--accent-gold)" />
          <div>
            <h3 style={{ margin: 0 }}>Digital Measurement Sheet</h3>
            <p className="subtext" style={{ margin: 0 }}>Record specific sizes for selected client</p>
          </div>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowMeasurementModal(true)}
          disabled={!selectedCustomerId}
          style={{ opacity: !selectedCustomerId ? 0.5 : 1 }}
        >
          Open Sheet
        </button>
      </div>

      {/* 3. BOTTOM SECTION: POS CHECKOUT */}
      <div className={!isMobile ? "grid grid-[2fr_1fr] gap-6" : "flex flex-col gap-6"} style={!isMobile ? { gridTemplateColumns: '2fr 1fr' } : {}}>
        <div className="card">
          <h2 className="mb-6">Checkout & Items</h2>
          
          <div className={`grid ${!isMobile ? 'grid-cols-3' : 'grid-cols-1'} gap-4 mb-6 p-4`} style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
            <div className="form-group mb-0">
              <label className="form-label">Assign Manager</label>
              <select value={selectedManagerId} onChange={e=>setSelectedManagerId(e.target.value)} className="w-full" style={{ borderColor: 'var(--accent-gold)' }}>
                <option value="">-- Assign Workshop --</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name} - W{m.workshop_number}</option>)}
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Booked Date</label>
              <input type="date" value={bookedDate} onChange={e=>setBookedDate(e.target.value)} className="w-full" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Handover Target</label>
              <input type="date" value={handoverDate} onChange={e=>setHandoverDate(e.target.value)} className="w-full" />
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />

          {items.map((item, index) => (
            <div key={index} className="mb-4 p-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 className="mb-3">Item {index + 1}</h4>
              <div className={`grid ${!isMobile ? 'grid-cols-5' : 'grid-cols-2'} gap-3`}>
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
                    <option value="Safa">Safa</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Article Name</label>
                  <select value={item.productId} onChange={e=>handleItemChange(index, 'productId', e.target.value)} className="w-full">
                    <option value="">-- Select --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.article_name || p.sku_takano}</option>)}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Meters</label>
                  <input type="number" step="0.1" value={item.fabricMeters} onChange={e=>handleItemChange(index, 'fabricMeters', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Discount</label>
                  <input type="number" value={item.flatDiscount} onChange={e=>handleItemChange(index, 'flatDiscount', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Stitch Cost</label>
                  <input type="number" placeholder="Default" value={item.stitchingOverride} onChange={e=>handleItemChange(index, 'stitchingOverride', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
            </div>
          ))}
          
          <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={addItem}>
            <Plus size={18} /> Add Another Item
          </button>
        </div>

        <div className="card flex flex-col justify-between" style={{ backgroundColor: '#0f141a' }}>
          <div>
            <h2 className="mb-6">Order Summary</h2>
            
            <div className="flex justify-between items-center py-2 mb-2" style={{ borderBottom: '1px dashed var(--border-color)' }}>
              <span className="subtext">Sub Total</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>₹{subTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-2 mb-4" style={{ borderBottom: '1px dashed var(--border-color)' }}>
              <span className="subtext flex items-center gap-2">
                Apply Global GST (5%)
                <input type="checkbox" checked={gstApplied} onChange={e => setGstApplied(e.target.checked)} />
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
                onChange={e => setAdvancePaid(e.target.value === '' ? '' : parseFloat(e.target.value))}
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
            <FileText size={20} /> Confirm Final Order
          </button>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showConfirmation && confirmedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyItems: 'center', zIndex: 1000, justifyContent: 'center' }}>
          <div className="card shadow-lg" style={{ width: isMobile ? '90%' : '600px', textAlign: 'center', padding: isMobile ? '2rem 1rem' : '3rem 2rem', position: 'relative' }}>
            <button className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setShowConfirmation(false)}>
              <X size={24} />
            </button>
            
            <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h2 className="mb-2">Order Successfully Booked!</h2>
            <p className="subtext mb-6">Order ID: <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{confirmedOrder.orderId}</span></p>

            <div className={`flex gap-4 justify-center mt-8 ${isMobile ? 'flex-col' : ''}`}>
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

      {/* MEASUREMENT MODAL */}
      {showMeasurementModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyItems: 'center', zIndex: 1000, justifyContent: 'center' }}>
          <div className="card shadow-lg flex flex-col" style={{ width: isMobile ? '95%' : '700px', height: 'auto', maxHeight: isMobile ? '80dvh' : '90vh', padding: '0', position: 'relative', overflow: 'hidden' }}>
            <div className="flex justify-between items-center p-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h2 className="flex items-center gap-2 m-0"><Scissors color="var(--accent-gold)" /> Measurements</h2>
              <button className="btn-icon" onClick={() => setShowMeasurementModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}><X size={24} /></button>
            </div>
            
            <div className="flex gap-2 p-4" style={{ flexWrap: 'wrap', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              {Object.keys(currentOutfitFields).map(cat => {
                const hasData = Object.values(currentOutfitFields[cat]).some(v => v.trim() !== '');
                return (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      whiteSpace: 'nowrap',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      border: activeCategory === cat ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                      backgroundColor: activeCategory === cat ? 'rgba(197, 160, 89, 0.1)' : 'transparent',
                      color: activeCategory === cat ? 'var(--accent-gold)' : 'var(--text-secondary)'
                    }}
                  >
                    {cat} {hasData && '✓'}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-4">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {Object.keys(currentOutfitFields[activeCategory]).map(field => (
                  <div key={field} className="form-group mb-0">
                    <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{field} (in)</label>
                    <input 
                        type="number" 
                        inputMode="decimal"
                        value={currentOutfitFields[activeCategory][field]} 
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        placeholder="0.0"
                        className="w-full"
                        style={{ fontSize: '1.1rem', fontWeight: 'bold', padding: '0.6rem' }} 
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-light)' }}>
              <button className="btn-primary w-full" onClick={() => setShowMeasurementModal(false)}>Save & Close Sheet</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NewOrder;
