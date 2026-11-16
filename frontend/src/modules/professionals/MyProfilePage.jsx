import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Field, Input, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { MODE_LABEL, PRO_STATUS } from '../../utils/roles.js'

const empty = {
  displayName: '', categoryId: '', headline: '', description: '', city: 'Volta Redonda', neighborhood: '', mode: 'PRESENCIAL', radiusKm: 10,
  whatsapp: '', showContact: false, otherContacts: '', experience: '', qualifications: '', available: true, preferences: '',
  services: [{ name: '', description: '', priceInfo: '' }], areas: [], portfolio: [],
}
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))

export default function MyProfilePage() {
  const toast = useToast()
  const cats = useFetch('/categories')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/professionals/me').then(({ data }) => {
      setStatus(data)
      setForm({ ...empty, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in empty && v != null)),
        services: data.services.map(({ name, description, priceInfo }) => ({ name, description: description ?? '', priceInfo: priceInfo ?? '' })),
        areas: data.areas.map(({ city, neighborhood, radiusKm, lat, lng }) => ({ city, neighborhood: neighborhood ?? '', radiusKm, lat, lng })),
        portfolio: data.portfolio.map(({ type, url, caption }) => ({ type, url, caption: caption ?? '' })) })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const setList = (key, i, patch) => setForm({ ...form, [key]: form[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const addTo = (key, item) => setForm({ ...form, [key]: [...form[key], item] })
  const removeFrom = (key, i) => setForm({ ...form, [key]: form[key].filter((_, j) => j !== i) })

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    const body = {
      ...clean(form), radiusKm: Number(form.radiusKm),
      services: form.services.map(clean), areas: form.areas.map((a) => ({ ...clean(a), radiusKm: Number(a.radiusKm) })), portfolio: form.portfolio.map(clean),
    }
    try {
      const { data } = await api.put('/professionals/me', body)
      setStatus(data); toast.success(data.status === 'PENDENTE' ? 'Perfil enviado para aprovação.' : 'Perfil atualizado.')
    } catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }

  const requestData = async (type) => {
    try { await api.post('/data-requests', { type }); toast.success('Solicitação registrada. Nossa equipe entrará em contato.') } catch (err) { toast.error(errorMessage(err)) }
  }

  if (loading || cats.loading) return <Spinner />
  const st = status && PRO_STATUS[status.status]

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Meu perfil</h1>
        {st && <Badge color={st.color}>{st.label}</Badge>}
      </div>
      {status?.status === 'REJEITADO' && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900"><b>Motivo da rejeição:</b> {status.rejectionReason}. Ajuste e reenvie.</p>}
      {status?.status === 'PENDENTE' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Seu perfil está em análise. Você será exibido no catálogo após a aprovação.</p>}
      {status?.status === 'APROVADO' && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">Seu perfil está público: <Link className="font-semibold underline" to={`/profissionais/${status.slug}`}>ver como os clientes veem</Link>.</p>}

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">Identidade</h2>
        <Input id="displayName" label="Nome ou nome comercial" required value={form.displayName} onChange={set('displayName')} />
        <Field label="Categoria" htmlFor="categoryId">
          <select id="categoryId" required className={inputClass} value={form.categoryId} onChange={set('categoryId')}>
            <option value="">Selecione…</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Input id="headline" label="Frase de apresentação (opcional)" maxLength={140} value={form.headline} onChange={set('headline')} />
        <Field label="Descrição das atividades" htmlFor="description">
          <textarea id="description" required minLength={20} rows={5} className={inputClass} value={form.description} onChange={set('description')} />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">Localização e atendimento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="city" label="Cidade" required value={form.city} onChange={set('city')} />
          <Input id="neighborhood" label="Bairro" value={form.neighborhood} onChange={set('neighborhood')} />
          <Field label="Modalidade" htmlFor="mode">
            <select id="mode" className={inputClass} value={form.mode} onChange={set('mode')}>{Object.entries(MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Input id="radiusKm" label="Raio máximo de deslocamento (km)" type="number" min={0} max={300} value={form.radiusKm} onChange={set('radiusKm')} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Outras regiões atendidas</p>
          {form.areas.map((a, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input aria-label="Cidade atendida" placeholder="Cidade" required className={inputClass} value={a.city} onChange={(e) => setList('areas', i, { city: e.target.value })} />
              <input aria-label="Bairro atendido" placeholder="Bairro (opcional)" className={inputClass} value={a.neighborhood} onChange={(e) => setList('areas', i, { neighborhood: e.target.value })} />
              <button type="button" aria-label="Remover região" onClick={() => removeFrom('areas', i)} className="rounded-xl p-2 hover:bg-red-50"><Trash2 className="size-4 text-red-600" /></button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addTo('areas', { city: '', neighborhood: '', radiusKm: 10 })}><Plus className="size-4" />Adicionar região</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Serviços oferecidos</h2>
        {form.services.map((s, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-brand-900/10 p-3 sm:grid-cols-[2fr_1fr_auto]">
            <input aria-label="Nome do serviço" placeholder="Serviço" required className={inputClass} value={s.name} onChange={(e) => setList('services', i, { name: e.target.value })} />
            <input aria-label="Preço" placeholder="Preço (opcional)" className={inputClass} value={s.priceInfo} onChange={(e) => setList('services', i, { priceInfo: e.target.value })} />
            <button type="button" aria-label="Remover serviço" disabled={form.services.length === 1} onClick={() => removeFrom('services', i)} className="rounded-xl p-2 hover:bg-red-50 disabled:opacity-30"><Trash2 className="size-4 text-red-600" /></button>
            <input aria-label="Descrição do serviço" placeholder="Descrição (opcional)" className={`${inputClass} sm:col-span-3`} value={s.description} onChange={(e) => setList('services', i, { description: e.target.value })} />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => addTo('services', { name: '', description: '', priceInfo: '' })}><Plus className="size-4" />Adicionar serviço</Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Portfólio</h2>
        <p className="text-sm text-ink/60">Cole links (https) de imagens ou vídeos. O envio de arquivos chegará em uma próxima etapa.</p>
        {form.portfolio.map((m, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[8rem_2fr_1fr_auto]">
            <select aria-label="Tipo" className={inputClass} value={m.type} onChange={(e) => setList('portfolio', i, { type: e.target.value })}><option value="IMAGEM">Imagem</option><option value="VIDEO">Vídeo</option></select>
            <input aria-label="Link" type="url" required placeholder="https://…" className={inputClass} value={m.url} onChange={(e) => setList('portfolio', i, { url: e.target.value })} />
            <input aria-label="Legenda" placeholder="Legenda" className={inputClass} value={m.caption} onChange={(e) => setList('portfolio', i, { caption: e.target.value })} />
            <button type="button" aria-label="Remover item" onClick={() => removeFrom('portfolio', i)} className="rounded-xl p-2 hover:bg-red-50"><Trash2 className="size-4 text-red-600" /></button>
          </div>
        ))}
        {form.portfolio.length < 12 && <Button type="button" variant="outline" onClick={() => addTo('portfolio', { type: 'IMAGEM', url: '', caption: '' })}><Plus className="size-4" />Adicionar item</Button>}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">Contato e experiência</h2>
        <Input id="whatsapp" label="WhatsApp (com DDD)" required value={form.whatsapp} onChange={set('whatsapp')} />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={form.showContact} onChange={set('showContact')} />Autorizo exibir meu WhatsApp e demais contatos publicamente no meu perfil.</label>
        <Input id="otherContacts" label="Outros contatos comerciais (opcional)" value={form.otherContacts} onChange={set('otherContacts')} />
        <Field label="Experiência profissional (opcional)" htmlFor="experience"><textarea id="experience" rows={3} className={inputClass} value={form.experience} onChange={set('experience')} /></Field>
        <Field label="Qualificações e certificações (opcional)" htmlFor="qualifications"><textarea id="qualifications" rows={3} className={inputClass} value={form.qualifications} onChange={set('qualifications')} /></Field>
        <Input id="preferences" label="Preferências de oportunidades (opcional)" value={form.preferences} onChange={set('preferences')} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.available} onChange={set('available')} />Disponível para novos serviços</label>
      </Card>

      <div className="flex justify-end"><Button type="submit" loading={saving} className="px-8">{status ? 'Salvar alterações' : 'Enviar para aprovação'}</Button></div>

      <Card className="space-y-2">
        <h2 className="font-display text-lg font-bold">Seus dados (LGPD)</h2>
        <p className="text-sm text-ink/70">Você pode pedir a atualização ou a exclusão dos seus dados a qualquer momento.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => requestData('ATUALIZACAO')}>Solicitar atualização</Button>
          <Button type="button" variant="outline" onClick={() => requestData('EXCLUSAO')}>Solicitar exclusão</Button>
        </div>
      </Card>
    </form>
  )
}
