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
  BarChart3
} from 'lucide-react';

const Layout = () => {
  const [networkUrl, setNetworkUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();


  // Mobile state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    fetch('http://localhost:5000/api/system/ip')
      .then(res => res.json())
      .then(data => {
        setNetworkUrl(`http://${data.ip}:${data.frontendPort}`);
      })
      .catch(err => console.error("Could not fetch network IP", err));
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/new-order', label: 'New Order & Measurement', icon: ShoppingCart },
    { path: '/workshop', label: 'Workshop Monitor', icon: Hammer },
    { path: '/daybook', label: 'Daily Daybook', icon: Wallet },
    { path: '/customers', label: 'All Customers', icon: Users },
    { path: '/all-orders', label: 'All Orders', icon: ClipboardList },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/suppliers', label: 'Supplier Ledger', icon: Store },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const closeSidebarOnMobile = () => {
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
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
        backgroundColor: 'var(--surface-color)',
        borderRight: '1px solid var(--border-color)',
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
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <img src="/humjolilogo.png" alt="Humjoli Ethnic Logo" style={{ height: '110px', objectFit: 'contain', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, fontWeight: '500', letterSpacing: '1px' }}>ERP & CRM System</p>
          
          {isMobile && (
            <button className="btn-icon" onClick={closeSidebarOnMobile} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-primary)', background: 'none', border: 'none' }}>
              <X size={24} />
            </button>
          )}
        </div>

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
                  padding: '1rem 1.5rem',
                  color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(197, 160, 89, 0.1)' : 'transparent',
                  borderRight: isActive ? '3px solid var(--accent-gold)' : '3px solid transparent',
                  transition: 'all 0.2s',
                  fontWeight: isActive ? '600' : '400'
                }}
              >
                <Icon size={20} style={{ marginRight: '12px' }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Network Engine QR */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button 
            className="btn-secondary w-full flex items-center justify-center gap-2"
            onClick={() => setShowQR(!showQR)}
          >
            <Wifi size={18} />
            Mobile Access
          </button>
          
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: isMobile ? '100vw' : 'calc(100vw - 260px)' }}>
        
        {/* Top Header - Mobile Menu Only */}
        {isMobile && (
          <header style={{
            height: '60px',
            backgroundColor: 'var(--surface-color)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <button 
              className="btn-icon" 
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <Menu size={28} />
            </button>
          </header>
        )}

        {/* Page Content Viewport */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '2.5rem' }}>
          <Outlet />
        </div>

      </main>
    </div>
  );
};

export default Layout;
