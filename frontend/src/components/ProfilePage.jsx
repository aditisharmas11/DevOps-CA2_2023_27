import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext.jsx'
import Header from '../components/Header.jsx'

export default function ProfilePage() {
  const { username } = useAuth()
  const [profile, setProfile] = useState(null)
  const [mongoProfile, setMongoProfile] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      const res = await api.get(`/api/profile/combined`)
      setProfile(res.data?.user || null)
      setMongoProfile(res.data?.profile || null)
    }
    fetchProfile()
  }, [username])

  async function handleUpdate() {
    await api.put(`/api/profile/user-info`, profile, { params: { username } })
    alert('Profile updated successfully!')
    setEditing(false)
  }

  if (!profile) return <div>Loading...</div>

  return (
    <div>
      <Header variant="private" />
      <div className="container" style={{ maxWidth: 600, marginTop: 20 }}>
        <h2>Your Profile</h2>
        {Object.keys(profile).map(key => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: 700 }}>{key}</label><br />
            {editing ? (
              <input
                type="text"
                value={profile[key] ?? ''}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
              />
            ) : (
              <div>{profile[key] || '—'}</div>
            )}
          </div>
        ))}
        {mongoProfile && (
          <div style={{ marginTop: 20 }}>
            <h3>Matchmaking Details (Mongo)</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              <div>Education: {mongoProfile.education || '—'}</div>
              <div>Occupation: {mongoProfile.occupation || '—'}</div>
              <div>City: {mongoProfile.city || '—'}</div>
              <div>Faith: {mongoProfile.faith || '—'}</div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          {editing ? (
            <button onClick={handleUpdate} className="sm-btn sm-btn-primary">Save Changes</button>
          ) : (
            <button onClick={() => setEditing(true)} className="sm-btn sm-btn-outline">Edit Profile</button>
          )}
        </div>
      </div>
    </div>
  )
}
