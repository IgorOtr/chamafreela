import { LineChart as InsightsIcon, ShieldCheck as PrivacyIcon, Palette, Map as MapIcon, Sparkles, SlidersHorizontal, Briefcase, Building2, ClipboardCheck, HeartHandshake, LayoutDashboard, LogOut, Menu, ScrollText, Search, ShieldCheck, Tags, UserCheck, UserCircle, Users, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { ROLE_LABEL, isStaff } from '../utils/roles.js'

const staffNav = [
  { to: '/painel', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/painel/usuarios', label: 'Usuários', icon: Users, roles: ['SUPERADMIN', 'ADMIN', 'MODERADOR'] },
  { to: '/painel/profissionais', label: 'Profissionais', icon: UserCheck, roles: ['SUPERADMIN', 'ADMIN', 'MODERADOR'] },
  { to: '/painel/oportunidades', label: 'Oportunidades', icon: ClipboardCheck, roles: ['SUPERADMIN', 'ADMIN', 'MODERADOR'] },
  { to: '/painel/empresas', label: 'Empresas', icon: Building2, roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/painel/conecta', label: 'Conecta (critérios)', icon: SlidersHorizontal, roles: ['SUPERADMIN', 'ADMIN', 'MODERADOR'] },
  { to: '/painel/mapa', label: 'CHAMALÁ Mapa', icon: MapIcon },
  { to: '/painel/categorias', label: 'Categorias', icon: Tags, roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/painel/solicitacoes', label: 'Solicitações LGPD', icon: ShieldCheck, roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/painel/auditoria', label: 'Auditoria', icon: ScrollText, roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/painel/privacidade', label: 'Privacidade e dados', icon: PrivacyIcon },
]
const userNav = [
  { to: '/painel', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/painel/meu-perfil', label: 'Meu perfil', icon: UserCircle, roles: ['PROFISSIONAL'] },
  { to: '/painel/recomendadas', label: 'Recomendadas', icon: Sparkles, roles: ['PROFISSIONAL'] },
  { to: '/painel/mapa', label: 'CHAMALÁ Mapa', icon: MapIcon },
  { to: '/painel/insights', label: 'CHAMALÁ Insights', icon: InsightsIcon },
  { to: '/painel/studio', label: 'CHAMALÁ Studio', icon: Palette, roles: ['PROFISSIONAL', 'EMPRESA'] },
  { to: '/painel/interesses', label: 'Meus interesses', icon: HeartHandshake, roles: ['PROFISSIONAL'] },
  { to: '/painel/empresa', label: 'Perfil da empresa', icon: Building2, roles: ['EMPRESA'] },
  { to: '/painel/oportunidades', label: 'Minhas oportunidades', icon: Briefcase, roles: ['EMPRESA'] },
  { to: '/oportunidades', label: 'Oportunidades abertas', icon: Search, roles: ['PROFISSIONAL', 'CLIENTE'] },
  { to: '/profissionais', label: 'Catálogo', icon: Search },
  { to: '/painel/privacidade', label: 'Privacidade e dados', icon: PrivacyIcon },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const items = (isStaff(user.role) ? staffNav : userNav).filter((i) => !i.roles || i.roles.includes(user.role))

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className={`${open ? 'block' : 'hidden'} bg-brand-900 p-4 text-white lg:sticky lg:top-0 lg:block lg:h-screen`}>
        <div className="mb-6 hidden lg:block"><Logo light /></div>
        <nav className="space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-white/15' : 'text-white/75 hover:bg-white/10'}`}>
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-brand-900/10 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
            <div className="lg:hidden"><Logo /></div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user.role === 'PROFISSIONAL' && <NotificationBell />}
            <div className="text-right leading-tight">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-ink/60">{ROLE_LABEL[user.role]}</p>
            </div>
            <button aria-label="Sair" className="rounded-xl p-2 hover:bg-brand-50" onClick={async () => { await logout(); navigate('/') }}>
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
