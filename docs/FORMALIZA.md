# CHAMALÁ Formaliza — configuração e operação

Página pública `/formalize-seu-negocio` ("Formalize seu negócio" no menu). Ela apresenta o serviço e leva a uma **consultoria online de 30 minutos**, agendada **pelo WhatsApp**: o botão "Agendar pelo WhatsApp" abre a conversa com o número da equipe, com uma mensagem pronta. Não há cadastro, painel próprio, calendário próprio nem integração com a API do WhatsApp; o acompanhamento fica numa planilha.

## 1. Número e mensagem (painel do superadministrador)
1. Entre como **superadministrador** e abra **Configurações** no menu do painel.
2. Informe o **número do WhatsApp** (com DDI e DDD, ex.: `+55 24 99946-8823`) e a **mensagem pronta**. Use "Testar no WhatsApp" para conferir antes de salvar.
3. Marque/desmarque **Ativar o agendamento** e salve. Vale na hora, sem novo deploy. Desligado, a página mostra "Agendamento em breve".
4. Por padrão já vem ativo com o número `+55 24 99946-8823` e uma mensagem pedindo nome, o que a pessoa pretende fazer ou vender e melhores dias e horários.
5. Ao ativar, a Política de Privacidade inclui o parágrafo sobre a conversa de agendamento (revise com o jurídico).
6. Só o superadministrador acessa essa tela, e cada alteração fica na Auditoria. A configuração fica no banco (tabela `SiteSetting`); em produção, a migration é aplicada pelo build da Vercel.

## 2. Combinando o horário
- A pessoa envia a mensagem; a equipe responde e combina o dia e o horário dentro da disponibilidade: segunda a sexta, **17h às 22h**; sábado e domingo, **9h às 15h** (horário de Brasília). Reserve **10 minutos** entre atendimentos.
- A conversa é por **voz ou vídeo pelo WhatsApp**.
- Sugestão: use o **WhatsApp Business** (gratuito) no número, com mensagem de saudação e de ausência informando os horários. Não há controle automático de conflito de horários: anote cada consulta na planilha.

## 3. Acompanhamento
- Os agendamentos são combinados na conversa (confirmar, remarcar, cancelar) e registrados na planilha.
- O acompanhamento de cada pessoa é feito na planilha modelo [`docs/modelos/acompanhamento-formaliza.csv`](modelos/acompanhamento-formaliza.csv) (abre no Excel). Campos: nome do cliente, contato, data da consultoria, atividade pretendida, CNAE em análise, situação do atendimento e próxima ação.
- Sugestão de valores para *Situação do atendimento*: Agendada, Realizada, Em orientação, Aguardando cliente, Formalizado, Cancelada.
- Guarde a planilha em local de **acesso restrito** (OneDrive/SharePoint ou Drive da equipe). Ela contém dados pessoais.

## 4. Cuidados
- O atendimento **nunca** pede senha nem código de autenticação do gov.br: a pessoa faz o próprio acesso.
- Valores da consultoria ou do acompanhamento só podem ser divulgados após a definição comercial (a página já avisa que serão informados antes da contratação).
- O serviço é independente e não representa o governo.
