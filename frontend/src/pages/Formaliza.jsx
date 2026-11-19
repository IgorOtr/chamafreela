import { CalendarClock, ExternalLink, House, KeyRound, Lightbulb, MapPin, MessageCircle, ShieldCheck, UserRound, Video, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui.jsx'
import useSeo from '../hooks/useSeo.js'
import { useFetch } from '../hooks/useFetch.js'

const STEPS = [
  'Agende sua consultoria.',
  'Conte sua ideia de negócio.',
  'Analisamos suas atividades e possíveis CNAEs.',
  'Apresentamos as orientações para sua aprovação.',
  'Acompanhamos sua formalização pelo portal oficial.',
]

const CHECKLIST = [
  { icon: UserRound, title: 'Dados pessoais', text: 'Nome, CPF, data de nascimento e contatos.' },
  { icon: Lightbulb, title: 'Ideia de negócio', text: 'O que você pretende fazer ou vender.' },
  { icon: MapPin, title: 'Local de atuação', text: 'Cidade, endereço e forma de trabalho.' },
  { icon: Wallet, title: 'Planejamento', text: 'Faturamento previsto e investimento inicial.' },
  { icon: KeyRound, title: 'Conta gov.br', text: 'Verifique se você tem acesso à sua própria conta.' },
  { icon: House, title: 'Endereço', text: 'Endereço residencial e o da atividade, se for diferente.' },
]

const wrap = 'mx-auto max-w-5xl px-4'

function BookingButton({ className = '' }) {
  const { data } = useFetch('/settings/formaliza')
  const BOOKING_URL = data?.bookingUrl ?? ''
  if (!data?.ready || !BOOKING_URL) {
    return (
      <div className={className}>
        <Button variant="outline" disabled className="w-full sm:w-auto"><CalendarClock className="size-4" aria-hidden />Agendamento em breve</Button>
        <p className="mt-2 text-xs text-ink/60">Em breve você poderá escolher o dia e o horário por aqui.</p>
      </div>
    )
  }
  return (
    <div className={className}>
      <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="inline-block w-full sm:w-auto">
        <Button variant="accent" className="w-full px-6 py-3 text-base sm:w-auto"><CalendarClock className="size-4" aria-hidden />Agendar minha consultoria<ExternalLink className="size-4" aria-hidden /></Button>
      </a>
      <p className="mt-2 text-xs text-ink/60">Você será levado à página de agendamento, onde escolhe o dia e o horário.</p>
    </div>
  )
}

export default function Formaliza() {
  useSeo({
    title: 'Formalize seu negócio: abra seu MEI com orientação',
    description: 'Tem uma ideia de negócio e não sabe como abrir seu MEI? Agende uma consultoria online de 30 minutos e entenda os primeiros passos da formalização.',
    path: '/formalize-seu-negocio',
  })
  return (
    <>
      <section aria-labelledby="formaliza-title" className="bg-brand-900 text-white">
        <div className={`${wrap} py-14 md:py-20`}>
          <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sun-400">CHAMALÁ Formaliza</p>
          <h1 id="formaliza-title" className="max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-5xl">Sua ideia merece virar negócio!</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">Tem uma ideia de negócio, mas não sabe como abrir seu MEI? O CHAMALÁFREE ajuda você a entender os primeiros passos da formalização, identificar possíveis atividades e se preparar para começar.</p>
          <div className="mt-7 flex flex-wrap items-start gap-3">
            <a href="#agendar"><Button variant="accent" className="px-6 py-3 text-base">Agendar consultoria</Button></a>
            <a href="#como-funciona"><Button variant="ghostOnDark" className="px-6 py-3 text-base">Como funciona</Button></a>
          </div>
        </div>
      </section>

      <section id="como-funciona" aria-labelledby="como-title" className="py-14">
        <div className={wrap}>
          <h2 id="como-title" className="mb-8 text-center font-display text-3xl font-extrabold">Como funciona</h2>
          <ol className="mx-auto max-w-2xl space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-4 rounded-2xl border border-brand-900/10 bg-white p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 font-display text-lg font-extrabold text-brand-700" aria-hidden>{i + 1}</span>
                <span className="font-semibold">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="checklist-title" className="bg-brand-50 py-14">
        <div className={wrap}>
          <h2 id="checklist-title" className="font-display text-3xl font-extrabold md:text-center">O que vamos conversar</h2>
          <p className="mt-2 text-ink/70 md:text-center">Para aproveitar melhor a consultoria, tenha estas informações em mente.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHECKLIST.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-brand-900/10 bg-white p-5">
                <span className="mb-3 grid size-11 place-items-center rounded-xl bg-brand-100"><Icon className="size-5 text-brand-700" aria-hidden /></span>
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="mt-1 text-sm text-ink/70">{text}</p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-2xl rounded-2xl bg-white p-5 text-center font-semibold text-brand-900">Não tem todas essas informações? Não se preocupe! Nossa consultoria existe para ajudar você.</p>
        </div>
      </section>

      <section id="agendar" aria-labelledby="agendar-title" className="py-14">
        <div className={wrap}>
          <div className="mx-auto max-w-2xl rounded-3xl border border-brand-900/10 bg-white p-7 text-center shadow-sm md:p-9">
            <h2 id="agendar-title" className="font-display text-3xl font-extrabold">Agende sua consultoria online</h2>
            <p className="mt-3 text-ink/70">Um atendimento de 30 minutos, com horários à noite e nos fins de semana, no horário de Brasília.</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-3 text-sm font-semibold text-brand-900">
              <li className="flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2"><Video className="size-4" aria-hidden />Pelo Microsoft Teams</li>
              <li className="flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2"><MessageCircle className="size-4" aria-hidden />Pelo WhatsApp (voz ou vídeo)</li>
            </ul>
            <p className="mt-5 text-sm text-ink/70">Na página de agendamento, você informa apenas seu nome, WhatsApp, e-mail, uma breve descrição do negócio e a modalidade desejada.</p>
            <BookingButton className="mt-6 flex flex-col items-center" />
          </div>
        </div>
      </section>

      <section aria-label="Avisos importantes" className="border-t border-brand-900/10 bg-white py-8">
        <div className={`${wrap} space-y-3 text-sm leading-relaxed text-ink/70`}>
          <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden /><span>A abertura oficial do MEI é gratuita no Portal do Empreendedor. O CHAMALÁ Formaliza é um serviço independente de orientação e acompanhamento. O cliente realiza o acesso à sua própria conta gov.br, sem compartilhar senhas ou códigos de autenticação.{' '}
            <a href="https://www.gov.br/mei" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">Acessar gov.br/mei</a>.</span></p>
          <p><b>Privacidade:</b> os dados informados no agendamento (nome, WhatsApp, e-mail e descrição do negócio) são usados apenas para marcar e realizar a consultoria, e ficam na ferramenta de agendamento e em um registro de acesso restrito da nossa equipe. Veja a <Link to="/privacidade" className="font-semibold text-brand-700 underline">Política de Privacidade</Link>.</p>
          <p><b>Valores:</b> eventuais valores de consultoria ou acompanhamento serão informados antes da contratação.</p>
        </div>
      </section>
    </>
  )
}
