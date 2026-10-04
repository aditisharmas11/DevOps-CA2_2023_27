// src/components/posts/CreatePost.js
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Category data with icons (same as in App.js)
const categories = [
  { name: "pothole", color: "bg-orange-500" },
  { name: "accident", color: "bg-red-500" },
  { name: "road issue", color: "bg-yellow-500" },
  { name: "infrastructure", color: "bg-blue-500" },
  { name: "public safety", color: "bg-purple-500" }
];

function CreatePost() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setUseCurrentLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Here you would typically use a reverse geocoding service
          // For now, we'll just use coordinates
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          setUseCurrentLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setUseCurrentLocation(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !description || !category || !location || !imageFile) {
      setError('Please fill in all fields and upload an image');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // 1. Upload image to Firebase Storage
      const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);
      
      // 2. Create post document in Firestore
      const postData = {
        title,
        description,
        category,
        location,
        imageUrl,
        author: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
          email: currentUser.email
        },
        upvotes: 0,
        comments: 0,
        status: 'reported', // Initial status
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'posts'), postData);
      
      // 3. Redirect to home page
      navigate('/');
      
    } catch (error) {
      console.error("Error creating post:", error);
      setError('Failed to create post: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 mb-16">
      <h1 className="text-2xl font-bold mb-6">Report an Issue</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Image Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image
          </label>
          
          {!imagePreview ? (
            <div 
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
            >
              <Camera size={48} className="text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to upload an image of the issue</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          ) : (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="rounded-lg max-h-64 mx-auto"
              />
              <button 
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        
        {/* Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of the issue"
            required
          />
        </div>
        
        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Provide more details about the issue"
            required
          />
        </div>
        
        {/* Category */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  category === cat.name 
                    ? `${cat.color} text-white` 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setCategory(cat.name)}
              >
                <span className="capitalize">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Location */}
        <div className="mb-6">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <div className="flex">
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Address or intersection"
              required
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              className="bg-blue-600 text-white px-3 py-2 rounded-r-md flex items-center"
              disabled={useCurrentLocation}
            >
              <MapPin size={18} className="mr-1" />
              {useCurrentLocation ? 'Getting...' : 'Current'}
            </button>
          </div>
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreatePost;