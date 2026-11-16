import { Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProfessionalCard from '../components/ProfessionalCard.jsx'
import { EmptyState, Pagination, Spinner, inputClass } from '../components/ui.jsx'
import { useFetch } from '../hooks/useFetch.js'

export default function Catalog() {
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const filters = { q: sp.get('q') ?? '', category: sp.get('category') ?? '', city: sp.get('city') ?? '', neighborhood: sp.get('neighborhood') ?? '' }
  const page = Number(sp.get('page') ?? 1)
  const params = Object.fromEntries(Object.entries({ ...filters, page, pageSize: 12 }).filter(([, v]) => v !== ''))
  const { data, loading, error } = useFetch('/professionals', params)
  const cats = useFetch('/categories')
  const cities = useFetch('/professionals/cities')

  const update = (patch) => {
    const next = new URLSearchParams(sp)
    Object.entries({ page: 1, ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setSp(next)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold md:text-4xl">Encontre profissionais</h1>
      <p className="mt-1 text-ink/60">Autônomos e microempreendedores aprovados pela equipe CHAMALÁFREE.</p>

      <form className="mt-6 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]" onSubmit={(e) => { e.preventDefault(); update({ q }) }} role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input aria-label="Buscar por nome ou serviço" placeholder="Nome ou serviço (ex.: pintura)" className={`${inputClass} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => q !== filters.q && update({ q })} />
        </div>
        <select aria-label="Categoria" className={inputClass} value={filters.category} onChange={(e) => update({ category: e.target.value })}>
          <option value="">Todas as categorias</option>
          {cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select aria-label="Cidade" className={inputClass} value={filters.city} onChange={(e) => update({ city: e.target.value })}>
          <option value="">Todas as cidades</option>
          {cities.data?.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input aria-label="Bairro" placeholder="Bairro" className={inputClass} defaultValue={filters.neighborhood} onBlur={(e) => e.target.value !== filters.neighborhood && update({ neighborhood: e.target.value.trim() })} />
      </form>

      <div className="mt-6">
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.items.length === 0 ? (
          <EmptyState icon={SearchX} title="Nenhum profissional encontrado">Tente outros termos ou remova filtros. Novos profissionais são aprovados todos os dias.</EmptyState>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((p) => <ProfessionalCard key={p.id} p={p} />)}</div>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(n) => update({ page: String(n) })} />
          </>
        )}
      </div>
    </div>
  )
}
