import axios from 'axios'

// Access token só em memória (não em localStorage); a sessão é restaurada via cookie httpOnly de refresh.
let accessToken = null
export const setAccessToken = (t) => { accessToken = t }

export const api = axios.create({ baseURL: '/api', withCredentials: true })

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshing = null
let onSessionLost = () => {}
export const setSessionLostHandler = (fn) => { onSessionLost = fn }

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    const isAuthCall = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        refreshing ??= api.post('/auth/refresh').finally(() => { refreshing = null })
        const { data } = await refreshing
        setAccessToken(data.accessToken)
        return api(original)
      } catch {
        setAccessToken(null)
        onSessionLost()
      }
    }
    return Promise.reject(error)
  },
)

export const errorMessage = (error) =>
  error.response?.data?.erro?.detalhes?.[0]?.mensagem ??
  error.response?.data?.erro?.mensagem ??
  'Não foi possível concluir a operação. Tente novamente.'
