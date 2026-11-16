import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { Button } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

const NAV = [['/profissionais', 'Profissionais'], ['/oportunidades', 'Oportunidades'], ['/planos', 'Planos']]

export default function PublicLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const links = (cls, onClick) => NAV.map(([to, label]) => <Link key={to} to={to} onClick={onClick} className={cls}>{label}</Link>)
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Pular para o conteúdo</a>
      <header className="sticky top-0 z-30 border-b border-brand-900/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">{links('rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50')}</nav>
          <div className="flex items-center gap-2">
            {user ? <Link to="/painel"><Button>Meu painel</Button></Link> : (
              <>
                <Link to="/entrar" className="hidden sm:block"><Button variant="ghost">Entrar</Button></Link>
                <Link to="/cadastro"><Button>Criar conta</Button></Link>
              </>
            )}
            <button className="rounded-lg p-2 md:hidden" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          </div>
        </div>
        {open && (
          <nav aria-label="Menu móvel" className="flex flex-col border-t border-brand-900/10 bg-paper px-4 py-2 md:hidden">
            {links('rounded-lg px-3 py-3 text-sm font-semibold text-brand-700', () => setOpen(false))}
            {!user && <Link to="/entrar" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-brand-700">Entrar</Link>}
          </nav>
        )}
      </header>
      <main id="conteudo" className="flex-1"><Outlet /></main>
      <footer className="border-t border-brand-900/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-ink/70">Transformando talento em oportunidade. Plataforma que conecta profissionais autônomos, MEIs, clientes e empresas em Volta Redonda e região.</p>
          </div>
          <nav aria-label="Plataforma"><h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink/60">Plataforma</h2>
            <ul className="space-y-2 text-sm">{NAV.map(([to, label]) => <li key={to}><Link className="hover:underline" to={to}>{label}</Link></li>)}</ul></nav>
          <nav aria-label="Sua conta"><h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink/60">Sua conta</h2>
            <ul className="space-y-2 text-sm"><li><Link className="hover:underline" to="/cadastro">Criar conta grátis</Link></li><li><Link className="hover:underline" to="/entrar">Entrar</Link></li><li><Link className="hover:underline" to="/privacidade">Política de Privacidade</Link></li></ul></nav>
        </div>
        <p className="border-t border-brand-900/10 py-4 text-center text-xs text-ink/60">© {new Date().getFullYear()} CHAMALÁFREE. Atendimento inicial em Volta Redonda/RJ, com expansão gradual para o Sul Fluminense.</p>
      </footer>
    </div>
  )
}
