import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Spinner } from './ui.jsx'
import { useFetch } from '../hooks/useFetch.js'

const money = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function PlanCard({ plan }) {
  const free = plan.priceCents === 0
  const promo = plan.promoPriceCents != null
  return (
    <article className={`relative flex flex-col rounded-3xl border p-7 ${plan.highlighted ? 'border-brand-500 bg-white shadow-lg ring-2 ring-sun-400' : 'border-brand-900/10 bg-white'}`}>
      {plan.highlighted && <span className="absolute -top-3 left-7"><Badge color="amber">{plan.available ? 'Mais completo' : 'Em breve'}</Badge></span>}
      <h3 className="font-display text-2xl font-extrabold">{plan.name}</h3>
      <p className="text-sm text-ink/60">{plan.tagline}</p>
      <div className="my-5">
        {free ? <p className="font-display text-4xl font-extrabold text-brand-700">Grátis</p> : promo ? (
          <>
            <p className="font-display text-4xl font-extrabold text-brand-700">{money(plan.promoPriceCents)}<span className="text-base font-semibold text-ink/60">/mês</span></p>
            <p className="text-sm text-ink/70">nos {plan.promoMonths} primeiros meses, depois {money(plan.priceCents)}/mês</p>
          </>
        ) : <p className="font-display text-4xl font-extrabold text-brand-700">{money(plan.priceCents)}<span className="text-base font-semibold text-ink/60">/mês</span></p>}
      </div>
      <ul className="mb-6 space-y-2 text-sm">
        {plan.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />{f}</li>)}
      </ul>
      {promo && plan.promoNote && <p className="mb-4 text-xs text-ink/60">{plan.promoNote}</p>}
      <div className="mt-auto">
        {plan.available
          ? <Link to="/cadastro"><Button variant={plan.highlighted ? 'accent' : 'primary'} className="w-full">Começar no {plan.name}</Button></Link>
          : <><Button variant="outline" className="w-full" disabled>Disponível em breve</Button><p className="mt-2 text-xs text-ink/60">A cobrança ainda não foi ativada. <Link className="font-semibold text-brand-700 underline" to="/cadastro">Comece no plano FREE</Link>.</p></>}
      </div>
    </article>
  )
}

export default function PlansSection() {
  const { data, loading, error } = useFetch('/plans')
  if (loading) return <Spinner label="Carregando planos…" />
  if (error || !data?.length) return <p className="text-center text-sm text-ink/60">Os planos serão divulgados em breve. Enquanto isso, o cadastro é gratuito.</p>
  return (
    <>
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">{data.map((p) => <PlanCard key={p.code} plan={p} />)}</div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-ink/60">Recursos avançados, como Mapa, Insights e Studio, poderão ter limites de uso conforme o plano. As condições serão divulgadas antes de qualquer cobrança, e nenhuma cobrança é feita sem a sua autorização.</p>
    </>
  )
}
