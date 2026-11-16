export const ROLE_LABEL = {
  SUPERADMIN: 'Superadministrador', ADMIN: 'Administrador', MODERADOR: 'Moderador',
  PROFISSIONAL: 'Profissional', EMPRESA: 'Empresa', CLIENTE: 'Cliente',
}
export const STATUS_LABEL = { ATIVO: 'Ativo', PENDENTE: 'Pendente', SUSPENSO: 'Suspenso' }
export const isStaff = (role) => ['SUPERADMIN', 'ADMIN', 'MODERADOR'].includes(role)
export const formatDateTime = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
export const MODE_LABEL = { PRESENCIAL: 'Presencial', REMOTO: 'Remoto', HIBRIDO: 'Híbrido' }
export const PRO_STATUS = {
  PENDENTE: { label: 'Aguardando aprovação', color: 'amber' },
  APROVADO: { label: 'Aprovado', color: 'green' },
  REJEITADO: { label: 'Rejeitado', color: 'red' },
  OCULTO: { label: 'Oculto', color: 'gray' },
}
export const whatsappLink = (n) => `https://wa.me/${n.length <= 11 ? '55' + n : n}`
export const CONTRACT_LABEL = { PONTUAL: 'Serviço pontual', RECORRENTE: 'Recorrente', TEMPORARIO: 'Temporário', VAGA_FIXA: 'Vaga fixa' }
export const OPP_STATUS = {
  PENDENTE: { label: 'Aguardando aprovação', color: 'amber' },
  PUBLICADA: { label: 'Publicada', color: 'green' },
  REJEITADA: { label: 'Rejeitada', color: 'red' },
  ENCERRADA: { label: 'Encerrada', color: 'gray' },
}
export const FLAG_LABEL = {
  PAGAMENTO_ANTECIPADO: 'Pede pagamento antecipado', LINK_ENCURTADO: 'Link encurtado',
  PROMESSA_DE_GANHO_FACIL: 'Promessa de ganho fácil', CONTATO_EXTERNO_SUSPEITO: 'Contato externo suspeito',
}
export const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR')
export const formatPay = (min, max) => {
  const f = (n) => `R$ ${n.toLocaleString('pt-BR')}`
  if (min != null && max != null) return `${f(min)} a ${f(max)}`
  if (min != null) return `a partir de ${f(min)}`
  if (max != null) return `até ${f(max)}`
  return 'A combinar'
}
