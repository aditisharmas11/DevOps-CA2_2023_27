import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Clock, ShieldAlert, CheckCircle2, RefreshCw,
  LogOut, Stethoscope, FileText, Loader2, Hospital, Award
} from 'lucide-react'

export default function DoctorStatusPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    const updated = await refreshUser()
    setRefreshing(false)
    if (updated?.verificationStatus === 'verified') {
      navigate('/doctor')
    }
  }

  const status = user?.verificationStatus || 'pending'

  return (
    <div className="auth-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '36px 32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        
        {/* ── Status Icon ───────────────────────────────────────────── */}
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: status === 'verified'
            ? 'rgba(5,150,105,0.12)'
            : status === 'rejected'
              ? 'rgba(220,38,38,0.12)'
              : 'rgba(217,119,6,0.12)',
          color: status === 'verified'
            ? '#059669'
            : status === 'rejected'
              ? '#dc2626'
              : '#d97706',
        }}>
          {status === 'verified' && <CheckCircle2 size={36} />}
          {status === 'rejected' && <ShieldAlert size={36} />}
          {status === 'pending' && <Clock size={36} />}
        </div>

        {/* ── Status Header ─────────────────────────────────────────── */}
        <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text)', marginBottom: 8 }}>
          {status === 'verified' && 'Doctor Credentials Verified!'}
          {status === 'pending' && 'Doctor Application Pending Administrator Review'}
          {status === 'rejected' && 'Doctor Application Not Approved'}
        </h2>

        {/* ── Status Description ────────────────────────────────────── */}
        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
          {status === 'verified' && (
            <p>
              Congratulations, <b>Dr. {user?.name}</b>! Your medical credentials and ID document have been reviewed and approved by the Administrator. You now have full access to patient health records, diagnostic engines, and clinical decision support.
            </p>
          )}

          {status === 'pending' && (
            <div>
              <p>
                Hello, <b>Dr. {user?.name}</b>. Your application and uploaded medical ID document have been securely transmitted to the MediTwin Administrator for verification.
              </p>

              {/* Application Details Summary */}
              <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13, textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Application Summary</span>
                  <span className="badge badge-moderate" style={{ fontSize: 10, padding: '2px 8px' }}>Review Pending</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Doctor ID: </span>
                    <b style={{ fontFamily: 'monospace' }}>{user?.doctorId || 'DOC-PENDING'}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Specialization: </span>
                    <b>{user?.specialization || 'General Medicine'}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>License #: </span>
                    <b>{user?.licenseNumber || 'Submitted'}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Hospital: </span>
                    <b>{user?.hospitalAffiliation || 'Submitted'}</b>
                  </div>
                </div>

                {user?.doctorIdDocument?.url && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--brand)' }}>
                    <FileText size={14} />
                    <span>Medical ID Document attached for verification</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
                Administrator approval is required to safeguard patient privacy and ensure only certified clinical practitioners access patient telemetry.
              </div>
            </div>
          )}

          {status === 'rejected' && (
            <div>
              <p>
                Dr. {user?.name}, your doctor application could not be verified by the administrator at this time.
              </p>
              {user?.rejectionReason && (
                <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, textAlign: 'left' }}>
                  <b>Administrator Reason:</b> {user.rejectionReason}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {status === 'verified' ? (
            <Link to="/doctor" className="btn-primary" style={{ padding: '10px 24px', textDecoration: 'none' }}>
              <Stethoscope size={16} /> Enter Doctor Clinical Dashboard →
            </Link>
          ) : (
            <button
              className="btn-secondary"
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ padding: '10px 20px' }}
            >
              {refreshing ? <><Loader2 size={15} className="spin" /> Checking Approval...</> : <><RefreshCw size={15} /> Refresh Approval Status</>}
            </button>
          )}

          <button
            className="btn-ghost"
            onClick={() => { logout(); navigate('/login') }}
            style={{ padding: '10px 18px', color: 'var(--muted)' }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>

      </div>
    </div>
  )
}
