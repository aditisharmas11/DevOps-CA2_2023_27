import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Button } from './ui/button'
import api from '../api/client'

export function InterestButton({ matchUsername, onInterestSent, size = 'sm' }) {
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  async function handleClick() {
    if (isSent || isSending) return

    setIsSending(true)
    setIsAnimating(true)

    try {
      await api.post('/api/interests', { to: matchUsername })
      setIsSent(true)
      onInterestSent?.()
      
      // Reset animation after 600ms
      setTimeout(() => setIsAnimating(false), 600)
    } catch (err) {
      console.error('Failed to send interest:', err)
      alert(err?.response?.data || 'Failed to send interest')
      setIsAnimating(false)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Button
      size={size}
      className="sm-btn-primary interest-btn"
      style={{
        flex: 1,
        background: isSent ? '#10b981' : '#ec4899',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
      }}
      onClick={handleClick}
      disabled={isSending || isSent}
    >
      <Heart 
        className="h-4 w-4" 
        style={{ 
          marginRight: 4,
          transition: 'all 0.3s ease',
          transform: isAnimating ? 'scale(1.3) rotate(15deg)' : 'scale(1) rotate(0deg)',
          fill: isSent ? '#fff' : 'transparent',
        }} 
      />
      <span style={{ position: 'relative', zIndex: 1 }}>
        {isSent ? 'Sent!' : isSending ? 'Sending...' : 'Interest'}
      </span>
      
      {/* Ripple effect */}
      {isAnimating && (
        <span
          className="interest-ripple"
          style={{
            position: 'absolute',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.6)',
            width: 20,
            height: 20,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple 0.6s ease-out',
            pointerEvents: 'none',
          }}
        />
      )}
      
      <style>{`
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
        
        .interest-btn:active {
          transform: scale(0.92) !important;
        }
        
        .interest-btn:hover:not(:disabled) {
          background: ${isSent ? '#059669' : '#db2777'} !important;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
        }
      `}</style>
    </Button>
  )
}

