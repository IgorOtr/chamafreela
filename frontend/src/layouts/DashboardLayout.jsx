import { LayoutDashboard, LogOut, Menu, ScrollText, Tags, Users, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { ROLE_LABEL, isStaff } from '../utils/roles.js'

const staffNav = [
  { to: '/painel', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/painel/usuarios', label: 'Usuários', icon: Users, roles: ['SUPERADMIN', 'ADMIN', 'MODERADOR'] },
  { to: '/painel/categorias', label: 'Categorias', icon: Tags, roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/painel/auditoria', label: 'Auditoria', icon: ScrollText, roles: ['SUPERADMIN', 'ADMIN'] },
]
const userNav = [{ to: '/painel', label: 'Dashboard', icon: LayoutDashboard, end: true }]

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
