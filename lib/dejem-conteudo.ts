/**
 * Texto do estudo DEJEM. Só TEXTO — nenhum número mora aqui.
 *
 * A regra é dura de propósito: todo número da página sai de consulta ao banco,
 * via lib/db/dejem.ts. Se um valor fosse escrito nesta constante, ele
 * congelaria e passaria a divergir da fonte na carga seguinte, sem ninguém
 * perceber. Onde o texto precisa citar um número, ele é interpolado a partir
 * dos dados na própria página.
 */

/**
 * Frase de abertura do estudo. Fica no hero, em destaque tipográfico.
 * Deliberadamente sem número: os valores que a sustentam são interpolados a
 * partir do banco nos quadros logo abaixo, e escrevê-los aqui os congelaria.
 */
export const VEREDITO =
  "O batalhão não perde vaga de DEJEM por falta de voluntário. Perde porque a escala não fecha, e o gargalo tem dia, turno e endereço conhecidos.";

/** Os três atos da leitura: panorama, aprofundamento e decisão. */
export const ATOS = {
  panorama: {
    numeral: "I",
    titulo: "Panorama",
    descricao:
      "O que o semestre produziu e onde ele falhou, em leitura de trinta segundos. Sem tabela: só os números que mudam a conversa com o Comando.",
  },
  analise: {
    numeral: "II",
    titulo: "Análise",
    descricao:
      "O corpo técnico do estudo. Cada quadro abre com os números que o resumem, mostra o gráfico e só então detalha a tabela completa, para quem precisa conferir linha a linha.",
  },
  decisao: {
    numeral: "III",
    titulo: "Decisão",
    descricao:
      "O que fazer com o que os quadros mostraram, quanto cada medida recupera, e o que este estudo pode e não pode afirmar.",
  },
} as const;

export const SUMARIO = [
  { id: "panorama", quadro: "Quadro I", rotulo: "Panorama do semestre" },
  { id: "conversao", quadro: "Quadro II", rotulo: "Demanda e conversão da vaga" },
  { id: "serie", quadro: "Quadro III", rotulo: "Evolução mensal" },
  { id: "elasticidade", quadro: "Quadro IV", rotulo: "Oferta contra capacidade de fechar" },
  { id: "ociosidade", quadro: "Quadro V", rotulo: "A vaga que tinha candidato" },
  { id: "companhias", quadro: "Quadro VI", rotulo: "Distribuição por Companhia" },
  { id: "ritmo", quadro: "Quadro VII", rotulo: "Ritmo semanal e turnos" },
  { id: "concentracao", quadro: "Quadro VIII", rotulo: "Concentração do esforço" },
  { id: "carga", quadro: "Quadro IX", rotulo: "Carga individual" },
  { id: "efetivo", quadro: "Quadro X", rotulo: "Penetração e perfil do efetivo" },
  { id: "faltas", quadro: "Quadro XI", rotulo: "Faltas e trilha de auditoria" },
  { id: "benchmark", quadro: "Quadro XII", rotulo: "Comparativo com CPA/M-5 e Estado" },
  { id: "cenario", quadro: "Quadro XIII", rotulo: "Cenário de recuperação" },
  { id: "recomendacoes", quadro: "Quadro XIV", rotulo: "Recomendações" },
  { id: "metodo", quadro: "Anexo", rotulo: "Método, ressalvas e fontes" },
];

export type Recomendacao = {
  titulo: string;
  problema: string;
  medida: string;
  impacto: string;
  responsavel: string;
};

/**
 * Cada recomendação nasce de um quadro específico do estudo e diz de onde vem.
 * Nenhuma é genérica: se a medida não decorre de um número apurado, não entra.
 */
export const RECOMENDACOES: Recomendacao[] = [
  {
    titulo: "Fechar a escala onde já existe candidato inscrito",
    problema:
      "A maior parte da vaga perdida no semestre não ficou vazia por falta de voluntário: tinha inscrito e não foi escalada. É falha de fechamento, não de procura.",
    medida:
      "Instituir conferência obrigatória da escala em D-2, com responsável nomeado por Companhia, e bloquear o encerramento do processo enquanto houver vaga com inscrito disponível.",
    impacto:
      "É a medida de maior retorno do estudo: sozinha, aproxima o batalhão do patamar das unidades do topo do CPA/M-5.",
    responsavel: "P/3 e Cmt de Companhia",
  },
  {
    titulo: "Atacar o buraco de sexta a domingo",
    problema:
      "De segunda a quinta o preenchimento é aceitável. A partir de sexta ele despenca, e o domingo é o pior dia do semestre por larga margem.",
    medida:
      "Divulgar a escala de fim de semana com antecedência maior que a dos dias úteis e avaliar rodízio por Companhia para as vagas de domingo, hoje disputadas por pouquíssimos inscritos.",
    impacto:
      "Concentra o esforço no ponto onde a perda por vaga ofertada é mais alta.",
    responsavel: "P/3",
  },
  {
    titulo: "Rever o dimensionamento da oferta com o CPA/M-5",
    problema:
      "A oferta de vagas cresceu de forma acentuada no segundo trimestre sem que a capacidade de fechar escala acompanhasse. O resultado foi mais vaga ociosa, não mais policiamento.",
    medida:
      "Levar ao CPA/M-5 a série de oferta contra preenchimento e pactuar oferta compatível com a capacidade real de fechamento, ou o reforço de efetivo que a oferta atual pressupõe.",
    impacto:
      "Evita que o indicador do batalhão seja penalizado por oferta que ele não tem condição de absorver.",
    responsavel: "Comando e P/3",
  },
  {
    titulo: "Redistribuir a carga entre quem puxa pouco",
    problema:
      "Uma fração pequena do efetivo concentra parcela desproporcional das jornadas, enquanto dezenas de policiais ficaram com carga muito baixa no semestre inteiro.",
    medida:
      "Priorizar, na escalação, quem está abaixo da média da própria Companhia, e acompanhar mensalmente os casos de carga extrema por saúde e limite regulamentar.",
    impacto:
      "Existe folga de efetivo suficiente para absorver boa parte da vaga hoje ociosa sem sobrecarregar quem já está no teto.",
    responsavel: "P/1 e Cmt de Companhia",
  },
  {
    titulo: "Tirar a confirmação de presença do ponto único de falha",
    problema:
      "Toda a confirmação de presença do batalhão no semestre foi lançada por duas pessoas, e a regularidade do lançamento oscilou de mês para mês.",
    medida:
      "Designar responsável e substituto por Companhia, com prazo fixo para lançar a presença, e conferência mensal pelo P/3.",
    impacto:
      "Torna a série de faltas confiável. Hoje a variação mensal mede prática de lançamento, não comportamento da tropa.",
    responsavel: "P/3",
  },
  {
    titulo: "Separar formalmente DEJEM de Atividade Delegada no acompanhamento",
    problema:
      "A Companhia que menos aparece no DEJEM é justamente a que mais sustenta Atividade Delegada. Sem essa separação, o quadro sugere desinteresse onde há sobrecarga.",
    medida:
      "Passar a acompanhar as duas modalidades lado a lado no mesmo relatório de comando, e cobrar meta de DEJEM proporcional ao efetivo livre de Delegada.",
    impacto:
      "Impede cobrança sobre unidade que já está no limite e realoca a meta para onde há capacidade ociosa.",
    responsavel: "Estado-Maior",
  },
];

export type Ressalva = { titulo: string; texto: string };

/**
 * As ressalvas não são rodapé decorativo: cada uma corresponde a um limite
 * real do dado, verificado durante a extração. Publicar o estudo sem elas
 * seria apresentar como certeza o que é aproximação.
 */
export const RESSALVAS: Ressalva[] = [
  {
    titulo: "A unidade muda de nome no meio da série",
    texto:
      "No relatório gerencial, o batalhão aparece como “16° BPM/M BATALHÃO” de janeiro a abril e como “16º BPM/M - Estado Maior” em maio e junho. É a mesma unidade. A ingestão unifica as duas grafias; sem isso a série se partiria em duas no meio do semestre.",
  },
  {
    titulo: "A Atividade Delegada é estimativa, não número oficial",
    texto:
      "A tela de origem do quantitativo de escalados não oferece filtro por tipo de escala. A coluna de Delegada é obtida por diferença entre o total escalado e as jornadas DEJEM confirmadas. Serve para dimensionar ordem de grandeza e explicar o caso da 3ª Cia, não para citação como dado da Seção.",
  },
  {
    titulo: "O Relatório de Faltas do SIRH não cobre o DEJEM",
    texto:
      "Verificado no sistema: aquele relatório contempla apenas Atividade Delegada, e retorna vazio para DEJEM em todo o Estado. Por isso a identificação nominal vem do histórico de confirmação de presença, que é outra fonte.",
  },
  {
    titulo: "A cobertura nominal das faltas mede processo, não comportamento",
    texto:
      "O histórico só registra alteração de presença já lançada. Quando o escalado não comparece e ninguém mexe no lançamento, não existe evento a registrar. Por isso a proporção de faltas nomeadas varia tanto de mês para mês: ela reflete a regularidade do lançamento, e não a realidade das ausências.",
  },
  {
    titulo: "As duas bases não se somam",
    texto:
      "Presença confirmada vem do relatório gerencial, cujo grão é o bloco de escala. Jornada confirmada vem do relatório analítico, cujo grão é a jornada nominal paga. A diferença entre os dois totais é de base, não de faltas, e está declarada no Quadro I.",
  },
  {
    titulo: "A penetração no efetivo é bruta",
    texto:
      "O denominador é o efetivo institucional publicado do batalhão, que inclui férias, licença para tratamento de saúde, restrição e agregados. O efetivo elegível ao DEJEM é menor e não é conhecido por esta base. O percentual serve como piso, não como medida de adesão.",
  },
  {
    titulo: "O recorte do batalhão é por código, nunca por nome",
    texto:
      "No quantitativo estadual existe o 16º BPM do Interior, com código iniciado em 6051. Filtrar por “16” no nome contaminaria todos os números. A ingestão recorta pelo prefixo 5051, que é o 16º BPM/M do CPA/M-5.",
  },
  {
    titulo: "A base estadual é de um mês só",
    texto:
      "O comparativo entre Grandes Comandos usa apenas maio de 2026, único mês com extração estadual completa. Comandos com oferta muito pequena no mês ficam fora do ranque para não distorcer a comparação.",
  },
];
