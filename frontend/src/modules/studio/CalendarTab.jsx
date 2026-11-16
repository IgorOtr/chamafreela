import { Download, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, Field, Input, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { api, errorMessage } from '../../services/api.js'
import BriefForm, { clean } from './BriefForm.jsx'
import { download } from './pieceSvg.js'

const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d.toISOString().slice(0, 10) }
const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export default function CalendarTab({ options, brief, setBrief, opened }) {
  const toast = useToast()
  const [cfg, setCfg] = useState({ weeks: 4, postsPerWeek: 3, startDate: nextMonday() })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (opened?.data?.items) { setItems(opened.data.items); if (opened.data.cfg) setCfg(opened.data.cfg) } }, [opened])

  const generate = async () => {
    setLoading(true)
    try { const { data } = await api.post('/studio/calendar/generate', { brief: clean(brief), weeks: Number(cfg.weeks), postsPerWeek: Number(cfg.postsPerWeek), startDate: cfg.startDate }); setItems(data.items) }
    catch (e) { toast.error(errorMessage(e)) } finally { setLoading(false) }
  }
  const patch = (i, p) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const csv = () => {
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`
    const rows = [['Data', 'Dia', 'Tipo', 'Rascunho', 'Publicado'], ...items.map((x) => [x.date, x.weekday, x.typeLabel, x.draft, x.done ? 'sim' : 'não'])]
    download(new Blob(['﻿' + rows.map((r) => r.map(q).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }), 'calendario-de-conteudo.csv')
  }
  const save = async () => {
    try { await api.post('/studio/assets', { type: 'CALENDARIO', title: `Calendário ${fmt(items[0].date)} a ${fmt(items.at(-1).date)} (${items.length} posts)`, data: { items, cfg } }); toast.success('Calendário salvo em "Meus materiais".') } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <BriefForm brief={brief} setBrief={setBrief} tones={options.tones} showPromo />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Semanas" htmlFor="c-weeks"><select id="c-weeks" className={inputClass} value={cfg.weeks} onChange={(e) => setCfg({ ...cfg, weeks: e.target.value })}>{[1, 2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Field label="Posts por semana" htmlFor="c-ppw"><select id="c-ppw" className={inputClass} value={cfg.postsPerWeek} onChange={(e) => setCfg({ ...cfg, postsPerWeek: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Input id="c-start" label="Começar em" type="date" value={cfg.startDate} onChange={(e) => setCfg({ ...cfg, startDate: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center gap-3"><Button loading={loading} onClick={generate}>{items.length ? 'Gerar novo calendário' : 'Gerar calendário'}</Button><p className="text-xs text-ink/60">O calendário é um guia: você publica manualmente, quando e como quiser. Nada é postado automaticamente.</p></div>
      </Card>
      {items.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={csv}><Download className="size-4" />Exportar CSV</Button><Button variant="ghost" onClick={save}><Save className="size-4" />Salvar</Button></div>
          {items.map((x, i) => (
            <Card key={`${x.date}-${i}`} className={`space-y-2 ${x.done ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display font-bold">{fmt(x.date)} · {x.weekday} <span className="ml-2 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-900">{x.typeLabel}</span></p>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={x.done} onChange={(e) => patch(i, { done: e.target.checked })} />Já publiquei</label>
              </div>
              <textarea aria-label={`Rascunho de ${fmt(x.date)}`} rows={Math.min(8, x.draft.split('\n').length + 1)} className={inputClass} value={x.draft} onChange={(e) => patch(i, { draft: e.target.value })} />
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
