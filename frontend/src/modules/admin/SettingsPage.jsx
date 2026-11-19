import { CalendarClock, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, Input, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'

function FormalizaSettings() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/settings/formaliza/admin')
  const [form, setForm] = useState({ enabled: false, bookingUrl: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (data) setForm({ enabled: data.enabled, bookingUrl: data.bookingUrl }) }, [data])

  if (loading) return <Spinner />
  if (error) return <p role="alert" className="text-red-700">{error}</p>

  const url = form.bookingUrl.trim()
  const urlInvalid = url !== '' && !/^https:\/\/\S+$/i.test(url)
  const needsUrl = form.enabled && url === ''
  const dirty = form.enabled !== data.enabled || url !== data.bookingUrl
  const live = data.enabled && Boolean(data.bookingUrl)

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put('/settings/formaliza/admin', { enabled: form.enabled, bookingUrl: url })
      toast.success('Configurações salvas.'); reload()
    } catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><CalendarClock className="size-5 text-brand-700" aria-hidden />CHAMALÁ Formaliza — agendamento</h2>
          <Badge color={live ? 'green' : 'amber'}>{live ? 'Agendamento ativo' : 'Agendamento em breve'}</Badge>
        </div>
        <p className="text-sm text-ink/70">
          Define o botão “Agendar minha consultoria” da página pública <code className="rounded bg-gray-100 px-1">/formalize-seu-negocio</code>. Com o agendamento desligado ou sem link, a página mostra “Agendamento em breve”.
        </p>
        <Input id="fz-url" label="Link público da página de agendamento" placeholder="https://outlook.office.com/book/..." inputMode="url" value={form.bookingUrl}
          onChange={(e) => setForm({ ...form, bookingUrl: e.target.value })} error={urlInvalid ? 'O link precisa começar com https://' : needsUrl ? 'Informe o link para ativar o agendamento' : undefined} />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          <span><b>Ativar o agendamento</b><br /><span className="text-ink/60">Ao ativar, o botão passa a abrir o link acima e a Política de Privacidade passa a citar o tratamento dos dados do agendamento.</span></span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={saving} disabled={!dirty || urlInvalid || needsUrl}>Salvar</Button>
          {url && !urlInvalid && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline">Testar o link<ExternalLink className="size-3.5" aria-hidden /></a>}
        </div>
        <p className="text-xs text-ink/60">Depois de criar a agenda (30 min, intervalo de 10 min, horários de noite e fim de semana), cole aqui o link público. Só o superadministrador vê esta tela; cada alteração fica na auditoria. Passo a passo em <code className="rounded bg-gray-100 px-1">docs/FORMALIZA.md</code>.</p>
      </form>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Configurações</h1>
      <FormalizaSettings />
    </div>
  )
}
