// Peças gráficas (cartão, post, story) montadas em SVG no navegador e exportadas em PNG/PDF.
export const PIECES = {
  CARTAO: { label: 'Cartão de divulgação', w: 1050, h: 600 },
  POST: { label: 'Post quadrado (feed)', w: 1080, h: 1080 },
  STORY: { label: 'Story / vertical', w: 1080, h: 1920 },
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const toDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

function wrap(text, fontSize, maxWidth) {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)))
  const lines = []
  for (const para of String(text ?? '').split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if ((line + ' ' + word).trim().length > maxChars) { if (line) lines.push(line); line = word } else line = (line + ' ' + word).trim()
    }
    lines.push(line)
  }
  return lines
}

function textBlock(lines, x, y, size, fill, font, weight = 400, gap = 1.25) {
  return `<text x="${x}" y="${y}" font-family='${font.stack}' font-size="${size}" font-weight="${weight}" fill="${fill}">${lines.map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : size * gap}">${esc(l)}</tspan>`).join('')}</text>`
}

function logoImage(logoSvg, x, y, maxW, maxH) {
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(logoSvg)
  const [lw, lh] = vb ? [Number(vb[1]), Number(vb[2])] : [120, 120]
  const k = Math.min(maxW / lw, maxH / lh)
  const b64 = btoa(unescape(encodeURIComponent(logoSvg)))
  return { w: lw * k, h: lh * k, svg: `<image x="${x}" y="${y}" width="${lw * k}" height="${lh * k}" href="data:image/svg+xml;base64,${b64}"/>` }
}

export function buildPieceSvg({ type, layout, headline, body, contact }, brand, fonts) {
  const { w, h } = PIECES[type]
  const c = brand.colors
  const font = fonts[brand.fontKey] ?? fonts.moderna
  const m = Math.round(w * 0.07)
  const dark = layout === 'bloco'
  const bg = dark ? c.primary : c.background
  const fg = dark ? '#ffffff' : c.text
  const small = type === 'CARTAO'
  const hs = small ? 54 : type === 'POST' ? 84 : 92
  const bs = small ? 28 : 38
  const cs = small ? 24 : 32

  const pill = { x: m, y: m, pw: Math.round(w * (small ? 0.42 : 0.5)), ph: Math.round(small ? 110 : 150) }
  const logo = logoImage(brand.logoSvg, pill.x + 16, pill.y + 12, pill.pw - 32, pill.ph - 24)
  const hy = pill.y + pill.ph + (small ? 90 : 120)
  const hLines = wrap(headline, hs, w - 2 * m)
  const by = hy + hLines.length * hs * 1.25 + (small ? 24 : 40)
  const bLines = wrap(body, bs, w - 2 * m)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="${w}" height="${h}" fill="${bg}"/>`,
    dark ? `<rect x="0" y="${h - 14}" width="${w}" height="14" fill="${c.accent}"/>` : `<rect x="0" y="0" width="${w}" height="${small ? 18 : 26}" fill="${c.primary}"/><rect x="${m}" y="${hy - hs - 20}" width="90" height="8" rx="4" fill="${c.accent}"/>`,
    `<rect x="${pill.x}" y="${pill.y}" width="${logo.w + 32}" height="${logo.h + 24}" rx="24" fill="#ffffff" ${dark ? '' : `stroke="${c.secondary}" stroke-width="3"`}/>`,
    logo.svg,
    textBlock(hLines, m, hy, hs, fg, font, font.weight, 1.15),
    textBlock(bLines, m, by, bs, dark ? c.secondary : c.text, { stack: 'Helvetica, Arial, sans-serif' }, 400, 1.35),
    contact ? textBlock(wrap(contact, cs, w - 2 * m), m, h - m - (small ? 10 : 30), cs, dark ? c.accent : c.primary, font, 700) : '',
    '</svg>',
  ].join('')
}

export function svgToPngBlob(svg, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png')
    }
    img.onerror = () => reject(new Error('Falha ao renderizar a peça'))
    img.src = toDataUri(svg)
  })
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportPdf(svg, type, filename) {
  const { jsPDF } = await import('jspdf')
  const { w, h } = PIECES[type]
  const png = await svgToPngBlob(svg, w, h)
  const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(png) })
  if (type === 'CARTAO') {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [88.9, 50.8] })
    pdf.addImage(dataUrl, 'PNG', 0, 0, 88.9, 50.8)
    pdf.save(filename)
  } else {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const maxW = 190, maxH = 277
    const k = Math.min(maxW / w, maxH / h)
    pdf.addImage(dataUrl, 'PNG', (210 - w * k) / 2, (297 - h * k) / 2, w * k, h * k)
    pdf.save(filename)
  }
}
