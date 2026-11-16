# CHAMALÁFREE — Análise técnica e arquitetura

Estado inicial: repositório vazio (apenas `claude.md`). Tudo é construído do zero.

## 1. Arquitetura proposta

Duas aplicações independentes, comunicando-se por API REST/JSON:

```
[React SPA] --HTTPS/JSON--> [Express API] --Prisma--> [PostgreSQL + PostGIS]
                                 |--> S3-compatível (arquivos)
                                 |--> IBGE / OSM (integrações)
                                 |--> API de IA (somente backend)
```

- **Frontend** (Vite + React + Tailwind + React Router): nunca fala com o banco nem guarda chaves.
- **Backend** (Node + Express, ESM): monólito modular por domínio. Controllers finos → services (regras) → Prisma.
- **Banco**: PostgreSQL 16 + PostGIS; geometrias via SQL cru nas migrations (Prisma não modela `geography` nativamente; usado `Unsupported`/raw na Fase 2+).
- **Auth**: JWT de acesso curto (15 min) em memória no frontend + refresh token rotativo em cookie `httpOnly; SameSite=Strict`, hash do refresh armazenado no banco (revogável). Como o access token vai em header `Authorization`, não há CSRF no fluxo principal; o endpoint de refresh/logout (cookie) exige `SameSite=Strict` + verificação de `Origin`.
- **RBAC**: papéis `SUPERADMIN, ADMIN, MODERADOR, PROFISSIONAL, EMPRESA, CLIENTE` + mapa papel→permissões no backend (`config/permissions.js`). Middleware `requirePermission('x:y')` valida sempre no servidor.
- **Auditoria**: `AuditLog` gravado por `audit.service` em operações administrativas.
- **Erros**: classe `AppError` + middleware central; validação com Zod.

## 2. Estrutura de diretórios

```
chamafreela/
  docker-compose.yml        # PostgreSQL + PostGIS (dev)
  docs/                     # arquitetura, banco, variáveis de ambiente
  backend/
    prisma/ (schema.prisma, migrations/, seed.js)
    src/
      config/ (env, permissions)
      modules/{auth,users,admin,audit,...}/ (routes, controller, service, validators, *.test.js)
      middlewares/ services/ integrations/ utils/ database/ routes/
      app.js server.js
  frontend/
    src/{assets,components,layouts,pages,modules,hooks,services,contexts,routes,utils,styles}
```

## 3. Modelagem inicial (Fase 1 implementa o núcleo; o restante vem por fase)

| Fase | Entidades |
|------|-----------|
| 1 | User, RefreshToken, AuditLog, Category |
| 2 | Professional, Service, ServiceArea (PostGIS), PortfolioItem, ProfileChange |
| 3 | Company, Opportunity, Interest |
| 4 | MatchWeight (config), Recommendation, Notification |
| 5 | TerritorialIndicator (fonte, período, unidade, metodologia, limitações) |
| 6 | Simulation (entradas, parâmetros, resultados, versão do modelo, seed) |
| 8 | MarketingAsset |
| 9 | Plan, Subscription, Payment, UsageCounter |

## 4. Relacionamentos principais

- User 1—N RefreshToken; User 1—N AuditLog (ator).
- User 1—1 Professional | Company (conforme papel).
- Professional N—1 Category; 1—N Service; 1—N ServiceArea; 1—N PortfolioItem.
- Company 1—N Opportunity; Opportunity N—1 Category; Opportunity N—N Professional via Interest e Recommendation.
- User 1—N Simulation; User 1—N Subscription N—1 Plan.

## 5. Mapeamento de módulos
Backend segue a lista de `claude.md` §4.1. Frontend §4.1 idem.

## 6. Dependências entre funcionalidades

Fundação (auth/RBAC/auditoria) → Marketplace (Professional, Category) → Empresas/Oportunidades → Conecta (precisa de Professional + Opportunity) → Mapa (precisa de ServiceArea PostGIS + dados IBGE) → Insights (independente, usa Mapa opcionalmente) → IA (precisa de Insights, Mapa, Conecta) → Studio → Monetização (limites de uso atravessam Insights/Studio/IA).

## 7. Autenticação e permissões
Ver §1. Senhas com bcrypt (custo 12); rate limit nas rotas de login/registro; bloqueio de conta `SUSPENSO`; registro público só cria PROFISSIONAL/EMPRESA/CLIENTE — papéis administrativos só por SUPERADMIN.

## 8. Integrações externas
IBGE (API de localidades/agregados, gratuita), OpenStreetMap/Leaflet (tiles com atribuição; Nominatim com respeito ao uso justo), armazenamento S3-compatível (MinIO em dev, Cloudflare R2/Backblaze no plano gratuito), API de IA (Fase 7 — **requer decisão de provedor/custo**), gateway de pagamento (Fase 9 — **requer aprovação; nada de cobrança real**).

## 9. Riscos técnicos
- Prisma × PostGIS: usar SQL cru para consultas espaciais.
- Dados do IBGE em nível de bairro/estabelecimentos são limitados: UI deve mostrar "sem dados suficientes" em vez de estimar.
- Custos/privacidade da IA: enviar apenas dados agregados/anonimizados.
- Fraude em anúncios: moderação obrigatória + rate limit.
- LGPD: consentimento no cadastro, exportação e exclusão de dados.

## 10. Plano por fases
As 9 fases de `claude.md` §18. Fases 7 e 9 dependem de decisões comerciais (IA e pagamentos) — não avançar sem aprovação.
