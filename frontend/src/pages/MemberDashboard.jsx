import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { ROLE_LABEL } from '../utils/roles.js'

const NEXT = {
  PROFISSIONAL: null,
  EMPRESA: 'Em breve: perfil empresarial e publicação de oportunidades (Fase 3).',
  CLIENTE: 'Já é possível buscar profissionais no catálogo. Oportunidades chegam na Fase 3.',
}

export default function MemberDashboard() {
  const { user } = useAuth()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Olá, {user.name.split(' ')[0]}!</h1>
        <p className="text-ink/60">Conta {ROLE_LABEL[user.role].toLowerCase()} · {user.email}</p>
      </div>
      <Card>
        <h2 className="font-display text-lg font-bold">Sua conta está criada</h2>
        {user.role === 'PROFISSIONAL' ? (
          <div className="mt-2 space-y-3 text-sm text-ink/70"><p>Complete seu perfil profissional para aparecer no catálogo.</p><Link to="/painel/meu-perfil"><Button>Meu perfil</Button></Link></div>
        ) : <p className="mt-1 text-sm text-ink/70">{NEXT[user.role]}</p>}
      </Card>
    </div>
  )
}
