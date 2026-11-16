# Revisão de segurança (Fase 9)

Revisão feita sobre o backend e o frontend, com testes automatizados que fazem o controle valer no futuro (`backend/src/test/security.test.js`).

## O que foi verificado e como
| Área | Verificação | Resultado |
|---|---|---|
| Autenticação | Um teste enumera **todas** as rotas do Express e exige 401 sem token em tudo que não está na lista pública explícita (a lista também é validada contra rotas inexistentes) | OK |
| Autorização (RBAC) | Matriz de 21 rotas administrativas × papéis PROFISSIONAL/EMPRESA/CLIENTE/MODERADOR: todos 403 | OK |
| Escalada de privilégio | Token forjado com `role: SUPERADMIN` não eleva (papel vem do banco) | OK |
| JWT | Segredo errado, `alg=none`, expirado e `sub` inexistente → 401 | OK |
| Sessão | Cookie `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`; rotação do refresh token; reuso tardio revoga todas as sessões | OK |
| Força bruta | Limite por IP **e** por e-mail no login (429) | Melhorado |
| Mass assignment | `status`, `featured`, `userId`, `slug`, `role` enviados pelo cliente são descartados | OK |
| Injeção SQL | Prisma parametrizado; payloads clássicos em filtros testados; consulta crua do contador usa parâmetros | OK |
| Byte NUL (`\u0000`) | **Falha encontrada**: causava erro 500 no PostgreSQL. Agora é rejeitado com 400 em toda query/body | Corrigido |
| XSS | React escapa; API devolve JSON com `nosniff`; URLs do portfólio/site só `http(s)`; SVG do logotipo gerado e escapado no servidor | OK |
| Cabeçalhos | CSP restritiva (`default-src 'none'`, `frame-ancestors 'none'`), HSTS, nosniff, sem `x-powered-by` | Melhorado |
| CORS | Origem única configurada, nunca `*`, nunca reflete origem estranha | OK |
| Corpo grande / JSON inválido | 413 / 400 sem vazar detalhes internos (antes caía em 500) | Corrigido |
| Vazamento de segredos | Nenhuma resposta contém hash de senha ou de token; segredos fora do repositório (`.env` ignorado) | OK |
| Documentação da API | Swagger **desligado em produção** (`ENABLE_DOCS=true` para ligar) | Melhorado |
| Pagamentos | Webhook com token em tempo constante, idempotente; cartão nunca toca o servidor; CPF/CNPJ não é gravado | OK |
| Dependências | `npm audit`: frontend sem vulnerabilidades. Backend: 3 avisos de severidade alta em `deepmerge-ts`, **dependência do CLI do Prisma (ferramenta de migração, não do servidor em execução)**; a correção exige atualização major do Prisma (`--force`) e deve ser planejada | Em acompanhamento |

## Recomendações de implantação (fora do código)
- **HTTPS obrigatório** e `COOKIE_SECURE=true` em produção.
- **Frontend e API no mesmo "site"** (ex.: `app.dominio.com` e `api.dominio.com`) porque o cookie é `SameSite=Strict`; em domínios totalmente diferentes a sessão não será enviada.
- Servir o frontend com **CSP**, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` pelo servidor web (o CSP precisa liberar `fonts.googleapis.com`, `fonts.gstatic.com` e `tile.openstreetmap.org`).
- Rotacionar `JWT_ACCESS_SECRET`, chaves do Asaas e senha do superadmin do seed (a do `.env.example` é só de desenvolvimento).
- **Backups** do PostgreSQL com teste de restauração; política de retenção de logs (ainda a definir pelo contratante).
- Monitorar *Relatórios → Falhas operacionais* e configurar alertas externos (uptime, erros).
- Restringir o acesso ao banco à rede privada; usuário de aplicação sem privilégios de DDL.
- Revisar periodicamente `npm audit` e atualizar o Prisma 6 → versão corrigida.

## Limitações conhecidas
- O cadastro revela se um e-mail já existe (409) — troca consciente de usabilidade por privacidade; o login não vaza essa informação.
- Rate limit em memória: com várias instâncias da API use um *store* compartilhado (Redis).
- Não há autenticação em dois fatores nem verificação de e-mail.
- O Studio mostra contato nas peças apenas se o próprio usuário preencher.
