import { Tags } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, Input, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'

export default function CategoriesPage() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/categories/all')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const add = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/categories', { name }); setName(''); toast.success('Categoria criada.'); reload() }
    catch (err) { toast.error(errorMessage(err)) } finally { setSaving(false) }
  }
  const toggle = async (c) => {
    try { await api.patch(`/categories/${c.id}`, { active: !c.active }); toast.success(c.active ? 'Categoria desativada.' : 'Categoria ativada.'); reload() }
    catch (err) { toast.error(errorMessage(err)) }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Categorias</h1>
      <Card>
        <form onSubmit={add} className="flex items-end gap-3">
          <div className="flex-1"><Input id="cat" label="Nova categoria" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button type="submit" loading={saving}>Adicionar</Button>
        </form>
      </Card>
      <Card>
        {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.length === 0 ? (
          <EmptyState icon={Tags} title="Nenhuma categoria">Crie a primeira categoria acima.</EmptyState>
        ) : (
          <ul className="divide-y divide-brand-900/5">
            {data.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5">
                <span className="font-semibold">{c.name} <span className="ml-2 text-xs font-normal text-ink/50">/{c.slug}</span></span>
                <span className="flex items-center gap-3">
                  <Badge color={c.active ? 'green' : 'gray'}>{c.active ? 'Ativa' : 'Inativa'}</Badge>
                  <Button variant="ghost" onClick={() => toggle(c)}>{c.active ? 'Desativar' : 'Ativar'}</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
