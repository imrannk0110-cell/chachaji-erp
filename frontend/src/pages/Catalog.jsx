import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, ChevronDown, ChevronUp, Flame, Mail, MapPin, ArrowRight, Award, ShieldCheck, HeartHandshake, CheckCircle, ChevronLeft, ChevronRight, Menu, X, BookOpen } from 'lucide-react';

const Catalog = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('7300070513');
  const [ownerName, setOwnerName] = useState('Chachaji Udyog');
  const [ownerPhone, setOwnerPhone] = useState('7300070513');
  const [ownerAddress, setOwnerAddress] = useState('Industrial Area Phase II, Jaipur, Rajasthan, 302012');
  const [socialFacebook, setSocialFacebook] = useState('https://facebook.com');
  const [socialInstagram, setSocialInstagram] = useState('https://instagram.com');
  const [socialYoutube, setSocialYoutube] = useState('https://youtube.com');
  const [socialLinkedin, setSocialLinkedin] = useState('https://linkedin.com');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const scrollContainerRef = React.useRef(null);

  const scrollCategories = (direction) => {
    if (scrollContainerRef.current) {
      const amount = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth'
      });
    }
  };

  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([
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

  // Articles & Blog state
  const [articles, setArticles] = useState([]);
  const [activeArticle, setActiveArticle] = useState(null);

  // Lead Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'General Enquiry',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch products
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

    // Fetch settings (all keys)
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.whatsapp_number) {
          setWhatsappNumber(data.whatsapp_number);
          setOwnerPhone(data.whatsapp_number);
        }
        if (data.owner_name) setOwnerName(data.owner_name);
        if (data.owner_phone) setOwnerPhone(data.owner_phone);
        if (data.owner_address) setOwnerAddress(data.owner_address);
        if (data.social_facebook) setSocialFacebook(data.social_facebook);
        if (data.social_instagram) setSocialInstagram(data.social_instagram);
        if (data.social_youtube) setSocialYoutube(data.social_youtube);
        if (data.social_linkedin) setSocialLinkedin(data.social_linkedin);

        if (data.categories) {
          try {
            const parsed = JSON.parse(data.categories);
            const order = ["Single Stove Burner - SS", "Single Stove Burner - Iron (MS)", "Double Stove Burner", "Three Stove Burner", "Four Stove Burner", "Commercial Burner", "Regulator", "Spare Parts"];
            parsed.sort((a, b) => {
              const idxA = order.indexOf(a);
              const idxB = order.indexOf(b);
              const valA = idxA === -1 ? 999 : idxA;
              const valB = idxB === -1 ? 999 : idxB;
              return valA - valB;
            });
            setCategories(parsed);
          } catch(e) {
            setCategories(["Single Stove Burner - SS", "Single Stove Burner - Iron (MS)", "Double Stove Burner", "Three Stove Burner", "Four Stove Burner", "Commercial Burner", "Regulator", "Spare Parts"]);
          }
        }

        if (data.hero_slides) {
          try {
            setSlides(JSON.parse(data.hero_slides));
          } catch(e) {
            console.error("Error parsing hero slides setting", e);
          }
        }
      })
      .catch(err => console.error("Error fetching settings", err));

    // Fetch Articles
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => {
        setArticles(data);
      })
      .catch(err => console.error("Error fetching articles", err));
  }, []);

  // Slide Auto-Rotate (5s interval soft fade)
  useEffect(() => {
    if (!slides.length) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const openInquiryModal = (type = 'General Enquiry', prefilledText = '') => {
    setLeadForm({
      name: '',
      phone: '',
      email: '',
      type: type,
      message: prefilledText
    });
    setFormSubmitted(false);
    setIsModalOpen(true);
  };

  const handleLeadSubmit = (e) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.phone) {
      alert("Please fill name and phone number");
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
          setFormSubmitted(true);
          setTimeout(() => {
            setIsModalOpen(false);
            setFormSubmitted(false);
          }, 3000);
        } else {
          alert("Error sending inquiry. Please try again.");
        }
      })
      .catch(err => {
        setSubmitting(false);
        console.error(err);
        alert("Server error. Please try again later.");
      });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    const categoryOrder = [
      "Single Stove Burner - SS",
      "Single Stove Burner - Iron (MS)",
      "Double Stove Burner",
      "Three Stove Burner",
      "Four Stove Burner",
      "Commercial Burner",
      "Regulator",
      "Spare Parts"
    ];
    const idxA = categoryOrder.indexOf(a.category);
    const idxB = categoryOrder.indexOf(b.category);
    const valA = idxA === -1 ? 999 : idxA;
    const valB = idxB === -1 ? 999 : idxB;
    if (valA !== valB) return valA - valB;
    return a.name.localeCompare(b.name);
  });


  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      color: '#475569',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* Dynamic Styled CSS Injected */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap');
        
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
          background: #94A3B8;
        }

        .nav-link {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          color: #1B0A64;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 0.95rem;
          white-space: nowrap;
          position: relative;
          padding: 0.25rem 0;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          width: 100%;
          transform: scaleX(0);
          height: 2px;
          bottom: 0;
          left: 0;
          background: #D8231A;
          transform-origin: bottom right;
          transition: transform 0.3s ease-out;
        }
        .nav-link:hover::after {
          transform: scaleX(1);
          transform-origin: bottom left;
        }
        .nav-link:hover {
          color: #D8231A;
        }
        
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-top: 3px solid #D8231A;
          border-radius: 4px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          display: none;
          min-width: 240px;
          padding: 0.5rem 0;
          z-index: 500;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }
        .dropdown-container {
          position: relative;
        }
        .dropdown-container:hover .dropdown-menu {
          display: block;
          transform: translateY(0);
        }
        .dropdown-item {
          display: block;
          padding: 0.7rem 1.5rem;
          color: #475569;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .dropdown-item:hover {
          background-color: #F1F5F9;
          color: #1B0A64;
          padding-left: 1.75rem;
          border-left: 3px solid #D8231A;
        }
        
        .slide-fade {
          animation: fadeEffect 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes fadeEffect {
          from { opacity: 0; transform: scale(1.02); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .product-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          cursor: pointer;
          position: relative;
        }
        .product-card:hover {
          transform: translateY(-4px);
          border-color: #CBD5E1;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        
        .btn-brass {
          background: #D8231A;
          color: #FFFFFF;
          border: none;
          border-radius: 4px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(216, 35, 26, 0.2);
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .btn-brass:hover {
          background: #1B0A64;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(27, 10, 100, 0.2);
        }
        .btn-brass:active {
          transform: translateY(0);
        }
        
        .btn-call-pulsate {
          padding: 0.9rem 2.25rem;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #1B0A64;
          color: #FFFFFF;
          border: none;
          box-shadow: 0 4px 14px rgba(27, 10, 100, 0.3);
          transition: all 0.3s ease;
          animation: pulseNavy 2.5s infinite;
        }
        .btn-call-pulsate:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(27, 10, 100, 0.4);
          background: #0F053D;
        }
        @keyframes pulseNavy {
          0% {
            box-shadow: 0 0 0 0 rgba(27, 10, 100, 0.5);
          }
          70% {
            box-shadow: 0 0 0 12px rgba(27, 10, 100, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(27, 10, 100, 0);
          }
        }
        @keyframes floatPulsate {
          0% {
            box-shadow: 0 0 0 0 rgba(216, 35, 26, 0.6);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(216, 35, 26, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(216, 35, 26, 0);
          }
        }
        .floating-call-widget {
          background-color: #D8231A !important;
          animation: floatPulsate 2s infinite !important;
        }
        .floating-call-widget:hover {
          background-color: #1B0A64 !important;
        }
        
        .social-link {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          background-color: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .social-link:hover {
          background-color: #D8231A;
          color: #FFFFFF;
          transform: translateY(-3px);
        }
        .footer-link {
          color: #64748B;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
          font-size: 0.88rem;
          display: inline-block;
          margin-bottom: 0.6rem;
        }
        .footer-link:hover {
          color: #D8231A;
          padding-left: 4px;
        }
        
        .category-scroll-container {
          display: flex;
          overflow: visible;
          padding: 0.5rem 0;
          margin-bottom: 2.5rem;
          width: 100%;
          justify-content: center;
        }
        .category-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .category-inner-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
          align-items: center;
          padding: 0;
        }
        .category-pill {
          padding: 0.6rem 1.25rem;
          border-radius: 4px;
          border: 1px solid #E2E8F0;
          background-color: #FFFFFF;
          color: #475569;
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .category-pill:hover {
          border-color: #CBD5E1;
          color: #1B0A64;
          transform: translateY(-2px);
          background-color: #F8FAFC;
        }
        .category-pill.active {
          border-color: #1B0A64;
          background: #1B0A64;
          color: #FFFFFF;
          box-shadow: 0 4px 6px rgba(27, 10, 100, 0.2);
          font-weight: 600;
        }
        .category-scroll-btn {
          display: none !important;
        }
        .public-input {
          background-color: #FFFFFF !important;
          color: #1E293B !important;
          border: 1px solid #E2E8F0 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
          border-radius: 4px !important;
          transition: all 0.3s ease !important;
          font-family: 'Inter', sans-serif !important;
        }
        .public-input::placeholder {
          color: #94A3B8 !important;
          opacity: 1 !important;
        }
        .public-input:focus {
          border-color: #1B0A64 !important;
          box-shadow: 0 0 0 3px rgba(27, 10, 100, 0.1) !important;
          outline: none !important;
        }
        
        /* Product Card Visual Enhancements */
        .product-card-img-wrapper {
          height: 240px;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          border-bottom: 1px solid #E2E8F0;
        }
        .product-card-img-wrapper img {
          transition: transform 0.5s ease;
        }
        .product-card:hover .product-card-img-wrapper img {
          transform: scale(1.04);
        }
        .product-card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 2;
        }
        .product-card:hover .product-card-overlay {
          opacity: 1;
        }
        
        /* ====== MOBILE RESPONSIVE ====== */
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: #1B0A64;
          padding: 6px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        .mobile-menu-btn:hover {
          background-color: rgba(27, 10, 100, 0.05);
        }
        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 2rem;
          flex-wrap: nowrap;
        }
        .mobile-nav-drawer {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
          .desktop-nav { display: none !important; }
          .mobile-nav-drawer {
            display: block;
            background: #FFFFFF;
            border-top: 1px solid #E2E8F0;
            padding: 0.75rem 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .mobile-nav-link {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.9rem 1.5rem;
            font-weight: 600;
            color: #1E293B;
            font-size: 0.95rem;
            cursor: pointer;
            border-bottom: 1px solid #E2E8F0;
            transition: all 0.2s;
          }
          .mobile-nav-link:hover { background-color: #F8FAFC; color: #1B0A64; }
          .mobile-nav-sub {
            background: #F1F5F9;
            padding: 0.25rem 0;
          }
          .mobile-nav-sub-item {
            display: block;
            padding: 0.75rem 2rem;
            font-size: 0.88rem;
            color: #475569;
            cursor: pointer;
            border-bottom: 1px solid #E2E8F0;
            transition: all 0.2s;
          }
          .mobile-nav-sub-item:hover { color: #1B0A64; background: #FFFFFF; }
          
          /* Hero Mobile Adjustments */
          .hero-section { height: auto !important; min-height: 550px !important; padding-bottom: 2rem; }
          .hero-split-container { flex-direction: column-reverse !important; }
          .hero-left-half { 
            padding: 2rem 1.5rem 1rem 1.5rem !important; 
            text-align: center !important; 
            align-items: center !important;
          }
          .hero-left-half span { align-self: center !important; }
          .hero-left-half .hero-desc { text-align: center !important; }
          .hero-left-half div { justify-content: center !important; }
          .hero-right-half { 
            min-height: 250px !important; 
            flex: 0 0 250px !important;
          }
          .hero-right-half > div {
            top: 15px !important; bottom: 0 !important; right: 5% !important; left: 5% !important;
          }
          .hero-title { font-size: 2.2rem !important; line-height: 1.2 !important; }
          .hero-desc { font-size: 1rem !important; margin-bottom: 2rem !important; }
          .hero-indicators { top: 240px !important; bottom: auto !important; }
          
          .search-bar-wrapper { padding: 4px 4px 4px 1rem !important; }
          .search-bar-input { font-size: 0.9rem !important; }
          .search-bar-btn { padding: 0.7rem 1.25rem !important; font-size: 0.85rem !important; }
          .products-section { padding: 3rem 1.25rem !important; }
          .products-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 1.25rem !important; }
          .section-heading { font-size: 1.75rem !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 1.75rem !important; }
          .category-chevron-wrapper { padding: 0 0.5rem !important; }
        }
        @media (max-width: 480px) {
          .products-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 2rem !important; }
        }
      `}</style>

      {/* TOP HEADER / NAVBAR */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1.5rem',
          maxWidth: '1280px',
          margin: '0 auto'
        }}>
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

          {/* Desktop Nav */}
          <nav className="desktop-nav">
            <div className="dropdown-container">
              <span className="nav-link">Categories <ChevronDown size={14} /></span>
              <div className="dropdown-menu">
                <span className="dropdown-item" onClick={() => { setSelectedCategory('All'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}>All Products</span>
                {categories.map(cat => (
                  <span key={cat} className="dropdown-item" onClick={() => { setSelectedCategory(cat); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}>{cat}</span>
                ))}
              </div>
            </div>
            <div className="dropdown-container">
              <span className="nav-link">Our Services <ChevronDown size={14} /></span>
              <div className="dropdown-menu">
                <span className="dropdown-item" onClick={() => openInquiryModal('Custom Manufacturing', 'Namskar, Mujhe custom stove requirement ke bare me discuss krna he.')}>Custom Stove Manufacturing</span>
                <span className="dropdown-item" onClick={() => openInquiryModal('Commercial Fitting', 'Namskar, Mujhe commercial gas pipeline fitting requirement ke bare me discuss krna he.')}>Commercial Fitting & Pipelines</span>
              </div>
            </div>
            <span className="nav-link" onClick={() => document.getElementById('articles-section')?.scrollIntoView({ behavior: 'smooth' })}>Articles</span>
            <span className="nav-link" onClick={() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' })}>About Us</span>
            <span className="nav-link" onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}>Contact Us</span>
          </nav>

          {/* Mobile Hamburger */}
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
            <div className="mobile-nav-link" onClick={() => { setMobileCategoriesOpen(!mobileCategoriesOpen); }}>
              <span>Categories</span>
              {mobileCategoriesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {mobileCategoriesOpen && (
              <div className="mobile-nav-sub">
                <span className="mobile-nav-sub-item" onClick={() => { setSelectedCategory('All'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}>All Products</span>
                {categories.map(cat => (
                  <span key={cat} className="mobile-nav-sub-item" onClick={() => { setSelectedCategory(cat); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}>{cat}</span>
                ))}
              </div>
            )}
            <div className="mobile-nav-link" onClick={() => setMobileServicesOpen(!mobileServicesOpen)}>
              <span>Our Services</span>
              {mobileServicesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {mobileServicesOpen && (
              <div className="mobile-nav-sub">
                <span className="mobile-nav-sub-item" onClick={() => { openInquiryModal('Custom Manufacturing', ''); setMobileMenuOpen(false); }}>Custom Stove Manufacturing</span>
                <span className="mobile-nav-sub-item" onClick={() => { openInquiryModal('Commercial Fitting', ''); setMobileMenuOpen(false); }}>Commercial Fitting & Pipelines</span>
              </div>
            )}
            <div className="mobile-nav-link" onClick={() => { document.getElementById('articles-section')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}><span>Articles</span></div>
            <div className="mobile-nav-link" onClick={() => { document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}><span>About Us</span></div>
            <div className="mobile-nav-link" onClick={() => { document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}><span>Contact Us</span></div>
          </div>
        )}
      </header>

      {/* AUTO-ROTATING HERO BANNER SLIDER */}
      <section className="hero-section" style={{
        height: '680px',
        position: 'relative',
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
        borderBottom: '1px solid #E2E8F0'
      }}>
        {slides.map((slide, idx) => (
          <div 
            key={idx}
            className={`slide-fade hero-split-container`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: idx === currentSlide ? 1 : 0,
              visibility: idx === currentSlide ? 'visible' : 'hidden',
              transition: 'opacity 1s ease-in-out, visibility 1s ease-in-out',
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}
          >
            {/* Left Content Half */}
            <div className="hero-left-half" style={{
              flex: '1 1 50%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 5% 0 8%',
              zIndex: 2
            }}>
              <span style={{
                color: '#D8231A',
                backgroundColor: 'rgba(216, 35, 26, 0.1)',
                padding: '6px 14px',
                borderRadius: '50px',
                border: '1px solid rgba(216, 35, 26, 0.2)',
                fontSize: '0.85rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '1.5rem',
                display: 'inline-block',
                alignSelf: 'flex-start'
              }}>
                {slide.type || "Heavy Duty Stove"}
              </span>
              <h1 className="hero-title" style={{
                fontSize: '4.2rem',
                fontFamily: "'Poppins', sans-serif",
                fontWeight: '700',
                color: '#1B0A64',
                lineHeight: '1.1',
                marginBottom: '1.5rem',
                letterSpacing: '-1px'
              }}>
                {slide.title}
              </h1>
              <p className="hero-desc" style={{
                fontSize: '1.25rem',
                color: '#475569',
                marginBottom: '3rem',
                lineHeight: '1.6',
                maxWidth: '550px',
                fontFamily: "'Inter', sans-serif"
              }}>
                {slide.text}
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button 
                  onClick={() => openInquiryModal(slide.type, `Namskar, Mujhe ${slide.title} ke bare me details aur quotation chahiye.`)}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1rem',
                    borderRadius: '50px'
                  }}
                  className="btn-brass"
                >
                  {slide.cta} <ArrowRight size={18} style={{ display: 'inline-block', marginLeft: '8px', verticalAlign: 'middle' }} />
                </button>
                 <a 
                  href="tel:7300070513"
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1rem',
                    borderRadius: '50px',
                    backgroundColor: '#FFFFFF',
                    color: '#1B0A64',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                    textDecoration: 'none',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Phone size={18} style={{ marginRight: '10px', color: '#D8231A' }} /> Call Now
                </a>
              </div>
            </div>

            {/* Right Image Half */}
            <div className="hero-right-half" style={{
              flex: '1 1 50%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '5%',
                bottom: '5%',
                right: '5%',
                left: '0',
                borderRadius: '16px',
                backgroundImage: `url("${slide.bgImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
              }} />
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="hero-indicators" style={{
          position: 'absolute',
          bottom: '25px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 10
        }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              style={{
                width: '32px',
                height: '6px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: idx === currentSlide ? '#D8231A' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
            />
          ))}
        </div>
      </section>

      {/* FILTER & PRODUCTS SECTION */}
      <section id="products-section" className="products-section" style={{ padding: '5rem 2rem', maxWidth: '1280px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 className="section-heading" style={{ fontSize: '2.25rem', fontFamily: "'Poppins', sans-serif", fontWeight: '700', color: '#1B0A64' }}>
            Explore Our Stove & Burner Catalog
          </h2>
          <p style={{ color: '#475569', fontSize: '1rem', marginTop: '0.5rem' }}>
            Manufactured locally using high-grade components for heavy-duty domestic and commercial use
          </p>
        </div>

        {/* Centered Premium Pill Search Bar */}
        <div className="search-bar-wrapper" style={{
          maxWidth: '750px',
          margin: '0 auto 2.5rem auto',
          backgroundColor: '#FFFFFF',
          borderRadius: '50px',
          border: '1px solid #E2E8F0',
          padding: '8px 8px 8px 1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          minWidth: 0,
        }}
        onMouseOver={e => {
          if (!e.currentTarget.contains(document.activeElement)) {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.08)';
          }
        }}
        onMouseOut={e => {
          if (!e.currentTarget.contains(document.activeElement)) {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)';
          }
        }}
        >
          <Search size={22} color="#94A3B8" style={{ flexShrink: 0 }} />
          <input 
            type="text" 
            placeholder="Search stoves by SKU, title or category..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => {
              const p = e.currentTarget.parentElement;
              if (p) {
                p.style.borderColor = '#1B0A64';
                p.style.boxShadow = '0 0 0 3px rgba(27, 10, 100, 0.1)';
              }
            }}
            onBlur={e => {
              const p = e.currentTarget.parentElement;
              if (p) {
                p.style.borderColor = '#E2E8F0';
                p.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)';
              }
            }}
            className="search-bar-input"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              color: '#1E293B',
              fontSize: '1rem',
              fontFamily: "'Inter', sans-serif",
              backgroundColor: 'transparent',
              minWidth: 0,
            }}
          />
          <button
            onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="search-bar-btn"
            style={{
              padding: '0.75rem 2.25rem',
              borderRadius: '50px',
              border: 'none',
              background: '#D8231A',
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: '0.9rem',
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(216, 35, 26, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(216, 35, 26, 0.3)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(216, 35, 26, 0.2)'; }}
          >
            Search
          </button>
        </div>

        {/* Centered Category Chips filter with Chevron buttons */}
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => scrollCategories('left')}
            className="category-scroll-btn"
            style={{ left: '-10px' }}
            title="Scroll Left"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div ref={scrollContainerRef} className="category-scroll-container">
            <div className="category-inner-container">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`category-pill ${selectedCategory === 'All' ? 'active' : ''}`}
              >
                All Products
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => scrollCategories('right')}
            className="category-scroll-btn"
            style={{ right: '-10px' }}
            title="Scroll Right"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Product Grid (incorporating generated images) */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(234, 88, 12, 0.2)', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '1rem', fontWeight: '500' }}>Loading catalog items...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            backgroundColor: '#111625',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#94a3b8'
          }}>
            <Flame size={48} color="#ff782e" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>No products found</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Try refining your search queries or category filters.</p>
          </div>
        ) : (
          <div className="products-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '2.5rem'
          }}>
            {filteredProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="product-card"
              >
                {/* Product Image block */}
                <div className="product-card-img-wrapper">
                  {product.image ? (
                    <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                      <Flame size={40} color="#ea580c" />
                      <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Showroom Availability</span>
                    </div>
                  )}
                  
                  {/* Glassmorphic Hover Overlay */}
                  <div className="product-card-overlay">
                    <span style={{
                      background: '#D8231A',
                      color: '#FFFFFF',
                      padding: '0.75rem 1.75rem',
                      borderRadius: '50px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      boxShadow: '0 8px 20px rgba(216, 35, 26, 0.25)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontFamily: "'Inter', sans-serif"
                    }}>
                      View Details
                    </span>
                  </div>

                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: '#1B0A64',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '50px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    zIndex: 3,
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {product.category}
                  </span>
                </div>

                {/* Info Description Block */}
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {product.subcategory || "Heavy Duty"}
                    </span>
                    {/* Material Variant Tag */}
                    {(product.category?.toLowerCase().includes('ss') || product.name?.toLowerCase().includes('ss') || product.category?.toLowerCase().includes('stainless')) ? (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        color: '#1B0A64',
                        backgroundColor: '#F1F5F9',
                        padding: '3px 10px',
                        borderRadius: '50px',
                        border: '1px solid #E2E8F0'
                      }}>
                        SS Frame
                      </span>
                    ) : (product.category?.toLowerCase().includes('iron') || product.name?.toLowerCase().includes('iron') || product.category?.toLowerCase().includes('ms') || product.name?.toLowerCase().includes('ms')) ? (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        color: '#475569',
                        backgroundColor: '#F8FAFC',
                        padding: '3px 10px',
                        borderRadius: '50px',
                        border: '1px solid #E2E8F0'
                      }}>
                        Iron (MS)
                      </span>
                    ) : null}
                  </div>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: '600',
                    color: '#1E293B',
                    marginTop: '0.5rem',
                    marginBottom: '0.75rem',
                    lineHeight: '1.4',
                    minHeight: '3rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {product.name}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>SKU: {product.sku}</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#D8231A' }}>
                      ₹{product.retail_price ? product.retail_price.toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ARTICLES & BLOGS SECTION */}
      {articles.length > 0 && (
        <section id="articles-section" style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '5rem 2rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#D8231A', textTransform: 'uppercase', letterSpacing: '1px' }}>Blogs & News Updates</span>
              <h2 style={{ fontSize: '2.25rem', fontFamily: "'Poppins', sans-serif", fontWeight: '800', color: '#1B0A64', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                Latest Cooking Industry Articles
              </h2>
              <p style={{ color: '#475569', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem' }}>
                Learn helpful tips, safety guides, and explore details about gas stoves and industrial kitchen systems.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {articles.map(article => (
                <div key={article.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '200px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid #E2E8F0' }}>
                    {article.image ? (
                      <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <BookOpen size={40} color="#CBD5E1" />
                    )}
                  </div>
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem', fontWeight: '500' }}>
                      {new Date(article.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontFamily: "'Poppins', sans-serif", fontWeight: '700', color: '#1E293B', margin: '0 0 0.75rem 0', lineHeight: '1.3' }}>
                      {article.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 1.5rem 0', lineHeight: '1.5', flex: 1 }}>
                      {article.content.substring(0, 150)}{article.content.length > 150 ? '...' : ''}
                    </p>
                    <button
                      onClick={() => setActiveArticle(article)}
                      className="btn-brass"
                      style={{
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        alignSelf: 'flex-start'
                      }}
                    >
                      Read Full Article
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WHY CHOOSE US / ABOUT SECTION */}
      <section id="about-section" style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#D8231A', textTransform: 'uppercase', letterSpacing: '1px' }}>About Chachaji Udyog</span>
              <h2 style={{ fontSize: '2.25rem', fontFamily: "'Poppins', sans-serif", fontWeight: '800', color: '#1B0A64', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: '1.2' }}>
                Leading High-Efficiency Stove & Gas Burner Manufacturers
              </h2>
              <p style={{ color: '#475569', lineHeight: '1.7', marginBottom: '1.25rem', fontSize: '0.975rem' }}>
                For years, Chachaji Udyog has been the trusted name in manufacturing single burners, double burners, custom cooking ranges, and heavy bhattis for hotels, caterers, and homes.
              </p>
              <p style={{ color: '#475569', lineHeight: '1.7', marginBottom: '2rem', fontSize: '0.975rem' }}>
                We use high-grade cast iron and brass components ensuring optimal LPG/PNG fuel combustion splits, providing long warranty protection, and saving gas consumption by up to 35%.
              </p>
              <button 
                onClick={() => openInquiryModal('Custom Manufacturing', 'Namskar, Mujhe custom manufacturing capabilities ke bare me aur jankari chahiye.')}
                className="btn-brass"
                style={{
                  padding: '0.8rem 1.75rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Partner With Us
              </button>
            </div>

            {/* Grid of details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <Award size={32} color="#D8231A" style={{ marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1B0A64', marginBottom: '0.5rem' }}>Certified Brass</h4>
                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>Made with premium brass burner heads that carry an industry-leading warranty.</p>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <ShieldCheck size={32} color="#D8231A" style={{ marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1B0A64', marginBottom: '0.5rem' }}>Tested Safety</h4>
                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>Each burner assembly undergoes strict leakage checks before delivery.</p>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <HeartHandshake size={32} color="#D8231A" style={{ marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1B0A64', marginBottom: '0.5rem' }}>Custom Builds</h4>
                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>Tailor stove frames, pipeline points, and regulator hoses based on kitchen space.</p>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <Flame size={32} color="#D8231A" style={{ marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1B0A64', marginBottom: '0.5rem' }}>B2B Wholesale</h4>
                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>High volume wholesale pricing and direct shipping logs to commercial vendors.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT & DIRECT LEAD CAPTURE SECTION */}
      <section id="contact-section" style={{ padding: '5rem 2rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem' }}>
          {/* Info Details */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#D8231A', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact Information</span>
            <h2 style={{ fontSize: '2rem', fontFamily: "'Poppins', sans-serif", fontWeight: '800', color: '#1B0A64', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              Get In Touch With {ownerName}
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '2rem' }}>
              Have questions about custom stoves or commercial fittings? Write to us directly or visit our showroom.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#F1F5F9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={20} color="#D8231A" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Phone / WhatsApp</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1B0A64' }}>+91 {ownerPhone}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#F1F5F9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={20} color="#D8231A" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Email Support</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1B0A64' }}>info@chachajiudyog.in</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#F1F5F9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} color="#D8231A" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Showroom Address</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1B0A64', lineHeight: '1.4' }}>{ownerAddress}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Lead Capture Form */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '2.5rem',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: "'Poppins', sans-serif", fontWeight: '700', marginBottom: '1.5rem', color: '#1B0A64' }}>
              Send Direct Inquiry Message
            </h3>
            
            <form onSubmit={handleLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Your Name *</label>
                <input 
                  type="text"
                  placeholder="Enter full name"
                  value={leadForm.name}
                  onChange={e => setLeadForm({ ...leadForm, name: e.target.value })}
                  className="public-input"
                  style={{ width: '100%', padding: '0.7rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Phone Number *</label>
                  <input 
                    type="tel"
                    placeholder="Mobile number"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="public-input"
                    style={{ width: '100%', padding: '0.7rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Email (Optional)</label>
                  <input 
                    type="email"
                    placeholder="name@email.com"
                    value={leadForm.email}
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="public-input"
                    style={{ width: '100%', padding: '0.7rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Inquiry Type</label>
                <select
                  value={leadForm.type}
                  onChange={e => setLeadForm({ ...leadForm, type: e.target.value })}
                  className="public-input"
                  style={{ width: '100%', padding: '0.7rem' }}
                >
                  <option value="General Enquiry">General Enquiry</option>
                  <option value="Product Purchase">Product Purchase</option>
                  <option value="Custom Manufacturing">Custom Manufacturing</option>
                  <option value="Commercial Fitting">Commercial Fitting & Gas Pipeline</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Inquiry Details / Message</label>
                <textarea 
                  rows="3"
                  placeholder="Specify sizes, quantities or customizations..."
                  value={leadForm.message}
                  onChange={e => setLeadForm({ ...leadForm, message: e.target.value })}
                  className="public-input"
                  style={{ width: '100%', padding: '0.7rem', fontFamily: 'inherit' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="btn-brass"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                {submitting ? "Sending..." : "Submit Inquiry"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* LEAD MODAL INQUIRY FORM */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(27, 10, 100, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '480px',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#D8231A'}
              onMouseOut={e => e.currentTarget.style.color = '#94A3B8'}
            >
              <X size={20} />
            </button>

            {formSubmitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle size={56} color="#D8231A" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1B0A64', marginBottom: '0.5rem', fontFamily: "'Poppins', sans-serif" }}>Inquiry Submitted!</h3>
                <p style={{ color: '#475569', fontSize: '0.9rem' }}>We have successfully received your enquiry. Our team will contact you shortly.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '1.25rem', fontFamily: "'Poppins', sans-serif", fontWeight: '700', color: '#1B0A64', marginBottom: '0.25rem' }}>
                  Request Quote / Custom Assembly
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem' }}>
                  Please fill out the form below, and Chachaji Udyog admin will review your specs.
                </p>

                <form onSubmit={handleLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter name"
                      value={leadForm.name}
                      onChange={e => setLeadForm({ ...leadForm, name: e.target.value })}
                      className="public-input"
                      style={{ width: '100%', padding: '0.6rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Phone Number *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="Enter mobile number"
                      value={leadForm.phone}
                      onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                      className="public-input"
                      style={{ width: '100%', padding: '0.6rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Email (Optional)</label>
                    <input 
                      type="email" 
                      placeholder="name@email.com"
                      value={leadForm.email}
                      onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                      className="public-input"
                      style={{ width: '100%', padding: '0.6rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Inquiry Type</label>
                    <select
                      value={leadForm.type}
                      onChange={e => setLeadForm({ ...leadForm, type: e.target.value })}
                      className="public-input"
                      style={{ width: '100%', padding: '0.6rem' }}
                    >
                      <option value="General Enquiry">General Enquiry</option>
                      <option value="Product Purchase">Product Purchase</option>
                      <option value="Custom Manufacturing">Custom Manufacturing</option>
                      <option value="Commercial Fitting">Commercial Fitting</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Message / Specs</label>
                    <textarea 
                      rows="3"
                      placeholder="Describe what you want..."
                      value={leadForm.message}
                      onChange={e => setLeadForm({ ...leadForm, message: e.target.value })}
                      className="public-input"
                      style={{ width: '100%', padding: '0.6rem' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="btn-brass"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      marginTop: '0.5rem'
                    }}
                  >
                    {submitting ? "Sending..." : "Submit Inquiry"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ARTICLE READER MODAL */}
      {activeArticle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(27, 10, 100, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <button 
              onClick={() => setActiveArticle(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '50%',
                color: '#475569',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#D8231A'}
              onMouseOut={e => e.currentTarget.style.color = '#475569'}
            >
              <X size={18} />
            </button>

            <div style={{ overflowY: 'auto' }}>
              <div style={{ height: '280px', width: '100%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {activeArticle.image ? (
                  <img src={activeArticle.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <BookOpen size={64} color="#CBD5E1" />
                )}
              </div>
              
              <div style={{ padding: '2rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '500', display: 'block', marginBottom: '0.75rem' }}>
                  Published on {new Date(activeArticle.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1B0A64', margin: '0 0 1.25rem 0', fontFamily: "'Poppins', sans-serif", lineHeight: '1.3' }}>
                  {activeArticle.title}
                </h2>
                <div style={{ fontSize: '0.975rem', color: '#475569', lineHeight: '1.75', whiteSpace: 'pre-wrap' }}>
                  {activeArticle.content}
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 2rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC' }}>
              <button 
                onClick={() => setActiveArticle(null)}
                className="btn-brass"
                style={{
                  padding: '0.6rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{
        backgroundColor: '#F8FAFC',
        color: '#475569',
        padding: '5rem 2rem 2.5rem 2rem',
        borderTop: '1px solid #E2E8F0',
        fontSize: '0.85rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {/* Main 4-Column Grid */}
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
            
            {/* Column 1: Brand details & Social Icons */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Flame size={24} color="#D8231A" />
                <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1B0A64', letterSpacing: '0.5px', fontFamily: "'Poppins', sans-serif" }}>{ownerName.toUpperCase()}</span>
              </div>
              <p style={{ lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
                Pioneering high-efficiency, certified commercial gas bhattis, domestic stoves, and pipeline fittings since 1998.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span className="social-link" onClick={() => window.open(socialFacebook, '_blank')} title="Facebook">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </span>
                <span className="social-link" onClick={() => window.open(socialInstagram, '_blank')} title="Instagram">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </span>
                <span className="social-link" onClick={() => window.open(socialLinkedin, '_blank')} title="LinkedIn">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                </span>
                <span className="social-link" onClick={() => window.open(socialYoutube, '_blank')} title="YouTube">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z"/><path d="m10 15 5-3-5-3z"/></svg>
                </span>
              </div>
            </div>

            {/* Column 2: Products Catalog links */}
            <div>
              <h4 style={{ color: '#1B0A64', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product Catalog</h4>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="footer-link" onClick={() => { setSelectedCategory('Single Stove Burner - SS'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Single Burner (SS)</span>
                <span className="footer-link" onClick={() => { setSelectedCategory('Single Stove Burner - Iron (MS)'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Single Burner (Iron/MS)</span>
                <span className="footer-link" onClick={() => { setSelectedCategory('Double Stove Burner'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Double Burner Stoves</span>
                <span className="footer-link" onClick={() => { setSelectedCategory('Three Stove Burner'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Three Burner Ranges</span>
                <span className="footer-link" onClick={() => { setSelectedCategory('Commercial Burner'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Commercial Catering Bhatti</span>
                <span className="footer-link" onClick={() => { setSelectedCategory('Regulator'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Gas Regulators & Spares</span>
              </div>
            </div>

            {/* Column 3: Services & Support links */}
            <div>
              <h4 style={{ color: '#1B0A64', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Our Services</h4>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="footer-link" onClick={() => openInquiryModal('Custom Manufacturing', 'Namskar, Mujhe custom stove requirement ke bare me discuss krna he.')}>Custom Stove Fabrication</span>
                <span className="footer-link" onClick={() => openInquiryModal('Commercial Fitting', 'Namskar, Mujhe commercial gas pipeline fitting requirement ke bare me discuss krna he.')}>Commercial Pipeline Fitting</span>
                <span className="footer-link" onClick={() => openInquiryModal('Product Purchase', 'Namskar, Mujhe B2B bulk orders ke rates aur quotes discuss krne he.')}>B2B Wholesale Inquiry</span>
                <span className="footer-link" onClick={() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' })}>About Company Profile</span>
              </div>
            </div>

            {/* Column 4: Address Details */}
            <div>
              <h4 style={{ color: '#1B0A64', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Showroom</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <MapPin size={16} color="#ea580c" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>{ownerAddress}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={16} color="#ea580c" style={{ flexShrink: 0 }} />
                  <span>+91 {ownerPhone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} color="#ea580c" style={{ flexShrink: 0 }} />
                  <span>info@chachajiudyog.in</span>
                </div>
              </div>
            </div>

          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '2rem 0' }} />

          {/* Bottom Bar info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8rem', color: '#64748B' }}>
            <div>
              <span>© 2026 {ownerName}. All Rights Reserved. Manufactured locally with certified burners.</span>
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

      {/* FLOATING CALL WIDGET */}
      <a 
        href="tel:7300070513"
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s ease',
          textDecoration: 'none'
        }}
        className="floating-call-widget"
        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(10deg)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
      >
        <Phone size={28} />
      </a>
    </div>
  );
};

export default Catalog;
