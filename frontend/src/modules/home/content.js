// Conteúdo da home (textos e FAQ). O FAQ alimenta tanto a seção visível quanto o JSON-LD FAQPage.
export const HERO = {
  eyebrow: 'Volta Redonda e Sul Fluminense',
  title: 'Encontre e divulgue profissionais autônomos em Volta Redonda e região',
  subtitle: 'O CHAMALÁFREE conecta autônomos, MEIs, clientes e empresas. Cadastre seus serviços de graça, receba oportunidades compatíveis com o seu perfil e contrate com mais segurança.',
  chips: ['Cadastro gratuito', 'Perfis aprovados pela moderação', 'Contato só com autorização'],
}

export const STEPS = {
  pro: { title: 'Se você é profissional ou MEI', steps: [
    ['Crie sua conta e seu perfil', 'Informe categoria, serviços, cidade, regiões atendidas, modalidade e portfólio.'],
    ['Aguarde a aprovação', 'Nossa equipe revisa o perfil antes de ele aparecer no catálogo público.'],
    ['Seja encontrado e receba indicações', 'Apareça nas buscas e veja oportunidades compatíveis, com o motivo de cada indicação.'],
    ['Manifeste interesse', 'Escolha as oportunidades que fazem sentido e fale com o cliente pelo canal informado.'],
  ] },
  client: { title: 'Se você quer contratar', steps: [
    ['Busque por serviço e cidade', 'Procure por eletricista, diarista, pintor, fotógrafo e muito mais, no bairro ou na região.'],
    ['Compare perfis', 'Veja serviços, regiões atendidas, portfólio e disponibilidade de cada profissional.'],
    ['Entre em contato ou publique uma demanda', 'Fale com quem divulgou contato ou, se for empresa, publique uma oportunidade para receber interessados.'],
  ] },
}

export const AUDIENCES = [
  { title: 'Autônomos e MEIs', text: 'Ganhe visibilidade online com uma página própria, link amigável e presença no catálogo local, sem precisar de site.', cta: ['Criar meu perfil grátis', '/cadastro'] },
  { title: 'Clientes', text: 'Encontre prestadores de serviço perto de você, compare perfis e escolha com mais informação.', cta: ['Buscar profissionais', '/profissionais'] },
  { title: 'Empresas e anunciantes', text: 'Publique demandas reais, passe pela moderação e receba profissionais interessados e compatíveis.', cta: ['Publicar uma oportunidade', '/cadastro'] },
  { title: 'Quem quer empreender', text: 'Avalie cenários financeiros e consulte indicadores do município antes de investir em uma atividade.', cta: ['Conhecer as ferramentas', '#ferramentas'] },
]

export const TOOLS = [
  { name: 'Perfil público e catálogo', text: 'Página própria do seu negócio com serviços, regiões atendidas e portfólio, pesquisável por nome, categoria, cidade e bairro.' },
  { name: 'CHAMALÁ Conecta', text: 'Indica oportunidades compatíveis com o seu perfil por regras claras, com índice de compatibilidade e a justificativa de cada recomendação.' },
  { name: 'CHAMALÁ Mapa', text: 'Mapa com indicadores do IBGE por município (população, PIB, estabelecimentos por setor), sempre com fonte, data e limitações.' },
  { name: 'CHAMALÁ Insights', text: 'Simula milhares de cenários financeiros e mostra probabilidade de prejuízo, ponto de equilíbrio e retorno. É uma estimativa, não uma garantia de faturamento.' },
  { name: 'CHAMALÁ Studio', text: 'Textos para redes sociais, kit de marca com logotipo, cartões e posts em PNG/PDF e calendário de conteúdo. Nada é publicado sem você.' },
]

export const TRUST = [
  ['Moderação de perfis e anúncios', 'Todo perfil e toda oportunidade passam por aprovação antes de aparecer publicamente.'],
  ['Alertas contra anúncios suspeitos', 'Pedidos de pagamento antecipado, links encurtados e promessas de ganho fácil são sinalizados para a moderação.'],
  ['Contato só com autorização', 'O WhatsApp do profissional só aparece se ele autorizar, e o contato da empresa só é revelado a quem manifesta interesse.'],
  ['Dados com fonte e limitações', 'Indicadores territoriais mostram a fonte, o período e o que o dado não representa. Onde não há dado, dizemos que não há.'],
  ['Recomendações explicadas', 'Cada indicação mostra por que foi feita e como o índice de compatibilidade foi calculado.'],
  ['Seus dados, suas regras', 'Você pode solicitar a atualização ou a exclusão dos seus dados e desativar notificações a qualquer momento.'],
]

export const FAQ = [
  ['O CHAMALÁFREE é gratuito?', 'Sim. O plano FREE inclui perfil público básico, divulgação dos seus serviços, contato direto e participação no catálogo. O plano PRO ainda não está disponível e nenhuma cobrança foi ativada.'],
  ['Como me cadastro como profissional autônomo ou MEI?', 'Crie uma conta de profissional, preencha seu perfil (categoria, serviços, cidade e regiões atendidas) e envie para aprovação. Depois de aprovado, seu perfil aparece no catálogo público.'],
  ['Preciso ser MEI para participar?', 'Não necessariamente. A plataforma é voltada a autônomos e microempreendedores. Para dúvidas sobre formalização e impostos, consulte um contador.'],
  ['Como as oportunidades são recomendadas?', 'Por regras e pesos configuráveis: categoria e serviço, localização, qualificações, disponibilidade, modalidade e preferências. Cada recomendação mostra o índice e o motivo, e profissionais de categorias incompatíveis não recebem a indicação.'],
  ['Meu telefone fica público?', 'Somente se você autorizar no seu perfil. Sem autorização, seu contato não é exibido no catálogo.'],
  ['As simulações financeiras garantem faturamento?', 'Não. O CHAMALÁ Insights é uma estimativa baseada nas premissas que você informa e em distribuições de probabilidade simplificadas. Ele mostra riscos e cenários, mas não prevê nem garante resultados.'],
  ['Como a plataforma evita golpes e anúncios falsos?', 'Perfis e oportunidades passam por moderação, anúncios com sinais suspeitos são destacados para análise, e o canal de contato da empresa só é revelado a profissionais que manifestam interesse.'],
  ['Em quais cidades funciona?', 'Começamos por Volta Redonda e a arquitetura permite expansão gradual pelo Sul Fluminense, pelo estado do Rio de Janeiro e, futuramente, por outras regiões. O Mapa já traz dados do IBGE de municípios da região.'],
]
