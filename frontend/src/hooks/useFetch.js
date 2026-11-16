import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../services/api.js'

export function useFetch(url, params) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const key = JSON.stringify(params ?? {})

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData((await api.get(url, { params: JSON.parse(key) })).data) }
    catch (e) { setError(errorMessage(e)) }
    finally { setLoading(false) }
  }, [url, key])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}
