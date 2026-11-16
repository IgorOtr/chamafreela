import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, EmptyState, Spinner } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { ROLE_LABEL } from '../../utils/roles.js'

const Stat = ({ label, value }) => (
  <Card><p className="text-sm text-ink/60">{label}</p><p className="font-display text-3xl font-extrabold text-brand-700">{value}</p></Card>
)

export default function AdminDashboard() {
  const { user } = useAuth()
  const { data, loading, error } = useFetch('/admin/dashboard')
  if (loading) return <Spinner />
  if (error) return <p role="alert" className="text-red-700">{error}</p>

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Painel administrativo <span className="text-base font-semibold text-ink/50">· {ROLE_LABEL[user.role]}</span></h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total de usuários" value={data.totalUsers} />
        <Stat label="Profissionais aprovados" value={data.professionalsByStatus.APROVADO ?? 0} />
        <Stat label="Aguardando aprovação" value={data.professionalsByStatus.PENDENTE ?? 0} />
        <Stat label="Empresas" value={data.totalCompanies} />
        <Stat label="Oportunidades publicadas" value={data.opportunitiesByStatus.PUBLICADA ?? 0} />
        <Stat label="Oportunidades pendentes" value={data.opportunitiesByStatus.PENDENTE ?? 0} />
        <Stat label="Solicitações LGPD abertas" value={data.openDataRequests} />
      </div>
      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">Novos cadastros — últimos 30 dias</h2>
        {data.signupsLast30Days.length === 0 ? (
          <EmptyState title="Nenhum cadastro no período">Os cadastros aparecerão aqui assim que forem realizados.</EmptyState>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.signupsLast30Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8) + '/' + d.slice(5, 7)} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Cadastros" fill="#0f5c4d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-lg font-bold">Categorias mais utilizadas</h2>
        {data.topCategories.length === 0 ? <p className="text-sm text-ink/60">Ainda não há profissionais aprovados.</p> : (
          <ul className="space-y-1.5 text-sm">{data.topCategories.map((c) => <li key={c.name} className="flex justify-between"><span>{c.name}</span><b>{c.count}</b></li>)}</ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-2 font-display text-lg font-bold">Assinaturas</h2>
        <p className="text-sm"><b>{data.subscriptions.activePaid}</b> assinatura(s) paga(s) ou concedida(s) ativa(s) · {Math.max(0, data.subscriptions.nonStaffUsers - data.subscriptions.activePaid)} usuário(s) no plano FREE.</p>
        {data.freeCapacity && <p className="mt-1 text-sm">Vagas FREE: <b>{data.freeCapacity.used}</b>{data.freeCapacity.limited ? <> de <b>{data.freeCapacity.max}</b> ({data.freeCapacity.open ? `${data.freeCapacity.remaining} restantes` : 'cadastros fechados'})</> : ' · sem limite de cadastros'}.</p>}
        <Link to="/painel/assinaturas" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">Gerenciar assinaturas</Link>
      </Card>
    </div>
  )
}
