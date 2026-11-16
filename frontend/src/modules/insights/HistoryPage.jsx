import { LineChart as ChartIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, Pagination, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { brl, num, pct } from './format.js'

function Compare({ ids }) {
  const [sims, setSims] = useState(null)
  useEffect(() => { Promise.all(ids.map((id) => api.get(`/simulations/${id}`).then((r) => r.data))).then(setSims).catch(() => setSims([])) }, [ids])
  if (!sims) return <Spinner />
  const chart = sims.map((s) => ({ name: s.name, Pessimista: s.results.scenarios.pessimistic.profit, Central: s.results.scenarios.central.profit, Otimista: s.results.scenarios.optimistic.profit }))
  const rows = [
    ['Probabilidade de prejuízo', (s) => pct(s.results.summary.probLoss)],
    ['Lucro mensal central', (s) => brl(s.results.summary.percentiles.p50)],
    ['Lucro médio', (s) => brl(s.results.summary.meanProfit)],
    ['Faixa de 80% (P10 a P90)', (s) => `${brl(s.results.summary.percentiles.p10)} a ${brl(s.results.summary.percentiles.p90)}`],
    ['Receita de equilíbrio', (s) => (s.results.breakEven.revenue == null ? 'Inviável' : brl(s.results.breakEven.revenue))],
    ['Retorno do investimento', (s) => (s.results.roi.applicable ? `${num(s.results.roi.paybackMonths.central)} meses` : 'Não se aplica')],
    ['Capacidade (serviços/mês)', (s) => s.results.summary.capacity],
  ]
  return (
    <Card className="space-y-4">
      <h2 className="font-display text-lg font-bold">Comparação de cenários</h2>
      <div className="h-64"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => brl(v)} tick={{ fontSize: 10 }} width={70} /><Tooltip formatter={(v) => brl(v)} /><Legend />
        <Bar dataKey="Pessimista" fill="#dc2626" /><Bar dataKey="Central" fill="#0f5c4d" /><Bar dataKey="Otimista" fill="#ffb84d" /></BarChart></ResponsiveContainer></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50"><tr><th className="py-2" />{sims.map((s) => <th key={s.id}>{s.name}</th>)}</tr></thead>
        <tbody>{rows.map(([label, fn]) => <tr key={label} className="border-b border-brand-900/5"><td className="py-2 font-semibold">{label}</td>{sims.map((s) => <td key={s.id}>{fn(s)}</td>)}</tr>)}</tbody>
      </table></div>
      <p className="text-xs text-ink/60">Cenários simulados com premissas e sementes próprias: diferenças pequenas podem ser ruído de simulação (veja a margem de erro em cada resultado).</p>
    </Card>
  )
}

export default function HistoryPage() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch('/simulations', { page, pageSize: 10 })
  const [picked, setPicked] = useState([])
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p))
  const remove = async (id) => { try { await api.delete(`/simulations/${id}`); setPicked((p) => p.filter((x) => x !== id)); reload() } catch (e) { toast.error(errorMessage(e)) } }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Histórico de simulações</h1>
        <Link to="/painel/insights"><Button>Nova simulação</Button></Link>
      </div>
      {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
        <Card><EmptyState icon={ChartIcon} title="Nenhuma simulação ainda">Crie seu primeiro cenário para ver riscos e probabilidades.</EmptyState></Card>
      ) : (
        <>
          <p className="text-sm text-ink/60">Marque de 2 a 3 simulações para compará-las.</p>
          {data.items.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center gap-3">
              <input type="checkbox" aria-label={`Comparar ${s.name}`} checked={picked.includes(s.id)} onChange={() => toggle(s.id)} className="size-4" />
              <div className="min-w-0 flex-1">
                <Link to={`/painel/insights/${s.id}`} className="font-display text-lg font-bold hover:text-brand-600">{s.name}</Link>
                <p className="text-xs text-ink/60">{[s.activity, s.city].filter(Boolean).join(' · ')} · {new Date(s.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="text-right text-sm"><p><b>{brl(s.headline.p50)}</b>/mês (mediana)</p><p className="text-xs text-ink/60">prejuízo: {pct(s.headline.probLoss)} · {brl(s.headline.p10)} a {brl(s.headline.p90)}</p></div>
              <Button variant="ghost" onClick={() => remove(s.id)}>Excluir</Button>
            </Card>
          ))}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          {picked.length >= 2 ? <Compare ids={picked} /> : picked.length === 1 && <p className="text-sm text-ink/60">Escolha mais uma simulação para comparar.</p>}
        </>
      )}
    </div>
  )
}
