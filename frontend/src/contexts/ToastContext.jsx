import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((type, message) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])
  const value = { success: (m) => push('success', m), error: (m) => push('error', m) }
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${t.type === 'success' ? 'border-brand-100 bg-white text-brand-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
            {t.type === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
