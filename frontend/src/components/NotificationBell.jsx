import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api.js'

export default function NotificationBell() {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let alive = true
    const load = () => api.get('/notifications').then(({ data }) => alive && setUnread(data.unread)).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  return (
    <Link to="/painel/notificacoes" aria-label={unread ? `Notificações (${unread} novas)` : 'Notificações'} className="relative rounded-xl p-2 hover:bg-brand-50">
      <Bell className="size-5" />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-sun-500 px-1 text-[11px] font-bold text-ink">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  )
}
