import { Field, Input, inputClass } from '../../components/ui.jsx'

export default function BriefForm({ brief, setBrief, tones, showPromo = false }) {
  const set = (k) => (e) => setBrief({ ...brief, [k]: e.target.value })
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input id="b-name" label="Nome do negócio" required value={brief.businessName} onChange={set('businessName')} />
        <Input id="b-service" label="Serviço principal" required placeholder="Ex.: instalação elétrica" value={brief.service} onChange={set('service')} />
        <Input id="b-city" label="Cidade" value={brief.city} onChange={set('city')} />
        <Field label="Tom de voz" htmlFor="b-tone"><select id="b-tone" className={inputClass} value={brief.tone} onChange={set('tone')}>{Object.entries(tones).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      </div>
      <Input id="b-diff" label="Seu diferencial (opcional)" placeholder="Ex.: atendimento no mesmo dia" value={brief.differentiator} onChange={set('differentiator')} />
      <Input id="b-cta" label="Chamada para ação (opcional)" placeholder="Ex.: Peça seu orçamento pelo WhatsApp." value={brief.cta} onChange={set('cta')} />
      <Input id="b-detail" label="Detalhe do serviço (opcional, usado nas descrições)" value={brief.serviceDetail} onChange={set('serviceDetail')} />
      {showPromo && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="b-offer" label="Oferta (só se for real)" placeholder="Ex.: 10% de desconto na primeira visita" value={brief.offer} onChange={set('offer')} />
          <Input id="b-deadline" label="Prazo da oferta (opcional)" placeholder="Ex.: até sexta-feira" value={brief.deadline} onChange={set('deadline')} />
        </div>
      )}
    </div>
  )
}

export const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))
