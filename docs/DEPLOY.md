# Deploy na Vercel

## Arquitetura
Um **único projeto Vercel** na raiz do repositório:

```
Navegador ──► https://seudominio.com.br
               ├─ /            → frontend estático (frontend/dist)  + fallback SPA
               ├─ /api/*       → função serverless (api/index.mjs → backend/src/app.js, Express)
               ├─ /sitemap.xml → função (gera a partir do banco)
               └─ /robots.txt  → função
                                   └─► PostgreSQL + PostGIS gerenciado (Neon/Supabase)
```
Como o frontend e a API respondem **na mesma origem**, o cookie de sessão (`HttpOnly`, `SameSite=Strict`, `Path=/api/auth`) funciona sem CORS e sem configuração de domínios cruzados.

Arquivos de configuração: [`vercel.json`](../vercel.json) (build, rewrites, região `gru1`, cabeçalhos de segurança/CSP do frontend), [`api/index.mjs`](../api/index.mjs) (entrada da função), [`scripts/vercel-build.sh`](../scripts/vercel-build.sh) (Prisma, migrations em produção, build do frontend).

## Usando a CLI da Vercel
```bash
npm i -g vercel && vercel login
vercel link --project chamalafree --scope <time>   # vincula (ou cria) o projeto
vercel env add NOME --environment production       # variáveis (segredos: use --sensitive e cole no terminal)
vercel deploy --scope <time>                       # preview (build remoto na Vercel)
vercel deploy --prod --scope <time>                # produção
```
- **Faça o build na Vercel** (`vercel deploy`, sem `--prebuilt`): o build local em Mac ARM gera função `arm64`; por isso o schema inclui os alvos do Prisma `rhel-openssl-3.0.x` e `linux-arm64-openssl-3.0.x`.
- Se `vercel link` reclamar que `functions`/`buildCommand` não podem ser usados com `services` (a CLI detecta frontend+backend como "serviços"), mova o `vercel.json` temporariamente, rode o `link` e devolva o arquivo. Depois do projeto vinculado, `vercel build` e `vercel deploy` usam o `vercel.json` normalmente (validado).
- **O primeiro `vercel deploy` de um projeto novo vai para produção** (comportamento da Vercel), mesmo sem `--prod`. Os seguintes são previews.
- Projetos novos vêm com **Deployment Protection** (login da Vercel) ativa: só quem tem acesso ao time abre o site; para testar por linha de comando use `vercel curl`. Desative em *Settings → Deployment Protection* só quando for o go-live.
- Em produção, defina `SITE_URL` e `CORS_ORIGIN` com a URL final: a origem padrão (`VERCEL_URL`) é a de cada deploy, não a do domínio.
- Conectar o repositório do GitHub (deploys automáticos a cada push) exige instalar/autorizar o app da Vercel no GitHub para o repositório.

## Pré-requisitos
- Conta na Vercel e o repositório no GitHub. **O plano Hobby da Vercel é restrito a uso não comercial; como o produto tem monetização, planeje o plano Pro (confirme nos termos atuais).**
- Banco **PostgreSQL com PostGIS**. Recomendado: **Neon** (disponível pelo Marketplace da Vercel, região São Paulo); alternativa: Supabase. Confirme que o provedor permite `CREATE EXTENSION postgis` (a primeira migration executa esse comando).
- Domínio próprio (recomendado antes do go-live).

## Passo a passo
1. **Banco**
   - Crie o projeto e um banco para **produção**; crie outro (branch) para **preview**.
   - Copie duas strings: a **pooled** (host com `-pooler`) e a **direta**.
   - `DATABASE_URL` = pooled + `?sslmode=require&pgbouncer=true&connect_timeout=15&connection_limit=1`
   - `DIRECT_URL` = direta + `?sslmode=require` (usada só nas migrations).
2. **Importar o projeto** em *Add New → Project*: *Framework Preset* **Other**, *Root Directory* a raiz do repositório. Install, Build e Output vêm do `vercel.json`; Node **22.x**.
3. **Variáveis de ambiente** (Settings → Environment Variables), conforme a tabela abaixo. Configure *Production* e *Preview* (com o banco de preview).
4. **Primeiro deploy.** Em produção o build roda `prisma migrate deploy` (se falhar, o deploy não sai). Em preview as migrations **não** são aplicadas automaticamente.
5. **Seed inicial (uma vez)**, da sua máquina, apontando para o banco de produção (use a conexão direta e uma senha forte, depois troque-a no painel):
   ```bash
   cd backend && DATABASE_URL="<DIRECT_URL>" DIRECT_URL="<DIRECT_URL>" \
     SEED_SUPERADMIN_EMAIL="voce@dominio.com.br" SEED_SUPERADMIN_PASSWORD="<senha forte>" npm run db:seed:env
   ```
   Cria o superadministrador, as categorias e os planos (FREE e PRO, com PRO desativado para venda).
6. **Dados territoriais (IBGE)** — opcional, da sua máquina:
   `cd backend && DATABASE_URL="<DIRECT_URL>" DIRECT_URL="<DIRECT_URL>" npm run territorial:sync:env`. O botão do painel também funciona, mas sincronizar 8 municípios pode passar do limite de tempo da função; prefira lotes pequenos ou este comando.
7. **Domínio**: *Settings → Domains*. Depois, defina `SITE_URL` e `CORS_ORIGIN` com `https://seudominio.com.br` e faça um novo deploy.
8. **Verificações pós-deploy**
   - `https://seudominio.com.br/api/health` → `{"status":"ok"}`
   - `/api/plans` retorna FREE e PRO; `/robots.txt` e `/sitemap.xml` respondem.
   - Login; no navegador o cookie `refresh_token` deve ter `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`.
   - Recarregar uma página interna (`/painel`) mantém a sessão; `F5` em `/profissionais` abre a página (fallback SPA).
   - Cabeçalhos do site (CSP, HSTS, `X-Frame-Options`) presentes; sem erros de CSP no console.
   - **Se `/api/*` responder 404**, o redirecionamento para a função não preservou o caminho: confira o `req.url` recebido pela função e os `rewrites` do `vercel.json`.
9. **Pagamentos (Asaas)**: siga [`docs/ASAAS.md`](ASAAS.md). URL do webhook: `https://seudominio.com.br/api/billing/webhook/asaas`. Mantenha `BILLING_ENABLED=false` até a aprovação comercial.

## Variáveis de ambiente
| Variável | Onde | Valor / observação |
|---|---|---|
| `DATABASE_URL` | Production, Preview | String **pooled** (ver passo 1) |
| `DIRECT_URL` | Production, Preview | String direta (migrations) |
| `JWT_ACCESS_SECRET` | Production, Preview | 32+ caracteres aleatórios (**diferente** entre ambientes) |
| `COOKIE_SECURE` | Production, Preview | `true` |
| `SITE_URL` | Production | `https://seudominio.com.br` (sitemap, robots) |
| `CORS_ORIGIN` | Production | `https://seudominio.com.br` (também valida a origem em `/auth/refresh`). Em Preview, se omitida, usa a URL do próprio deploy |
| `JWT_ACCESS_EXPIRES_IN`, `REFRESH_TOKEN_DAYS` | opcionais | padrão `15m` e `7` |
| `BILLING_ENABLED` | Production | `false` até a autorização expressa |
| `ASAAS_ENV`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` | quando for ativar | ver `docs/ASAAS.md` (`sandbox` primeiro) |
| `ENABLE_DOCS` | opcional | omitida: Swagger desligado em produção |
| `VITE_CONTROLLER_NAME`, `VITE_CONTROLLER_CNPJ`, `VITE_PRIVACY_EMAIL` | Production (**build**) | dados do controlador da Política de Privacidade; exigem novo deploy ao mudar |

Não defina `NODE_ENV` (a Vercel já usa `production`). Nunca coloque segredos em variáveis `VITE_*` (vão para o navegador).

## Ambientes de preview
- Use **sempre um banco separado** para preview (branch do Neon). Aplique migrations no banco de preview manualmente (`DIRECT_URL` do preview + `npx prisma migrate deploy`).
- Cada preview tem URL própria; `CORS_ORIGIN`/`SITE_URL` caem na URL do deploy automaticamente.
- Não ative `BILLING_ENABLED` em preview com chave de produção.

## Limitações do ambiente serverless (e mitigações)
| Tema | Situação | O que fazer |
|---|---|---|
| **Rate limiting** | O limitador é **em memória** por instância: com várias instâncias, o limite efetivo fica maior e reinicia a cada cold start | Ativar *Vercel Firewall → Rate Limiting* nas rotas `/api/auth/*` e `/api/billing/webhook/*`; considerar Redis (Upstash) como *store* |
| **Conexões com o banco** | Cada instância abre conexões próprias | Usar o pooler (`pgbouncer=true`) e `connection_limit=1`; migrations só pela `DIRECT_URL` |
| **Tempo de execução** | Limite configurado em 60 s (`maxDuration`); o limite máximo depende do plano | Sincronizações do IBGE em lotes pequenos |
| **Cold start** | Primeira requisição após inatividade é mais lenta (Prisma + Express) | Aceitável; avaliar planos com instâncias aquecidas se necessário |
| **Arquivos** | O sistema não faz upload (portfólio por link). Futuros uploads **não** podem usar o disco da função | Vercel Blob ou S3/R2 (decisão pendente) |
| **Logs** | Logs da função ficam na Vercel (retenção limitada) | Erros 5xx e falhas do Asaas/IBGE também vão para *Relatórios → Falhas operacionais* |
| **Migrations** | São *forward-only* | Backup/*branch* do banco antes de migrations destrutivas; a Vercel permite *rollback* do código, não do banco |

## Antes do go-live
- [ ] Domínio configurado, `SITE_URL`/`CORS_ORIGIN` corretos e HTTPS ativo.
- [ ] Senha do superadmin trocada; `JWT_ACCESS_SECRET` único e forte.
- [ ] Política de Privacidade com dados do controlador e revisão jurídica; Termos de Uso e política de cancelamento.
- [ ] Backups do banco (ex.: *point-in-time recovery* do Neon) testados com restauração.
- [ ] Vercel Firewall com regras de rate limit; alertas de erro/uptime.
- [ ] `docs/SEGURANCA.md` revisado; `npm audit` sem pendências críticas.
- [ ] Asaas testado no sandbox antes de qualquer cobrança real ([`docs/ASAAS.md`](ASAAS.md)).
