import { CreditCard, Info } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'
import { formatDateTime } from '../../utils/roles.js'

const money = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const STATUS = { ATIVA: ['Ativa', 'green'], PENDENTE: ['Aguardando pagamento', 'amber'], CANCELADA: ['Cancelada', 'gray'], EXPIRADA: ['Suspensa por atraso', 'red'] }
const PAY = { PAGO: ['Pago', 'green'], PENDENTE: ['Pendente', 'amber'], FALHOU: ['Atrasado/falhou', 'red'], REEMBOLSADO: ['Reembolsado', 'gray'] }

function UsageBar({ u }) {
  const pct = u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0
  return (
    <li className="space-y-1">
      <div className="flex justify-between text-sm"><span>{u.label}</span><b>{u.used}{u.limit != null ? ` / ${u.limit}` : ''}{u.limit == null && <span className="font-normal text-ink/50"> · ilimitado</span>}</b></div>
      {u.limit != null && <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-sun-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} /></div>}
    </li>
  )
}

export default function MySubscriptionPage() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/subscriptions/me')
  const [choosing, setChoosing] = useState(null)
  const [form, setForm] = useState({ cpfCnpj: '', billingType: 'UNDEFINED' })
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner />
  if (error) return <p role="alert" className="text-red-700">{error}</p>
  if (data.staff) return <Card><EmptyState title="Contas administrativas não possuem assinatura">Use o painel de planos e assinaturas para administrar.</EmptyState></Card>

  const sub = data.subscription
  const go = (url) => { if (url && /^https:\/\//.test(url)) window.location.assign(url); else toast.success('Cobrança gerada. Você receberá o link de pagamento por e-mail.') }

  const choose = async (plan) => {
    if (plan.code === 'FREE') {
      try { await api.post('/subscriptions/me/change', { planCode: 'FREE' }); toast.success('Você voltou ao plano FREE.'); reload() } catch (e) { toast.error(errorMessage(e)) }
      return
    }
    setForm({ cpfCnpj: '', billingType: 'UNDEFINED' }); setChoosing(plan)
  }
  const checkout = async (e) => {
    e.preventDefault(); setBusy(true)
    try { const { data: r } = await api.post('/subscriptions/me/change', { planCode: choosing.code, cpfCnpj: form.cpfCnpj, billingType: form.billingType }); setChoosing(null); go(r.checkoutUrl) }
    catch (err) { toast.error(errorMessage(err)) } finally { setBusy(false) }
  }
  const cancel = async () => {
    try { await api.post('/subscriptions/me/cancel'); toast.success('Assinatura cancelada.'); reload() } catch (e) { toast.error(errorMessage(e)) }
  }
  const openPending = async () => { try { const { data: r } = await api.get('/subscriptions/me/pending-link'); go(r.checkoutUrl) } catch (e) { toast.error(errorMessage(e)) } }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Minha assinatura</h1>

      <Card className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-xs text-ink/60">Plano atual</p><p className="font-display text-2xl font-extrabold text-brand-700">{data.plan?.name ?? 'FREE'}</p></div>
          {sub ? <Badge color={STATUS[sub.status][1]}>{STATUS[sub.status][0]}</Badge> : <Badge color="green">Gratuito</Badge>}
        </div>
        {sub && <p className="text-sm text-ink/70">{sub.source === 'MANUAL' ? 'Concedido pela administração' : 'Assinatura mensal'}{sub.endsAt && ` · válido até ${new Date(sub.endsAt).toLocaleDateString('pt-BR')}`}{sub.priceCents > 0 && ` · ${money(sub.priceCents)}/mês`}</p>}
        {data.pending && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Você iniciou a contratação do plano {data.pending.planCode} e ainda não há pagamento confirmado. Enquanto isso, você continua no plano atual.
            <div className="mt-2 flex gap-2"><Button variant="accent" onClick={openPending}>Abrir pagamento</Button><Button variant="ghost" onClick={cancel}>Cancelar contratação</Button></div>
          </div>
        )}
        {sub?.status === 'ATIVA' && <Button variant="outline" onClick={cancel}>Cancelar assinatura</Button>}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-bold">Uso neste mês</h2>
        <ul className="space-y-3">{data.usage.map((u) => <UsageBar key={u.key} u={u} />)}</ul>
        <p className="mt-3 text-xs text-ink/60">Os limites são definidos por plano e renovados todo mês.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {data.plans.map((p) => {
          const current = (data.plan?.code ?? 'FREE') === p.code
          const paid = p.priceCents > 0
          return (
            <Card key={p.code} className={`flex flex-col ${current ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="flex items-center justify-between"><h3 className="font-display text-xl font-extrabold">{p.name}</h3>{current && <Badge color="green">Seu plano</Badge>}</div>
              <p className="text-sm text-ink/60">{p.tagline}</p>
              <p className="my-3 font-display text-2xl font-extrabold text-brand-700">{paid ? (p.promoPriceCents != null ? `${money(p.promoPriceCents)}/mês` : `${money(p.priceCents)}/mês`) : 'Grátis'}</p>
              {paid && p.promoPriceCents != null && <p className="-mt-2 mb-3 text-xs text-ink/60">nos {p.promoMonths} primeiros meses (primeira contratação), depois {money(p.priceCents)}/mês</p>}
              <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <div className="mt-auto">
                {current ? <Button variant="outline" disabled className="w-full">Plano atual</Button>
                  : paid && !(p.available && data.billingEnabled) ? <Button variant="outline" disabled className="w-full">Disponível em breve</Button>
                  : <Button className="w-full" onClick={() => choose(p)}>{paid ? `Contratar ${p.name}` : `Voltar ao ${p.name}`}</Button>}
                {paid && !data.billingEnabled && <p className="mt-2 text-xs text-ink/60">A cobrança ainda não foi ativada. Nenhum pagamento é realizado.</p>}
              </div>
            </Card>
          )
        })}
      </div>

      <Card>
        <h2 className="mb-2 font-display text-lg font-bold">Histórico de pagamentos</h2>
        {data.payments.length === 0 ? <p className="text-sm text-ink/60">Nenhum pagamento até o momento.</p> : (
          <table className="w-full text-left text-sm"><thead className="border-b border-brand-900/10 text-xs uppercase text-ink/50"><tr><th className="py-2">Data</th><th>Valor</th><th>Forma</th><th>Situação</th></tr></thead>
            <tbody>{data.payments.map((p) => <tr key={p.id} className="border-b border-brand-900/5"><td className="py-2">{formatDateTime(p.paidAt ?? p.createdAt)}</td><td>{money(p.amountCents)}</td><td>{p.method ?? '—'}</td><td><Badge color={PAY[p.status][1]}>{PAY[p.status][0]}</Badge></td></tr>)}</tbody></table>
        )}
      </Card>
      <p className="flex items-start gap-2 text-xs text-ink/60"><Info className="mt-0.5 size-3.5 shrink-0" />Os pagamentos serão processados pelo Asaas, em página segura. Não guardamos dados de cartão. Veja a <Link className="underline" to="/privacidade">Política de Privacidade</Link>.</p>

      <Modal open={!!choosing} title={`Contratar ${choosing?.name ?? ''}`} onClose={() => setChoosing(null)}>
        <form onSubmit={checkout} className="space-y-3">
          <p className="text-sm text-ink/70">Para emitir a cobrança, o Asaas precisa do CPF ou CNPJ do pagador. Você será levado a uma página segura para concluir o pagamento.</p>
          <Input id="cpf" label="CPF ou CNPJ" required inputMode="numeric" value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} />
          <Field label="Forma de pagamento" htmlFor="bt"><select id="bt" className={inputClass} value={form.billingType} onChange={(e) => setForm({ ...form, billingType: e.target.value })}>
            <option value="UNDEFINED">Escolher na próxima tela</option><option value="PIX">PIX</option><option value="BOLETO">Boleto</option><option value="CREDIT_CARD">Cartão de crédito</option></select></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setChoosing(null)}>Cancelar</Button><Button type="submit" loading={busy}><CreditCard className="size-4" />Ir para o pagamento</Button></div>
        </form>
      </Modal>
    </div>
  )
}
