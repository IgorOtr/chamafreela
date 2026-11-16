export const ROLE_LABEL = {
  SUPERADMIN: 'Superadministrador', ADMIN: 'Administrador', MODERADOR: 'Moderador',
  PROFISSIONAL: 'Profissional', EMPRESA: 'Empresa', CLIENTE: 'Cliente',
}
export const STATUS_LABEL = { ATIVO: 'Ativo', PENDENTE: 'Pendente', SUSPENSO: 'Suspenso' }
export const isStaff = (role) => ['SUPERADMIN', 'ADMIN', 'MODERADOR'].includes(role)
export const formatDateTime = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
