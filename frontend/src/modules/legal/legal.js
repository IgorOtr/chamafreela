// Dados do controlador: definidos pelo contratante via variáveis de ambiente do frontend (ver .env.example).
export const CONTROLLER = {
  name: import.meta.env.VITE_CONTROLLER_NAME || '',
  cnpj: import.meta.env.VITE_CONTROLLER_CNPJ || '',
  email: import.meta.env.VITE_PRIVACY_EMAIL || '',
}
export const CONTROLLER_READY = Boolean(CONTROLLER.name && CONTROLLER.email)
export const POLICY_VERSION = '1.0'
export const LAST_UPDATE = '16 de novembro de 2026'
