import { Card } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { ROLE_LABEL } from '../utils/roles.js'

const NEXT = {
  PROFISSIONAL: 'Em breve: cadastro do perfil profissional, serviços e portfólio (Fase 2).',
  EMPRESA: 'Em breve: perfil empresarial e publicação de oportunidades (Fase 3).',
  CLIENTE: 'Em breve: busca de profissionais e oportunidades (Fases 2 e 3).',
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
        <p className="mt-1 text-sm text-ink/70">{NEXT[user.role]}</p>
      </Card>
    </div>
  )
}
