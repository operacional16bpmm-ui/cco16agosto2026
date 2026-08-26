/* ============================================================================
   CALENDÁRIO DE EVENTOS DO 16º BPM/M, dados da rota /16bpmm/calendario.

   PARA LANÇAR UM EVENTO NOVO: acrescente um objeto em EVENTOS, em qualquer
   posição (a página ordena sozinha). Campos:
     data      "AAAA-MM-DD" (obrigatório)
     dataFim   "AAAA-MM-DD" para período (férias, operação de vários dias)
     titulo    texto curto que aparece na grade e nas listas
     categoria "institucional" | "valorizacao" | "conseg" | "comemorativa"
               | "operacional"
     hora      "19h30" (opcional)
     local     endereço ou dependência (opcional)
     descricao uma frase de contexto (opcional)

   A reunião mensal de valorização ainda não tem dia fixo publicado: quando a
   P/1 divulgar em BI, lançar aqui a data de cada mês, categoria "valorizacao".
   As reuniões do CONSEG Butantã seguem a agenda regular do conselho (primeira
   quarta-feira) e devem ser confirmadas antes da divulgação de cada mês.
   ============================================================================ */

export type CategoriaEvento =
  | "institucional"
  | "valorizacao"
  | "conseg"
  | "comemorativa"
  | "operacional";

export type EventoCalendario = {
  data: string;
  dataFim?: string;
  titulo: string;
  categoria: CategoriaEvento;
  hora?: string;
  local?: string;
  descricao?: string;
};

/* Classes completas por categoria (o Tailwind só enxerga classe literal).
   Paleta institucional da página oficial: nada fora do kit CComSoc. */
export const CATEGORIAS: Record<
  CategoriaEvento,
  { rotulo: string; ponto: string; selo: string; faixa: string }
> = {
  institucional: {
    rotulo: "Institucional",
    ponto: "bg-azul-noite",
    selo: "bg-azul-noite text-branco",
    faixa: "bg-azul-noite/10",
  },
  valorizacao: {
    rotulo: "Valorização",
    ponto: "bg-ouro-velho",
    selo: "bg-ouro-velho text-azul-noite",
    faixa: "bg-ouro-velho/15",
  },
  conseg: {
    rotulo: "CONSEG",
    ponto: "bg-azul",
    selo: "bg-azul text-branco",
    faixa: "bg-azul/10",
  },
  comemorativa: {
    rotulo: "Data comemorativa",
    ponto: "bg-vermelho",
    selo: "bg-vermelho text-branco",
    faixa: "bg-vermelho/10",
  },
  operacional: {
    rotulo: "Feriados e operações",
    ponto: "bg-preto",
    selo: "bg-preto text-branco",
    faixa: "bg-preto/10",
  },
};

/* --------------------------------------------------------------- destaques */

export type DestaqueCalendario = {
  id: "aniversario-btl" | "patrono" | "aniversario-pmesp" | "ferias-escolares";
  titulo: string;
  dataRotulo: string;
  detalhe: string;
  /* Ocorrências futuras em ordem cronológica: a contagem regressiva usa a
     primeira que ainda não passou. */
  proximas: string[];
};

export const DESTAQUES: DestaqueCalendario[] = [
  {
    id: "aniversario-btl",
    titulo: "Aniversário do 16º BPM/M",
    dataRotulo: "06 de dezembro",
    detalhe:
      "Criado pela Lei nº 8.030, de 06 de dezembro de 1963. Em 2026 o Batalhão completa 63 anos de defesa da vida na Zona Sul e Oeste da Capital.",
    proximas: ["2026-12-06", "2027-12-06"],
  },
  {
    id: "patrono",
    titulo: "Dia do Patrono",
    dataRotulo: "16 de abril",
    detalhe:
      "Memória do ato de bravura do 1º Ten PM Fernão Gomes Loureiro, tombado em 16 de abril de 1987 protegendo uma família feita refém.",
    proximas: ["2026-04-16", "2027-04-16"],
  },
  {
    id: "aniversario-pmesp",
    titulo: "Aniversário da PMESP",
    dataRotulo: "15 de dezembro",
    detalhe:
      "Criação do Corpo de Municipais Permanentes em 15 de dezembro de 1831. Em 2026 a Polícia Militar do Estado de São Paulo completa 195 anos.",
    proximas: ["2026-12-15", "2027-12-15"],
  },
  {
    id: "ferias-escolares",
    titulo: "Férias escolares (Seduc-SP)",
    dataRotulo: "07 a 23/07 e 19 a 31/12",
    detalhe:
      "Recessos da rede estadual em 2026: 07 a 23 de julho e 19 a 31 de dezembro. Período de reforço do policiamento em parques, comércio e áreas de lazer.",
    proximas: ["2026-12-19", "2027-07-07"],
  },
];

/* ----------------------------------------------------------------- eventos */

export const EVENTOS: EventoCalendario[] = [
  /* ======================================================= 2026, 1º semestre */
  {
    data: "2026-01-01",
    titulo: "Confraternização Universal (feriado)",
    categoria: "operacional",
    descricao: "Encerramento da Operação Boas Festas.",
  },
  {
    data: "2026-01-25",
    titulo: "Aniversário da cidade de São Paulo, 472 anos (feriado municipal)",
    categoria: "comemorativa",
  },
  {
    data: "2026-02-02",
    titulo: "Início do ano letivo na rede estadual (Seduc-SP)",
    categoria: "operacional",
    descricao: "Retomada do policiamento escolar nas unidades da circunscrição.",
  },
  {
    data: "2026-02-16",
    dataFim: "2026-02-17",
    titulo: "Carnaval (ponto facultativo)",
    categoria: "operacional",
    descricao: "Operação Carnaval: blocos de rua e grandes fluxos na circunscrição.",
  },
  {
    data: "2026-03-08",
    titulo: "Dia Internacional da Mulher",
    categoria: "comemorativa",
    descricao: "Homenagem às policiais femininas do Batalhão.",
  },
  {
    data: "2026-04-03",
    titulo: "Sexta-feira Santa (feriado)",
    categoria: "operacional",
  },
  {
    data: "2026-04-05",
    titulo: "Páscoa",
    categoria: "comemorativa",
  },
  {
    data: "2026-04-16",
    titulo: "Dia do Patrono: 1º Ten PM Fernão Gomes Loureiro",
    categoria: "institucional",
    descricao:
      "39 anos do ato de bravura de 1987. Momento de honras ao patrono do Batalhão.",
  },
  {
    data: "2026-04-21",
    titulo: "Tiradentes, patrono das Polícias Militares (feriado)",
    categoria: "institucional",
    descricao: "Dia da Polícia: memória de Joaquim José da Silva Xavier.",
  },
  {
    data: "2026-05-01",
    titulo: "Dia do Trabalho (feriado)",
    categoria: "operacional",
  },
  {
    data: "2026-05-10",
    titulo: "Dia das Mães",
    categoria: "comemorativa",
    descricao: "Data propícia a evento de valorização com as famílias da tropa.",
  },
  {
    data: "2026-05-12",
    titulo: "Pioneirismo do policiamento feminino na PMESP (1955)",
    categoria: "institucional",
    descricao:
      "Criação do policiamento feminino paulista, o primeiro do Brasil, em 12 de maio de 1955.",
  },
  {
    data: "2026-06-04",
    titulo: "Corpus Christi (feriado)",
    categoria: "operacional",
  },
  {
    data: "2026-06-24",
    titulo: "Dia Nacional do Policial e do Bombeiro Militar",
    categoria: "institucional",
  },
  /* ======================================================= 2026, 2º semestre */
  {
    data: "2026-07-07",
    dataFim: "2026-07-23",
    titulo: "Férias escolares de julho (Seduc-SP)",
    categoria: "operacional",
    descricao:
      "Recesso da rede estadual: reforço do policiamento em parques, comércio e áreas de lazer.",
  },
  {
    data: "2026-07-09",
    titulo: "Revolução Constitucionalista de 1932, Data Magna de SP (feriado estadual)",
    categoria: "institucional",
    descricao: "94 anos da epopeia de 32, com participação da Força Pública paulista.",
  },
  {
    data: "2026-07-24",
    titulo: "Volta às aulas do 2º semestre (Seduc-SP)",
    categoria: "operacional",
  },
  {
    data: "2026-08-05",
    titulo: "Reunião do CONSEG Butantã",
    categoria: "conseg",
    hora: "19h30",
    local: "Salão Paroquial da Igreja São Patrício, R. Otacílio Tomanik, 1555, Rio Pequeno",
    descricao:
      "Agenda regular: primeira quarta-feira do mês. Confirmar com o conselho antes de divulgar.",
  },
  {
    data: "2026-08-04",
    titulo: "Reunião Plenária do CONSEG Morumbi",
    categoria: "conseg",
    hora: "19h00 às 21h00",
    local: "R. Corgie Assad Abdala, 237, Vila Sônia",
    descricao:
      "Plenária aberta à comunidade, conforme o calendário oficial 2026 do conselho. Área da 2ª Cia.",
  },
  {
    data: "2026-08-07",
    titulo: "20 anos da Lei Maria da Penha, Agosto Lilás",
    categoria: "comemorativa",
    descricao: "Mês de enfrentamento à violência contra a mulher.",
  },
  {
    data: "2026-09-01",
    titulo: "Reunião Plenária do CONSEG Morumbi",
    categoria: "conseg",
    hora: "19h00 às 21h00",
    local: "R. Corgie Assad Abdala, 237, Vila Sônia",
    descricao:
      "Plenária aberta à comunidade, conforme o calendário oficial 2026 do conselho. Área da 2ª Cia.",
  },
  {
    data: "2026-10-06",
    titulo: "Reunião Plenária do CONSEG Morumbi",
    categoria: "conseg",
    hora: "19h00 às 21h00",
    local: "R. Corgie Assad Abdala, 237, Vila Sônia",
    descricao:
      "Plenária aberta à comunidade, conforme o calendário oficial 2026 do conselho. Área da 2ª Cia.",
  },
  {
    data: "2026-11-03",
    titulo: "Reunião Plenária do CONSEG Morumbi",
    categoria: "conseg",
    hora: "19h00 às 21h00",
    local: "R. Corgie Assad Abdala, 237, Vila Sônia",
    descricao:
      "Plenária aberta à comunidade, conforme o calendário oficial 2026 do conselho. Área da 2ª Cia.",
  },
  {
    data: "2026-12-01",
    titulo: "Reunião Plenária do CONSEG Morumbi",
    categoria: "conseg",
    hora: "19h00 às 21h00",
    local: "R. Corgie Assad Abdala, 237, Vila Sônia",
    descricao:
      "Plenária aberta à comunidade, conforme o calendário oficial 2026 do conselho. Área da 2ª Cia.",
  },
  {
    data: "2026-08-09",
    titulo: "Dia dos Pais",
    categoria: "comemorativa",
  },
  {
    data: "2026-08-25",
    titulo: "Dia do Soldado",
    categoria: "institucional",
    descricao: "Nascimento de Luiz Alves de Lima e Silva, o Duque de Caxias.",
  },
  {
    data: "2026-09-02",
    titulo: "Reunião do CONSEG Butantã",
    categoria: "conseg",
    hora: "19h30",
    local: "Salão Paroquial da Igreja São Patrício, R. Otacílio Tomanik, 1555, Rio Pequeno",
    descricao:
      "Agenda regular: primeira quarta-feira do mês. Confirmar com o conselho antes de divulgar.",
  },
  {
    data: "2026-09-07",
    titulo: "Independência do Brasil (feriado)",
    categoria: "institucional",
    descricao: "Desfile cívico-militar de 7 de Setembro.",
  },
  {
    data: "2026-10-07",
    titulo: "Reunião do CONSEG Butantã",
    categoria: "conseg",
    hora: "19h30",
    local: "Salão Paroquial da Igreja São Patrício, R. Otacílio Tomanik, 1555, Rio Pequeno",
    descricao:
      "Agenda regular: primeira quarta-feira do mês. Confirmar com o conselho antes de divulgar.",
  },
  {
    data: "2026-10-12",
    titulo: "Nossa Senhora Aparecida e Dia das Crianças (feriado)",
    categoria: "comemorativa",
    descricao: "Data propícia a ações comunitárias e de proximidade com as crianças.",
  },
  {
    data: "2026-11-02",
    titulo: "Finados (feriado)",
    categoria: "operacional",
    descricao: "Operação Finados: policiamento dos cemitérios e entornos.",
  },
  {
    data: "2026-11-04",
    titulo: "Reunião do CONSEG Butantã",
    categoria: "conseg",
    hora: "19h30",
    local: "Salão Paroquial da Igreja São Patrício, R. Otacílio Tomanik, 1555, Rio Pequeno",
    descricao:
      "Agenda regular: primeira quarta-feira do mês. Confirmar com o conselho antes de divulgar.",
  },
  {
    data: "2026-11-15",
    titulo: "Proclamação da República (feriado)",
    categoria: "comemorativa",
  },
  {
    data: "2026-11-19",
    titulo: "Dia da Bandeira",
    categoria: "comemorativa",
  },
  {
    data: "2026-11-20",
    titulo: "Dia Nacional de Zumbi e da Consciência Negra (feriado)",
    categoria: "comemorativa",
  },
  {
    data: "2026-12-02",
    titulo: "Reunião do CONSEG Butantã",
    categoria: "conseg",
    hora: "19h30",
    local: "Salão Paroquial da Igreja São Patrício, R. Otacílio Tomanik, 1555, Rio Pequeno",
    descricao:
      "Agenda regular: primeira quarta-feira do mês. Confirmar com o conselho antes de divulgar.",
  },
  {
    data: "2026-12-06",
    titulo: "Aniversário do 16º BPM/M: 63 anos",
    categoria: "institucional",
    descricao:
      "Criação do Batalhão pela Lei nº 8.030, de 06 de dezembro de 1963. Solenidade alusiva a divulgar pela P/5.",
  },
  {
    data: "2026-12-15",
    titulo: "Aniversário da PMESP: 195 anos",
    categoria: "institucional",
    descricao: "Criação do Corpo de Municipais Permanentes em 15 de dezembro de 1831.",
  },
  {
    data: "2026-12-18",
    titulo: "Encerramento do ano letivo (Seduc-SP)",
    categoria: "operacional",
  },
  {
    data: "2026-12-19",
    dataFim: "2026-12-31",
    titulo: "Recesso escolar de fim de ano (Seduc-SP)",
    categoria: "operacional",
    descricao: "Operação Boas Festas: reforço no comércio e nos centros de compras.",
  },
  {
    data: "2026-12-25",
    titulo: "Natal (feriado)",
    categoria: "comemorativa",
  },
  {
    data: "2026-12-31",
    titulo: "Réveillon",
    categoria: "operacional",
    descricao: "Virada do ano: policiamento dos pontos de concentração.",
  },
  /* ================================================= 2027, marcos principais */
  {
    data: "2027-01-01",
    titulo: "Confraternização Universal (feriado)",
    categoria: "operacional",
  },
  {
    data: "2027-01-25",
    titulo: "Aniversário da cidade de São Paulo, 473 anos (feriado municipal)",
    categoria: "comemorativa",
  },
  {
    data: "2027-02-08",
    dataFim: "2027-02-09",
    titulo: "Carnaval (ponto facultativo)",
    categoria: "operacional",
  },
  {
    data: "2027-03-26",
    titulo: "Sexta-feira Santa (feriado)",
    categoria: "operacional",
  },
  {
    data: "2027-04-16",
    titulo: "Dia do Patrono: 1º Ten PM Fernão Gomes Loureiro",
    categoria: "institucional",
    descricao: "40 anos do ato de bravura de 1987.",
  },
  {
    data: "2027-04-21",
    titulo: "Tiradentes, patrono das Polícias Militares (feriado)",
    categoria: "institucional",
  },
  {
    data: "2027-05-01",
    titulo: "Dia do Trabalho (feriado)",
    categoria: "operacional",
  },
  {
    data: "2027-05-27",
    titulo: "Corpus Christi (feriado)",
    categoria: "operacional",
  },
  {
    data: "2027-06-24",
    titulo: "Dia Nacional do Policial e do Bombeiro Militar",
    categoria: "institucional",
  },
  {
    data: "2027-07-09",
    titulo: "Revolução Constitucionalista de 1932, Data Magna de SP (feriado estadual)",
    categoria: "institucional",
    descricao: "95 anos da epopeia de 32.",
  },
  {
    data: "2027-08-25",
    titulo: "Dia do Soldado",
    categoria: "institucional",
  },
  {
    data: "2027-09-07",
    titulo: "Independência do Brasil (feriado)",
    categoria: "institucional",
  },
  {
    data: "2027-10-12",
    titulo: "Nossa Senhora Aparecida e Dia das Crianças (feriado)",
    categoria: "comemorativa",
  },
  {
    data: "2027-11-02",
    titulo: "Finados (feriado)",
    categoria: "operacional",
  },
  {
    data: "2027-11-15",
    titulo: "Proclamação da República (feriado)",
    categoria: "comemorativa",
  },
  {
    data: "2027-11-20",
    titulo: "Dia Nacional de Zumbi e da Consciência Negra (feriado)",
    categoria: "comemorativa",
  },
  {
    data: "2027-12-06",
    titulo: "Aniversário do 16º BPM/M: 64 anos",
    categoria: "institucional",
  },
  {
    data: "2027-12-15",
    titulo: "Aniversário da PMESP: 196 anos",
    categoria: "institucional",
  },
  {
    data: "2027-12-25",
    titulo: "Natal (feriado)",
    categoria: "comemorativa",
  },
];

/* ------------------------------------------------- agenda permanente ------ */

export type ItemAgendaPermanente = {
  titulo: string;
  categoria: CategoriaEvento;
  quando: string;
  onde?: string;
  observacao?: string;
};

export const AGENDA_PERMANENTE: ItemAgendaPermanente[] = [
  {
    titulo: "Reunião Mensal de Valorização",
    categoria: "valorizacao",
    quando: "Todo mês, data divulgada em Boletim Interno",
    onde: "Sede do 16º BPM/M, Av. Corifeu de Azevedo Marques, 4082, Rio Pequeno",
    observacao:
      "Entrega de elogios, homenagem ao Policial do Mês e reconhecimento das equipes em destaque. A data de cada mês é lançada neste calendário.",
  },
  {
    titulo: "CONSEG Butantã",
    categoria: "conseg",
    quando: "Primeira quarta-feira do mês, 19h30",
    onde: "Salão Paroquial da Igreja São Patrício, R. Otacílio Tomanik, 1555, Rio Pequeno",
    observacao:
      "Agenda informada por guias do bairro, não publicada pelo conselho: confirmar as datas antes de divulgar.",
  },
  {
    titulo: "CONSEG Morumbi (Vila Sônia e Morumbi)",
    categoria: "conseg",
    quando: "Plenária aberta na primeira terça-feira do mês, 19h00 às 21h00",
    onde: "R. Corgie Assad Abdala, 237, Vila Sônia",
    observacao:
      "Área do 34º DP e da 2ª Cia do Batalhão. Calendário 2026 publicado no site oficial do conselho.",
  },
  {
    titulo: "CONSEG Campo Limpo",
    categoria: "conseg",
    quando: "Reunião mensal, agenda divulgada pela Subprefeitura Campo Limpo",
    observacao: "Área da 3ª Cia do Batalhão.",
  },
];
