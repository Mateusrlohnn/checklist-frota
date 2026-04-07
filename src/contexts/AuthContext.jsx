import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './authStore'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    // Tenta buscar o profile — pode não existir ainda se o trigger
    // handle_new_user ainda não executou (race condition com signUp)
    let attempts = 0
    while (attempts < 3) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setProfile(data)
        return
      }

      // Se deu erro de coluna/schema, não adianta tentar de novo
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar profile:', error)
      }

      attempts++
      if (attempts < 3) {
        await new Promise((r) => setTimeout(r, 500))
      }
    }

    // Fallback: cria o profile a partir dos metadados do auth
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const meta = authUser.user_metadata || {}
        const fallbackProfile = {
          id: authUser.id,
          nome: meta.nome || authUser.email?.split('@')[0] || '',
          email: authUser.email || '',
          role: meta.role || 'colaborador',
        }

        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(fallbackProfile, { onConflict: 'id' })

        if (upsertError) {
          console.error('Erro ao criar profile fallback:', upsertError)
        }

        setProfile(fallbackProfile)
      }
    } catch (err) {
      console.error('Erro no fallback de profile:', err)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        await loadProfile(currentUser.id)
      }

      if (mounted) setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          loadProfile(currentUser.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.user) {
      setUser(data.user)
      await loadProfile(data.user.id)
    }
    return { error }
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const value = { user, profile, loading, login, logout }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
