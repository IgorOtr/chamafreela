import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setAccessToken, setSessionLostHandler } from '../services/api.js'

const AuthContext = createContext(null)

// Uma única chamada de refresh na inicialização (o StrictMode executa o efeito duas vezes em desenvolvimento).
let initialRefresh = null
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const start = useCallback((data) => {
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data.user
  }, [])

  useEffect(() => {
    setSessionLostHandler(() => setUser(null))
    initialRefresh ??= api.post('/auth/refresh')
    initialRefresh
      .then(({ data }) => start(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [start])

  const value = useMemo(() => ({
    user,
    loading,
    login: async (body) => start((await api.post('/auth/login', body)).data),
    register: async (body) => start((await api.post('/auth/register', body)).data),
    logout: async () => {
      await api.post('/auth/logout').catch(() => {})
      setAccessToken(null)
      setUser(null)
    },
  }), [user, loading, start])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
