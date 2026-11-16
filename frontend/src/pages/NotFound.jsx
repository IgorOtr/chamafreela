import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui.jsx'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center">
      <EmptyState title="Página não encontrada">
        O endereço não existe ou foi movido. <Link className="font-semibold text-brand-700 underline" to="/">Voltar ao início</Link>
      </EmptyState>
    </div>
  )
}
