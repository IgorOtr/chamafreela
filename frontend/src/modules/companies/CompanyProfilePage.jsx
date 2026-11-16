import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Field, Input, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { api, errorMessage } from '../../services/api.js'

const empty = { tradeName: '', legalName: '', cnpj: '', description: '', city: 'Volta Redonda', phone: '', website: '', responsibleName: '', responsibleRole: '' }
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))

export default function CompanyProfilePage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [exists, setExists] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    api.get('/companies/me').then(({ data }) => { setExists(true); setForm({ ...empty, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in empty && v != null)) }) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.put('/companies/me', clean(form)); setExists(true); toast.success('Perfil da empresa salvo.') } catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }
  if (loading) return <Spinner />
  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-3xl font-extrabold">Perfil empresarial</h1>
      {!exists && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Complete o perfil para poder publicar oportunidades.</p>}
      {exists && <p className="text-sm"><Link to="/painel/oportunidades" className="font-semibold text-brand-700 underline">Ir para minhas oportunidades</Link></p>}
      <Card className="space-y-4">
        <Input id="tradeName" label="Nome da empresa (como será exibido)" required value={form.tradeName} onChange={set('tradeName')} />
        <Input id="legalName" label="Razão social (opcional)" value={form.legalName} onChange={set('legalName')} />
        <Input id="cnpj" label="CNPJ (opcional, não é exibido publicamente)" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={set('cnpj')} />
        <Field label="Sobre a empresa (opcional)" htmlFor="description"><textarea id="description" rows={3} className={inputClass} value={form.description} onChange={set('description')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="city" label="Cidade" required value={form.city} onChange={set('city')} />
          <Input id="phone" label="Telefone (com DDD)" required value={form.phone} onChange={set('phone')} />
        </div>
        <Input id="website" label="Site (opcional)" type="url" placeholder="https://" value={form.website} onChange={set('website')} />
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">Responsável</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="responsibleName" label="Nome do responsável" required value={form.responsibleName} onChange={set('responsibleName')} />
          <Input id="responsibleRole" label="Cargo (opcional)" value={form.responsibleRole} onChange={set('responsibleRole')} />
        </div>
      </Card>
      <div className="flex justify-end"><Button type="submit" loading={saving}>Salvar</Button></div>
    </form>
  )
}
