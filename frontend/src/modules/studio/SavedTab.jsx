import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, Spinner, inputClass } from '../../components/ui.jsx'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useFetch } from '../../hooks/useFetch.js'
import { api, errorMessage } from '../../services/api.js'

const LABEL = { LEGENDA: 'Legenda', PROMOCAO: 'Promoção', ROTEIRO_VIDEO: 'Roteiro', ENQUETE: 'Enquete', DESCRICAO_SERVICO: 'Descrição de serviço', APRESENTACAO: 'Apresentação', CARTAO: 'Cartão', POST: 'Post', STORY: 'Story', CALENDARIO: 'Calendário' }

export default function SavedTab({ onOpen }) {
  const toast = useToast()
  const [type, setType] = useState('')
  const { data, loading, error, reload } = useFetch('/studio/assets', type ? { type } : {})
  const [editing, setEditing] = useState({})
  const remove = async (id) => { try { await api.delete(`/studio/assets/${id}`); reload() } catch (e) { toast.error(errorMessage(e)) } }
  const saveText = async (a) => { try { await api.patch(`/studio/assets/${a.id}`, { content: editing[a.id] }); toast.success('Texto atualizado.'); setEditing({ ...editing, [a.id]: undefined }); reload() } catch (e) { toast.error(errorMessage(e)) } }

  return (
    <div className="space-y-3">
      <select aria-label="Filtrar por tipo" className={`${inputClass} max-w-xs`} value={type} onChange={(e) => setType(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      {loading ? <Spinner /> : error ? <p role="alert" className="text-red-700">{error}</p> : data.length === 0 ? <Card><EmptyState title="Nenhum material salvo">Gere textos, peças ou um calendário e clique em “Salvar”.</EmptyState></Card> : data.map((a) => (
        <Card key={a.id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display font-bold">{a.title}</p>
            <span className="flex items-center gap-2"><Badge color="green">{LABEL[a.type]}</Badge><span className="text-xs text-ink/50">{new Date(a.updatedAt).toLocaleDateString('pt-BR')}</span></span>
          </div>
          {['CARTAO', 'POST', 'STORY', 'CALENDARIO'].includes(a.type) ? (
            <Button variant="outline" onClick={() => onOpen(a)}>Abrir para editar/exportar</Button>
          ) : (
            <>
              <textarea aria-label={`Texto de ${a.title}`} rows={Math.min(10, a.content.split('\n').length + 1)} className={inputClass} value={editing[a.id] ?? a.content} onChange={(e) => setEditing({ ...editing, [a.id]: e.target.value })} />
              {editing[a.id] !== undefined && editing[a.id] !== a.content && <Button onClick={() => saveText(a)}>Salvar alterações</Button>}
            </>
          )}
          <Button variant="ghost" onClick={() => remove(a.id)}><Trash2 className="size-4 text-red-600" />Excluir</Button>
        </Card>
      ))}
    </div>
  )
}
