import { CalendarClock, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, Field, Input, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'

const digits = (v) => v.replace(/\D/g, '')
// Exibe 5524999468823 como +55 24 99946-8823.
const pretty = (v) => {
  const d = digits(v)
  if (d.length < 12) return v
  const ddi = d.slice(0, 2), ddd = d.slice(2, 4), n = d.slice(4)
  return `+${ddi} ${ddd} ${n.slice(0, n.length - 4)}-${n.slice(-4)}`
}

function FormalizaSettings() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/settings/formaliza/admin')
  const [form, setForm] = useState({ enabled: true, whatsapp: '', message: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (data) setForm({ enabled: data.enabled, whatsapp: pretty(data.whatsapp), message: data.message }) }, [data])

  if (loading) return <Spinner />
  if (error) return <p role="alert" className="text-red-700">{error}</p>

  const d = digits(form.whatsapp)
  const numberInvalid = !/^\d{12,13}$/.test(d)
  const message = form.message.trim()
  const messageInvalid = message.length < 10
  const dirty = form.enabled !== data.enabled || d !== data.whatsapp || message !== data.message
  const testUrl = !numberInvalid && !messageInvalid ? `https://wa.me/${d}?text=${encodeURIComponent(message)}` : ''
  const live = data.enabled && Boolean(data.whatsapp)

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put('/settings/formaliza/admin', { enabled: form.enabled, whatsapp: d, message })
      toast.success('Configurações salvas.'); reload()
    } catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><CalendarClock className="size-5 text-brand-700" aria-hidden />CHAMALÁ Formaliza — agendamento por WhatsApp</h2>
          <Badge color={live ? 'green' : 'amber'}>{live ? 'Agendamento ativo' : 'Agendamento em breve'}</Badge>
        </div>
        <p className="text-sm text-ink/70">
          O botão “Agendar pelo WhatsApp” da página <code className="rounded bg-gray-100 px-1">/formalize-seu-negocio</code> abre uma conversa com este número, já com a mensagem abaixo. Desligado, a página mostra “Agendamento em breve”.
        </p>
        <Input id="fz-wa" label="Número do WhatsApp (com DDI e DDD)" placeholder="+55 24 99999-9999" inputMode="tel" value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} error={form.whatsapp && numberInvalid ? 'Informe o número com DDI e DDD, ex.: +55 24 99999-9999' : undefined} />
        <Field label="Mensagem pronta" htmlFor="fz-msg" error={form.message && messageInvalid ? 'Escreva pelo menos 10 caracteres' : undefined}>
          <textarea id="fz-msg" rows={7} maxLength={800} className={inputClass} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <p className="mt-1 text-xs text-ink/60">Texto que já aparece escrito no WhatsApp da pessoa. Use linhas em branco e campos para ela completar, como “Meu nome:”.</p>
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          <span><b>Ativar o agendamento</b><br /><span className="text-ink/60">Ao ativar, o botão da página abre o WhatsApp. A Política de Privacidade passa a citar o tratamento dos dados da conversa de agendamento.</span></span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={saving} disabled={!dirty || numberInvalid || messageInvalid}>Salvar</Button>
          {testUrl && <a href={testUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline">Testar no WhatsApp<ExternalLink className="size-3.5" aria-hidden /></a>}
        </div>
        <p className="text-xs text-ink/60">Só o superadministrador vê esta tela; cada alteração fica na auditoria. Mais detalhes em <code className="rounded bg-gray-100 px-1">docs/FORMALIZA.md</code>.</p>
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
