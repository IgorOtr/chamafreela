import PlansSection from '../components/PlansSection.jsx'
import useSeo from '../hooks/useSeo.js'

export default function PlansPage() {
  useSeo({ title: 'Planos e preços', description: 'Conheça os planos do CHAMALÁFREE: FREE gratuito para divulgar seus serviços e PRO com destaques promocionais, em preparação.', path: '/planos' })
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="font-display text-4xl font-extrabold">Planos do CHAMALÁFREE</h1>
        <p className="mt-3 text-ink/70">Divulgue seus serviços sem pagar nada. O plano PRO está em preparação e só será cobrado depois de aprovação e aviso prévio.</p>
      </div>
      <PlansSection />
    </div>
  )
}
