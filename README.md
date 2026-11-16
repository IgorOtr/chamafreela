# CHAMALÁFREE

*Transformando talento em oportunidade.* Plataforma que conecta autônomos, empresas e clientes (início: Volta Redonda/RJ).
Especificação completa em [`claude.md`](claude.md); arquitetura em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Estado atual — Fase 1 (Fundação)
Autenticação (JWT + refresh rotativo em cookie httpOnly), RBAC no backend, categorias, gestão de usuários, auditoria, dashboard administrativo, layout e identidade visual.

## Requisitos
Node 22+ e Docker (PostgreSQL + PostGIS).

## Instalação
```bash
docker compose up -d                      # PostgreSQL/PostGIS na porta 5434
cd backend && cp .env.example .env && npm install
npx prisma migrate deploy && npm run db:seed
npm run dev                               # API em http://localhost:3333/api (Swagger em /api/docs)
cd ../frontend && npm install && npm run dev   # http://localhost:5173
```
Login inicial (apenas desenvolvimento): valores `SEED_SUPERADMIN_*` do `.env`. **Troque em produção.**

## Testes
```bash
docker exec chamalafree-db psql -U chamalafree -c 'CREATE DATABASE chamalafree_test'
cd backend && cp .env.example .env.test   # ajuste DATABASE_URL para .../chamalafree_test e NODE_ENV=test
DATABASE_URL=... npx prisma migrate deploy
npm test
```

## Variáveis de ambiente (backend)
| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL |
| `JWT_ACCESS_SECRET` | Segredo do access token (≥ 32 caracteres) |
| `JWT_ACCESS_EXPIRES_IN` | Validade do access token (padrão 15m) |
| `REFRESH_TOKEN_DAYS` | Validade do refresh token (padrão 7) |
| `CORS_ORIGIN` | Origem do frontend (também checada nos endpoints de cookie) |
| `COOKIE_SECURE` | `true` em produção (HTTPS) |
| `SEED_SUPERADMIN_EMAIL/PASSWORD` | Conta criada pelo seed |

## Papéis e permissões
Definidos em `backend/src/config/permissions.js` e verificados em cada rota. SUPERADMIN: tudo; ADMIN: usuários comuns, categorias, auditoria; MODERADOR: leitura de usuários (moderação nas Fases 2–3).
