import React, { useState, useEffect } from 'react';
import { Search, Filter, ClipboardList, Eye, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const AllOrders = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [factoryUnits, setFactoryUnits] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printData, setPrintData] = useState(null);
  const [searchQuery, setSearchQuery] = useState(location.state?.search || '');
  const [activeFilter, setActiveFilter] = useState(location.state?.filter || 'All'); // 'All', 'In workshop', 'Ready for trial', 'Delivered', "Today's Orders"
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    fetchFactoryUnits();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFactoryUnits = async () => {
    try {
      const res = await fetch('/api/factory-units');
      const data = await res.json();
      setFactoryUnits(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignFactoryUnit = async (order, unitId) => {
    if (!unitId) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: order.status, 
          manager_id: unitId 
        })
      });
      if (res.ok) {
        const unit = factoryUnits.find(u => u.id == unitId);
        if (window.confirm(`Assigned to ${unit.name} (Unit ${unit.workshop_number}). Send specifications to factory unit via WhatsApp?`)) {
          sendToFactoryWhatsapp(order, unit);
        }
        fetchOrders(); // Refresh table
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateDate = async (orderId, field, value) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/update-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value })
      });
      if (res.ok) {
        fetchOrders();
      } else {
        alert("Failed to update date");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const generateJobSlipPDF = (order, unit) => {
    setPrintData({ order, unit });
    
    // Give React time to render the hidden DOM element
    setTimeout(async () => {
      const element = document.getElementById(`print-job-slip`);
      if (element) {
        try {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          
          const doc = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          doc.save(`Factory_Job_Slip_${order.id}.pdf`);
        } catch (e) {
          console.error("PDF Generation failed", e);
        }
      }
      setPrintData(null);
    }, 500);
  };

  const generateCustomerInvoicePDF = (order) => {
    const doc = new jsPDF();

    // Header styling
    doc.setFillColor(224, 90, 16); // Copper/Orange brand color
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("CHACHAJI UDYOG", 105, 20, { align: "center" });
    
    doc.setTextColor(245, 245, 245);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Premium Gas Stoves, Burners & Bhatti Manufacturer", 105, 28, { align: "center" });
    
    doc.setTextColor(0, 0, 0);

    // Invoice details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE / BILL", 20, 55);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Order ID: ${order.id}`, 20, 65);
    doc.text(`Date: ${order.booked_date ? new Date(order.booked_date).toLocaleDateString() : 'N/A'}`, 20, 71);
    doc.text(`Delivery Status: ${order.status}`, 20, 77);
    
    doc.text(`Bill To:`, 140, 65);
    doc.setFont("helvetica", "bold");
    doc.text(`${order.customer_name || 'Walk-in Client'}`, 140, 71);
    doc.setFont("helvetica", "normal");
    doc.text(`Phone: ${order.customer_phone || 'N/A'}`, 140, 77);

    const tableColumn = ["Item Description", "Quantity", "Rate (Rs)", "Amount (Rs)"];
    const tableRows = [];

    const items = typeof order.items_json === 'string' ? JSON.parse(order.items_json || '[]') : (order.items_json || []);
    items.forEach((item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty) || 1;
      const total = price * qty;
      tableRows.push([
        item.name || 'Gas Stove/Spare Parts',
        qty.toString(),
        price.toFixed(2),
        total.toFixed(2)
      ]);
    });

    autoTable(doc, {
      startY: 85,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [224, 90, 16], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFillColor(245, 245, 245);
    doc.rect(110, finalY - 5, 80, 45, 'F');

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Sub Total:`, 120, finalY + 2);
    doc.text(`Rs. ${(order.sub_total || 0).toFixed(2)}`, 180, finalY + 2, { align: "right" });
    
    finalY += 8;
    doc.text(`Discount:`, 120, finalY);
    doc.text(`- Rs. ${(order.discount_amount || 0).toFixed(2)}`, 180, finalY, { align: "right" });

    finalY += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total:`, 120, finalY);
    doc.text(`Rs. ${(order.grand_total || 0).toFixed(2)}`, 180, finalY, { align: "right" });
    
    finalY += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Advance Paid:`, 120, finalY);
    doc.text(`Rs. ${(order.advance_paid || 0).toFixed(2)}`, 180, finalY, { align: "right" });

    finalY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69);
    doc.text(`Balance Due:`, 120, finalY);
    doc.text(`Rs. ${(order.balance_due || 0).toFixed(2)}`, 180, finalY, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for choosing Chachaji Udyog!", 105, 280, { align: "center" });

    doc.save(`Chachaji_Udyog_Invoice_${order.id}.pdf`);
  };

  const sendToFactoryWhatsapp = (order, unit) => {
    if (!unit || !unit.mobile_number) {
      alert('Factory Unit does not have a valid contact number.');
      return;
    }

    // Generate and download PDF
    generateJobSlipPDF(order, unit);

    const targetDate = new Date(order.handover_target_date || order.booked_date).toLocaleDateString('en-GB');
    const text = `*नया फैब्रिकेशन ऑर्डर मिला है* 🛠️
Order ID: ${order.id}

Assembly Floor Unit: ${unit.name} (Unit No: ${unit.workshop_number})
कृपया ध्यान दें कि यह कस्टम गैस स्टोव ऑर्डर *${targetDate}* तक पूरा हो जाना चाहिए।

_विवरण और तकनीकी स्पेसिफिकेशन के लिए PDF जॉब स्लिप चेक करें।_`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/91${unit.mobile_number.replace(/\D/g, '')}?text=${encodedText}`;
    setTimeout(() => window.open(whatsappUrl, '_blank'), 1000);
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = orders;

    // Apply Filter
    if (activeFilter !== 'All') {
      if (activeFilter === 'In workshop') {
        result = result.filter(o => o.status?.toLowerCase() === 'in workshop' || o.status?.toLowerCase() === 'workshop' || o.status?.toLowerCase() === 'processing' || o.status?.toLowerCase() === 'in fabrication');
      } else if (activeFilter === 'Ready for trial') {
        result = result.filter(o => o.status?.toLowerCase() === 'ready for trial' || o.status?.toLowerCase() === 'trial ready' || o.status?.toLowerCase() === 'ready to deliver');
      } else if (activeFilter === 'Delivered') {
        result = result.filter(o => o.status?.toLowerCase() === 'delivered');
      } else if (activeFilter === "Today's Orders") {
        const today = new Date().toISOString().split('T')[0];
        result = result.filter(o => {
          if(!o.booked_date) return false;
          return new Date(o.booked_date).toISOString().split('T')[0] === today;
        });
      }
    }

    // Apply Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.customer_phone && o.customer_phone.toLowerCase().includes(q))
      );
    }

    setFilteredOrders(result);
  }, [orders, activeFilter, searchQuery]);

  const filters = ['All', "Today's Orders", 'In workshop', 'Ready for trial', 'Delivered'];

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1>Order Book Ledger</h1>
          <p className="subtext">Manage active fabrications, direct deliveries, and customer ledgers</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex" style={{ flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: '1', minWidth: '250px', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search by Order ID, Name, Phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 48px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
            {filters.map(filter => {
              const isActive = activeFilter === filter;
              const label = filter === 'In workshop' ? 'In Assembly' : filter === 'Ready for trial' ? 'Ready to Deliver' : filter;
              const count = orders.filter(o => {
                if (filter === 'All') return true;
                if (filter === "Today's Orders") {
                   const today = new Date().toISOString().split('T')[0];
                   return o.booked_date && new Date(o.booked_date).toISOString().split('T')[0] === today;
                }
                if (filter === 'In workshop') return o.status?.toLowerCase() === 'in workshop' || o.status?.toLowerCase() === 'workshop' || o.status?.toLowerCase() === 'processing' || o.status?.toLowerCase() === 'in fabrication';
                if (filter === 'Ready for trial') return o.status?.toLowerCase() === 'ready for trial' || o.status?.toLowerCase() === 'trial ready' || o.status?.toLowerCase() === 'ready to deliver';
                if (filter === 'Delivered') return o.status?.toLowerCase() === 'delivered';
                return false;
              }).length;

              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className="btn-secondary flex items-center gap-2"
                  style={{
                    backgroundColor: isActive ? 'var(--accent-gold)' : 'var(--surface-light)',
                    color: isActive ? 'var(--accent-text)' : 'var(--text-primary)',
                    borderColor: isActive ? 'var(--accent-gold)' : 'var(--border-color)',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem'
                  }}
                >
                  {filter === 'All' && <ClipboardList size={16} />}
                  {label}
                  <span className="badge" style={{ 
                    backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'var(--bg-color)', 
                    color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                    marginLeft: '4px'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card table-wrapper">
        {isLoading ? (
          <div className="flex justify-center items-center" style={{ padding: '3rem' }}>
            <p className="subtext">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <ClipboardList size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
            <p className="subtext">No orders found matching your criteria.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Floor Worker/Unit</th>
                <th>Technical Specs</th>
                {activeFilter === 'In workshop' && <th>Assembly Finish Date</th>}
                {activeFilter === 'Ready for trial' && <th>Delivery Date</th>}
                <th>Total Amount</th>
                <th>Discount</th>
                <th>Invoice</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} style={!order.manager_id && order.status !== 'Delivered' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } : {}}>
                  <td style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{order.id}</td>
                  <td>{order.booked_date ? new Date(order.booked_date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{order.customer_name}</div>
                    <div className="subtext" style={{ fontSize: '0.75rem' }}>{order.customer_phone}</div>
                  </td>
                  <td>
                    {order.status === 'Delivered' ? (
                       <span className="text-muted">{factoryUnits.find(m => m.id == order.manager_id)?.name || 'Direct / Counter'}</span>
                    ) : (
                      <select 
                        className="form-input" 
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          fontSize: '0.8rem', 
                          borderColor: order.manager_id ? 'var(--border-color)' : 'var(--accent-gold)', 
                          minWidth: '130px',
                          backgroundColor: order.manager_id ? 'transparent' : 'rgba(245, 158, 11, 0.05)'
                        }}
                        onChange={(e) => handleAssignFactoryUnit(order, e.target.value)}
                        value={order.manager_id || ""}
                      >
                        <option value="" disabled>Assign Floor Unit</option>
                        {factoryUnits.filter(m => m.is_active !== 0 || m.id == order.manager_id).map(m => (
                          <option key={m.id} value={m.id}>{m.name} (U-{m.workshop_number})</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => generateJobSlipPDF(order, factoryUnits.find(m => m.id == order.manager_id) || { name: 'Not Assigned', workshop_number: '-' })} 
                      className="btn-secondary" 
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <ClipboardList size={14} /> Spec Sheet
                    </button>
                  </td>
                  {activeFilter === 'In workshop' && (
                    <td>
                      <input 
                        type="date" 
                        className="form-input" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'transparent', minWidth: '130px' }}
                        value={order.handover_target_date ? order.handover_target_date.split('T')[0] : ''}
                        onChange={(e) => handleUpdateDate(order.id, 'handover_target_date', e.target.value)}
                      />
                    </td>
                  )}
                  {activeFilter === 'Ready for trial' && (
                    <td>
                      <input 
                        type="date" 
                        className="form-input" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'transparent', minWidth: '130px' }}
                        value={order.delivery_date ? order.delivery_date.split('T')[0] : ''}
                        onChange={(e) => handleUpdateDate(order.id, 'delivery_date', e.target.value)}
                      />
                    </td>
                  )}
                  <td style={{ fontWeight: '600' }}>₹{(order.grand_total || 0).toLocaleString()}</td>
                  <td>
                    {order.discount_amount > 0 ? (
                      <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '500' }}>
                        -₹{order.discount_amount.toLocaleString()}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <button onClick={() => generateCustomerInvoicePDF(order)} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileText size={14} /> Download
                    </button>
                  </td>
                  <td>
                    <span className={order.status === 'Delivered' ? 'badge badge-success' : 'badge'} style={{
                      backgroundColor: (order.status === 'Ready for trial' || order.status === 'Ready to Deliver') ? 'rgba(59, 130, 246, 0.15)' : 
                                       order.status === 'Delivered' ? undefined : 'rgba(224, 90, 16, 0.15)',
                      color: (order.status === 'Ready for trial' || order.status === 'Ready to Deliver') ? '#3b82f6' : 
                             order.status === 'Delivered' ? undefined : '#e05a10',
                      border: (order.status === 'Ready for trial' || order.status === 'Ready to Deliver') ? '1px solid rgba(59, 130, 246, 0.4)' : 
                              order.status === 'Delivered' ? undefined : '1px solid rgba(224, 90, 16, 0.4)'
                    }}>
                      {order.status === 'Ready for trial' ? 'Ready to Deliver' : order.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Hidden Job Slip DOM for HTML2Canvas */}
      {printData && (
        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', width: '800px', backgroundColor: 'white' }}>
          <div id="print-job-slip" style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: 'black', background: 'white' }}>
            <div style={{ backgroundColor: '#e05a10', color: 'white', textAlign: 'center', padding: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '24px' }}>CUSTOM GAS STOVE FABRICATION SLIP</h1>
              <p style={{ margin: '5px 0 0 0', color: 'white' }}>Chachaji Udyog - Assembly Floor</p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '14px' }}>
              <div>
                <p style={{ margin: '0 0 8px 0' }}><strong>Order ID:</strong> <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{printData.order.id}</span></p>
                <p style={{ margin: 0 }}>Assigned Date: {new Date().toLocaleDateString()}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Factory Unit:</strong> <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{printData.unit.name} (Unit No: {printData.unit.workshop_number})</span></p>
                <p style={{ margin: 0 }}>Target Assembly Finish: {new Date(printData.order.handover_target_date || printData.order.booked_date).toLocaleDateString()}</p>
              </div>
            </div>

            <h2 style={{ marginTop: '30px', fontSize: '18px', borderBottom: '2px solid #e05a10', paddingBottom: '10px', color: '#000', fontWeight: 'bold' }}>Items to Assemble</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', color: '#000' }}>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Item Name / SKU</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const items = typeof printData.order.items_json === 'string' ? JSON.parse(printData.order.items_json || '[]') : (printData.order.items_json || []);
                  return items.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>{idx + 1}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>{item.name || 'Gas Stove/ Bhatti'}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>{item.qty} pcs</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>

            <h2 style={{ marginTop: '40px', fontSize: '18px', borderBottom: '2px solid #e05a10', paddingBottom: '10px', color: '#000', fontWeight: 'bold' }}>Technical Fabrication Specifications</h2>
            
            {(() => {
              const specs = typeof printData.order.measurements_json === 'string' ? JSON.parse(printData.order.measurements_json || '{}') : (printData.order.measurements_json || {});
              const hasSpecs = specs.dimensions || specs.burnerType || specs.bodyMaterial || specs.regulatorType || specs.instructions;
              
              if (!hasSpecs) {
                 return <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>Standard Stove Model (No custom specs requested)</p>;
              }
              
              return (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9', width: '200px' }}>Custom Dimensions</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '15px' }}>{specs.dimensions || 'Standard Model Size'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Burner Heads Type</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '15px', fontWeight: 'bold', color: '#e05a10' }}>{specs.burnerType || 'Standard Burners'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Body / Panel Material</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '15px' }}>{specs.bodyMaterial || 'Stainless Steel'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Regulator & Safety Type</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '15px' }}>{specs.regulatorType || 'Standard Regulator'}</td>
                      </tr>
                      {specs.instructions && (
                        <tr>
                          <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Special Instructions</td>
                          <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', whiteSpace: 'pre-line', color: '#333' }}>{specs.instructions}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllOrders;
