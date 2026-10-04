import { createContext, useContext, useState, useCallback } from 'react'
import api from '../lib/api'

const DiseaseJobContext = createContext(null)

export function DiseaseJobProvider({ children }) {
  // job: null | { status: 'running'|'done'|'error', result, error, symptoms, startedAt }
  const [job, setJob] = useState(null)

  const startPrediction = useCallback(async ({ inputText, symptoms, age, sex }) => {
    setJob({ status: 'running', symptoms, startedAt: new Date(), result: null, error: null })
    try {
      const { data } = await api.post('/disease/predict', { inputText, symptoms, age: +age, sex })
      setJob(prev => ({ ...prev, status: 'done', result: data }))
      return data
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Prediction failed. Please try again.'
      setJob(prev => ({ ...prev, status: 'error', error: errorMsg }))
      throw err
    }
  }, [])

  const clearJob = useCallback(() => setJob(null), [])

  return (
    <DiseaseJobContext.Provider value={{ job, startPrediction, clearJob }}>
      {children}
    </DiseaseJobContext.Provider>
  )
}

export const useDiseaseJob = () => useContext(DiseaseJobContext)
