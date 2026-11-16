import { Building2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, Pagination, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'

export default function CompaniesAdminPage() {
  const toast = useToast()
  const [filters, setFilters] = useState({ page: 1, q: '' })
  const params = Object.fromEntries(Object.entries({ ...filters, pageSize: 15 }).filter(([, v]) => v !== ''))
  const { data, loading, error, reload } = useFetch('/companies/admin/list', params)
  const toggle = async (c) => {
    try { await api.patch(`/companies/admin/${c.id}`, { status: c.status === 'ATIVA' ? 'SUSPENSA' : 'ATIVA' }); toast.success('Situação atualizada.'); reload() } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Empresas</h1>
      <Card>
        <input aria-label="Buscar" placeholder="Buscar por nome ou e-mail" className={`${inputClass} mb-4`} value={filters.q} onChange={(e) => setFilters({ page: 1, q: e.target.value })} />
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
          <EmptyState icon={Building2} title="Nenhuma empresa">Empresas cadastradas aparecerão aqui.</EmptyState>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50"><tr><th className="py-2">Empresa</th><th>Responsável</th><th>Oportunidades</th><th>Situação</th><th /></tr></thead>
            <tbody>{data.items.map((c) => (
              <tr key={c.id} className="border-b border-brand-900/5">
                <td className="py-2.5"><p className="font-semibold">{c.tradeName}</p><p className="text-xs text-ink/50">{c.user.email}</p></td>
                <td>{c.responsibleName}</td><td>{c._count.opportunities}</td>
                <td><Badge color={c.status === 'ATIVA' ? 'green' : 'red'}>{c.status === 'ATIVA' ? 'Ativa' : 'Suspensa'}</Badge></td>
                <td className="text-right"><Button variant="ghost" onClick={() => toggle(c)}>{c.status === 'ATIVA' ? 'Suspender' : 'Reativar'}</Button></td>
              </tr>))}</tbody>
          </table>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setFilters({ ...filters, page })} />}
      </Card>
    </div>
  )
}
