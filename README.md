# CHAMALÁFREE

*Transformando talento em oportunidade.* Plataforma que conecta autônomos, empresas e clientes (início: Volta Redonda/RJ).
Especificação completa em [`claude.md`](claude.md); arquitetura em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Estado atual
**Fase 1 — Fundação:** autenticação (JWT + refresh rotativo em cookie httpOnly), RBAC no backend, categorias, usuários, auditoria, dashboard e identidade visual.

**Fase 2 — Marketplace:** perfil profissional (serviços, regiões atendidas com coluna PostGIS gerada, portfólio por links), aprovação/rejeição/ocultação/destaque pela administração com histórico, catálogo público com busca e filtros (nome, serviço, categoria, cidade, bairro, região atendida), contato público somente com autorização e solicitações LGPD de atualização/exclusão.

**Fase 3 — Empresas e oportunidades:** perfil empresarial (CNPJ validado, responsável), publicação de oportunidades com moderação obrigatória, edição com reaprovação, encerramento, expiração por prazo, catálogo público com filtros, manifestação de interesse (contato revelado só a quem se interessa e respeitando a autorização do profissional), alertas automáticos de possível fraude para o moderador, limite de pendentes por empresa e suspensão de empresas.

**Fase 4 — CHAMALÁ Conecta:** motor de correspondência por regras e pesos configuráveis (categoria/serviço 30, localização 25, qualificações 15, disponibilidade 15, modalidade 10, preferências 5), com índice 0–100, detalhamento por critério e justificativa em português. Categoria/serviço incompatível nunca gera recomendação. As recomendações são calculadas ao publicar uma oportunidade e ao aprovar/alterar um perfil; há painel de recomendadas, notificações internas (com opt-out; nada é enviado por e-mail/WhatsApp) e tela administrativa de critérios (auditada, recalcula tudo). **Limitação:** a localização compara cidade/bairro; não há distância em km até existir geocodificação.

**Fase 5 — CHAMALÁ Mapa:** mapa Leaflet/OpenStreetMap, indicadores reais do IBGE (Censo 2022: população, área e densidade; PIB dos Municípios; CEMPRE: unidades locais e pessoal ocupado por setor CNAE) guardados em `TerritorialIndicator` com fonte, referência, unidade, escala, metodologia e limitações, e contagens agregadas do cadastro da plataforma por município e categoria. Lacunas e dados omitidos aparecem explicitamente; não há dados por bairro nem mapa de calor de demanda. Sincronização: botão para admin ou `npm run territorial:sync` (Sul Fluminense, 8 municípios). A série CEMPRE usada termina em 2021. Os tiles públicos do OpenStreetMap servem para desenvolvimento; em produção use um provedor de tiles adequado ao volume.

**Fase 6 — CHAMALÁ Insights:** simulação de Monte Carlo em JavaScript puro (`backend/src/modules/simulations/engine.js`, modelo `mc-1.0.0`). Cada iteração simula um mês: demanda (lognormal), preço, custo variável e custo fixo (normais); a receita respeita a capacidade (dias × serviços/dia). Entrega lucro (histograma, percentis, cenários pessimista/central/otimista = P10/P50/P90), probabilidade de prejuízo com margem de erro, receita de equilíbrio, retorno do investimento (só quando aplicável), sensibilidade (±x%, mesma semente), análise de capital e explicações em português. Premissas aparecem com origem (informado, estimado padrão, observado/IBGE), a semente é registrada e reproduz o resultado exato, e há histórico e comparação de cenários. 20 testes matemáticos (RNG, distribuições, percentis, convergência à esperança analítica, capacidade, equilíbrio). Não é garantia de faturamento.

**Fase 8 — CHAMALÁ Studio:** textos por modelos (legendas, promoções, roteiros de vídeo, enquetes, descrições de serviço, apresentação) em 3 tons de voz, 100% locais e determinísticos por semente — usam só os dados informados e não inventam números, garantias, preços nem depoimentos (testado). Kit da marca com paletas por segmento, verificação de contraste WCAG e logotipo SVG gerado e escapado no servidor; peças (cartão, post, story) montadas no navegador e exportadas em PNG/PDF; calendário de conteúdo (rascunhos e orientações, sem publicação automática; exporta CSV); materiais salvos por titular (limite de 200). Sem IA externa, sem custo. Imagens/vídeos gerados por IA ficaram fora (custo e direitos de uso).

Pendente da Fase 2: upload de arquivos do portfólio (hoje apenas links https) — depende da escolha do armazenamento S3-compatível.

## Requisitos
Node 22+ e Docker (PostgreSQL + PostGIS).

## Deploy (Vercel)
Projeto único na Vercel: frontend estático + API como função serverless na mesma origem, com PostgreSQL/PostGIS gerenciado. Passo a passo, variáveis e limitações em **[`docs/DEPLOY.md`](docs/DEPLOY.md)**. Pagamentos: [`docs/ASAAS.md`](docs/ASAAS.md). Segurança: [`docs/SEGURANCA.md`](docs/SEGURANCA.md).

## CHAMALÁ Formaliza
Página `/formalize-seu-negocio` (menu "Formalize seu negócio") que apresenta a consultoria de formalização do MEI e leva ao agendamento da consultoria pelo WhatsApp, com mensagem pronta. Número e mensagem editáveis em Configurações (painel do superadmin). Operação e planilha de acompanhamento em [`docs/FORMALIZA.md`](docs/FORMALIZA.md).

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

> **Dica de testes/produção:** o Prisma usa por padrão `connect_timeout=5s`. Em máquinas carregadas (Docker, vários processos), testes com muitas requisições paralelas podem estourar esse prazo de forma intermitente (um erro 500 após ~5 s). Use `?schema=public&connect_timeout=20&pool_timeout=20` na `DATABASE_URL` (já presente no `.env.example`) e dimensione `connection_limit` conforme o ambiente.

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

## Home, planos e SEO
- A home tem 8 seções (hero com busca, como funciona, para quem é, ferramentas, explorar, planos, confiança e privacidade, FAQ com chamada final) em `frontend/src/modules/home/`. Os textos estão em `content.js`; o FAQ alimenta também o JSON-LD `FAQPage`.
- Planos vêm do banco (`Plan`, rota pública `GET /api/plans`), alimentados pelo seed com FREE (grátis) e PRO (R$ 14,90; oferta de lançamento R$ 9,99 por 3 meses). **O PRO está com `available=false`: não há cobrança ativa.** A edição pelo painel administrativo entra na Fase 9.
- SEO: `useSeo` define título, descrição, canonical, Open Graph e JSON-LD por página; `index.html` traz metadados padrão, `og-image.png` e fallback `<noscript>`; o backend serve `/sitemap.xml` (só perfis aprovados e oportunidades vigentes) e `/robots.txt` (bloqueia `/painel`, `/entrar` e `/api`). Defina `SITE_URL` no `.env` do backend com o domínio final e exponha esses dois caminhos na raiz do domínio (proxy reverso).
- Limitação conhecida: o frontend é uma SPA. O Google executa JavaScript, mas para melhor indexação e compartilhamento em produção, considere pré-renderizar as páginas públicas (por exemplo, com `vite-ssg` ou SSR).

## Privacidade e LGPD
- **Política de Privacidade** em `/privacidade` (`frontend/src/modules/legal/policyContent.js`): descreve só o que o sistema faz hoje (dados coletados, bases legais, público × privado, terceiros como Google Fonts e OpenStreetMap, cookie de sessão, retenção, segurança, direitos, recomendações automatizadas). **Se o tratamento mudar (pagamentos, IA, analytics), atualize o texto e `POLICY_VERSION`.**
- **Antes de publicar:** preencha `VITE_CONTROLLER_NAME`, `VITE_CONTROLLER_CNPJ` e `VITE_PRIVACY_EMAIL` (ver `frontend/.env.example`) e submeta o texto à revisão jurídica. Enquanto essas variáveis estiverem vazias, a página exibe o aviso de "versão preliminar".
- **Privacidade e dados** no painel (`/painel/privacidade`, todos os papéis): download dos próprios dados em JSON (`GET /api/privacy/export`, sem senhas nem dados de terceiros, auditado), pedidos de atualização/exclusão e acompanhamento do status. A administração trata os pedidos em "Solicitações LGPD".
- A integração com IA externa e o gateway de pagamento ficaram para uma melhoria futura (a decisão do contratante). A política já afirma que hoje não há IA externa nem cobrança.

## Fase 9 — Monetização e aprimoramento
- **Planos editáveis** pelo painel (`/painel/planos`): preço, promoção, benefícios, limites de uso, disponibilidade e destaque, com auditoria. A vitrine pública reflete na hora.
- **Assinaturas** (`/painel/assinaturas`): concessão manual (cortesia/parceria, sem cobrança), cancelamento e listagem. **Minha assinatura** (`/painel/assinatura`): plano, uso mensal × limites, histórico de pagamentos, contratar/cancelar.
- **Limite de cadastros do plano FREE** (`Plan.maxUsers`, campo "Limite de cadastros gratuitos" em *Planos e cobrança*, **editável só pelo superadministrador**): teto global de contas FREE (profissionais, empresas e clientes sem assinatura paga ativa; contas suspensas e administradores não contam). Ao atingir o limite, novos cadastros recebem `403 FREE_CAPACITY_REACHED` e a página de cadastro mostra "vagas esgotadas"; quem já tem conta continua entrando. A checagem e a criação da conta rodam sob *advisory lock* (cadastros simultâneos não ultrapassam o teto). Vazio = sem limite. Status público e anônimo em `GET /api/plans/capacity` (apenas `limited`/`open`).
- **Limites de uso por plano**, aplicados no servidor de forma atômica: simulações/mês, gerações do Studio/mês e materiais salvos. Limite vazio = ilimitado (os valores comerciais ainda serão definidos pelo contratante). Administradores não sofrem limites.
- **Asaas (pagamentos): integração pronta e desligada.** Cliente, assinatura mensal, página de pagamento hospedada (PIX/boleto/cartão), webhook idempotente, suspensão por atraso, reativação, reembolso, fim automático da promoção e painel de prontidão com teste de conexão. Para operar: configurar a conta Asaas (razão social e CNPJ), as variáveis `ASAAS_*` e `BILLING_ENABLED=true`. **Passo a passo e checklist em [`docs/ASAAS.md`](docs/ASAAS.md).** Não há cobrança real enquanto isso não for feito.
- **Relatórios** (`/painel/relatorios`): crescimento de cadastros, utilização dos módulos, assinaturas, funil, exportação CSV e **falhas operacionais** (erros 5xx e alertas de integrações).
- **Segurança**: revisão, endurecimento e suíte de testes em [`docs/SEGURANCA.md`](docs/SEGURANCA.md).
- **Otimização**: páginas pesadas (mapa, gráficos, Studio/PDF) carregam sob demanda (bundle inicial de ~718 kB para ~475 kB), compressão gzip na API, cache curto em listas públicas.
- Política de Privacidade passa a incluir o texto de pagamentos automaticamente quando a cobrança estiver ativa.
