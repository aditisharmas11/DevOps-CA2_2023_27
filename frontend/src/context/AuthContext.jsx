import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user session exists in localStorage
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Clear corrupted storage
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('auth/login/', { username, password });
      const { access, refresh, user: userProfile } = response.data;

      // Save tokens and profile details to localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userProfile));

      // Update state
      setUser(userProfile);
      return userProfile;
    } catch (error) {
      throw error.response?.data?.detail || 'Invalid username or password';
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    // Reset state
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
