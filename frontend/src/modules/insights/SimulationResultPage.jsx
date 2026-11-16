import { AlertTriangle, Copy, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { ORIGIN, brl, num, pct } from './format.js'

const Kpi = ({ label, value, hint, tone = '' }) => (
  <Card className="p-4"><p className="text-xs text-ink/60">{label}</p><p className={`font-display text-2xl font-extrabold ${tone}`}>{value}</p>{hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}</Card>
)

function Histogram({ r }) {
  const { data, marks } = useMemo(() => {
    const bins = r.histogram.map((b) => ({ label: brl((b.from + b.to) / 2), mid: (b.from + b.to) / 2, from: b.from, to: b.to, count: b.count }))
    const at = (v) => bins.find((b) => v >= b.from && v <= b.to)?.label
    return { data: bins, marks: [['P10', at(r.summary.percentiles.p10)], ['Mediana', at(r.summary.percentiles.p50)], ['P90', at(r.summary.percentiles.p90)]] }
  }, [r])
  return (
    <div className="h-72"><ResponsiveContainer>
      <BarChart data={data} barCategoryGap={1}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fontSize: 10 }} minTickGap={30} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v) => [v.toLocaleString('pt-BR'), 'Simulações']} labelFormatter={(_, p) => p?.[0] ? `${brl(p[0].payload.from)} a ${brl(p[0].payload.to)}` : ''} />
        <Bar dataKey="count" name="Simulações">{data.map((b) => <Cell key={b.label} fill={b.to <= 0 ? '#dc2626' : b.from < 0 ? '#f59e0b' : '#14866f'} />)}</Bar>
        {marks.filter(([, x]) => x).map(([t, x]) => <ReferenceLine key={t} x={x} stroke="#14211e" strokeDasharray="4 3" label={{ value: t, position: 'top', fontSize: 10 }} />)}
      </BarChart>
    </ResponsiveContainer></div>
  )
}

function Sensitivity({ r }) {
  const data = r.sensitivity.map((s) => ({ name: s.label, low: s.low.meanProfit, high: s.high.meanProfit }))
  const x = r.sensitivity[0].shiftPercent
  return (
    <div className="h-64"><ResponsiveContainer>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(v) => brl(v)} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => brl(v)} /><Legend />
        <Bar dataKey="low" name={`−${x}%`} fill="#9ca3af" /><Bar dataKey="high" name={`+${x}%`} fill="#0f5c4d" />
      </BarChart>
    </ResponsiveContainer></div>
  )
}

export default function SimulationResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: s, loading, error } = useFetch(`/simulations/${id}`)
  if (loading) return <Spinner />
  if (error) return <p role="alert" className="text-red-700">{error} <Link className="underline" to="/painel/insights">Nova simulação</Link></p>
  const r = s.results
  const sum = r.summary

  const duplicate = () => navigate('/painel/insights', { state: { prefill: { name: s.name, city: s.city, activity: s.activity, inputs: s.inputs, iterations: s.iterations, userAssumptions: Object.fromEntries(s.assumptions.filter((a) => a.origin === 'INFORMADO' && ['demandVariationPercent', 'priceVariationPercent', 'costVariationPercent', 'sensitivityPercent', 'horizonMonths'].includes(a.key)).map((a) => [a.key, a.value])) } } })
  const remove = async () => { try { await api.delete(`/simulations/${id}`); toast.success('Simulação excluída.'); navigate('/painel/insights/historico') } catch (e) { toast.error(errorMessage(e)) } }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">{s.name}</h1>
          <p className="text-sm text-ink/60">{[s.activity, s.city].filter(Boolean).join(' · ')} · {new Date(s.createdAt).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-ink/50">Modelo {s.modelVersion} · {s.iterations.toLocaleString('pt-BR')} simulações · semente {s.seed} (use-a para reproduzir exatamente este resultado)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={duplicate}><Copy className="size-4" />Duplicar e ajustar</Button>
          <Link to="/painel/insights/historico"><Button variant="ghost">Histórico</Button></Link>
          <Button variant="ghost" onClick={remove}><Trash2 className="size-4 text-red-600" />Excluir</Button>
        </div>
      </div>

      {r.warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50"><p className="mb-1 flex items-center gap-1 font-semibold text-amber-900"><AlertTriangle className="size-4" />Atenção</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul></Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Probabilidade de prejuízo" value={pct(sum.probLoss)} tone={sum.probLoss >= 0.5 ? 'text-red-700' : sum.probLoss >= 0.2 ? 'text-amber-600' : 'text-brand-700'} hint={`± ${pct(sum.probLossMarginOfError)} (margem de erro da simulação)`} />
        <Kpi label="Lucro mensal central (mediana)" value={brl(sum.percentiles.p50)} hint={`Média: ${brl(sum.meanProfit)}`} tone={sum.percentiles.p50 < 0 ? 'text-red-700' : 'text-brand-700'} />
        <Kpi label="Equilíbrio financeiro" value={r.breakEven.revenue == null ? 'Inviável' : brl(r.breakEven.revenue)} hint={r.breakEven.services == null ? 'Cada serviço custa mais do que rende' : `${r.breakEven.services} serviços/mês${r.breakEven.withinCapacity ? '' : ' (acima da capacidade)'}`} />
        <Kpi label="Retorno do investimento" value={r.roi.applicable ? `${num(r.roi.paybackMonths.central)} meses` : 'Não se aplica'} hint={r.roi.applicable ? `${pct(r.roi.probPaybackWithinHorizon, 0)} de chance em ${r.roi.horizonMonths} meses` : r.roi.reason} />
      </div>

      <Card>
        <h2 className="font-display text-lg font-bold">O que isso significa</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/80">{r.explanations.map((e) => <li key={e}>{e}</li>)}</ul>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {['pessimistic', 'central', 'optimistic'].map((k) => [k, r.scenarios[k]]).map(([k, sc]) => (
          <Card key={k} className={k === 'central' ? 'border-brand-500' : ''}>
            <p className="text-sm font-semibold">{sc.label}</p>
            <p className={`font-display text-2xl font-extrabold ${sc.profit < 0 ? 'text-red-700' : 'text-brand-700'}`}>{brl(sc.profit)}</p>
            <p className="text-xs text-ink/60">lucro mensal · receita {brl(sc.revenue)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-display text-lg font-bold">Distribuição do lucro mensal</h2>
        <p className="mb-2 text-xs text-ink/60">Vermelho: prejuízo · âmbar: faixa que cruza o zero · verde: lucro. Linhas tracejadas: P10, mediana e P90. Intervalo de 80%: {brl(sum.percentiles.p10)} a {brl(sum.percentiles.p90)}.</p>
        <Histogram r={r} />
        <p className="mt-2 text-xs text-ink/60">Utilização média da capacidade: {pct(sum.capacityUtilization, 0)} ({num(sum.meanServices)} de {sum.capacity} serviços/mês). Meses em que a demanda passou da capacidade: {pct(sum.probCapacityBound, 0)}.</p>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold">Sensibilidade do lucro médio</h2>
        <p className="mb-2 text-xs text-ink/60">Efeito de variar cada fator em ±{r.sensitivity[0].shiftPercent}%, mantendo o resto. Os fatores estão ordenados do mais para o menos influente.</p>
        <Sensitivity r={r} />
        <ul className="mt-2 grid gap-1 text-xs text-ink/70 sm:grid-cols-2">{r.sensitivity.map((x) => <li key={x.key}><b>{x.label}:</b> prejuízo {pct(x.low.probLoss, 0)} → {pct(x.high.probLoss, 0)}</li>)}</ul>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold">Hipóteses e origem dos dados</h2>
        <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50"><tr><th className="py-2">Parâmetro</th><th>Valor</th><th>Origem</th></tr></thead>
          <tbody>{[...s.assumptions, ...s.observed].map((a) => (
            <tr key={a.key ?? a.label} className="border-b border-brand-900/5 align-top">
              <td className="py-2"><p className="font-semibold">{a.label}</p><p className="text-xs text-ink/50">{a.note}{a.source && ` Fonte: ${a.source} (${a.period}).`}</p></td>
              <td className="whitespace-nowrap">{num(a.value, 2)} {a.unit}</td>
              <td><Badge color={ORIGIN[a.origin].color}>{ORIGIN[a.origin].label}</Badge></td>
            </tr>))}</tbody>
        </table></div>
        <p className="mt-2 text-xs text-ink/60">Valores “informados” são estimativas suas, não dados observados. Dados “observados” são apenas contexto e não entram no cálculo.</p>
      </Card>

      <p className="rounded-xl bg-gray-100 p-3 text-xs text-ink/70">{r.disclaimer}</p>
    </div>
  )
}
