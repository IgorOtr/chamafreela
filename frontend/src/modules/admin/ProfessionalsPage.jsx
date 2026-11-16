import { UserCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, Field, Modal, Pagination, Spinner, inputClass } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { MODE_LABEL, PRO_STATUS, formatDateTime } from '../../utils/roles.js'

const ACTIONS = {
  PENDENTE: ['APROVAR', 'REJEITAR'], REJEITADO: ['APROVAR'], APROVADO: ['OCULTAR', 'REJEITAR'], OCULTO: ['REEXIBIR'],
}
const ACTION_LABEL = { APROVAR: 'Aprovar', REJEITAR: 'Rejeitar', OCULTAR: 'Ocultar', REEXIBIR: 'Reexibir' }

export default function ProfessionalsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canManage = ['SUPERADMIN', 'ADMIN'].includes(user.role)
  const [filters, setFilters] = useState({ page: 1, status: 'PENDENTE', q: '' })
  const params = Object.fromEntries(Object.entries({ ...filters, pageSize: 10 }).filter(([, v]) => v !== ''))
  const { data, loading, error, reload } = useFetch('/professionals/admin/list', params)
  const [sel, setSel] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const history = useFetch('/audit', sel ? { entity: 'Professional', entityId: sel.id, pageSize: 10 } : { pageSize: 1, entity: '__none__' })

  const run = async (fn, okMsg) => {
    setBusy(true)
    try { const { data: updated } = await fn(); toast.success(okMsg); setSel(updated ? { ...sel, ...updated, user: sel.user } : null); setReason(''); reload(); history.reload() }
    catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const review = (action) => run(() => api.post(`/professionals/admin/${sel.id}/review`, { action, reason: reason || undefined }), 'Perfil atualizado.')
  const feature = () => run(() => api.patch(`/professionals/admin/${sel.id}`, { featured: !sel.featured }), sel.featured ? 'Destaque removido.' : 'Perfil destacado.')

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Profissionais</h1>
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_2fr]">
          <select aria-label="Status" className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
            <option value="">Todos</option>{Object.entries(PRO_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
          <input aria-label="Buscar" placeholder="Buscar por nome ou e-mail" className={inputClass} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} />
        </div>
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
          <EmptyState icon={UserCheck} title="Nada por aqui">Nenhum perfil com este filtro.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50"><tr><th className="py-2">Profissional</th><th>Categoria</th><th>Cidade</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-b border-brand-900/5">
                    <td className="py-2.5"><p className="font-semibold">{p.displayName}{p.featured && ' ⭐'}</p><p className="text-xs text-ink/50">{p.user.email}</p></td>
                    <td>{p.category.name}</td><td>{p.city}</td>
                    <td><Badge color={PRO_STATUS[p.status].color}>{PRO_STATUS[p.status].label}</Badge></td>
                    <td className="text-right"><Button variant="ghost" onClick={() => { setSel(p); setReason('') }}>Analisar</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setFilters({ ...filters, page })} />}
      </Card>

      <Modal open={!!sel} title={sel?.displayName ?? ''} onClose={() => setSel(null)}>
        {sel && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto text-sm">
            <p><Badge color={PRO_STATUS[sel.status].color}>{PRO_STATUS[sel.status].label}</Badge> <span className="text-ink/60">{sel.category.name} · {MODE_LABEL[sel.mode]} · {sel.neighborhood ? sel.neighborhood + ', ' : ''}{sel.city}</span></p>
            <p className="whitespace-pre-line">{sel.description}</p>
            <p><b>Serviços:</b> {sel.services.map((s) => s.name).join(', ')}</p>
            <p><b>Contato (privado):</b> {sel.whatsapp} · {sel.user.email} {sel.showContact ? '' : '(não público)'}</p>
            {sel.portfolio.length > 0 && <p><b>Portfólio:</b> {sel.portfolio.length} item(ns)</p>}
            {sel.rejectionReason && <p className="text-red-800"><b>Motivo anterior:</b> {sel.rejectionReason}</p>}
            <Field label="Motivo (obrigatório ao rejeitar)" htmlFor="reason"><input id="reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <div className="flex flex-wrap gap-2">
              {ACTIONS[sel.status].map((a) => <Button key={a} loading={busy} variant={a === 'APROVAR' || a === 'REEXIBIR' ? 'primary' : a === 'REJEITAR' ? 'danger' : 'outline'} onClick={() => review(a)}>{ACTION_LABEL[a]}</Button>)}
              {canManage && sel.status === 'APROVADO' && <Button loading={busy} variant="accent" onClick={feature}>{sel.featured ? 'Remover destaque' : 'Destacar'}</Button>}
            </div>
            <div>
              <p className="mb-1 font-semibold">Histórico</p>
              {history.data?.items?.length ? <ul className="space-y-1 text-xs text-ink/70">{history.data.items.map((h) => <li key={h.id}>{formatDateTime(h.createdAt)} — {h.action.replace('PROFESSIONAL_', '')} {h.actor && `por ${h.actor.name}`}</li>)}</ul> : <p className="text-xs text-ink/50">Sem registros.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
