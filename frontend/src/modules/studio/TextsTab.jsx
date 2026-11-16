import { Copy, Download, RefreshCw, Save } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Field, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { api, errorMessage } from '../../services/api.js'
import BriefForm, { clean } from './BriefForm.jsx'
import { download } from './pieceSvg.js'

export default function TextsTab({ options, brief, setBrief }) {
  const toast = useToast()
  const [type, setType] = useState('LEGENDA')
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try { const { data } = await api.post('/studio/generate', { type, brief: clean(brief) }); setVariants(data.variants) }
    catch (e) { toast.error(errorMessage(e)) } finally { setLoading(false) }
  }
  const edit = (i, text) => setVariants(variants.map((v, j) => (j === i ? { ...v, text } : v)))
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast.success('Texto copiado.') } catch { toast.error('Não foi possível copiar. Selecione e copie manualmente.') } }
  const save = async (v) => {
    try { await api.post('/studio/assets', { type, title: `${options.types[type]} — ${v.title}`, content: v.text }); toast.success('Salvo em "Meus materiais".') } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <Field label="O que você quer criar?" htmlFor="t-type"><select id="t-type" className={inputClass} value={type} onChange={(e) => { setType(e.target.value); setVariants([]) }}>{Object.entries(options.types).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <BriefForm brief={brief} setBrief={setBrief} tones={options.tones} showPromo={type === 'PROMOCAO'} />
        <div className="flex flex-wrap items-center gap-3">
          <Button loading={loading} onClick={generate}>{variants.length ? <><RefreshCw className="size-4" />Gerar novas variações</> : 'Gerar textos'}</Button>
          <p className="text-xs text-ink/60">{options.notice}</p>
        </div>
      </Card>
      {variants.map((v, i) => (
        <Card key={`${v.title}-${i}`} className="space-y-2">
          <p className="font-display font-bold">{v.title}</p>
          <textarea aria-label={v.title} rows={Math.min(14, v.text.split('\n').length + 2)} className={inputClass} value={v.text} onChange={(e) => edit(i, e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => copy(v.text)}><Copy className="size-4" />Copiar</Button>
            <Button variant="outline" onClick={() => download(new Blob([v.text], { type: 'text/plain;charset=utf-8' }), `${type.toLowerCase()}-${i + 1}.txt`)}><Download className="size-4" />Baixar .txt</Button>
            <Button variant="ghost" onClick={() => save(v)}><Save className="size-4" />Salvar</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
