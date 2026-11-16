import { Audience, Explore, Faq, Hero, HowItWorks, Plans, Tools, Trust } from '../modules/home/HomeSections.jsx'
import { FAQ } from '../modules/home/content.js'
import useSeo from '../hooks/useSeo.js'

const DESCRIPTION = 'Divulgue seus serviços de graça, encontre profissionais autônomos e MEIs e receba oportunidades compatíveis em Volta Redonda e região. Perfis aprovados, contato com autorização e ferramentas de mapa, simulação financeira e marketing.'

export default function Home() {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  useSeo({
    title: 'CHAMALÁFREE — Profissionais autônomos e oportunidades em Volta Redonda',
    description: DESCRIPTION,
    path: '/',
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'CHAMALÁFREE', slogan: 'Transformando talento em oportunidade', url: origin, logo: `${origin}/favicon.svg`, areaServed: { '@type': 'City', name: 'Volta Redonda' } },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'CHAMALÁFREE', url: origin, inLanguage: 'pt-BR', potentialAction: { '@type': 'SearchAction', target: `${origin}/profissionais?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  })
  return (
    <>
      <Hero />
      <HowItWorks />
      <Audience />
      <Tools />
      <Explore />
      <Plans />
      <Trust />
      <Faq />
    </>
  )
}
