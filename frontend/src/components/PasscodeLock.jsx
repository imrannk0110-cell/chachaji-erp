import React, { useState, useEffect } from 'react';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';

const PasscodeLock = ({ children }) => {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('chachaji_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleKeyPress = (num) => {
    setError(false);
    if (passcode.length < 5) {
      const newPass = passcode + num;
      setPasscode(newPass);
      if (newPass === '12345') {
        sessionStorage.setItem('chachaji_authenticated', 'true');
        setTimeout(() => {
          setIsAuthenticated(true);
        }, 300);
      } else if (newPass.length === 5) {
        // Wrong passcode entered
        setTimeout(() => {
          setError(true);
          setPasscode('');
        }, 300);
      }
    }
  };

  const handleClear = () => {
    setPasscode('');
    setError(false);
  };

  // Keyboard support for typing passcode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isAuthenticated) return;
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setPasscode(prev => prev.slice(0, -1));
        setError(false);
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [passcode, isAuthenticated]);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(13, 15, 18, 0.95)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div className="glass-panel" style={{
        width: '360px',
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        border: '1px solid rgba(224, 90, 16, 0.25)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(224, 90, 16, 0.05)',
        textAlign: 'center',
        background: 'rgba(22, 27, 34, 0.75)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: error ? 'rgba(248, 81, 73, 0.1)' : 'rgba(224, 90, 16, 0.1)',
          border: error ? '1px solid var(--danger)' : '1px solid var(--accent-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          transition: 'all 0.3s ease'
        }}>
          {error ? (
            <AlertTriangle size={28} color="var(--danger)" />
          ) : passcode.length === 5 ? (
            <Unlock size={28} color="var(--success)" />
          ) : (
            <Lock size={28} color="var(--accent-gold)" />
          )}
        </div>

        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
          Enter Passcode
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 2rem 0' }}>
          Access to admin functions is restricted.
        </p>

        {/* Passcode dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2.5rem'
        }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: error ? '2px solid var(--danger)' : '2px solid var(--accent-gold)',
                backgroundColor: i < passcode.length
                  ? (error ? 'var(--danger)' : 'var(--accent-gold)')
                  : 'transparent',
                boxShadow: i < passcode.length && !error
                  ? '0 0 8px var(--accent-gold)'
                  : 'none',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Numeric keypad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          maxWidth: '280px',
          margin: '0 auto'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(String(num))}
              className="keypad-btn"
              style={{
                height: '56px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-light)',
                color: 'var(--text-primary)',
                fontSize: '1.25rem',
                fontWeight: '600',
                transition: 'all 0.15s ease',
                outline: 'none',
                cursor: 'pointer'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-gold-dim)';
                e.currentTarget.style.borderColor = 'var(--accent-gold)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-light)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-light)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            style={{
              height: '56px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="keypad-btn"
            style={{
              height: '56px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-light)',
              color: 'var(--text-primary)',
              fontSize: '1.25rem',
              fontWeight: '600',
              transition: 'all 0.15s ease',
              outline: 'none',
              cursor: 'pointer'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-gold-dim)';
              e.currentTarget.style.borderColor = 'var(--accent-gold)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-light)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-light)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            0
          </button>
          <button
            onClick={() => setPasscode(prev => prev.slice(0, -1))}
            style={{
              height: '56px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasscodeLock;
