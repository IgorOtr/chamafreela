// Conteúdo da Política de Privacidade. Descreve SOMENTE o que o sistema faz hoje. Se o tratamento mudar
// (ex.: pagamentos, IA, analytics), este arquivo e a versão da política devem ser atualizados.
export const SUMMARY = [
  'Coletamos só o que é necessário para criar sua conta, montar seu perfil e conectar profissionais, clientes e empresas.',
  'Seu telefone/WhatsApp só aparece publicamente se você autorizar. O contato de uma empresa só é revelado a quem manifesta interesse.',
  'Suas simulações financeiras e seus materiais do Studio são privados: só você acessa.',
  'Hoje não usamos cookies de publicidade ou de análise, não enviamos dados pessoais a serviços de inteligência artificial e não coletamos dados de pagamento.',
  'Você pode pedir acesso, correção, exclusão e portabilidade dos seus dados no painel, em “Privacidade e dados”.',
]

export const SECTIONS = [
  {
    id: 'controlador', title: '1. Quem é o responsável pelos seus dados',
    blocks: [
      { p: 'O CHAMALÁFREE é uma plataforma digital que conecta trabalhadores autônomos, microempreendedores, clientes e empresas, com atuação inicial em Volta Redonda/RJ. Esta política explica como tratamos dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).' },
      { controller: true },
    ],
  },
  {
    id: 'dados', title: '2. Quais dados coletamos',
    blocks: [
      { p: 'Coletamos dados que você nos fornece e dados gerados pelo uso da plataforma:' },
      { table: { head: ['Categoria', 'Exemplos', 'Origem'], rows: [
        ['Conta', 'nome, e-mail, senha (guardada apenas em formato criptografado/hash), tipo de conta, data do aceite desta política', 'Você, no cadastro'],
        ['Perfil profissional', 'nome ou nome comercial, categoria, descrição, serviços, cidade e bairro, regiões atendidas, modalidade, WhatsApp e outros contatos, experiência, qualificações, disponibilidade, preferências, links do portfólio', 'Você, no seu perfil'],
        ['Empresa', 'nome fantasia, razão social, CNPJ, telefone, site, cidade, nome e cargo do responsável', 'Você, no perfil da empresa'],
        ['Oportunidades e interesses', 'conteúdo das oportunidades publicadas, canal de contato informado, mensagens enviadas ao manifestar interesse', 'Você, ao usar o recurso'],
        ['Recomendações e notificações', 'índice de compatibilidade e justificativa das oportunidades indicadas, avisos dentro da plataforma, sua preferência de notificação', 'Geradas pela plataforma a partir do seu perfil'],
        ['Simulações (CHAMALÁ Insights)', 'valores financeiros e premissas informados, resultados calculados', 'Você, ao simular'],
        ['Materiais (CHAMALÁ Studio)', 'kit da marca, logotipo, textos, peças e calendários salvos', 'Você, ao criar'],
        ['Solicitações de privacidade', 'tipo de pedido (atualização ou exclusão) e mensagem', 'Você, ao solicitar'],
        ['Registros técnicos e de segurança', 'endereço IP e data/hora de operações administrativas e de exportação de dados, sessões de login (guardadas de forma não reversível)', 'Gerados automaticamente'],
      ] } },
      { p: 'Dados territoriais e econômicos exibidos no CHAMALÁ Mapa vêm de fontes públicas (IBGE) e não são dados pessoais. As contagens da plataforma por município são agregadas e não identificam pessoas.' },
    ],
  },
  {
    id: 'finalidades', title: '3. Para que usamos seus dados e em quais bases legais',
    blocks: [
      { table: { head: ['Finalidade', 'Base legal (LGPD, art. 7º)'], rows: [
        ['Criar e manter sua conta, autenticar seu acesso e prestar o serviço contratado', 'Execução de contrato ou de procedimentos preliminares (inciso V)'],
        ['Exibir seu perfil público e as oportunidades aprovadas, e permitir buscas e filtros', 'Execução de contrato (inciso V)'],
        ['Publicar seus contatos (WhatsApp e outros) no perfil público', 'Consentimento (inciso I), que você pode revogar a qualquer momento'],
        ['Indicar oportunidades compatíveis e enviar avisos dentro da plataforma', 'Execução de contrato (inciso V); você pode desativar os avisos'],
        ['Moderar perfis e anúncios, prevenir fraudes e golpes e manter registros de auditoria', 'Legítimo interesse (inciso IX) e proteção ao crédito e à segurança; cumprimento de obrigação legal quando aplicável (inciso II)'],
        ['Atender suas solicitações de privacidade e exercer direitos em processos', 'Cumprimento de obrigação legal (inciso II) e exercício regular de direitos (inciso VI)'],
        ['Gerar simulações e materiais de marketing para você', 'Execução de contrato (inciso V)'],
      ] } },
      { p: 'Não vendemos seus dados e não os usamos para publicidade de terceiros.' },
    ],
  },
  {
    id: 'publico-privado', title: '4. O que fica público e o que fica privado',
    blocks: [
      { h: 'Público (somente depois da aprovação pela moderação)' },
      { ul: ['Perfil do profissional: nome comercial, categoria, descrição, serviços, cidade, bairro, regiões atendidas, portfólio, experiência e qualificações informadas.', 'Contato do profissional (WhatsApp e outros): somente se você marcar a autorização no seu perfil.', 'Oportunidades: título, descrição, categoria, local, prazo, remuneração e nome fantasia da empresa.'] },
      { h: 'Privado' },
      { ul: ['E-mail, senha, data do aceite, CNPJ, telefone e responsável da empresa.', 'Canal de contato da oportunidade: revelado apenas a profissionais com perfil aprovado que manifestam interesse.', 'Quando um profissional manifesta interesse, a empresa dona da oportunidade vê o perfil público dele, a mensagem enviada e, se autorizado, o contato.', 'Simulações, kit da marca, textos, peças e calendários: visíveis apenas para você.', 'Solicitações de privacidade e registros de auditoria: acessíveis apenas à equipe autorizada.'] },
    ],
  },
  {
    id: 'compartilhamento', title: '5. Com quem compartilhamos e serviços de terceiros',
    blocks: [
      { p: 'Não compartilhamos seus dados pessoais com terceiros para fins comerciais. Podem ter acesso a dados, na medida do necessário: a equipe autorizada do CHAMALÁFREE (moderação e administração), os prestadores de infraestrutura que hospedam a plataforma, e autoridades, quando exigido por lei ou ordem judicial.' },
      { p: 'Ao usar o site, seu navegador faz requisições diretas a estes serviços, que podem receber seu endereço IP e dados técnicos do navegador:' },
      { ul: ['Google Fonts (fontes de texto): carregadas dos servidores do Google em todas as páginas.', 'OpenStreetMap (mapas): imagens do mapa carregadas dos servidores da fundação OpenStreetMap no CHAMALÁ Mapa.', 'IBGE: usamos dados públicos do IBGE; nenhum dado pessoal seu é enviado ao IBGE.'] },
      { p: 'Atualmente não usamos serviços de inteligência artificial externos e não enviamos dados pessoais a eles. Também não há cobrança nem coleta de dados de pagamento. Se qualquer um desses recursos for adotado no futuro, atualizaremos esta política antes e, quando necessário, pediremos o seu consentimento.' },
    ],
  },
  {
    id: 'cookies', title: '6. Cookies e armazenamento no navegador',
    blocks: [
      { p: 'Usamos apenas um cookie estritamente necessário: o de sessão (“refresh_token”), que mantém você conectado, é inacessível por scripts (HttpOnly) e é enviado apenas ao nosso servidor. Seu acesso de curta duração fica na memória da página e não é gravado no navegador.' },
      { p: 'Não usamos cookies de publicidade, de rastreamento nem de análise de audiência. Se isso mudar, você será informado e poderá escolher.' },
    ],
  },
  {
    id: 'retencao', title: '7. Por quanto tempo guardamos seus dados',
    blocks: [
      { p: 'Mantemos seus dados enquanto sua conta estiver ativa e pelo tempo necessário para cumprir obrigações legais, exercer direitos em processos e garantir a segurança da plataforma (como os registros de auditoria). A sessão de login expira automaticamente e é revogada ao sair.' },
      { p: 'Ao pedir a exclusão, eliminaremos ou anonimizaremos seus dados, ressalvadas as hipóteses em que a lei autoriza ou exige a conservação (LGPD, art. 16).' },
    ],
  },
  {
    id: 'seguranca', title: '8. Como protegemos seus dados',
    blocks: [
      { ul: ['Senhas armazenadas com hash seguro; nunca em texto aberto.', 'Controle de acesso por tipo de conta, verificado no servidor.', 'Limite de tentativas de login e proteção contra abuso de formulários.', 'Validação de todos os dados recebidos e proteção contra ataques comuns (como injeção de SQL e XSS).', 'Conexão criptografada (HTTPS) no ambiente de produção.', 'Registro de operações administrativas e críticas.'] },
      { p: 'Nenhum sistema é totalmente imune a falhas, mas trabalhamos para reduzir riscos e corrigir problemas com rapidez.' },
    ],
  },
  {
    id: 'direitos', title: '9. Seus direitos e como exercê-los',
    blocks: [
      { p: 'A LGPD (art. 18) garante a você, entre outros direitos: confirmação de que tratamos seus dados; acesso; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; portabilidade; informação sobre compartilhamentos; revogação do consentimento; e oposição a tratamentos baseados em hipóteses que dispensam consentimento.' },
      { p: 'Como exercer: acesse o painel em “Privacidade e dados”, onde você pode baixar uma cópia de todos os seus dados (arquivo JSON) e registrar pedidos de atualização ou exclusão. Você também pode corrigir seus dados diretamente no seu perfil e desativar notificações a qualquer momento. Pedidos adicionais podem ser enviados ao contato indicado na seção 15. Responderemos nos prazos previstos na LGPD.' },
      { p: 'Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).' },
    ],
  },
  {
    id: 'automatizadas', title: '10. Recomendações automatizadas',
    blocks: [
      { p: 'O CHAMALÁ Conecta compara seu perfil com as oportunidades publicadas por regras e pesos definidos pela administração (categoria e serviço, localização, qualificações, disponibilidade, modalidade e preferências) e calcula um índice de compatibilidade. Cada recomendação mostra a justificativa e o cálculo. Esse tratamento não usa aprendizado de máquina, não restringe seu acesso à plataforma e não impede você de ver e se candidatar a outras oportunidades. Você pode pedir a revisão de uma recomendação pelos nossos canais de contato.' },
    ],
  },
  {
    id: 'menores', title: '11. Crianças e adolescentes',
    blocks: [{ p: 'A plataforma não é destinada a menores de 18 anos, e não coletamos intencionalmente dados de crianças e adolescentes. Se identificarmos um cadastro nessa situação, ele poderá ser removido.' }],
  },
  {
    id: 'internacional', title: '12. Transferência internacional de dados',
    blocks: [{ p: 'Alguns serviços de terceiros citados na seção 5 e a infraestrutura de hospedagem podem armazenar ou processar dados fora do Brasil. Quando isso ocorrer, observaremos as garantias previstas na LGPD (arts. 33 a 36).' }],
  },
  {
    id: 'incidentes', title: '13. Incidentes de segurança',
    blocks: [{ p: 'Se ocorrer um incidente que possa acarretar risco ou dano relevante aos titulares, comunicaremos a ANPD e as pessoas afetadas, nos termos da LGPD.' }],
  },
  {
    id: 'alteracoes', title: '14. Alterações desta política',
    blocks: [{ p: 'Podemos atualizar esta política para refletir mudanças na plataforma ou na lei. A versão vigente e a data da última atualização aparecem no topo desta página. Em mudanças relevantes, avisaremos você pela plataforma.' }],
  },
  {
    id: 'contato', title: '15. Contato',
    blocks: [{ contact: true }],
  },
]

// Variante da política quando a cobrança (Asaas) está ATIVA. O texto padrão acima vale enquanto não há pagamentos.
const PAYMENT_ROW = ['Pagamentos e assinaturas', 'plano contratado, situação da assinatura, valores, datas e forma de pagamento, identificadores da cobrança no gateway. O CPF/CNPJ informado para emitir a cobrança é repassado ao gateway e não é armazenado por nós; dados de cartão não passam pelo nosso servidor', 'Você, ao contratar, e o gateway de pagamento']
const PAYMENT_PURPOSE = ['Processar a contratação de plano pago, cobrar, conciliar pagamentos e prevenir fraudes', 'Execução de contrato (inciso V) e cumprimento de obrigações legais e fiscais (inciso II)']
const PAYMENT_PARAGRAPH = 'Quando você contrata um plano pago, o pagamento é processado pelo Asaas, nosso gateway de pagamento. O Asaas recebe os dados necessários para emitir a cobrança (nome, e-mail e CPF/CNPJ) e trata os dados de pagamento, inclusive de cartão, conforme a sua própria política de privacidade. Atualmente não usamos serviços de inteligência artificial externos e não enviamos dados pessoais a eles. Se qualquer outro recurso que envolva dados pessoais for adotado no futuro, atualizaremos esta política antes e, quando necessário, pediremos o seu consentimento.'

export function forBilling(on) {
  if (!on) return { summary: SUMMARY, sections: SECTIONS }
  const summary = SUMMARY.map((s) => (s.startsWith('Hoje não usamos cookies') ? 'Hoje não usamos cookies de publicidade ou de análise nem enviamos dados pessoais a serviços de inteligência artificial. Pagamentos de planos pagos são processados pelo Asaas, em página segura: não guardamos dados de cartão.' : s))
  const sections = SECTIONS.map((sec) => ({
    ...sec,
    blocks: sec.blocks.map((b) => {
      if (sec.id === 'dados' && b.table) return { table: { ...b.table, rows: [...b.table.rows.slice(0, -1), PAYMENT_ROW, b.table.rows.at(-1)] } }
      if (sec.id === 'finalidades' && b.table) return { table: { ...b.table, rows: [...b.table.rows, PAYMENT_PURPOSE] } }
      if (sec.id === 'compartilhamento' && b.p?.startsWith('Atualmente não usamos serviços de inteligência artificial')) return { p: PAYMENT_PARAGRAPH }
      return b
    }),
  }))
  return { summary, sections }
}

// Variante da política quando o serviço CHAMALÁ Formaliza (agendamento de consultoria) está ATIVO.
const FORMALIZA_ROW = ['Agendamento de consultoria (CHAMALÁ Formaliza)', 'nome, número de WhatsApp, descrição breve do negócio e preferências de dia e horário, enviados na conversa de agendamento', 'Você, ao agendar']
const FORMALIZA_PURPOSE = ['Marcar e realizar a consultoria de formalização solicitada por você e acompanhar o atendimento', 'Procedimentos preliminares a pedido do titular (inciso V)']
const FORMALIZA_PARAGRAPH = 'Ao agendar uma consultoria em "Formalize seu negócio", a conversa acontece pelo WhatsApp, serviço de terceiros que trata os dados conforme a sua própria política de privacidade, e as informações necessárias são registradas em uma planilha de acompanhamento de acesso restrito à nossa equipe. Usamos esses dados apenas para marcar e realizar o atendimento. Nunca pedimos senhas nem códigos de autenticação da sua conta gov.br.'

export function withFormaliza({ summary, sections }, on) {
  if (!on) return { summary, sections }
  return {
    summary,
    sections: sections.map((sec) => ({
      ...sec,
      blocks: [
        ...sec.blocks.map((b) => {
          if (sec.id === 'dados' && b.table) return { table: { ...b.table, rows: [...b.table.rows.slice(0, -1), FORMALIZA_ROW, b.table.rows.at(-1)] } }
          if (sec.id === 'finalidades' && b.table) return { table: { ...b.table, rows: [...b.table.rows, FORMALIZA_PURPOSE] } }
          return b
        }),
        ...(sec.id === 'compartilhamento' ? [{ p: FORMALIZA_PARAGRAPH }] : []),
      ],
    })),
  }
}
