import { useEffect, useState } from 'react'
import { Button, Card, Spinner } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'

export default function MatchConfigPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canEdit = ['SUPERADMIN', 'ADMIN'].includes(user.role)
  const { data, loading, error, reload } = useFetch('/recommendations/config')
  const [weights, setWeights] = useState(null)
  const [minScore, setMinScore] = useState(50)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (data) { setWeights(data.weights); setMinScore(data.minScore) } }, [data])

  if (loading || !weights) return error ? <p role="alert" className="text-red-700">{error}</p> : <Spinner />
  const sum = Object.values(weights).reduce((s, v) => s + Number(v || 0), 0)
  const save = async () => {
    setSaving(true)
    try {
      await api.put('/recommendations/config', { weights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Number(v)])), minScore: Number(minScore) })
      toast.success('Configuração salva. As recomendações foram recalculadas.'); reload()
    } catch (e) { toast.error(errorMessage(e)) } finally { setSaving(false) }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-extrabold">CHAMALÁ Conecta — critérios</h1>
      <p className="text-sm text-ink/60">Pesos do índice de compatibilidade (0–100). A soma deve ser 100. Categoria/serviço incompatível nunca gera recomendação, independentemente dos pesos. Hoje a localização compara cidade e bairro (ainda não há distância em km).</p>
      <Card className="space-y-4">
        {data.criteria.map((c) => (
          <div key={c.key} className="grid grid-cols-[1fr_5rem] items-center gap-3">
            <label htmlFor={c.key} className="text-sm font-semibold">{c.label}</label>
            <input id={c.key} type="number" min={0} max={100} disabled={!canEdit} className="w-full rounded-xl border border-brand-900/15 bg-white px-3 py-2 text-sm" value={weights[c.key]} onChange={(e) => setWeights({ ...weights, [c.key]: e.target.value })} />
          </div>
        ))}
        <p className={`text-sm font-semibold ${sum === 100 ? 'text-brand-700' : 'text-red-700'}`}>Soma: {sum} / 100</p>
        <div className="grid grid-cols-[1fr_5rem] items-center gap-3 border-t border-brand-900/10 pt-4">
          <label htmlFor="minScore" className="text-sm font-semibold">Índice mínimo para recomendar</label>
          <input id="minScore" type="number" min={0} max={100} disabled={!canEdit} className="w-full rounded-xl border border-brand-900/15 bg-white px-3 py-2 text-sm" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
        </div>
        {canEdit ? <div className="flex justify-end"><Button loading={saving} disabled={sum !== 100} onClick={save}>Salvar e recalcular</Button></div> : <p className="text-xs text-ink/60">Somente administradores alteram os critérios.</p>}
      </Card>
    </div>
  )
}
