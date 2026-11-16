import { Link } from 'react-router-dom'
import { useFetch } from '../hooks/useFetch.js'
import { Button, Card } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { ROLE_LABEL } from '../utils/roles.js'

const NEXT = {
  PROFISSIONAL: null,
  EMPRESA: null,
  CLIENTE: 'Busque profissionais no catálogo e acompanhe as oportunidades abertas.',
}

function RecommendedSummary() {
  const { data } = useFetch('/recommendations/mine')
  if (!data) return null
  return (
    <Card>
      <h2 className="font-display text-lg font-bold">Oportunidades recomendadas</h2>
      <p className="mt-1 text-sm text-ink/70">{data.length ? `Há ${data.length} oportunidade(s) compatível(is) com o seu perfil.` : 'Nenhuma oportunidade compatível no momento.'}</p>
      {data.length > 0 && <Link to="/painel/recomendadas" className="mt-3 inline-block"><Button>Ver recomendadas</Button></Link>}
    </Card>
  )
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
        ) : user.role === 'EMPRESA' ? (
          <div className="mt-2 space-y-3 text-sm text-ink/70"><p>Complete o perfil da empresa e publique suas demandas.</p><div className="flex gap-2"><Link to="/painel/empresa"><Button>Perfil da empresa</Button></Link><Link to="/painel/oportunidades"><Button variant="outline">Minhas oportunidades</Button></Link></div></div>
        ) : <p className="mt-1 text-sm text-ink/70">{NEXT[user.role]}</p>}
      </Card>
      {user.role === 'PROFISSIONAL' && <RecommendedSummary />}
    </div>
  )
}
