export const openapi = {
  openapi: '3.0.3',
  info: { title: 'CHAMALÁFREE API', version: '0.1.0', description: 'Fase 1 — Fundação: autenticação, RBAC, categorias, usuários, auditoria.' },
  servers: [{ url: '/api' }],
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/health': { get: { summary: 'Verificação de saúde', responses: { 200: { description: 'ok' } } } },
    '/auth/register': { post: { summary: 'Cadastro público (PROFISSIONAL, EMPRESA, CLIENTE)', responses: { 201: { description: 'Conta criada' }, 400: { description: 'Dados inválidos' }, 409: { description: 'E-mail já cadastrado' } } } },
    '/auth/login': { post: { summary: 'Login', responses: { 200: { description: 'Access token + cookie de refresh' }, 401: { description: 'Credenciais inválidas' } } } },
    '/auth/refresh': { post: { summary: 'Renova a sessão (rotaciona o refresh token)', responses: { 200: { description: 'ok' }, 401: { description: 'Sessão inválida' } } } },
    '/auth/logout': { post: { summary: 'Encerra a sessão', responses: { 204: { description: 'ok' } } } },
    '/auth/me': { get: { summary: 'Usuário autenticado', security: [{ bearer: [] }], responses: { 200: { description: 'ok' } } } },
    '/categories': {
      get: { summary: 'Categorias ativas (público)', responses: { 200: { description: 'ok' } } },
      post: { summary: 'Criar categoria', security: [{ bearer: [] }], responses: { 201: { description: 'ok' }, 403: { description: 'Sem permissão' } } },
    },
    '/categories/all': { get: { summary: 'Todas as categorias (admin)', security: [{ bearer: [] }], responses: { 200: { description: 'ok' } } } },
    '/categories/{id}': { patch: { summary: 'Editar/ativar/desativar categoria', security: [{ bearer: [] }], responses: { 200: { description: 'ok' } } } },
    '/users': { get: { summary: 'Listar usuários (paginado)', security: [{ bearer: [] }], responses: { 200: { description: 'ok' } } } },
    '/users/{id}': { patch: { summary: 'Alterar papel/status', security: [{ bearer: [] }], responses: { 200: { description: 'ok' } } } },
    '/admin/dashboard': { get: { summary: 'Indicadores do painel administrativo', security: [{ bearer: [] }], responses: { 200: { description: 'ok' } } } },
    '/audit': { get: { summary: 'Registros de auditoria', security: [{ bearer: [] }], responses: { 200: { description: 'ok' } } } },
  },
};
