import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Spinner } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import SimulationForm, { fromPrefill } from './SimulationForm.jsx'

export default function InsightsPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const toast = useToast()
  const defaults = useFetch('/simulations/defaults')
  const [loading, setLoading] = useState(false)

  const submit = async (payload) => {
    setLoading(true)
    try { const { data } = await api.post('/simulations', payload); navigate(`/painel/insights/${data.id}`) }
    catch (e) { toast.error(errorMessage(e)); setLoading(false) }
  }
  if (defaults.loading) return <Spinner />
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">CHAMALÁ Insights</h1>
          <p className="text-sm text-ink/60">Simule milhares de cenários para uma atividade e veja o risco antes de investir. É uma estimativa — não uma garantia.</p>
        </div>
        <Link to="/painel/insights/historico" className="text-sm font-semibold text-brand-700 underline">Histórico e comparação</Link>
      </div>
      <SimulationForm initial={fromPrefill(state?.prefill)} defaults={defaults.data} onSubmit={submit} loading={loading} />
      {defaults.data && (
        <details className="rounded-2xl border border-brand-900/10 bg-white p-5 text-sm text-ink/70">
          <summary className="cursor-pointer font-semibold text-brand-700">Como o cálculo funciona (modelo {defaults.data.modelVersion})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">{defaults.data.method.map((m) => <li key={m}>{m}</li>)}</ul>
          <p className="mt-2 text-xs">{defaults.data.disclaimer}</p>
        </details>
      )}
    </div>
  )
}
