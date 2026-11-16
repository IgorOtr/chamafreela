import { useState } from 'react'
import { Button, Card, Field, Input, inputClass } from '../../components/ui.jsx'

const blank = {
  name: '', city: 'Volta Redonda', activity: '',
  ticket: '', expectedClients: '', servicesPerClient: '1', workDaysPerMonth: '22', servicesPerDay: '',
  fixedCostsMonthly: '', variableCostPerService: '', travelCostPerService: '', taxRatePercent: '', fixedTaxMonthly: '',
  equipmentInvestment: '', initialCapital: '',
  demandVariationPercent: '', priceVariationPercent: '', costVariationPercent: '', sensitivityPercent: '', horizonMonths: '', iterations: '10000', seed: '',
}

export function fromPrefill(p) {
  if (!p) return blank
  const s = (v) => (v == null ? '' : String(v))
  return {
    ...blank, name: p.name ? `${p.name} (ajuste)` : '', city: s(p.city), activity: s(p.activity),
    ...Object.fromEntries(Object.keys(p.inputs).map((k) => [k, s(p.inputs[k])])), iterations: s(p.iterations ?? 10000),
    ...Object.fromEntries(Object.entries(p.userAssumptions ?? {}).map(([k, v]) => [k, s(v)])),
  }
}

const n = (v) => (v === '' ? undefined : Number(v))

export function toPayload(f) {
  const inputs = {
    ticket: n(f.ticket), expectedClients: n(f.expectedClients), servicesPerClient: n(f.servicesPerClient) ?? 1, workDaysPerMonth: n(f.workDaysPerMonth), servicesPerDay: n(f.servicesPerDay),
    fixedCostsMonthly: n(f.fixedCostsMonthly) ?? 0, variableCostPerService: n(f.variableCostPerService) ?? 0, travelCostPerService: n(f.travelCostPerService) ?? 0,
    taxRatePercent: n(f.taxRatePercent) ?? 0, fixedTaxMonthly: n(f.fixedTaxMonthly) ?? 0, equipmentInvestment: n(f.equipmentInvestment) ?? 0, initialCapital: n(f.initialCapital) ?? 0,
  }
  const assumptions = Object.fromEntries(['demandVariationPercent', 'priceVariationPercent', 'costVariationPercent', 'sensitivityPercent', 'horizonMonths'].filter((k) => f[k] !== '').map((k) => [k, Number(f[k])]))
  return { name: f.name, city: f.city || undefined, activity: f.activity || undefined, inputs, assumptions: Object.keys(assumptions).length ? assumptions : undefined, iterations: Number(f.iterations) || 10000, seed: n(f.seed) }
}

export default function SimulationForm({ initial, defaults, onSubmit, loading }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const num = (id, label, props = {}) => <Input id={id} label={label} type="number" step="any" min={0} value={f[id]} onChange={set(id)} {...props} />
  const d = defaults?.assumptions ?? {}

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(toPayload(f)) }} className="space-y-4">
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">1. Atividade</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input id="name" label="Nome do cenário" required value={f.name} onChange={set('name')} />
          <Input id="activity" label="Atividade econômica" placeholder="Ex.: eletricista residencial" value={f.activity} onChange={set('activity')} />
          <Input id="city" label="Cidade / região" value={f.city} onChange={set('city')} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">2. Receita e demanda <span className="text-sm font-normal text-ink/50">(por mês)</span></h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {num('ticket', 'Ticket médio por serviço (R$)', { required: true, min: 0.01 })}
          {num('expectedClients', 'Clientes estimados por mês', { required: true })}
          {num('servicesPerClient', 'Serviços por cliente no mês', { min: 0.1 })}
        </div>
        <p className="text-xs text-ink/60">A demanda é uma <b>estimativa sua</b>. O modelo sorteia variações em torno dela.</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">3. Capacidade de atendimento</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {num('workDaysPerMonth', 'Dias trabalhados por mês', { required: true, min: 1, max: 31 })}
          {num('servicesPerDay', 'Serviços que você consegue fazer por dia', { required: true, min: 0.1 })}
        </div>
        <p className="text-xs text-ink/60">A receita nunca ultrapassa essa capacidade, mesmo que a demanda sorteada seja maior.</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">4. Custos, impostos e investimento</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {num('fixedCostsMonthly', 'Custos fixos mensais (R$)')}
          {num('variableCostPerService', 'Custo variável por serviço (R$)')}
          {num('travelCostPerService', 'Deslocamento por serviço (R$)')}
          {num('taxRatePercent', 'Impostos sobre a receita (%)', { max: 100 })}
          {num('fixedTaxMonthly', 'Encargos fixos mensais (R$)')}
          {num('equipmentInvestment', 'Investimento em equipamentos (R$)')}
          {num('initialCapital', 'Capital inicial disponível (R$)')}
        </div>
        <p className="text-xs text-ink/60">Informe impostos só se souber a alíquota correta (confirme com seu contador). Sem isso, o lucro pode ficar superestimado.</p>
      </Card>

      <details className="rounded-2xl border border-brand-900/10 bg-white p-5">
        <summary className="cursor-pointer font-display text-lg font-bold">5. Premissas avançadas (opcional)</summary>
        <p className="mt-2 text-sm text-ink/60">Deixe em branco para usar o padrão do modelo (que não tem base estatística local — ajuste conforme sua experiência). Cada valor que você alterar aparece depois como “informado por você”.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {num('demandVariationPercent', `Variação da demanda (%) — padrão ${d.demandVariationPercent ?? 30}`, { max: 200, placeholder: String(d.demandVariationPercent ?? 30) })}
          {num('priceVariationPercent', `Variação do preço (%) — padrão ${d.priceVariationPercent ?? 10}`, { max: 100, placeholder: String(d.priceVariationPercent ?? 10) })}
          {num('costVariationPercent', `Variação dos custos (%) — padrão ${d.costVariationPercent ?? 10}`, { max: 100, placeholder: String(d.costVariationPercent ?? 10) })}
          {num('sensitivityPercent', `Choque da sensibilidade (%) — padrão ${d.sensitivityPercent ?? 10}`, { min: 1, max: 50, placeholder: String(d.sensitivityPercent ?? 10) })}
          {num('horizonMonths', `Horizonte do retorno (meses) — padrão ${d.horizonMonths ?? 12}`, { min: 1, max: 60, placeholder: String(d.horizonMonths ?? 12) })}
          <Field label="Nº de simulações" htmlFor="iterations"><select id="iterations" className={inputClass} value={f.iterations} onChange={set('iterations')}>{[1000, 5000, 10000, 20000, 50000].map((v) => <option key={v} value={v}>{v.toLocaleString('pt-BR')}</option>)}</select></Field>
          {num('seed', 'Semente (para reproduzir um resultado)', { placeholder: 'aleatória', step: 1 })}
        </div>
      </details>

      <div className="flex justify-end"><Button type="submit" loading={loading} className="px-8">Simular</Button></div>
    </form>
  )
}
