export const brl = (v) => (v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v))
export const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits).replace('.', ',')}%`)
export const num = (v, digits = 1) => (v == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(v))
export const ORIGIN = {
  INFORMADO: { label: 'Informado por você', color: 'gray' },
  ESTIMADO_PADRAO: { label: 'Estimado (padrão do modelo)', color: 'amber' },
  OBSERVADO: { label: 'Observado (fonte oficial)', color: 'green' },
}
