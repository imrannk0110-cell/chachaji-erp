import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  ShoppingCart, 
  Hammer, 
  Settings, 
  Search,
  Wifi,
  Wallet,
  Menu,
  X,
  Package,
  ClipboardList,
  BarChart3,
  Sun,
  Moon
} from 'lucide-react';

const Layout = () => {
  const [networkUrl, setNetworkUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();


  // Mobile state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true); // Always show sidebar on desktop
      else setSidebarOpen(false); // Default hide on mobile
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Fetch local IP from backend
    fetch('/api/system/ip')
      .then(res => res.json())
      .then(data => {
        setNetworkUrl(`http://${data.ip}:${data.frontendPort}`);
      })
      .catch(err => console.error("Could not fetch network IP", err));
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/dashboard/new-order', label: 'New Order', icon: ShoppingCart },
    { path: '/dashboard/workshop', label: 'Factory Monitor', icon: Hammer },
    { path: '/dashboard/daybook', label: 'Daily Daybook', icon: Wallet },
    { path: '/dashboard/customers', label: 'All Customers', icon: Users },
    { path: '/dashboard/all-orders', label: 'All Orders', icon: ClipboardList },
    { path: '/dashboard/inventory', label: 'Inventory', icon: Package },
    { path: '/dashboard/suppliers', label: 'Supplier Ledger', icon: Store },
    { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const closeSidebarOnMobile = () => {
    if (isMobile) setSidebarOpen(false);
  };

  // Helper to dynamically get page titles
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/dashboard/new-order':
        return 'New Order';
      case '/dashboard/workshop':
        return 'Factory Monitor';
      case '/dashboard/daybook':
        return 'Daily Daybook';
      case '/dashboard/customers':
        return 'All Customers';
      case '/dashboard/all-orders':
        return 'All Orders';
      case '/dashboard/inventory':
        return 'Inventory';
      case '/dashboard/suppliers':
        return 'Supplier Ledger';
      case '/dashboard/analytics':
        return 'Analytics';
      case '/dashboard/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-color)' }}>
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={closeSidebarOnMobile}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' : 'relative',
        height: '100vh',
        zIndex: 50,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform 0.3s ease-in-out',
        left: 0,
        top: 0
      }}>
        {/* Sidebar Header with Brand Logo */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
            <img 
              src="/Chachaji Udyog Logo.png" 
              alt="Chachaji Udyog Logo" 
              style={{ width: '100px', height: 'auto', marginBottom: '12px', objectFit: 'contain' }} 
            />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--sidebar-text-active)', letterSpacing: '2px', textAlign: 'center' }}>CHACHAJI UDYOG</span>
          </div>
          <p style={{ color: 'var(--sidebar-text)', fontSize: '0.75rem', margin: 0, fontWeight: '500', letterSpacing: '1px' }}>ERP & CRM System</p>
          
          {isMobile && (
            <button className="btn-icon" onClick={closeSidebarOnMobile} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--sidebar-text)', background: 'none', border: 'none' }}>
              <X size={24} />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="no-scrollbar" style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={closeSidebarOnMobile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.85rem 1.5rem',
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                  backgroundColor: isActive ? 'var(--sidebar-item-active)' : 'transparent',
                  borderLeft: isActive ? '4px solid var(--sidebar-indicator)' : '4px solid transparent',
                  transition: 'all 0.2s',
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '0.95rem'
                }}
              >
                <Icon size={18} style={{ marginRight: '12px' }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Network Engine QR & Theme Toggle */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--sidebar-border)' }}>
          <div className="flex gap-2 w-full">
            <button 
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
              onClick={() => setShowQR(!showQR)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--sidebar-text)',
                border: '1px solid var(--sidebar-border)'
              }}
            >
              <Wifi size={16} />
              Mobile Access
            </button>
            <button 
              className="btn-secondary flex items-center justify-center"
              style={{ 
                padding: '0.6rem', 
                width: '42px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--sidebar-text)',
                border: '1px solid var(--sidebar-border)'
              }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          
          {showQR && networkUrl && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: '#fff', 
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <QRCodeSVG value={networkUrl} size={150} />
              <p style={{ color: '#000', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', fontWeight: '500' }}>
                Scan to open on Shop Wi-Fi
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        width: isMobile ? '100vw' : 'calc(100vw - 260px)',
        backgroundColor: 'var(--bg-color)' 
      }}>
        
        {/* Top Header - Unified for Desktop and Mobile */}
        <header style={{
          height: '70px',
          backgroundColor: 'var(--surface-color)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          flexShrink: 0,
          zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isMobile && (
              <button 
                onClick={() => setSidebarOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Menu size={24} />
              </button>
            )}
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.35rem', 
              fontWeight: '700', 
              color: 'var(--text-primary)',
              fontFamily: 'Outfit',
              letterSpacing: '-0.02em'
            }}>
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          {/* Profile Badge (Matches Reference Image) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.9rem',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
            }}>
              A
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }} className="hidden-mobile">
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>Admin</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Manager</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '2.5rem' }}>
          <Outlet />
        </div>

      </main>
    </div>
  );
};

export default Layout;
