import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  const isAgent = user.role === 'AGENT';

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <h2>LOGISTICS HUB</h2>
        </div>
        <nav>
          <ul className="sidebar-menu">
            {!isAgent ? (
              <>
                <li>
                  <NavLink to="/" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} end>
                    <svg className="sidebar-item-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '12px' }}>
                      <rect x="3" y="3" width="7" height="9" rx="1"/>
                      <rect x="14" y="3" width="7" height="5" rx="1"/>
                      <rect x="14" y="12" width="7" height="9" rx="1"/>
                      <rect x="3" y="16" width="7" height="5" rx="1"/>
                    </svg>
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/inventory" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                    <svg className="sidebar-item-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '12px' }}>
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    Inventory
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/shipments" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                    <svg className="sidebar-item-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '12px' }}>
                      <rect x="1" y="3" width="15" height="13"/>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/>
                      <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    Shipments
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/deliveries" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                    <svg className="sidebar-item-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '12px' }}>
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Deliveries
                  </NavLink>
                </li>
                {user.role === 'ADMIN' && (
                  <li>
                    <NavLink to="/users" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                      <svg className="sidebar-item-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '12px' }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      User Management
                    </NavLink>
                  </li>
                )}
              </>
            ) : (
              <li>
                <NavLink to="/" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} end>
                  <svg className="sidebar-item-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '12px' }}>
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  My Deliveries
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-name">{user.username}</div>
          <div className="sidebar-user-role">{user.role.replace('_', ' ')}</div>
        </div>
        <button className="sidebar-logout" onClick={logout}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
