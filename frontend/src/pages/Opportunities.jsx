import { Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useSeo from '../hooks/useSeo.js'
import OpportunityCard from '../components/OpportunityCard.jsx'
import { EmptyState, Pagination, Spinner, inputClass } from '../components/ui.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { CONTRACT_LABEL } from '../utils/roles.js'

export default function Opportunities() {
  useSeo({ title: 'Oportunidades de trabalho e serviços', description: 'Demandas reais de empresas e clientes em Volta Redonda e região, aprovadas pela moderação. Veja as oportunidades abertas e manifeste interesse.', path: '/oportunidades' })
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const filters = { q: sp.get('q') ?? '', category: sp.get('category') ?? '', city: sp.get('city') ?? '', contractType: sp.get('contractType') ?? '' }
  const page = Number(sp.get('page') ?? 1)
  const params = Object.fromEntries(Object.entries({ ...filters, page, pageSize: 12 }).filter(([, v]) => v !== ''))
  const { data, loading, error } = useFetch('/opportunities', params)
  const cats = useFetch('/categories')
  const cities = useFetch('/opportunities/cities')
  const update = (patch) => {
    const next = new URLSearchParams(sp)
    Object.entries({ page: 1, ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setSp(next)
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold md:text-4xl">Oportunidades</h1>
      <p className="mt-1 text-ink/60">Demandas reais de empresas e clientes, aprovadas pela moderação.</p>
      <form className="mt-6 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]" onSubmit={(e) => { e.preventDefault(); update({ q }) }} role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input aria-label="Buscar" placeholder="Título ou descrição" className={`${inputClass} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => q !== filters.q && update({ q })} />
        </div>
        <select aria-label="Categoria" className={inputClass} value={filters.category} onChange={(e) => update({ category: e.target.value })}>
          <option value="">Todas as categorias</option>{cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select aria-label="Cidade" className={inputClass} value={filters.city} onChange={(e) => update({ city: e.target.value })}>
          <option value="">Todas as cidades</option>{cities.data?.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Tipo de contratação" className={inputClass} value={filters.contractType} onChange={(e) => update({ contractType: e.target.value })}>
          <option value="">Todos os tipos</option>{Object.entries(CONTRACT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </form>
      <div className="mt-6">
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
          <EmptyState icon={SearchX} title="Nenhuma oportunidade no momento">Volte em breve ou ajuste os filtros. Só exibimos demandas publicadas e dentro do prazo.</EmptyState>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((o) => <OpportunityCard key={o.id} o={o} />)}</div>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(n) => update({ page: String(n) })} />
          </>
        )}
      </div>
    </div>
  )
}
