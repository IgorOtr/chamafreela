# Integração com o Asaas (pagamentos)

**Estado atual: implementada e DESLIGADA.** Nada é cobrado até que o contratante conclua o cadastro no Asaas (precisa de razão social e CNPJ), aprove as condições comerciais e alguém habilite `BILLING_ENABLED=true`. Sem isso, planos pagos mostram "Disponível em breve" e o servidor recusa qualquer checkout (`BILLING_DISABLED`).

## Como funciona
1. O usuário escolhe um plano pago em **Minha assinatura**, informa CPF/CNPJ e a forma de pagamento (PIX, boleto, cartão ou "escolher na próxima tela").
2. O backend cria (ou atualiza) o **cliente** no Asaas e uma **assinatura mensal**, e devolve o link da página de pagamento hospedada pelo Asaas. **Dados de cartão nunca passam pelo nosso servidor** e o CPF/CNPJ é apenas repassado ao Asaas (não é gravado).
3. A assinatura local fica `PENDENTE` (o usuário continua no FREE) até o **webhook** confirmar o pagamento.
4. `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` → assinatura `ATIVA` (benefícios e limites do plano), outras assinaturas ativas do usuário (ex.: concessão manual) são encerradas.
5. `PAYMENT_OVERDUE` → assinatura `EXPIRADA` (volta ao FREE); um pagamento posterior reativa.
6. `PAYMENT_REFUNDED` → pagamento `REEMBOLSADO`. `SUBSCRIPTION_DELETED`/`INACTIVATED` → `CANCELADA`.
7. **Promoção** (padrão: R$ 9,99 nos 3 primeiros meses, depois R$ 14,90): vale só na primeira contratação paga do usuário. Ao registrar o 3º pagamento, a assinatura é atualizada no Asaas para o valor cheio.
8. Cancelar no sistema cancela a assinatura no Asaas.

Webhooks são **idempotentes** (tabela `WebhookEvent`), autenticados por token em tempo constante e registram auditoria/alertas (`SystemEvent`) em anomalias.

## Checklist para começar a operar
1. **Conta Asaas**: criar com razão social e CNPJ e concluir a validação da conta (os dados da empresa são do cadastro no Asaas; o sistema não precisa deles).
2. **Sandbox primeiro**: gerar a chave de API do *sandbox* e testar todo o fluxo sem cobrança real.
3. **Variáveis de ambiente do backend** (`backend/.env`):
   ```
   ASAAS_ENV=sandbox            # production somente após os testes
   ASAAS_API_KEY=<chave>        # nunca no repositório nem no frontend
   ASAAS_WEBHOOK_TOKEN=<texto aleatório com 32+ caracteres>
   BILLING_ENABLED=true
   ```
   O servidor **não inicia** com `BILLING_ENABLED=true` sem chave e token.
4. **Webhook no Asaas** (Integrações → Webhooks): URL `https://<seu-dominio-da-api>/api/billing/webhook/asaas`, o mesmo token em "Token de autenticação", eventos de **cobranças** e de **assinaturas**, fila ativada. A rota exige HTTPS em produção.
5. No painel (**Planos → Cobrança (Asaas)**): conferir o checklist, clicar em **Testar conexão** e marcar o plano PRO como *disponível*.
6. **Teste ponta a ponta no sandbox**: contratar o PRO, pagar (o sandbox permite simular o pagamento), ver a assinatura ativar, cancelar, e simular atraso.
7. **Antes de produção**: atualizar a *Política de Privacidade* (a página já passa a exibir o texto de pagamentos quando a cobrança está ativa — revisar com o jurídico), definir Termos de Uso, política de cancelamento/reembolso e emissão de nota fiscal (se aplicável). Só então trocar para `ASAAS_ENV=production` com a chave de produção e **a autorização expressa do contratante**.

## Observações técnicas
- URLs: produção `https://api.asaas.com/v3`; sandbox `https://api-sandbox.asaas.com/v3` (sobrescrevíveis com `ASAAS_BASE_URL` — confirme na documentação do Asaas se mudarem).
- A API do Asaas exige `access_token` e `User-Agent`; ambos são enviados.
- Erros 400 do Asaas (ex.: CPF/CNPJ inválido) viram mensagens ao usuário; demais falhas viram 502 genérico e geram alerta em *Relatórios → Falhas operacionais*.
- A suíte de testes usa uma API do Asaas **simulada** (nenhum teste chama a rede). Faça os testes reais no sandbox.
- O código do adaptador está em `backend/src/integrations/payments/asaas.js`; outro gateway pode ser plugado implementando a mesma interface em `gateway.js`.
