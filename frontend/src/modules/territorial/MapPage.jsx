import 'leaflet/dist/leaflet.css'
import { Info, MapPinned, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip as MapTooltip, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Field, Spinner, inputClass } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 })

function formatIndicator(i) {
  if (i.value == null) return 'Indisponível'
  if (i.unit === 'R$ mil') return `R$ ${compact.format(i.value * 1000)}`
  return `${nf.format(i.value)} ${i.unit}`
}

function FitBounds({ geometry }) {
  const map = useMap()
  useEffect(() => {
    if (!geometry) return
    import('leaflet').then((L) => { const b = L.geoJSON(geometry).getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [24, 24] }) })
  }, [geometry, map])
  return null
}

function Source({ item }) {
  return (
    <details className="mt-1 text-xs text-ink/60">
      <summary className="cursor-pointer font-semibold text-brand-700">Fonte, metodologia e limitações</summary>
      <dl className="mt-1 space-y-1">
        <div><dt className="inline font-semibold">Fonte: </dt><dd className="inline"><a className="underline" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.source}</a></dd></div>
        <div><dt className="inline font-semibold">Referência: </dt><dd className="inline">{item.period} · escala: {item.scale} · unidade: {item.unit}</dd></div>
        <div><dt className="inline font-semibold">Metodologia: </dt><dd className="inline">{item.methodology}</dd></div>
        <div><dt className="inline font-semibold">Limitações: </dt><dd className="inline">{item.limitations}</dd></div>
      </dl>
    </details>
  )
}

export default function MapPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canSync = ['SUPERADMIN', 'ADMIN'].includes(user.role)
  const [category, setCategory] = useState('')
  const [code, setCode] = useState('')
  const [syncing, setSyncing] = useState(false)
  const cats = useFetch('/categories')
  const overview = useFetch('/territorial/overview', category ? { category } : {})
  const detail = useFetch(code ? `/territorial/municipalities/${code}` : '/territorial/municipalities', code && category ? { category } : {})
  const items = overview.data?.items ?? []

  useEffect(() => { if (!code && items.length) setCode(items.find((i) => i.name === 'Volta Redonda')?.code ?? items[0].code) }, [items, code])

  const d = code && detail.data?.municipality ? detail.data : null
  const topSectors = useMemo(() => (d?.sectors.items ?? []).filter((s) => s.units != null).slice(0, 8).map((s) => ({ name: s.label.length > 28 ? s.label.slice(0, 27) + '…' : s.label, full: s.label, units: s.units })), [d])

  const sync = async () => {
    setSyncing(true)
    try {
      const { data } = await api.post('/territorial/admin/sync', {})
      const failed = data.filter((r) => r.failed.length).length
      toast[failed ? 'error' : 'success'](failed ? `Sincronização concluída com falhas em ${failed} município(s).` : `Dados do IBGE atualizados (${data.length} municípios).`)
      overview.reload(); detail.reload()
    } catch (e) { toast.error(errorMessage(e)) } finally { setSyncing(false) }
  }

  if (overview.loading && !overview.data) return <Spinner />
  if (overview.error) return <p role="alert" className="text-red-700">{overview.error}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">CHAMALÁ Mapa</h1>
          <p className="text-sm text-ink/60">Indicadores territoriais e econômicos do IBGE, combinados com o cadastro da plataforma. Cada dado mostra fonte, data e limitações.</p>
        </div>
        {canSync && <Button variant="outline" loading={syncing} onClick={sync}><RefreshCw className="size-4" />Atualizar dados do IBGE</Button>}
      </div>

      {items.length === 0 ? (
        <Card><EmptyState icon={MapPinned} title="Ainda não há dados territoriais">{canSync ? 'Clique em “Atualizar dados do IBGE” para carregar os municípios do Sul Fluminense.' : 'A administração ainda não carregou os dados do IBGE.'}</EmptyState></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            <Card className="grid gap-3 sm:grid-cols-2">
              <Field label="Município" htmlFor="mun"><select id="mun" className={inputClass} value={code} onChange={(e) => setCode(e.target.value)}>{items.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</select></Field>
              <Field label="Categoria de serviço (cadastro da plataforma)" htmlFor="cat"><select id="cat" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas</option>{cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></Field>
            </Card>
            <Card className="overflow-hidden p-0">
              <div className="h-[430px]" role="region" aria-label="Mapa interativo dos municípios">
                <MapContainer center={[-22.5, -44.1]} zoom={9} scrollWheelZoom className="h-full w-full">
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {d?.geometry && <GeoJSON key={d.municipality.code} data={d.geometry} style={{ color: '#0f5c4d', weight: 2, fillColor: '#14866f', fillOpacity: 0.12 }} />}
                  <FitBounds geometry={d?.geometry} />
                  {items.filter((m) => m.centerLat != null).map((m) => (
                    <CircleMarker key={m.code} center={[m.centerLat, m.centerLng]} radius={8 + Math.sqrt(m.professionals) * 4}
                      pathOptions={{ color: m.code === code ? '#f59e0b' : '#0f5c4d', fillColor: m.code === code ? '#ffb84d' : '#14866f', fillOpacity: 0.55, weight: m.code === code ? 3 : 1.5 }}
                      eventHandlers={{ click: () => setCode(m.code) }}>
                      <MapTooltip>{m.name}: {m.professionals} profissional(is) · {m.opportunities} oportunidade(s)</MapTooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
              <p className="border-t border-brand-900/10 p-3 text-xs text-ink/60">Cada círculo está no centro aproximado do município; o tamanho indica profissionais aprovados cadastrados na plataforma{overview.data.category ? ` (categoria ${overview.data.category.name})` : ''}. Não é um mapa de calor nem de concorrência.</p>
            </Card>
            {overview.data.unmapped.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><Info className="mr-1 inline size-3.5" />Há cadastros em cidades sem dados territoriais carregados: {overview.data.unmapped.join(', ')}.</p>}
          </div>

          <div className="space-y-3">
            {detail.loading && !d ? <Spinner /> : detail.error ? <p role="alert" className="text-red-700">{detail.error}</p> : d && (
              <>
                <Card>
                  <h2 className="font-display text-xl font-bold">{d.municipality.name}/{d.municipality.uf}</h2>
                  <p className="text-xs text-ink/50">Dados do IBGE sincronizados em {new Date(d.municipality.syncedAt).toLocaleDateString('pt-BR')}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {d.indicators.map((i) => (
                      <div key={i.key} className="rounded-xl bg-brand-50 p-3">
                        <p className="text-xs text-ink/60">{i.label} <span className="text-ink/40">({i.period})</span></p>
                        <p className="font-display text-lg font-extrabold text-brand-700">{formatIndicator(i)}</p>
                      </div>
                    ))}
                  </div>
                  {d.indicators.map((i) => <div key={i.key}><p className="mt-2 text-xs font-semibold">{i.label}</p><Source item={i} /></div>)}
                </Card>

                <Card>
                  <h3 className="font-display text-lg font-bold">Estabelecimentos por setor (CNAE)</h3>
                  {topSectors.length === 0 ? <p className="text-sm text-ink/60">Dados de setores indisponíveis.</p> : (
                    <>
                      <p className="text-xs text-ink/60">Unidades locais formais — 8 maiores setores. Referência {d.sectors.meta.period}.</p>
                      <div className="mt-2 h-60"><ResponsiveContainer><BarChart data={topSectors} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [nf.format(v), 'Unidades']} labelFormatter={(_, p) => p?.[0]?.payload.full} /><Bar dataKey="units" fill="#0f5c4d" radius={[0, 6, 6, 0]} />
                      </BarChart></ResponsiveContainer></div>
                      <Source item={{ ...d.sectors.meta, label: 'Setores' }} />
                    </>
                  )}
                </Card>

                <Card>
                  <h3 className="font-display text-lg font-bold">Na plataforma {d.category && <Badge color="green">{d.category.name}</Badge>}</h3>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-brand-50 p-2"><p className="font-display text-xl font-extrabold">{d.platform.professionals}</p><p className="text-xs text-ink/60">profissionais</p></div>
                    <div className="rounded-xl bg-brand-50 p-2"><p className="font-display text-xl font-extrabold">{d.platform.areasServed}</p><p className="text-xs text-ink/60">regiões atendidas</p></div>
                    <div className="rounded-xl bg-brand-50 p-2"><p className="font-display text-xl font-extrabold">{d.platform.opportunitiesOpen}</p><p className="text-xs text-ink/60">oportunidades</p></div>
                  </div>
                  <p className={`mt-2 rounded-lg p-2 text-xs ${d.platform.sufficient ? 'bg-gray-50 text-ink/70' : 'bg-amber-50 text-amber-900'}`}>{d.platform.note}</p>
                  {d.platform.sufficient && d.platform.byCategory.length > 0 && <ul className="mt-2 space-y-1 text-sm">{d.platform.byCategory.slice(0, 5).map((c) => <li key={c.id} className="flex justify-between"><span>{c.name}</span><b>{c.count}</b></li>)}</ul>}
                  {d.platform.opportunities.length > 0 && <div className="mt-3"><p className="text-sm font-semibold">Oportunidades abertas</p><ul className="text-sm">{d.platform.opportunities.map((o) => <li key={o.id}><Link className="text-brand-700 underline" to={`/oportunidades/${o.id}`}>{o.title}</Link> <span className="text-ink/50">· {o.company.tradeName}</span></li>)}</ul></div>}
                  <Link to={`/profissionais?city=${encodeURIComponent(d.municipality.name)}${d.category ? `&category=${d.category.slug}` : ''}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 underline">Ver profissionais no catálogo</Link>
                </Card>

                <Card className="space-y-2 border-amber-200 bg-amber-50">
                  <h3 className="flex items-center gap-1 font-display text-base font-bold"><Info className="size-4" />Onde não há dados suficientes</h3>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900">{[...d.gaps, ...d.notes].map((g) => <li key={g}>{g}</li>)}</ul>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
