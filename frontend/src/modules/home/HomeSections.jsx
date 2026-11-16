import { BarChart3, Compass, Handshake, MapPinned, Palette, Rocket, Search, ShieldCheck, Sparkles, UserRound, Users, Building2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import OpportunityCard from '../../components/OpportunityCard.jsx'
import PlansSection from '../../components/PlansSection.jsx'
import ProfessionalCard from '../../components/ProfessionalCard.jsx'
import { Button } from '../../components/ui.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { AUDIENCES, FAQ, HERO, STEPS, TOOLS, TRUST } from './content.js'

const wrap = 'mx-auto max-w-6xl px-4'
const H2 = ({ id, children, sub }) => (
  <div className="mx-auto mb-10 max-w-3xl text-center">
    <h2 id={id} className="font-display text-3xl font-extrabold leading-tight md:text-4xl">{children}</h2>
    {sub && <p className="mt-3 text-ink/70">{sub}</p>}
  </div>
)

// 1 — Hero
export function Hero() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  return (
    <section aria-labelledby="hero-title" className="bg-brand-900 text-white">
      <div className={`${wrap} grid gap-10 py-16 md:grid-cols-[1.5fr_1fr] md:py-24`}>
        <div>
          <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sun-400">{HERO.eyebrow}</p>
          <h1 id="hero-title" className="font-display text-4xl font-extrabold leading-tight md:text-5xl">{HERO.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">{HERO.subtitle}</p>
          <form role="search" className="mt-7 flex max-w-xl flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); navigate(`/profissionais${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`) }}>
            <label htmlFor="hero-q" className="sr-only">O que você procura?</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" aria-hidden />
              <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="O que você precisa? Ex.: eletricista, diarista" className="w-full rounded-xl bg-white py-3 pl-9 pr-3 text-sm text-ink placeholder:text-ink/40" />
            </div>
            <Button type="submit" variant="accent" className="py-3">Buscar profissionais</Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/cadastro"><Button variant="onDark">Quero divulgar meu trabalho</Button></Link>
            <Link to="/oportunidades"><Button variant="ghostOnDark">Ver oportunidades abertas</Button></Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
            {HERO.chips.map((c) => <li key={c} className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-sun-400" aria-hidden />{c}</li>)}
          </ul>
        </div>
        <div aria-hidden className="hidden items-center justify-center md:flex">
          <div className="grid size-64 rotate-6 place-items-center rounded-[3rem] bg-brand-700"><div className="grid size-48 -rotate-12 place-items-center rounded-[2.5rem] bg-sun-400 font-display text-6xl font-extrabold text-brand-900">Cha!</div></div>
        </div>
      </div>
    </section>
  )
}

// 2 — Como funciona
export function HowItWorks() {
  const Track = ({ track, icon: Icon }) => (
    <div className="rounded-3xl border border-brand-900/10 bg-white p-7">
      <h3 className="mb-5 flex items-center gap-2 font-display text-xl font-bold"><Icon className="size-5 text-brand-500" aria-hidden />{track.title}</h3>
      <ol className="space-y-4">
        {track.steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 font-display font-extrabold text-brand-700">{i + 1}</span>
            <div><p className="font-semibold">{t}</p><p className="text-sm text-ink/70">{d}</p></div>
          </li>
        ))}
      </ol>
    </div>
  )
  return (
    <section id="como-funciona" aria-labelledby="como-title" className="py-16">
      <div className={wrap}>
        <H2 id="como-title" sub="Do cadastro ao primeiro contato, de forma simples e com aprovação da equipe.">Como o CHAMALÁFREE funciona</H2>
        <div className="grid gap-6 md:grid-cols-2"><Track track={STEPS.pro} icon={UserRound} /><Track track={STEPS.client} icon={Users} /></div>
      </div>
    </section>
  )
}

// 3 — Para quem é
export function Audience() {
  const icons = [UserRound, Search, Building2, Rocket]
  return (
    <section id="para-quem" aria-labelledby="quem-title" className="bg-brand-50 py-16">
      <div className={wrap}>
        <H2 id="quem-title" sub="Uma plataforma local para quem trabalha por conta própria e para quem precisa contratar.">Feito para autônomos, clientes e empresas</H2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a, i) => {
            const Icon = icons[i]
            return (
              <article key={a.title} className="flex flex-col rounded-2xl border border-brand-900/10 bg-white p-6">
                <Icon className="mb-3 size-7 text-brand-500" aria-hidden />
                <h3 className="font-display text-lg font-bold">{a.title}</h3>
                <p className="mt-2 flex-1 text-sm text-ink/70">{a.text}</p>
                {a.cta[1].startsWith('#') ? <a href={a.cta[1]} className="mt-4 text-sm font-semibold text-brand-700 underline">{a.cta[0]}</a> : <Link to={a.cta[1]} className="mt-4 text-sm font-semibold text-brand-700 underline">{a.cta[0]}</Link>}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// 4 — Ferramentas
export function Tools() {
  const icons = [Compass, Handshake, MapPinned, BarChart3, Palette]
  return (
    <section id="ferramentas" aria-labelledby="tools-title" className="py-16">
      <div className={wrap}>
        <H2 id="tools-title" sub="Recursos que ajudam a ser encontrado, escolher bem e tomar decisões com mais segurança.">Ferramentas para divulgar, decidir e crescer</H2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => {
            const Icon = icons[i]
            return (
              <article key={t.name} className="rounded-2xl border border-brand-900/10 bg-white p-6">
                <span className="mb-3 grid size-11 place-items-center rounded-xl bg-brand-100"><Icon className="size-5 text-brand-700" aria-hidden /></span>
                <h3 className="font-display text-lg font-bold">{t.name}</h3>
                <p className="mt-2 text-sm text-ink/70">{t.text}</p>
              </article>
            )
          })}
          <article className="flex flex-col justify-center rounded-2xl bg-brand-700 p-6 text-white">
            <Sparkles className="mb-3 size-7 text-sun-400" aria-hidden />
            <h3 className="font-display text-lg font-bold">Tudo no mesmo lugar</h3>
            <p className="mt-2 text-sm text-white/80">Crie sua conta gratuita e comece pelo perfil. As ferramentas ficam no seu painel.</p>
            <Link to="/cadastro" className="mt-4"><Button variant="accent">Criar conta grátis</Button></Link>
          </article>
        </div>
      </div>
    </section>
  )
}

// 5 — Explore agora (dados reais)
export function Explore() {
  const cats = useFetch('/categories')
  const pros = useFetch('/professionals', { pageSize: 3 })
  const opps = useFetch('/opportunities', { pageSize: 3 })
  const empty = (msg, cta, to) => <div className="rounded-2xl border border-dashed border-brand-900/20 p-6 text-center text-sm text-ink/70"><p>{msg}</p><Link to={to} className="mt-2 inline-block font-semibold text-brand-700 underline">{cta}</Link></div>
  return (
    <section id="explorar" aria-labelledby="explore-title" className="bg-brand-50 py-16">
      <div className={wrap}>
        <H2 id="explore-title" sub="Navegue por categoria ou veja o que há de mais recente no catálogo.">Explore profissionais e oportunidades em Volta Redonda e região</H2>
        {cats.data?.length > 0 && (
          <nav aria-label="Categorias de serviços" className="mb-10 flex flex-wrap justify-center gap-2">
            {cats.data.map((c) => <Link key={c.id} to={`/profissionais?category=${c.slug}`} className="rounded-full border border-brand-900/10 bg-white px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-100">{c.name}</Link>)}
          </nav>
        )}
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-xl font-bold">Profissionais em destaque</h3><Link to="/profissionais" className="text-sm font-semibold text-brand-700 underline">Ver todos</Link></div>
            {pros.data?.items?.length ? <div className="grid gap-4">{pros.data.items.map((p) => <ProfessionalCard key={p.id} p={p} />)}</div> : !pros.loading && empty('Ainda estamos cadastrando os primeiros profissionais.', 'Seja um dos primeiros: crie seu perfil', '/cadastro')}
          </div>
          <div>
            <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-xl font-bold">Oportunidades recentes</h3><Link to="/oportunidades" className="text-sm font-semibold text-brand-700 underline">Ver todas</Link></div>
            {opps.data?.items?.length ? <div className="grid gap-4">{opps.data.items.map((o) => <OpportunityCard key={o.id} o={o} />)}</div> : !opps.loading && empty('Nenhuma oportunidade aberta neste momento.', 'Empresas: publique a sua demanda', '/cadastro')}
          </div>
        </div>
      </div>
    </section>
  )
}

// 6 — Planos
export function Plans() {
  return (
    <section id="planos" aria-labelledby="plans-title" className="py-16">
      <div className={wrap}>
        <H2 id="plans-title" sub="Comece gratuitamente. Os recursos do plano PRO estão em preparação e não há cobrança ativa.">Planos simples: comece grátis</H2>
        <PlansSection />
      </div>
    </section>
  )
}

// 7 — Confiança
export function Trust() {
  return (
    <section id="seguranca" aria-labelledby="trust-title" className="bg-brand-900 py-16 text-white">
      <div className={wrap}>
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 id="trust-title" className="font-display text-3xl font-extrabold leading-tight md:text-4xl">Confiança, segurança e privacidade em primeiro lugar</h2>
          <p className="mt-3 text-white/75">Cuidamos dos seus dados e do que é publicado na plataforma, em linha com a LGPD.</p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map(([t, d]) => (
            <li key={t} className="rounded-2xl bg-white/10 p-6"><ShieldCheck className="mb-3 size-6 text-sun-400" aria-hidden /><h3 className="font-display text-lg font-bold">{t}</h3><p className="mt-2 text-sm text-white/80">{d}</p></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// 8 — FAQ + chamada final
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-16">
      <div className={wrap}>
        <H2 id="faq-title">Perguntas frequentes</H2>
        <div className="mx-auto max-w-3xl divide-y divide-brand-900/10 rounded-2xl border border-brand-900/10 bg-white">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold"><h3 className="text-base font-semibold">{q}</h3><ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden /></summary>
              <p className="mt-3 text-sm text-ink/75">{a}</p>
            </details>
          ))}
        </div>
        <div className="mx-auto mt-14 max-w-3xl rounded-3xl bg-brand-700 p-10 text-center text-white">
          <h2 className="font-display text-3xl font-extrabold">Pronto para transformar seu talento em oportunidade?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Crie sua conta gratuita em poucos minutos e comece a ser encontrado em Volta Redonda e região.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/cadastro"><Button variant="accent" className="px-6 py-3 text-base">Criar conta grátis</Button></Link>
            <Link to="/profissionais"><Button variant="onDark" className="px-6 py-3 text-base">Buscar profissionais</Button></Link>
          </div>
        </div>
      </div>
    </section>
  )
}
