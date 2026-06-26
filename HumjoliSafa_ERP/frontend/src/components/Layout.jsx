import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  ShoppingCart, 
  Hammer, 
  Settings, 
  Search,
  Wifi
} from 'lucide-react';

const Layout = () => {
  const [networkUrl, setNetworkUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Fetch local IP from backend
    fetch('http://localhost:5000/api/system/ip')
      .then(res => res.json())
      .then(data => {
        // Assuming Vite serves on 3000 as per prompt, construct URL
        setNetworkUrl(`http://${data.ip}:${data.frontendPort}`);
      })
      .catch(err => console.error("Could not fetch network IP", err));
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/pos', label: 'POS Checkout', icon: ShoppingCart },
    { path: '/crm', label: 'CRM & Dialer', icon: Users },
    { path: '/workshop', label: 'Workshop Monitor', icon: Hammer },
    { path: '/suppliers', label: 'Supplier Ledger', icon: Store },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--surface-color)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem', letterSpacing: '1px' }}>HUMJOLI SAFA</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>ERP & CRM System</p>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Top Header - Universal Search */}
        <header style={{
          height: '70px',
          backgroundColor: 'var(--bg-color)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2rem',
          justifyContent: 'space-between'
        }}>
          <div style={{ position: 'relative', width: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search Orders, Mobile, SKU, or Invoice..." 
              style={{
                width: '100%',
                paddingLeft: '40px',
                backgroundColor: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px'
              }}
            />
          </div>
          
          <div className="flex gap-4">
             <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Exp. Deliveries Today</button>
             <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Tomorrow Handover</button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <Outlet />
        </div>

      </main>
    </div>
  );
};

export default Layout;
