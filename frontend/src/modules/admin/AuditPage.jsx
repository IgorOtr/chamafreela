import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { Card, EmptyState, Pagination, Spinner } from '../../components/ui.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { formatDateTime } from '../../utils/roles.js'

const ACTION = { USER_UPDATE: 'Usuário alterado', PROFESSIONAL_SUBMIT: 'Perfil enviado', PROFESSIONAL_UPDATE: 'Perfil editado', PROFESSIONAL_APROVAR: 'Perfil aprovado', PROFESSIONAL_REJEITAR: 'Perfil rejeitado', PROFESSIONAL_OCULTAR: 'Perfil ocultado', PROFESSIONAL_REEXIBIR: 'Perfil reexibido', PROFESSIONAL_ADMIN_EDIT: 'Perfil editado (admin)', DATA_REQUEST_CREATE: 'Solicitação LGPD', DATA_REQUEST_RESOLVE: 'Solicitação LGPD concluída', CATEGORY_CREATE: 'Categoria criada', CATEGORY_UPDATE: 'Categoria alterada' }

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const { data, loading, error } = useFetch('/audit', { page, pageSize: 20 })
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Auditoria</h1>
      <Card>
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
          <EmptyState icon={ScrollText} title="Nenhum registro">As operações administrativas aparecerão aqui.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50"><tr><th className="py-2">Data</th><th>Responsável</th><th>Operação</th><th>Entidade</th><th>Detalhes</th></tr></thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l.id} className="border-b border-brand-900/5 align-top">
                    <td className="py-2.5 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                    <td>{l.actor?.name ?? '—'}</td>
                    <td>{ACTION[l.action] ?? l.action}</td>
                    <td>{l.entity}</td>
                    <td className="max-w-xs break-words font-mono text-xs text-ink/70">{l.changes ? JSON.stringify(l.changes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>
    </div>
  )
}
