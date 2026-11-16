import { ArrowLeft, CalendarClock, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Field, Spinner, inputClass } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api, errorMessage } from '../services/api.js'
import useSeo from '../hooks/useSeo.js'
import { CONTRACT_LABEL, MODE_LABEL, formatDate, formatPay } from '../utils/roles.js'

export default function OpportunityDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const { data: o, loading, error, reload } = useFetch(`/opportunities/${id}`)
  useSeo({ title: o ? `${o.title} — ${o.company.tradeName}` : 'Oportunidade', description: o ? o.description.slice(0, 155) : undefined, path: `/oportunidades/${id}`, noindex: !!error })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner />
  if (error) return <EmptyState title="Oportunidade indisponível">Ela pode ter sido encerrada ou expirado. <Link to="/oportunidades" className="font-semibold text-brand-700 underline">Ver oportunidades</Link></EmptyState>

  const act = async (fn, ok) => {
    setBusy(true)
    try { await fn(); toast.success(ok); reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <Link to="/oportunidades" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4" />Voltar</Link>
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2"><Badge color="green">{o.category.name}</Badge><Badge>{CONTRACT_LABEL[o.contractType]}</Badge><Badge>{MODE_LABEL[o.mode]}</Badge></div>
        <h1 className="font-display text-3xl font-extrabold">{o.title}</h1>
        <p className="text-sm text-ink/60">{o.company.tradeName} · <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{o.neighborhood ? `${o.neighborhood}, ` : ''}{o.city}</span> · <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />prazo {formatDate(o.deadline)}</span></p>
        <p className="font-display text-xl font-bold text-brand-700">{formatPay(o.payMin, o.payMax)}</p>
      </Card>
      <Card><h2 className="mb-2 font-display text-lg font-bold">Descrição</h2><p className="whitespace-pre-line text-sm text-ink/80">{o.description}</p></Card>
      {o.requirements && <Card><h2 className="mb-2 font-display text-lg font-bold">Requisitos</h2><p className="whitespace-pre-line text-sm text-ink/80">{o.requirements}</p></Card>}

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Tenho interesse</h2>
        {!user ? (
          <p className="text-sm text-ink/70"><Link className="font-semibold text-brand-700 underline" to="/entrar">Entre</Link> ou <Link className="font-semibold text-brand-700 underline" to="/cadastro">crie uma conta de profissional</Link> para manifestar interesse.</p>
        ) : user.role !== 'PROFISSIONAL' ? (
          <p className="text-sm text-ink/70">Apenas profissionais com perfil aprovado podem manifestar interesse.</p>
        ) : o.myInterest ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-xl bg-brand-50 p-3 text-brand-900">Interesse registrado. <b>Canal de contato:</b> {o.contactChannel}</p>
            <Button variant="outline" loading={busy} onClick={() => act(() => api.delete(`/opportunities/${id}/interest`), 'Interesse retirado.')}>Retirar interesse</Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act(() => api.post(`/opportunities/${id}/interest`, { message: message || undefined }), 'Interesse registrado!') }}>
            <Field label="Mensagem para a empresa (opcional)" htmlFor="msg"><textarea id="msg" rows={3} maxLength={500} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
            <p className="text-xs text-ink/60">O canal de contato da empresa é exibido após você manifestar interesse. A empresa vê seu perfil público.</p>
            <Button type="submit" loading={busy}>Manifestar interesse</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
