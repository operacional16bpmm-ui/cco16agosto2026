/**
 * ARQUIVO GERADO. Nao editar a mao.
 *
 * Gerado por Desktop\CCO16-Boletins\montar_pagina.py a partir de:
 *   coleta_bg.json  Boletim Geral PM, site da Diretoria de Pessoal
 *   coleta_bi.json  Boletim Interno do CPA/M-5, SISBOL
 *   resumos.json    leitura e resumo dos boletins
 *
 * Para atualizar: rodar coletor_bg.py, a etapa de navegador do BI,
 * coletor_bi.py e por fim montar_pagina.py. Depois deployar com
 * `npx vercel deploy --prod --yes` (o push do git nao publica).
 *
 * Por que os dados vivem em arquivo e nao em fetch: a Vercel esta na
 * internet publica e nao alcanca a intranet da PMESP. Quem tem acesso as
 * duas fontes e a maquina dentro da rede, entao ela colhe, resume e
 * commita o resultado.
 */

export type DestaqueBoletim = {
  parte: string;
  titulo: string;
  notas: string[];
  motivo: string;
  resumo: string;
};

export type Boletim = {
  tipo: "BG" | "BI";
  numero: string;
  ano: number;
  data: string;
  origem: string;
  url: string | null;
  /** true quando o link leva a grade de busca, e nao ao documento em si. */
  urlEhGrade: boolean;
  anexos: { titulo: string; url: string }[];
  paginas: number;
  totalItens: number;
  naSemana: boolean;
  resumo: string;
  pertinencias: string[];
  destaques: DestaqueBoletim[];
};

export type DadosBoletins = {
  geradoEm: string;
  semana: { inicio: string; fim: string };
  fontes: { bg: string; bi: string };
  boletins: Boletim[];
};

export const DADOS_BOLETINS: DadosBoletins = {
  "geradoEm": "2026-08-06T13:11:06",
  "semana": {
    "inicio": "2026-08-03",
    "fim": "2026-08-09"
  },
  "fontes": {
    "bg": "https://dp.intranet.policiamilitar.sp.gov.br/boletim/",
    "bi": "http://sisbol.intranet.pm.sp.gov.br/_sisbolsc8/grid_visualizar_bol_intranet/"
  },
  "boletins": [
    {
      "tipo": "BG",
      "numero": "146",
      "ano": 2026,
      "data": "2026-08-06",
      "origem": "Quartel do Comando Geral",
      "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/ddc8b1db-5fa2-4caf-83c2-5f8c19f62c74/content",
      "urlEhGrade": false,
      "anexos": [
        {
          "titulo": "Bol G PM 146/2026 de 06/08/2026 - DOESP",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/527d8f66-fd35-4c8c-891f-d007d63f50b5/content"
        },
        {
          "titulo": "Bol G PM 146/2026 de 06/08/2026 - Suplemento Apresentação Juízo",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/3f79af1e-495a-433e-887e-a08bccc70fe1/content"
        }
      ],
      "paginas": 7,
      "totalItens": 10,
      "naSemana": true,
      "resumo": "Boletim curto, 7 páginas, sem nenhuma matéria que cite o 16º BPM/M. A 2ª Parte traz averbações de tempo de contribuição para inatividade, uma retificação de averbação, concessão de redução de jornada semanal de 50% com base em laudos do IMESC (Portaria PM1-003/02/25 combinada com o Decreto 69.045/24) e uma licença para tratamento de saúde tornada sem efeito. A 3ª Parte é de movimentação de ensino: desligamentos do CEP de Operações Táticas Especiais I/26 no 4º BPChq, matéria do CSTPOP e autorização para dirigir viatura orgânica no CMM. A 4ª Parte registra perda de graduação por decisão judicial. A 5ª Parte concede a Medalha do Cinquentenário do Centro Médico da PM e a do Cinquentenário do 13º BPM/I.",
      "pertinencias": [
        "Nenhuma matéria cita o 16º BPM/M ou o CPA/M-5. Boletim sem reflexo direto na Unidade."
      ],
      "destaques": []
    },
    {
      "tipo": "BG",
      "numero": "145",
      "ano": 2026,
      "data": "2026-08-05",
      "origem": "Quartel do Comando Geral",
      "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/8b1db615-62ca-4b71-8a7c-e38c4adc765d/content",
      "urlEhGrade": false,
      "anexos": [
        {
          "titulo": "Bol G PM 145/2026 de 05/08/2026 - DOESP",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/0e78a777-9be2-4836-bc92-cf7f8f582163/content"
        },
        {
          "titulo": "Bol G PM 145/2026 de 05/08/2026 - Suplemento Apresentação Juízo",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/1e867a26-57c3-44f5-8925-f90a866811bc/content"
        }
      ],
      "paginas": 14,
      "totalItens": 16,
      "naSemana": true,
      "resumo": "14 páginas, com a 2ª Parte dominada por licença-prêmio, em quatro modalidades: conversão em pecúnia, regularização, concessão judicial e fruição, além de averbações e horário especial. A 3ª Parte concentra ensino: medalhas Pedro Dias de Campos dos cursos CBEF/24, CAO II/24, CSP II/24 e CAS II/25, desligamentos do CEP de Negociação de Crises e do CEP de Operações Táticas Especiais I/26, e a relação nominal dos policiais aprovados no Treinamento de Adaptação ao uso da pistola Glock G45, realizado em 30JUL26 pela EEF.",
      "pertinencias": [
        "Item 8, licença-prêmio convertida em pecúnia: entre os beneficiados está a Sd PM 193490-2 Graziella Aparecida Oliveira Ramaldes, do 16º BPM/M, parcela de 30 dias referente ao período de 16JUL19 a 14JUL24 (bloco 185/24), com mês aniversário em outubro de 2026 (NOTAS DP-535, 536 e 537/133/26).",
        "Item 16 não cita a Unidade, mas vale acompanhar: é a lista oficial de habilitados na Glock G45. Policial do Batalhão só porta a arma depois de figurar em relação como essa, então a publicação é o marco a conferir."
      ],
      "destaques": [
        {
          "parte": "2ª PARTE",
          "titulo": "8 - LICENÇA-PRÊMIO - CONVERSÃO EM PECÚNIA",
          "notas": [
            "DP-535/133/26",
            "DP-536/133/26",
            "DP-537/133/26"
          ],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        }
      ]
    },
    {
      "tipo": "BI",
      "numero": "53",
      "ano": 2026,
      "data": "2026-08-04",
      "origem": "CPA/M-5",
      "url": "http://sisbol.intranet.pm.sp.gov.br/_sisbolsc8/grid_visualizar_bol_intranet/",
      "urlEhGrade": true,
      "anexos": [],
      "paginas": 44,
      "totalItens": 19,
      "naSemana": true,
      "resumo": "Boletim Interno do CPA/M-5 de 04AGO26, 44 páginas, reunindo matérias das Unidades subordinadas ao Comando de Policiamento de Área Metropolitana 5, entre elas o 16º, o 23º e o 49º BPM/M. A 2ª Parte concentra dispensas de serviço, convalescença médica, láureas do mérito pessoal de 3º a 5º grau e licença-prêmio. A 3ª Parte trata de habilitação em armamento, com o 49º BPM/M publicando conclusões de curso de fuzil FN SCAR H/L e de espingarda Benelli M3 calibre 12, além de certificados e TAF. A 4ª Parte traz elogio individual, decisão de sindicância e duas prorrogações de prazo.",
      "pertinencias": [
        "Item 16, prorrogação de prazo: a Sindicância de Portaria nº 16BPMM-031/406/25 foi prorrogada por mais 90 dias corridos, a contar do recebimento em 30/07/2026, por meio do Despacho nº CPAM5-370/160/26. É o único item da semana com prazo correndo contra a Unidade (NBI nº 16.BPM/M 154/40/2026).",
        "Item 19, elogio individual: Sd PM 201970-1 Weysser Fabrício Felis da Silva, pela prisão, em 19JUL26, de autora de roubo a estabelecimento comercial cometido com arma branca. O policial iniciou patrulhamento imediato após acionamento do COPOM e localizou a autora.",
        "Item 7, Láurea do Mérito Pessoal em 4º Grau ao Cb PM Dias, por atuação decisiva em ocorrência de roubo que resultou em prisão em flagrante de um dos autores e recuperação de bens.",
        "Item 2, afastamento do país: Sd PM 160637-9 Erika Santos Amorim, radiopatrulha da 3ª Cia, autorizada a viajar à Itália de 12JUN26 a 26JUN26, sem ônus para o Estado e sem prejuízo dos vencimentos (NBI nº 16.BPM/M 55/30/2026).",
        "Item 3, licença-paternidade: Sd PM 244294-9 Lucas Henrique Rodrigues, 20 dias a contar de 29/07/2026, data do nascimento (NBI nº 16.BPM/M 66/30/2026)."
      ],
      "destaques": [
        {
          "parte": "4ª PARTE",
          "titulo": "16 - PRORROGAÇÃO DE PRAZO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "4ª PARTE",
          "titulo": "19 - ELOGIO INDIVIDUAL",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita Morumbi, Butantã; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "2 - AFASTAMENTO DO PAÍS - AUTORIZAÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "3 - CERTIDÃO DE NASCIMENTO",
          "notas": [],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "7 - LÁUREA DO MÉRITO PESSOAL - 4º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "8 - LÁUREA DO MÉRITO PESSOAL - 5º GRAU",
          "notas": [],
          "motivo": "cita Butantã; cita o CPA/M-5",
          "resumo": ""
        }
      ]
    },
    {
      "tipo": "BG",
      "numero": "144",
      "ano": 2026,
      "data": "2026-08-04",
      "origem": "Quartel do Comando Geral",
      "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/827f799e-f5d4-4fa2-9303-22f054f8e4b4/content",
      "urlEhGrade": false,
      "anexos": [
        {
          "titulo": "Bol G PM 144/2026 de 04/08/2026 - DOESP",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/692c4322-14d8-4669-b5d6-b8ef4fab68a9/content"
        },
        {
          "titulo": "Bol G PM 144/2026 de 04/08/2026 - Suplemento Apresentação Juízo",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/e922a66a-787b-424e-8aca-aed8351a1236/content"
        }
      ],
      "paginas": 22,
      "totalItens": 15,
      "naSemana": true,
      "resumo": "O maior da semana, 22 páginas, quase todo dedicado a ensino: quinze alterações do CCE/26 envolvendo cursos de condutores de transporte coletivo, mergulho autônomo, multiplicador de polícia comunitária, operação de viaturas de bombeiro, operador do sistema de saúde mental, polícia montada, resgate e emergências médicas, salvamento veicular e técnicas de direção policial preventiva. Abre com adicional quinquenal e fecha com a 4ª Parte disciplinar, que traz uma decisão final de Conselho de Disciplina do 29º BPM/I e duas decisões finais de Processo Administrativo Disciplinar.",
      "pertinencias": [
        "Item 15, PAD nº CPC-012/61/25, Decisão Final CorregPM-162/350/26: o Sd PM 190704-2 Gabriel Correia Guimarães, do 16º BPM/M, foi demitido da Instituição, nos termos do Art. 23, inciso II, alínea c do RDPM, por atos atentatórios à Instituição, ao Estado e aos direitos humanos fundamentais. A decisão determina publicação da ementa em Diário Oficial do Estado e do inteiro teor em Bol G PM, com remessa dos autos à Corregedoria. É a matéria de maior peso da semana para o Batalhão (NOTA CORREGPM-236/350/26)."
      ],
      "destaques": [
        {
          "parte": "4ª PARTE",
          "titulo": "15 - PROCESSO ADMINISTRATIVO DISCIPLINAR - DECISÃO FINAL",
          "notas": [
            "CORREGPM-236/350/26",
            "CORREGPM-208/350/26"
          ],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        },
        {
          "parte": "4ª PARTE",
          "titulo": "14 - CONSELHO DE DISCIPLINA - DECISÃO FINAL",
          "notas": [
            "CORREGPM-188/330/26",
            "CORREGPM-196/330/26",
            "CORREGPM-215/330/26"
          ],
          "motivo": "obrigação com prazo que alcança a Unidade",
          "resumo": ""
        }
      ]
    },
    {
      "tipo": "BG",
      "numero": "143",
      "ano": 2026,
      "data": "2026-08-03",
      "origem": "Quartel do Comando Geral",
      "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/8c2109d5-700f-4204-9827-b9610b460d9f/content",
      "urlEhGrade": false,
      "anexos": [
        {
          "titulo": "Bol G PM 143/2026 de 03/08/2026 - DOESP",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/503b8d44-3785-4b04-8878-d7d664be6399/content"
        },
        {
          "titulo": "Bol G PM 143/2026 de 03/08/2026 - Suplemento Apresentação Juízo",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/78ae858b-de46-4adf-9f26-e471945bdd12/content"
        },
        {
          "titulo": "Bol G PM 143/2026 de 03/08/2026 - Suplemento Movimentação",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/9a6e9555-f4a2-4deb-ba76-e5414e2f6959/content"
        },
        {
          "titulo": "Bol G PM 143/2026 de 03/08/2026 - Suplemento Movimentação",
          "url": "https://repositorio.intranet.policiamilitar.sp.gov.br/server/api/core/bitstreams/cb907d4b-512a-4aca-b61f-50504d5c9f88/content"
        }
      ],
      "paginas": 7,
      "totalItens": 8,
      "naSemana": true,
      "resumo": "7 páginas com quatro anexos, o maior número de anexos da semana. A 2ª Parte é integralmente de averbação de tempo de serviço e contribuição para fins de inatividade. A 3ª Parte trata do CSTPOP, de exclusão de atividade de ensino do CCE/26 e de desligamento do CEP de Capacitação de Tutores para Educação a Distância. A 4ª Parte registra perda de graduação por decisão judicial.",
      "pertinencias": [
        "Item 3, averbação: consta o Cb PM 981173-7 Décio Ribeiro de Carvalho, lotado no CPA/M-5, com 700 dias averbados. É do nosso Grande Comando, não do Batalhão.",
        "Item 6, exclusão de atividade de ensino: a turma I do CEP de Técnicas de Policiamento Náutico, prevista para 03AGO26 a 31AGO26 (código SIHA 72232), foi excluída do CCE/26 por provocação do 3º BPAmb. Quem tiver indicação para essa turma perde a vaga (NOTA DEC-128/27/26).",
        "Cuidado com falso positivo neste boletim: o item 1 cita o Cb PM Edenilton dos Santos Pereira do 16º BPM/I, que é Batalhão do Interior e não tem relação com o 16º BPM/M."
      ],
      "destaques": [
        {
          "parte": "2ª PARTE",
          "titulo": "3 - AVERBAÇÃO",
          "notas": [
            "DP-644/141/26",
            "DP-647/141/26",
            "DP-648/141/26",
            "DP-707/141/26"
          ],
          "motivo": "cita o CPA/M-5",
          "resumo": ""
        }
      ]
    },
    {
      "tipo": "BI",
      "numero": "52",
      "ano": 2026,
      "data": "2026-07-31",
      "origem": "CPA/M-5",
      "url": "http://sisbol.intranet.pm.sp.gov.br/_sisbolsc8/grid_visualizar_bol_intranet/",
      "urlEhGrade": true,
      "anexos": [],
      "paginas": 60,
      "totalItens": 43,
      "naSemana": false,
      "resumo": "O mais extenso do período, 60 páginas, com 17 matérias citando o 16º BPM/M. A 2ª Parte é dominada por férias, licença-prêmio, dispensas, láureas de 3º a 5º grau, luto e assentamentos civis. A 3ª Parte traz habilitação em arma de fogo, ata de reunião, TAF, TAT e treinamento. A 4ª Parte é a que exige acompanhamento: justificação de transgressão disciplinar, nota de culpa, decisão de procedimento disciplinar e decisão de sindicância.",
      "pertinencias": [
        "Itens 11 e 23, inclusão no estado efetivo: o 1º Ten PM Fernão Gomes Loureiro foi incluído no Estado Efetivo do 16º BPM/M e classificado na 1ª Cia. Os dois itens repetem o mesmo texto com datas diferentes, 29JUN26 num e 26JUN26 no outro, então convém conferir no documento qual prevalece. Nos mesmos itens vêm as classificações de novos Sd PM em radiopatrulhamento e de 3º Sgt PM em comando de grupo de patrulha.",
        "Item 40, justificação de transgressão disciplinar: Sd PM 244294-9 Lucas Henrique Rodrigues, da 3ª Cia, no PD nº 16BPMM-047/306/26, por ter deixado de classificar no sistema Motorola o vídeo da ocorrência de averiguação atendida em 15NOV25 na Rua Guntur, nº 199, Vale das Virtudes, contrariando a Diretriz PM3-001/02/25.",
        "Item 41, nota de culpa: Cb PM 143117-0 Heber Júnior Pantaleão, da 3ª Cia, no PD nº 16BPMM-216/306/25, por uso de força desnecessária em abordagem na Rua Manoel Pedro de Almeida, nº 135, Campo Limpo, em 25DEZ24, em desacordo com o M-3-PM, e por deixar de acionar intencionalmente a Câmera Operacional Portátil.",
        "Item 32, ata de reunião: recepção dos 3º Sgt PM recém-formados na ESSgt, conduzida pelo Ten Cel PM Minosso, Comandante do Batalhão, com apresentação das características e particularidades das Companhias e o Cap PM Souza Filho como coordenador da integração.",
        "Observação de conjunto: os itens 40 e 41 apontam para o mesmo ponto de controle, a Câmera Operacional Portátil, um por falha de classificação do vídeo e outro por não acionamento. Vale cruzar com a auditoria de COP já mantida no portal."
      ],
      "destaques": [
        {
          "parte": "2ª PARTE",
          "titulo": "11 - INCLUSÃO DO ESTADO EFETIVO - CLASSIFICAÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "12 - LÁUREA DO MÉRITO PESSOAL - 3º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "13 - LICENÇA PRÊMIO - FRUIÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "18 - DISPENSA DO SERVIÇO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "21 - FÉRIAS - CONCESSÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "23 - INCLUSÃO DO ESTADO EFETIVO - CLASSIFICAÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "24 - LÁUREA DO MÉRITO PESSOAL - 3º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "25 - LÁUREA DO MÉRITO PESSOAL - 4º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita Paraisópolis; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "26 - LÁUREA DO MÉRITO PESSOAL - 5º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "27 - LICENÇA PRÊMIO - FRUIÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "30 - UNIÃO ESTÁVEL",
          "notas": [],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        },
        {
          "parte": "3ª PARTE",
          "titulo": "32 - ATA DE REUNIÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        }
      ]
    },
    {
      "tipo": "BI",
      "numero": "51",
      "ano": 2026,
      "data": "2026-07-27",
      "origem": "CPA/M-5",
      "url": "http://sisbol.intranet.pm.sp.gov.br/_sisbolsc8/grid_visualizar_bol_intranet/",
      "urlEhGrade": true,
      "anexos": [],
      "paginas": 54,
      "totalItens": 41,
      "naSemana": false,
      "resumo": "54 páginas, com 21 matérias citando o 16º BPM/M, o maior volume do período. A 2ª Parte é quase toda de férias, licença-prêmio, dispensa do serviço, dispensa recompensa, láureas de 2º a 5º grau, luto e assentamentos civis. A 3ª Parte traz conclusão de curso, ata de inutilização de material, termo de passagem de carga e substituição de detentor executivo. A 4ª Parte concentra medalhística, decisão de procedimento disciplinar, recurso hierárquico, portaria de sindicância, elogio e louvor.",
      "pertinencias": [
        "Item 39, reconsideração de ato indeferida: Cb PM 128726-5 Maurício Natal de Brito Silva, acusado no PD nº 16BPMM-030/06/26, apurado na Sindicância de Portaria nº 16BPMM-059/06/24, por desativar a captação sonora da Câmera Operacional Portátil em desacordo com a Diretriz PM3-001/02/25, empregar munição de impacto controlado sem habilitação específica e conduzir motocicleta apreendida. O pedido de reconsideração foi indeferido.",
        "Item 35, Medalha do Mérito Patrulhamento Tático ao Sd PM 231005-8 João Victor Santana Ruas, outorgada pela Academia de Medalhística Cívico Militar do Brasil (NBI nº CPA/M-5 220/500/2026).",
        "Item 28, conclusão de curso: Cb PM 153266-9 Maycon Galdino Severiano concluiu com conceito Muito Bom o Curso de Especialização Profissional em Inteligência Policial para Praças (NBI nº 16.BPM/M 71/01/2026).",
        "Item 25, ata de inutilização nº 16BPMM-002/4.4/2026, lavrada na sede da 4ª Cia em 01JUN26, com relação de material permanente e de consumo inutilizado.",
        "Item 11, anulação de publicação: a Láurea do Mérito Pessoal em 5º Grau do Sd PM 201455-6 Bruno Henrique Costa Muniz, publicada no BI CPA/M-5 010 de 23FEV23, foi anulada por duplicidade com a NBI nº 16.BPM/M 303/40/2022."
      ],
      "destaques": [
        {
          "parte": "2ª PARTE",
          "titulo": "1 - FÉRIAS",
          "notas": [],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "11 - ANULAÇÃO DE PUBLICAÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "12 - CERTIDÃO DE CASAMENTO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita Butantã; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "13 - CERTIDÃO DE NASCIMENTO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita Butanta",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "15 - DISPENSA DO SERVIÇO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "16 - FÉRIAS",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "18 - LÁUREA DO MÉRITO PESSOAL - 3º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "21 - LICENÇA PRÊMIO - FRUIÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "22 - LICENÇA PRÊMIO - SOBRESTAMENTO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "3ª PARTE",
          "titulo": "25 - ATA DE INUTILIZAÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "3ª PARTE",
          "titulo": "26 - CERTIFICADO - ENTREGA",
          "notas": [],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        },
        {
          "parte": "3ª PARTE",
          "titulo": "28 - CURSO - CONCLUSÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        }
      ]
    },
    {
      "tipo": "BI",
      "numero": "50",
      "ano": 2026,
      "data": "2026-07-24",
      "origem": "CPA/M-5",
      "url": "http://sisbol.intranet.pm.sp.gov.br/_sisbolsc8/grid_visualizar_bol_intranet/",
      "urlEhGrade": true,
      "anexos": [],
      "paginas": 59,
      "totalItens": 31,
      "naSemana": false,
      "resumo": "59 páginas, com 16 matérias citando o 16º BPM/M, com peso em férias, sobrestamento de férias, licença-prêmio, dispensas e láureas de 3º a 5º grau. A 3ª Parte registra entrega de certificado, publicação de EAP, TAF e TAT, estágio de adaptação operacional, habilitação, regularização de passagem de carga e conclusão de treinamento. A 4ª Parte traz conversão de sanção de permanência disciplinar, homologação e decisão de sindicância, justificação de transgressão e elogio individual.",
      "pertinencias": [
        "Item 22, Estágio de Adaptação Operacional: outorga do Braçal de Força Tática do 16º BPM/M, denominado 1º Ten PM Fernão, ao Sd PM 231005-8 João Victor Santana Ruas, após conclusão do estágio com aproveitamento, em cerimônia realizada em 13/07/2026 (NBI nº CPA/M-5 219/500/2026).",
        "Item 24, passagem de carga: em 08JUL26, na sede da 3ª Cia, sob presidência do Comandante do Batalhão, o Maj PM 104541-5 Regivaldo Robson Vicente passou a carga de materiais ao 1º Ten PM Leonardo Oliveira Passarini.",
        "Item 32, elogio individual: o texto menciona Morumbi, Campo Limpo e Raposo Tavares, ou seja, alcança as três frentes de área do Batalhão.",
        "Itens 1, 2, 7 e 13, férias e sobrestamento de férias de efetivo do Batalhão. É a matéria de maior impacto direto na escala do período."
      ],
      "destaques": [
        {
          "parte": "2ª PARTE",
          "titulo": "1 - FÉRIAS",
          "notas": [],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "10 - LICENÇA PRÊMIO - FRUIÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "12 - DISPENSA DO SERVIÇO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "13 - FÉRIAS",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "15 - LÁUREA DO MÉRITO PESSOAL - 3º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "16 - LÁUREA DO MÉRITO PESSOAL - 4º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "17 - LÁUREA DO MÉRITO PESSOAL - 5º GRAU",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "18 - LICENÇA PRÊMIO - FRUIÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "2ª PARTE",
          "titulo": "2 - FÉRIAS - SOBRESTAMENTO",
          "notas": [],
          "motivo": "cita o 16º BPM/M",
          "resumo": ""
        },
        {
          "parte": "3ª PARTE",
          "titulo": "22 - ESTAGIO ADAPTAÇÃO OPERACIONAL - EAO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "3ª PARTE",
          "titulo": "23 - HABILITAÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        },
        {
          "parte": "3ª PARTE",
          "titulo": "24 - PASSAGEM DE CARGA - REGULARIZAÇÃO",
          "notas": [],
          "motivo": "cita o 16º BPM/M; cita o CPA/M-5",
          "resumo": ""
        }
      ]
    }
  ]
};
