import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, Field, Modal, Pagination, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { CONTRACT_LABEL, FLAG_LABEL, MODE_LABEL, OPP_STATUS, formatDate, formatDateTime, formatPay } from '../../utils/roles.js'

const ACTIONS = { PENDENTE: ['APROVAR', 'REJEITAR', 'ENCERRAR'], REJEITADA: ['APROVAR'], PUBLICADA: ['REJEITAR', 'ENCERRAR'], ENCERRADA: [] }
const LABEL = { APROVAR: 'Aprovar', REJEITAR: 'Rejeitar', ENCERRAR: 'Encerrar' }

export default function OpportunitiesAdminPage() {
  const toast = useToast()
  const [filters, setFilters] = useState({ page: 1, status: 'PENDENTE', q: '' })
  const params = Object.fromEntries(Object.entries({ ...filters, pageSize: 10 }).filter(([, v]) => v !== ''))
  const { data, loading, error, reload } = useFetch('/opportunities/admin/list', params)
  const [sel, setSel] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const history = useFetch('/audit', sel ? { entity: 'Opportunity', entityId: sel.id, pageSize: 10 } : { pageSize: 1, entity: '__none__' })

  const review = async (action) => {
    setBusy(true)
    try { await api.post(`/opportunities/admin/${sel.id}/review`, { action, reason: reason || undefined }); toast.success('Oportunidade atualizada.'); setSel(null); setReason(''); reload() }
    catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Moderação de oportunidades</h1>
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_2fr]">
          <select aria-label="Status" className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
            <option value="">Todas</option>{Object.entries(OPP_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
          <input aria-label="Buscar" placeholder="Buscar por título ou empresa" className={inputClass} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} />
        </div>
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Nada por aqui">Nenhuma oportunidade com este filtro.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50"><tr><th className="py-2">Oportunidade</th><th>Empresa</th><th>Prazo</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} className="border-b border-brand-900/5">
                    <td className="py-2.5"><p className="font-semibold">{o.title}</p>{o.flags.length > 0 && <p className="text-xs font-semibold text-red-700">⚠ {o.flags.length} alerta(s)</p>}</td>
                    <td>{o.company.tradeName}</td><td>{formatDate(o.deadline)}</td>
                    <td><Badge color={o.expired ? 'gray' : OPP_STATUS[o.status].color}>{o.expired ? 'Expirada' : OPP_STATUS[o.status].label}</Badge></td>
                    <td className="text-right"><Button variant="ghost" onClick={() => { setSel(o); setReason('') }}>Analisar</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setFilters({ ...filters, page })} />}
      </Card>
      <Modal open={!!sel} title={sel?.title ?? ''} onClose={() => setSel(null)}>
        {sel && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto text-sm">
            {sel.flags.length > 0 && <div className="rounded-xl bg-red-50 p-3 text-red-900"><p className="font-semibold">Alertas automáticos</p><ul className="list-disc pl-5">{sel.flags.map((f) => <li key={f}>{FLAG_LABEL[f] ?? f}</li>)}</ul></div>}
            <p className="text-ink/60">{sel.category.name} · {CONTRACT_LABEL[sel.contractType]} · {MODE_LABEL[sel.mode]} · {sel.city} · {formatPay(sel.payMin, sel.payMax)}</p>
            <p className="whitespace-pre-line">{sel.description}</p>
            {sel.requirements && <p><b>Requisitos:</b> {sel.requirements}</p>}
            <p><b>Empresa:</b> {sel.company.tradeName} ({sel.company.user.email}){sel.company.cnpj && ` · CNPJ ${sel.company.cnpj}`}</p>
            <p><b>Canal de contato:</b> {sel.contactChannel}</p>
            <Field label="Motivo (obrigatório ao rejeitar)" htmlFor="reason"><input id="reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <div className="flex flex-wrap gap-2">{ACTIONS[sel.status].map((a) => <Button key={a} loading={busy} variant={a === 'APROVAR' ? 'primary' : a === 'REJEITAR' ? 'danger' : 'outline'} onClick={() => review(a)}>{LABEL[a]}</Button>)}</div>
            <div><p className="mb-1 font-semibold">Histórico</p>
              {history.data?.items?.length ? <ul className="space-y-1 text-xs text-ink/70">{history.data.items.map((h) => <li key={h.id}>{formatDateTime(h.createdAt)} — {h.action.replace('OPPORTUNITY_', '')} {h.actor && `por ${h.actor.name}`}</li>)}</ul> : <p className="text-xs text-ink/50">Sem registros.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
