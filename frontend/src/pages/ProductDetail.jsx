import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, ChevronDown, Flame, CheckCircle, Package, ShieldCheck, Truck, Sparkles, Mail, MapPin } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('7300070513');
  const [activeDropdown, setActiveDropdown] = useState(false);

  // Form State
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'Product Purchase',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Fetch product details
    fetch(`/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then(data => {
        setProduct(data);
        setLoading(false);
        // Prefill form message
        setLeadForm(prev => ({
          ...prev,
          message: `Namskar, Mujhe aapke product "${data.name}" (SKU: ${data.sku}) ke bare me enquiry krni he.`
        }));
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Fetch settings for WhatsApp number
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
      })
      .catch(err => console.error("Error fetching settings", err));
  }, [id]);

  const handleWhatsAppEnquiry = (type) => {
    if (!product) return;
    let message = '';
    const formattedNumber = whatsappNumber.startsWith('91') ? whatsappNumber : `91${whatsappNumber}`;
    
    if (type === 'single') {
      message = `Namskar, Mujhe ${product.name} (SKU: ${product.sku}) purchase krna he.`;
    } else if (type === 'bulk') {
      message = `Namskar, Mujhe ${product.name} (SKU: ${product.sku}) ki B2B rate ke bare me discuss krna he.`;
    } else {
      message = `Namskar, Mujhe ${product.name} (SKU: ${product.sku}) ke bare me general enquiry krni he.`;
    }

    const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setActiveDropdown(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.phone) {
      alert("Name and Phone are required.");
      return;
    }
    setSubmitting(true);
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadForm)
    })
      .then(res => res.json())
      .then(data => {
        setSubmitting(false);
        if (data.success) {
          setSubmitted(true);
          setTimeout(() => {
            setSubmitted(false);
            setLeadForm(prev => ({ ...prev, name: '', phone: '', email: '' }));
          }, 3000);
        } else {
          alert("Error sending message. Please try again.");
        }
      })
      .catch(err => {
        setSubmitting(false);
        console.error(err);
        alert("Server error. Please try again.");
      });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#64748b' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(180, 83, 9, 0.2)', borderTopColor: '#b45309', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', fontWeight: '600' }}>Loading product details...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#64748b', padding: '2rem' }}>
        <Flame size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Product Not Found</h3>
        <p style={{ fontSize: '0.95rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>The product you are looking for does not exist or has been deleted.</p>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: '#b45309', border: 'none', borderRadius: '6px', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back to Catalog
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#475569', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        
        /* Modern Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #F8FAFC;
        }
        ::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #1B0A64;
        }

        .pd-social-link {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1B0A64;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .pd-social-link:hover {
          background-color: #D8231A;
          color: #FFFFFF;
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(216, 35, 26, 0.3);
        }
        .pd-footer-link {
          color: #CBD5E1;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
          font-size: 0.88rem;
          display: inline-block;
          margin-bottom: 0.6rem;
        }
        .pd-footer-link:hover {
          color: #D8231A;
          padding-left: 4px;
        }
        .pd-public-input {
          background-color: #FFFFFF !important;
          color: #1E293B !important;
          border: 1px solid #E2E8F0 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
          width: 100%;
          padding: 0.75rem !important;
          border-radius: 4px !important;
          font-size: 0.875rem !important;
          outline: none !important;
          font-family: 'Inter', sans-serif !important;
          transition: all 0.3s ease !important;
        }
        .pd-public-input::placeholder {
          color: #94A3B8 !important;
          opacity: 1 !important;
        }
        .pd-public-input:focus {
          border-color: #1B0A64 !important;
          box-shadow: 0 0 0 2px rgba(27,10,100,0.1) !important;
        }
        .pd-product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 3rem;
          align-items: start;
        }
        .pd-footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 3rem;
          margin-bottom: 3rem;
        }
        .pd-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .pd-image-sticky {
          position: sticky;
          top: 110px;
          transition: all 0.3s ease;
        }
        .btn-brass {
          background-color: #1B0A64;
          color: #FFFFFF;
          border: none;
          border-radius: 4px;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .btn-brass:hover {
          background-color: #D8231A;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(216, 35, 26, 0.2);
        }
        .btn-brass:active {
          transform: translateY(0);
        }
        .btn-whatsapp-premium {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.9rem;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border: none;
          border-radius: 10px;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-whatsapp-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.45);
        }
        .wa-dropdown-menu {
          position: absolute;
          top: 105%;
          left: 0;
          right: 0;
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          z-index: 200;
          overflow: hidden;
          animation: waSlideDown 0.25s ease;
        }
        @keyframes waSlideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .wa-dropdown-item {
          width: 100%;
          padding: 0.85rem 1.5rem;
          text-align: left;
          background: none;
          border: none;
          border-bottom: 1px solid #F1F5F9;
          font-size: 0.88rem;
          color: #475569;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .wa-dropdown-item:hover {
          background-color: #F8FAFC;
          color: #1B0A64;
          padding-left: 1.75rem;
        }
        .back-catalog-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 4px;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }
        .back-catalog-btn:hover {
          background-color: #1B0A64;
          border-color: #1B0A64;
          color: #FFFFFF;
          transform: translateX(-3px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        @media (max-width: 768px) {
          .pd-product-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          .pd-footer-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 1.5rem !important; }
          .pd-form-row { grid-template-columns: 1fr !important; }
          .pd-image-sticky { position: relative !important; top: auto !important; }
          .pd-header-pad { padding: 0.75rem 1rem !important; }
          .pd-main-pad { padding: 0 1rem !important; margin-top: 1.5rem !important; }
          .pd-footer-pad { padding: 3rem 1rem 2rem 1rem !important; }
        }
        @media (max-width: 480px) {
          .pd-footer-grid { grid-template-columns: 1fr !important; }
          .pd-product-h1 { font-size: 1.4rem !important; }
        }
        @keyframes pd-spin { to { transform: rotate(360deg); } }
      `}</style>
      
      {/* Top Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          {/* Logo Section */}
          <div onClick={() => navigate('/')} style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <img 
              src="/Chachaji Udyog Logo.png" 
              alt="Chachaji Udyog Logo" 
              style={{ height: '40px', objectFit: 'contain' }}
            />
          </div>

          <button 
            onClick={() => navigate('/')} 
            className="back-catalog-btn"
          >
            <ArrowLeft size={14} /> Back to Catalog
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pd-main-pad" style={{ maxWidth: '1200px', margin: '2.5rem auto 0 auto', padding: '0 2rem' }}>
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: '#64748B', marginBottom: '1.5rem' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span>
          <span>&gt;</span>
          <span>Catalog</span>
          <span>&gt;</span>
          <span style={{ color: '#D8231A', fontWeight: '600' }}>{product.category}</span>
        </div>

        {/* Product Details Grid */}
        <div className="pd-product-grid">
          
          {/* Left Column: Image Block */}
          <div className="pd-image-sticky" style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              height: '380px',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {product.image ? (
                <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94A3B8' }}>
                  <Flame size={64} color="#D8231A" />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Image Available in Showroom</span>
                </div>
              )}
            </div>

            {/* Quality assurances */}
            <div style={{ display: 'flex', borderTop: '1px solid #E2E8F0', padding: '1rem', backgroundColor: '#F8FAFC', justifyContent: 'space-around', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#475569', fontWeight: '500' }}>
                <ShieldCheck size={16} color="#D8231A" /> Leak Tested
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#475569', fontWeight: '500' }}>
                <Package size={16} color="#D8231A" /> Secure Packing
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#475569', fontWeight: '500' }}>
                <Truck size={16} color="#D8231A" /> Direct Delivery
              </div>
            </div>
          </div>

          {/* Right Column: Specification & Enquiry Forms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Info details card */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '2.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)' }}>
              <span style={{
                display: 'inline-block',
                backgroundColor: '#F1F5F9',
                color: '#1B0A64',
                border: '1px solid #E2E8F0',
                padding: '0.4rem 1rem',
                borderRadius: '50px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.75rem'
              }}>
                {product.category}
              </span>
              <h1 style={{ fontSize: '1.85rem', fontFamily: "'Poppins', sans-serif", fontWeight: '700', color: '#1B0A64', lineHeight: '1.2', marginBottom: '0.5rem' }}>
                {product.name}
              </h1>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>SKU: <strong>{product.sku}</strong></span>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#CBD5E1', borderRadius: '50%' }} />
                <span style={{ fontSize: '0.85rem', color: product.total_stock > 0 ? '#059669' : '#D97706', fontWeight: '600' }}>
                  {product.total_stock > 0 ? `In Stock (${product.total_stock} Units)` : 'Available on Order'}
                </span>
              </div>

              {/* Price Block */}
              <div style={{
                backgroundColor: '#F8FAFC',
                padding: '1.25rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: '600' }}>Retail Selling Price</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#D8231A' }}>
                    ₹{product.retail_price ? product.retail_price.toLocaleString('en-IN') : 'N/A'}
                  </span>
                </div>

                {product.wholesale_price > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: '600' }}>Wholesale Price (B2B)</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1B0A64' }}>
                      ₹{product.wholesale_price.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Specs List */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1B0A64', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Product Specifications
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #E2E8F0', fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748B' }}>Category Type</span>
                    <span style={{ fontWeight: '500', color: '#1E293B' }}>{product.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #E2E8F0', fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748B' }}>Burner Subcategory</span>
                    <span style={{ fontWeight: '500', color: '#1E293B' }}>{product.subcategory || 'Standard Heavy Duty'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #E2E8F0', fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748B' }}>Body Material</span>
                    <span style={{ fontWeight: '500', color: '#1E293B' }}>High-Grade Cast Iron / Stainless Steel Frame</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #E2E8F0', fontSize: '0.875rem' }}>
                    <span style={{ color: '#64748B' }}>Fuel Compatibility</span>
                    <span style={{ fontWeight: '500', color: '#1E293B' }}>LPG (Gas Cylinder) / PNG Pipeline</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Dropdown CTA */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setActiveDropdown(!activeDropdown)}
                  className="btn-whatsapp-premium"
                >
                  <Phone size={18} />
                  WhatsApp Inquiry Options
                  <ChevronDown size={16} style={{ marginLeft: 'auto' }} />
                </button>

                {activeDropdown && (
                  <div className="wa-dropdown-menu">
                    <button 
                      onClick={() => handleWhatsAppEnquiry('single')}
                      className="wa-dropdown-item"
                    >
                      Single Piece Enquiry
                    </button>
                    <button 
                      onClick={() => handleWhatsAppEnquiry('bulk')}
                      className="wa-dropdown-item"
                    >
                      How much do you want (Bulk Wholesale)
                    </button>
                    <button 
                      onClick={() => handleWhatsAppEnquiry('general')}
                      className="wa-dropdown-item"
                    >
                      General Enquiry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Email Inquiry / Lead Capture form */}
            <div style={{ backgroundColor: '#F1F5F9', padding: '2rem', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Sparkles size={18} color="#D8231A" />
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1B0A64', margin: 0 }}>
                  Send Message directly to Admin
                </h4>
              </div>

              {submitted ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <CheckCircle size={40} color="#059669" style={{ margin: '0 auto 0.5rem auto' }} />
                  <h5 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1B0A64' }}>Message Sent!</h5>
                  <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Admin will get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Your Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter name"
                      value={leadForm.name}
                      onChange={e => setLeadForm({ ...leadForm, name: e.target.value })}
                      className="pd-public-input"
                    />
                  </div>

                  <div className="pd-form-row">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Phone Number *</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="Enter phone"
                        value={leadForm.phone}
                        onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                        className="pd-public-input"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Email (Optional)</label>
                      <input 
                        type="email" 
                        placeholder="your@email.com"
                        value={leadForm.email}
                        onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                        className="pd-public-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Details / Requirements</label>
                    <textarea 
                      rows="3"
                      value={leadForm.message}
                      onChange={e => setLeadForm({ ...leadForm, message: e.target.value })}
                      className="pd-public-input"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="btn-brass"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '4px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    {submitting ? "Sending..." : "Submit Inquiry"}
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="pd-footer-pad" style={{
        backgroundColor: '#1B0A64',
        color: '#E2E8F0',
        padding: '5rem 2rem 2.5rem 2rem',
        borderTop: '1px solid #E2E8F0',
        fontSize: '0.85rem',
        marginTop: '5rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {/* Main 4-Column Grid */}
          <div className="pd-footer-grid">
            
            {/* Column 1: Brand details & Social Icons */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Flame size={24} color="#D8231A" />
                <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#FFFFFF', letterSpacing: '0.5px', fontFamily: "'Poppins', sans-serif" }}>CHACHAJI UDYOG</span>
              </div>
              <p style={{ lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#CBD5E1' }}>
                Pioneering high-efficiency, certified commercial gas bhattis, domestic stoves, and pipeline fittings since 1998.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span className="pd-social-link" onClick={() => window.open('https://facebook.com', '_blank')} title="Facebook">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </span>
                <span className="pd-social-link" onClick={() => window.open('https://instagram.com', '_blank')} title="Instagram">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </span>
                <span className="pd-social-link" onClick={() => window.open('https://linkedin.com', '_blank')} title="LinkedIn">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                </span>
                <span className="pd-social-link" onClick={() => window.open('https://youtube.com', '_blank')} title="YouTube">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z"/><path d="m10 15 5-3-5-3z"/></svg>
                </span>
                <span className="pd-social-link" onClick={() => window.open('https://chachajiudyog.in', '_blank')} title="Website">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                </span>
              </div>
            </div>

            {/* Column 2: Products Catalog links */}
            <div>
              <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product Catalog</h4>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="pd-footer-link" onClick={() => navigate('/')}>Single Burner Stoves</span>
                <span className="pd-footer-link" onClick={() => navigate('/')}>Double Burner Stoves</span>
                <span className="pd-footer-link" onClick={() => navigate('/')}>Three Burner Ranges</span>
                <span className="pd-footer-link" onClick={() => navigate('/')}>Commercial Catering Bhatti</span>
                <span className="pd-footer-link" onClick={() => navigate('/')}>Gas Regulators & Spares</span>
              </div>
            </div>

            {/* Column 3: Services & Support links */}
            <div>
              <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Our Services</h4>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="pd-footer-link" onClick={() => navigate('/')}>Custom Stove Fabrication</span>
                <span className="pd-footer-link" onClick={() => navigate('/')}>Commercial Pipeline Fitting</span>
                <span className="pd-footer-link" onClick={() => navigate('/')}>B2B Wholesale Inquiry</span>
                <span className="pd-footer-link" onClick={() => navigate('/')}>About Company Profile</span>
              </div>
            </div>

            {/* Column 4: Address Details */}
            <div>
              <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Showroom</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <MapPin size={16} color="#D8231A" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>Industrial Area Phase II, Jaipur, Rajasthan, 302012</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={16} color="#D8231A" style={{ flexShrink: 0 }} />
                  <span>+91 {whatsappNumber}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} color="#D8231A" style={{ flexShrink: 0 }} />
                  <span>info@chachajiudyog.in</span>
                </div>
              </div>
            </div>

          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '2rem 0' }} />

          {/* Bottom Bar info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8rem', color: '#CBD5E1' }}>
            <div>
              <span>© 2026 Chachaji Udyog. All Rights Reserved. Manufactured locally with certified burners.</span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#D8231A', color: '#FFFFFF', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                ISO 9001:2015 CERTIFIED
              </span>
              <span>Proprietary Stove ERP Portal V3.0</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default ProductDetail;
