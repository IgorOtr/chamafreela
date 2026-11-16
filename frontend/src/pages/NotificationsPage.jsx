import { BellOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, Spinner } from '../components/ui.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api, errorMessage } from '../services/api.js'
import { formatDateTime } from '../utils/roles.js'

export default function NotificationsPage() {
  const toast = useToast()
  const list = useFetch('/notifications')
  const prefs = useFetch('/notifications/preferences')
  const markAll = async () => { await api.post('/notifications/read-all').catch(() => {}); list.reload() }
  const open = (n) => { if (!n.readAt) api.post(`/notifications/${n.id}/read`).catch(() => {}) }
  const toggle = async (e) => {
    try { await api.put('/notifications/preferences', { notifyRecommendations: e.target.checked }); toast.success(e.target.checked ? 'Notificações ativadas.' : 'Notificações desativadas.'); prefs.reload() } catch (err) { toast.error(errorMessage(err)) }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-extrabold">Notificações</h1>
        {list.data?.unread > 0 && <Button variant="outline" onClick={markAll}>Marcar todas como lidas</Button>}
      </div>
      {prefs.data && (
        <Card><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={prefs.data.notifyRecommendations} onChange={toggle} />
          <span><b>Avisar sobre oportunidades compatíveis.</b> Os avisos aparecem apenas aqui, na plataforma. Nenhuma mensagem é enviada por e-mail ou WhatsApp.</span></label></Card>
      )}
      <Card>
        {list.loading ? <Spinner /> : list.error ? <p role="alert" className="text-red-700">{list.error}</p> : list.data.items.length === 0 ? (
          <EmptyState icon={BellOff} title="Sem notificações">Você será avisado aqui quando houver oportunidades compatíveis.</EmptyState>
        ) : (
          <ul className="divide-y divide-brand-900/5">
            {list.data.items.map((n) => (
              <li key={n.id} className="py-3">
                <Link to={n.link ?? '#'} onClick={() => open(n)} className="block">
                  <p className={`text-sm ${n.readAt ? '' : 'font-bold'}`}>{!n.readAt && <span className="mr-2 inline-block size-2 rounded-full bg-sun-500" />}{n.title}</p>
                  <p className="text-sm text-ink/70">{n.body}</p>
                  <p className="text-xs text-ink/50">{formatDateTime(n.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
