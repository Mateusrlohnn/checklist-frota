import { useContext } from 'react'
import { AuthContext } from '../contexts/authStore'

export function useAuth() {
  return useContext(AuthContext)
}
