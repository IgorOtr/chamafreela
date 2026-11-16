import { Briefcase } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { CONTRACT_LABEL, MODE_LABEL, OPP_STATUS, formatDate, formatPay } from '../../utils/roles.js'

const blank = { title: '', description: '', categoryId: '', city: 'Volta Redonda', neighborhood: '', mode: 'PRESENCIAL', deadline: '', contractType: 'PONTUAL', requirements: '', payMin: '', payMax: '', contactChannel: '' }
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))

function OpportunityForm({ initial, categories, onDone }) {
  const toast = useToast()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    const body = { ...clean(form), deadline: new Date(form.deadline + 'T23:59:59').toISOString(), payMin: form.payMin !== '' ? Number(form.payMin) : undefined, payMax: form.payMax !== '' ? Number(form.payMax) : undefined }
    try {
      if (initial.id) await api.put(`/opportunities/${initial.id}`, body); else await api.post('/opportunities', body)
      toast.success('Enviada para aprovação da moderação.'); onDone()
    } catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }
  return (
    <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <Input id="o-title" label="Título" required minLength={5} value={form.title} onChange={set('title')} />
      <Field label="Descrição" htmlFor="o-desc"><textarea id="o-desc" required minLength={20} rows={4} className={inputClass} value={form.description} onChange={set('description')} /></Field>
      <Field label="Categoria do serviço" htmlFor="o-cat"><select id="o-cat" required className={inputClass} value={form.categoryId} onChange={set('categoryId')}><option value="">Selecione…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Input id="o-city" label="Cidade" required value={form.city} onChange={set('city')} />
        <Input id="o-nb" label="Bairro" value={form.neighborhood} onChange={set('neighborhood')} />
        <Field label="Modalidade" htmlFor="o-mode"><select id="o-mode" className={inputClass} value={form.mode} onChange={set('mode')}>{Object.entries(MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Tipo de contratação" htmlFor="o-ct"><select id="o-ct" className={inputClass} value={form.contractType} onChange={set('contractType')}>{Object.entries(CONTRACT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Input id="o-min" label="Valor mínimo (R$)" type="number" min={0} value={form.payMin} onChange={set('payMin')} />
        <Input id="o-max" label="Valor máximo (R$)" type="number" min={0} value={form.payMax} onChange={set('payMax')} />
      </div>
      <Input id="o-deadline" label="Prazo (data limite)" type="date" required min={new Date().toISOString().slice(0, 10)} value={form.deadline} onChange={set('deadline')} />
      <Field label="Requisitos (opcional)" htmlFor="o-req"><textarea id="o-req" rows={2} className={inputClass} value={form.requirements} onChange={set('requirements')} /></Field>
      <Input id="o-contact" label="Canal de contato (só visível a quem manifestar interesse)" required value={form.contactChannel} onChange={set('contactChannel')} />
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => onDone(false)}>Cancelar</Button><Button type="submit" loading={saving}>{initial.id ? 'Salvar e reenviar' : 'Solicitar publicação'}</Button></div>
    </form>
  )
}

export default function MyOpportunitiesPage() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/opportunities/mine')
  const cats = useFetch('/categories')
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const interests = useFetch(viewing ? `/opportunities/${viewing.id}/interests` : '/categories')

  const close = async (o) => { try { await api.post(`/opportunities/${o.id}/close`); toast.success('Oportunidade encerrada.'); reload() } catch (e) { toast.error(errorMessage(e)) } }
  const edit = (o) => setEditing({ ...blank, ...Object.fromEntries(Object.entries(o).filter(([k, v]) => k in blank && v != null)), id: o.id, deadline: o.deadline.slice(0, 10), categoryId: o.category.id })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Minhas oportunidades</h1>
        <Button onClick={() => setEditing(blank)}>Nova oportunidade</Button>
      </div>
      {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.length === 0 ? (
        <Card><EmptyState icon={Briefcase} title="Nenhuma oportunidade ainda">Publique sua primeira demanda. Ela passa pela aprovação da moderação antes de aparecer.</EmptyState><p className="text-center text-xs text-ink/50">Precisa do <Link className="underline" to="/painel/empresa">perfil empresarial</Link> completo.</p></Card>
      ) : data.map((o) => {
        const st = o.expired ? { label: 'Expirada', color: 'gray' } : OPP_STATUS[o.status]
        return (
          <Card key={o.id} className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h2 className="font-display text-lg font-bold">{o.title}</h2><p className="text-sm text-ink/60">{o.category.name} · {o.city} · prazo {formatDate(o.deadline)} · {formatPay(o.payMin, o.payMax)}</p></div>
              <Badge color={st.color}>{st.label}</Badge>
            </div>
            {o.status === 'REJEITADA' && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900"><b>Motivo:</b> {o.rejectionReason}. Edite e reenvie.</p>}
            <div className="flex flex-wrap gap-2">
              {o.status !== 'ENCERRADA' && <Button variant="outline" onClick={() => edit(o)}>Editar</Button>}
              {o.status !== 'ENCERRADA' && <Button variant="ghost" onClick={() => close(o)}>Encerrar</Button>}
              <Button variant="ghost" onClick={() => setViewing(o)}>Interessados ({o._count.interests})</Button>
            </div>
          </Card>
        )
      })}

      <Modal open={!!editing} title={editing?.id ? 'Editar oportunidade' : 'Nova oportunidade'} onClose={() => setEditing(null)}>
        {editing && <OpportunityForm initial={editing} categories={cats.data ?? []} onDone={(reloadList = true) => { setEditing(null); if (reloadList) reload() }} />}
      </Modal>
      <Modal open={!!viewing} title={`Interessados — ${viewing?.title ?? ''}`} onClose={() => setViewing(null)}>
        {viewing && (interests.loading ? <Spinner /> : interests.data?.length ? (
          <ul className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
            {interests.data.map((i) => (
              <li key={i.id} className="rounded-xl border border-brand-900/10 p-3">
                <p className="font-semibold">{i.professional.displayName} <span className="font-normal text-ink/60">· {i.professional.category.name}</span></p>
                {i.message && <p className="mt-1 text-ink/80">“{i.message}”</p>}
                <p className="mt-1 text-xs text-ink/60">{i.professional.contact ? `WhatsApp: ${i.professional.contact.whatsapp}` : 'Contato não divulgado — veja o perfil.'} · <Link className="font-semibold text-brand-700 underline" to={`/profissionais/${i.professional.slug}`} target="_blank">Ver perfil</Link></p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink/60">Ainda não há profissionais interessados.</p>)}
      </Modal>
    </div>
  )
}
