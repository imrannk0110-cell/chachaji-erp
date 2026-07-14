import React, { useState, useEffect } from 'react';
import { Search, Package, Image as ImageIcon, Edit2, X, Plus } from 'lucide-react';

const CATEGORIES = [
  'Single Stove Burner - SS', 'Single Stove Burner - Iron (MS)', 'Double Stove Burner', 'Three Stove Burner',
  'Four Stove Burner', 'Commercial Burner', 'Regulator', 'Spare Parts'
];

const EMPTY_NEW = {
  sku_takano: '', article_name: '', shade_id: '', total_meters: '',
  purchase_rate: '', selling_price: '', wholesale_price: '',
  supplier_id: '', invoice_no: '', shade_image: null
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_NEW);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProducts = async () => {
    try {
      const [resProd, resSupp] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/suppliers')
      ]);
      const data = await resProd.json();
      const suppData = await resSupp.json();
      setProducts(data);
      setSuppliers(suppData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Image compression utility
  const compressImage = (file, callback) => {
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
        callback(canvas.toDataURL('image/webp', 0.6));
      };
    };
  };

  const handleNewImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, (base64) => setNewProduct(p => ({ ...p, shade_image: base64 })));
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, (base64) => setEditingProduct(p => ({ ...p, shade_image: base64, image: base64 })));
  };

  const handleAddProduct = async () => {
    if (!newProduct.article_name) return alert('Product Name is required.');
    if (!newProduct.sku_takano) return alert('SKU is required.');
    setSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newProduct.sku_takano,
          name: newProduct.article_name,
          category: newProduct.shade_id,
          total_stock: parseInt(newProduct.total_meters) || 0,
          manufacturing_cost: parseFloat(newProduct.purchase_rate) || 0,
          retail_price: parseFloat(newProduct.selling_price) || 0,
          wholesale_price: parseFloat(newProduct.wholesale_price) || parseFloat(newProduct.selling_price) || 0,
          image: newProduct.shade_image || null,
          supplier_id: newProduct.supplier_id || null,
          invoice_no: newProduct.invoice_no || null
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewProduct(EMPTY_NEW);
        fetchProducts();
      } else {
        alert('Failed to add product.');
      }
    } catch (err) {
      console.error(err);
      alert('Server error.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFullProduct = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingProduct,
          sku: editingProduct.sku_takano || editingProduct.sku,
          name: editingProduct.article_name || editingProduct.name,
          category: editingProduct.shade_id || editingProduct.category,
          total_stock: editingProduct.total_meters || editingProduct.total_stock,
          manufacturing_cost: editingProduct.purchase_rate || editingProduct.manufacturing_cost,
          retail_price: editingProduct.selling_price || editingProduct.retail_price,
          wholesale_price: editingProduct.wholesale_price,
          image: editingProduct.shade_image || editingProduct.image
        })
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchProducts();
      } else {
        alert('Failed to update product details');
      }
    } catch (err) {
      console.error('Error updating product:', err);
    }
  };

  const handleUpdatePrice = async (id, field, value) => {
    if (isNaN(value) || value < 0) return;
    const currentProd = products.find(p => p.id === id);
    if (!currentProd) return;
    const payload = {
      retail_price: field === 'retail' ? value : currentProd.retail_price,
      wholesale_price: field === 'wholesale' ? value : currentProd.wholesale_price
    };
    try {
      const res = await fetch(`/api/products/${id}/selling_price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setProducts(products.map(p => p.id === id ? {
          ...p,
          retail_price: payload.retail_price,
          selling_price: payload.retail_price,
          wholesale_price: payload.wholesale_price
        } : p));
      } else {
        alert('Failed to update price');
      }
    } catch (err) {
      console.error('Error updating price:', err);
    }
  };

  const filteredProducts = products.filter(p =>
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.supplier_name && p.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.invoice_no && p.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading Inventory...</div>;

  // Shared form fields component used in both Add and Edit modals
  const renderFormFields = (data, setData, imageHandler) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="form-group">
        <label className="form-label">Product Name *</label>
        <input type="text" className="form-input w-full" placeholder="e.g. Single Stove Burner (SS)" value={data.article_name || ''} onChange={e => setData(p => ({ ...p, article_name: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">SKU Code *</label>
        <input type="text" className="form-input w-full" placeholder="e.g. ST-001" value={data.sku_takano || ''} onChange={e => setData(p => ({ ...p, sku_takano: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-input w-full" value={data.shade_id || ''} onChange={e => setData(p => ({ ...p, shade_id: e.target.value }))}>
          <option value="">-- Select Category --</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Stock Quantity (Pcs)</label>
        <input type="number" className="form-input w-full" placeholder="0" value={data.total_meters || ''} onChange={e => setData(p => ({ ...p, total_meters: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Mfg. Cost / Base Cost (₹)</label>
        <input type="number" className="form-input w-full" placeholder="0" value={data.purchase_rate || ''} onChange={e => setData(p => ({ ...p, purchase_rate: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Retail Price B2C (₹)</label>
        <input type="number" className="form-input w-full" placeholder="0" value={data.selling_price || ''} onChange={e => setData(p => ({ ...p, selling_price: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Wholesale Price B2B (₹)</label>
        <input type="number" className="form-input w-full" placeholder="0" value={data.wholesale_price || ''} onChange={e => setData(p => ({ ...p, wholesale_price: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Supplier</label>
        <select className="form-input w-full" value={data.supplier_id || ''} onChange={e => setData(p => ({ ...p, supplier_id: e.target.value }))}>
          <option value="">-- No Supplier --</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Invoice No</label>
        <input type="text" className="form-input w-full" placeholder="e.g. INV-1001" value={data.invoice_no || ''} onChange={e => setData(p => ({ ...p, invoice_no: e.target.value }))} />
      </div>

      {/* Image Upload */}
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label className="form-label">Product Image</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
            padding: '0.5rem 1rem', borderRadius: '6px', border: '1px dashed var(--border-color)',
            color: 'var(--text-secondary)', fontSize: '0.85rem', transition: 'border-color 0.2s'
          }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <ImageIcon size={16} />
            <span>Upload Photo</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={imageHandler} />
          </label>
          {(data.shade_image || data.image) && (
            <img
              src={data.shade_image || data.image}
              alt="Preview"
              style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--accent-gold)' }}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div className={!isMobile ? "flex justify-between items-center" : "flex flex-col gap-4 items-start"} style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-bold" style={{ letterSpacing: '-0.03em', fontSize: isMobile ? '1.8rem' : '1.875rem', margin: 0 }}>Gas Stove Inventory</h1>
          <p className="text-muted" style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', marginTop: '0.25rem' }}>Track all burner stocks, components, regulators, and supplier invoices.</p>
        </div>

        <div className="flex items-center gap-3" style={!isMobile ? { width: 'auto' } : { width: '100%' }}>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <input
              className="search-input w-full"
              placeholder="Search SKU, Name, Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 38px', fontSize: '0.9rem' }}
            />
          </div>

          {/* ADD BUTTON */}
          <button
            onClick={() => { setNewProduct(EMPTY_NEW); setShowAddModal(true); }}
            className="btn-primary flex items-center gap-2"
            style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="compact-inventory" style={{ minWidth: isMobile ? '800px' : '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Img</th>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Stock (Pieces)</th>
              <th>Supplier</th>
              <th>Invoice No</th>
              <th>Mfg. Cost (Base)</th>
              <th>Retail Price (B2C)</th>
              <th>Wholesale Price (B2B)</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => (
              <tr key={p.id}>
                <td>
                  {p.image ? (
                    <img src={p.image} alt="Product" style={{ width: isMobile ? '24px' : '32px', height: isMobile ? '24px' : '32px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ width: isMobile ? '24px' : '32px', height: isMobile ? '24px' : '32px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                      <ImageIcon size={isMobile ? 12 : 14} color="var(--text-muted)" />
                    </div>
                  )}
                </td>
                <td className="font-bold" style={{ color: 'var(--accent-gold)', fontSize: isMobile ? '0.85rem' : '0.95rem' }}>{p.sku}</td>
                <td style={{ fontWeight: 500, fontSize: isMobile ? '0.9rem' : '1rem' }}>{p.name}</td>
                <td><span className="badge badge-secondary">{p.category || 'Spare Parts'}</span></td>
                <td style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: p.total_stock > 10 ? 'rgba(46,160,67,0.1)' : 'rgba(248,81,73,0.1)',
                    color: p.total_stock > 10 ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {p.total_stock} pcs
                  </span>
                </td>
                <td className="text-muted">{p.supplier_name || 'Direct Procurement'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{p.invoice_no || '-'}</td>
                <td className="text-danger" style={{ fontWeight: 500 }}>₹{p.manufacturing_cost}</td>

                {/* Retail price inline editor */}
                <td className="text-success" style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span>₹</span>
                    <input
                      type="number"
                      defaultValue={p.retail_price}
                      onBlur={(e) => {
                        const newPrice = parseFloat(e.target.value);
                        if (newPrice !== p.retail_price) handleUpdatePrice(p.id, 'retail', newPrice);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                      style={{ width: '70px', padding: '2px 4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'inherit', fontWeight: 'inherit', outline: 'none' }}
                    />
                  </div>
                </td>

                {/* Wholesale price inline editor */}
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span>₹</span>
                    <input
                      type="number"
                      defaultValue={p.wholesale_price}
                      onBlur={(e) => {
                        const newPrice = parseFloat(e.target.value);
                        if (newPrice !== p.wholesale_price) handleUpdatePrice(p.id, 'wholesale', newPrice);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                      style={{ width: '70px', padding: '2px 4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'inherit', fontWeight: 'inherit', outline: 'none' }}
                    />
                  </div>
                </td>

                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => setEditingProduct({
                    ...p,
                    sku_takano: p.sku,
                    article_name: p.name,
                    shade_id: p.category,
                    total_meters: p.total_stock,
                    purchase_rate: p.manufacturing_cost,
                    selling_price: p.retail_price,
                    shade_image: p.image
                  })} className="btn-icon" title="Edit Product" style={{ padding: '0.4rem', color: 'var(--accent-gold)' }}>
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '5rem 1rem' }}>
                  <Package size={40} style={{ marginBottom: '1rem', color: 'var(--border-color)', margin: '0 auto' }} />
                  <p>No inventory items matched your query.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===================== ADD PRODUCT MODAL ===================== */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 style={{ margin: 0 }}>Add New Product</h2>
                <p className="subtext" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>Add a new item to your inventory catalog</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            {renderFormFields(newProduct, setNewProduct, handleNewImageUpload)}

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleAddProduct} disabled={saving}>
                <Plus size={16} />
                {saving ? 'Adding...' : 'Add to Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== EDIT PRODUCT MODAL ===================== */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 style={{ margin: 0 }}>Edit Inventory Item</h2>
                <p className="subtext" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{editingProduct.sku_takano}</span> — {editingProduct.article_name}
                </p>
              </div>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            {renderFormFields(editingProduct, setEditingProduct, handleEditImageUpload)}

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setEditingProduct(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdateFullProduct}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
