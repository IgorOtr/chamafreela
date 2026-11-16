import { MapPin, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui.jsx'

const pillars = [
  { icon: Users, title: 'Visibilidade para quem trabalha por conta própria', text: 'Perfil público com seus serviços, regiões de atendimento e contato direto.' },
  { icon: MapPin, title: 'Oportunidades perto de você', text: 'Empresas e clientes publicam demandas reais e o sistema indica as compatíveis com o seu perfil.' },
  { icon: Sparkles, title: 'Ferramentas para crescer', text: 'Análise de mercado, simulação financeira e apoio de marketing, sempre com fontes e limitações claras.' },
]

export default function Home() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-[1.4fr_1fr] md:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sun-400">Começando por Volta Redonda/RJ</p>
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">Transformando talento em <span className="text-sun-400">oportunidade</span>.</h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">Conectamos autônomos, microempreendedores, clientes e empresas — com dados, mapa e ferramentas para quem quer trabalhar e empreender.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/cadastro"><Button variant="accent" className="px-6 py-3 text-base">Quero me cadastrar</Button></Link>
              <Link to="/entrar"><Button variant="outline" className="px-6 py-3 text-base">Já tenho conta</Button></Link>
            </div>
          </div>
          <div aria-hidden className="hidden items-center justify-center md:flex">
            <div className="grid size-64 place-items-center rounded-[3rem] bg-brand-700 rotate-6">
              <div className="grid size-48 place-items-center rounded-[2.5rem] bg-sun-400 -rotate-12 font-display text-6xl font-extrabold text-brand-900">Cha!</div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-14 md:grid-cols-3">
        {pillars.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-brand-900/10 bg-white p-6">
            <Icon className="mb-3 size-7 text-brand-500" />
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm text-ink/70">{text}</p>
          </div>
        ))}
      </section>
    </>
  )
}
