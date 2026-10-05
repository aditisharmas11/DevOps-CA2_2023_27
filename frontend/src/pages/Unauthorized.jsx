import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div style={{ padding: '80px 40px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '48px', color: 'var(--accent-danger)', marginBottom: '16px' }}>
        403
      </h1>
      <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Access Denied</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        You do not have the required permissions to access this screen.
      </p>
      <Link 
        to="/" 
        style={{ 
          color: 'var(--text-primary)', 
          textDecoration: 'none', 
          background: 'var(--accent-gradient)',
          padding: '10px 24px',
          borderRadius: 'var(--border-radius)',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
        }}
      >
        Go to Home Dashboard
      </Link>
    </div>
  );
};

export default Unauthorized;
