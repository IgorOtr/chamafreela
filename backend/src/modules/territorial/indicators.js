// Metadados obrigatórios de cada indicador: fonte, período, unidade, escala, metodologia e limitações.
const IBGE_SIDRA = 'https://sidra.ibge.gov.br/tabela';

export const INDICATORS = {
  population: {
    label: 'População residente', unit: 'pessoas', source: 'IBGE — Censo Demográfico 2022', sourceUrl: `${IBGE_SIDRA}/4714`,
    methodology: 'Contagem da população residente no município na data de referência do Censo 2022.',
    limitations: 'Dado municipal: não representa necessariamente a realidade de cada bairro. Não acompanha mudanças posteriores ao Censo.',
  },
  area: {
    label: 'Área territorial', unit: 'km²', source: 'IBGE — Censo Demográfico 2022', sourceUrl: `${IBGE_SIDRA}/4714`,
    methodology: 'Área oficial da unidade territorial conforme a malha municipal do IBGE.',
    limitations: 'Inclui áreas rurais, de preservação e não povoadas.',
  },
  density: {
    label: 'Densidade demográfica', unit: 'hab/km²', source: 'IBGE — Censo Demográfico 2022', sourceUrl: `${IBGE_SIDRA}/4714`,
    methodology: 'População residente dividida pela área territorial do município.',
    limitations: 'Média municipal; a concentração real varia muito entre bairros.',
  },
  pib: {
    label: 'PIB a preços correntes', unit: 'R$ mil', source: 'IBGE — Produto Interno Bruto dos Municípios', sourceUrl: `${IBGE_SIDRA}/5938`,
    methodology: 'Valor total da produção do município, a preços correntes do ano de referência.',
    limitations: 'Mede a produção local, não a renda da população nem o potencial de demanda por serviços. Não é PIB per capita.',
  },
};

export const CEMPRE = {
  units: {
    key: 'units_by_section', label: 'Unidades locais formais', unit: 'unidades', source: 'IBGE — Cadastro Central de Empresas (CEMPRE)', sourceUrl: `${IBGE_SIDRA}/6450`,
    methodology: 'Número de unidades locais (estabelecimentos) com CNPJ ativo no cadastro, por seção da CNAE 2.0.',
    limitations: 'A série foi encerrada em 2021 e pode estar defasada. Conta apenas unidades formais cadastradas; não mede a concorrência ativa nem a atividade informal, e uma seção CNAE não equivale a uma categoria da plataforma.',
  },
  workers: {
    key: 'workers_by_section', label: 'Pessoal ocupado', unit: 'pessoas', source: 'IBGE — Cadastro Central de Empresas (CEMPRE)', sourceUrl: `${IBGE_SIDRA}/6450`,
    methodology: 'Pessoal ocupado total (assalariado e sócios/proprietários) nas unidades locais, por seção da CNAE 2.0.',
    limitations: 'Mesmas limitações das unidades locais. Dados omitidos por sigilo estatístico aparecem como indisponíveis.',
  },
};

// Lacunas estruturais, sempre informadas ao usuário.
export const STRUCTURAL_NOTES = [
  'Os indicadores são municipais. Não exibimos dados por bairro porque as fontes públicas usadas aqui não os fornecem nessa escala.',
  'A distribuição de profissionais e oportunidades usa apenas o cadastro da plataforma (cidade informada) e não representa o mercado como um todo.',
  'Não há mapa de calor de demanda: não existe, neste módulo, fonte ou modelo verificável que sustente esse tipo de dado.',
];
