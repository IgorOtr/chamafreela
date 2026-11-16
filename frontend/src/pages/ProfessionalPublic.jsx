import { ArrowLeft, MapPin, MessageCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { MODE_LABEL, whatsappLink } from '../utils/roles.js'

export default function ProfessionalPublic() {
  const { slug } = useParams()
  const { data: p, loading, error } = useFetch(`/professionals/${slug}`)
  if (loading) return <Spinner />
  if (error) return <EmptyState title="Perfil não encontrado">Este perfil não existe ou não está disponível. <Link to="/profissionais" className="font-semibold text-brand-700 underline">Ver catálogo</Link></EmptyState>

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-10">
      <Link to="/profissionais" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4" />Voltar ao catálogo</Link>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="green">{p.category.name}</Badge><Badge>{MODE_LABEL[p.mode]}</Badge>
          {p.featured && <Badge color="amber">Destaque</Badge>}
          {!p.available && <Badge color="gray">Sem agenda no momento</Badge>}
        </div>
        <h1 className="font-display text-3xl font-extrabold">{p.displayName}</h1>
        {p.headline && <p className="text-lg text-ink/70">{p.headline}</p>}
        <p className="inline-flex items-center gap-1 text-sm text-ink/60"><MapPin className="size-4" />{p.neighborhood ? `${p.neighborhood}, ` : ''}{p.city} · atende até {p.radiusKm} km</p>
        {p.contact ? (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a href={whatsappLink(p.contact.whatsapp)} target="_blank" rel="noopener noreferrer"><Button variant="accent"><MessageCircle className="size-4" />Chamar no WhatsApp</Button></a>
            {p.contact.other && <span className="text-sm text-ink/70">{p.contact.other}</span>}
          </div>
        ) : <p className="text-sm text-ink/60">Este profissional não divulgou contato público.</p>}
      </Card>
      <Card><h2 className="mb-2 font-display text-lg font-bold">Sobre</h2><p className="whitespace-pre-line text-sm text-ink/80">{p.description}</p></Card>
      <Card>
        <h2 className="mb-2 font-display text-lg font-bold">Serviços</h2>
        <ul className="divide-y divide-brand-900/5">
          {p.services.map((s) => (
            <li key={s.id} className="py-2.5"><p className="font-semibold">{s.name}{s.priceInfo && <span className="ml-2 text-sm font-normal text-brand-600">{s.priceInfo}</span>}</p>{s.description && <p className="text-sm text-ink/70">{s.description}</p>}</li>
          ))}
        </ul>
      </Card>
      {p.areas.length > 0 && (
        <Card><h2 className="mb-2 font-display text-lg font-bold">Regiões atendidas</h2>
          <div className="flex flex-wrap gap-2">{p.areas.map((a) => <Badge key={a.id}>{a.neighborhood ? `${a.neighborhood}, ` : ''}{a.city}</Badge>)}</div>
        </Card>
      )}
      {(p.experience || p.qualifications) && (
        <Card className="space-y-3">
          {p.experience && <div><h2 className="font-display text-lg font-bold">Experiência</h2><p className="whitespace-pre-line text-sm text-ink/80">{p.experience}</p></div>}
          {p.qualifications && <div><h2 className="font-display text-lg font-bold">Qualificações</h2><p className="whitespace-pre-line text-sm text-ink/80">{p.qualifications}</p></div>}
        </Card>
      )}
      {p.portfolio.length > 0 && (
        <Card><h2 className="mb-3 font-display text-lg font-bold">Portfólio</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {p.portfolio.map((m) => (
              <figure key={m.id}>
                {m.type === 'IMAGEM'
                  ? <img src={m.url} alt={m.caption ?? 'Trabalho do profissional'} loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full rounded-xl object-cover" />
                  : <a href={m.url} target="_blank" rel="noopener noreferrer" className="grid aspect-video place-items-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 underline">Assistir vídeo</a>}
                {m.caption && <figcaption className="mt-1 text-xs text-ink/60">{m.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
