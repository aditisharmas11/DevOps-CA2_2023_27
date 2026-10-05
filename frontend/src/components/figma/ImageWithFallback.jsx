import { useState } from 'react'
import defaultUserImage from '../../images/user_image.webp'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export function ImageWithFallback({ src, alt = '', className = '', style, fallbackSrc = defaultUserImage, ...props }) {
  const [error, setError] = useState(false)
  const fallback = fallbackSrc
  
  // If no src or src is empty/null, use default image immediately
  if (!src || src === 'null' || src === 'undefined' || src.trim() === '') {
    return (
      <img 
        src={fallback} 
        alt={alt} 
        className={className} 
        style={style} 
        {...props} 
      />
    )
  }
  
  // If src starts with /files/, prepend base URL (for backend-served images)
  const imageSrc = src.startsWith('/files/') ? `${baseURL}${src}` : src
  
  return (
    <img 
      src={error ? fallback : imageSrc} 
      alt={alt} 
      className={className} 
      style={style} 
      onError={() => setError(true)} 
      {...props} 
    />
  )
}


