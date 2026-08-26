/* ============================================================================
   Conteúdo institucional do 16º BPM/M — "1º Ten PM Fernão Gomes Loureiro".
   Fonte: site oficial da Unidade na intranet PMESP
   (www9.intranet.policiamilitar.sp.gov.br/unidades/16bpmm/), lido em 21/07/2026.
   Os textos são transcrição fiel do original; só a diagramação mudou.
   ============================================================================ */

export type Companhia = {
  id: string;
  nome: string;
  area: string;
  foto: string;
  telefone: string;
  email: string;
  endereco: string[];
  mapa: string;
  texto: string[];
};

export type Heroi = { n: number; nome: string; ano: string; texto: string };

/* -------------------------------------------------------------- histórico */

export const HISTORICO = [
  "O Décimo Sexto Batalhão de Polícia Militar Metropolitano teve suas origens na Guarda Militar da Cidade Universitária de São Paulo. Criado pela Lei nº 8030, de 06 de dezembro de 1963, quando então recebeu parte do efetivo do 10º BPM/M (Santo André), instalando sua sede no local ocupado pela Guarda Militar da Cidade Universitária, constituindo na ocasião, em 23 de janeiro de 1964, a primeira Companhia do Batalhão.",
  "A área de atuação do 16º BPM/M tem como característica a desigualdade social, tendo em vista o choque de contraste ao visualizarmos áreas residenciais de altíssimo padrão delimitando com inúmeras comunidades, além de contar com muitas empresas de grande porte, concentração de áreas industriais e clubes esportivos, destacando o Estádio Cícero Pompeu de Toledo (Morumbi). O Batalhão abrange uma das principais rodovias do Estado, a Rodovia Raposo Tavares, com acesso para o Rodoanel Mário Covas, e vias rápidas como a Marginal do Rio Pinheiros.",
  "Estão situados na área do 16: o Palácio do Governo de São Paulo, shopping centers (Jardim Sul, Butantã, Raposo e Morumbi Town), o Hospital Albert Einstein e o Cemitério Israelita.",
  "Em 15 de julho de 2016 tivemos uma grande conquista, publicada no Boletim Geral 132/16: o Batalhão recebeu a agregação do nome do 1º Ten PM Fernão Gomes Loureiro, Oficial que tombou no cumprimento do dever durante ocorrência na década de 80, defendendo a sociedade paulista com o sacrifício da própria vida.",
];

export const ATUALIDADE =
  "Atualmente sob o comando do Tenente Coronel PM Ives Minosso de Almeida Ramos, o 16º BPM/M continua sua trajetória de excelência, adaptando-se às novas demandas de segurança pública e mantendo seu compromisso inabalável com a sociedade paulistana. Com um efetivo dedicado e equipamentos modernos, a unidade segue na vanguarda do policiamento metropolitano.";

export const NUMEROS = [
  { valor: "5", rotulo: "Companhias" },
  { valor: "550+", rotulo: "Policiais" },
  { valor: "170+", rotulo: "Bairros atendidos" },
  { valor: "24h", rotulo: "Atendimento" },
];

/* ----------------------------------------------------------------- brasão */

export const BRASAO = [
  "Com a publicação da reestruturação da PMESP no BI G PM-132/2016, de 15JUL16, fica alterado o Brasão de Armas do 16º BPM/M, conforme segue: o Brasão de Armas do 16º BPM/M será um escudo português clássico, partido e cortado, perfilado de jalne.",
  "No primeiro campo de goles, com a cor que simboliza a audácia, grandeza e espírito de luta, duas garruchas cruzadas em aspas (emblema da Polícia Militar do Estado de São Paulo), de jalne, simbolizando a nobreza, esplendor, glória e poder.",
  "No segundo campo de prata, cor que simboliza a justiça, pureza do ideal, o dever e a lealdade, o escudo do Brasão de Armas da Polícia Militar do Estado de São Paulo, para particularizar nossa Corporação, perfilado de jalne, tendo uma bordadura em goles carregada de dezoito estrelas de cinco pontas de prata, representando os marcos históricos da Polícia Militar. No centro do campo, um verguetado de treze listas em sable e prata, e acima um terciado em faixa de blau, a do centro em goles, tudo perfilado em jalne, cores representativas da Bandeira Paulista.",
  "No terceiro campo de blau (azul), que simboliza a cor da justiça, nobreza, perseverança, zelo e lealdade, constando em três listas com as cores da Bandeira Paulista (preto, branco e vermelho), que representa altos graus da milícia.",
  "Na destra superior, um livro aberto com o símbolo atômico, o mapa do Estado de São Paulo, atravessado por uma pena de ouro, que representa e indica os estudos pesquisados e ministrados na Cidade Universitária; e na sinistra inferior o símbolo da arma da Infantaria Militar em cor natural, dois fuzis cruzados e uma granada no centro. Abaixo, o número “16º”, número indicativo da Unidade, simbolizando as instruções da antiga Unidade Escolar, que atinge uma vasta área de policiamento dos bandeirantes.",
  "Como timbre, um leão rampante de jalne, apoiado sobre um virol em goles e prata, empunhando um gládio com punho de jalne e lâmina de prata, que é o timbre do Brasão de Armas da Polícia Militar do Estado de São Paulo.",
  "Abaixo, num listel de goles, com letras em características de prata, a legenda da Unidade 16º BPM/M (16º Batalhão de Polícia Militar Metropolitano), acrescentado de “1º Ten PM Fernão”, em referência ao então 2º Ten PM 830582 Fernão Gomes Loureiro, falecido em 16/04/1987 em ocorrência de roubo a residência, na área do Batalhão, atingido por dois disparos de arma de fogo durante tentativa de negociação.",
];

export const SIMBOLOS = [
  {
    icone: "⚜️",
    titulo: "Forma do escudo",
    texto: "Escudo português clássico, partido e cortado, perfilado de jalne.",
  },
  {
    icone: "🛡️",
    titulo: "Cores oficiais",
    texto:
      "Goles pela audácia, grandeza e espírito de luta; prata pela justiça, pureza do ideal, dever e lealdade; blau pela nobreza, perseverança e zelo. No centro, o verguetado com as cores da Bandeira Paulista.",
  },
  {
    icone: "📖",
    titulo: "O livro e o número 16",
    texto:
      "Livro aberto com o símbolo atômico e o mapa do Estado atravessado por uma pena de ouro: os estudos ministrados na Cidade Universitária. Abaixo, o “16º” da antiga Unidade Escolar.",
  },
  {
    icone: "⚔️",
    titulo: "Leão com gládio",
    texto:
      "Leão rampante de jalne sobre virol em goles e prata, empunhando um gládio: o timbre do Brasão de Armas da PMESP.",
  },
];

/* ---------------------------------------------------------------- patrono */

export const FERNAO_DADOS = [
  ["Nascimento", "05 de novembro de 1963"],
  ["Pais", "Amândio Manoel da Silva Loureiro e Maria de Lourdes Gomes Loureiro"],
  ["Ingresso na APMBB", "01 de fevereiro de 1983"],
  ["Declarado Aspirante a Oficial", "15 de dezembro de 1985"],
  ["Apresentação no 1º BPM/I", "27 de dezembro de 1985"],
  ["Transferência para o 16º BPM/M", "20 de junho de 1986"],
];

export const FERNAO_TRAJETORIA = [
  "Nascido em 05 de novembro de 1963, filho de Amândio Manoel da Silva Loureiro e de Maria de Lourdes Gomes Loureiro. Ingressou na APMBB em 1º de fevereiro de 1983; era um Aluno Oficial que tinha pulso firme e se fazia respeitar pelos colegas, ativo e desembaraçado, sendo diversas vezes elogiado pelos Oficiais dado seu desenvolvimento. Declarado Aspirante a Oficial em 15 de dezembro de 1985, apresentou-se no 1º Batalhão de Polícia Militar do Interior, em São José dos Campos, em 27 de dezembro.",
  "Foi transferido por conveniência do serviço para o 16º Batalhão de Polícia Militar Metropolitano em 20 de junho de 1986. Em 16 de abril de 1987, por volta das 07h30, começava o envolvimento do 2º Tenente PM Fernão na última ocorrência da qual participaria.",
];

export const FERNAO_BRAVURA = [
  "Tratava-se de um roubo a residência no qual a proprietária, Dona Noêmia, foi feita refém em sua própria casa; sua filha, ao ouvir gritos, conseguiu acionar o 190. Após instantes, a casa foi cercada por policiais sob o comando do 2º Tenente PM Fernão.",
  "Partidário do diálogo e avesso à violência, tentou estabelecer comunicação com os delinquentes, culminando por dar-lhes voz de prisão, ainda estando do lado de fora da casa.",
  "Os delinquentes responderam com vários tiros, que atingiram duas vezes o 2º Tenente PM Fernão. De imediato, os policiais revidaram, alvejando o delinquente, que tombou mortalmente ferido. O 2º Tenente PM Fernão foi socorrido pelas viaturas de rádio patrulhamento.",
  "Em consequência dos disparos que o atingiram, o 2º Tenente PM Fernão veio a falecer, dando a sua vida em combate ao crime e cumprindo até o final sua promessa de proteger a vida dos cidadãos.",
];

export const FERNAO_LEGADO =
  "1º Tenente PM Fernão: mais um brilhante Oficial que perdeu a vida no combate diuturno à criminalidade. Reverenciamos a memória desse homem que, por meio de seus atos de bravura, nos faz sentir orgulho em envergar a farda que um dia indumentou esse herói, que jamais será esquecido, permanecendo vivo em nossa memória e em nossos corações. Homenageamos aquele que, com o comprometimento da própria vida, obedeceu à sua promessa até a morte.";

/* ------------------------------------------------------------- comandante */

export const COMANDANTE_BIO = [
  "O Tenente Coronel PM Ives Minosso de Almeida Ramos, nascido em 18 de janeiro de 1977 em Iepê/SP, é Oficial Superior da Polícia Militar do Estado de São Paulo, com trajetória marcada por sólida formação acadêmica, ampla experiência operacional e reconhecida capacidade de liderança. Ingressou na PMESP em 1997, pela Academia do Barro Branco, destacando-se desde a formação, quando concluiu o curso de Aspirantes em 7º lugar na turma de 2000.",
  "Ao longo da carreira exerceu funções de comando em diversas Unidades operacionais da Capital, Região Metropolitana e Interior do Estado, acumulando experiência em policiamento ostensivo, gestão de efetivo e operações de alta complexidade. Foi promovido a Capitão em 2014, período em que contribuiu para a implantação do 8º BAEP e para o desenvolvimento de doutrina especializada, inclusive com participação em eventos técnicos nacionais.",
  "É bacharel em Direito, mestre e doutor em Ciências Policiais de Segurança e Ordem Pública, com pesquisas voltadas à inovação, modernização e aprimoramento da atividade policial, destacando-se estudos sobre reabilitação equestre e o impacto das câmeras operacionais portáteis.",
  "Promovido a Major em 2021, atuou em unidades estratégicas da Capital, exercendo comando em áreas de elevada complexidade criminal. Entre 2024 e 2025 comandou o 5º BPM/M, onde obteve expressiva redução dos índices criminais por meio da integração entre inteligência, ações operacionais e gestão eficiente, deixando legado histórico na Unidade.",
  "Promovido a Tenente Coronel PM por merecimento em novembro de 2025, atualmente comanda o 16º Batalhão de Polícia Militar Metropolitano, reunindo quase três décadas de dedicação à PMESP e reafirmando seu compromisso com a missão constitucional de servir e proteger a sociedade.",
];

export const COMANDANTE_FORMACAO = [
  "Bacharel em Ciências Policiais de Segurança e Ordem Pública — Academia de Polícia Militar do Barro Branco, 2000",
  "Bacharel em Direito — Universidade Eduvale de Avaré, 2011",
  "Mestre em Ciências Policiais de Segurança e Ordem Pública — CAES “Cel PM Nelson Freire Terra”, 2020",
  "Doutor em Ciências Policiais de Segurança e Ordem Pública — CAES “Cel PM Nelson Freire Terra”, 2024",
];

export const COMANDANTE_CONDECORACOES = [
  "Láurea do Mérito Pessoal em 1º grau",
  "Medalha de Honra ao Mérito",
];

export const COMANDANTE_CARREIRA = [
  ["2026 — atual", "Comandante do 16º BPM/M"],
  ["2024 — 2025", "Comandante do 5º BPM/M"],
  ["2024", "Coordenador Operacional — CPA/M-3"],
  ["2021 — 2023", "Coordenador Operacional — 37º BPM/M"],
  ["2019 — 2021", "Classificação — 8º BAEP"],
  ["2015 — 2019", "Classificação — 18º BPM/I"],
  ["2005 — 2015", "Classificação — 42º BPM/I"],
  ["2005", "Operação Verão — 21º BPM/I"],
  ["2003 — 2004", "Classificação — 18º BPM/I"],
  ["2002 — 2003", "Classificação — 42º BPM/I"],
  ["2001 — 2002", "Classificação — 27º BPM/M"],
  ["2000 — 2001", "Classificação — 3º BPTran"],
];

/* ------------------------------------------------------------ companhias */

export const COMPANHIAS: Companhia[] = [
  {
    id: "1cia",
    nome: "1ª Companhia",
    area: "Portal do Morumbi",
    foto: "/16bpmm/cias/cia-1.jpg",
    telefone: "(11) 3746-5559",
    email: "16bpmm1cia@policiamilitar.sp.gov.br",
    endereco: ["R. Antônio da Costa Barbosa, 100", "Vila Andrade, São Paulo/SP", "CEP 05717-220"],
    mapa: "https://www.google.com/maps/place/1%C2%AA+Cia+16%C2%B0+BPM%2FM+-+1%C2%B0+Tenente+Fern%C3%A3o/@-23.6324704,-46.733419,17z",
    texto: [
      "A 1ª Companhia atua em uma das áreas mais estratégicas e contrastantes da Zona Oeste, abrangendo territórios de grande diversidade social. Em sua circunscrição estão bairros de alta relevância econômica, como o Panamby, e regiões de maior vulnerabilidade, como Paraisópolis, onde a presença policial é fundamental para a proteção da população e a manutenção da ordem.",
      "Além de atender a uma comunidade ampla e heterogênea, é responsável pela segurança de pontos estratégicos como o Palácio do Tangará, o Parque Burle Marx, o Shopping Jardim Sul e o Shopping Morumbi Town. O policiamento também se estende às avenidas Giovanni Gronchi e Guilherme Dumont Villares e à Marginal Pinheiros.",
    ],
  },
  {
    id: "2cia",
    nome: "2ª Companhia",
    area: "Morumbi",
    foto: "/16bpmm/cias/cia-2.jpg",
    telefone: "(11) 3742-6918",
    email: "16bpmm2cia@policiamilitar.sp.gov.br",
    endereco: ["Av. Prof. Francisco Morato, 2971", "Butantã, São Paulo/SP", "CEP 05513-400"],
    mapa: "https://www.google.com/maps/place/Pol%C3%ADcia+Militar+-+2%C2%AA+Cia.+do+16%C2%BA+BPM%2FM/@-23.5884393,-46.7268477,20.5z",
    texto: [
      "A 2ª Companhia garante a segurança de locais de grande relevância para o Estado e para a população. Em sua área estão o Palácio dos Bandeirantes, o Estádio do Morumbi, hospitais de referência como o Albert Einstein, importantes estações de metrô, além dos consulados da Rússia, Hungria, República Tcheca e Japão.",
      "Também abrange vias de grande circulação, como as avenidas Giovanni Gronchi, Morumbi e Professor Francisco Morato, que exigem presença constante e pronta resposta.",
    ],
  },
  {
    id: "3cia",
    nome: "3ª Companhia",
    area: "Campo Limpo",
    foto: "/16bpmm/cias/cia-3.jpg",
    telefone: "(11) 5841-2755",
    email: "16bpmm3cia@policiamilitar.sp.gov.br",
    endereco: ["R. Jacaratinga, 201", "Vila Pirajussara, São Paulo/SP", "CEP 05786-120"],
    mapa: "https://www.google.com/maps/place/Pol%C3%ADcia+Militar+-+3%C2%AA+Cia+do+16%C2%BA+BPM%2FM/@-23.6330557,-46.8085012,14z",
    texto: [
      "A 3ª Companhia destaca-se pelo comprometimento constante com a segurança pública e pela excelência no atendimento à comunidade da região do Campo Limpo e áreas adjacentes, desempenhando patrulhamento preventivo, intervenções operacionais e apoio às demais unidades do batalhão.",
      "É a maior companhia do Batalhão, atuando em uma das regiões mais populosas e operacionais da Zona Sul. Somente no distrito do Campo Limpo são aproximadamente 236.162 habitantes, o que demonstra a grandeza da responsabilidade e a complexidade das demandas diárias enfrentadas pelo efetivo.",
    ],
  },
  {
    id: "4cia",
    nome: "4ª Companhia",
    area: "Arpoador",
    foto: "/16bpmm/cias/cia-4.jpg",
    telefone: "(11) 3784-5018",
    email: "16bpmm4cia@policiamilitar.sp.gov.br",
    endereco: ["Av. Arterial Sul, 501", "Jardim Arpoador, São Paulo/SP", "CEP 05571-015"],
    mapa: "https://www.google.com/maps/place/4%C2%B0+Cia+do+16%C2%B0+BPM%2FM./@-23.5938888,-46.8088389,17z",
    texto: [
      "Instituída em 15 de janeiro de 2003, a 4ª Companhia atende a uma população estimada em 210 mil habitantes e cobre uma das principais rotas de acesso à capital paulista: a Rodovia Raposo Tavares e o trecho oeste do Rodoanel Mário Covas, importantes corredores logísticos com intenso fluxo de cargas.",
      "Reconhecida pela excelência de seus serviços, a unidade atua com firmeza, rigor e elevado padrão técnico no enfrentamento à criminalidade e ao tráfico de drogas, assegurando a proteção, o bem-estar e a tranquilidade de toda a comunidade.",
    ],
  },
  {
    id: "ciaft",
    nome: "Cia de Força Tática",
    area: "“Subten PM Ruas”",
    foto: "/16bpmm/cias/cia-ft.jpg",
    telefone: "(11) 3769-2000",
    email: "16bpmmciaftat@policiamilitar.sp.gov.br",
    endereco: ["Av. Corifeu de Azevedo Marques, 4082", "Vila Largeado, São Paulo/SP", "CEP 05340-002"],
    mapa: "https://www.google.com/maps/place/16%C2%B0+BPM%2FM+-+SEDE+-+Pol%C3%ADcia+Militar+SP/@-23.5619081,-46.7466108,17z",
    texto: [
      "A Companhia de Força Tática atua como unidade especializada de pronta resposta, empregada nas ações de maior complexidade e nas ocorrências que exigem elevado nível técnico, precisão operacional e rápida mobilização. Seu efetivo é composto por policiais altamente treinados, preparados para intervenções táticas, patrulhamento direcionado e apoio às demais companhias.",
      "Desempenha papel fundamental no enfrentamento à criminalidade violenta, na repressão qualificada ao tráfico de entorpecentes e na atuação contra organizações criminosas. Realiza operações planejadas, saturações, bloqueios, incursões em áreas sensíveis e apoio às atividades de inteligência.",
    ],
  },
];

/* --------------------------------------------------------------- destaques */

export const OCORRENCIA = {
  periodo: "Novembro de 2025",
  publicado: "08/12/2025",
  titulo:
    "Policiais da 4ª Companhia prendem grupo que planejava roubos, capturam procurado e recuperam veículo roubado com placas falsas.",
  data: "30/10/2025",
  local: "Rua Luísa Crapsi Orsi — Jardim Olympia",
  natureza:
    "Adulteração de sinais identificadores de veículo, falsidade ideológica e captura de procurado.",
  equipe: ["2º Sgt PM 130340-6 Cristofer Feitoza", "Cb PM 148497-4 William Souza Melo"],
  resumo: [
    "Dois indivíduos abordados em veículo GM Prisma após atitude suspeita.",
    "Chave canivete localizada e vinculada a um Fiat Cronos com placas falsas.",
    "Consulta revelou que o Cronos era produto de roubo em Camaçari/BA.",
    "Grupo confessou que estava na região para furtar e roubar veículos.",
    "Um dos infratores apresentou identidade falsa e era procurado por extorsão.",
    "Ocorrência apresentada no 89º DP, com registro de adulteração de sinal identificador, falsidade ideológica e captura de procurado.",
  ],
};

export const POLICIAL = {
  nome: "Sd PM Galindo",
  unidade: "Companhia de Força Tática",
  periodo: "Novembro de 2025",
  publicado: "17/11/2025",
  texto:
    "Pelo elevado grau de profissionalismo, dedicação e comprometimento demonstrados no exercício de suas funções, o Sd PM Galindo tem se destacado continuamente no desempenho de suas atribuições, contribuindo de forma significativa para a eficiência dos serviços prestados por esta Unidade. Destacou-se por atuar diretamente em quatro importantes ocorrências: duas de receptação e adulteração de sinais identificadores de veículo — uma na área da 4ª Cia e outra pela Av. Rebouças —, resultando na restituição de um FIAT/Argo e de um M.Benz/313 CDI Street aos seus proprietários e na prisão dos responsáveis; a captura de um indivíduo procurado pela justiça por tráfico de drogas; e uma ocorrência de cultivo ilegal de drogas, apoiada pelo serviço de inteligência, com a apreensão de nove vasos de substância análoga à maconha.",
  criterios: [
    "Elevado grau de profissionalismo, dedicação e comprometimento",
    "Aguçado tirocínio policial",
    "Iniciativa e comprometimento",
    "Relevância da atuação no mês avaliado",
  ],
};

/* ---------------------------------------------------------------- serviços */

export const SERVICOS = [
  {
    nome: "Assinatura Eletrônica",
    url: "http://prdwinet.ccb.policiamilitar.sp.gov.br/assinatura/play.aspx",
  },
  {
    nome: "Assentamento Individual",
    url: "http://cobomonline.ccb.policiamilitar.sp.gov.br/Singes/login",
  },
  {
    nome: "Boletim Interno",
    url: "http://sisbol.intranet.policiamilitar.sp.gov.br/_sisbolsc8/grid_consulta_bol_int/grid_consulta_bol_int.php",
  },
  {
    nome: "Etiqueta de Armário P/4",
    url: "https://cpam5.intranet.policiamilitar.sp.gov.br/etiqueta.html",
  },
  {
    nome: "Exclusão DEJEM/DELEGADA",
    url: "https://cpam5.intranet.policiamilitar.sp.gov.br/exclusao/login-dejem-delegada.html",
  },
];

/* ----------------------------------------------------------------- heróis */

export const HEROIS: Heroi[] = [
  { n: 1, nome: "Cb PM Antônio Samuel Cardoso", ano: "1975", texto: "Por volta das 14h00 do dia 19 de janeiro de 1975, durante a troca de turno na Guarda do Quartel, no posto denominado \"xadrez\", o Soldado PM Jair Bento Dias, ao passar sua arma de fogo para o Sd PM Antônio Samuel Cardoso, disparou acidentalmente, atingindo o Sd PM Cardoso. Em decorrência do ferimento, o Sd PM Cardoso foi socorrido ao Pronto-Socorro da Lapa, onde veio a óbito." },
  { n: 2, nome: "1º Sgt PM Bernovaldo Muniz", ano: "1977", texto: "Por volta das 09h30 do dia 30 de novembro de 1977, no stand de tiro da Academia de Polícia Militar do Barro Branco, o 2º Sgt PM Bernovaldo Muniz, lotado no Centro de Suprimento de Material (CSM/MB), durante serviço de destruição de pólvora inaproveitável, mediante quima por processo de rastilho, faleceu instantaneamente em decorrência de uma explosão." },
  { n: 3, nome: "Cb PM Julio Carlos da Silva Filho", ano: "1977", texto: "Por volta das 00h00 do dia 19 de maio de 1977, o Sd PM Julio Carlos da Silva Filho, enquanto atuava como auxiliar da viatura de PTM, foi atingido por um disparo de arma de fogo durante atendimento a uma ocorrência de desentendimento na Favela do Paraisópolis, localizado na Rua Nilo Peçanha nº 1. O disparo foi efetuado por Ireno Francisco da Silva Filho, residente em um dos barracos da favela, e resultou na morte do policial." },
  { n: 4, nome: "3º Sgt PM José Alves Filho", ano: "1979", texto: "Por volta das 11h00 do dia 10 de abril de 1979, durante a \"Operação Pagamento\" na Avenida Giovanni Gronchi, na altura do número 3891 (Construtora Adolfo Lidenberg), o Cb PM José Alves Filho, foi mortalmente atingido por três disparos de arma de fogo ao tentar identificar indivíduos suspeitos. Não houve oportunidade de reação." },
  { n: 5, nome: "1º Sgt PM Miguel Miranda de Lisboa", ano: "1981", texto: "O 2º Sgt PM Miguel Miranda de Lisboa faleceu em 4 de abril de 1981." },
  { n: 6, nome: "1º Ten PM Rage paulo Zaher Neto", ano: "1982", texto: "Por volta da 01h00 do dia 16 de março de 1982, no Jardim Olinda, no Campo Limpo, o 2º Ten PM Paulo Zaher Neto foi mortalmente atingido por u disparo de arma de fogo enquanto comandava a Ronda Oficial de prefixo M-1692 durante atendimento de ocorrência." },
  { n: 7, nome: "Cb PM Remídio da Cruz", ano: "1983", texto: "Em 06 de agosto de 1983, faleceu o Sd PM José Remídio da Cruz. O óbito foi registrado no Cartório do 29º Subdistrito - Santo Amaro, desta capital." },
  { n: 8, nome: "Cb PM José Mauro Souto Uriazeniki", ano: "1984", texto: "Por volta das 08h30 do dia 10 de maio de 1984, durante a \"Operação Pagamento\", o Sd PM José Mauro Souto Uriazeniki, foi mortalmente atingindo por disparos de arma de fogo efetuado por assaltantes enquanto cumpria suas funções de segurança." },
  { n: 9, nome: "3º Sgt PM Jorge Honorato", ano: "1984", texto: "Na noite de 28 de dezembro de 1984, por volta das 21h00, na Av. Corifeu de Azevedo Marques, altura do numeral 3.300, no Bairro do Butantã, ocorreu um acidente automobilístico envolvendo a viatura policial de prefixo M-1693. Em decorrência do acidente, o Cb PM Jorge Honorato, responsável pela viatura, faleceu." },
  { n: 10, nome: "Cb PM Salvador da Costa", ano: "1985", texto: "No dia 04 de dezembro de 1985, por volta das 13h45, o Sd PM Salvador da Costa, foi mortalmente atingido por disparos de arma de fogo durante assalto a um banco, na Rua Gwtúlio Vargas nº 94, em Taboão da Serra. O policial estava fardado e dirigindo-se ao serviço no momento do crime." },
  { n: 11, nome: "Cb PM Manoel dos Santos Pelegrino Junior", ano: "1985", texto: "Na madrugada do dia 13 de outubro de 1985, por volta das 03h45, na Estrada do Campo Limpo, altura do numeral 3.915, ocorreu um acidente de trânsito envolvendo a viatura policial de rádio patrulha M-1636. Em decorrência do acidente, o Sd PM Manoel dos Santos Pelegrino Junior, que atuava como auxiliar da guarnição, faleceu." },
  { n: 12, nome: "Cb PM Adilson Vilela de Camargo", ano: "1985", texto: "Na madrugada do dia 21 de dezembro de 1985, por volta das 00h20, na Rodovia Raposo Tavares, próximo ao KM 16, os soldados Sidnei Rodrigues da Silva e Adilson Vilela Camargo, foram tragicamente atropelados e Mortos enquanto prestavam socorro a uma vítima de acidente de trânsito." },
  { n: 13, nome: "Cb PM Sidnei Rodrigues da Silva", ano: "1985", texto: "Na madrugada do dia 21 de dezembro de 1985, por volta das 00h20, na Rodovia Raposo Tavares, próximo ao KM 16, os soldados Sidnei Rodrigues da Silva e Adilson Vilela Camargo, foram tragicamente atropelados e Mortos enquanto prestavam socorro a uma vítima de acidente de trânsito." },
  { n: 14, nome: "Cb PM Geraldo Silva Filho", ano: "1986", texto: "Na noite de 04 de junho de 1986, por volta das 22h20, na Rua Manoel Guedes nº 480, o Sd PM Geraldo Silva Filho, foi acidentalmente atingido por um disparo de arma de fogo proveniente de um colega de guarnição, enquanto ambos estavam em serviço na viatura prefixo M-16451." },
  { n: 15, nome: "1º Ten PM Fernão Gomes Loureiro", ano: "1987", texto: "Na manhã de 16 de abril de 1987, por volta das 07h30, na Rua Honorato Faustino nº 75, no Bairro de Pinheiros, o 2º Ten PM Fernão Gomes Loureiro, foi atingido por disparo de arma de fogo durante uma ocorrência de roubo a residência. O oficial estava realizando policiamento motorizado no momento do incidente." },
  { n: 16, nome: "Cb PM Wilson Mariano de Oliveira", ano: "1993", texto: "O Sd PM Wilson Mariano de Oliveira veio a falecer em 30 de junho de 1996, em decorrência de um acidente ocorrido durante o exercício de suas funções. Seu óbito foi registrado no Cartório de Registro Civil do 29º Subdistrito de Santo Amaro, em São Paulo." },
  { n: 17, nome: "Cb PM Wilson Roberto Jorge", ano: "1995", texto: "O Sd PM Wilson Roberto Jorge, faleceu em serviço no dia 06 de janeiro de 1995, em decorrência de um acidente." },
  { n: 18, nome: "Cb PM Luciano Medeiros de Oliveira", ano: "1996", texto: "O Sd PM Luciano Medeiros de Oliveira, faleceu em serviço no dia 12 de janeiro de 1996, em decorrência de um acidente." },
  { n: 19, nome: "Subten PM Osmar Schreiner", ano: "1996", texto: "O 1º Sgt PM Osmar Schreiner faleceu em serviço no dia 27 de março de 1996, em decorrência de um acidente." },
  { n: 20, nome: "Cb PM Silvio José de Andrade", ano: "1997", texto: "O Sd PM Silvio José de Andrade, faleceu em serviço no dia 23 de dezembro de 1997, em decorrência de um disparo de fuzil sofrido durante uma operação na Comunidade do Sapé." },
  { n: 21, nome: "Cb PM Edmilson Viana dos Santos", ano: "1999", texto: "O Sd PM Edmilson Viana dos Santos faleceu em serviço no dia 26 de janeiro de 1999, em decorrência de um acidente." },
  { n: 22, nome: "Cb PM Carlos Lorenzeto Garcia", ano: "2001", texto: "" },
  { n: 23, nome: "2º Sgt PM Nelson Aparecido Geraldi", ano: "2002", texto: "" },
  { n: 24, nome: "Cb PM Samuel Carpani de Oliveira", ano: "2004", texto: "No dia 09 de março de 2004 por volta das 23h30, durante patrtulhamento na Avenida São Remo, esquina com a Rua Aquianés, a equipe do policiamento velado, composta pelos soldados Samuel Carpani de Oliveira e Ednaldo Alves da Silva, conduzindo a viatura GM/Corsa, foi surpreendida por indivíduos não identificados que efetuaram disparos de arma de fogo contra a viatura. Em decorrência dos disparos o Sd PM Ednaldo Alves da Silva foi atingido e socorrido ao Pronto-Socorro do Hospital Universitário, onde veio a óbito. O Sd PM Samuel Carpani de Oliveira também foi atingido e encaminhado ao Pornto-Socorro do Hospital das Clínicas, onde recebeu atendimento médico. Durante a ação criminosa, os indivíduos substraíram da viatura policial dois coletes balísticos, uma pistola Taurus PT 100-AF, calibre .40 e cinco carregadores. Além dos danos causados pelos disparos de arma de fogo, a viatura policial colidiu contra a parede de uma residência." },
  { n: 25, nome: "Cb PM Ednaldo Alves da Silva", ano: "2004", texto: "No dia 09 de março de 2004 por volta das 23h30, durante patrtulhamento na Avenida São Remo, esquina com a Rua Aquianés, a equipe do policiamento velado, composta pelos soldados Samuel Carpani de Oliveira e Ednaldo Alves da Silva, conduzindo a viatura GM/Corsa, foi surpreendida por indivíduos não identificados que efetuaram disparos de arma de fogo contra a viatura. Em decorrência dos disparos o Sd PM Ednaldo Alves da Silva foi atingido e socorrido ao Pronto-Socorro do Hospital Universitário, onde veio a óbito. O Sd PM Samuel Carpani de Oliveira também foi atingido e encaminhado ao Pornto-Socorro do Hospital das Clínicas, onde recebeu atendimento médico. Durante a ação criminosa, os indivíduos substraíram da viatura policial dois coletes balísticos, uma pistola Taurus PT 100-AF, calibre .40 e cinco carregadores. Além dos danos causados pelos disparos de arma de fogo, a viatura policial colidiu contra a parede de uma residência." },
  { n: 26, nome: "Cb PM Osmar Santos Ferreira", ano: "2012", texto: "O Sd PM Osmar Santos Ferreira foi vítima de homicídio no dia 22 de junho de 2012, por volta das 05h20, na Avenida Prefeito Paulo Laudo nº 106." },
  { n: 27, nome: "Cb PM Orlando da Silva Alencar", ano: "2012", texto: "Durante o atendimento a uma ocorrência de roubo irradiada via COPOM, na Rua Jaime Americano nº 26-A, os soldados Orlando da Silva Alencar e Rafael Ribeiro Fazolin, em patrulhamento com motocicletas, foram surpreendidos por um dos autores do roubo, identificado como Gleisson de Araújo Ribeiro. Armado, o criminoso avistou o Sd PM Alencar e efetuou diversos disparos contra ele, atingindo-o no rosto, costas e pernas. O policial foi socorrido e encaminhado ao Hospital Universitário, mas, infelizmente não resistiu aos ferimentos e veio a óbito." },
  { n: 28, nome: "Cb PM Geraldo Wolnei Siqueira", ano: "2015", texto: "No dia 17 de março de 2015 por volta das 15h30, o Sd PM Geraldo Wolnei Siqueira, durante patrulhamento a pé, foi fatalmente atropelado por um veículo Toyota Corrola, na Avenida Lineu de Paula Machado nº 900. O condutor do veículo, ao perceber a ação policial, tentou fugir, atropelando o policial militar. O Sd PM Siqueira sofreu traumatismo cranioencefálico e veio a óbito no dia 01 de abril de 2015, após ser hospitalizado." },
  { n: 29, nome: "Cb PM Ismael dos Santos", ano: "2018", texto: "Após o COPOM informar sobre um veículo Honda Fit prata, produto de roubo, durante o patrulhamento pela Estrada do Campo Limpo e Avenida Anacé, ao avistar o veículo, os policiais iniciaram o acompanhamento, mas, na Rua Eçaúna nº 285, o Sd PM Ismael que vinha em segundo na equipe, perdeu o controle da motocicleta ao passar por uma depressão na via, colidindo contra um veículo Ford Fiesta que estava estacionado. Em decorrência do impacto, o policial foi arremessado ao solo, sofrendo graves lesões, incluindo traumatismo craniano. O Sd PM Ismael foi socorrido e encaminhado ao Hospital do Campo Limpo, onde recebeu atendimento especializado, mas, infelizmente, não resistiu aos ferimentos e veio a óbito no dia 14 de janeiro de 2018." },
  { n: 30, nome: "Subten PM Ronaldo Ruas Silva", ano: "2019", texto: "" },
  { n: 31, nome: "Cb PM Felipe Jorge Pini Bubinick", ano: "2020", texto: "" },
];

