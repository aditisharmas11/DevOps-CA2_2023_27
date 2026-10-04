import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export default function GoogleAuthButton({ onGoogleSuccess, onError, role = 'patient', label = 'Continue with Google' }) {
  const containerRef = useRef(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return

    const initGoogle = () => {
      if (window.google?.accounts?.id && containerRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onGoogleSuccess(response.credential)
            } else {
              onError?.('Google authentication did not return credentials.')
            }
          },
        })

        // Render official Google button
        containerRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 380,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        })
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          initGoogle()
        }
      }, 300)
      return () => clearInterval(interval)
    }
  }, [clientId, onGoogleSuccess, onError])

  const handleCustomClick = () => {
    if (!clientId) {
      setShowConfigModal(true)
      return
    }
    // If GIS button is mounted, click its inner button if possible or prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Container for rendered Google Button when Client ID is configured */}
      {clientId ? (
        <div
          ref={containerRef}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', minHeight: '44px' }}
        />
      ) : (
        /* Sleek custom button when Client ID is yet to be set */
        <button
          type="button"
          onClick={handleCustomClick}
          className="btn-ghost"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
        >
          {/* Official Google SVG Logo */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          {label}
        </button>
      )}

      {/* Info Modal if user clicks Google login before setting Google Cloud Client ID */}
      {showConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 460,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
          >
            <button
              className="btn-ghost"
              onClick={() => setShowConfigModal(false)}
              style={{ position: 'absolute', right: 14, top: 14, padding: 4 }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(66, 133, 244, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                Google Sign-In Configuration
              </h3>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
              Google Sign-In backend and client logic is fully installed! To link your Google project:
            </p>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                fontSize: 12,
                fontFamily: 'monospace',
                marginBottom: 16,
              }}
            >
              <div style={{ color: 'var(--muted)', marginBottom: 4 }}># In frontend/.env:</div>
              <div style={{ color: 'var(--brand)', fontWeight: 700 }}>
                VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>
              You can obtain this Client ID from the <b>Google Cloud Console</b> &gt; <b>APIs &amp; Services</b> &gt; <b>Credentials</b> &gt; <b>OAuth 2.0 Web Client</b>. In the meantime, you can log in directly using your email and password!
            </p>

            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowConfigModal(false)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
