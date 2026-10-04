import { useState } from 'react'
import HealthCheck from './HealthCheck'
import MetadataForm from './MetadataForm'
import MetadataList from './MetadataList'
import FileUpload from './FileUpload'

export default function App() {
  const [refresh, setRefresh] = useState(0)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Hackathon System</h1>
      <HealthCheck />
      <hr />
      <MetadataForm onSaved={() => setRefresh(r => r + 1)} />
      <hr />
      <FileUpload onUploaded={() => setRefresh(r => r + 1)} />
      <hr />
      <MetadataList key={refresh} />
    </div>
  )
}