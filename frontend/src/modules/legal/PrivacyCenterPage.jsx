import { Download, FileText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Field, Spinner, inputClass } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { formatDateTime } from '../../utils/roles.js'
import { download } from '../studio/pieceSvg.js'

const TYPE = { ATUALIZACAO: 'Atualização de dados', EXCLUSAO: 'Exclusão de dados' }

export default function PrivacyCenterPage() {
  const { user } = useAuth()
  const toast = useToast()
  const requests = useFetch('/data-requests/mine')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const exportData = async () => {
    setBusy('export')
    try {
      const { data } = await api.get('/privacy/export', { responseType: 'blob' })
      download(data, 'chamalafree-meus-dados.json')
      toast.success('Download iniciado. Guarde o arquivo com cuidado: ele contém seus dados pessoais.')
    } catch (e) { toast.error(errorMessage(e)) } finally { setBusy('') }
  }
  const request = async (type) => {
    setBusy(type)
    try {
      await api.post('/data-requests', { type, message: message.trim() || undefined })
      toast.success('Solicitação registrada. Nossa equipe responderá nos prazos previstos na LGPD.')
      setMessage(''); requests.reload()
    } catch (e) { toast.error(errorMessage(e)) } finally { setBusy('') }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Privacidade e dados</h1>
        <p className="text-sm text-ink/60">Exerça seus direitos previstos na LGPD. Leia a <Link className="font-semibold text-brand-700 underline" to="/privacidade">Política de Privacidade</Link>.</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Baixar uma cópia dos meus dados</h2>
        <p className="text-sm text-ink/70">Receba, em um arquivo JSON, tudo o que guardamos sobre você: conta, perfil, anúncios, interesses, simulações, materiais do Studio e solicitações. Senhas e dados de terceiros não são incluídos.</p>
        <Button loading={busy === 'export'} onClick={exportData}><Download className="size-4" />Baixar meus dados</Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Pedir atualização ou exclusão</h2>
        <p className="text-sm text-ink/70">Você mesmo pode corrigir a maior parte dos dados no seu perfil. Para o que não for possível, ou para pedir a exclusão, registre um pedido. A exclusão encerra sua conta e elimina ou anonimiza seus dados, ressalvados os que a lei exige manter.</p>
        <Field label="Mensagem (opcional)" htmlFor="pv-msg"><textarea id="pv-msg" rows={3} maxLength={1000} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte o que precisa ser atualizado ou excluído." /></Field>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" loading={busy === 'ATUALIZACAO'} onClick={() => request('ATUALIZACAO')}>Solicitar atualização</Button>
          <Button variant="danger" loading={busy === 'EXCLUSAO'} onClick={() => request('EXCLUSAO')}>Solicitar exclusão</Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-lg font-bold">Meus pedidos</h2>
        {requests.loading ? <Spinner /> : requests.data?.length ? (
          <ul className="divide-y divide-brand-900/5 text-sm">
            {requests.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><b>{TYPE[r.type]}</b> <span className="text-xs text-ink/50">· {formatDateTime(r.createdAt)}</span>{r.message && <span className="block text-xs text-ink/60">{r.message}</span>}</span>
                <Badge color={r.status === 'CONCLUIDA' ? 'green' : 'amber'}>{r.status === 'CONCLUIDA' ? 'Concluída' : 'Em análise'}</Badge>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink/60">Você ainda não fez pedidos.</p>}
      </Card>

      {user.role === 'PROFISSIONAL' && (
        <Card><p className="flex items-center gap-2 text-sm"><FileText className="size-4 text-brand-500" aria-hidden />Controle seus avisos e a exibição do seu contato: <Link className="font-semibold text-brand-700 underline" to="/painel/notificacoes">Notificações</Link> · <Link className="font-semibold text-brand-700 underline" to="/painel/meu-perfil">Meu perfil</Link>.</p></Card>
      )}
    </div>
  )
}
