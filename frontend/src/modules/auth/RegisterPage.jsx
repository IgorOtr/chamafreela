import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Card, Field, Input, inputClass } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { errorMessage } from '../../services/api.js'
import useSeo from '../../hooks/useSeo.js'

const ROLES = [
  { value: 'PROFISSIONAL', label: 'Sou profissional / autônomo' },
  { value: 'EMPRESA', label: 'Represento uma empresa' },
  { value: 'CLIENTE', label: 'Quero contratar serviços' },
]

export default function RegisterPage() {
  const { user, register } = useAuth()
  useSeo({ title: 'Criar conta grátis', description: 'Crie sua conta gratuita no CHAMALÁFREE como profissional, empresa ou cliente.', path: '/cadastro' })
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PROFISSIONAL', consent: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/painel" replace />
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try { await register(form); navigate('/painel') } catch (err) { setError(errorMessage(err)) } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <h1 className="mb-1 font-display text-2xl font-extrabold">Criar conta</h1>
        <p className="mb-5 text-sm text-ink/60">É grátis. Escolha como pretende usar a plataforma.</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Tipo de conta" htmlFor="role">
            <select id="role" className={inputClass} value={form.role} onChange={set('role')}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Input id="name" label="Nome ou nome comercial" required value={form.name} onChange={set('name')} />
          <Input id="email" label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
          <Input id="password" label="Senha (mín. 8, com letras e números)" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={form.consent} onChange={set('consent')} required />
            <span>Li e aceito a Política de Privacidade e autorizo o tratamento dos meus dados para uso da plataforma (LGPD).</span>
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Criar conta</Button>
        </form>
        <p className="mt-4 text-center text-sm">Já tem conta? <Link to="/entrar" className="font-semibold text-brand-700 underline">Entrar</Link></p>
      </Card>
    </div>
  )
}
