import { CalendarClock, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from './ui.jsx'
import { CONTRACT_LABEL, MODE_LABEL, formatDate, formatPay } from '../utils/roles.js'

export default function OpportunityCard({ o }) {
  return (
    <Link to={`/oportunidades/${o.id}`} className="group flex flex-col rounded-2xl border border-brand-900/10 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs font-semibold text-brand-600">{o.category.name} · {o.company.tradeName}</p>
      <h3 className="mt-1 font-display text-lg font-bold group-hover:text-brand-600">{o.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-ink/70">{o.description}</p>
      <p className="mt-3 font-semibold text-brand-700">{formatPay(o.payMin, o.payMax)}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs text-ink/60">
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{o.city}</span>
        <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />até {formatDate(o.deadline)}</span>
        <Badge>{CONTRACT_LABEL[o.contractType]}</Badge><Badge>{MODE_LABEL[o.mode]}</Badge>
      </div>
    </Link>
  )
}
