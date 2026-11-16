import { useEffect } from 'react'

const SITE = 'CHAMALÁFREE'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

// Metadados por página (título, descrição, canonical, Open Graph, JSON-LD). O Google executa JavaScript,
// mas para indexação ideal em produção considere pré-renderização (ver README).
export default function useSeo({ title, description, path, noindex = false, jsonLd = [] }) {
  const ld = JSON.stringify(jsonLd)
  useEffect(() => {
    const origin = window.location.origin
    const url = origin + (path ?? window.location.pathname)
    const fullTitle = title ? (title.includes(SITE) ? title : `${title} | ${SITE}`) : SITE
    document.title = fullTitle
    if (description) { setMeta('name', 'description', description); setMeta('property', 'og:description', description) }
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', `${origin}/og-image.png`)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = url
    const scripts = JSON.parse(ld).map((obj) => {
      const s = document.createElement('script')
      s.type = 'application/ld+json'; s.dataset.seo = 'true'
      s.textContent = JSON.stringify(obj).replace(/</g, '\\u003c')
      document.head.appendChild(s)
      return s
    })
    return () => scripts.forEach((s) => s.remove())
  }, [title, description, path, noindex, ld])
}
