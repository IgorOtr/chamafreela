# CHAMALÁFREE

*Transformando talento em oportunidade.* Plataforma que conecta autônomos, empresas e clientes (início: Volta Redonda/RJ).
Especificação completa em [`claude.md`](claude.md); arquitetura em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Estado atual
**Fase 1 — Fundação:** autenticação (JWT + refresh rotativo em cookie httpOnly), RBAC no backend, categorias, usuários, auditoria, dashboard e identidade visual.

**Fase 2 — Marketplace:** perfil profissional (serviços, regiões atendidas com coluna PostGIS gerada, portfólio por links), aprovação/rejeição/ocultação/destaque pela administração com histórico, catálogo público com busca e filtros (nome, serviço, categoria, cidade, bairro, região atendida), contato público somente com autorização e solicitações LGPD de atualização/exclusão.

**Fase 3 — Empresas e oportunidades:** perfil empresarial (CNPJ validado, responsável), publicação de oportunidades com moderação obrigatória, edição com reaprovação, encerramento, expiração por prazo, catálogo público com filtros, manifestação de interesse (contato revelado só a quem se interessa e respeitando a autorização do profissional), alertas automáticos de possível fraude para o moderador, limite de pendentes por empresa e suspensão de empresas.

**Fase 4 — CHAMALÁ Conecta:** motor de correspondência por regras e pesos configuráveis (categoria/serviço 30, localização 25, qualificações 15, disponibilidade 15, modalidade 10, preferências 5), com índice 0–100, detalhamento por critério e justificativa em português. Categoria/serviço incompatível nunca gera recomendação. As recomendações são calculadas ao publicar uma oportunidade e ao aprovar/alterar um perfil; há painel de recomendadas, notificações internas (com opt-out; nada é enviado por e-mail/WhatsApp) e tela administrativa de critérios (auditada, recalcula tudo). **Limitação:** a localização compara cidade/bairro; não há distância em km até existir geocodificação.

**Fase 5 — CHAMALÁ Mapa:** mapa Leaflet/OpenStreetMap, indicadores reais do IBGE (Censo 2022: população, área e densidade; PIB dos Municípios; CEMPRE: unidades locais e pessoal ocupado por setor CNAE) guardados em `TerritorialIndicator` com fonte, referência, unidade, escala, metodologia e limitações, e contagens agregadas do cadastro da plataforma por município e categoria. Lacunas e dados omitidos aparecem explicitamente; não há dados por bairro nem mapa de calor de demanda. Sincronização: botão para admin ou `npm run territorial:sync` (Sul Fluminense, 8 municípios). A série CEMPRE usada termina em 2021. Os tiles públicos do OpenStreetMap servem para desenvolvimento; em produção use um provedor de tiles adequado ao volume.

Pendente da Fase 2: upload de arquivos do portfólio (hoje apenas links https) — depende da escolha do armazenamento S3-compatível.

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

## Migrations e a coluna PostGIS
`ServiceArea.location` é uma coluna **gerada** (PostGIS). O `prisma migrate dev` tenta alterá-la (`DROP INDEX ServiceArea_location_idx` e `ALTER COLUMN location DROP DEFAULT`). Ao criar migrations, use `--create-only` e **remova essas linhas** antes de aplicar.
