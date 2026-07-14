import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Phone, UserPlus, Flame, Plus, FileText, CheckCircle, Send, Users, X, ShoppingCart, ToggleLeft, ToggleRight } from 'lucide-react';
import Select from 'react-select';

const NewOrder = () => {
  // 1. CRM STATE
  const [customers, setCustomers] = useState([]);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', faith_tag: 'General', dob: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Custom Specs State (For Custom Stove Orders)
  const [customSpecs, setCustomSpecs] = useState({
    dimensions: '',
    burnerType: 'Brass Double Burner',
    bodyMaterial: 'Stainless Steel Heavy Gauge',
    regulatorType: 'High Pressure Regulator',
    instructions: ''
  });
  const [showSpecsModal, setShowSpecsModal] = useState(false);

  // 2. POS STATE
  const [products, setProducts] = useState([]);
  const [factoryUnits, setFactoryUnits] = useState([]);
  const [selectedFactoryUnitId, setSelectedFactoryUnitId] = useState('');
  
  // Order Type Toggles
  const [orderType, setOrderType] = useState('Direct'); // 'Direct' (on-the-go sale) vs 'Custom' (requires fabrication)
  const [saleType, setSaleType] = useState('Retail'); // 'Retail' (B2C) vs 'Wholesale' (B2B)
  const [gstApplied, setGstApplied] = useState(false);
  const [advancePaid, setAdvancePaid] = useState('');

  // Generic Product Modal
  const [showAddGenericModal, setShowAddGenericModal] = useState(false);
  const [genericProduct, setGenericProduct] = useState({ name: '', category: '', retail_price: '', wholesale_price: '' });

  // Dates
  const [bookedDate, setBookedDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]);

  // Order Items
  const [items, setItems] = useState([
    { productId: '', qty: 1, laborPayout: 0, price: '' }
  ]);

  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [overrideGrandTotal, setOverrideGrandTotal] = useState('');
  const [showMargin, setShowMargin] = useState(false);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  // EFFECTS
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(data);
  };

  const fetchFactoryUnits = async () => {
    const res = await fetch('/api/factory-units');
    const data = await res.json();
    setFactoryUnits(data);
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchFactoryUnits();
  }, []);

  // Update prices when saleType changes
  useEffect(() => {
    if (!products || products.length === 0) return;
    setItems(prevItems => prevItems.map(item => {
      const product = products.find(p => p.id == item.productId);
      if (product) {
        return {
          ...item,
          price: saleType === 'Wholesale' ? product.wholesale_price : product.retail_price
        };
      }
      return item;
    }));
  }, [saleType, products]);

  // Recalculate or override totals when items/discounts change
  useEffect(() => {
    setOverrideGrandTotal('');
  }, [items, globalDiscountPercent, gstApplied, saleType]);

  // CRM LOGIC
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
        alert("Phone number already registered. Please select them from the list.");
        return;
    }
    if(data.id) {
        alert("Customer successfully registered!");
        setNewCustomerForm({ name: '', phone: '', faith_tag: 'General', dob: '' });
        fetchCustomers();
        setSelectedCustomerId(data.id);
    }
  };

  const handleAddGenericProduct = async () => {
    if (!genericProduct.name || !genericProduct.retail_price) {
        return alert("Please fill name and retail price.");
    }
    const rPrice = parseFloat(genericProduct.retail_price) || 0;
    const wPrice = parseFloat(genericProduct.wholesale_price) || rPrice;

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sku: 'GEN-' + Math.floor(1000 + Math.random() * 9000),
                name: genericProduct.name,
                category: genericProduct.category || 'Spare Parts',
                total_stock: 100,
                manufacturing_cost: rPrice * 0.5, // Approx cost basis
                retail_price: rPrice,
                wholesale_price: wPrice
            })
        });
        if (res.ok) {
            setGenericProduct({ name: '', category: '', retail_price: '', wholesale_price: '' });
            setShowAddGenericModal(false);
            fetchProducts();
            alert("On-the-go product added successfully! Select it in items.");
        } else {
            alert("Failed to add product");
        }
    } catch (error) {
        console.error(error);
    }
  };

  // ITEM CHANGE HANDLERS
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'productId') {
      const product = products.find(p => p.id == value);
      if (product) {
        newItems[index]['price'] = saleType === 'Wholesale' ? product.wholesale_price : product.retail_price;
        
        // Auto-fill labor payout from selected factory unit
        if (orderType === 'Custom' && selectedFactoryUnitId) {
          const unit = factoryUnits.find(u => u.id == selectedFactoryUnitId);
          if (unit) {
            try {
              const rates = JSON.parse(unit.stitching_rates || '{}');
              newItems[index]['laborPayout'] = parseFloat(rates[product.category]) || 0;
            } catch (e) {
              newItems[index]['laborPayout'] = 0;
            }
          }
        }
      } else {
        newItems[index]['price'] = '';
        newItems[index]['laborPayout'] = 0;
      }
    }
    setItems(newItems);
  };

  // Auto-fill labor payout when factory floor or order type changes
  useEffect(() => {
    if (orderType === 'Custom' && selectedFactoryUnitId) {
      const unit = factoryUnits.find(u => u.id == selectedFactoryUnitId);
      if (unit) {
        let rates = {};
        try {
          rates = JSON.parse(unit.stitching_rates || '{}');
        } catch (e) {}
        setItems(prevItems => prevItems.map(item => {
          const product = products.find(p => p.id == item.productId);
          if (product) {
            return {
              ...item,
              laborPayout: parseFloat(rates[product.category]) || 0
            };
          }
          return item;
        }));
      }
    } else {
      setItems(prevItems => prevItems.map(item => ({ ...item, laborPayout: 0 })));
    }
  }, [selectedFactoryUnitId, orderType, factoryUnits, products]);

  const addItem = () => setItems([...items, { productId: '', qty: 1, laborPayout: 0, price: '' }]);
  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // CALCULATE MATH ENGINE
  let grossTotal = 0; 
  let costBasisTotal = 0;

  items.forEach(item => {
    const product = products.find(p => p.id == item.productId);
    const defaultPrice = product 
      ? (saleType === 'Wholesale' ? product.wholesale_price : product.retail_price) 
      : 0;
    const unitPrice = (item.price !== undefined && item.price !== '') ? parseFloat(item.price) : defaultPrice;
    const qty = parseInt(item.qty) || 1;
    
    item.name = product ? product.name : '';
    
    // Labor payout goes to factory unit for fabrication (if custom order)
    const labor = orderType === 'Custom' ? (parseFloat(item.laborPayout) || 0) : 0;
    item.managerPayout = labor; // mapped to backend factory payout

    grossTotal += (unitPrice * qty);
    costBasisTotal += ((product ? product.manufacturing_cost : 0) * qty) + labor;
  });

  const baseDiscount = (grossTotal * (parseFloat(globalDiscountPercent) || 0)) / 100;
  const baseSubTotal = grossTotal - baseDiscount;
  const baseGrandTotal = gstApplied ? baseSubTotal * 1.18 : baseSubTotal;

  const finalGrandTotal = (overrideGrandTotal !== '') ? parseFloat(overrideGrandTotal) : baseGrandTotal;
  const extraDiscount = baseGrandTotal - finalGrandTotal;
  const finalDiscount = baseDiscount + extraDiscount;

  const balanceDue = finalGrandTotal - (parseFloat(advancePaid) || 0);
  const netProfit = finalGrandTotal - costBasisTotal;

  // Auto-fill full price for direct sales when advance isn't modified
  useEffect(() => {
    if (orderType === 'Direct') {
      setAdvancePaid(finalGrandTotal.toFixed(2));
    } else {
      setAdvancePaid('');
    }
  }, [finalGrandTotal, orderType]);

  // INVOICE PDF GENERATION
  const generatePDF = (orderId) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id == selectedCustomerId);

    // Header styling
    doc.setFillColor(22, 27, 34); 
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(224, 90, 16); // Accent rust orange
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("CHACHAJI UDYOG", 105, 20, { align: "center" });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Gas Stove Manufacturers & Commercial Burners", 105, 28, { align: "center" });
    
    doc.setTextColor(0, 0, 0);

    // Invoice details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SALES INVOICE", 20, 55);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Order ID: ${orderId}`, 20, 65);
    doc.text(`Date: ${bookedDate}`, 20, 71);
    doc.text(`Sale Type: ${saleType} (${orderType} Order)`, 20, 77);
    
    // Customer Details
    doc.text(`Bill To:`, 140, 65);
    doc.setFont("helvetica", "bold");
    doc.text(`${customer ? customer.name : 'Walk-in Customer'}`, 140, 71);
    doc.setFont("helvetica", "normal");
    doc.text(`Phone: ${customer ? customer.phone : 'N/A'}`, 140, 77);

    // Table Data
    const tableColumn = ["Product / SKU", "Rate (Rs)", "Qty", "Total (Rs)"];
    const tableRows = [];

    items.forEach((item) => {
      const product = products.find(p => p.id == item.productId);
      const defaultPrice = product 
        ? (saleType === 'Wholesale' ? product.wholesale_price : product.retail_price) 
        : 0;
      const rate = (item.price !== undefined && item.price !== '') ? parseFloat(item.price) : defaultPrice;
      const qty = item.qty || 1;
      const total = rate * qty;
      
      tableRows.push([
        product ? `${product.name} (${product.sku})` : 'Generic Gas Appliance',
        rate.toFixed(2),
        qty,
        total.toFixed(2)
      ]);
    });

    autoTable(doc, {
      startY: 85,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 27, 34], textColor: [224, 90, 16] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    
    // Summary Box
    doc.setFillColor(245, 245, 245);
    doc.rect(110, finalY - 5, 80, 35, 'F');

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total:`, 120, finalY + 2);
    doc.text(`Rs. ${finalGrandTotal.toFixed(2)}`, 180, finalY + 2, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    finalY += 10;
    doc.text(`Amount Paid:`, 120, finalY);
    doc.text(`Rs. ${(parseFloat(advancePaid) || 0).toFixed(2)}`, 180, finalY, { align: "right" });

    finalY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69);
    doc.text(`Balance Due:`, 120, finalY);
    doc.text(`Rs. ${balanceDue.toFixed(2)}`, 180, finalY, { align: "right" });

    // Footer
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for choosing Chachaji Udyog!", 105, 280, { align: "center" });

    doc.save(`Chachaji_Udyog_Invoice_${orderId}.pdf`);
  };

  const handleCheckout = async () => {
    if(!selectedCustomerId) return alert('Please select a customer profile.');
    
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const factoryId = orderType === 'Custom' ? selectedFactoryUnitId : null;

    if (orderType === 'Custom' && !factoryId) {
      return alert("Please assign a Factory Unit for this custom fabrication order.");
    }

    const resolvedItems = items.map(item => {
      const product = products.find(p => p.id == item.productId);
      const defaultPrice = product 
        ? (saleType === 'Wholesale' ? product.wholesale_price : product.retail_price) 
        : 0;
      const unitPrice = (item.price !== undefined && item.price !== '') ? parseFloat(item.price) : defaultPrice;
      const labor = orderType === 'Custom' ? (parseFloat(item.laborPayout) || 0) : 0;
      return {
        ...item,
        price: unitPrice,
        name: product ? product.name : '',
        managerPayout: labor
      };
    });

    const payload = {
      id: orderId,
      customer_id: selectedCustomerId,
      factory_unit_id: factoryId,
      items_json: resolvedItems,
      custom_specs_json: orderType === 'Custom' ? customSpecs : null,
      sub_total: baseSubTotal,
      discount_amount: finalDiscount,
      grand_total: finalGrandTotal,
      advance_paid: parseFloat(advancePaid) || 0,
      balance_due: balanceDue,
      cost_basis_total: costBasisTotal,
      net_profit: netProfit,
      status: orderType === 'Custom' ? 'Booked' : 'Delivered',
      sale_type: saleType,
      order_type: orderType,
      booked_date: bookedDate,
      delivery_target_date: orderType === 'Custom' ? deliveryDate : null,
      delivery_date: orderType === 'Direct' ? bookedDate : null
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if(!data.error) {
      generatePDF(orderId);
      setConfirmedOrder({ orderId, grandTotal: finalGrandTotal, advancePaid: parseFloat(advancePaid) || 0, balanceDue, deliveryDate });
      setShowConfirmation(true);
      
      // Reset items and form
      setItems([{ productId: '', qty: 1, laborPayout: 0, price: '' }]);
      setGlobalDiscountPercent(0);
      setOverrideGrandTotal('');
    } else {
      alert(data.error);
    }
  };

  // WHATSAPP ALERTS
  const sendWhatsAppCustomer = () => {
    const cust = customers.find(c => c.id == selectedCustomerId);
    if(!cust || !cust.phone) return alert("Customer phone not found.");
    
    const orderDetailText = items.map(i => {
      const p = products.find(p=>p.id==i.productId);
      return `${p ? p.name : 'Stove'} (Qty: ${i.qty})`;
    }).join(', ');

    const msg = `Namskar ${cust.name}! Aapka order booking Chachaji Udyog me confirm ho gaya hai.\n\nOrder ID: ${confirmedOrder.orderId}\nItems: ${orderDetailText}\nTotal: ₹${confirmedOrder.grandTotal.toFixed(2)}\nPaid: ₹${confirmedOrder.advancePaid.toFixed(2)}\nOutstanding: ₹${confirmedOrder.balanceDue.toFixed(2)}.\n\nThank you for choosing Chachaji Udyog.`;
    window.open(`https://wa.me/91${cust.phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendWhatsAppFactory = () => {
    const unit = factoryUnits.find(u => u.id == selectedFactoryUnitId);
    if(!unit || !unit.mobile_number) return alert("Factory unit worker contact not found.");
    
    const itemsText = items.map(i => {
      const p = products.find(p=>p.id==i.productId);
      return `${p ? p.name : 'Stove'} (Qty: ${i.qty})`;
    }).join(', ');

    const specsText = `
Dimensions: ${customSpecs.dimensions || 'Standard'}
Burner: ${customSpecs.burnerType}
Body: ${customSpecs.bodyMaterial}
Regulator: ${customSpecs.regulatorType}
Instructions: ${customSpecs.instructions || 'None'}`;

    const msg = `*नया Fabrication ऑर्डर* 🔥
Order ID: ${confirmedOrder.orderId}
Unit Assigned: ${unit.name}
Expected Delivery: ${new Date(confirmedOrder.deliveryDate).toLocaleDateString('en-GB')}

Stove Specs:${specsText}
Items to Build: ${itemsText}`;

    window.open(`https://wa.me/91${unit.mobile_number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. TOP CRM & ORDER TYPE PANEL */}
      <div className={!isMobile ? "grid grid-cols-2 gap-6" : "flex flex-col gap-6"}>
        
        {/* Register Customer */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2" style={{ color: 'var(--accent-gold)' }}>
            <UserPlus size={22} />
            Register Customer
          </h2>
          <div className="flex flex-col gap-4 mb-4">
            <div className="form-group mb-0">
              <label className="form-label">Customer Name</label>
              <input type="text" placeholder="e.g. Ramesh Kumar" value={newCustomerForm.name} onChange={e=>setNewCustomerForm({...newCustomerForm, name: e.target.value})} className="w-full" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Phone Number</label>
              <input type="tel" placeholder="10-digit mobile" value={newCustomerForm.phone} onChange={e=>setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label">DOB (Optional)</label>
                <input type="date" value={newCustomerForm.dob} onChange={e=>setNewCustomerForm({...newCustomerForm, dob: e.target.value})} className="w-full" />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Customer Tag</label>
                <select value={newCustomerForm.faith_tag} onChange={e=>setNewCustomerForm({...newCustomerForm, faith_tag: e.target.value})} className="w-full">
                  <option value="General">Retail Buyer</option>
                  <option value="Hindu">Wholesaler</option>
                  <option value="Muslim">Dealer/Distributor</option>
                </select>
              </div>
            </div>
          </div>
          <button className="btn-primary w-full" onClick={handleAddCustomer} style={{ padding: '0.8rem' }}>
            Register & Select Customer
          </button>
        </div>

        {/* Existing Customers Selection */}
        <div className="card flex flex-col">
          <h2 className="mb-4">Select Customer Profile</h2>
          <div className="form-group mb-4">
            <select 
              value={selectedCustomerId} 
              onChange={e=>setSelectedCustomerId(e.target.value)} 
              className="w-full"
              style={{ borderColor: 'var(--accent-gold)' }}
            >
              <option value="">-- Choose Profile --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </div>

          <label className="form-label">Registered Today</label>
          <div className="no-scrollbar flex-1" style={{ overflowY: 'auto', maxHeight: '180px' }}>
            {customers.filter(c => c.created_at && c.created_at.split('T')[0] === new Date().toISOString().split('T')[0]).slice().reverse().map(c => (
              <div 
                key={c.id} 
                className="flex justify-between items-center p-3 mb-2 cursor-pointer"
                style={{ 
                  backgroundColor: selectedCustomerId == c.id ? 'rgba(224, 90, 16, 0.1)' : 'var(--surface-light)', 
                  borderRadius: '8px', 
                  border: selectedCustomerId == c.id ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)' 
                }}
                onClick={() => setSelectedCustomerId(c.id)}
              >
                <div>
                  <h4 style={{ margin: 0, color: selectedCustomerId == c.id ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{c.name}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{c.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 2. ORDER TYPE & PRICING CONTROLS */}
      <div className="card" style={{ backgroundColor: 'var(--surface-light)', padding: '1.25rem 1.5rem' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : (orderType === 'Custom' ? '1fr auto 1fr auto 1fr' : '1fr auto 1fr'),
          gap: '1.5rem', 
          alignItems: 'center' 
        }}>
          
          {/* Order Type */}
          <div className="form-group mb-0">
            <label className="form-label">Order Mode</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setOrderType('Direct')}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold',
                  backgroundColor: orderType === 'Direct' ? 'var(--accent-gold)' : 'var(--surface-color)',
                  color: orderType === 'Direct' ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: orderType === 'Direct' ? '0 0 10px var(--accent-gold-dim)' : 'none'
                }}
              >
                Direct Sale (OTC)
              </button>
              <button 
                onClick={() => setOrderType('Custom')}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold',
                  backgroundColor: orderType === 'Custom' ? 'var(--accent-gold)' : 'var(--surface-color)',
                  color: orderType === 'Custom' ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: orderType === 'Custom' ? '0 0 10px var(--accent-gold-dim)' : 'none'
                }}
                className="custom-order-toggle"
              >
                + Custom Fabrication
              </button>
            </div>
          </div>

          {/* Divider 1 */}
          {!isMobile && (
            <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border-color)' }}></div>
          )}

          {/* Pricing Tier */}
          <div className="form-group mb-0">
            <label className="form-label">Pricing Mode</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setSaleType('Retail')}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold',
                  backgroundColor: saleType === 'Retail' ? 'var(--accent-gold)' : 'var(--surface-color)',
                  color: saleType === 'Retail' ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: saleType === 'Retail' ? '0 0 10px var(--accent-gold-dim)' : 'none'
                }}
              >
                Retail (B2C)
              </button>
              <button 
                onClick={() => setSaleType('Wholesale')}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold',
                  backgroundColor: saleType === 'Wholesale' ? 'var(--accent-gold)' : 'var(--surface-color)',
                  color: saleType === 'Wholesale' ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: saleType === 'Wholesale' ? '0 0 10px var(--accent-gold-dim)' : 'none'
                }}
                className="wholesale-toggle"
              >
                Wholesale (B2B)
              </button>
            </div>
          </div>

          {/* Divider 2 */}
          {!isMobile && orderType === 'Custom' && (
            <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border-color)' }}></div>
          )}

          {/* Custom Specifications Modal Switch */}
          {orderType === 'Custom' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button 
                className="btn-primary w-full"
                onClick={() => setShowSpecsModal(true)}
                style={{ padding: '0.85rem' }}
              >
                Configure Stove Specs
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 3. ITEM ENTRY AND CART SUMMARY */}
      <div className={!isMobile ? "grid grid-[2fr_1fr] gap-6" : "flex flex-col gap-6"} style={!isMobile ? { gridTemplateColumns: '2fr 1fr' } : {}}>
        
        {/* Cart Item Entry */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Selected Appliances</h2>
            {orderType === 'Custom' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label" style={{ marginBottom: '2px' }}>Booked</label>
                  <input type="date" value={bookedDate} onChange={e=>setBookedDate(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label" style={{ marginBottom: '2px' }}>Fabrication Target</label>
                  <input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                </div>
              </div>
            )}
          </div>

          {items.map((item, index) => {
            const prod = products.find(p => p.id == item.productId);
            const unitPrice = prod ? (saleType === 'Wholesale' ? prod.wholesale_price : prod.retail_price) : 0;
            
            return (
              <div key={index} className="mb-4 p-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                {items.length > 1 && (
                  <button 
                    onClick={() => removeItem(index)} 
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                  >
                    &times;
                  </button>
                )}
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr', 
                  gap: '1rem', 
                  alignItems: 'end' 
                }}>
                  
                  {/* Select Product */}
                  <div className="form-group mb-0" style={isMobile ? { gridColumn: '1 / -1' } : {}}>
                    <label className="form-label flex justify-between items-end">
                      <span>Gas stove / Spare Part</span>
                      <button 
                        onClick={() => setShowAddGenericModal(true)} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                      >
                        + On-the-go
                      </button>
                    </label>
                    <Select
                      options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                      value={item.productId ? { value: item.productId, label: products.find(p => p.id == item.productId)?.name } : null}
                      onChange={selected => handleItemChange(index, 'productId', selected ? selected.value : '')}
                      placeholder="Search items..."
                      styles={{
                        control: (base) => ({
                          ...base,
                          backgroundColor: 'var(--surface-color)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)'
                        }),
                        singleValue: (base) => ({ ...base, color: 'var(--text-primary)' }),
                        menu: (base) => ({ ...base, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)' }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected 
                            ? 'var(--accent-gold)' 
                            : (state.isFocused ? 'var(--surface-lighter)' : 'transparent'),
                          color: state.isSelected ? 'var(--accent-text)' : 'var(--text-primary)',
                          cursor: 'pointer'
                        }),
                        placeholder: (base) => ({ ...base, color: 'var(--text-secondary)' }),
                        input: (base) => ({ ...base, color: 'var(--text-primary)' })
                      }}
                    />
                  </div>

                  {/* Quantity (pcs) */}
                  <div className="form-group mb-0">
                    <label className="form-label">Quantity (pcs)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={item.qty} 
                      onChange={e => handleItemChange(index, 'qty', parseInt(e.target.value) || 1)} 
                      className="w-full text-center" 
                    />
                  </div>

                  {/* Unit Price (Manual / Editable) */}
                  <div className="form-group mb-0">
                    <label className="form-label">Price / unit</label>
                    <input 
                      type="number" 
                      value={item.price !== undefined ? item.price : ''} 
                      onChange={e => handleItemChange(index, 'price', e.target.value)} 
                      className="w-full text-center" 
                      style={{ fontWeight: 'bold' }}
                      placeholder="0"
                    />
                  </div>

                </div>
              </div>
            );
          })}

          <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={addItem}>
            <Plus size={18} /> Add Appliance
          </button>
        </div>

        {/* Summary Card */}
        <div className="card flex flex-col justify-between">
          <div>
            <h2 className="mb-4">Invoice Summary</h2>
            
            <div className="flex justify-between items-center py-2 mb-2" style={{ borderBottom: '1px dashed var(--border-color)' }}>
              <span className="subtext">Gross Subtotal</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>₹{grossTotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 mb-2" style={{ borderBottom: '1px dashed var(--border-color)' }}>
              <span className="subtext flex items-center gap-2">
                Discount (%)
                <input 
                  type="number" 
                  value={globalDiscountPercent} 
                  onChange={e => setGlobalDiscountPercent(e.target.value)}
                  style={{ width: '60px', padding: '0.2rem', textAlign: 'center' }}
                  min="0" max="100"
                />
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--danger)' }}>
                - ₹{baseDiscount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 mb-4" style={{ borderBottom: '1px dashed var(--border-color)' }}>
              <span className="subtext flex items-center gap-2">
                Add GST (18%)
                <input type="checkbox" checked={gstApplied} onChange={e => setGstApplied(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{gstApplied ? `+ ₹${(baseSubTotal * 0.18).toFixed(2)}` : '₹0.00'}</span>
            </div>

            <div className="flex justify-between items-center p-4 mb-4" style={{ backgroundColor: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: '600' }}>Formula Total</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{baseGrandTotal.toFixed(2)}</span>
            </div>

            {/* Negotiation Overrides */}
            <div className="form-group mb-6 p-4" style={{ backgroundColor: 'rgba(224, 90, 16, 0.1)', borderRadius: '8px', border: '1px solid var(--accent-gold)' }}>
              <label className="form-label" style={{ color: 'var(--accent-gold)' }}>Negotiated Bill Value (₹)</label>
              <input 
                type="number"
                value={overrideGrandTotal !== '' ? overrideGrandTotal : baseGrandTotal.toFixed(2)}
                onChange={e => setOverrideGrandTotal(e.target.value)}
                style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.75rem', width: '100%', borderColor: 'var(--accent-gold)' }}
              />
            </div>

            {/* Factory Assignment (if Custom order) */}
            {orderType === 'Custom' && (
              <div className="form-group mb-4">
                <label className="form-label">Assign Fabrication Floor</label>
                <select 
                  value={selectedFactoryUnitId} 
                  onChange={e => setSelectedFactoryUnitId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Choose Factory Unit --</option>
                  {factoryUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.name} ({unit.unit_number})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Paid / Advance amount */}
            <div className="form-group">
              <label className="form-label">{orderType === 'Custom' ? 'Advance Paid (₹)' : 'Amount Received (₹)'}</label>
              <input 
                type="number" 
                value={advancePaid} 
                onChange={e => setAdvancePaid(e.target.value)}
                style={{ fontSize: '1.25rem', padding: '0.75rem', fontWeight: '600' }}
              />
            </div>

            <div className="flex justify-between items-center p-4 mb-4" style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600', color: 'var(--danger)' }}>Balance/Udhaari</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>₹{balanceDue.toFixed(2)}</span>
            </div>
            
            <div className="mt-4">
              <button 
                className="btn-secondary" 
                onClick={() => setShowMargin(!showMargin)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                {showMargin ? 'Hide Margin' : 'Show Profit Margin'}
              </button>
              {showMargin && (
                <div className="flex justify-between items-center p-3 mt-2" style={{ border: '1px dashed var(--success)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Projected Net Profit:</span>
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--success)' }}>₹{netProfit.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <button className="btn-primary w-full mt-6 flex items-center justify-center gap-2" style={{ padding: '1.2rem', fontSize: '1.1rem' }} onClick={handleCheckout}>
            <FileText size={20} />
            Book & Print Bill
          </button>
        </div>

      </div>

      {/* CUSTOM SPECIFICATIONS MODAL */}
      {showSpecsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', zIndex: 1000, justifyContent: 'center' }}>
          <div className="card shadow-lg flex flex-col" style={{ width: '90%', maxWidth: '500px', padding: '0', overflow: 'hidden' }}>
            <div className="flex justify-between items-center" style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="flex items-center gap-2 m-0"><Flame color="var(--accent-gold)" /> Stove Specifications</h2>
              <button onClick={() => setShowSpecsModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-color)' }}>
              <div>
                <label className="form-label">Dimensions / Size (e.g. 2x4 ft)</label>
                <input 
                  type="text" 
                  value={customSpecs.dimensions}
                  onChange={e => setCustomSpecs({...customSpecs, dimensions: e.target.value})}
                  className="w-full"
                  placeholder="Standard or custom stand sizes"
                />
              </div>
              <div>
                <label className="form-label">Burner Type</label>
                <select 
                  value={customSpecs.burnerType}
                  onChange={e => setCustomSpecs({...customSpecs, burnerType: e.target.value})}
                  className="w-full"
                >
                  <option value="Brass Single Burner">Brass Single Burner</option>
                  <option value="Brass Double Burner">Brass Double Burner</option>
                  <option value="Commercial High Pressure">Commercial High Pressure</option>
                  <option value="Dosa Bhatti Triple Burner">Dosa Bhatti Triple Burner</option>
                  <option value="G-9 Burner Heads">G-9 Burner Heads</option>
                </select>
              </div>
              <div>
                <label className="form-label">Body Material</label>
                <select 
                  value={customSpecs.bodyMaterial}
                  onChange={e => setCustomSpecs({...customSpecs, bodyMaterial: e.target.value})}
                  className="w-full"
                >
                  <option value="Stainless Steel Heavy Gauge">Stainless Steel Heavy Gauge</option>
                  <option value="Mild Steel Coated">Mild Steel Coated</option>
                  <option value="Glass Top Premium Finish">Glass Top Premium Finish</option>
                </select>
              </div>
              <div>
                <label className="form-label">Regulator & Safety</label>
                <select 
                  value={customSpecs.regulatorType}
                  onChange={e => setCustomSpecs({...customSpecs, regulatorType: e.target.value})}
                  className="w-full"
                >
                  <option value="High Pressure Regulator">High Pressure Regulator</option>
                  <option value="Low Pressure Domestic">Low Pressure Domestic</option>
                  <option value="Auto Ignition Kit">Auto Ignition Kit</option>
                </select>
              </div>
              <div>
                <label className="form-label">Special Fabrication Instructions</label>
                <textarea 
                  rows="3"
                  value={customSpecs.instructions}
                  onChange={e => setCustomSpecs({...customSpecs, instructions: e.target.value})}
                  className="w-full"
                  placeholder="Leg supports, customized heavy stand plates, etc."
                />
              </div>
            </div>

            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-light)' }}>
              <button className="btn-primary w-full" onClick={() => setShowSpecsModal(false)}>Save Specs</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION / SUCCESS MODAL */}
      {showConfirmation && confirmedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', zIndex: 1000, justifyContent: 'center' }}>
          <div className="card shadow-lg" style={{ width: '90%', maxWidth: '500px', textAlign: 'center', padding: '2rem 1.5rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowConfirmation(false)}>
              &times;
            </button>
            
            <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h2 className="mb-2">Invoice Generated Successfully!</h2>
            <p className="subtext mb-6">Order ID: <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{confirmedOrder.orderId}</span></p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                className="btn-primary w-full flex items-center justify-center gap-2" 
                style={{ padding: '0.8rem', background: '#2ea043', border: 'none' }}
                onClick={sendWhatsAppCustomer}
              >
                <Send size={18} />
                Send Invoice to Customer (WhatsApp)
              </button>
              {orderType === 'Custom' && (
                <button 
                  className="btn-secondary w-full flex items-center justify-center gap-2" 
                  style={{ padding: '0.8rem' }}
                  onClick={sendWhatsAppFactory}
                >
                  <Flame size={18} />
                  Send Spec sheet to Factory
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD INSTANT PRODUCT MODAL */}
      {showAddGenericModal && (
        <div className="modal-overlay" onClick={() => setShowAddGenericModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 className="mb-4 text-center">Quick Add Article</h2>
            <div className="form-group">
              <label className="form-label">Article Name</label>
              <input 
                type="text" 
                className="w-full" 
                value={genericProduct.name}
                onChange={e => setGenericProduct({...genericProduct, name: e.target.value})}
                placeholder="e.g. 2 Burner SS Cooktop"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input 
                type="text" 
                className="w-full" 
                value={genericProduct.category}
                onChange={e => setGenericProduct({...genericProduct, category: e.target.value})}
                placeholder="e.g. Double Stove Burner"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Retail Price (B2C)</label>
                <input 
                  type="number" 
                  className="w-full" 
                  value={genericProduct.retail_price}
                  onChange={e => setGenericProduct({...genericProduct, retail_price: e.target.value})}
                  placeholder="e.g. 2400"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Wholesale Price (B2B)</label>
                <input 
                  type="number" 
                  className="w-full" 
                  value={genericProduct.wholesale_price}
                  onChange={e => setGenericProduct({...genericProduct, wholesale_price: e.target.value})}
                  placeholder="e.g. 1850"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowAddGenericModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddGenericProduct}>Save & Select</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NewOrder;
