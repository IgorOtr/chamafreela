import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { Button } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function PublicLayout() {
  const { user } = useAuth()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-brand-900/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link to="/painel"><Button>Meu painel</Button></Link>
            ) : (
              <>
                <Link to="/entrar"><Button variant="ghost">Entrar</Button></Link>
                <Link to="/cadastro"><Button>Criar conta</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-brand-900/10 py-6 text-center text-sm text-ink/60">
        CHAMALÁFREE — Transformando talento em oportunidade. Volta Redonda/RJ.
      </footer>
    </div>
  )
}
