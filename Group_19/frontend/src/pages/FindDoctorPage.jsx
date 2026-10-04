import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Search, MapPin, Stethoscope, Filter, X, Star, Clock,
  ChevronDown, ChevronRight, Loader2, AlertCircle, UserCheck,
  Phone, Video, Building2, GraduationCap, IndianRupee,
  ArrowLeft, ExternalLink, Heart, Shield, RefreshCw,
  SlidersHorizontal, Mail, Copy, Check, Share2, Send,
  Calendar, Navigation, Sparkles, Globe, Award, CheckCircle2,
  AlertTriangle, Info
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

/* ─── Comprehensive Specialty Metadata (22+ disciplines) ──────── */
const SPECIALTY_META = {
  'General Medicine':     { icon: '🩺', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  Dental:                 { icon: '🦷', color: '#0284c7', bg: 'rgba(2,132,199,0.1)' },
  Physiotherapy:          { icon: '💆', color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
  Dermatology:            { icon: '✨', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  Pediatrics:             { icon: '👶', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  'General Surgery':      { icon: '🔬', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  Diabetology:            { icon: '🩸', color: '#e11d48', bg: 'rgba(225,29,72,0.1)' },
  Cardiology:             { icon: '❤️', color: '#be123c', bg: 'rgba(190,18,60,0.1)' },
  Pulmonology:            { icon: '🫁', color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
  Gynecology:             { icon: '🌸', color: '#db2777', bg: 'rgba(219,39,119,0.1)' },
  Obstetrics:             { icon: '🤰', color: '#ca8a04', bg: 'rgba(202,138,4,0.1)' },
  Nephrology:             { icon: '🩺', color: '#4f46e5', bg: 'rgba(79,70,229,0.1)' },
  Orthopedics:            { icon: '🦴', color: '#ea580c', bg: 'rgba(234,88,12,0.1)' },
  Neurology:              { icon: '🧠', color: '#9333ea', bg: 'rgba(147,51,234,0.1)' },
  'ENT / Otolaryngology': { icon: '👂', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  Psychiatry:             { icon: '🌿', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  Ophthalmology:          { icon: '👁️', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  Gastroenterology:       { icon: '🧪', color: '#b45309', bg: 'rgba(180,83,9,0.1)' },
  Urology:                { icon: '💧', color: '#0284c7', bg: 'rgba(2,132,199,0.1)' },
  EmergencyMedicine:      { icon: '🚑', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  'Emergency Medicine':   { icon: '🚑', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  'Ayurveda panchakarma': { icon: '🍃', color: '#15803d', bg: 'rgba(21,128,61,0.1)' },
  Acupuncture:            { icon: '🪡', color: '#0f766e', bg: 'rgba(15,118,110,0.1)' },
  Oncology:               { icon: '🎗️', color: '#6d28d9', bg: 'rgba(109,40,217,0.1)' },
}

const ALL_POPULAR_SPECIALTIES = [
  'General Medicine',
  'Dental',
  'Dermatology',
  'Pediatrics',
  'Physiotherapy',
  'Diabetology',
  'Cardiology',
  'General Surgery',
  'Pulmonology',
  'Gynecology',
  'Obstetrics',
  'Nephrology',
  'Orthopedics',
  'Neurology',
  'ENT / Otolaryngology',
  'Psychiatry',
  'Ophthalmology',
  'Emergency Medicine',
  'Ayurveda panchakarma',
  'Acupuncture',
  'Gastroenterology',
  'Urology',
]

const MAJOR_CITIES = [
  { value: '', label: 'All Locations / Nationwide' },
  { value: 'Chennai', label: '📍 Chennai (Active Clinics)' },
  { value: 'Thiruvallur', label: '📍 Thiruvallur (Active Clinics)' },
  { value: 'Krishnagiri', label: '📍 Krishnagiri (Active Clinics)' },
  { value: 'Kanchipuram', label: '📍 Kanchipuram (Active Clinics)' },
  { value: 'Cuddalore', label: '📍 Cuddalore (Active Clinics)' },
  { value: 'Pune', label: '🌐 Pune (Online Consultations)' },
  { value: 'Mumbai', label: '🌐 Mumbai (Online Consultations)' },
  { value: 'Delhi NCR', label: '🌐 Delhi NCR (Online Consultations)' },
  { value: 'Bengaluru', label: '🌐 Bengaluru (Online Consultations)' },
  { value: 'Hyderabad', label: '🌐 Hyderabad (Online Consultations)' },
  { value: 'Kolkata', label: '🌐 Kolkata (Online Consultations)' },
]

/* ─── Data Extraction & Formatting Helpers ───────────────────── */
const formatDoctorName = (raw) => {
  if (!raw) return 'Dr. Medical Specialist'
  let str = String(raw).trim()
  const hasDr = /^dr\.?\s+/i.test(str)
  if (hasDr) str = str.replace(/^dr\.?\s+/i, '')
  const titleCased = str
    .split(' ')
    .filter(Boolean)
    .map(w => {
      if (w.length <= 2 && w === w.toUpperCase()) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
  return `Dr. ${titleCased}`
}

const getDoctorName = (item) => {
  const raw = item.doctorProfile?.displayName ||
              item.doctorProfile?.user?.displayName ||
              item.doctor?.name ||
              item.name
  return formatDoctorName(raw)
}

const getDoctorImage = (item) => {
  return item.doctorProfile?.profileImageUrl ||
         item.doctorProfile?.user?.avatarUrl ||
         item.doctor?.profileImage ||
         item.organization?.logoUrl ||
         null
}

const getSpecialization = (item) => {
  return item.platformDepartment?.name ||
         item.doctorProfile?.specialization ||
         item.doctor?.specialization ||
         item.name ||
         'General Medicine'
}

const getDoctorEmail = (item) => {
  return item.doctorProfile?.user?.email ||
         item.doctorProfile?.email ||
         null
}

const getDegrees = (item) => {
  const edu = item.doctorProfile?.education
  if (Array.isArray(edu) && edu.length > 0) {
    const degs = edu.map(e => e.degree).filter(Boolean)
    if (degs.length > 0) return degs.join(', ')
  }
  return item.doctorProfile?.qualification || item.doctor?.qualification || null
}

const getPrimaryInstitute = (item) => {
  const edu = item.doctorProfile?.education
  if (Array.isArray(edu) && edu.length > 0) {
    const inst = edu[0].institute
    if (inst) return inst
  }
  return null
}

const getExperience = (item) => {
  return item.doctorProfile?.experience ?? item.doctor?.experienceYears ?? null
}

const getOrgName = (item) => {
  return item.organization?.name || 'Healthcare Clinic'
}

const getClinicAddress = (item) => {
  const org = item.organization
  if (!org) return ''
  const street = (org.addressStreet || '').trim()
  const city = (org.addressCity || '').trim()
  const state = (org.addressState || '').trim()
  const postal = (org.addressPostalCode || '').trim()
  const parts = []
  if (street) parts.push(street)
  if (city && !street.toLowerCase().includes(city.toLowerCase())) parts.push(city)
  if (state && !street.toLowerCase().includes(state.toLowerCase())) parts.push(state)
  if (postal && !street.includes(postal)) parts.push(postal)
  return parts.join(', ')
}

const getMapsUrl = (item) => {
  const org = item.organization?.name || ''
  const addr = getClinicAddress(item)
  const query = [org, addr].filter(Boolean).join(' ')
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null
}

const getPrice = (item) => {
  return item.basePrice ?? item.price ?? null
}

const getLanguages = (item) => {
  return Array.isArray(item.doctorProfile?.languages) ? item.doctorProfile.languages : []
}

const getEducationList = (item) => {
  return Array.isArray(item.doctorProfile?.education) ? item.doctorProfile.education : []
}

const getDoctorId = (item) => {
  return item._id || item.doctorId || item.id
}

/* ─── Debounce Hook ─────────────────────────────────────────── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/* ─── Doctor Card Component ─────────────────────────────────── */
function DoctorCard({ item, onSelect, onContact, isOnlineSuggestion }) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [imgError, setImgError] = useState(false)

  const name = getDoctorName(item)
  const spec = getSpecialization(item)
  const degrees = getDegrees(item)
  const institute = getPrimaryInstitute(item)
  const experience = getExperience(item)
  const email = getDoctorEmail(item)
  const org = getOrgName(item)
  const address = getClinicAddress(item)
  const mapsUrl = getMapsUrl(item)
  const price = getPrice(item)
  const image = getDoctorImage(item)
  const languages = getLanguages(item)
  const consultationTypes = item.consultationTypes || []
  const isAvailableToday = item.isAvailableToday !== false
  const verified = item.doctorProfile?.isVerified !== false

  const specMeta = SPECIALTY_META[spec] || { icon: '🩺', color: 'var(--brand)', bg: 'var(--brand-glow)' }
  const initials = name.replace(/^Dr\.\s*/, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const handleCopyEmail = (e) => {
    e.stopPropagation()
    if (!email) return
    navigator.clipboard.writeText(email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleCopyAddress = (e) => {
    e.stopPropagation()
    if (!address) return
    navigator.clipboard.writeText(`${org}, ${address}`)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const mailtoLink = email
    ? `mailto:${email}?subject=${encodeURIComponent(`Consultation Appointment Enquiry - MediTwin [${name}]`)}&body=${encodeURIComponent(`Dear ${name},\n\nI found your verified profile on the MediTwin Healthcare Network and would like to request an appointment consultation at ${org}.\n\nPlease let me know your earliest available slots for consultation.\n\nThank you,\nPatient`)}`
    : null

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: isOnlineSuggestion ? '1.5px solid rgba(37,99,235,0.3)' : '1.5px solid var(--border)',
        borderRadius: 16,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow)',
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s, border-color 0.22s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.09)'
        e.currentTarget.style.borderColor = 'var(--brand)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow)'
        e.currentTarget.style.borderColor = isOnlineSuggestion ? 'rgba(37,99,235,0.3)' : 'var(--border)'
      }}
    >
      {/* ── Top Status Strip ──────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: isOnlineSuggestion ? 'rgba(37,99,235,0.05)' : 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isAvailableToday ? '#10b981' : '#f59e0b',
            boxShadow: isAvailableToday ? '0 0 8px rgba(16,185,129,0.7)' : 'none',
          }} />
          <span style={{ fontWeight: 600, color: isAvailableToday ? '#059669' : 'var(--muted)' }}>
            {isAvailableToday ? 'Available Today' : 'In Network'}
          </span>
          {isOnlineSuggestion && (
            <span style={{
              background: 'rgba(37,99,235,0.12)',
              color: '#2563eb',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
            }}>
              🌐 Nationwide Teleconsult
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {experience != null && (
            <span style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '2px 8px',
              borderRadius: 6,
              fontWeight: 600,
              color: 'var(--text)',
              fontSize: 11,
            }}>
              {experience}+ Yrs Exp
            </span>
          )}
          {verified && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              background: 'rgba(5,150,105,0.1)',
              color: '#059669',
              padding: '2px 7px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
            }}>
              <CheckCircle2 size={11} /> Verified
            </span>
          )}
        </div>
      </div>

      {/* ── Main Doctor Profile Info ─────────────────────────── */}
      <div style={{ padding: '16px 16px 12px', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* Avatar with photo or fallback */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            border: '2px solid var(--border)',
            background: 'linear-gradient(135deg, var(--brand), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
            position: 'relative',
          }}>
            {image && !imgError ? (
              <img
                src={image}
                alt={name}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
                {initials}
              </span>
            )}
          </div>

          {/* Name & Specialization */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: '0 0 4px',
              fontSize: 16,
              fontWeight: 800,
              color: 'var(--text)',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.3px',
              lineHeight: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}>
              <span>{name}</span>
            </h3>

            {/* Specialization tag with icon */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 6,
              background: specMeta.bg,
              color: specMeta.color,
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 4,
            }}>
              <span>{specMeta.icon}</span>
              <span>{spec} Specialist</span>
            </div>

            {/* Degrees & Institute */}
            <div style={{
              fontSize: 11,
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              <GraduationCap size={12} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{degrees || 'Registered Practitioner'}</span>
              {institute && <span style={{ opacity: 0.7 }}>• {institute}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTACT INFORMATION (FRONT OF CARD) ─────────────── */}
      <div style={{
        margin: '0 14px 12px',
        padding: '12px 14px',
        background: 'var(--surface-2)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>Official Contact & Clinic</span>
          <span style={{ color: 'var(--brand)', fontWeight: 700 }}>Direct Reach</span>
        </div>

        {/* Email Address */}
        {email ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 12,
            color: 'var(--text)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              minWidth: 0,
              flex: 1,
            }}>
              <Mail size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                color: 'var(--text-2)',
                fontFamily: 'monospace',
                fontSize: 11.5,
              }}>
                {email}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                onClick={handleCopyEmail}
                title="Copy Email Address"
                style={{
                  padding: '3px 7px',
                  borderRadius: 5,
                  border: '1px solid var(--border)',
                  background: copiedEmail ? 'rgba(5,150,105,0.15)' : 'var(--surface)',
                  color: copiedEmail ? '#059669' : 'var(--muted)',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                {copiedEmail ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
              </button>
              {mailtoLink && (
                <a
                  href={mailtoLink}
                  title="Send Direct Email"
                  style={{
                    padding: '3px 8px',
                    borderRadius: 5,
                    background: 'var(--brand)',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <Send size={10} /> Email
                </a>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Contact through consultation booking</div>
        )}

        {/* Clinic Name & Full Address */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 11,
          paddingTop: 6,
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 2,
            }}>
              <Building2 size={12} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {org}
              </span>
            </div>
            {address && (
              <div style={{
                color: 'var(--muted)',
                fontSize: 10.5,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {address}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View on Google Maps"
                onClick={e => e.stopPropagation()}
                style={{
                  padding: '3px 7px',
                  borderRadius: 5,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 10,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Navigation size={10} style={{ color: '#2563eb' }} />
                <span>Maps</span>
              </a>
            )}
            {address && (
              <button
                onClick={handleCopyAddress}
                title="Copy Address"
                style={{
                  padding: '3px 7px',
                  borderRadius: 5,
                  border: '1px solid var(--border)',
                  background: copiedAddress ? 'rgba(5,150,105,0.15)' : 'var(--surface)',
                  color: copiedAddress ? '#059669' : 'var(--muted)',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                {copiedAddress ? <Check size={10} /> : <Copy size={10} />}
                <span>{copiedAddress ? 'Copied' : 'Address'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Consultation Modes & Languages ─────────────────── */}
      <div style={{
        padding: '0 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 'auto',
      }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {consultationTypes.includes('online') && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 7px',
              borderRadius: 6,
              background: 'rgba(5,150,105,0.12)',
              color: '#059669',
              fontSize: 10,
              fontWeight: 700,
            }}>
              <Video size={10} /> Online Video
            </span>
          )}
          {consultationTypes.includes('in_person') && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 7px',
              borderRadius: 6,
              background: 'rgba(37,99,235,0.1)',
              color: '#2563eb',
              fontSize: 10,
              fontWeight: 700,
            }}>
              <Building2 size={10} /> Clinic Visit
            </span>
          )}
        </div>

        {languages.length > 0 && (
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>
            🗣️ {languages.slice(0, 2).join(', ')}
          </div>
        )}
      </div>

      {/* ── Footer & Action Bar ─────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.4px' }}>
            Consultation Fee
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--text)',
            fontFamily: 'Outfit, sans-serif',
          }}>
            {price != null ? (
              <>
                <IndianRupee size={14} style={{ color: 'var(--brand)' }} />
                <span>{Number(price).toLocaleString()}</span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Contact Clinic</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onSelect(item)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s',
            }}
          >
            Profile
          </button>
          <button
            onClick={() => onContact(item)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, var(--brand), var(--brand-2, #10b981))',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Stethoscope size={13} />
            <span>Book / Contact</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Book & Contact Doctor Modal ────────────────────────────── */
function ContactBookingModal({ item, onClose, currentUser }) {
  if (!item) return null

  const name = getDoctorName(item)
  const spec = getSpecialization(item)
  const degrees = getDegrees(item)
  const experience = getExperience(item)
  const email = getDoctorEmail(item)
  const org = getOrgName(item)
  const address = getClinicAddress(item)
  const mapsUrl = getMapsUrl(item)
  const price = getPrice(item)
  const image = getDoctorImage(item)
  const languages = getLanguages(item)
  const educationList = getEducationList(item)
  const consultationTypes = item.consultationTypes || []

  const [consultType, setConsultType] = useState(consultationTypes[0] || 'online')
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [copiedNote, setCopiedNote] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [sentToast, setSentToast] = useState(false)

  const patientName = currentUser?.name || 'MediTwin Patient'
  const patientContact = currentUser?.email || currentUser?.phone || 'Contact provided in consultation'

  const formattedInquiryText = `Hello ${name},

I would like to schedule a medical consultation with you.
Here are my consultation details:

- Patient Name: ${patientName}
- Specialization Needed: ${spec}
- Consultation Mode: ${consultType === 'online' ? 'Online Video Consultation' : `In-Person Clinic Visit at ${org}`}
- Preferred Date: ${preferredDate || 'Earliest Available Slot'}
- Primary Symptoms / Notes: ${notes || 'General medical consultation and clinical assessment.'}
- Patient Contact: ${patientContact}

Please reply with available slots and appointment confirmation.

Best regards,
${patientName}
(Sent via MediTwin Health Network)`

  const mailtoUrl = email
    ? `mailto:${email}?subject=${encodeURIComponent(`Appointment Request: ${patientName} - ${spec} Consultation`)}&body=${encodeURIComponent(formattedInquiryText)}`
    : null

  const handleCopyNote = () => {
    navigator.clipboard.writeText(formattedInquiryText)
    setCopiedNote(true)
    setTimeout(() => setCopiedNote(false), 2500)
  }

  const handleCopyEmail = () => {
    if (!email) return
    navigator.clipboard.writeText(email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleLaunchEmail = () => {
    if (mailtoUrl) {
      window.location.href = mailtoUrl
      setSentToast(true)
      setTimeout(() => setSentToast(false), 3500)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 20,
          maxWidth: 620,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          border: '1.5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 18px',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
          background: 'linear-gradient(to bottom, var(--surface-2), var(--surface))',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 68,
              height: 68,
              borderRadius: 16,
              background: 'linear-gradient(135deg, var(--brand), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              border: '2px solid var(--border)',
            }}>
              {image ? (
                <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>
                  {name.replace(/^Dr\.\s*/, '').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--text)',
                  fontFamily: 'Outfit, sans-serif',
                }}>
                  {name}
                </h2>
                <span style={{
                  background: 'rgba(5,150,105,0.12)',
                  color: '#059669',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  ✓ Verified Specialist
                </span>
              </div>
              <div style={{ color: 'var(--brand)', fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                {spec} • {degrees || 'Practitioner'} {experience ? `• ${experience} Years Exp` : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {org} {address ? `• ${address}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Contact Info Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
          }}>
            {/* Email Card */}
            <div style={{
              padding: '14px',
              background: 'var(--surface-2)',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <Mail size={12} style={{ color: 'var(--brand)' }} /> Direct Email
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: 12.5,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: 8,
              }}>
                {email || 'Inquire via clinic booking'}
              </div>
              {email && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleCopyEmail}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {copiedEmail ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    {copiedEmail ? 'Copied' : 'Copy Email'}
                  </button>
                  {mailtoUrl && (
                    <a
                      href={mailtoUrl}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'var(--brand)',
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Send size={11} /> Open Mail Client
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Clinic Card */}
            <div style={{
              padding: '14px',
              background: 'var(--surface-2)',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <Building2 size={12} style={{ color: 'var(--brand)' }} /> Clinic Location
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                {org}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.4 }}>
                {address || 'Clinic address available upon confirmation'}
              </div>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: '#2563eb',
                    fontSize: 11,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Navigation size={12} /> View on Google Maps
                </a>
              )}
            </div>
          </div>

          {/* Interactive Consultation Request Builder */}
          <div style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 14,
            padding: '18px',
          }}>
            <h4 style={{
              margin: '0 0 12px',
              fontSize: 13,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Calendar size={14} style={{ color: 'var(--brand)' }} /> Send Appointment Consultation Request
            </h4>

            {/* Consultation Mode Picker */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                CONSULTATION TYPE
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {consultationTypes.includes('online') && (
                  <button
                    onClick={() => setConsultType('online')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: consultType === 'online' ? '2px solid var(--brand)' : '1px solid var(--border)',
                      background: consultType === 'online' ? 'var(--brand-glow)' : 'var(--surface-2)',
                      color: consultType === 'online' ? 'var(--brand)' : 'var(--text)',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Video size={14} /> Online Video Call
                  </button>
                )}
                {consultationTypes.includes('in_person') && (
                  <button
                    onClick={() => setConsultType('in_person')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: consultType === 'in_person' ? '2px solid var(--brand)' : '1px solid var(--border)',
                      background: consultType === 'in_person' ? 'var(--brand-glow)' : 'var(--surface-2)',
                      color: consultType === 'in_person' ? 'var(--brand)' : 'var(--text)',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Building2 size={14} /> In-Person Clinic Visit
                  </button>
                )}
              </div>
            </div>

            {/* Preferred Date & Time */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                PREFERRED DATE / TIMING
              </label>
              <input
                type="text"
                placeholder="e.g. Tomorrow morning, or Friday 4:00 PM"
                value={preferredDate}
                onChange={e => setPreferredDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface-2)',
                  fontSize: 12,
                  color: 'var(--text)',
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                }}
              />
            </div>

            {/* Symptoms / Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                REASON FOR CONSULTATION / MEDICAL CONCERNS
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe your symptoms or what you would like to discuss with the doctor..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface-2)',
                  fontSize: 12,
                  color: 'var(--text)',
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {mailtoUrl ? (
                <button
                  onClick={handleLaunchEmail}
                  style={{
                    flex: '1 1 200px',
                    padding: '12px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--brand), var(--brand-2, #10b981))',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                  }}
                >
                  <Send size={15} /> Send Appointment Request via Email
                </button>
              ) : (
                <div style={{ color: 'var(--danger)', fontSize: 12 }}>Doctor direct email not publicly listed.</div>
              )}
              <button
                onClick={handleCopyNote}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {copiedNote ? <Check size={15} color="#059669" /> : <Copy size={15} />}
                <span>{copiedNote ? 'Note Copied!' : 'Copy Formatted Note'}</span>
              </button>
            </div>

            {sentToast && (
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(5,150,105,0.15)',
                color: '#059669',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <CheckCircle2 size={15} /> Your email application has opened with the formatted request!
              </div>
            )}
          </div>

          {/* Clinical Bio & Qualifications */}
          {item.description && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                Doctor Bio & Clinical Approach
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }}>
                {item.description}
              </p>
            </div>
          )}

          {/* Education Breakdown */}
          {educationList.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                Academic & Medical Credentials
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {educationList.map((edu, idx) => (
                  <div key={idx} style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <strong style={{ color: 'var(--text)' }}>{edu.degree}</strong>
                      {edu.institute && <span style={{ color: 'var(--muted)', marginLeft: 6 }}>from {edu.institute}</span>}
                    </div>
                    {edu.startYear && edu.endYear && (
                      <span style={{ fontSize: 11, color: 'var(--muted-2)', fontFamily: 'monospace' }}>
                        {edu.startYear} – {edu.endYear}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consultation Fee & Guarantee */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'var(--surface-2)',
            borderRadius: 12,
            border: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>STANDARD CONSULTATION FEE</div>
              <div style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--brand)',
                fontFamily: 'Outfit, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}>
                <IndianRupee size={16} />
                <span>{price != null ? Number(price).toLocaleString() : 'Contact Clinic'}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>/ consultation</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)' }}>
              <div>🛡️ Verified External Network</div>
              <div>⚡ Direct Doctor Communication</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Find a Doctor Page Component ──────────────────────── */
export default function FindDoctorPage() {
  const { user } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [suggestedOnlineDoctors, setSuggestedOnlineDoctors] = useState([])
  const [cityMatched, setCityMatched] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // 'clinics' or 'online'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Search & Filter State
  const [searchText, setSearchText] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [consultType, setConsultType] = useState('')
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false)
  const [minExp, setMinExp] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('recommended')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Modal State
  const [modalDoctor, setModalDoctor] = useState(null)

  // Debounced search term
  const debouncedSearch = useDebounce(searchText, 300)

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = { pageSize: 50 }
      if (debouncedSearch) params.search = debouncedSearch
      if (selectedSpecialty) params.specialization = selectedSpecialty
      if (selectedCity) params.city = selectedCity
      if (consultType) params.consultationType = consultType
      if (minExp) params.minExperience = minExp
      if (maxPrice) params.maxPrice = maxPrice

      const res = await api.get('/public-doctors', { params })
      if (res.data?.success) {
        const d = res.data.data
        setDoctors(d.items || [])
        setSuggestedOnlineDoctors(d.suggestedOnlineDoctors || [])
        setCityMatched(d.cityMatched !== false)
        if (d.items?.length === 0 && d.suggestedOnlineDoctors?.length > 0) {
          setActiveTab('online')
        } else {
          setActiveTab('all')
        }
      } else {
        setDoctors([])
        setSuggestedOnlineDoctors([])
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load doctors from healthcare directory.')
      setDoctors([])
      setSuggestedOnlineDoctors([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, selectedSpecialty, selectedCity, consultType, minExp, maxPrice])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  // Current list to display
  const rawListToDisplay = useMemo(() => {
    if (activeTab === 'online' && suggestedOnlineDoctors.length > 0) {
      return suggestedOnlineDoctors
    }
    return doctors
  }, [activeTab, doctors, suggestedOnlineDoctors])

  // Filter & Sort Doctors in-memory
  const displayedDoctors = useMemo(() => {
    let list = [...rawListToDisplay]

    if (availableTodayOnly) {
      list = list.filter(d => d.isAvailableToday !== false)
    }

    if (sortBy === 'price_asc') {
      list.sort((a, b) => (getPrice(a) || 99999) - (getPrice(b) || 99999))
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (getPrice(b) || 0) - (getPrice(a) || 0))
    } else if (sortBy === 'experience') {
      list.sort((a, b) => (getExperience(b) || 0) - (getExperience(a) || 0))
    } else if (sortBy === 'name') {
      list.sort((a, b) => getDoctorName(a).localeCompare(getDoctorName(b)))
    }

    return list
  }, [rawListToDisplay, availableTodayOnly, sortBy])

  const clearAllFilters = () => {
    setSearchText('')
    setSelectedSpecialty('')
    setSelectedCity('')
    setConsultType('')
    setAvailableTodayOnly(false)
    setMinExp('')
    setMaxPrice('')
    setSortBy('recommended')
    setActiveTab('all')
  }

  const activeFilterCount = [
    selectedSpecialty,
    selectedCity,
    consultType,
    availableTodayOnly,
    minExp,
    maxPrice,
  ].filter(Boolean).length

  const effectiveLocationQuery = selectedCity || debouncedSearch

  return (
    <div className="page-container" style={{ maxWidth: 1300, margin: '0 auto', minHeight: '100vh' }}>
      {/* ── Page Header Banner ─────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--brand), #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
              }}>
                <Stethoscope size={22} color="white" />
              </div>
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 800,
                  color: 'var(--text)',
                  fontFamily: 'Outfit, sans-serif',
                  letterSpacing: '-0.5px',
                }}>
                  Find a Doctor & Medical Specialist
                </h1>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Search verified healthcare professionals across 22+ clinical disciplines with direct emails, clinic addresses, and consultation booking
                </p>
              </div>
            </div>
          </div>

          {/* Quick stats pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              padding: '6px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span><strong>{doctors.length || suggestedOnlineDoctors.length}</strong> Specialists Available</span>
            </div>
            <div style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              padding: '6px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Shield size={14} style={{ color: '#059669' }} />
              <span>Verified Directory</span>
            </div>
          </div>
        </div>

        {/* ── 22+ Specialty Filter Pills Carousel ──────────────── */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 10,
          marginBottom: 16,
          scrollbarWidth: 'thin',
        }}>
          <button
            onClick={() => setSelectedSpecialty('')}
            style={{
              padding: '7px 15px',
              borderRadius: 20,
              border: selectedSpecialty === '' ? '1.5px solid var(--brand)' : '1px solid var(--border)',
              background: selectedSpecialty === '' ? 'var(--brand)' : 'var(--surface)',
              color: selectedSpecialty === '' ? 'white' : 'var(--text)',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.18s',
              flexShrink: 0,
            }}
          >
            🩺 All Specialties ({ALL_POPULAR_SPECIALTIES.length})
          </button>
          {ALL_POPULAR_SPECIALTIES.map(specName => {
            const isSelected = selectedSpecialty.toLowerCase() === specName.toLowerCase()
            const meta = SPECIALTY_META[specName] || { icon: '🩺' }
            return (
              <button
                key={specName}
                onClick={() => setSelectedSpecialty(isSelected ? '' : specName)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: isSelected ? '1.5px solid var(--brand)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--brand-glow)' : 'var(--surface)',
                  color: isSelected ? 'var(--brand)' : 'var(--text-2)',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.18s',
                  flexShrink: 0,
                }}
              >
                <span>{meta.icon}</span>
                <span>{specName}</span>
              </button>
            )
          })}
        </div>

        {/* ── Main Search & Filter Bar ─────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 240px', minWidth: 0, position: 'relative' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }} />
            <input
              type="text"
              placeholder="Search by doctor name, specialization, clinic, city (e.g. Pune, Chennai), or email..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text)',
                fontFamily: 'Inter, sans-serif',
                outline: 'none',
                boxShadow: 'var(--shadow)',
                transition: 'border-color 0.2s',
              }}
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* City Selector */}
          <div style={{ minWidth: 140, flex: '1 1 140px' }}>
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'Inter, sans-serif',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {MAJOR_CITIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div style={{ minWidth: 140, flex: '1 1 140px' }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'Inter, sans-serif',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="recommended">⚡ Recommended</option>
              <option value="price_asc">Fee: Low to High</option>
              <option value="price_desc">Fee: High to Low</option>
              <option value="experience">Most Experienced</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>

          {/* More Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: showAdvancedFilters || activeFilterCount > 0 ? '1.5px solid var(--brand)' : '1.5px solid var(--border)',
              background: showAdvancedFilters || activeFilterCount > 0 ? 'var(--brand-glow)' : 'var(--surface)',
              color: showAdvancedFilters || activeFilterCount > 0 ? 'var(--brand)' : 'var(--text)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.18s',
            }}
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span style={{
                background: 'var(--brand)',
                color: 'white',
                borderRadius: '50%',
                width: 18,
                height: 18,
                fontSize: 10,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={14} style={{
              transform: showAdvancedFilters ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }} />
          </button>

          {/* Refresh button */}
          <button
            onClick={() => fetchDoctors()}
            title="Refresh Doctor Listings"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* ── Advanced Filters Drawer ─────────────────────────── */}
        {showAdvancedFilters && (
          <div style={{
            marginTop: 12,
            padding: '16px 20px',
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {/* Consultation Mode */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                CONSULTATION MODE
              </label>
              <select
                value={consultType}
                onChange={e => setConsultType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  fontSize: 12,
                  color: 'var(--text)',
                  fontWeight: 600,
                }}
              >
                <option value="">Any Mode (Online & In-Person)</option>
                <option value="online">Online Video Consult</option>
                <option value="in_person">Clinic In-Person Visit</option>
              </select>
            </div>

            {/* Min Experience */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                MINIMUM EXPERIENCE
              </label>
              <select
                value={minExp}
                onChange={e => setMinExp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  fontSize: 12,
                  color: 'var(--text)',
                  fontWeight: 600,
                }}
              >
                <option value="">Any Experience</option>
                <option value="3">3+ Years</option>
                <option value="5">5+ Years</option>
                <option value="10">10+ Years</option>
                <option value="15">15+ Years</option>
              </select>
            </div>

            {/* Max Consultation Fee */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                MAX CONSULTATION FEE (₹)
              </label>
              <select
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  fontSize: 12,
                  color: 'var(--text)',
                  fontWeight: 600,
                }}
              >
                <option value="">Any Budget</option>
                <option value="300">Under ₹300</option>
                <option value="500">Under ₹500</option>
                <option value="800">Under ₹800</option>
                <option value="1000">Under ₹1,000</option>
              </select>
            </div>

            {/* Availability Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text)',
              }}>
                <input
                  type="checkbox"
                  checked={availableTodayOnly}
                  onChange={e => setAvailableTodayOnly(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--brand)', cursor: 'pointer' }}
                />
                <span>Available for consultation today</span>
              </label>
            </div>

            {/* Clear All */}
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={clearAllFilters}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--danger)',
                    background: 'rgba(220,38,38,0.06)',
                    color: 'var(--danger)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <X size={13} /> Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Active Filters Chips ───────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {selectedSpecialty && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'var(--brand-glow)',
              color: 'var(--brand)',
              fontSize: 11,
              fontWeight: 700,
            }}>
              Specialty: {selectedSpecialty}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedSpecialty('')} />
            </span>
          )}
          {selectedCity && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'var(--brand-glow)',
              color: 'var(--brand)',
              fontSize: 11,
              fontWeight: 700,
            }}>
              Location: {selectedCity}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedCity('')} />
            </span>
          )}
          {consultType && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'var(--brand-glow)',
              color: 'var(--brand)',
              fontSize: 11,
              fontWeight: 700,
            }}>
              Mode: {consultType === 'online' ? 'Online' : 'In-Person'}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setConsultType('')} />
            </span>
          )}
          {availableTodayOnly && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'var(--brand-glow)',
              color: 'var(--brand)',
              fontSize: 11,
              fontWeight: 700,
            }}>
              Available Today
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setAvailableTodayOnly(false)} />
            </span>
          )}
          {minExp && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'var(--brand-glow)',
              color: 'var(--brand)',
              fontSize: 11,
              fontWeight: 700,
            }}>
              Exp: {minExp}+ Yrs
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setMinExp('')} />
            </span>
          )}
          {maxPrice && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'var(--brand-glow)',
              color: 'var(--brand)',
              fontSize: 11,
              fontWeight: 700,
            }}>
              Fee: ≤ ₹{maxPrice}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setMaxPrice('')} />
            </span>
          )}
          <button
            onClick={clearAllFilters}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: 11,
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: '4px 6px',
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* ── Transparent Location Match Notice (When searching for cities like Pune) ── */}
      {!cityMatched && (
        <div style={{
          background: 'rgba(37,99,235,0.06)',
          border: '1.5px solid rgba(37,99,235,0.25)',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(37,99,235,0.12)', color: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Globe size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>
              Location Coverage Update for "{effectiveLocationQuery}"
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 8 }}>
              No registered physical walk-in clinics are currently listed in <strong>{effectiveLocationQuery}</strong>. Active physical clinic branches in this directory are in Chennai, Thiruvallur, Krishnagiri, Kanchipuram, and Cuddalore.
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>🌐 Showing {suggestedOnlineDoctors.length} verified specialists available for Online Teleconsultation nationwide (accessible from {effectiveLocationQuery}).</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Online vs In-Person Tabs when location has no physical clinics ── */}
      {suggestedOnlineDoctors.length > 0 && doctors.length === 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('online')}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: activeTab === 'online' ? '1.5px solid #2563eb' : '1px solid var(--border)',
              background: activeTab === 'online' ? 'rgba(37,99,235,0.12)' : 'var(--surface)',
              color: activeTab === 'online' ? '#2563eb' : 'var(--text)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Video size={14} /> Online Teleconsultations ({suggestedOnlineDoctors.length})
          </button>
          <button
            onClick={() => setActiveTab('clinics')}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: activeTab === 'clinics' ? '1.5px solid var(--brand)' : '1px solid var(--border)',
              background: activeTab === 'clinics' ? 'var(--brand-glow)' : 'var(--surface)',
              color: activeTab === 'clinics' ? 'var(--brand)' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Building2 size={14} /> Physical Walk-in Clinics ({doctors.length})
          </button>
        </div>
      )}

      {/* ── Results Count ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        color: 'var(--muted)',
        fontWeight: 600,
        marginBottom: 16,
      }}>
        <div>
          Showing <span style={{ color: 'var(--text)', fontWeight: 800 }}>{displayedDoctors.length}</span> verified medical practitioners
          {selectedSpecialty && <span> in <strong>{selectedSpecialty}</strong></span>}
          {selectedCity && <span> for <strong>{selectedCity}</strong></span>}
        </div>
      </div>

      {/* ── Content Grid / States ──────────────────────────────── */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 44,
            height: 44,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--brand)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Searching Healthcare Provider Directory...
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Connecting with verified doctors, clinics, and specialists
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--danger)',
        }}>
          <AlertTriangle size={36} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Unable to Load Doctors
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>{error}</p>
          <button
            onClick={() => fetchDoctors()}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              background: 'var(--brand)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      ) : displayedDoctors.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '70px 20px',
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border)',
        }}>
          <Stethoscope size={40} style={{ color: 'var(--muted-2)', margin: '0 auto 14px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
            No Doctors Found Matching Your Criteria
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            {activeTab === 'clinics' && !cityMatched
              ? `No physical walk-in clinics are listed in ${effectiveLocationQuery}. Switch to the Online Teleconsultations tab to consult with verified doctors online.`
              : 'Try broadening your search, choosing a different specialty, or clearing filters.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {suggestedOnlineDoctors.length > 0 && activeTab === 'clinics' && (
              <button
                onClick={() => setActiveTab('online')}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Video size={15} /> View Online Teleconsultations ({suggestedOnlineDoctors.length})
              </button>
            )}
            <button
              onClick={clearAllFilters}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: 'var(--brand)',
                color: 'white',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        /* Doctor Cards Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
          gap: 20,
        }}>
          {displayedDoctors.map((item, idx) => (
            <DoctorCard
              key={getDoctorId(item) || idx}
              item={item}
              isOnlineSuggestion={activeTab === 'online' && !cityMatched}
              onSelect={doc => setModalDoctor(doc)}
              onContact={doc => setModalDoctor(doc)}
            />
          ))}
        </div>
      )}

      {/* ── Interactive Modal ─────────────────────────────────── */}
      {modalDoctor && (
        <ContactBookingModal
          item={modalDoctor}
          onClose={() => setModalDoctor(null)}
          currentUser={user}
        />
      )}
    </div>
  )
}
