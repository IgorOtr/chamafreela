# CHAMALÁ Formaliza — configuração e operação

Página pública `/formalize-seu-negocio` ("Formalize seu negócio" no menu). Ela apresenta o serviço e leva ao agendamento de uma **consultoria online de 30 minutos**. Não há cadastro, painel próprio, calendário próprio nem integração com a API do WhatsApp: o agendamento fica numa ferramenta pronta, e o acompanhamento numa planilha.

## 1. Ligar o botão de agendamento (painel do superadministrador)
1. Configure a agenda (seção 2) e copie o **link público da página de reserva**.
2. Entre como **superadministrador**, abra **Configurações** no menu do painel, cole o link (`https://...`), marque **Ativar o agendamento** e salve. Vale na hora, sem novo deploy.
3. Sem link, ou com o agendamento desligado, a página funciona e o botão aparece como "Agendamento em breve". Só links `https://` são aceitos.
4. Ao ativar, a Política de Privacidade passa a incluir automaticamente o parágrafo sobre o agendamento (revise com o jurídico).
5. Só o superadministrador acessa essa tela, e cada alteração fica registrada na Auditoria. A configuração fica no banco (tabela `SiteSetting`); em produção, a migration é aplicada pelo build da Vercel.

## 2. Configurar a agenda (Microsoft Bookings)
Os nomes dos menus podem variar conforme a versão do Microsoft 365. O Bookings exige uma assinatura Microsoft 365 empresarial que o inclua.

1. Acesse o **Bookings** (Microsoft 365) e crie uma agenda de reservas, por exemplo "CHAMALÁ Formaliza". Defina o **fuso horário** como *Brasília*.
2. Crie **dois serviços**, um por modalidade (assim cada um gera o tipo certo de reunião):
   - **Consultoria de formalização — Teams** (30 min): ative **Adicionar reunião online** (link do Teams automático).
   - **Consultoria de formalização — WhatsApp** (30 min): sem reunião online. Na descrição/local: "A equipe ligará para o WhatsApp informado (voz ou vídeo)".
3. Em cada serviço, defina o **intervalo após o atendimento: 10 minutos**.
4. Defina a **disponibilidade** da equipe: segunda a sexta, **17h às 22h**; sábado e domingo, **9h às 15h**. O Bookings impede reservas simultâneas no mesmo horário.
5. Em **informações do cliente**, deixe somente: **Nome, E-mail, Telefone (WhatsApp)** e **Observações** (renomeie para "Breve descrição do negócio"). A modalidade é a escolha do serviço.
6. Ative os **e-mails de confirmação e lembrete** do Bookings.
7. Publique a página de reserva e copie o link para a seção 1.

Alternativas: ferramentas como o Cal.com cobrem os mesmos itens (duração, intervalo, horários por dia da semana, perguntas extras, Teams). Confirme no plano escolhido se o gratuito atende.

## 3. Acompanhamento
- Os agendamentos são geridos na própria ferramenta (confirmar, remarcar, cancelar).
- O acompanhamento de cada pessoa é feito na planilha modelo [`docs/modelos/acompanhamento-formaliza.csv`](modelos/acompanhamento-formaliza.csv) (abre no Excel). Campos: nome do cliente, contato, data da consultoria, atividade pretendida, CNAE em análise, situação do atendimento e próxima ação.
- Sugestão de valores para *Situação do atendimento*: Agendada, Realizada, Em orientação, Aguardando cliente, Formalizado, Cancelada.
- Guarde a planilha em local de **acesso restrito** (OneDrive/SharePoint ou Drive da equipe). Ela contém dados pessoais.

## 4. Cuidados
- O atendimento **nunca** pede senha nem código de autenticação do gov.br: a pessoa faz o próprio acesso.
- Valores da consultoria ou do acompanhamento só podem ser divulgados após a definição comercial (a página já avisa que serão informados antes da contratação).
- O serviço é independente e não representa o governo.
