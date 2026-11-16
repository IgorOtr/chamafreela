import { Users } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, Modal, Pagination, Spinner, inputClass, Field } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { ROLE_LABEL, STATUS_LABEL } from '../../utils/roles.js'

const statusColor = { ATIVO: 'green', PENDENTE: 'amber', SUSPENSO: 'red' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [filters, setFilters] = useState({ page: 1, pageSize: 15, q: '', role: '', status: '' })
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  const { data, loading, error, reload } = useFetch('/users', params)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const canEdit = me.role !== 'MODERADOR'
  const isSuper = me.role === 'SUPERADMIN'

  const open = (u) => { setEditing(u); setDraft({ role: u.role, status: u.status }) }
  const save = async () => {
    setSaving(true)
    try {
      await api.patch(`/users/${editing.id}`, draft)
      toast.success('Usuário atualizado.'); setEditing(null); reload()
    } catch (e) { toast.error(errorMessage(e)) } finally { setSaving(false) }
  }
  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value, page: 1 })

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Usuários</h1>
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input aria-label="Buscar" placeholder="Buscar por nome ou e-mail" className={inputClass} value={filters.q} onChange={setF('q')} />
          <select aria-label="Papel" className={inputClass} value={filters.role} onChange={setF('role')}>
            <option value="">Todos os papéis</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select aria-label="Status" className={inputClass} value={filters.status} onChange={setF('status')}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum usuário encontrado">Ajuste os filtros para ver outros resultados.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50">
                <tr><th className="py-2">Nome</th><th>E-mail</th><th>Papel</th><th>Status</th>{canEdit && <th />}</tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-b border-brand-900/5">
                    <td className="py-2.5 font-semibold">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{ROLE_LABEL[u.role]}</td>
                    <td><Badge color={statusColor[u.status]}>{STATUS_LABEL[u.status]}</Badge></td>
                    {canEdit && <td className="text-right"><Button variant="ghost" onClick={() => open(u)}>Editar</Button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setFilters({ ...filters, page })} />}
      </Card>

      <Modal open={!!editing} title={`Editar ${editing?.name ?? ''}`} onClose={() => setEditing(null)}>
        <div className="space-y-4">
          <Field label="Papel" htmlFor="u-role">
            <select id="u-role" className={inputClass} value={draft.role} disabled={!isSuper} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
              {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {!isSuper && <p className="text-xs text-ink/60">Apenas o superadministrador altera papéis.</p>}
          </Field>
          <Field label="Status" htmlFor="u-status">
            <select id="u-status" className={inputClass} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button loading={saving} onClick={save}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
