import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from './ui.jsx'
import { MODE_LABEL } from '../utils/roles.js'

export default function ProfessionalCard({ p }) {
  const initials = p.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <Link to={`/profissionais/${p.slug}`} className="group flex flex-col rounded-2xl border border-brand-900/10 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-100 font-display font-extrabold text-brand-700">{initials}</div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-bold group-hover:text-brand-600">{p.displayName}</h3>
          <p className="text-sm text-brand-600">{p.category.name}</p>
        </div>
        {p.featured && <span className="ml-auto"><Badge color="amber">Destaque</Badge></span>}
      </div>
      {p.headline && <p className="mt-3 line-clamp-2 text-sm text-ink/70">{p.headline}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-ink/60">
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{p.neighborhood ? `${p.neighborhood}, ` : ''}{p.city}</span>
        <Badge>{MODE_LABEL[p.mode]}</Badge>
        {!p.available && <Badge color="gray">Sem agenda no momento</Badge>}
      </div>
    </Link>
  )
}
