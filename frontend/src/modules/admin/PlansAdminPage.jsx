import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Field, Input, Modal, Spinner, inputClass } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'

const money = (c) => (c == null ? '—' : (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const toCents = (v) => (v === '' || v == null ? null : Math.round(Number(String(v).replace(',', '.')) * 100))
const fromCents = (c) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','))
const LIMITS = [['simulationsPerMonth', 'Simulações por mês (Insights)'], ['studioGenerationsPerMonth', 'Gerações de texto/calendário por mês (Studio)'], ['studioAssets', 'Materiais salvos (Studio)']]

function CapacityLine({ c }) {
  if (!c.limited) return <p className="text-sm"><b>{c.used}</b> contas FREE · <Badge color="gray">sem limite de cadastros</Badge></p>
  return (
    <p className="text-sm">
      <b>{c.used}</b> de <b>{c.max}</b> vagas FREE ocupadas · {c.open ? <Badge color="green">{c.remaining} vaga(s) restante(s)</Badge> : <Badge color="red">Cadastros fechados</Badge>}
    </p>
  )
}

function BillingStatus() {
  const toast = useToast()
  const { data, loading } = useFetch('/billing/status')
  const [testing, setTesting] = useState(false)
  const test = async () => { setTesting(true); try { await api.post('/billing/test-connection'); toast.success('Conexão com o Asaas OK.') } catch (e) { toast.error(errorMessage(e)) } finally { setTesting(false) } }
  if (loading || !data) return null
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Cobrança (Asaas)</h2>
        <Badge color={data.enabled ? 'green' : 'amber'}>{data.enabled ? 'Cobrança ativa' : 'Cobrança desativada'}</Badge>
      </div>
      <ul className="space-y-1.5 text-sm">{data.checks.map((c) => <li key={c.id} className={`flex items-center gap-2 ${c.ok ? 'text-brand-700' : 'text-ink/70'}`}>{c.ok ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4 text-amber-600" />}{c.label}</li>)}</ul>
      <p className="text-xs text-ink/60">URL do webhook no Asaas: <code className="rounded bg-gray-100 px-1">{`https://<domínio-da-api>${data.webhookPath}`}</code>. Passo a passo completo em <code className="rounded bg-gray-100 px-1">docs/ASAAS.md</code>. Os segredos ficam no servidor e nunca são exibidos.</p>
      <Button variant="outline" loading={testing} disabled={!data.ready} onClick={test}>Testar conexão</Button>
    </Card>
  )
}

export default function PlansAdminPage() {
  const toast = useToast()
  const { user } = useAuth()
  const isSuper = user.role === 'SUPERADMIN'
  const { data, loading, error, reload } = useFetch('/plans/admin')
  const [edit, setEdit] = useState(null)
  const [saving, setSaving] = useState(false)

  const open = (p) => setEdit({
    code: p.code, name: p.name, tagline: p.tagline, price: fromCents(p.priceCents), promoPrice: fromCents(p.promoPriceCents), promoMonths: p.promoMonths ?? '', promoNote: p.promoNote ?? '',
    features: p.features.join('\n'), available: p.available, highlighted: p.highlighted, active: p.active, position: p.position,
    limits: Object.fromEntries(LIMITS.map(([k]) => [k, p.limits?.[k] ?? ''])), maxUsers: p.maxUsers ?? '',
  })
  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    const body = {
      name: edit.name, tagline: edit.tagline, priceCents: toCents(edit.price) ?? 0, promoPriceCents: toCents(edit.promoPrice), promoMonths: edit.promoMonths === '' ? null : Number(edit.promoMonths),
      promoNote: edit.promoNote || null, features: edit.features.split('\n').map((s) => s.trim()).filter(Boolean), available: edit.available, highlighted: edit.highlighted, active: edit.active, position: Number(edit.position),
      limits: Object.fromEntries(LIMITS.map(([k]) => [k, edit.limits[k] === '' ? null : Number(edit.limits[k])])),
      // Somente o superadministrador altera o limite de cadastros do FREE (o servidor também exige).
      ...(edit.code === 'FREE' && isSuper ? { maxUsers: edit.maxUsers === '' ? null : Number(edit.maxUsers) } : {}),
    }
    try { await api.patch(`/plans/admin/${edit.code}`, body); toast.success('Plano atualizado.'); setEdit(null); reload() } catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  if (loading) return <Spinner />
  if (error) return <p role="alert" className="text-red-700">{error}</p>
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Planos e cobrança</h1>
      <BillingStatus />
      <div className="grid gap-4 md:grid-cols-2">
        {data.plans.map((p) => (
          <Card key={p.code} className="space-y-2">
            <div className="flex items-center justify-between"><h2 className="font-display text-xl font-extrabold">{p.name} <span className="text-sm font-normal text-ink/50">({p.code})</span></h2>
              <span className="flex gap-1">{!p.active && <Badge color="gray">Inativo</Badge>}<Badge color={p.available ? 'green' : 'amber'}>{p.available ? 'Disponível' : 'Em breve'}</Badge></span></div>
            <p className="text-sm text-ink/60">{p.tagline}</p>
            <p className="text-sm"><b>{money(p.priceCents)}</b>/mês{p.promoPriceCents != null && <> · promoção <b>{money(p.promoPriceCents)}</b> por {p.promoMonths} meses</>}</p>
            {p.code === 'FREE' && <CapacityLine c={data.freeCapacity} />}
            <p className="text-xs text-ink/60">Assinantes ativos: <b>{p.activeSubscribers}</b> · Limites: {LIMITS.map(([k, l]) => `${l.split(' (')[0]} ${p.limits?.[k] ?? '∞'}`).join(' · ')}</p>
            <Button variant="outline" onClick={() => open(p)}>Editar plano</Button>
          </Card>
        ))}
      </div>
      <p className="text-xs text-ink/60">Limites vazios significam “ilimitado”. As alterações ficam registradas na auditoria e aparecem imediatamente na página pública de planos.</p>

      <Modal open={!!edit} title={`Editar plano ${edit?.code ?? ''}`} onClose={() => setEdit(null)}>
        {edit && (
          <form onSubmit={save} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3"><Input id="pl-name" label="Nome" required value={edit.name} onChange={set('name')} /><Input id="pl-pos" label="Ordem" type="number" value={edit.position} onChange={set('position')} /></div>
            <Input id="pl-tag" label="Chamada" required value={edit.tagline} onChange={set('tagline')} />
            <div className="grid grid-cols-3 gap-3">
              <Input id="pl-price" label="Preço mensal (R$)" required disabled={edit.code === 'FREE'} value={edit.price} onChange={set('price')} />
              <Input id="pl-promo" label="Promoção (R$)" value={edit.promoPrice} onChange={set('promoPrice')} />
              <Input id="pl-pm" label="Meses de promoção" type="number" min={1} value={edit.promoMonths} onChange={set('promoMonths')} />
            </div>
            <Input id="pl-note" label="Condições da promoção (texto público)" value={edit.promoNote} onChange={set('promoNote')} />
            <Field label="Benefícios (um por linha)" htmlFor="pl-feat"><textarea id="pl-feat" rows={5} required className={inputClass} value={edit.features} onChange={set('features')} /></Field>
            {edit.code === 'FREE' && (
              <fieldset className="space-y-2 rounded-xl border border-sun-400 bg-amber-50/50 p-3"><legend className="px-1 text-sm font-semibold">Limite de cadastros gratuitos</legend>
                <Input id="pl-maxusers" label="Máximo de pessoas com conta FREE (vazio = sem limite)" type="number" min={0} disabled={!isSuper} value={edit.maxUsers} onChange={set('maxUsers')} />
                <p className="text-xs text-ink/70">Hoje há <b>{data.freeCapacity.used}</b> contas FREE (profissionais, empresas e clientes sem assinatura paga; contas suspensas não contam). Ao atingir o limite, novos cadastros são bloqueados; quem já tem conta continua entrando. {edit.maxUsers !== '' && Number(edit.maxUsers) < data.freeCapacity.used && <b className="text-red-700">O limite informado é menor que o total atual: os cadastros ficarão fechados.</b>}</p>
                {!isSuper && <p className="text-xs font-semibold text-amber-900">Somente o superadministrador pode alterar este limite.</p>}
              </fieldset>
            )}
            <fieldset className="space-y-2 rounded-xl border border-brand-900/10 p-3"><legend className="px-1 text-sm font-semibold">Limites de uso (vazio = ilimitado)</legend>
              {LIMITS.map(([k, l]) => <Input key={k} id={`lim-${k}`} label={l} type="number" min={0} value={edit.limits[k]} onChange={(e) => setEdit({ ...edit, limits: { ...edit.limits, [k]: e.target.value } })} />)}
            </fieldset>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.available} disabled={edit.code === 'FREE'} onChange={set('available')} />Disponível para contratação</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.highlighted} onChange={set('highlighted')} />Destacado</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.active} disabled={edit.code === 'FREE'} onChange={set('active')} />Ativo na vitrine</label>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button type="submit" loading={saving}>Salvar</Button></div>
          </form>
        )}
      </Modal>
    </div>
  )
}
