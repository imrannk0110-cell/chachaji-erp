import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, ArrowLeft, Image, Save, Settings, Flame, ClipboardList, Check, AlertCircle, Upload, BookOpen, X, Globe, Phone, MapPin } from 'lucide-react';

const Admin = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'leads', 'articles', 'settings'

  // Leads State
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  // Settings States
  const [whatsappNumber, setWhatsappNumber] = useState('7300070513');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  
  const [ownerName, setOwnerName] = useState('Chachaji Udyog');
  const [ownerPhone, setOwnerPhone] = useState('7300070513');
  const [ownerAddress, setOwnerAddress] = useState('Industrial Area Phase II, Jaipur, Rajasthan, 302012');
  const [socialFacebook, setSocialFacebook] = useState('https://facebook.com');
  const [socialInstagram, setSocialInstagram] = useState('https://instagram.com');
  const [socialYoutube, setSocialYoutube] = useState('https://youtube.com');
  const [socialLinkedin, setSocialLinkedin] = useState('https://linkedin.com');

  const [heroSlides, setHeroSlides] = useState([
    {
      title: "Premium Kitchen Stoves & Tools",
      text: "We sell every type of stove and other product of kitchen and commercial kitchen with equipment and tool.",
      cta: "Request Quote",
      type: "Product Purchase",
      bgImage: "/hero_slide_1_showroom.png"
    },
    {
      title: "Custom Stove Fabrication",
      text: "We manufacture custom stove or product on your demand. Engineered for durability, customized to your space.",
      cta: "Enquire Custom Stove",
      type: "Custom Manufacturing",
      bgImage: "/hero_slide_2_fabrication.png"
    },
    {
      title: "Commercial Gas Pipeline Fitting",
      text: "Commercial Fitting of gas pipelines and related work in hotels, restaurants, and other commercial spaces.",
      cta: "Book Gas Fitting",
      type: "Commercial Fitting",
      bgImage: "/hero_slide_3_pipeline.png"
    }
  ]);
  
  // Product Form Fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [totalStock, setTotalStock] = useState('0');
  const [manufacturingCost, setManufacturingCost] = useState('0');
  const [retailPrice, setRetailPrice] = useState('0');
  const [wholesalePrice, setWholesalePrice] = useState('0');
  const [imageBase64, setImageBase64] = useState(null);

  // Articles State
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleImageBase64, setArticleImageBase64] = useState(null);

  const fetchProducts = () => {
    setLoading(true);
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching products", err);
        setLoading(false);
      });
  };

  const fetchLeads = () => {
    setLeadsLoading(true);
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => {
        setLeads(data);
        setLeadsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching leads", err);
        setLeadsLoading(false);
      });
  };

  const fetchArticles = () => {
    setArticlesLoading(true);
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => {
        setArticles(data);
        setArticlesLoading(false);
      })
      .catch(err => {
        console.error("Error fetching articles", err);
        setArticlesLoading(false);
      });
  };

  const fetchSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
        if (data.owner_name) setOwnerName(data.owner_name);
        if (data.owner_phone) setOwnerPhone(data.owner_phone);
        if (data.owner_address) setOwnerAddress(data.owner_address);
        if (data.social_facebook) setSocialFacebook(data.social_facebook);
        if (data.social_instagram) setSocialInstagram(data.social_instagram);
        if (data.social_youtube) setSocialYoutube(data.social_youtube);
        if (data.social_linkedin) setSocialLinkedin(data.social_linkedin);
        
        if (data.categories) {
          try {
            setCategories(JSON.parse(data.categories));
          } catch(e) {
            setCategories(["Single Stove Burner - SS", "Single Stove Burner - Iron (MS)", "Double Stove Burner", "Three Stove Burner", "Four Stove Burner", "Commercial Burner", "Regulator", "Spare Parts"]);
          }
        }
        if (data.hero_slides) {
          try {
            setHeroSlides(JSON.parse(data.hero_slides));
          } catch(e) {
            console.error("Error parsing hero slides settings", e);
          }
        }
      })
      .catch(err => console.error("Error fetching settings", err));
  };

  useEffect(() => {
    fetchProducts();
    fetchLeads();
    fetchArticles();
    fetchSettings();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setSku('');
    setName('');
    setCategory(categories[0] || '');
    setSubcategory('');
    setTotalStock('0');
    setManufacturingCost('0');
    setRetailPrice('0');
    setWholesalePrice('0');
    setImageBase64(null);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setSku(product.sku);
    setName(product.name);
    setCategory(product.category || '');
    setSubcategory(product.subcategory || '');
    setTotalStock(String(product.total_stock || 0));
    setManufacturingCost(String(product.manufacturing_cost || 0));
    setRetailPrice(String(product.retail_price || 0));
    setWholesalePrice(String(product.wholesale_price || 0));
    setImageBase64(product.image || null);
    setShowModal(true);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const url = editingProduct 
      ? `/api/products/${editingProduct.id}` 
      : '/api/products';
    
    const method = editingProduct ? 'PUT' : 'POST';
    const payload = {
      sku,
      name,
      category,
      subcategory,
      total_stock: parseInt(totalStock) || 0,
      manufacturing_cost: parseFloat(manufacturingCost) || 0,
      retail_price: parseFloat(retailPrice) || 0,
      wholesale_price: parseFloat(wholesalePrice) || 0,
      image: imageBase64
    };

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(() => {
        setShowModal(false);
        fetchProducts();
      })
      .catch(err => console.error("Error saving product", err));
  };

  const handleSaveSettings = () => {
    const dataToSave = [
      { key: 'whatsapp_number', value: whatsappNumber },
      { key: 'categories', value: JSON.stringify(categories) },
      { key: 'owner_name', value: ownerName },
      { key: 'owner_phone', value: ownerPhone },
      { key: 'owner_address', value: ownerAddress },
      { key: 'social_facebook', value: socialFacebook },
      { key: 'social_instagram', value: socialInstagram },
      { key: 'social_youtube', value: socialYoutube },
      { key: 'social_linkedin', value: socialLinkedin },
      { key: 'hero_slides', value: JSON.stringify(heroSlides) }
    ];

    let errors = false;
    let completed = 0;

    dataToSave.forEach(item => {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })
        .then(res => res.json())
        .then(() => {
          completed++;
          if (completed === dataToSave.length && !errors) {
            alert("All configuration settings updated successfully!");
          }
        })
        .catch(err => {
          errors = true;
          console.error(`Error saving settings for key ${item.key}`, err);
        });
    });
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (cat) => {
    setCategories(categories.filter(c => c !== cat));
  };

  const handleUpdateLeadStatus = (id, newStatus) => {
    fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => res.json())
      .then(() => fetchLeads())
      .catch(err => console.error(err));
  };

  const handleDeleteLead = (id) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      fetch(`/api/leads/${id}`, {
        method: 'DELETE'
      })
        .then(res => res.json())
        .then(() => fetchLeads())
        .catch(err => console.error(err));
    }
  };

  // Article Management Functions
  const openAddArticleModal = () => {
    setEditingArticle(null);
    setArticleTitle('');
    setArticleContent('');
    setArticleImageBase64(null);
    setShowArticleModal(true);
  };

  const openEditArticleModal = (article) => {
    setEditingArticle(article);
    setArticleTitle(article.title);
    setArticleContent(article.content);
    setArticleImageBase64(article.image || null);
    setShowArticleModal(true);
  };

  const handleArticleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setArticleImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveArticle = (e) => {
    e.preventDefault();
    if (!articleTitle.trim() || !articleContent.trim()) {
      alert("Please fill article title and body content");
      return;
    }

    const url = editingArticle 
      ? `/api/articles/${editingArticle.id}` 
      : '/api/articles';
    const method = editingArticle ? 'PUT' : 'POST';

    const payload = {
      title: articleTitle,
      content: articleContent,
      image: articleImageBase64
    };

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(() => {
        setShowArticleModal(false);
        fetchArticles();
      })
      .catch(err => console.error("Error saving article", err));
  };

  const handleDeleteArticle = (id) => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      fetch(`/api/articles/${id}`, {
        method: 'DELETE'
      })
        .then(res => res.json())
        .then(() => fetchArticles())
        .catch(err => console.error(err));
    }
  };

  // Hero Slide File Upload
  const handleSlideImageChange = (idx, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedSlides = [...heroSlides];
        updatedSlides[idx].bgImage = reader.result;
        setHeroSlides(updatedSlides);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlideFieldChange = (idx, field, val) => {
    const updatedSlides = [...heroSlides];
    updatedSlides[idx][field] = val;
    setHeroSlides(updatedSlides);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.25rem 2rem', 
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src="/Chachaji Udyog Logo.png" 
            alt="Chachaji Udyog Logo" 
            style={{ height: '40px', objectFit: 'contain' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px', color: '#b45309', fontFamily: 'Outfit' }}>CHACHAJI UDYOG</span>
            <span style={{ fontSize: '0.75rem', letterSpacing: '2px', color: '#64748b', fontWeight: '600' }}>CATALOG OWNER CONTROL PANEL</span>
          </div>
        </div>

        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1.25rem',
          backgroundColor: '#f1f5f9',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          color: '#334155',
          fontSize: '0.85rem',
          fontWeight: '600',
          textDecoration: 'none',
          transition: 'all 0.2s'
        }}>
          <ArrowLeft size={16} />
          Back to Catalog
        </Link>
      </header>

      {/* Tabs Selector Navigation */}
      <div style={{ maxWidth: '1200px', margin: '2rem auto 0 auto', padding: '0 2rem' }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid #cbd5e1',
          paddingBottom: '0.5rem'
        }}>
          <button 
            onClick={() => setActiveTab('products')}
            style={{
              padding: '0.5rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'products' ? '2px solid #b45309' : '2px solid transparent',
              color: activeTab === 'products' ? '#b45309' : '#64748b',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Stove Catalog
          </button>
          
          <button 
            onClick={() => setActiveTab('leads')}
            style={{
              padding: '0.5rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'leads' ? '2px solid #b45309' : '2px solid transparent',
              color: activeTab === 'leads' ? '#b45309' : '#64748b',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            Inquiry Leads
            {leads.filter(l => l.status === 'Pending').length > 0 && (
              <span style={{
                backgroundColor: '#b45309',
                color: '#ffffff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: '800'
              }}>
                {leads.filter(l => l.status === 'Pending').length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('articles')}
            style={{
              padding: '0.5rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'articles' ? '2px solid #b45309' : '2px solid transparent',
              color: activeTab === 'articles' ? '#b45309' : '#64748b',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Article Posts
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '0.5rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid #b45309' : '2px solid transparent',
              color: activeTab === 'settings' ? '#b45309' : '#64748b',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Categories & Settings
          </button>
        </div>
      </div>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* TAB 1: STOVE CATALOG */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Product Inventory ({products.length})</h2>
              <button 
                onClick={openAddModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(180, 83, 9, 0.2)'
                }}
              >
                <Plus size={16} />
                Add Product
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading products...</div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Item</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Category</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Stock</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Cost</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Retail</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Wholesale</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }} className="table-row-hover">
                        <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            {p.image ? (
                              <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Image size={18} color="#94a3b8" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {p.sku}</div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#334155' }}>
                          <div>{p.category}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.subcategory}</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px', 
                            backgroundColor: p.total_stock > 10 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: p.total_stock > 10 ? '#166534' : '#991b1b',
                            fontWeight: '700'
                          }}>
                            {p.total_stock} pcs
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#334155' }}>₹{p.manufacturing_cost || 0}</td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '700', color: '#b45309' }}>₹{p.retail_price || 0}</td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>₹{p.wholesale_price || 0}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button 
                            onClick={() => openEditModal(p)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '4px',
                              marginRight: '8px'
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INQUIRY LEADS */}
        {activeTab === 'leads' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Customer Inquiry Leads ({leads.length})</h2>
              <button 
                onClick={fetchLeads}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            </div>

            {leadsLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading inquiries...</div>
            ) : leads.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#64748b',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <ClipboardList size={40} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a' }}>No inquiries received yet</h3>
                <p style={{ fontSize: '0.85rem' }}>Leads submitted via the website form will appear here.</p>
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Contact</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Inquiry Type</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Details / Requirements</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Status</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600' }}>Date</th>
                      <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>{lead.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#475569' }}>Tel: {lead.phone}</div>
                          {lead.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Email: {lead.email}</div>}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: lead.type.includes('Custom') ? 'rgba(217, 119, 6, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: lead.type.includes('Custom') ? '#b45309' : '#1d4ed8',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}>
                            {lead.type}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', maxWidth: '300px', wordBreak: 'break-word', color: '#334155' }}>
                          {lead.message || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No message</span>}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                            backgroundColor: lead.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : (lead.status === 'Contacted' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)'),
                            color: lead.status === 'Pending' ? '#b45309' : (lead.status === 'Contacted' ? '#1d4ed8' : '#166534')
                          }}>
                            {lead.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {lead.status === 'Pending' && (
                              <button
                                onClick={() => handleUpdateLeadStatus(lead.id, 'Contacted')}
                                title="Mark as Contacted"
                                style={{ padding: '0.3rem 0.5rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                              >
                                Contacted
                              </button>
                            )}
                            {lead.status !== 'Completed' && (
                              <button
                                onClick={() => handleUpdateLeadStatus(lead.id, 'Completed')}
                                title="Mark as Completed"
                                style={{ padding: '0.3rem 0.5rem', backgroundColor: '#166534', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}
                              >
                                Done
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              title="Delete Lead"
                              style={{ padding: '0.3rem 0.5rem', backgroundColor: 'transparent', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '4px', color: '#dc2626', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ARTICLES & POSTS */}
        {activeTab === 'articles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>News & Blog Articles ({articles.length})</h2>
              <button 
                onClick={openAddArticleModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(180, 83, 9, 0.2)'
                }}
              >
                <Plus size={16} />
                Create Article
              </button>
            </div>

            {articlesLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading articles...</div>
            ) : articles.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#64748b',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <BookOpen size={40} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a' }}>No articles published yet</h3>
                <p style={{ fontSize: '0.85rem' }}>Write posts, company updates, or helpful stove fabrication blogs for the website navbar article section.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {articles.map(article => (
                  <div key={article.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '180px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                      {article.image ? (
                        <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <BookOpen size={40} color="#cbd5e1" />
                      )}
                    </div>
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Published on {new Date(article.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.75rem 0', lineHeight: '1.3' }}>
                        {article.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1.25rem 0', lineHeight: '1.5', flex: 1 }}>
                        {article.content.substring(0, 140)}{article.content.length > 140 ? '...' : ''}
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                        <button
                          onClick={() => openEditArticleModal(article)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.4rem 0.75rem',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            color: '#475569',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.4rem 0.75rem',
                            backgroundColor: 'rgba(220, 38, 38, 0.05)',
                            border: '1px solid rgba(220, 38, 38, 0.2)',
                            borderRadius: '4px',
                            color: '#dc2626',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CATEGORIES & SETTINGS */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
            
            {/* Left Box: Business Details and Banners */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Business details */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <Settings size={22} color="#b45309" />
                  <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a', fontWeight: '750' }}>Business & Social Identity Settings</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>
                      Owner / Business Name
                    </label>
                    <input 
                      type="text" 
                      value={ownerName}
                      onChange={e => setOwnerName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        color: '#0f172a',
                        outline: 'none',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>
                      Owner Mobile / Phone No.
                    </label>
                    <input 
                      type="text" 
                      value={ownerPhone}
                      onChange={e => setOwnerPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        color: '#0f172a',
                        outline: 'none',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>
                    Showroom / Factory Address
                  </label>
                  <input 
                    type="text" 
                    value={ownerAddress}
                    onChange={e => setOwnerAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.5rem', fontWeight: '700' }}>
                    WhatsApp Enquiry Number
                  </label>
                  <input 
                    type="text" 
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.35rem' }}>
                    Used for bulk quote submissions and customer redirects.
                  </span>
                </div>

                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#0f172a', fontWeight: '800', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                  Social Media Links
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.3rem', fontWeight: '600' }}>Facebook Page URL</label>
                    <input type="text" value={socialFacebook} onChange={e => setSocialFacebook(e.target.value)} style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.3rem', fontWeight: '600' }}>Instagram Handle URL</label>
                    <input type="text" value={socialInstagram} onChange={e => setSocialInstagram(e.target.value)} style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.3rem', fontWeight: '600' }}>YouTube Channel URL</label>
                    <input type="text" value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.3rem', fontWeight: '600' }}>LinkedIn Profile URL</label>
                    <input type="text" value={socialLinkedin} onChange={e => setSocialLinkedin(e.target.value)} style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
                  </div>
                </div>

                <button 
                  onClick={handleSaveSettings}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.7rem 1.5rem',
                    backgroundColor: '#166534',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(22, 101, 52, 0.15)'
                  }}
                >
                  <Save size={16} />
                  Save Business Details
                </button>
              </div>

              {/* Homepage Hero slides banner editor */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <Image size={22} color="#b45309" />
                  <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a', fontWeight: '750' }}>Home Carousel Slider Editor</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {heroSlides.map((slide, idx) => (
                    <div key={idx} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#f8fafc' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#b45309', fontWeight: '800', fontSize: '0.95rem' }}>
                        Slide Banner #{idx + 1} ({slide.type})
                      </h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Slide image uploader */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Background Image</span>
                          <div style={{
                            height: '95px',
                            backgroundColor: '#ffffff',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            {slide.bgImage ? (
                              <img src={slide.bgImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Image size={18} color="#cbd5e1" />
                            )}
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleSlideImageChange(idx, e)}
                              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer' }}
                            />
                          </div>
                          <span style={{ fontSize: '0.6rem', color: '#64748b', textAlign: 'center' }}>Click preview to change</span>
                        </div>

                        {/* Title and descriptions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#475569', marginBottom: '0.2rem' }}>Slide Main Title</label>
                            <input 
                              type="text" 
                              value={slide.title} 
                              onChange={e => handleSlideFieldChange(idx, 'title', e.target.value)} 
                              style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} 
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#475569', marginBottom: '0.2rem' }}>Banner Text Description</label>
                            <textarea 
                              rows="2"
                              value={slide.text} 
                              onChange={e => handleSlideFieldChange(idx, 'text', e.target.value)} 
                              style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'inherit' }} 
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '700', color: '#475569', marginBottom: '0.2rem' }}>Button Text</label>
                              <input 
                                type="text" 
                                value={slide.cta} 
                                onChange={e => handleSlideFieldChange(idx, 'cta', e.target.value)} 
                                style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '700', color: '#475569', marginBottom: '0.2rem' }}>Inquiry Topic Type</label>
                              <select 
                                value={slide.type} 
                                onChange={e => handleSlideFieldChange(idx, 'type', e.target.value)} 
                                style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#ffffff' }}
                              >
                                <option value="Product Purchase">Product Purchase</option>
                                <option value="Custom Manufacturing">Custom Manufacturing</option>
                                <option value="Commercial Fitting">Commercial Fitting</option>
                                <option value="General Enquiry">General Enquiry</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleSaveSettings}
                  style={{
                    width: '100%',
                    marginTop: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.7rem',
                    backgroundColor: '#166534',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(22, 101, 52, 0.15)'
                  }}
                >
                  <Save size={16} />
                  Save Carousel Banner Settings
                </button>
              </div>
            </div>

            {/* Right Box: Categories Chip Configuration */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'sticky', top: '100px' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'Outfit', margin: '0 0 1.25rem 0', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Product Categories</h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="New Category..." 
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <button 
                  onClick={handleAddCategory}
                  style={{
                    padding: '0.6rem 1rem',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem', backgroundColor: '#f8fafc' }} className="no-scrollbar">
                {categories.map(cat => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', borderRadius: '4px', backgroundColor: '#ffffff', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>{cat}</span>
                    <button 
                      onClick={() => handleRemoveCategory(cat)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleSaveSettings}
                style={{
                  width: '100%',
                  marginTop: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  backgroundColor: '#166534',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(22, 101, 52, 0.15)'
                }}
              >
                <Save size={16} />
                Save Categories
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <form onSubmit={handleSaveProduct} style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '520px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit', color: '#0f172a' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }} className="no-scrollbar">
              
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Image Uploader */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '700' }}>Image</label>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {imageBase64 ? (
                      <>
                        <img src={imageBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          type="button" 
                          onClick={() => setImageBase64(null)}
                          style={{
                            position: 'absolute',
                            top: '4px', right: '4px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            border: 'none', borderRadius: '50%',
                            color: '#fff', width: '20px', height: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '0.7rem'
                          }}
                        >
                          &times;
                        </button>
                      </>
                    ) : (
                      <>
                        <Image size={24} color="#64748b" />
                        <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem', fontWeight: '600' }}>Upload</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            opacity: 0, cursor: 'pointer'
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* SKU and Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>Product Name</label>
                    <input 
                      type="text" required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>SKU Code</label>
                    <input 
                      type="text" required
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>Category</label>
                  <select 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a' }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>Subcategory / Specs</label>
                  <input 
                    type="text" placeholder="e.g. Brass, Steel, Stand"
                    value={subcategory}
                    onChange={e => setSubcategory(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>Total Stock (pcs)</label>
                  <input 
                    type="number" required
                    value={totalStock}
                    onChange={e => setTotalStock(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>Manufacturing Cost (₹)</label>
                  <input 
                    type="number" step="any" required
                    value={manufacturingCost}
                    onChange={e => setManufacturingCost(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>Retail Selling Price (₹)</label>
                  <input 
                    type="number" step="any" required
                    value={retailPrice}
                    onChange={e => setRetailPrice(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>Wholesale Price (B2B) (₹)</label>
                  <input 
                    type="number" step="any" required
                    value={wholesalePrice}
                    onChange={e => setWholesalePrice(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a' }}
                  />
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                style={{
                  padding: '0.6rem 1.5rem',
                  background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Article Modal */}
      {showArticleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <form onSubmit={handleSaveArticle} style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '640px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit', color: '#0f172a' }}>
                {editingArticle ? 'Edit Article' : 'Create New Article'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowArticleModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }} className="no-scrollbar">
              
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                
                {/* Image Upload box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', fontWeight: '700' }}>Cover Image</label>
                  <div style={{
                    width: '150px',
                    height: '110px',
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {articleImageBase64 ? (
                      <>
                        <img src={articleImageBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          type="button" 
                          onClick={() => setArticleImageBase64(null)}
                          style={{
                            position: 'absolute',
                            top: '4px', right: '4px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            border: 'none', borderRadius: '50%',
                            color: '#fff', width: '20px', height: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '0.7rem'
                          }}
                        >
                          &times;
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={20} color="#64748b" />
                        <span style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '0.25rem', fontWeight: '600' }}>Upload JPG/PNG</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleArticleImageChange}
                          style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            opacity: 0, cursor: 'pointer'
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Article title */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>
                    Article Title
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 5 Maintenance Tips for Commercial Bhatti Stoves"
                    value={articleTitle}
                    onChange={e => setArticleTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#475569', marginBottom: '0.4rem', fontWeight: '700' }}>
                  Article Content / Text body
                </label>
                <textarea 
                  required
                  rows="10"
                  placeholder="Write full article here..."
                  value={articleContent}
                  onChange={e => setArticleContent(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '0.9rem', fontFamily: 'inherit', lineHeight: '1.5' }}
                />
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <button 
                type="button" 
                onClick={() => setShowArticleModal(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                style={{
                  padding: '0.6rem 1.5rem',
                  background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Publish Post
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Admin;
