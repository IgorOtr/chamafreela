import { ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { formatDateTime } from '../../utils/roles.js'

export default function DataRequestsPage() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/data-requests')
  const resolve = async (id) => {
    try { await api.post(`/data-requests/${id}/resolve`); toast.success('Solicitação concluída.'); reload() } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Solicitações LGPD</h1>
      <Card>
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nenhuma solicitação">Pedidos de atualização ou exclusão de dados aparecerão aqui.</EmptyState>
        ) : (
          <ul className="divide-y divide-brand-900/5">
            {data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-semibold">{r.type === 'EXCLUSAO' ? 'Exclusão' : 'Atualização'} · {r.user.name} <span className="font-normal text-ink/50">({r.user.email})</span></p>
                  <p className="text-xs text-ink/60">{formatDateTime(r.createdAt)}{r.message && ` — ${r.message}`}</p></div>
                {r.status === 'ABERTA' ? <Button variant="outline" onClick={() => resolve(r.id)}>Marcar como concluída</Button> : <Badge color="green">Concluída</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
