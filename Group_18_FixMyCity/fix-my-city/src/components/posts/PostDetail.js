import React from 'react';
import { useParams } from 'react-router-dom';

function PostDetail() {
  const { postId } = useParams();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Issue Details</h1>
      <p className="text-gray-600 mb-2">Post ID: {postId}</p>
      <p className="text-gray-600 mb-4">
        This is where users will see the details of a specific issue report.
      </p>
      {/* Post content will go here */}
    </div>
  );
}

export default PostDetail;