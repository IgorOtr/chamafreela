import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Pagination, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { ROLE_LABEL } from '../../utils/roles.js'

const STATUS = { PENDENTE: ['Pendente', 'amber'], ATIVA: ['Ativa', 'green'], CANCELADA: ['Cancelada', 'gray'], EXPIRADA: ['Suspensa', 'red'] }

export default function SubscriptionsAdminPage() {
  const toast = useToast()
  const [filters, setFilters] = useState({ page: 1, status: '', planCode: '', q: '' })
  const params = Object.fromEntries(Object.entries({ ...filters, pageSize: 15 }).filter(([, v]) => v !== ''))
  const { data, loading, error, reload } = useFetch('/subscriptions/admin', params)
  const plans = useFetch('/plans/admin')
  const [granting, setGranting] = useState(false)
  const [search, setSearch] = useState('')
  const found = useFetch('/users', { q: search || 'zzzz-nenhum', pageSize: 5 })
  const [form, setForm] = useState({ userId: '', planCode: 'PRO', endsAt: '', note: '' })
  const [saving, setSaving] = useState(false)

  const grant = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/subscriptions/admin/grant', { userId: form.userId, planCode: form.planCode, endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : undefined, note: form.note || undefined })
      toast.success('Plano concedido.'); setGranting(false); reload()
    } catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }
  const cancel = async (s) => { try { await api.post(`/subscriptions/admin/${s.id}/cancel`); toast.success('Assinatura cancelada.'); reload() } catch (e) { toast.error(errorMessage(e)) } }
  const f = (k) => (e) => setFilters({ ...filters, [k]: e.target.value, page: 1 })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-extrabold">Assinaturas</h1><Button onClick={() => { setForm({ userId: '', planCode: 'PRO', endsAt: '', note: '' }); setSearch(''); setGranting(true) }}>Conceder plano</Button></div>
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input aria-label="Buscar" placeholder="Nome ou e-mail" className={inputClass} value={filters.q} onChange={f('q')} />
          <select aria-label="Situação" className={inputClass} value={filters.status} onChange={f('status')}><option value="">Todas as situações</option>{Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}</select>
          <select aria-label="Plano" className={inputClass} value={filters.planCode} onChange={f('planCode')}><option value="">Todos os planos</option>{plans.data?.plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select>
        </div>
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhuma assinatura">Usuários sem assinatura estão no plano FREE. Use “Conceder plano” para cortesias e parcerias.</EmptyState>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50"><tr><th className="py-2">Usuário</th><th>Plano</th><th>Origem</th><th>Situação</th><th>Término</th><th /></tr></thead>
            <tbody>{data.items.map((s) => (
              <tr key={s.id} className="border-b border-brand-900/5 align-top">
                <td className="py-2.5"><p className="font-semibold">{s.user.name}</p><p className="text-xs text-ink/50">{s.user.email} · {ROLE_LABEL[s.user.role]}</p></td>
                <td>{s.planCode}</td><td>{s.source === 'MANUAL' ? 'Concessão' : 'Pagamento'}{s.note && <p className="max-w-[12rem] text-xs text-ink/50">{s.note}</p>}</td>
                <td><Badge color={STATUS[s.status][1]}>{STATUS[s.status][0]}</Badge></td>
                <td>{s.endsAt ? new Date(s.endsAt).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="text-right">{['ATIVA', 'PENDENTE'].includes(s.status) && <Button variant="ghost" onClick={() => cancel(s)}>Cancelar</Button>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setFilters({ ...filters, page })} />}
      </Card>

      <Modal open={granting} title="Conceder plano" onClose={() => setGranting(false)}>
        <form onSubmit={grant} className="space-y-3">
          <Input id="g-q" label="Buscar usuário (nome ou e-mail)" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && found.data?.items?.length > 0 && (
            <ul className="max-h-40 divide-y divide-brand-900/5 overflow-y-auto rounded-xl border border-brand-900/10 text-sm">
              {found.data.items.map((u) => <li key={u.id}><button type="button" onClick={() => setForm({ ...form, userId: u.id })} className={`w-full px-3 py-2 text-left hover:bg-brand-50 ${form.userId === u.id ? 'bg-brand-100' : ''}`}>{u.name} <span className="text-xs text-ink/50">{u.email} · {ROLE_LABEL[u.role]}</span></button></li>)}
            </ul>
          )}
          {form.userId && <p className="text-xs text-brand-700">Usuário selecionado.</p>}
          <Field label="Plano" htmlFor="g-plan"><select id="g-plan" className={inputClass} value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })}>{plans.data?.plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select></Field>
          <Input id="g-end" label="Válido até (opcional)" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          <Input id="g-note" label="Motivo / observação" placeholder="Ex.: parceria de lançamento" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <p className="text-xs text-ink/60">A concessão é manual e não gera cobrança. Substitui a assinatura ativa do usuário.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setGranting(false)}>Cancelar</Button><Button type="submit" loading={saving} disabled={!form.userId}>Conceder</Button></div>
        </form>
      </Modal>
    </div>
  )
}
