import { useNavigate } from 'react-router-dom'

export function useRouter() {
  const navigateRR = useNavigate()
  function navigate(path) {
    if (!path) return
    if (path.startsWith('/')) return navigateRR(path)
    navigateRR('/' + path)
  }
  return { navigate }
}


