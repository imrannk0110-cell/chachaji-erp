import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Printer, MessageCircle, ShoppingCart, UserCheck, Percent, IndianRupee, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerGroupTag, setCustomerGroupTag] = useState('General');
  const [customerDob, setCustomerDob] = useState('');
  
  const [cart, setCart] = useState([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [completedSale, setCompletedSale] = useState(null);
  
  const [localIpUrl, setLocalIpUrl] = useState('http://localhost:3000');

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
    
    // Fetch local network IP
    fetch('/api/local-ip')
      .then(r => r.json())
      .then(data => {
        if (data.localIp) {
          setLocalIpUrl(`http://${data.localIp}:${data.port || 3000}`);
        }
      })
      .catch(err => console.error('Error fetching local IP in billing:', err));
  }, []);

  const handlePhoneChange = async (e) => {
    const phone = e.target.value;
    setCustomerPhone(phone);
    if (phone.length >= 10) {
      const res = await fetch(`/api/customers/search?q=${phone}`);
      const data = await res.json();
      if (data.length > 0) {
        setCustomerName(data[0].name);
        setCustomerGroupTag(data[0].group_tag || 'General');
        setCustomerDob(data[0].dob || '');
      }
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { 
        product_id: product.id, 
        name: product.name,
        sku: product.sku,
        unit_price: product.selling_price, 
        purchase_price: product.purchase_price, // Needed for real-time margin checking
        quantity: 1, 
        flat_discount: 0,
        uom: product.uom,
        current_stock: product.current_stock
      }]);
    }
  };

  const updateCartItem = (index, field, value) => {
    const newCart = [...cart];
    newCart[index][field] = parseFloat(value) || 0;
    setCart(newCart);
  };

  const removeCartItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Calculations
  const subTotal = cart.reduce((acc, item) => acc + (item.unit_price * item.quantity) - item.flat_discount, 0);
  const discountAmount = subTotal * (globalDiscount / 100);
  const netTotal = subTotal - discountAmount;

  // Margin check logic
  const totalCostBasis = cart.reduce((acc, item) => acc + (item.purchase_price * item.quantity), 0);
  const netMargin = netTotal - totalCostBasis;

  const handleSubmit = async () => {
    if (cart.length === 0) return alert('Cart is empty!');

    let customer_id = null;
    
    // Register/update customer if coordinates provided
    if (customerName && customerPhone) {
      const custRes = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: customerName, 
          phone: customerPhone,
          group_tag: customerGroupTag,
          dob: customerDob || null
        })
      });
      const custData = await custRes.json();
      if (custData.id) {
        customer_id = custData.id;
      } else {
        const searchRes = await fetch(`/api/customers/search?q=${customerPhone}`);
        const sData = await searchRes.json();
        if (sData.length > 0) customer_id = sData[0].id;
      }
    }

    try {
      const salePayload = {
        customer_id,
        discount_percentage: globalDiscount,
        // Backend expects { sku, quantity, flat_discount } for SQL transactional stock updates
        items: cart.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          flat_discount: item.flat_discount
        }))
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setCompletedSale({
          sale_id: data.sale_id,
          customerName,
          customerPhone,
          netTotal,
          items: [...cart],
          globalDiscount
        });
        
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerDob('');
        setCustomerGroupTag('General');
        setGlobalDiscount(0);
        // Refresh products catalog stock count
        fetch('/api/products').then(r => r.json()).then(setProducts);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting sale');
    }
  };

  const generatePDF = () => {
    if (!completedSale) return;
    const doc = new jsPDF();
    
    // Theme Colors
    const primaryColor = [11, 12, 16]; // Jet black
    const accentColor = [197, 160, 89]; // Gold #C5A059
    
    // Header Branding
    doc.setFillColor(11, 12, 16);
    doc.rect(0, 0, 210, 35, 'F'); // Dark background banner
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(197, 160, 89);
    doc.text("HUMJOLI ETHNIC", 20, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    doc.text("PREMIUM MEN'S WEAR, SAFA & CUSTOM TAILORING", 20, 29);
    
    // Add Local network sync QR Code to top right
    try {
      const canvas = document.getElementById('invoice-qr-canvas');
      if (canvas) {
        const qrDataUrl = canvas.toDataURL('image/png');
        doc.addImage(qrDataUrl, 'PNG', 160, 5, 25, 25);
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text("Scan for Shop Sync", 172.5, 32, null, null, "center");
      }
    } catch (e) {
      console.error("Failed to add QR to PDF", e);
    }
    
    // Invoice Metadata
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Invoice Reference: HS-INV-${completedSale.sale_id}`, 20, 50);
    doc.text(`Billing Date: ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`, 130, 50);
    
    // Horizontal divider
    doc.setDrawColor(220, 220, 220);
    doc.line(20, 55, 190, 55);
    
    // Customer Info
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 12, 16);
    doc.text("CUSTOMER DETAILS", 20, 65);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Name: ${completedSale.customerName || 'Walk-in Client'}`, 20, 72);
    if (completedSale.customerPhone) {
      doc.text(`Phone: +91 ${completedSale.customerPhone}`, 20, 78);
    }
    
    // Items Table Headers
    let y = 95;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y - 6, 170, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 12, 16);
    doc.text("SKU & Description", 22, y - 1);
    doc.text("Qty", 100, y - 1);
    doc.text("Unit Price", 125, y - 1);
    doc.text("Discount", 150, y - 1);
    doc.text("Total", 175, y - 1);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y + 2, 190, y + 2);
    
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    
    completedSale.items.forEach(item => {
      doc.setFont("helvetica", "bold");
      doc.text(item.name, 22, y);
      doc.setFont("helvetica", "normal");
      doc.text(`SKU: ${item.sku}`, 22, y + 4.5);
      
      doc.text(`${item.quantity} ${item.uom}`, 100, y);
      doc.text(`Rs ${item.unit_price.toFixed(2)}`, 125, y);
      doc.text(`Rs ${item.flat_discount.toFixed(2)}`, 150, y);
      
      const lineTotal = (item.unit_price * item.quantity) - item.flat_discount;
      doc.text(`Rs ${lineTotal.toFixed(2)}`, 175, y);
      
      y += 12;
    });
    
    doc.line(20, y - 4, 190, y - 4);
    
    // Totals block
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    
    const subVal = completedSale.items.reduce((acc, item) => acc + (item.unit_price * item.quantity) - item.flat_discount, 0);
    doc.text("Sub Total:", 125, y);
    doc.text(`Rs ${subVal.toFixed(2)}`, 175, y);
    
    if (completedSale.globalDiscount > 0) {
      y += 6;
      doc.text(`Global Discount (${completedSale.globalDiscount}%):`, 125, y);
      const discVal = subVal * (completedSale.globalDiscount / 100);
      doc.text(`- Rs ${discVal.toFixed(2)}`, 175, y);
    }
    
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(197, 160, 89); // Gold
    doc.setFontSize(14);
    doc.text("GRAND TOTAL:", 125, y);
    doc.text(`Rs ${completedSale.netTotal.toFixed(2)}`, 175, y);
    
    // Terms & Footer
    y += 25;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Terms: Custom tailored apparel cannot be returned or refunded.", 105, y, null, null, "center");
    
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("THANK YOU FOR SHOPPING AT HUMJOLI ETHNIC!", 105, y, null, null, "center");
    
    doc.save(`Invoice_HS_${completedSale.sale_id}.pdf`);
  };

  const sendWhatsApp = () => {
    if (!completedSale || !completedSale.customerPhone) return;
    const text = `Hello ${completedSale.customerName || 'Customer'},\n\nThank you for purchasing from Humjoli Ethnic! Your invoice has been generated.\n\nTotal Amount: ₹${completedSale.netTotal.toFixed(2)}.\n\nWe look forward to serving you again.`;
    const url = `https://wa.me/91${completedSale.customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex gap-6 billing-layout">
      {/* Hidden QR canvas used for PDF embedding offline */}
      <div style={{ display: 'none' }}>
        <QRCodeCanvas value={localIpUrl} id="invoice-qr-canvas" size={128} bgColor="#ffffff" fgColor="#000000" />
      </div>

      {/* Products Catalog Selection */}
      <div className="card flex-col gap-4 billing-catalog" style={{ height: 'calc(100vh - 5rem)', overflowY: 'auto' }}>
        <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
              <ShoppingCart size={22} style={{ color: 'var(--accent-primary)' }} />
              SKU Catalog
            </h2>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Select products to add to current checkout invoice.</p>
          </div>
          <div style={{ width: '220px', position: 'relative' }}>
            <input 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem 1rem', paddingRight: '2rem', fontSize: '0.85rem' }}
            />
            <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ padding: '0.5rem 0' }}>
          {filteredProducts.map(p => {
            const isOutOfStock = p.current_stock <= 0;
            return (
              <div 
                key={p.id} 
                className="card" 
                style={{ 
                  padding: '1.25rem', 
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer', 
                  borderColor: isOutOfStock ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-color)',
                  opacity: isOutOfStock ? 0.6 : 1,
                  background: isOutOfStock ? 'rgba(239, 68, 68, 0.02)' : 'rgba(255,255,255,0.02)'
                }} 
                onClick={() => !isOutOfStock && addToCart(p)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold" style={{ fontSize: '1rem', letterSpacing: '-0.01em' }}>{p.name}</h3>
                  <span className="badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--bg-tertiary)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                    {p.sku}
                  </span>
                </div>
                <div className="flex justify-between items-center" style={{ marginTop: '1rem' }}>
                  <span className="font-bold" style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>₹{p.selling_price}/{p.uom}</span>
                  <span className={`badge ${p.current_stock <= 10 ? 'badge-danger' : 'badge-success'}`}>
                    Stock: {p.current_stock}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className="text-muted text-center" style={{ gridColumn: 'span 2', padding: '4rem 0' }}>No matching items in stock registry.</p>
          )}
        </div>
      </div>

      {/* POS Billing side summary */}
      <div className="card flex-col billing-checkout" style={{ height: 'calc(100vh - 5rem)', padding: '2rem' }}>
        <h2 className="text-2xl font-bold" style={{ marginBottom: '1.25rem', letterSpacing: '-0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Checkout</h2>
        
        {/* Customer Profiles CRM Info */}
        <div className="flex-col gap-3" style={{ marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <input 
              placeholder="Contact Phone (10 digits)" 
              value={customerPhone}
              onChange={handlePhoneChange}
              style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
            />
            <UserCheck size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
          </div>
          <input 
            placeholder="Client Legal Name" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{ fontSize: '0.9rem' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={customerGroupTag} onChange={e => setCustomerGroupTag(e.target.value)} style={{ fontSize: '0.85rem' }}>
              <option value="General">General Group</option>
              <option value="Hindu">Hindu Audience</option>
              <option value="Muslim">Muslim Audience</option>
            </select>
            <input 
              type="date" 
              value={customerDob} 
              onChange={e => setCustomerDob(e.target.value)} 
              title="Date of Birth"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
            />
          </div>
        </div>

        {/* Dynamic Cart Summary */}
        <div className="flex-col gap-4" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {cart.map((item, i) => (
            <div key={i} className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '0.75rem' }}>
              <div className="flex justify-between items-center font-bold">
                <span style={{ fontSize: '0.95rem' }}>{item.name}</span>
                <button onClick={() => removeCartItem(i)} className="text-danger" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
              <div className="flex gap-3 items-center" style={{ marginTop: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>Qty ({item.uom})</label>
                  <input type="number" step="0.01" min="0.01" max={item.current_stock} value={item.quantity} onChange={(e) => updateCartItem(i, 'quantity', e.target.value)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>Disc (₹)</label>
                  <input type="number" step="1" min="0" value={item.flat_discount} onChange={(e) => updateCartItem(i, 'flat_discount', e.target.value)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} />
                </div>
              </div>
              <div className="text-right font-bold" style={{ marginTop: '0.75rem', color: 'var(--accent-primary)' }}>
                ₹ {((item.unit_price * item.quantity) - item.flat_discount).toFixed(2)}
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="flex-col items-center justify-center text-center text-muted" style={{ padding: '3rem 1rem' }}>
              <ShoppingCart size={32} style={{ marginBottom: '0.5rem', color: 'var(--border-color)' }} />
              <p style={{ fontSize: '0.9rem' }}>Invoice cart is empty.</p>
            </div>
          )}
        </div>

        {/* Real-time Business Intelligence Margin Indicator */}
        {cart.length > 0 && (
          <div className="card flex items-center justify-between" style={{ padding: '0.75rem 1rem', background: 'rgba(197, 160, 89, 0.04)', borderColor: 'rgba(197, 160, 89, 0.2)', marginBottom: '1rem', borderRadius: '0.5rem' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
              <TrendingUp size={16} />
              <span>Real-time Margin Check:</span>
            </div>
            <span className={`font-bold ${netMargin >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.95rem' }}>
              ₹ {netMargin.toFixed(2)} ({subTotal > 0 ? ((netMargin / netTotal) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        )}

        {/* Total calculation & submission form */}
        <div style={{ marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <span className="text-muted flex items-center gap-1" style={{ fontSize: '0.9rem' }}>
              <Percent size={14} /> Global Percentage Discount
            </span>
            <input type="number" style={{ width: '80px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', textAlign: 'center' }} value={globalDiscount} onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)} />
          </div>
          
          <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
            <span className="text-muted font-bold" style={{ fontSize: '1rem' }}>Net Amount Due</span>
            <span className="font-bold text-success" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>₹ {netTotal.toFixed(2)}</span>
          </div>

          {!completedSale ? (
            <button className="btn btn-primary" style={{ width: '100%', padding: '0.875rem' }} onClick={handleSubmit}>
              Post Transaction
            </button>
          ) : (
            <div className="flex-col gap-2">
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={generatePDF} style={{ padding: '0.75rem' }}>
                  <Printer size={16} /> Invoice PDF
                </button>
                <button className="btn flex-1" style={{ backgroundColor: '#25D366', color: '#0f111a', padding: '0.75rem' }} onClick={sendWhatsApp}>
                  <MessageCircle size={16} /> WhatsApp
                </button>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }} onClick={() => setCompletedSale(null)}>
                Open New Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
