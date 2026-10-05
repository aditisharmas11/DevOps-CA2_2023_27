import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formError, setFormError] = useState('');

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('AGENT');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('auth/users/');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to fetch users.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- MODAL HANDLERS ---
  const openModal = (user = null) => {
    setFormError('');
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setEmail(user.email || '');
      setRole(user.role);
      setPhone(user.phone || '');
      setPassword('');
    } else {
      setEditingUser(null);
      setUsername('');
      setEmail('');
      setRole('AGENT');
      setPhone('');
      setPassword('');
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      username,
      email,
      role,
      phone: phone || null,
    };

    // Only include password if provided
    if (password) {
      payload.password = password;
    }

    try {
      if (editingUser) {
        await api.patch(`auth/users/${editingUser.id}/`, payload);
      } else {
        if (!password) {
          setFormError('Password is required when creating a new user.');
          return;
        }
        await api.post('auth/users/', payload);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      const errorData = err.response?.data;
      if (typeof errorData === 'object') {
        const errorMsg = Object.entries(errorData)
          .map(([key, val]) => `${key.replace('_', ' ')}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join('\n');
        setFormError(errorMsg || 'Failed to save user.');
      } else {
        setFormError('Failed to save user.');
      }
    }
  };

  const handleDeactivate = async (user) => {
    const action = user.employment_status === 'FORMER' ? 'reactivate' : 'mark as former employee';
    if (!window.confirm(`Are you sure you want to ${action} "${user.username}"?`)) return;

    try {
      if (user.employment_status === 'FORMER') {
        // Reactivate
        await api.patch(`auth/users/${user.id}/`, {
          is_active: true,
          employment_status: 'ACTIVE',
        });
      } else {
        // Soft delete (mark as former)
        await api.delete(`auth/users/${user.id}/`);
      }
      fetchUsers();
    } catch (err) {
      alert(`Failed to ${action}.`);
    }
  };

  // --- FILTERING ---
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery));
    const matchesRole = filterRole ? u.role === filterRole : true;
    const matchesStatus = filterStatus ? u.employment_status === filterStatus : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // --- STATS ---
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.employment_status === 'ACTIVE').length;
  const formerUsers = users.filter(u => u.employment_status === 'FORMER').length;
  const managers = users.filter(u => u.role === 'MANAGER' && u.employment_status === 'ACTIVE').length;
  const agents = users.filter(u => u.role === 'AGENT' && u.employment_status === 'ACTIVE').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            User Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Create, edit, and manage employees
          </p>
        </div>
        <Button onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Add New User
        </Button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Users</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{activeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Managers</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--accent-primary)' }}>{managers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Agents</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6' }}>{agents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Former Employees</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>{formerUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card style={{ marginBottom: '20px' }}>
        <CardContent style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="AGENT">Agent</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="FORMER">Former Employee</option>
          </select>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent style={{ padding: '0' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} style={{ opacity: u.employment_status === 'FORMER' ? 0.6 : 1 }}>
                    <TableCell style={{ fontWeight: '600' }}>{u.username}</TableCell>
                    <TableCell>{u.email || '—'}</TableCell>
                    <TableCell>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background:
                            u.role === 'ADMIN'
                              ? '#dbeafe'
                              : u.role === 'MANAGER'
                              ? '#fef3c7'
                              : '#ede9fe',
                          color:
                            u.role === 'ADMIN'
                              ? '#1d4ed8'
                              : u.role === 'MANAGER'
                              ? '#b45309'
                              : '#6d28d9',
                        }}
                      >
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell>{u.phone || '—'}</TableCell>
                    <TableCell>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: u.employment_status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: u.employment_status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {u.employment_status === 'ACTIVE' ? 'Active' : 'Former Employee'}
                      </span>
                    </TableCell>
                    <TableCell style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {new Date(u.date_joined).toLocaleDateString()}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModal(u)}
                          style={{ fontSize: '13px' }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant={u.employment_status === 'FORMER' ? 'default' : 'destructive'}
                          size="sm"
                          onClick={() => handleDeactivate(u)}
                          style={{ fontSize: '13px' }}
                        >
                          {u.employment_status === 'FORMER' ? 'Reactivate' : 'Deactivate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit User Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent style={{ maxWidth: '480px' }}>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
              {formError && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre-line' }}>
                  {formError}
                </div>
              )}

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                  style={{ marginTop: '6px' }}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  style={{ marginTop: '6px' }}
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  style={{
                    marginTop: '6px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="MANAGER">Warehouse Manager</option>
                  <option value="AGENT">Delivery Agent</option>
                </select>
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  style={{ marginTop: '6px' }}
                />
              </div>

              <div>
                <Label htmlFor="password">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser}
                  placeholder={editingUser ? 'Leave blank to keep unchanged' : 'Enter password'}
                  style={{ marginTop: '6px' }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? 'Save Changes' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
