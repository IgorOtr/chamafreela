import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '../../components/ui.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { errorMessage } from '../../services/api.js'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/painel" replace />

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try { await login(form); navigate('/painel') } catch (err) { setError(errorMessage(err)) } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <h1 className="mb-1 font-display text-2xl font-extrabold">Entrar</h1>
        <p className="mb-5 text-sm text-ink/60">Acesse sua conta CHAMALÁFREE.</p>
        <form onSubmit={submit} className="space-y-4">
          <Input id="email" label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input id="password" label="Senha" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Entrar</Button>
        </form>
        <p className="mt-4 text-center text-sm">Ainda não tem conta? <Link to="/cadastro" className="font-semibold text-brand-700 underline">Cadastre-se</Link></p>
      </Card>
    </div>
  )
}
