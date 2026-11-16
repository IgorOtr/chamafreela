import { HeartHandshake } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Card, EmptyState, Spinner } from '../../components/ui.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { formatDate } from '../../utils/roles.js'

export default function MyInterestsPage() {
  const { data, loading, error } = useFetch('/opportunities/interests/mine')
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Minhas manifestações de interesse</h1>
      {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.length === 0 ? (
        <Card><EmptyState icon={HeartHandshake} title="Você ainda não demonstrou interesse">Veja as <Link className="font-semibold text-brand-700 underline" to="/oportunidades">oportunidades abertas</Link>.</EmptyState></Card>
      ) : data.map((i) => (
        <Card key={i.id} className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to={`/oportunidades/${i.opportunity.id}`} className="font-display text-lg font-bold hover:text-brand-600">{i.opportunity.title}</Link>
            <Badge color={i.opportunity.available ? 'green' : 'gray'}>{i.opportunity.available ? 'Em aberto' : 'Indisponível'}</Badge>
          </div>
          <p className="text-sm text-ink/60">{i.opportunity.company.tradeName} · {i.opportunity.city} · enviado em {formatDate(i.createdAt)}</p>
          {i.opportunity.contactChannel && <p className="text-sm"><b>Contato:</b> {i.opportunity.contactChannel}</p>}
        </Card>
      ))}
    </div>
  )
}
