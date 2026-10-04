import React from 'react';

function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <p className="text-gray-600 mb-4">
        This is where admins will manage reported issues.
      </p>
      {/* Admin controls will go here */}
    </div>
  );
}

export default AdminDashboard;