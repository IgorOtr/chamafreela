import { CalendarClock, MapPin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Spinner } from '../../components/ui.jsx'
import ScoreBadge from '../../components/ScoreBadge.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { CONTRACT_LABEL, MODE_LABEL, formatDate, formatPay } from '../../utils/roles.js'

function Breakdown({ items }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((b) => (
        <li key={b.key} className="text-xs">
          <div className="flex justify-between"><span className="font-semibold">{b.label}</span><span>{b.points} / {b.weight}</span></div>
          <div className="my-1 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${b.weight ? (b.points / b.weight) * 100 : 0}%` }} /></div>
          <p className="text-ink/60">{b.detail}</p>
        </li>
      ))}
    </ul>
  )
}

export default function RecommendedPage() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/recommendations/mine')
  const dismiss = async (id) => {
    try { await api.post(`/recommendations/${id}/dismiss`); toast.success('Recomendação removida da sua lista.'); reload() } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Oportunidades recomendadas</h1>
        <p className="text-sm text-ink/60">Selecionadas pelo seu perfil (categoria, serviços, região, disponibilidade e preferências). Cada indicação mostra o motivo.</p>
      </div>
      {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.length === 0 ? (
        <Card><EmptyState icon={Sparkles} title="Nenhuma recomendação por enquanto">
          Quando uma oportunidade compatível for publicada, ela aparece aqui. Mantenha seu <Link className="font-semibold text-brand-700 underline" to="/painel/meu-perfil">perfil</Link> completo e aprovado.
        </EmptyState></Card>
      ) : data.map((r) => (
        <Card key={r.id} className="space-y-2">
          <div className="flex items-start gap-4">
            <ScoreBadge score={r.score} />
            <div className="min-w-0 flex-1">
              <Link to={`/oportunidades/${r.opportunity.id}`} className="font-display text-lg font-bold hover:text-brand-600">{r.opportunity.title}</Link>
              <p className="text-sm text-ink/60">{r.opportunity.company.tradeName} · {r.opportunity.category.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{r.opportunity.city}</span>
                <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />até {formatDate(r.opportunity.deadline)}</span>
                <Badge>{CONTRACT_LABEL[r.opportunity.contractType]}</Badge><Badge>{MODE_LABEL[r.opportunity.mode]}</Badge>
                <b className="text-brand-700">{formatPay(r.opportunity.payMin, r.opportunity.payMax)}</b>
              </div>
            </div>
          </div>
          <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">{r.justification}</p>
          <details className="text-sm"><summary className="cursor-pointer font-semibold text-brand-700">Ver como o índice foi calculado</summary><Breakdown items={r.breakdown} /></details>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to={`/oportunidades/${r.opportunity.id}`}><Button>{r.interested ? 'Ver (interesse enviado)' : 'Ver e manifestar interesse'}</Button></Link>
            <Button variant="ghost" onClick={() => dismiss(r.id)}>Não tenho interesse</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
