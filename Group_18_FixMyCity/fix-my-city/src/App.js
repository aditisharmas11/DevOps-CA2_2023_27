import React, { useState } from 'react';
import { Camera, AlertTriangle, ThumbsUp, MessageSquare, MapPin, Menu, Search, Home as HomeIcon, Tag, Bell, User, LogOut } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';

// Auth components
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import ForgotPassword from './components/auth/ForgotPassword';

// Application components
import CreatePost from './components/posts/CreatePost';
import PostDetail from './components/posts/PostDetail';
import AdminDashboard from './components/admin/AdminDashboard';

// Sample data for initial posts
const initialPosts = [
  {
    id: 1,
    title: "Large pothole on Main Street",
    description: "This pothole has been growing for weeks and is now causing traffic issues.",
    category: "pothole",
    location: "Main St & 5th Ave",
    imageUrl: "/api/placeholder/640/480",
    upvotes: 24,
    comments: 7,
    timestamp: "2 hours ago",
    author: "roadwatcher"
  },
  {
    id: 2,
    title: "Traffic light malfunctioning",
    description: "The traffic light at this intersection has been flashing red for 3 days now.",
    category: "road issue",
    location: "Oak Ave & Pine St",
    imageUrl: "/api/placeholder/640/480",
    upvotes: 37,
    comments: 12,
    timestamp: "5 hours ago",
    author: "safetyFirst"
  },
  {
    id: 3,
    title: "Minor accident blocking right lane",
    description: "Two cars involved in a fender bender. Police not yet on scene.",
    category: "accident",
    location: "Highway 101 Northbound",
    imageUrl: "/api/placeholder/640/480",
    upvotes: 15,
    comments: 4,
    timestamp: "20 minutes ago",
    author: "alertDriver"
  }
];

// Category data with icons
const categories = [
  { name: "pothole", color: "bg-orange-500", icon: <AlertTriangle className="w-4 h-4" /> },
  { name: "accident", color: "bg-red-500", icon: <AlertTriangle className="w-4 h-4" /> },
  { name: "road issue", color: "bg-yellow-500", icon: <AlertTriangle className="w-4 h-4" /> },
  { name: "infrastructure", color: "bg-blue-500", icon: <AlertTriangle className="w-4 h-4" /> },
  { name: "public safety", color: "bg-purple-500", icon: <AlertTriangle className="w-4 h-4" /> }
];

// Header component with auth integration
const Header = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleReportClick = () => {
    if (currentUser) {
      navigate('/create-post');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <header className="bg-blue-600 p-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center space-x-2">
            <AlertTriangle className="text-white" />
            <h1 className="text-white text-xl font-bold">FixMyCity</h1>
          </Link>
        </div>
        <div className="relative flex-1 max-w-lg mx-4">
          <input
            type="text"
            placeholder="Search issues..."
            className="w-full bg-blue-700 text-white placeholder-blue-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <Search className="absolute right-3 top-2.5 text-blue-300" size={18} />
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={handleReportClick} className="bg-white text-blue-600 font-medium rounded-full px-4 py-1.5 flex items-center">
            <Camera size={18} className="mr-1" /> Report Issue
          </button>
          
          {currentUser ? (
            <div className="flex items-center space-x-2">
              {isAdmin && (
                <Link to="/admin" className="text-white hover:text-blue-200">
                  Admin
                </Link>
              )}
              <div className="text-white text-sm mr-2 hidden md:block">
                {currentUser.displayName || currentUser.email}
              </div>
              <button onClick={handleLogout} className="text-white hover:text-blue-200">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-white hover:text-blue-200">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

// Navigation component
const Navigation = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-10">
      <div className="flex justify-around items-center py-2">
        <Link to="/" className="flex flex-col items-center p-2 text-blue-600">
          <HomeIcon size={20} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <button className="flex flex-col items-center p-2 text-gray-500">
          <Tag size={20} />
          <span className="text-xs mt-1">Categories</span>
        </button>
        <button className="flex flex-col items-center p-2 text-gray-500">
          <Bell size={20} />
          <span className="text-xs mt-1">Alerts</span>
        </button>
        <Link to={currentUser ? "/profile" : "/login"} className="flex flex-col items-center p-2 text-gray-500">
          <User size={20} />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

// Post card component
const PostCard = ({ post, onUpvote }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <img src={post.imageUrl} alt={post.title} className="w-full h-64 object-cover" />
      <div className="p-4">
        <div className="flex items-center mb-2">
          <span className={`${getCategoryColor(post.category)} text-white text-xs font-medium rounded-full px-2.5 py-0.5 mr-2`}>
            {post.category}
          </span>
          <span className="text-gray-500 text-sm flex items-center">
            <MapPin size={14} className="mr-1" /> {post.location}
          </span>
          <span className="text-gray-500 text-sm ml-auto">{post.timestamp}</span>
        </div>
        <h2 className="text-lg font-semibold mb-1">{post.title}</h2>
        <p className="text-gray-600 text-sm mb-3">{post.description}</p>
        <div className="flex items-center text-sm text-gray-500">
          <button 
            className="flex items-center mr-4 hover:text-blue-600" 
            onClick={() => onUpvote(post.id)}
          >
            <ThumbsUp size={16} className="mr-1" /> {post.upvotes}
          </button>
          <div className="flex items-center">
            <MessageSquare size={16} className="mr-1" /> {post.comments}
          </div>
          <span className="ml-auto text-xs">Posted by @{post.author}</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to get category color
const getCategoryColor = (category) => {
  const found = categories.find(c => c.name === category);
  return found ? found.color : "bg-gray-500";
};

// Category filter component
const CategoryFilter = ({ selectedCategory, onSelectCategory }) => {
  return (
    <div className="overflow-x-auto whitespace-nowrap py-2 mb-4">
      <div className="inline-flex space-x-2 px-4">
        <button 
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => onSelectCategory('all')}
        >
          All Issues
        </button>
        {categories.map(category => (
          <button 
            key={category.name}
            className={`rounded-full px-3 py-1.5 text-sm font-medium flex items-center ${selectedCategory === category.name ? category.color + ' text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => onSelectCategory(category.name)}
          >
            {category.icon}
            <span className="ml-1 capitalize">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Home component (previously in App)
const HomePage = () => {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter posts by category
  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  // Handle upvote
  const handleUpvote = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, upvotes: post.upvotes + 1 } : post
    ));
  };

  return (
    <div className="pb-16">
      <CategoryFilter 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />
      
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">
          {selectedCategory === 'all' ? 'Recent Reports' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Issues`}
        </h2>
        <p className="text-gray-600 text-sm">Help improve your community by reporting and upvoting local issues</p>
      </div>
      
      {filteredPosts.map(post => (
        <PostCard 
          key={post.id} 
          post={post} 
          onUpvote={handleUpvote} 
        />
      ))}
    </div>
  );
};

// Main app component
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="bg-gray-100 min-h-screen">
          <Header />
          
          <main className="container mx-auto px-4 py-4">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/SignUp" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/post/:postId" element={<PostDetail />} />
              
              {/* Protected routes */}
              <Route 
                path="/create-post" 
                element={
                  <PrivateRoute>
                    <CreatePost />
                  </PrivateRoute>
                } 
              />
              
              {/* Admin routes */}
              <Route 
                path="/admin" 
                element={
                  <PrivateRoute requireAdmin={true}>
                    <AdminDashboard />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </main>
          
          <Navigation />
        </div>
      </AuthProvider>
    </Router>
  );
}