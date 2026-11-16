import { Download, FileText, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Field, Input, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { api, errorMessage } from '../../services/api.js'
import { PIECES, buildPieceSvg, download, exportPdf, svgToPngBlob, toDataUri } from './pieceSvg.js'

export default function PiecesTab({ options, brand, brief, opened, goBrand }) {
  const toast = useToast()
  const [type, setType] = useState('CARTAO')
  const [layout, setLayout] = useState('bloco')
  const [f, setF] = useState({ headline: brief.businessName, body: [brief.service, brief.city && `em ${brief.city}`].filter(Boolean).join(' '), contact: brand?.contactLine ?? '' })
  const [busy, setBusy] = useState('')

  useEffect(() => { if (opened?.data) { setType(opened.type); setLayout(opened.data.layout ?? 'bloco'); setF({ headline: opened.data.headline ?? '', body: opened.data.body ?? '', contact: opened.data.contact ?? '' }) } }, [opened])

  const svg = useMemo(() => (brand ? buildPieceSvg({ type, layout, ...f }, brand, options.fonts) : ''), [type, layout, f, brand, options.fonts])
  if (!brand) return <Card className="text-center text-sm"><p className="mb-3">Crie primeiro o kit da sua marca (cores, fonte e logotipo) para montar as peças.</p><Button onClick={goBrand}>Ir para Identidade</Button></Card>

  const { w, h } = PIECES[type]
  const base = `${brand.businessName}-${type.toLowerCase()}`.replace(/\s+/g, '-').toLowerCase()
  const run = async (name, fn) => { setBusy(name); try { await fn() } catch (e) { toast.error(e.message || 'Falha na exportação') } finally { setBusy('') } }
  const save = async () => {
    try { await api.post('/studio/assets', { type, title: `${PIECES[type].label} — ${f.headline.slice(0, 40)}`, content: f.body, data: { layout, ...f } }); toast.success('Salvo em "Meus materiais".') } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo de peça" htmlFor="p-type"><select id="p-type" className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(PIECES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label="Estilo" htmlFor="p-layout"><select id="p-layout" className={inputClass} value={layout} onChange={(e) => setLayout(e.target.value)}><option value="bloco">Fundo na cor principal</option><option value="claro">Fundo claro</option></select></Field>
        </div>
        <Input id="p-head" label="Título" maxLength={80} value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} />
        <Field label="Texto" htmlFor="p-body"><textarea id="p-body" rows={4} maxLength={240} className={inputClass} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <Input id="p-contact" label="Contato (opcional)" maxLength={120} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
        <p className="text-xs text-ink/60">Dica: cole aqui um texto gerado na aba “Textos”. Só exponha contatos que você autoriza divulgar.</p>
        <div className="flex flex-wrap gap-2">
          <Button loading={busy === 'png'} onClick={() => run('png', async () => download(await svgToPngBlob(svg, w, h), `${base}.png`))}><Download className="size-4" />Baixar PNG</Button>
          <Button variant="outline" loading={busy === 'pdf'} onClick={() => run('pdf', () => exportPdf(svg, type, `${base}.pdf`))}><FileText className="size-4" />Baixar PDF</Button>
          <Button variant="ghost" onClick={save}><Save className="size-4" />Salvar</Button>
        </div>
      </Card>
      <Card>
        <p className="mb-2 text-sm font-semibold">Pré-visualização ({w}×{h}px)</p>
        <img src={toDataUri(svg)} alt="Pré-visualização da peça" className="mx-auto max-h-[560px] w-auto max-w-full rounded-xl border border-brand-900/10" />
      </Card>
    </div>
  )
}
