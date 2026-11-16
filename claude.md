# PROJETO CHAMALÁFREE — ESPECIFICAÇÃO COMPLETA DE DESENVOLVIMENTO

## 1. PAPEL DO AGENTE

Atue como um Engenheiro de Software Sênior, Arquiteto de Sistemas e Desenvolvedor Full Stack, com experiência em:

- React.js e Tailwind CSS.
- Node.js e Express.js.
- PostgreSQL e Prisma ORM.
- Arquitetura modular e escalável.
- Sistemas geográficos e geolocalização.
- Inteligência artificial aplicada a negócios.
- Análise de dados e simulações probabilísticas.
- Segurança de aplicações e LGPD.
- UX/UI Design de plataformas SaaS.

Sua missão é projetar e desenvolver a plataforma CHAMALÁFREE, seguindo os requisitos funcionais e técnicos descritos neste documento.

Não desenvolva apenas uma demonstração visual. O objetivo é construir uma aplicação funcional, com banco de dados, autenticação, regras de negócio, APIs, interfaces administrativas e módulos integrados.

Antes de implementar cada módulo, analise sua relação com os demais componentes e mantenha uma arquitetura consistente.

---

# 2. APRESENTAÇÃO DO PROJETO

O CHAMALÁFREE é uma plataforma digital brasileira desenvolvida para conectar trabalhadores autônomos, microempreendedores, clientes e empresas.

**Slogan:** Transformando talento em oportunidade.

Seu propósito é ampliar a visibilidade de profissionais independentes, facilitar a divulgação de serviços e estimular novas oportunidades comerciais.

A plataforma deverá ir além de um simples catálogo de profissionais.

O objetivo é construir um ecossistema digital capaz de:

- Divulgar profissionais e seus serviços.
- Conectar prestadores de serviços a clientes e empresas.
- Identificar oportunidades comerciais.
- Analisar características econômicas e territoriais de determinadas regiões.
- Ajudar pessoas a avaliar possibilidades de empreendedorismo.
- Oferecer recomendações inteligentes para o desenvolvimento comercial.
- Disponibilizar ferramentas de marketing para pequenos empreendedores.

## 2.1 Público-alvo

- Trabalhadores autônomos.
- Microempreendedores individuais (MEIs).
- Pequenas empresas prestadoras de serviços.
- Clientes que necessitam contratar profissionais.
- Empresas que desejam divulgar vagas e contratar serviços.
- Pessoas que pretendem iniciar uma atividade empreendedora.

## 2.2 Abrangência geográfica

A implantação inicial deverá contemplar Volta Redonda/RJ.

A arquitetura deverá permitir expansão gradual para:

- Barra Mansa.
- Pinheiral.
- Piraí.
- Resende.
- Demais municípios do Sul Fluminense.
- Todo o estado do Rio de Janeiro.
- Futuramente, outras regiões brasileiras.

Não implementar restrições geográficas permanentes.

---

# 3. STACK TECNOLÓGICA OBRIGATÓRIA

Desenvolver uma aplicação independente, sem dependência de Wix ou de qualquer outra plataforma proprietária de construção de sites.

### Frontend

- React.js.
- Tailwind CSS.
- React Router para navegação.
- Axios ou Fetch API para comunicação com o backend.
- Biblioteca de gráficos para indicadores e relatórios.
- Componentes reutilizáveis.
- Layout responsivo.

### Backend

- Node.js.
- Express.js.
- Prisma ORM.
- API REST.
- JWT para autenticação.
- Middleware de autenticação e autorização.
- Validação de dados nas requisições.
- Tratamento centralizado de erros.

### Banco de dados

- PostgreSQL.
- PostGIS para operações geográficas.
- Prisma para gerenciamento de entidades e relacionamentos.
- Migrations versionadas.

### Serviços complementares

- Leaflet + OpenStreetMap para mapas.
- IBGE para informações territoriais e socioeconômicas.
- APIs públicas e autorizadas para obtenção de dados.
- JavaScript para cálculos estatísticos e simulações.
- Integrações com APIs de inteligência artificial.
- Armazenamento de arquivos em serviço compatível com S3 ou solução equivalente.

### Documentação

- Swagger / OpenAPI para documentação das APIs.
- README com instruções de instalação e execução.
- Documentação da arquitetura.
- Documentação do banco de dados.
- Documentação das variáveis de ambiente.

### Infraestrutura

Priorizar ferramentas gratuitas, open source e serviços com planos gratuitos.

Não contratar serviços pagos, ativar faturamento ou realizar integrações comerciais sem autorização expressa.

---

# 4. ARQUITETURA DO SISTEMA

Organize o projeto em duas aplicações independentes:

1. Frontend React.
2. Backend Express.js.

O banco de dados deverá ser acessado exclusivamente pelo backend.

O frontend nunca deverá acessar diretamente o PostgreSQL.

## 4.1 Organização sugerida

### Backend

Organizar o backend por módulos de negócio, utilizando separação de responsabilidades.

Estrutura de referência:

- src/
  - config/
  - modules/
    - auth/
    - users/
    - professionals/
    - companies/
    - services/
    - opportunities/
    - connections/
    - territorial/
    - insights/
    - simulations/
    - recommendations/
    - studio/
    - subscriptions/
    - notifications/
    - admin/
    - audit/
  - middlewares/
  - services/
  - integrations/
  - utils/
  - database/
  - routes/
  - app.js
  - server.js

Cada módulo deverá possuir, conforme sua necessidade:

- Routes.
- Controllers.
- Services.
- Repositories, quando necessário.
- Validators.
- DTOs ou estruturas equivalentes.
- Testes.

Evitar controllers com regras complexas de negócio.

Centralizar as regras de negócio em serviços específicos.

Não criar abstrações desnecessárias. A arquitetura deve ser simples, organizada e sustentável.

### Frontend

Organizar o frontend por funcionalidades:

- src/
  - assets/
  - components/
  - layouts/
  - pages/
  - modules/
    - auth/
    - professionals/
    - opportunities/
    - territorial/
    - insights/
    - studio/
    - companies/
    - admin/
  - hooks/
  - services/
  - contexts/
  - routes/
  - utils/
  - styles/

Criar componentes reutilizáveis para formulários, tabelas, modais, cards, gráficos, filtros, navegação e notificações.

## 4.2 Identidade visual

Desenvolver uma interface moderna, profissional e acessível.

A experiência deverá transmitir:

- Oportunidade.
- Empreendedorismo.
- Confiança.
- Tecnologia.
- Simplicidade.

Manter uma identidade visual consistente em todas as páginas.

Utilizar:

- Layouts limpos.
- Hierarquia visual clara.
- Tipografia moderna.
- Cards bem estruturados.
- Ícones consistentes.
- Estados de carregamento.
- Feedback visual de sucesso e erro.
- Estados vazios informativos.
- Design responsivo.

Não desenvolver uma interface genérica de dashboard administrativo.

O produto deverá possuir identidade visual própria.

---

# 5. MÓDULO A — CADASTRO E PERFIL DO EMPREENDEDOR

## Objetivo

Criar uma estrutura de cadastro profissional completa, permitindo que a plataforma compreenda as características, capacidades e necessidades de cada usuário.

## 5.1 Cadastro profissional

O profissional deverá poder informar:

- Nome ou nome comercial.
- Categoria profissional.
- Descrição das atividades.
- Serviços oferecidos.
- Cidade e bairro.
- Regiões atendidas.
- Raio máximo de deslocamento.
- Modalidade de atendimento: presencial, remoto ou híbrido.
- WhatsApp.
- Outros contatos comerciais.
- Imagens e vídeos do portfólio.
- Experiência profissional.
- Qualificações e certificações, quando aplicável.
- Disponibilidade para novos serviços.
- Preferências de oportunidades.

## 5.2 Perfil público

Cada profissional deverá possuir:

- Identificador único.
- URL pública amigável.
- Apresentação comercial.
- Categorias.
- Serviços.
- Portfólio.
- Regiões atendidas.
- Informações de contato autorizadas.
- Situação do perfil.

Criar um catálogo público com pesquisa e filtros.

Permitir pesquisa por:

- Nome do profissional.
- Categoria.
- Serviço.
- Cidade.
- Bairro.
- Região de atendimento.

## 5.3 Administração

O administrador deverá conseguir:

- Aprovar ou rejeitar novos cadastros.
- Editar informações públicas.
- Ocultar perfis.
- Gerenciar categorias.
- Destacar perfis elegíveis.
- Consultar histórico de alterações relevantes.

As informações privadas e financeiras não poderão aparecer publicamente sem autorização.

Implementar mecanismos para solicitação de atualização e exclusão de informações.

## Critério de aceitação

O profissional consegue solicitar seu cadastro, a administração consegue analisá-lo e o perfil aprovado aparece corretamente no catálogo público.

---

# 6. MÓDULO B — CHAMALÁ CONECTA

## Objetivo

Criar uma rede inteligente de oportunidades, identificando conexões entre prestadores de serviços, clientes e empresas.

O sistema não deverá depender exclusivamente da pesquisa manual do cliente.

## 6.1 Funcionamento

1. O profissional cadastra suas especialidades, regiões atendidas e disponibilidade.
2. Uma empresa ou cliente publica uma demanda.
3. O sistema analisa os critérios da oportunidade.
4. O sistema identifica profissionais potencialmente compatíveis.
5. A oportunidade aparece no painel dos profissionais elegíveis.
6. O profissional poderá consultar os detalhes e manifestar interesse.
7. A empresa poderá consultar profissionais interessados, respeitando as permissões de acesso.

## 6.2 Critérios de recomendação

Considerar:

- Compatibilidade entre serviço e categoria.
- Localização.
- Raio de atendimento.
- Disponibilidade informada.
- Exigências e qualificações.
- Modalidade de execução.
- Prazo da demanda.
- Preferências do profissional.

## 6.3 Algoritmo inicial

Implementar um algoritmo de correspondência baseado em regras e pesos configuráveis.

Exemplo de critérios ponderados:

- Categoria e serviço: 30%.
- Localização e distância: 25%.
- Qualificações: 15%.
- Disponibilidade: 15%.
- Modalidade de atendimento: 10%.
- Preferências: 5%.

Esses pesos deverão ser configuráveis pela administração.

O sistema deverá calcular um índice de compatibilidade e apresentar uma justificativa compreensível.

Não utilizar redes neurais ou aprendizado de máquina no primeiro momento.

Essas tecnologias poderão ser consideradas posteriormente, quando houver dados suficientes para treinamento, validação e monitoramento.

## 6.4 Regras importantes

- Não inventar oportunidades.
- Não enviar mensagens automáticas sem autorização.
- Não extrair dados pessoais de terceiros de fontes não autorizadas.
- Informar por que determinada oportunidade foi recomendada.
- Permitir desativação de notificações.
- Impedir divulgação pública de informações privadas.

## Critério de aceitação

Ao publicar uma oportunidade, o sistema identifica profissionais compatíveis e não recomenda indiscriminadamente a oportunidade para usuários de especialidades incompatíveis.

---

# 7. MÓDULO C — CHAMALÁ MAPA

## Objetivo

Desenvolver uma ferramenta de inteligência territorial e econômica que permita conhecer melhor as características do mercado em determinada região.

## 7.1 Mapa interativo

Implementar um mapa utilizando Leaflet e OpenStreetMap.

O usuário deverá conseguir:

- Selecionar uma cidade ou região.
- Pesquisar por categoria de serviço.
- Visualizar a distribuição dos profissionais cadastrados.
- Visualizar regiões de atendimento.
- Identificar oportunidades publicadas.
- Consultar dados populacionais disponíveis.
- Consultar indicadores socioeconômicos.
- Visualizar quantidade estimada de estabelecimentos por setor.
- Explorar informações territoriais relevantes.

## 7.2 Fontes de dados

Priorizar:

- IBGE.
- Dados públicos sobre estabelecimentos econômicos.
- Bases públicas municipais.
- OpenStreetMap.
- APIs autorizadas de mapas e estabelecimentos.
- Estatísticas próprias e agregadas do CHAMALÁFREE.

## 7.3 Regras de confiabilidade

Não apresentar dados municipais como se representassem necessariamente a realidade de cada bairro.

Não tratar a quantidade de estabelecimentos cadastrados como uma medição exata da concorrência ativa.

Não apresentar mapas de calor de demanda sem uma fonte ou modelo verificável.

Todo indicador deverá possuir, sempre que possível:

- Fonte.
- Data de referência.
- Unidade de medida.
- Escala territorial.
- Metodologia.
- Limitações.

## 7.4 Experiência visual

Criar uma interface com mapa e painel de indicadores.

Permitir que o usuário selecione uma região e visualize informações relacionadas à atividade econômica pesquisada.

O mapa deverá ser interativo e possuir filtros.

## Critério de aceitação

O usuário consegue selecionar uma localidade, visualizar indicadores disponíveis, entender suas fontes e identificar onde existem ou não dados suficientes.

---

# 8. MÓDULO D — CHAMALÁ INSIGHTS

## Objetivo

Permitir que profissionais e futuros empreendedores avaliem cenários financeiros de atividades econômicas utilizando modelos matemáticos.

## 8.1 Simulação de Monte Carlo

Implementar um simulador probabilístico utilizando JavaScript.

O sistema deverá gerar milhares de cenários a partir de distribuições de probabilidade e premissas explicitamente definidas.

## 8.2 Entradas

O usuário deverá informar:

- Cidade ou região de atuação.
- Atividade econômica.
- Capital inicial disponível.
- Investimento em equipamentos.
- Custos fixos mensais.
- Custos variáveis.
- Ticket médio.
- Capacidade de atendimento.
- Quantidade estimada de clientes.
- Dias ou horas disponíveis.
- Despesas com deslocamento.
- Impostos ou encargos aplicáveis, quando informados e verificáveis.

## 8.3 Processamento

O sistema deverá simular combinações de:

- Demanda.
- Preços.
- Custos.
- Capacidade operacional.

Modelo simplificado:

Receita = Quantidade de serviços × Ticket médio.

Lucro operacional estimado = Receita − Custos variáveis − Custos fixos.

A simulação deverá considerar a capacidade máxima de atendimento, evitando projeções de receita operacionalmente impossíveis.

## 8.4 Resultados

Apresentar:

- Distribuição do lucro mensal.
- Probabilidade estimada de prejuízo.
- Receita necessária para equilíbrio financeiro.
- Intervalos de resultados.
- Cenários pessimista, central e otimista, definidos por percentis.
- Sensibilidade a preço, demanda e custos.
- Estimativa de retorno do investimento, quando metodologicamente aplicável.

## 8.5 Exigências técnicas

- Permitir ajuste das premissas.
- Exibir hipóteses e origem dos parâmetros.
- Diferenciar dados observados de valores estimados.
- Registrar versão do modelo.
- Permitir reprodução dos resultados usando semente aleatória fixa.
- Implementar testes matemáticos automatizados.
- Não apresentar simulações como garantia de faturamento.

## 8.6 Interface

Criar uma experiência intuitiva para montagem de cenários.

Apresentar gráficos e indicadores visuais.

Permitir modificar entradas e comparar diferentes cenários.

## Critério de aceitação

O usuário informa um cenário, executa a simulação e recebe gráficos, indicadores e explicações compreensíveis dos resultados.

---

# 9. MÓDULO E — RECOMENDAÇÕES COM INTELIGÊNCIA ARTIFICIAL

## Objetivo

Transformar dados dos perfis, oportunidades disponíveis e análises territoriais em recomendações práticas.

## 9.1 Exemplos de recomendações

- Explorar determinada região atendida.
- Melhorar a divulgação de um serviço.
- Considerar novas categorias complementares.
- Avaliar uma faixa alternativa de preços.
- Reduzir custos operacionais.
- Aperfeiçoar o portfólio.
- Identificar oportunidades compatíveis.
- Analisar a viabilidade de uma atividade econômica.

## 9.2 Arquitetura

Separar duas camadas:

**Camada analítica**

Responsável por:

- Consultas.
- Cálculos.
- Indicadores.
- Regras de negócio.
- Análises territoriais.
- Resultados das simulações.

**Camada de IA**

Responsável por:

- Interpretar resultados.
- Explicar indicadores.
- Elaborar recomendações.
- Sugerir planos de ação.
- Auxiliar na tomada de decisões.

A IA deverá trabalhar com dados efetivamente disponibilizados pela camada analítica.

Não poderá inventar:

- Estatísticas.
- Oportunidades.
- Concorrentes.
- Resultados financeiros.
- Dados territoriais.

Toda recomendação deverá estar vinculada às informações utilizadas para produzi-la.

## Critério de aceitação

O sistema entrega um plano de ação objetivo, com justificativas, fontes e indicação das principais incertezas.

---

# 10. MÓDULO F — CHAMALÁ STUDIO

## Objetivo

Oferecer apoio digital a autônomos e microempreendedores que não possuem identidade visual ou estrutura profissional de marketing.

## 10.1 Identidade visual

Disponibilizar recursos para:

- Criação assistida de logotipos.
- Sugestão de cores.
- Padronização visual.
- Cartões de divulgação.

## 10.2 Redes sociais

Permitir criação de:

- Legendas.
- Roteiros de vídeos.
- Ideias para Reels e TikTok.
- Planejamento de publicações.
- Sugestões de enquetes.
- Textos promocionais.

## 10.3 Portfólio

Disponibilizar:

- Organização de fotografias.
- Apresentação de serviços.
- Descrições comerciais.
- Materiais para divulgação.

## 10.4 Estratégia inicial

Priorizar:

- Modelos editáveis.
- Geração de textos.
- Recursos gratuitos.
- Componentes reutilizáveis.
- Exportação de materiais.

Recursos de geração de imagens e vídeos deverão ser avaliados considerando disponibilidade, custos, direitos de uso e limites de processamento.

Não publicar conteúdos automaticamente nas redes sociais sem autorização do usuário.

## Critério de aceitação

O usuário seleciona um modelo, fornece informações do negócio e recebe um material editável ou exportável.

---

# 11. MÓDULO G — EMPRESAS E OPORTUNIDADES

## Objetivo

Disponibilizar um ambiente no qual empresas e clientes possam publicar demandas reais de serviços.

## 11.1 Cadastro de empresas

Permitir cadastro de anunciantes com informações comerciais e identificação do responsável.

## 11.2 Publicação de oportunidades

Cada oportunidade deverá possuir:

- Título.
- Descrição.
- Categoria do serviço.
- Localização.
- Prazo.
- Tipo de contratação.
- Requisitos.
- Valor ou faixa de remuneração, quando informado.
- Status.
- Canal de contato autorizado.

## 11.3 Gerenciamento

Permitir:

- Solicitar publicação.
- Editar anúncios.
- Encerrar anúncios.
- Consultar histórico.
- Identificar anúncios expirados.

## 11.4 Moderação

Toda publicação deverá estar sujeita à aprovação administrativa.

Implementar mecanismos de prevenção contra anúncios fraudulentos e conteúdo inadequado.

## Critério de aceitação

Uma empresa consegue solicitar a publicação de uma oportunidade, a administração consegue aprová-la e os profissionais compatíveis conseguem visualizá-la.

---

# 12. PAINEL ADMINISTRATIVO

Este é um dos componentes prioritários do projeto.

Desenvolver um painel administrativo completo, intuitivo e em português.

O contratante deverá conseguir administrar as principais atividades sem editar código.

## 12.1 Dashboard

Apresentar indicadores como:

- Total de usuários.
- Total de profissionais.
- Profissionais aguardando aprovação.
- Empresas cadastradas.
- Oportunidades publicadas.
- Oportunidades pendentes.
- Categorias mais utilizadas.
- Crescimento de cadastros.
- Utilização dos módulos.
- Situação das assinaturas.

## 12.2 Gerenciamento

O administrador deverá conseguir:

- Visualizar solicitações de cadastro.
- Aprovar profissionais.
- Editar e ocultar anúncios.
- Gerenciar categorias.
- Aprovar oportunidades.
- Consultar indicadores de utilização.
- Acessar relatórios.
- Visualizar falhas operacionais relevantes.
- Administrar conteúdos promocionais.
- Consultar situação das assinaturas, quando habilitadas.

## 12.3 Permissões

Implementar controle de acesso baseado em papéis.

Papéis iniciais:

- Superadministrador.
- Administrador.
- Moderador.
- Profissional.
- Empresa.
- Cliente.

O sistema deverá permitir definir quais operações cada papel pode executar.

Todas as permissões deverão ser verificadas no backend.

Não confiar apenas em controles visuais do frontend.

## 12.4 Auditoria

Registrar operações administrativas relevantes, incluindo:

- Usuário responsável.
- Operação realizada.
- Entidade afetada.
- Data e horário.
- Alterações relevantes.

## Critério de aceitação

As operações administrativas comuns deverão ser realizadas diretamente pelo painel, sem necessidade de alterações manuais no código-fonte.

---

# 13. PLANOS E MONETIZAÇÃO

O modelo comercial planejado é:

## FREE — Gratuito

- Perfil público básico.
- Divulgação de serviços.
- Contato direto.
- Participação no catálogo.

## PRO — R$ 14,90 mensais

- Benefícios do FREE.
- Destaques promocionais.
- Recursos complementares de divulgação.
- Benefícios adicionais definidos pela administração.

## PRO PROMOCIONAL — R$ 9,99 mensais

Oferta de lançamento pelos três primeiros meses, conforme condições comerciais aprovadas.

## 13.1 Regras

Os recursos avançados de análise territorial, Studio e Insights poderão utilizar limites de consumo, planos futuros ou serviços avulsos.

Não implementar cobrança automática sem aprovação específica.

Preparar a arquitetura para futuras integrações com gateways de pagamento.

Prever:

- Controle de assinaturas.
- Alteração de planos.
- Cancelamento.
- Histórico de pagamentos.
- Situação da assinatura.
- Limites de utilização.
- Benefícios por plano.

Os valores e condições comerciais deverão ser administráveis.

Não ativar cobranças reais antes de autorização expressa.

---

# 14. BANCO DE DADOS

Desenvolver uma estrutura relacional documentada, consistente e preparada para expansão.

Utilizar PostgreSQL com Prisma ORM.

Integrar PostGIS para funcionalidades geográficas.

## 14.1 Entidades mínimas

Criar modelos para:

**Usuários**
- ID.
- Nome.
- E-mail.
- Credenciais de autenticação.
- Papel.
- Status.
- Datas de criação e atualização.

**Profissionais**
- Identidade comercial.
- Categoria.
- Descrição.
- Contatos.
- Portfólio.
- Experiência.
- Disponibilidade.

**Serviços**
- Tipo.
- Descrição.
- Profissional responsável.

**Regiões atendidas**
- Município.
- Localização.
- Raio de atendimento.

**Empresas**
- Dados comerciais.
- Responsáveis.
- Situação cadastral.

**Oportunidades**
- Serviço.
- Localização.
- Requisitos.
- Prazo.
- Remuneração.
- Status.

**Recomendações**
- Origem.
- Destino.
- Critérios.
- Compatibilidade.
- Data.

**Indicadores territoriais**
- Localidade.
- Fonte.
- Período.
- Valor.
- Unidade.
- Metodologia.

**Simulações**
- Entradas.
- Parâmetros.
- Resultados.
- Versão do modelo.
- Semente aleatória.

**Materiais de marketing**
- Arquivos.
- Titular.
- Permissões.

**Assinaturas**
- Plano.
- Situação.
- Referências de cobrança.

**Auditoria**
- Usuário.
- Operação.
- Entidade.
- Data.
- Informações relevantes.

Outras entidades poderão ser criadas conforme a necessidade dos módulos.

## 14.2 Requisitos de armazenamento

- Separar dados públicos e privados.
- Evitar duplicidade de registros.
- Manter identificadores estáveis.
- Implementar permissões por usuário.
- Proteger arquivos e informações sensíveis.
- Estabelecer política de backup.
- Permitir exportação de dados.
- Documentar relacionamentos e regras de atualização.

---

# 15. SEGURANÇA E LGPD

O desenvolvimento deverá observar a Lei Geral de Proteção de Dados e as boas práticas de segurança de aplicações web.

Implementar:

- Autenticação segura.
- Senhas armazenadas com hash seguro.
- JWT com gerenciamento adequado de expiração.
- Separação entre contas de profissionais, empresas e administradores.
- Controle de acesso no servidor.
- HTTPS em produção.
- Proteção de credenciais e chaves de API.
- Validação dos dados recebidos.
- Proteção contra abuso de formulários.
- Rate limiting.
- Proteção contra SQL Injection.
- Proteção contra XSS e CSRF, conforme a estratégia de autenticação.
- Registro de operações críticas.
- Backup e recuperação.
- Política de privacidade.
- Consentimentos ou outras bases legais adequadas.
- Solicitação de atualização e exclusão de dados.

Se forem utilizadas ferramentas externas de inteligência artificial, verificar quais informações serão enviadas aos serviços.

Evitar compartilhamento desnecessário de dados pessoais com modelos externos.

Implementar medidas proporcionais de prevenção a anúncios falsos e golpes.

---

# 16. EXPERIÊNCIA DO USUÁRIO E NAVEGAÇÃO

A plataforma deverá possuir duas experiências principais:

## 16.1 Site público

Disponibilizar:

- Página inicial.
- Apresentação do CHAMALÁFREE.
- Catálogo de profissionais.
- Perfil público do profissional.
- Catálogo de oportunidades.
- Detalhes da oportunidade.
- Cadastro de profissionais.
- Cadastro de empresas.
- Login.
- Planos.
- Páginas institucionais.

A página inicial deverá comunicar claramente o propósito da plataforma e direcionar os usuários para as principais funcionalidades.

## 16.2 Ambiente autenticado

Após o login, disponibilizar um painel de acordo com o papel do usuário.

Para profissionais:

- Dashboard.
- Meu perfil.
- Meus serviços.
- Meu portfólio.
- Oportunidades recomendadas.
- Minhas manifestações de interesse.
- CHAMALÁ Mapa.
- CHAMALÁ Insights.
- CHAMALÁ Studio.
- Notificações.
- Minha assinatura.
- Configurações.

Para empresas:

- Dashboard.
- Perfil empresarial.
- Publicar oportunidade.
- Minhas oportunidades.
- Profissionais interessados.
- Configurações.

Para administradores:

- Dashboard administrativo.
- Usuários.
- Profissionais.
- Empresas.
- Categorias.
- Oportunidades.
- Moderação.
- Relatórios.
- Assinaturas.
- Configurações.
- Auditoria.

As funcionalidades deverão respeitar os papéis e permissões.

---

# 17. REQUISITOS DE QUALIDADE

O sistema deverá ser desenvolvido considerando:

### Escalabilidade

Permitir crescimento de usuários, profissionais, empresas e oportunidades sem exigir reestruturação completa.

### Manutenibilidade

Código organizado, modular e documentado.

### Performance

- Paginação de resultados.
- Consultas otimizadas.
- Índices no banco de dados.
- Carregamento eficiente de imagens.
- Evitar requisições desnecessárias.
- Otimizar operações geográficas.

### Confiabilidade

- Validações.
- Tratamento de erros.
- Logs.
- Testes automatizados.
- Integridade dos dados.

### Testes

Implementar testes para:

- Autenticação.
- Autorização.
- Cadastro de profissionais.
- Aprovação de perfis.
- Publicação de oportunidades.
- Algoritmo de correspondência.
- Simulações financeiras.
- Operações administrativas.
- Integrações externas.

---

# 18. ESTRATÉGIA DE IMPLEMENTAÇÃO

Não desenvolver todos os módulos simultaneamente.

Executar o projeto em etapas, mantendo entregas funcionais.

## FASE 1 — Fundação

Prioridade: máxima.

- Configuração do frontend.
- Configuração do backend.
- Configuração do PostgreSQL.
- Configuração do Prisma.
- Estrutura de autenticação.
- Controle de permissões.
- Layout principal.
- Identidade visual.
- Dashboard.
- Painel administrativo básico.

## FASE 2 — Marketplace

- Cadastro de profissionais.
- Perfis públicos.
- Categorias.
- Serviços.
- Portfólio.
- Catálogo público.
- Pesquisa e filtros.
- Aprovação administrativa.

## FASE 3 — Empresas e oportunidades

- Cadastro de empresas.
- Publicação de oportunidades.
- Aprovação administrativa.
- Gerenciamento de anúncios.
- Manifestação de interesse.
- Histórico.

## FASE 4 — CHAMALÁ Conecta

- Algoritmo de correspondência.
- Critérios configuráveis.
- Índice de compatibilidade.
- Recomendações.
- Notificações.
- Painel de oportunidades recomendadas.

## FASE 5 — CHAMALÁ Mapa

- Integração com Leaflet.
- Integração com OpenStreetMap.
- Integração com dados do IBGE.
- Camadas geográficas.
- Indicadores territoriais.
- Filtros por região e categoria.

## FASE 6 — CHAMALÁ Insights

- Formulários de simulação.
- Modelo de Monte Carlo.
- Cálculos financeiros.
- Gráficos.
- Comparação de cenários.
- Histórico de simulações.

## FASE 7 — Inteligência artificial

- Integração com API de IA.
- Análise dos dados.
- Recomendações.
- Explicações dos indicadores.
- Planos de ação.

## FASE 8 — CHAMALÁ Studio

- Modelos editáveis.
- Geração de textos.
- Planejamento de conteúdo.
- Portfólio.
- Exportação de materiais.

## FASE 9 — Monetização e aprimoramento

- Controle de planos.
- Regras de benefícios.
- Controle de utilização.
- Preparação para integração de pagamentos.
- Relatórios avançados.
- Testes de segurança.
- Otimização geral.

As fases poderão ser ajustadas conforme dependências técnicas, mas nenhuma funcionalidade deverá ser considerada concluída sem atender aos seus critérios de aceitação.

---

# 19. REGRAS DE EXECUÇÃO PARA O AGENTE

1. Antes de iniciar, analise a estrutura existente do projeto e identifique o que já está implementado.
2. Não sobrescreva funcionalidades existentes sem necessidade.
3. Não desenvolva funcionalidades fictícias apenas para preencher a interface.
4. Não utilize dados estáticos como substitutos permanentes do banco de dados.
5. Todas as operações importantes deverão estar conectadas ao backend.
6. Toda regra de negócio deverá ser validada no servidor.
7. Não exponha credenciais ou chaves de API no frontend.
8. Não invente dados territoriais ou econômicos.
9. Não invente oportunidades ou recomendações.
10. Não habilite cobranças sem autorização.
11. Priorize ferramentas gratuitas e open source.
12. Mantenha o código simples, organizado e reutilizável.
13. Documente decisões arquiteturais importantes.
14. Implemente migrations para alterações no banco de dados.
15. Crie testes para funcionalidades críticas.
16. Garanta que o frontend e o backend permaneçam independentes.
17. Não avance silenciosamente para uma fase que dependa de decisões comerciais ou integrações pagas ainda não aprovadas.

## 19.1 Entregáveis

Ao longo do desenvolvimento, entregar:

- Aplicação React funcional.
- API Express funcional.
- Banco de dados PostgreSQL estruturado.
- Schema Prisma.
- Migrations.
- Documentação Swagger.
- Documentação de instalação.
- Arquivo `.env.example`.
- Testes automatizados.
- Documentação dos módulos.
- Instruções de deploy.
- Arquitetura documentada.

---

# 20. PRIMEIRA TAREFA DO AGENTE

Antes de começar a desenvolver, realize uma análise técnica completa do projeto.

Apresente:

1. Arquitetura proposta.
2. Estrutura de diretórios.
3. Modelagem inicial do banco de dados.
4. Relacionamento entre entidades.
5. Mapeamento dos módulos.
6. Dependências entre funcionalidades.
7. Estratégia de autenticação e permissões.
8. Integrações externas necessárias.
9. Riscos técnicos.
10. Plano de execução por fases.

Depois dessa análise, comece pela FASE 1.

Implemente cada fase de forma funcional, testável e integrada às anteriores.

**Objetivo final:** entregar uma plataforma CHAMALÁFREE independente, moderna, escalável e funcional, capaz de conectar profissionais, empresas e clientes, utilizando dados, geolocalização, inteligência artificial e ferramentas de análise para transformar talento em oportunidade.