import React from 'react';

function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Fix My City</h1>
      <p className="text-gray-600 mb-4">
        Welcome to Fix My City! Report and track issues in your community.
      </p>
      {/* Posts list will go here */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
        <p className="text-gray-500">Posts will appear here once they're created.</p>
      </div>
    </div>
  );
}

export default Home;