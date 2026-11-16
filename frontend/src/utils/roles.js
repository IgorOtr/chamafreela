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
