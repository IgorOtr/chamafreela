import { useEffect, useState } from 'react'
import { Spinner } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { api } from '../../services/api.js'
import BrandTab from './BrandTab.jsx'
import CalendarTab from './CalendarTab.jsx'
import PiecesTab from './PiecesTab.jsx'
import SavedTab from './SavedTab.jsx'
import TextsTab from './TextsTab.jsx'

const TABS = [['texts', 'Textos'], ['brand', 'Identidade'], ['pieces', 'Peças'], ['calendar', 'Calendário'], ['saved', 'Meus materiais']]
const emptyBrief = { businessName: '', service: '', city: 'Volta Redonda', differentiator: '', tone: 'PROFISSIONAL', cta: '', offer: '', deadline: '', serviceDetail: '' }

export default function StudioPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('texts')
  const [options, setOptions] = useState(null)
  const [brand, setBrand] = useState(null)
  const [brief, setBrief] = useState(emptyBrief)
  const [opened, setOpened] = useState(null)

  useEffect(() => {
    (async () => {
      const opts = (await api.get('/studio/options')).data
      const kit = await api.get('/studio/brand').then((r) => r.data).catch(() => null)
      let prefill = {}
      if (kit) prefill = { businessName: kit.businessName, service: kit.mainService ?? '', city: kit.city ?? '', differentiator: kit.differentiator ?? '' }
      else if (user.role === 'PROFISSIONAL') {
        const p = await api.get('/professionals/me').then((r) => r.data).catch(() => null)
        if (p) prefill = { businessName: p.displayName, service: p.services?.[0]?.name ?? '', city: p.city ?? '', serviceDetail: p.services?.[0]?.description ?? '' }
      } else {
        const c = await api.get('/companies/me').then((r) => r.data).catch(() => null)
        if (c) prefill = { businessName: c.tradeName, city: c.city }
      }
      setBrand(kit); setBrief((b) => ({ ...b, ...Object.fromEntries(Object.entries(prefill).filter(([, v]) => v)) })); setOptions(opts)
    })()
  }, [user.role])

  if (!options) return <Spinner />
  const open = (a) => { setOpened(a); setTab(a.type === 'CALENDARIO' ? 'calendar' : 'pieces') }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold">CHAMALÁ Studio</h1>
        <p className="text-sm text-ink/60">Divulgue seu trabalho: textos, identidade visual, peças e calendário de conteúdo. Nada é publicado por nós — você revisa e posta.</p>
      </div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-brand-700 text-white' : 'bg-white text-brand-900 hover:bg-brand-50 border border-brand-900/10'}`}>{l}</button>)}
      </div>
      {tab === 'texts' && <TextsTab options={options} brief={brief} setBrief={setBrief} />}
      {tab === 'brand' && <BrandTab options={options} brand={brand} setBrand={setBrand} brief={brief} />}
      {tab === 'pieces' && <PiecesTab options={options} brand={brand} brief={brief} opened={opened} goBrand={() => setTab('brand')} />}
      {tab === 'calendar' && <CalendarTab options={options} brief={brief} setBrief={setBrief} opened={opened} />}
      {tab === 'saved' && <SavedTab onOpen={open} />}
    </div>
  )
}
