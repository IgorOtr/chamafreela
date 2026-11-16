import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Card, Field, Input, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { api, errorMessage } from '../../services/api.js'
import { toDataUri } from './pieceSvg.js'

const COLOR_LABELS = { primary: 'Principal', secondary: 'Secundária', accent: 'Destaque', text: 'Texto', background: 'Fundo' }

export default function BrandTab({ options, brand, setBrand, brief }) {
  const toast = useToast()
  const initial = brand ?? {
    businessName: brief.businessName, tagline: '', segment: 'geral', city: brief.city, mainService: brief.service, differentiator: brief.differentiator, contactLine: '',
    colors: options.palettes[0].colors, fontKey: 'moderna', logoConfig: { shape: 'circulo', initials: '', wordmark: true },
  }
  const [f, setF] = useState({ ...initial, logoConfig: { initials: '', ...initial.logoConfig } })
  const [preview, setPreview] = useState({ svg: '', contrast: [] })
  const [saving, setSaving] = useState(false)
  const timer = useRef()

  useEffect(() => {
    if (!f.businessName || f.businessName.length < 2) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      api.post('/studio/logo/preview', { businessName: f.businessName, colors: f.colors, fontKey: f.fontKey, logo: { shape: f.logoConfig.shape, wordmark: f.logoConfig.wordmark, initials: f.logoConfig.initials || undefined } })
        .then(({ data }) => setPreview(data)).catch(() => {})
    }, 350)
    return () => clearTimeout(timer.current)
  }, [f.businessName, f.colors, f.fontKey, f.logoConfig])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setColor = (k) => (e) => setF({ ...f, colors: { ...f.colors, [k]: e.target.value } })
  const setLogo = (patch) => setF({ ...f, logoConfig: { ...f.logoConfig, ...patch } })
  const applyPalette = (id) => setF({ ...f, segment: id, colors: options.palettes.find((p) => p.id === id).colors })

  const save = async () => {
    setSaving(true)
    const body = {
      businessName: f.businessName, tagline: f.tagline || undefined, segment: f.segment, city: f.city || undefined, mainService: f.mainService || undefined,
      differentiator: f.differentiator || undefined, contactLine: f.contactLine || undefined, colors: f.colors, fontKey: f.fontKey,
      logo: { shape: f.logoConfig.shape, wordmark: f.logoConfig.wordmark, initials: f.logoConfig.initials || undefined },
    }
    try { const { data } = await api.put('/studio/brand', body); setBrand(data); toast.success('Kit da marca salvo. Ele será usado nas peças.') } catch (e) { toast.error(errorMessage(e)) } finally { setSaving(false) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold">Negócio</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input id="k-name" label="Nome do negócio" required value={f.businessName} onChange={set('businessName')} />
            <Input id="k-tag" label="Slogan (opcional)" value={f.tagline} onChange={set('tagline')} />
            <Input id="k-contact" label="Contato nas peças (você escolhe o que expor)" placeholder="Ex.: (24) 99999-0000 · @seuperfil" value={f.contactLine} onChange={set('contactLine')} />
            <Input id="k-city" label="Cidade" value={f.city} onChange={set('city')} />
          </div>
          <p className="text-xs text-ink/60">Dados de contato só aparecem nas peças se você os preencher aqui.</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold">Cores</h2>
          <Field label="Paleta sugerida por segmento" htmlFor="k-seg"><select id="k-seg" className={inputClass} value={f.segment} onChange={(e) => applyPalette(e.target.value)}>{options.palettes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(COLOR_LABELS).map(([k, l]) => (
              <label key={k} className="text-center text-xs font-semibold">{l}
                <input type="color" aria-label={`Cor ${l}`} className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-brand-900/15" value={f.colors[k]} onChange={setColor(k)} />
              </label>
            ))}
          </div>
          <ul className="space-y-1 text-xs">
            {preview.contrast.map((c) => <li key={c.id} className={`flex items-center gap-1 ${c.ok ? 'text-brand-700' : 'text-red-700'}`}>{c.ok ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}{c.label}: {String(c.ratio).replace('.', ',')}:1 {c.ok ? '(legível)' : '(baixo contraste — ajuste as cores)'}</li>)}
          </ul>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold">Logotipo e fonte</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Forma" htmlFor="k-shape"><select id="k-shape" className={inputClass} value={f.logoConfig.shape} onChange={(e) => setLogo({ shape: e.target.value })}>{options.shapes.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></Field>
            <Input id="k-init" label="Iniciais (até 2)" maxLength={2} placeholder="automático" value={f.logoConfig.initials} onChange={(e) => setLogo({ initials: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() })} />
            <Field label="Fonte" htmlFor="k-font"><select id="k-font" className={inputClass} value={f.fontKey} onChange={set('fontKey')}>{Object.entries(options.fonts).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.logoConfig.wordmark} onChange={(e) => setLogo({ wordmark: e.target.checked })} />Mostrar o nome ao lado do símbolo</label>
        </Card>
      </div>
      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <p className="mb-2 text-sm font-semibold">Pré-visualização</p>
          <div className="grid min-h-40 place-items-center rounded-xl p-4" style={{ background: f.colors.background, border: `2px solid ${f.colors.secondary}` }}>
            {preview.svg ? <img src={toDataUri(preview.svg)} alt={`Logotipo de ${f.businessName}`} className="max-h-32 max-w-full" /> : <p className="text-sm text-ink/50">Informe o nome do negócio.</p>}
          </div>
          <p className="mt-2 text-xs text-ink/60">Logotipo simples gerado a partir de forma e iniciais. Não substitui o trabalho de um designer.</p>
        </Card>
        <Button loading={saving} onClick={save} className="w-full" disabled={!f.businessName}>Salvar kit da marca</Button>
      </div>
    </div>
  )
}
