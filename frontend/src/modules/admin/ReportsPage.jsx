import { Download } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, EmptyState, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { formatDateTime } from '../../utils/roles.js'
import { download } from '../studio/pieceSvg.js'

const LEVEL = { error: 'red', warn: 'amber', info: 'gray' }
const money = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ReportsPage() {
  const toast = useToast()
  const [months, setMonths] = useState(12)
  const { data, loading, error } = useFetch('/admin/reports/overview', { months })
  const events = useFetch('/admin/reports/events', { limit: 30 })
  const exportCsv = async (dataset) => {
    try { const { data: blob } = await api.get('/admin/reports/export', { params: { dataset, months }, responseType: 'blob' }); download(blob, `${dataset}.csv`) } catch (e) { toast.error(errorMessage(e)) }
  }
  if (loading) return <Spinner />
  if (error) return <p role="alert" className="text-red-700">{error}</p>
  const sb = data.subscriptions
  const modules = data.modules.reduce((acc, m) => { (acc[m.module] ??= []).push(m); return acc }, {})

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Relatórios</h1>
        <select aria-label="Período" className={`${inputClass} max-w-[10rem]`} value={months} onChange={(e) => setMonths(Number(e.target.value))}>{[6, 12, 24].map((m) => <option key={m} value={m}>Últimos {m} meses</option>)}</select>
      </div>

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Crescimento de cadastros</h2><Button variant="outline" onClick={() => exportCsv('signups')}><Download className="size-4" />CSV</Button></div>
        <div className="h-64"><ResponsiveContainer><BarChart data={data.signups}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
          <Bar dataKey="PROFISSIONAL" name="Profissionais" stackId="a" fill="#0f5c4d" /><Bar dataKey="EMPRESA" name="Empresas" stackId="a" fill="#ffb84d" /><Bar dataKey="CLIENTE" name="Clientes" stackId="a" fill="#9ca3af" /></BarChart></ResponsiveContainer></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Utilização dos módulos (30 dias)</h2><Button variant="outline" onClick={() => exportCsv('modules')}><Download className="size-4" />CSV</Button></div>
          {Object.entries(modules).map(([mod, items]) => (
            <div key={mod} className="mb-3"><p className="text-xs font-semibold uppercase text-ink/50">{mod}</p>
              <ul className="text-sm">{items.map((m) => <li key={m.key} className="flex justify-between border-b border-brand-900/5 py-1.5"><span>{m.label}</span><b>{m.value}</b></li>)}</ul></div>
          ))}
        </Card>
        <div className="space-y-4">
          <Card>
            <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Assinaturas</h2><Button variant="outline" onClick={() => exportCsv('subscriptions')}><Download className="size-4" />CSV</Button></div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-brand-50 p-2"><p className="font-display text-xl font-extrabold">{sb.activePaid}</p><p className="text-xs text-ink/60">pagas ativas</p></div>
              <div className="rounded-xl bg-brand-50 p-2"><p className="font-display text-xl font-extrabold">{sb.freeUsers}</p><p className="text-xs text-ink/60">no FREE</p></div>
              <div className="rounded-xl bg-brand-50 p-2"><p className="font-display text-xl font-extrabold">{money(sb.payments.paidCents)}</p><p className="text-xs text-ink/60">recebido</p></div>
            </div>
            {sb.byPlanStatus.length > 0 && <ul className="mt-3 text-sm">{sb.byPlanStatus.map((s) => <li key={`${s.planCode}-${s.status}`} className="flex justify-between border-b border-brand-900/5 py-1.5"><span>{s.planCode} · {s.status}</span><b>{s.count}</b></li>)}</ul>}
          </Card>
          <Card>
            <h2 className="mb-2 font-display text-lg font-bold">Funil</h2>
            <p className="text-sm">Perfis: {Object.entries(data.funnel.professionalsByStatus).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(' · ') || '—'}</p>
            <p className="text-sm">Oportunidades: {Object.entries(data.funnel.opportunitiesByStatus).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(' · ') || '—'}</p>
            <p className="text-sm">Interesses por oportunidade: <b>{data.funnel.interestsPerOpportunity ?? '—'}</b></p>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="mb-2 font-display text-lg font-bold">Falhas operacionais recentes</h2>
        {events.loading ? <Spinner /> : events.data?.length ? (
          <ul className="divide-y divide-brand-900/5 text-sm">{events.data.map((e) => <li key={e.id} className="flex flex-wrap items-start gap-2 py-2"><Badge color={LEVEL[e.level] ?? 'gray'}>{e.level}</Badge><span className="text-xs text-ink/50">{formatDateTime(e.createdAt)} · {e.source}{e.path && ` · ${e.method} ${e.path}`}</span><span className="w-full break-words text-ink/80">{e.message}</span></li>)}</ul>
        ) : <EmptyState title="Nenhuma falha registrada">Erros do servidor e alertas de integrações (IBGE, Asaas) aparecerão aqui.</EmptyState>}
      </Card>
    </div>
  )
}
