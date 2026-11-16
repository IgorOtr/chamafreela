import { ShieldCheck, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import useSeo from '../hooks/useSeo.js'
import { CONTROLLER, CONTROLLER_READY, LAST_UPDATE, POLICY_VERSION } from '../modules/legal/legal.js'
import { forBilling } from '../modules/legal/policyContent.js'
import { useFetch } from '../hooks/useFetch.js'

function Block({ b }) {
  if (b.p) return <p className="text-sm leading-relaxed text-ink/80">{b.p}</p>
  if (b.h) return <h3 className="pt-1 font-display text-base font-bold">{b.h}</h3>
  if (b.ul) return <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/80">{b.ul.map((i) => <li key={i}>{i}</li>)}</ul>
  if (b.table) {
    return (
      <div className="overflow-x-auto rounded-xl border border-brand-900/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-50 text-xs uppercase text-ink/60"><tr>{b.table.head.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{b.table.rows.map((r) => <tr key={r[0]} className="border-t border-brand-900/10 align-top">{r.map((c, i) => <td key={i} className={`px-3 py-2 ${i === 0 ? 'font-semibold' : 'text-ink/80'}`}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    )
  }
  if (b.controller) {
    return CONTROLLER_READY ? (
      <p className="text-sm leading-relaxed text-ink/80"><b>Controlador:</b> {CONTROLLER.name}{CONTROLLER.cnpj && <> — CNPJ {CONTROLLER.cnpj}</>}.</p>
    ) : <p className="text-sm leading-relaxed text-ink/80"><b>Controlador:</b> a identificação completa do controlador (razão social e CNPJ) será informada aqui.</p>
  }
  if (b.contact) {
    return CONTROLLER_READY ? (
      <p className="text-sm leading-relaxed text-ink/80">Dúvidas, pedidos e reclamações sobre privacidade: <a className="font-semibold text-brand-700 underline" href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a>. Você também pode usar o painel em <Link className="font-semibold text-brand-700 underline" to="/painel/privacidade">Privacidade e dados</Link>.</p>
    ) : <p className="text-sm leading-relaxed text-ink/80">O canal de contato do encarregado pelo tratamento de dados pessoais será informado aqui. Enquanto isso, use o painel em <Link className="font-semibold text-brand-700 underline" to="/painel/privacidade">Privacidade e dados</Link>.</p>
  }
  return null
}

export default function PrivacyPolicy() {
  const plans = useFetch('/plans')
  const { summary: SUMMARY, sections: SECTIONS } = forBilling(Boolean(plans.data?.[0]?.billingEnabled))
  useSeo({ title: 'Política de Privacidade', description: 'Saiba quais dados o CHAMALÁFREE coleta, para que usa, o que fica público, por quanto tempo guarda e como exercer seus direitos na LGPD.', path: '/privacidade' })
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-extrabold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-ink/60">Versão {POLICY_VERSION} · Atualizada em {LAST_UPDATE}</p>
      </header>

      {!CONTROLLER_READY && (
        <aside role="note" className="mb-8 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p><b>Versão preliminar.</b> Os dados do controlador (razão social, CNPJ) e o e-mail do encarregado ainda não foram configurados, e o texto deve passar por revisão jurídica antes da publicação oficial.</p>
        </aside>
      )}

      <section aria-labelledby="resumo" className="mb-8 rounded-2xl bg-brand-50 p-6">
        <h2 id="resumo" className="mb-3 flex items-center gap-2 font-display text-xl font-bold"><ShieldCheck className="size-5 text-brand-500" aria-hidden />Resumo em linguagem simples</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink/80">{SUMMARY.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="mt-3 text-xs text-ink/60">O resumo não substitui o texto completo abaixo.</p>
      </section>

      <nav aria-label="Índice da política" className="mb-10 rounded-2xl border border-brand-900/10 bg-white p-5">
        <h2 className="mb-2 font-display text-base font-bold">Neste documento</h2>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">{SECTIONS.map((s) => <li key={s.id}><a className="text-brand-700 hover:underline" href={`#${s.id}`}>{s.title}</a></li>)}</ol>
      </nav>

      <article className="space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="scroll-mt-24 space-y-3">
            <h2 id={`${s.id}-t`} className="font-display text-2xl font-bold">{s.title}</h2>
            {s.blocks.map((b, i) => <Block key={i} b={b} />)}
          </section>
        ))}
      </article>
    </div>
  )
}
