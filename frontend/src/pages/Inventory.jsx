import React, { useState, useEffect } from 'react';
import { Search, Package, Image as ImageIcon } from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleUpdatePrice = async (id, newPrice) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    try {
      const res = await fetch(`/api/products/${id}/selling_price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selling_price: newPrice })
      });
      if (res.ok) {
        setProducts(products.map(p => p.id === id ? { ...p, selling_price: newPrice } : p));
      } else {
        alert('Failed to update price');
      }
    } catch (err) {
      console.error('Error updating price:', err);
      alert('Error updating price');
    }
  };

  const filteredProducts = products.filter(p => 
    (p.sku_takano && p.sku_takano.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.article_name && p.article_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.supplier_name && p.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.invoice_no && p.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading Inventory...</div>;

  return (
    <div className="fade-in">
      <div className={!isMobile ? "flex justify-between items-center" : "flex flex-col gap-4 items-start"} style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-bold" style={{ letterSpacing: '-0.03em', fontSize: isMobile ? '1.8rem' : '1.875rem', margin: 0 }}>Inventory Monitor</h1>
          <p className="text-muted" style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', marginTop: '0.25rem' }}>Track all stock, fabrics, and supplier shipments.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full" style={!isMobile ? { width: 'auto' } : {}}>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <input 
              className="search-input w-full"
              placeholder="Search SKU, Article, Supplier..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 38px', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      </div>

      <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <style>{`
          .compact-inventory th, .compact-inventory td {
             padding: ${isMobile ? '0.5rem 0.5rem' : '1rem'};
          }
        `}</style>
        <table className="compact-inventory" style={{ minWidth: isMobile ? '700px' : '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Img</th>
              <th>SKU (Takano)</th>
              <th>Article Name</th>
              <th>Shade ID</th>
              <th>Quantity (Meters/Pcs)</th>
              <th>Supplier</th>
              <th>Invoice No</th>
              <th>Purchase Rate</th>
              <th>Selling Price</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => (
              <tr key={p.id}>
                <td>
                  {p.shade_image ? (
                    <img src={p.shade_image} alt="Shade" style={{ width: isMobile ? '24px' : '32px', height: isMobile ? '24px' : '32px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ width: isMobile ? '24px' : '32px', height: isMobile ? '24px' : '32px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                      <ImageIcon size={isMobile ? 12 : 14} color="var(--text-muted)" />
                    </div>
                  )}
                </td>
                <td className="font-bold" style={{ color: 'var(--accent-gold)', fontSize: isMobile ? '0.85rem' : '0.95rem' }}>{p.sku_takano}</td>
                <td style={{ fontWeight: 500, fontSize: isMobile ? '0.9rem' : '1rem' }}>{p.article_name}</td>
                <td>
                  <span className="badge badge-secondary">{p.shade_id || 'N/A'}</span>
                </td>
                <td style={{ fontSize: '1.05rem', fontWeight: 600 }}>{p.total_meters}</td>
                <td className="text-muted">{p.supplier_name || 'Unknown'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{p.invoice_no || '-'}</td>
                <td className="text-danger" style={{ fontWeight: 500 }}>₹{p.purchase_rate}</td>
                <td className="text-success" style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span>₹</span>
                    <input 
                      type="number"
                      defaultValue={p.selling_price}
                      onBlur={(e) => {
                        const newPrice = parseFloat(e.target.value);
                        if (newPrice !== p.selling_price) {
                          handleUpdatePrice(p.id, newPrice);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                      style={{
                        width: '70px',
                        padding: '2px 4px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        color: 'inherit',
                        fontWeight: 'inherit',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.border = '1px solid var(--accent-gold)'}
                      onBlurCapture={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.2)'}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '5rem 1rem' }}>
                  <Package size={40} style={{ marginBottom: '1rem', color: 'var(--border-color)', margin: '0 auto' }} />
                  <p>No inventory items matched your query.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
