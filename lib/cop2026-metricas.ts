/**
 * Derivações do painel da Auditoria de COP 2026.
 *
 * Tudo aqui é função pura sobre o que `lib/cop2026.ts` leu da planilha. O
 * motivo de existir separado do componente: o painel precisa dizer o que os
 * números QUEREM DIZER, não só exibi-los, e uma frase-veredito escrita no meio
 * do JSX não se testa nem se reaproveita. Nenhuma função aqui importa React.
 */
import {
  ORDEM_SUBUNIDADES,
  ROTULO_SUBUNIDADE,
  MATRIZ_PROPORCIONAL_2026,
  META_TOTAL_BATALHAO,
  EFETIVO_TOTAL_BATALHAO,
  limitesDaSemana,
  metasSemanaisDaMeta,
  redigirCpf,
  classificarIdentificador,
  ehIdentificadorValido,
  separarIdentificadores,
  type LancamentoCop,
  type MetaSubunidade,
} from "@/lib/cop2026";
import { diasEntre, hojeBrt } from "@/lib/cop2026-ciclo";
import { RELATORIOS_MENSAIS, mesCorrente } from "@/lib/cop2026-relatorios";
import { TURNOS_POR_DIA, semanasIniciadas } from "@/lib/cop2026-tendencia";

export {
  MATRIZ_PROPORCIONAL_2026,
  META_TOTAL_BATALHAO,
  EFETIVO_TOTAL_BATALHAO,
  limitesDaSemana,
  metasSemanaisDaMeta,
};

export const FMT = new Intl.NumberFormat("pt-BR");
export const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
/* A última faixa NÃO é horário: é o lançamento que chegou sem hora. Antes ele
   era despejado em "12–16" pelo `else` do cálculo, e a matriz exibia um pico de
   expediente que era dado faltante. Separado, o buraco vira número — e vira
   argumento para cobrar o preenchimento. */
export const FAIXAS_HORA = ["00–04", "04–08", "08–12", "12–16", "16–20", "20–24", "s/ hora"];
/** Índice da coluna "sem hora" dentro de `FAIXAS_HORA`. */
export const FAIXA_HORA_SEM_HORA = FAIXAS_HORA.length - 1;

export const SEMANAS_ROTULOS = [
  { semana: 1, rotulo: "Semana 1", dias: "01 a 07" },
  { semana: 2, rotulo: "Semana 2", dias: "08 a 14" },
  { semana: 3, rotulo: "Semana 3", dias: "15 a 21" },
  { semana: 4, rotulo: "Semana 4", dias: "22 a 31" },
] as const;

/**
 * Rótulo de dias da semana operacional, ajustado ao mês do recorte.
 *
 * A quarta semana é a única elástica: fecha no dia 30 em setembro e novembro e
 * no dia 31 nos demais. O rótulo era fixo em "22 a 31" e anunciava à tropa um
 * dia 31 de setembro que não existe.
 */
export function diasDaSemana(semana: number, ultimoDiaDoMes: number): string {
  const base = SEMANAS_ROTULOS.find((s) => s.semana === semana);
  if (!base) return "";
  if (semana !== 4) return base.dias;
  return `22 a ${String(Math.max(22, ultimoDiaDoMes)).padStart(2, "0")}`;
}

/**
 * O trecho do mês que uma semana operacional ocupa, em datas ISO.
 *
 * Devolve o mês inteiro quando não há semana selecionada. É o que permite a
 * `janelaDoRecorte` encolher junto com a meta, sem que nenhum consumidor
 * precise saber que existe uma semana no meio do caminho.
 */
export function recorteDaSemana(
  semana: string,
  deMes: string,
  ateMes: string
): { de: string; ate: string } {
  if (!semana || semana === "todas" || !deMes || !ateMes) return { de: deMes, ate: ateMes };
  const n = parseInt(semana, 10);
  if (!Number.isFinite(n) || n < 1 || n > 4) return { de: deMes, ate: ateMes };

  const ultimoDiaDoMes = Number(ateMes.slice(8, 10));
  if (!Number.isFinite(ultimoDiaDoMes)) return { de: deMes, ate: ateMes };

  const { primeiro, ultimo } = limitesDaSemana(n, ultimoDiaDoMes);
  const prefixo = deMes.slice(0, 8);
  const dia = (d: number) => `${prefixo}${String(d).padStart(2, "0")}`;
  return { de: dia(primeiro), ate: dia(Math.min(ultimo, ultimoDiaDoMes)) };
}

/**
 * A cota de uma semana dentro de uma meta mensal, rateada por dias.
 *
 * Fonte única do número: cartão de cumprimento, cartões semanais e cartões por
 * fração leem daqui. Antes o topo somava as cotas das frações (241) e o cartão
 * da semana usava uma constante de 240 — a mesma semana aparecia como 43,6% e
 * 43,8% na mesma tela.
 */
export function metaSemanalDe(
  metaDoMes: number,
  semana: string | number,
  ultimoDiaDoMes: number
): number {
  const n = typeof semana === "number" ? semana : parseInt(semana, 10);
  if (!Number.isFinite(n) || n < 1 || n > 4) return metaDoMes;
  return metasSemanaisDaMeta(metaDoMes, ultimoDiaDoMes)[n - 1];
}

export function identificarSemana(dataIso: string | undefined): number {
  if (!dataIso) return 1;
  const dia = parseInt(dataIso.slice(8, 10), 10);
  if (isNaN(dia)) return 1;
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  return 4;
}

/** Mínimo do Batalhão por turno. A Diretriz PM3-001/02/25 pede 2; o Batalhão
 *  determinou 3. O valor real vem da aba Parâmetros — isto é só o piso de
 *  segurança para quando a planilha não trouxer a coluna. */
export const MINIMO_PADRAO = 3;

/**
 * Janela em DIAS para um desvio virar "ponto de atenção".
 *
 * Determinação do Maj PM em 02/09/2026: um lançamento isolado abaixo do mínimo
 * não é padrão — é acidente. A janela mínima para caracterizar padrão é uma
 * semana, e o corte pode ser ajustado pelo Comando na tela admin de parâmetros.
 *
 * Enquanto a janela não fecha (ou seja, `janela.decorridos < JANELA_ATENCAO`),
 * os cartões da seção "Pontos de atenção" mostram "Sem base ainda — em curso"
 * em vez de listar nomes que ainda não tiveram semana inteira para se
 * comportarem.
 */
export const JANELA_ATENCAO_PADRAO_DIAS = 7;
export const JANELA_ATENCAO_MIN_DIAS = 7;
export const JANELA_ATENCAO_MAX_DIAS = 31;

/** Um lançamento (não-auditou, abaixo do mínimo, parte) só entra em ponto de
 *  atenção se estiver DENTRO dos últimos `dias` corridos, contando a partir de
 *  `hoje` inclusive. Recorte curto (mês recém-aberto) apenas vazia a lista;
 *  não invalida os dados nem esconde as exceções — elas continuam somando nos
 *  cartões-contador acima da caixa. */
export function dentroDaJanelaAtencao(
  dataIso: string,
  hoje: string,
  dias: number
): boolean {
  if (!dataIso) return false;
  return diasEntre(dataIso, hoje) < dias;
}

/**
 * Mínimo de evidências por turno que vale no recorte exibido.
 *
 * Com uma fração isolada vale a determinação daquela fração; no Batalhão vale a
 * MAIOR determinação vigente — 3, a do policiamento, e não a do Estado-Maior
 * (2), que é administrativa.
 *
 * Antes daqui saía `metas.find((m) => m.evidenciasPorTurno > 0)`, que devolvia a
 * PRIMEIRA linha do array. Como o Estado-Maior abre a lista, o Batalhão inteiro
 * passou a ser cobrado por 2 e a tela anunciava "CONFORMIDADE (≥2)" e "abaixo do
 * mínimo de 2" — contra a determinação do Comando, em todas as superfícies ao
 * mesmo tempo (painel, briefing e relatório executivo leem daqui).
 */
export function minimoDoRecorte(metas: MetaSubunidade[], fracao: string): number {
  if (fracao && fracao !== "todas") {
    const daFracao = metas.find((m) => m.subunidade === fracao)?.evidenciasPorTurno ?? 0;
    if (daFracao > 0) return daFracao;
  }
  const maior = metas.reduce((s, m) => Math.max(s, m.evidenciasPorTurno || 0), 0);
  return maior > 0 ? maior : MINIMO_PADRAO;
}

/**
 * A JANELA do recorte — quantos dias ele tem, quantos já correram e quantos
 * faltam. É a base única de turno e de ritmo do painel.
 *
 * Existe porque conviviam dois modelos de "turno" no mesmo produto:
 *
 * - o ANTIGO, de `MetaSubunidade.turnos` (15 turnos de 12x36 no mês), que
 *   produzia "faltam 873 em 13 turnos — 68 por turno" e "meta de 65 por turno";
 * - o NOVO, fixado com o Maj PM em 31/08/2026 em `cop2026-tendencia.ts`: a
 *   unidade é o TURNO-FRAÇÃO (cada fração roda 2 turnos por dia, 60 num mês de
 *   30 dias) e o ritmo do Batalhão é expresso POR DIA, nunca por turno.
 *
 * As duas contas respondiam à mesma pergunta com números diferentes na mesma
 * tela. Aqui fica só a segunda.
 *
 * `decorridos` INCLUI o dia em curso. O modelo anterior contava só dias
 * encerrados enquanto somava as evidências lançadas hoje: numerador de dois
 * dias sobre denominador de um, que foi o que fez o painel anunciar
 * "REAL 87,00/dia" e "ADIANTADA" no dia em que a auditoria estava em 9,1% da
 * meta — e escrever "Dias com lançamento: 2 de 1".
 */
export type JanelaRecorte = {
  de: string;
  ate: string;
  dias: number;
  /** Dias corridos até hoje, contando o dia em curso. Zero antes de abrir. */
  decorridos: number;
  diasRestantes: number;
  /** Turnos-fração do período inteiro: `dias` × 2. */
  turnosFracao: number;
  turnosFracaoDecorridos: number;
  turnosFracaoRestantes: number;
  encerrado: boolean;
};

/**
 * O MÊS que ancora o recorte. Toda meta declarada é mensal, então é este mês —
 * e não o intervalo que o usuário digitou — que dimensiona a cota e a 4ª
 * semana.
 */
export function mesDoRecorte(f: Filtros, hoje: string = hojeBrt()): { de: string; ate: string } {
  const ancora = f.de || f.ate || hoje;
  const mes =
    RELATORIOS_MENSAIS.find((m) => ancora >= m.periodo.de && ancora <= m.periodo.ate) ??
    mesCorrente();
  return { de: mes?.periodo.de || "", ate: mes?.periodo.ate || "" };
}

/** Quantos dias tem o mês que ancora o recorte. 31 quando não há calendário. */
export function ultimoDiaDoMesDoRecorte(f: Filtros, hoje: string = hojeBrt()): number {
  const { ate } = mesDoRecorte(f, hoje);
  const dia = Number(ate.slice(8, 10));
  return Number.isFinite(dia) && dia > 0 ? dia : 31;
}

export function janelaDoRecorte(f: Filtros, hoje: string = hojeBrt()): JanelaRecorte {
  /* A janela é o MÊS em que o recorte cai, não o recorte em si.
   *
   * A meta de 960 é mensal e não encolhe quando o Comando dá zoom em dois dias
   * para conferir um fim de semana: se a janela fosse o recorte, `metaDia`
   * viraria 960 ÷ 2 = 480 e a linha de meta do gráfico diário saltaria para
   * quinze vezes o valor certo. O período de cálculo do ritmo é sempre o do
   * denominador da meta.
   *
   * A SEMANA é a única exceção, e pela mesma regra: ela tem meta declarada
   * própria (`metasSemanaisDaMeta`), então o denominador da meta muda e a
   * janela tem que mudar junto. Enquanto não mudava, o painel dividia a meta da
   * semana pelos dias do mês e anunciava ritmo-alvo de 8,03/dia com trajetória
   * de 435,7% — meta de 7 dias sobre calendário de 30. Zoom por data não tem
   * meta declarada; semana tem. */
  const { de: deMes, ate: ateMes } = mesDoRecorte(f, hoje);
  const { de, ate } = recorteDaSemana(f.semana, deMes, ateMes);

  /* Sem janela conhecida (fora do ciclo de 2026, ou recorte aberto de um lado
     só) o painel degrada para "sem base de calendário": nada de inventar 30
     dias e cobrar ritmo em cima de um período que ninguém declarou. */
  if (!de || !ate || ate < de) {
    return {
      de,
      ate,
      dias: 0,
      decorridos: 0,
      diasRestantes: 0,
      turnosFracao: 0,
      turnosFracaoDecorridos: 0,
      turnosFracaoRestantes: 0,
      encerrado: false,
    };
  }

  const dias = diasEntre(de, ate) + 1;
  const decorridos = hoje < de ? 0 : hoje > ate ? dias : diasEntre(de, hoje) + 1;
  const diasRestantes = Math.max(0, dias - decorridos);

  return {
    de,
    ate,
    dias,
    decorridos,
    diasRestantes,
    turnosFracao: dias * TURNOS_POR_DIA,
    turnosFracaoDecorridos: decorridos * TURNOS_POR_DIA,
    turnosFracaoRestantes: diasRestantes * TURNOS_POR_DIA,
    encerrado: hoje > ate,
  };
}

// ---------------------------------------------------------------------------
// Estatística descritiva
// ---------------------------------------------------------------------------
export function quantil(v: number[], q: number): number {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  const i = (o.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? o[lo] : o[lo] + (o[hi] - o[lo]) * (i - lo);
}

export const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

export const desvio = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = media(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
};

// ---------------------------------------------------------------------------
// Filtros — o recorte que o usuário escolheu, e que viaja na URL
// ---------------------------------------------------------------------------
export type Filtros = {
  fracao: string;
  turno: string;
  semana: string;
  de: string;
  ate: string;
  busca: string;
  /** Recorte de exceção: só quem não auditou, só quem ficou abaixo do mínimo,
   *  só quem não informou os IDs das mídias, só quem informou algo que não é
   *  identificador da plataforma, só quem lançou um ID que já foi lançado.
   *  São casos DIFERENTES: um precisa ser cobrado a informar, outro a corrigir,
   *  o último a explicar por que a mesma mídia foi auditada duas vezes. */
  excecao: "" | "naoauditou" | "abaixo" | "semids" | "idinvalido" | "duplicado";
};

export const FILTROS_VAZIOS: Filtros = {
  fracao: "todas",
  turno: "todos",
  semana: "todas",
  de: "",
  ate: "",
  busca: "",
  excecao: "",
};

/**
 * Recorte padrão de QUALQUER superfície que confronte lançamentos com a meta:
 * o MÊS CORRENTE, nunca "tudo o que já entrou".
 *
 * A meta de 960 é MENSAL. Somar agosto com setembro contra ela faz o
 * percentual passar de 100% sem ninguém ter superado nada — foi exatamente o
 * que o quadro 08 da página pública exibiu em 01/09/2026: 627/960 de agosto
 * anunciados como "posição na meta do mês" no primeiro dia de setembro.
 *
 * Fora do ciclo de 2026 `mesCorrente()` não acha nada e volta a valer o ciclo
 * inteiro, que é a degradação certa: melhor o ciclo todo do que tela vazia.
 */
export function filtrosDoMesCorrente(): Filtros {
  const mes = mesCorrente();
  if (!mes) return FILTROS_VAZIOS;
  return { ...FILTROS_VAZIOS, de: mes.periodo.de, ate: mes.periodo.ate };
}

export function lerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const um = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const excecao = um("excecao");
  const semana = um("semana");

  /* Sem data na URL, o painel abre no mês corrente (ver `filtrosDoMesCorrente`).
   *
   * Fica visível: com `de`/`ate` preenchidos, a barra de filtros mostra a
   * tarja do período, e um clique em limpar volta a ver o ciclo inteiro. É o
   * contrário de um recorte escondido — o link que o Comando compartilha passa
   * a dizer de que mês ele fala. */
  const de = um("de");
  const ate = um("ate");
  const padrao = !de && !ate ? filtrosDoMesCorrente() : undefined;

  return {
    fracao: um("fracao") || "todas",
    turno: um("turno") || "todos",
    semana: ["1", "2", "3", "4"].includes(semana) ? semana : "todas",
    de: de || padrao?.de || "",
    ate: ate || padrao?.ate || "",
    busca: um("busca"),
    /* A lista tem que trazer TODAS as exceções que `aplicarFiltros` entende.
       `idinvalido` ficou de fora quando o cartão foi criado, então o cartão
       "Informaram ID fora do formato" montava o link, o link chegava aqui e o
       filtro era descartado em silêncio — clique que não filtra nada. */
    excecao: (["naoauditou", "abaixo", "semids", "idinvalido", "duplicado"] as const).includes(
      excecao as never
    )
      ? (excecao as Filtros["excecao"])
      : "",
  };
}

/** Só o que difere do padrão entra na URL — link curto é link que se cola no
 *  WhatsApp sem parecer rastreador. */
export function escreverFiltros(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.fracao !== "todas") p.set("fracao", f.fracao);
  if (f.turno !== "todos") p.set("turno", f.turno);
  if (f.semana && f.semana !== "todas") p.set("semana", f.semana);
  if (f.de) p.set("de", f.de);
  if (f.ate) p.set("ate", f.ate);
  if (f.busca) p.set("busca", f.busca);
  if (f.excecao) p.set("excecao", f.excecao);
  const q = p.toString();
  return q ? `?${q}` : "";
}

/**
 * Identificadores lançados mais de uma vez — a mesma mídia contada como duas
 * evidências.
 *
 * Apareceu em produção em 02/09/2026: `f2bd1c1f1f1d94f3140967cff034ff3b` foi
 * lançado pelo Cap PM da 4ª Cia em 01/09 e de novo por outra auditora em 02/09.
 * As duas somaram para a meta e nenhuma exceção do painel acusou.
 *
 * Só entra identificador VÁLIDO: repetir um número solto não diz nada, porque
 * número solto não resolve para objeto nenhum da plataforma — esse caso já é
 * cobrado como "ID fora do formato". A comparação é sobre o valor normalizado
 * (`classificarIdentificador`), então maiúsculas e espaços colados não
 * escondem a repetição.
 */
export function mapearDuplicados(lancamentos: LancamentoCop[]): Map<string, number> {
  const vezes = new Map<string, number>();
  for (const l of lancamentos) {
    if (!l.auditou) continue;
    /* Repetição DENTRO do mesmo lançamento é outro caso (o auditor colou duas
       vezes a mesma linha) e não vira dupla contagem entre pessoas: conta uma
       vez por lançamento. */
    const noLancamento = new Set(
      separarIdentificadores(l.idsMidia)
        .filter(ehIdentificadorValido)
        .map((b) => classificarIdentificador(b).valor)
    );
    for (const v of noLancamento) vezes.set(v, (vezes.get(v) ?? 0) + 1);
  }
  return new Map([...vezes].filter(([, n]) => n > 1));
}

/** Identificadores válidos deste lançamento que aparecem em outro também. */
export function duplicadosDoLancamento(
  l: LancamentoCop,
  duplicados: Map<string, number>
): string[] {
  if (!l.auditou || !duplicados.size) return [];
  const vistos = new Set<string>();
  for (const bruto of separarIdentificadores(l.idsMidia)) {
    if (!ehIdentificadorValido(bruto)) continue;
    const v = classificarIdentificador(bruto).valor;
    if (duplicados.has(v)) vistos.add(v);
  }
  return [...vistos];
}

// ---------------------------------------------------------------------------
// Turno de serviço — a régua do mínimo, em um lugar só
// ---------------------------------------------------------------------------

/**
 * A chave do TURNO DE SERVIÇO: quem + dia + turno.
 *
 * O mínimo de 3 evidências é institucionalmente POR TURNO, não por formulário
 * enviado. Dois lançamentos do mesmo auditor no mesmo dia e turno são o MESMO
 * turno e somam — foi a queixa do Comando em 02/09/2026 ("Maj Vinícius fez 2
 * envios no mesmo dia, se somar dá mais de 3, e ele apareceu como abaixo do
 * mínimo").
 *
 * A correção tinha entrado só no contador do topo e na lista nominal. O filtro
 * do próprio cartão, a tabela de auditores, o bloco de exceções por fração, o
 * histograma e a dispersão continuavam contando por LANÇAMENTO: o cartão dizia
 * 5 e o clique nele devolvia 8. Daqui em diante todos leem estas três funções.
 */
export function chaveDoTurno(l: LancamentoCop): string {
  return `${l.re || l.nomeGuerra || "?"}|${l.data}|${(l.turno || "").toLowerCase()}`;
}

/** Evidências somadas por turno de serviço. Só entra quem declarou auditoria. */
export function somarPorTurno(lancamentos: LancamentoCop[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lancamentos) {
    if (!l.auditou) continue;
    const k = chaveDoTurno(l);
    m.set(k, (m.get(k) ?? 0) + l.videos);
  }
  return m;
}

/** Os turnos cuja SOMA ficou abaixo do mínimo — a fonte única do "abaixo". */
export function turnosAbaixoDoMinimo(
  lancamentos: LancamentoCop[],
  minimo: number
): Set<string> {
  const fora = new Set<string>();
  for (const [k, soma] of somarPorTurno(lancamentos)) if (soma < minimo) fora.add(k);
  return fora;
}

export function aplicarFiltros(
  lancamentos: LancamentoCop[],
  f: Filtros,
  minimo: number,
  duplicados: Map<string, number> = new Map()
): LancamentoCop[] {
  /* Duas fases, e a ordem importa: o recorte primeiro, a exceção depois.
     "Abaixo do mínimo" é uma pergunta sobre o TURNO, e o turno tem que ser
     somado sobre o recorte que o usuário está vendo — somar sobre a planilha
     inteira classificaria pelo mês errado. */
  const base = lancamentos.filter((l) => {
    if (f.fracao !== "todas" && l.subunidade !== f.fracao) return false;
    if (f.turno !== "todos" && !(l.turno || "").toLowerCase().startsWith(f.turno)) return false;
    if (f.semana && f.semana !== "todas" && identificarSemana(l.data) !== parseInt(f.semana, 10)) {
      return false;
    }
    if (f.de && (!l.data || l.data < f.de)) return false;
    if (f.ate && (!l.data || l.data > f.ate)) return false;
    return true;
  });

  if (!f.excecao) return base;

  const abaixoDoMinimo =
    f.excecao === "abaixo" ? turnosAbaixoDoMinimo(base, minimo) : null;

  return base.filter((l) => {
    if (f.excecao === "naoauditou") return !l.auditou;
    if (f.excecao === "abaixo") return l.auditou && abaixoDoMinimo!.has(chaveDoTurno(l));
    if (f.excecao === "semids") return l.auditou && !l.idsMidia.trim();
    if (f.excecao === "idinvalido") {
      return (
        l.auditou &&
        !!l.idsMidia.trim() &&
        !separarIdentificadores(l.idsMidia).some(ehIdentificadorValido)
      );
    }
    if (f.excecao === "duplicado") return duplicadosDoLancamento(l, duplicados).length > 0;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Semáforo
// ---------------------------------------------------------------------------
export type Nivel = "superacao" | "conforme" | "atencao" | "critico" | "neutro";

/* "NÃO AFERÍVEL" é o termo do Comando para o quinto estado da régua, e não
   "Sem dados": a regra sistêmica de 28/08/2026 nomeia assim o resultado
   inválido, negativo, indeterminado ou sem base de cálculo. `cop2026-tendencia`
   já usava o termo certo na régua de trajetória — eram duas palavras para o
   mesmo estado, nas mesmas telas. */
export const ROTULO_NIVEL: Record<Nivel, string> = {
  superacao: "Superação",
  conforme: "Conformidade",
  atencao: "Atenção",
  critico: "Crítica",
  neutro: "Não aferível",
};

/** Subtítulo semântico das faixas conforme definição do Comando.
 *  Sequência: Abaixo da Meta → Cumprimento Insuficiente → Meta Cumprida → Meta Superada */
export const SUBTITULO_NIVEL: Record<Nivel, string> = {
  superacao: "Meta Superada",
  conforme: "Meta Cumprida",
  atencao: "Cumprimento Insuficiente",
  critico: "Abaixo da Meta",
  neutro: "",
};

/** Regra sistêmica de classificação por faixa de cumprimento:
 *  - Superação (>100%): superou quantitativamente a referência
 *  - Conformidade (80–100%): limiar mínimo de conformidade atingido
 *  - Atenção (50–80%): em andamento, abaixo do limiar
 *  - Crítica (<50%): abaixo da meta
 *  - Não Aferível: valor inválido, negativo, NaN ou sem base de cálculo
 *
 *  A classificação opera sobre o valor bruto, ANTES de arredondamento.
 *  "Excelência" é reservada para indicador composto (quantidade + qualidade).
 */
export function nivelPorCumprimento(pct: number, temDados: boolean): Nivel {
  if (!temDados || !Number.isFinite(pct) || pct < 0) return "neutro";
  if (pct > 100) return "superacao";
  if (pct >= 80) return "conforme";
  if (pct >= 50) return "atencao";
  return "critico";
}

// ---------------------------------------------------------------------------
// Exceções por fração — FONTE ÚNICA
// ---------------------------------------------------------------------------

/**
 * "O QUE É UMA EXCEÇÃO", em um lugar só.
 *
 * Até 03/09/2026 esta conta existia escrita TRÊS vezes, com respostas
 * diferentes: aqui (`naoAuditou` / `abaixo` / `semIds`), dentro do bloco "Onde
 * as exceções se concentram" do briefing e outra vez no Relatório de Dados. A
 * cópia do briefing ignorava `semIds` — o cartão anunciava "8 sem IDs de mídia"
 * e o mapa logo abaixo mostrava 0 em todas as frações, com o rodapé fechando em
 * "0 desvio(s) em 21 lançamento(s)". Foi o que o Major apontou em 02/09/2026 às
 * 07:50 ("não aparece no gráfico a inconsistência das oito").
 *
 * O `AGENTS.md` já proibia isso ("nenhum componente deve reclassificar por
 * conta própria"); remendar ponto a ponto faria a quarta cópia nascer. Todo
 * consumidor chama esta função e nenhum recalcula.
 *
 * CONTAGEM DISTINTA, e é o detalhe que faz a diferença: os três motivos se
 * SOBREPÕEM. Quem auditou abaixo do mínimo E não informou o ID cai em dois
 * deles. Somar `naoAuditou + abaixo + semIds` inflaria o número, faria a barra
 * passar de 100% da própria fração e desmentiria o cartão de cima. Por isso o
 * predicado é um OR sobre o lançamento, e não uma soma de contadores.
 *
 * UNIDADE: o DENOMINADOR é o lançamento ("N de M lançamentos daquela fração"),
 * mas o motivo "abaixo do mínimo" passou a ser aferido por TURNO em 03/09/2026,
 * por decisão do Comando — a régua institucional do mínimo é o turno de
 * serviço, e ela agora vale em todas as superfícies (cartão, filtro, tabela de
 * auditores, histograma, dispersão e este bloco). Um lançamento é marcado
 * quando o TURNO a que ele pertence ficou abaixo, e não quando o envio isolado
 * ficou. Ver `chaveDoTurno` / `turnosAbaixoDoMinimo`.
 *
 * ÓRFÃOS: lançamento sem `subunidade` declarada não casa com fração nenhuma e
 * saía de todas as barras, embora continuasse no total do rodapé — as barras
 * somavam 17 onde o rodapé dizia 21. Ele volta como linha própria, conforme
 * `docs/cop2026-padroes-comando.md` § "Evidência sem fração aparece; não some
 * nem soma calada".
 */
export type ExcecoesLinha = {
  chave: string;
  rotulo: string;
  /** Lançamentos do recorte pertencentes a esta fração. */
  total: number;
  /** Quantos deles têm ao menos um motivo de exceção. Nunca maior que `total`. */
  comPendencia: number;
};

export type ExcecoesPorFracao = {
  linhas: ExcecoesLinha[];
  /** Lançamentos sem fração declarada — não entram em `linhas`. */
  orfaos: ExcecoesLinha;
  /** Soma de `comPendencia` das linhas + órfãos. É o número do rodapé. */
  totalPendencia: number;
  /** Soma de `total` das linhas + órfãos. Fecha com o tamanho da base. */
  totalLancamentos: number;
};

/**
 * Um lançamento tem pendência? Binário, e cobre os três motivos sem duplicar.
 *
 * `turnosAbaixo` é o conjunto de turnos que ficaram abaixo do mínimo no
 * recorte, vindo de `turnosAbaixoDoMinimo`. Sem ele a função cai na leitura por
 * lançamento — que só é equivalente quando o lançamento é o turno inteiro, o
 * caso dos testes unitários de registro único. Quem tem uma base recortada nas
 * mãos DEVE passar o conjunto, ou volta a divergir do cartão do topo.
 */
export function temPendencia(
  l: LancamentoCop,
  minimo: number,
  turnosAbaixo?: Set<string>
): boolean {
  if (!l.auditou) return true;
  const abaixo = turnosAbaixo ? turnosAbaixo.has(chaveDoTurno(l)) : l.videos < minimo;
  if (abaixo) return true;
  return !l.idsMidia.trim();
}

export function excecoesPorFracao(
  dados: LancamentoCop[],
  fracoes: { chave: string; rotulo: string }[],
  minimo: number
): ExcecoesPorFracao {
  const conhecidas = new Set(fracoes.map((f) => f.chave));
  /* Somado UMA vez sobre a base recortada, e reusado nas linhas e nos órfãos:
     é o que faz este bloco concordar com o cartão "Abaixo do mínimo" do topo. */
  const turnosAbaixo = turnosAbaixoDoMinimo(dados, minimo);

  const linhas: ExcecoesLinha[] = fracoes.map((f) => {
    const daFracao = dados.filter((l) => l.subunidade === f.chave);
    return {
      chave: f.chave,
      rotulo: f.rotulo,
      total: daFracao.length,
      comPendencia: daFracao.filter((l) => temPendencia(l, minimo, turnosAbaixo)).length,
    };
  });

  /* Órfão é o que não casa com NENHUMA fração da tela — inclui tanto a
     subunidade vazia quanto a que veio escrita fora do vocabulário. Com filtro
     de fração ligado, `fracoes` tem uma linha só e o resto do recorte já foi
     removido por `aplicarFiltros`; não sobra órfão fantasma. */
  const semFracao = dados.filter((l) => !conhecidas.has(l.subunidade));
  const orfaos: ExcecoesLinha = {
    chave: "__sem_fracao__",
    rotulo: "Sem fração declarada",
    total: semFracao.length,
    comPendencia: semFracao.filter((l) => temPendencia(l, minimo, turnosAbaixo)).length,
  };

  const soma = (f: (x: ExcecoesLinha) => number) =>
    linhas.reduce((s, x) => s + f(x), 0) + f(orfaos);

  return {
    linhas,
    orfaos,
    totalPendencia: soma((x) => x.comPendencia),
    totalLancamentos: soma((x) => x.total),
  };
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------
export type ProgressoSemana = {
  semana: number;
  rotulo: string;
  diasRotulo: string;
  meta: number;
  feito: number;
  pct: number;
  falta: number;
  nivel: Nivel;
};

export type LinhaFracao = {
  chave: string;
  rotulo: string;
  /** Meta do RECORTE — igual à do mês quando não há semana selecionada. */
  meta: number;
  /** Meta do MÊS inteiro. A curva plano × realizado é mensal por decisão do
   *  Comando e lê daqui, para não encolher junto com a aba de semana. */
  metaMes: number;
  feito: number;
  pct: number;
  falta: number;
  efetivo: number;
  lancaram: number;
  nivel: Nivel;
  /** Quantas evidências por turno restante essa fração precisa manter. */
  ritmoNecessario: number;
  turnosRestantes: number;
  /** Proporção da meta desta fração em relação ao total do Batalhão (960). */
  pctBatalhao?: number;
  /** Rateio inteiro do ritmo global de 73 evidências por turno. */
  ritmoProporcional?: number;
  /** Efetivo do quadro fixo da fração (base: 570 PMs). */
  efetivoQuadro?: number;
  /* `metaSemanalMedia` (meta ÷ 4) saiu em 03/09/2026: era uma segunda régua
     semanal, plana, que não correspondia a semana nenhuma depois que a cota
     passou a ser rateada por DIAS (§3-C dos padrões do Comando). A cota certa
     de cada semana está em `semanas[].meta`, vinda de `metasSemanaisDaMeta`. */
  /** Desempenho semana a semana (S1, S2, S3, S4). */
  semanas: ProgressoSemana[];
  /** Série DIÁRIA do mês inteiro — base da curva plano × realizado pedida pela
   *  Coordenadoria Operacional em 02/09/2026. Esparsa: só tem entrada em dia
   *  com lançamento, e é `curvaPlanoRealizado` que completa o calendário. */
  porDia?: { data: string; v: number }[];
};

export type LinhaAuditor = {
  chave: string;
  nome: string;
  posto: string;
  fracao: string;
  /** Envios de formulário — o que entrou pela porta. */
  lanc: number;
  /** Turnos de serviço distintos com auditoria (RE + data + turno). É a régua
   *  do mínimo, e o denominador de `media`. */
  turnos: number;
  videos: number;
  /** Evidências por TURNO, não por envio. */
  media: number;
  /** Turnos abaixo do mínimo — não lançamentos abaixo do mínimo. */
  abaixo: number;
  semIds: number;
  naoAuditou: number;
  nivel: Nivel;
};

export type Painel = ReturnType<typeof calcularPainel>;

export type OpcoesPainel = {
  hoje?: string;
  /** Janela em dias para desvios virarem "ponto de atenção" — ver
   *  `JANELA_ATENCAO_PADRAO_DIAS`. Aceita valor inteiro entre
   *  MIN e MAX; fora disso, cai no padrão. */
  janelaAtencaoDias?: number;
};

export function calcularPainel(
  lancamentos: LancamentoCop[],
  metas: MetaSubunidade[],
  f: Filtros,
  hojeOuOpcoes: string | OpcoesPainel = hojeBrt()
) {
  /* Retrocompatível: as chamadas antigas passam `hoje: string` como quarto
     argumento; as novas passam um objeto de opções. */
  const opcoes: OpcoesPainel =
    typeof hojeOuOpcoes === "string" ? { hoje: hojeOuOpcoes } : hojeOuOpcoes;
  const hoje = opcoes.hoje ?? hojeBrt();
  const janelaAtencaoDias =
    Number.isInteger(opcoes.janelaAtencaoDias) &&
    (opcoes.janelaAtencaoDias as number) >= JANELA_ATENCAO_MIN_DIAS &&
    (opcoes.janelaAtencaoDias as number) <= JANELA_ATENCAO_MAX_DIAS
      ? (opcoes.janelaAtencaoDias as number)
      : JANELA_ATENCAO_PADRAO_DIAS;

  const minimo = minimoDoRecorte(metas, f.fracao);
  const janela = janelaDoRecorte(f, hoje);
  /* A janela do MÊS, sem o filtro de semana. A curva plano × realizado é do mês
     de propósito (decisão do Maj PM em 02/09/2026): com "Sem 2" ligada ela
     desenharia 23 dias zerados como se a fração nada tivesse produzido. */
  const janelaMes = janelaDoRecorte({ ...f, semana: "todas" }, hoje);
  const duplicados = mapearDuplicados(lancamentos);

  const dados = aplicarFiltros(lancamentos, f, minimo, duplicados);

  /* Mesmo recorte do painel, menos o filtro de SEMANA — é a base de tudo que é
     "semana a semana". Os cartões semanais SÃO o seletor de semana: aplicar
     `f.semana` aqui zeraria os outros três e o clique deixaria de servir. */
  const dadosSemFiltroDeSemana = aplicarFiltros(
    lancamentos,
    { ...f, semana: "todas" },
    minimo,
    duplicados
  );

  /* Último dia do MÊS que ancora o recorte — não da janela, que já pode estar
     encolhida para a semana. É ele que dimensiona a 4ª semana. */
  const ultimoDiaDoMes = ultimoDiaDoMesDoRecorte(f, hoje);

  /* Quantas semanas operacionais do MÊS do recorte já começaram.
   *
   * É o discriminador certo entre "não há base" e "há base e o resultado é
   * zero". O anterior era `feito > 0`, que dava NÃO AFERÍVEL (cinza) para a
   * semana em curso em que a fração não produziu nada — exatamente o caso que
   * a régua do Comando manda pintar de FAIXA CRÍTICA. Enquanto isso, a linha
   * da fração com zero já saía crítica: duas leituras opostas do mesmo zero na
   * mesma tela.
   *
   * Mês encerrado abre as quatro; mês futuro não abre nenhuma. */
  const mesAncora = mesDoRecorte(f, hoje);
  const semanasAbertas =
    mesAncora.ate && hoje > mesAncora.ate
      ? SEMANAS_ROTULOS.length
      : mesAncora.de && hoje < mesAncora.de
        ? 0
        : semanasIniciadas(Number(hoje.slice(8, 10)));

  // Normaliza as metas aplicando a Matriz Operacional Proporcional (960 evidências / 570 PMs)
  const metasMensais = metas.map((m) => {
    const mat = MATRIZ_PROPORCIONAL_2026[m.subunidade];
    return {
      ...m,
      meta: mat ? mat.meta : m.meta,
      efetivo: mat ? mat.efetivo : m.efetivo,
    };
  });

  const soDaFracao = <T extends { subunidade: string }>(lista: T[]) =>
    f.fracao === "todas" ? lista : lista.filter((m) => m.subunidade === f.fracao);

  const metasMensaisRecorte = soDaFracao(metasMensais);

  /** A cota de uma semana para o recorte inteiro: soma fração a fração, para
   *  que topo e cartões semanais nunca discordem por arredondamento. */
  const metaDaSemanaNoRecorte = (semana: number) =>
    metasMensaisRecorte.reduce((s, m) => s + metaSemanalDe(m.meta, semana, ultimoDiaDoMes), 0);

  /* Com uma semana selecionada, a meta do recorte é a cota daquela semana —
     rateada por DIAS, para que o passo diário seja o mesmo em qualquer semana.
     A janela encolhe junto, em `janelaDoRecorte`. */
  const metasNormalizadas =
    f.semana === "todas"
      ? metasMensais
      : metasMensais.map((m) => ({
          ...m,
          meta: metaSemanalDe(m.meta, f.semana, ultimoDiaDoMes),
        }));

  const metasRecorte = soDaFracao(metasNormalizadas);

  const meta = metasRecorte.reduce((s, m) => s + m.meta, 0);
  const auditores = metasRecorte.reduce((s, m) => s + m.efetivo, 0);
  /* Turnos-FRAÇÃO do período (2 por dia), vindos do CALENDÁRIO — não mais de
     `MetaSubunidade.turnos`, que ainda carrega os 15 turnos de 12x36 do modelo
     anterior à Matriz Proporcional. Ver `janelaDoRecorte`. */
  const turnosPrevistos = janela.turnosFracao;

  const videosPorLanc = dados.filter((l) => l.auditou).map((l) => l.videos);
  const total = videosPorLanc.reduce((a, b) => a + b, 0);
  const pct = meta > 0 ? (total / meta) * 100 : 0;
  const falta = Math.max(0, meta - total);

  /* ---- participação: quem LANÇOU e, destes, quem AUDITOU -----------------
   *
   * `ativos` contava qualquer resposta de formulário — inclusive a de quem
   * declarou "não auditei". O KPI "Auditores ativos" e o índice de dispersão
   * (IDA) subiam com quem justamente NÃO auditou.
   *
   * Decisão do Comando em 03/09/2026: preservar o número de quem participou do
   * controle (é ele que mostra alcance da ferramenta) e exibir ao lado o
   * recorte honesto — destes, quantos de fato auditaram. */
  const ativos = new Set(dados.map((l) => l.re || l.nomeGuerra).filter(Boolean)).size;
  const ativosAuditando = new Set(
    dados.filter((l) => l.auditou).map((l) => l.re || l.nomeGuerra).filter(Boolean)
  ).size;
  /* ---- unidade da conformidade: TURNO, não LANÇAMENTO -------------------
   *
   * Queixa do Comando em 02/09/2026: "Maj Vinícus fez 2 envios no mesmo dia,
   * se somar dá mais de 3, e ele apareceu como abaixo do mínimo." Estava
   * apareceu porque a régua era por LANÇAMENTO — cada envio de formulário
   * contava separado, um com 2, o outro com 1, ambos abaixo de 3.
   *
   * A régua institucional é POR TURNO: o mínimo de 3 evidências vale para o
   * turno de serviço. Dois lançamentos do mesmo auditor no mesmo dia e turno
   * são o MESMO turno; somam. O mesmo auditor com dois dias diferentes conta
   * como dois turnos.
   *
   * Chave: RE (ou nome de guerra quando faltar RE) + data + turno. Um
   * lançamento sem `auditou` (declarou "não auditei") continua sendo evento
   * do turno — não vira "auditor no turno" para não puxar a taxa para baixo
   * indevidamente, mas continua contando em `naoAuditou`.
   *
   * `chaveDoTurno` e `somarPorTurno` são exportados do módulo desde 03/09/2026:
   * o filtro do cartão, a tabela de auditores, o histograma, a dispersão e o
   * bloco de exceções passaram a ler a MESMA soma, e não cada um a sua.
   */
  const somaPorTurno = somarPorTurno(dados);
  const videosPorTurno = [...somaPorTurno.values()];
  const turnosAuditados = somaPorTurno.size;
  const turnosConformes = videosPorTurno.filter((v) => v >= minimo).length;
  const turnosAbaixo = turnosAuditados - turnosConformes;

  const conformes = turnosConformes;
  const taxaConf = turnosAuditados ? (turnosConformes / turnosAuditados) * 100 : 0;
  const naoAuditou = dados.filter((l) => !l.auditou).length;
  const abaixo = turnosAbaixo;
  const semIds = dados.filter((l) => l.auditou && !l.idsMidia.trim()).length;

  /* ---- qualidade da evidência --------------------------------------------
   *
   * O número OFICIAL do Batalhão continua sendo `total`, que soma a quantidade
   * DECLARADA — é o que mantém setembro comparável com agosto e a meta de 960
   * de pé. O que entra aqui ao lado é o quanto dessa declaração está
   * acompanhada de um identificador que resolve para um objeto da plataforma.
   *
   * Medido na planilha em 31/08/2026, sobre 471 identificadores lançados em
   * agosto: 44,6% ID da mídia, 6,6% ID da gravação, 0,2% ID de página e 48,6%
   * que não é identificador de coisa nenhuma — número solto do tipo
   * `20260824916201`, URL, ou texto livre. Índice de rastreabilidade: 51,2%.
   *
   * Por que isto é indicador e não régua: trocar a contagem de "declarado"
   * para "rastreável" derrubaria agosto de 604 para 241 evidências — de 62,9%
   * para 25,1% da meta, atravessando duas faixas de classificação sem que
   * ninguém tenha auditado menos. A régua é decisão do Comando; o painel
   * mostra o tamanho do problema e espera a decisão.
   */
  const evidenciasRastreaveis = dados
    .filter((l) => l.auditou)
    .reduce(
      (s, l) => s + separarIdentificadores(l.idsMidia).filter(ehIdentificadorValido).length,
      0
    );
  const comIdRastreavel = dados.filter(
    (l) => l.auditou && separarIdentificadores(l.idsMidia).some(ehIdentificadorValido)
  ).length;
  /* Informou alguma coisa no campo de ID, e nada daquilo é identificador.
   * Separado de `semIds` de propósito: quem não informou nada precisa ser
   * cobrado a informar; quem informou lixo precisa ser cobrado a CORRIGIR, e
   * hoje o painel trata os dois como se fossem o mesmo caso. */
  const comIdInvalido = dados.filter(
    (l) =>
      l.auditou &&
      l.idsMidia.trim() &&
      !separarIdentificadores(l.idsMidia).some(ehIdentificadorValido)
  ).length;
  const indiceRastreabilidade = total > 0 ? (evidenciasRastreaveis / total) * 100 : 0;
  const partes = dados.filter((l) => l.numeroParte).length;
  /* Mediana e p90 do TURNO, não do envio: são lidos ao lado do mínimo de 3, que
     é regra de turno. Por lançamento, o auditor que fez 2+2 no mesmo turno
     entrava duas vezes com 2 e puxava a mediana para baixo de um mínimo que ele
     cumpriu. */
  const mediana = quantil(videosPorTurno, 0.5);
  const p90 = quantil(videosPorTurno, 0.9);

  // ---- série diária + carta de controle -----------------------------------
  const porDia = (() => {
    const m = new Map<string, number>();
    /* Mesmo predicado de `porDiaMes` e de `total`: só soma quem declarou
       auditoria. Empatava por acaso — quem responde "não auditei" traz zero —
       e bastava uma linha suja na base para a série diária discordar do total
       do topo sem nenhum aviso. */
    dados.forEach((l) => {
      if (!l.auditou || !l.data) return;
      m.set(l.data, (m.get(l.data) ?? 0) + l.videos);
    });
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, v]) => ({ data, rotulo: `${data.slice(8, 10)}/${data.slice(5, 7)}`, v }));
  })();
  /* A mesma série, do MÊS inteiro: é a do Batalhão na curva plano × realizado,
     e precisa ignorar a aba de semana pelo mesmo motivo da série por fração.
     Inclui as evidências sem fração declarada — o total do Batalhão soma tudo. */
  const porDiaMes = (() => {
    const m = new Map<string, number>();
    for (const l of dadosSemFiltroDeSemana) {
      if (!l.auditou || !l.data) continue;
      m.set(l.data, (m.get(l.data) ?? 0) + l.videos);
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, v]) => ({ data, v }));
  })();
  const serie = porDia.map((d) => d.v);
  const mediaDia = media(serie);
  const sigma = desvio(serie);
  const lsc = mediaDia + 3 * sigma;
  const lic = Math.max(0, mediaDia - 3 * sigma);
  const foraDeControle = porDia.filter((d) => sigma > 0 && (d.v > lsc || d.v < lic));
  /* Meta DIÁRIA do recorte: 960 ÷ 30 = 32 em setembro.
     Antes era `Σ meta ÷ m.turnos` com `turnos: 15`, o que dava 65 e ia para a
     tela rotulado "meta/turno" — a linha do gráfico diário e o cartão "MÉDIA
     POR TURNO · meta de 65 por turno" do briefing saíam os dois com o dobro do
     valor certo, e por turno, quando o eixo é por dia. */
  const metaDia = janela.dias > 0 ? meta / janela.dias : 0;

  /** Turnos já cobertos = dias distintos com lançamento. É a melhor
   *  aproximação disponível: a planilha registra data e turno, não um
   *  calendário de escala. */
  /* Dias distintos em que ALGUÉM lançou. É medida de cobertura, não de tempo:
     serve para dizer "houve lançamento em 2 dos 2 dias corridos", e nunca mais
     para calcular quanto do período já correu — era daí que saía "faltam 873 em
     13 turnos", com 13 = 15 turnos do modelo antigo menos 2 dias com lançamento,
     somando maçã com laranja. */
  const diasComLancamento = porDia.length;
  const turnosCumpridos = janela.turnosFracaoDecorridos;
  const turnosRestantes = janela.turnosFracaoRestantes;

  /* RITMO NECESSÁRIO do Batalhão é POR DIA, nunca por turno — vocabulário
     fixado com o Maj PM em 31/08/2026 (`cop2026-tendencia.ts`). Por turno-fração
     é a medida da FRAÇÃO, e está em `LinhaFracao.ritmoNecessario`. */
  const ritmoNecessario = janela.diasRestantes > 0 ? falta / janela.diasRestantes : falta;

  // ---- semanas consolidadas do Batalhão / Recorte --------------------------
  /* A base é o RECORTE, não a planilha inteira.
   *
   * Antes daqui saía um filtro próprio, só por fração e turno, que ignorava o
   * `de`/`ate` do mês. `identificarSemana` classifica pelo DIA DO MÊS, então
   * 24/08 e 24/09 caem os dois na Semana 4: em 02/09/2026 o painel — e o
   * briefing, que lê o mesmo Painel — anunciaram SEMANA 4 com 1.146/240 e
   * "Meta semanal superada", somando agosto inteiro contra a cota de uma
   * semana de setembro. As quatro semanas somavam 1.341 contra 87 do mês.
   *
   * É a mesma classe de erro que a meta mensal já tinha pago em 01/09 no quadro
   * público (ver `filtrosDoMesCorrente`): meta de um mês contra lançamento de
   * dois. Com a base recortada, a virada do mês zera as quatro sozinha. */
  const lancamentosSemanaisBase = dadosSemFiltroDeSemana;

  /* O rótulo da 4ª semana acompanha o MÊS do recorte — 22 a 30 em setembro e
     novembro, 22 a 31 nos demais. Vem do mês, e não de `janela.ate`, que já
     pode estar encolhido para a semana selecionada. */
  const ultimoDiaDoRecorte = ultimoDiaDoMes;

  const semanasBatalhao: ProgressoSemana[] = SEMANAS_ROTULOS.map((s) => {
    const daSemana = lancamentosSemanaisBase.filter(
      (l) => l.auditou && identificarSemana(l.data) === s.semana
    );
    const feito = daSemana.reduce((sum, l) => sum + l.videos, 0);
    const metaSem = metaDaSemanaNoRecorte(s.semana);
    const p = metaSem > 0 ? (feito / metaSem) * 100 : 0;
    return {
      semana: s.semana,
      rotulo: s.rotulo,
      diasRotulo: diasDaSemana(s.semana, ultimoDiaDoRecorte),
      meta: metaSem,
      feito,
      pct: p,
      falta: Math.max(0, metaSem - feito),
      /* Semana que já abriu tem base de cálculo, mesmo com zero feito: é
         FAIXA CRÍTICA, e não "não aferível". Ver `semanasAbertas`. */
      nivel: nivelPorCumprimento(p, metaSem > 0 && s.semana <= semanasAbertas),
    };
  });

  // ---- ranking de frações --------------------------------------------------
  const fracoes: LinhaFracao[] = metasRecorte
    .map((m, i) => {
      const daFracao = dados.filter((l) => l.subunidade === m.subunidade);
      const feito = daFracao.reduce((s, l) => s + l.videos, 0);
      const lancaram = new Set(daFracao.map((l) => l.re || l.nomeGuerra).filter(Boolean)).size;
      const mat = MATRIZ_PROPORCIONAL_2026[m.subunidade];
      /* Meta DO RECORTE: com uma semana selecionada é a cota da semana, na
         mesma escala da janela. A meta do mês continua disponível para o que é
         sempre mensal, como o desempenho semana a semana. */
      const metaReal = m.meta;
      const metaMensal = metasMensaisRecorte[i]?.meta ?? (mat ? mat.meta : m.meta);
      const p = metaReal > 0 ? (feito / metaReal) * 100 : 0;
      const fa = Math.max(0, metaReal - feito);
      /* Turnos-fração que ainda restam no período, do calendário. */
      const rest = janela.turnosFracaoRestantes;

      /* Desempenho semana a semana da fração — do RECORTE, pelo mesmo motivo
         de `semanasBatalhao`. Lendo a planilha inteira, a Força Tática exibia
         "Sem 4: 486/36 · 1.350%" em 02/09 com 6 evidências no mês. */
      const todosDaFracao = dadosSemFiltroDeSemana.filter(
        (l) => l.subunidade === m.subunidade && l.auditou
      );
      /* Série diária da fração, do MÊS inteiro — mesma base das semanas, para
         a soma dos dias fechar com a soma das semanas. Fica fora do filtro de
         semana de propósito: a curva plano × realizado é do mês, e com a aba
         "Sem 2" ligada ela desenharia 23 dias zerados como se a fração não
         tivesse produzido nada neles. */
      const porDiaFracao = (() => {
        const porData = new Map<string, number>();
        for (const l of todosDaFracao) {
          if (!l.data) continue;
          porData.set(l.data, (porData.get(l.data) ?? 0) + l.videos);
        }
        return [...porData.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([data, v]) => ({ data, v }));
      })();

      const semanasFracao: ProgressoSemana[] = SEMANAS_ROTULOS.map((s) => {
        const lancsSem = todosDaFracao.filter((l) => identificarSemana(l.data) === s.semana);
        const feitoSem = lancsSem.reduce((sum, l) => sum + l.videos, 0);
        const metaSem = metaSemanalDe(metaMensal, s.semana, ultimoDiaDoMes);
        const pSem = metaSem > 0 ? (feitoSem / metaSem) * 100 : 0;
        return {
          semana: s.semana,
          rotulo: s.rotulo,
          diasRotulo: diasDaSemana(s.semana, ultimoDiaDoRecorte),
          meta: metaSem,
          feito: feitoSem,
          pct: pSem,
          falta: Math.max(0, metaSem - feitoSem),
          nivel: nivelPorCumprimento(pSem, metaSem > 0 && s.semana <= semanasAbertas),
        };
      });

      return {
        chave: m.subunidade,
        rotulo: ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade,
        meta: metaReal,
        metaMes: metaMensal,
        feito,
        pct: p,
        falta: fa,
        efetivo: m.efetivo,
        lancaram,
        nivel: nivelPorCumprimento(p, metaReal > 0),
        ritmoNecessario: rest > 0 ? fa / rest : fa,
        turnosRestantes: rest,
        pctBatalhao: mat ? mat.pctMeta : meta > 0 ? (metaReal / meta) * 100 : 0,
        /* Ritmo-ALVO por turno-fração: a cota da fração dividida pelos turnos do
           período (195 ÷ 60 = 3,25). Antes vinha de `mat.ritmoProporcional`, o
           rateio inteiro da constante RITMO_GLOBAL_RESTANTE = 73, que punha
           "RITMO 15/turno" no cartão da 1ª Cia — quase cinco vezes a cota real e
           impossível de cumprir. */
        ritmoProporcional:
          janela.turnosFracao > 0 ? metaReal / janela.turnosFracao : mat?.ritmoProporcional,
        efetivoQuadro: mat ? mat.efetivo : m.efetivo,
        semanas: semanasFracao,
        porDia: porDiaFracao,
      };
    })
    .sort((a, b) => {
      const ia = ORDEM_SUBUNIDADES.indexOf(a.chave as (typeof ORDEM_SUBUNIDADES)[number]);
      const ib = ORDEM_SUBUNIDADES.indexOf(b.chave as (typeof ORDEM_SUBUNIDADES)[number]);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.chave.localeCompare(b.chave);
    });

  /* ---- evidências órfãs ----------------------------------------------------
   *
   * Lançamento cuja fração o auditor não informou não casa com nenhuma linha de
   * meta e SOME do ranking — mas continua somando no total do Batalhão. Em
   * 02/09/2026 isso pôs dois totais na mesma tela: "EVIDÊNCIAS AUDITADAS 87" no
   * topo e "Realizado 65" na Tendência por Fração, com 22 evidências de quatro
   * auditores sem fração no meio.
   *
   * Não se resolve escondendo nem somando calado: o número aparece com nome,
   * porque o conserto é o auditor declarar a fração na planilha. */
  const chavesComMeta = new Set(metasRecorte.map((m) => m.subunidade));
  const semFracaoDados = dados.filter((l) => l.auditou && !chavesComMeta.has(l.subunidade));
  const semFracao = {
    lancamentos: semFracaoDados.length,
    videos: semFracaoDados.reduce((s, l) => s + l.videos, 0),
    auditores: new Set(semFracaoDados.map((l) => l.re || l.nomeGuerra).filter(Boolean)).size,
  };

  // ---- comparativos --------------------------------------------------------
  /* Os três turnos que o lançamento aceita (`OPCOES_TURNO`). O comparativo
     somava só diurno e noturno, e as evidências lançadas como Administrativo —
     o expediente do Estado-Maior — não apareciam em lado nenhum: o gráfico não
     fechava com o total do painel. */
  const porTurno = ["diurno", "noturno", "administrativo"].map((t) => ({
    rotulo: t === "diurno" ? "Diurno" : t === "noturno" ? "Noturno" : "Administrativo",
    v: dados
      .filter((l) => (l.turno || "").toLowerCase().startsWith(t))
      .reduce((s, l) => s + l.videos, 0),
  }));

  const porFuncao = (() => {
    const m = new Map<string, number>();
    dados.forEach((l) =>
      m.set(l.funcao || "Não informada", (m.get(l.funcao || "Não informada") ?? 0) + l.videos)
    );
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([rotulo, v]) => ({ rotulo, v }));
  })();

  /* Função e posto respondem a perguntas diferentes: uma diz em que atribuição
     a auditoria acontece, a outra em que nível hierárquico. O Comando cobra
     por posto. */
  const agruparPor = (chave: (l: LancamentoCop) => string) => {
    const m = new Map<string, { v: number; pms: Set<string> }>();
    dados.forEach((l) => {
      const k = chave(l) || "Não informado";
      const a = m.get(k) ?? { v: 0, pms: new Set<string>() };
      a.v += l.videos;
      const quem = l.re || l.nomeGuerra;
      if (quem) a.pms.add(quem);
      m.set(k, a);
    });
    return [...m.entries()]
      .sort((a, b) => b[1].v - a[1].v)
      .slice(0, 8)
      .map(([rotulo, a]) => ({ rotulo, v: a.v, pms: a.pms.size }));
  };
  const porPosto = agruparPor((l) => l.posto);

  // ---- exceções nominais ---------------------------------------------------
  /* Contagem não se cobra: nome se cobra. A Diretriz PM3-001/02/25 manda olhar
     de perto quem não auditou, quem ficou abaixo do mínimo e as partes — com a
     justificativa que a pessoa registrou, não só o número dela. */
  const detalhar = (l: LancamentoCop) => ({
    id: l.id,
    quem: `${l.posto} ${l.nomeGuerra}`.trim() || l.re,
    fracao: ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade,
    data: l.data,
    turno: l.turno,
    videos: l.videos,
    parte: l.numeroParte,
    justificativa: l.justificativa,
    descartado: l.quantidadeDescartada,
  });
  const naoAuditouLista = dados.filter((l) => !l.auditou).map(detalhar);
  /* Turnos abaixo do mínimo — agrupa por (RE, data, turno) e usa o PRIMEIRO
   * lançamento do turno como cara do item, com a SOMA do turno no `videos`.
   * Se a soma dos lançamentos do turno ≥ mínimo, o turno cumpriu e sai da
   * lista. Isto casa com o novo `abaixo` (contador) — as duas leituras andam
   * juntas por construção. */
  const primeiroDoTurno = new Map<string, LancamentoCop>();
  for (const l of dados) {
    if (!l.auditou) continue;
    const k = chaveDoTurno(l);
    if (!primeiroDoTurno.has(k)) primeiroDoTurno.set(k, l);
  }
  const abaixoLista = [...somaPorTurno.entries()]
    .filter(([, soma]) => soma < minimo)
    .map(([k, soma]) => {
      const l = primeiroDoTurno.get(k)!;
      return { ...detalhar(l), videos: soma };
    });
  const partesLista = dados.filter((l) => l.numeroParte).map(detalhar);
  const semIdsLista = dados.filter((l) => l.auditou && !l.idsMidia.trim()).map(detalhar);
  /* Informou alguma coisa e nada daquilo resolve para a plataforma. É a lista
   * do que se cobra CORRIGIR — distinta de `semIdsLista`, que é o que se cobra
   * INFORMAR. Sem essa separação o Comando manda a mesma cobrança para quem
   * esqueceu e para quem colou o número errado. */
  const idInvalidoLista = dados
    .filter(
      (l) =>
        l.auditou &&
        l.idsMidia.trim() &&
        !separarIdentificadores(l.idsMidia).some(ehIdentificadorValido)
    )
    .map(detalhar);
  /* Quantidade implausível: o campo "informe a quantidade exata" é texto livre
     e já recebeu o ID da mídia no lugar do número. A contagem foi corrigida na
     leitura (lib/cop2026.ts), mas a planilha continua errada — quem conserta é
     o auditor, e só conserta se o painel disser o nome dele. */
  const quantidadeInvalidaLista = dados.filter((l) => l.quantidadeDescartada > 0).map(detalhar);
  /* Mesma mídia lançada por mais de um auditor — dupla contagem contra a meta.
     A lista traz os IDs repetidos junto, porque a cobrança é sobre o ID, não
     sobre a pessoa: os dois lados podem estar de boa-fé e um dos dois tem de
     ser retirado da planilha. */
  const duplicadoLista = dados
    .map((l) => ({ l, ids: duplicadosDoLancamento(l, duplicados) }))
    .filter((x) => x.ids.length > 0)
    .map((x) => ({ ...detalhar(x.l), ids: x.ids }));
  const comIdDuplicado = duplicadoLista.length;
  /* Quantos identificadores distintos estão repetidos e quantas evidências
     isso representa a mais na soma — é o tamanho do problema, não o nº de
     lançamentos envolvidos. */
  const idsDuplicadosNoRecorte = new Set(duplicadoLista.flatMap((x) => x.ids)).size;
  const semFracaoLista = semFracaoDados.map(detalhar);

  /* ---- listas de PONTO DE ATENÇÃO ----------------------------------------
   *
   * Contadores acima (naoAuditou, abaixo, semIds, comIdInvalido) continuam
   * somando TUDO no recorte — é a régua bruta que precisa aparecer no topo.
   * As LISTAS abaixo, que a caixa "Pontos de atenção" exibe com nome, RE e
   * justificativa, são o gatilho de intervenção — e um lançamento isolado no
   * dia não caracteriza padrão. Por isso são recortadas pela JANELA MÓVEL de
   * `janelaAtencaoDias` (padrão 7) sobre a DATA do lançamento.
   *
   * O que saiu em 03/09/2026: havia um segundo portão, `janelaEmCurso`, que
   * esvaziava as três listas enquanto o RECORTE não tivesse 7 dias corridos.
   * Como o recorte zera na virada do mês, isso produzia uma janela cega do dia
   * 1 ao dia 6 de TODO mês — o Comando abria o painel no dia 2 e não via nome
   * nenhum, nem de quem declarou "não auditei". A janela móvel já responde
   * sozinha à preocupação original (um caso isolado some da lista em 7 dias);
   * o portão extra só apagava a tela.
   *
   * Limite conhecido e aceito: a base é o mês do recorte, então no dia 1º a
   * lista começa curta e não alcança o fim do mês anterior. Preferimos isso a
   * abrir exceção à regra do §3-Z ("ninguém varre `lancamentos` fora do
   * portão"), que é o que protege o painel do bug de recorte.
   */
  const decorridosNaJanela = janela.decorridos;
  const dentroDaJanela = (dataIso: string) =>
    dentroDaJanelaAtencao(dataIso, hoje, janelaAtencaoDias);

  const atencao = {
    janelaDias: janelaAtencaoDias,
    diasDecorridos: decorridosNaJanela,
    /** Mantido para a UI, sempre falso: não há mais período de carência. */
    emCurso: false,
    naoAuditou: naoAuditouLista.filter((l) => dentroDaJanela(l.data)),
    abaixo: abaixoLista.filter((l) => dentroDaJanela(l.data)),
    partes: partesLista.filter((l) => dentroDaJanela(l.data)),
  };

  /* Auditores DISTINTOS por quinzena e por fração — a coluna QUINZENA da
   * tabela Tendência. Fica AQUI, e não em quem monta a página, porque cada
   * consumidor que tocasse em `lancamentos` direto era uma chance nova de
   * esquecer o `de`/`ate` — foi o que pôs "2% · 4%" de participação na 2ª
   * quinzena de setembro no dia 2 do mês, somando os auditores de agosto.
   * Como sai de `dados` (já recortado por `aplicarFiltros`), a mesma classe de
   * bug não pode voltar sem reintroduzir uma leitura de fora do portão. */
  const auditoresPorQuinzena: Record<string, [number, number]> = {};
  const setsPorQuinzena = new Map<string, [Set<string>, Set<string>]>();
  for (const l of dados) {
    if (!l.auditou) continue;
    const identidade = (l.re || l.nomeGuerra || "").trim();
    if (!identidade) continue;
    const quinzena = identificarSemana(l.data) <= 2 ? 0 : 1;
    if (!setsPorQuinzena.has(l.subunidade)) {
      setsPorQuinzena.set(l.subunidade, [new Set(), new Set()]);
    }
    setsPorQuinzena.get(l.subunidade)![quinzena].add(identidade);
  }
  for (const [chave, [q1, q2]] of setsPorQuinzena) {
    auditoresPorQuinzena[chave] = [q1.size, q2.size];
  }

  /* ---- histograma ----------------------------------------------------------
     Distribuição por TURNO DE SERVIÇO. A barra é lida contra o mínimo (`conforme:
     n >= minimo`), e o mínimo é regra de turno: por lançamento, quem fez 2+2 no
     mesmo turno aparecia duas vezes na coluna "2", em vermelho, tendo cumprido. */
  const histograma = [0, 1, 2, 3, 4, 5].map((n) => ({
    faixa: n === 5 ? "5+" : String(n),
    q: videosPorTurno.filter((v) => (n === 5 ? v >= 5 : v === n)).length,
    conforme: n >= minimo,
  }));

  // ---- dispersão por fração ------------------------------------------------
  /* Também por TURNO, pelo mesmo motivo do histograma: a caixa é comparada com
     a linha do mínimo na mesma tela. */
  const dispersao = fracoes.map((s) => {
    const v = [...somarPorTurno(dados.filter((l) => l.subunidade === s.chave)).values()];
    return {
      rotulo: s.rotulo,
      min: v.length ? Math.min(...v) : 0,
      q1: quantil(v, 0.25),
      med: quantil(v, 0.5),
      q3: quantil(v, 0.75),
      p90: quantil(v, 0.9),
      max: v.length ? Math.max(...v) : 0,
      n: v.length,
    };
  });

  // ---- matriz hora × dia ---------------------------------------------------
  const matriz: number[][] = Array.from({ length: 7 }, () =>
    Array(FAIXAS_HORA.length).fill(0)
  );
  dados.forEach((l) => {
    if (!l.data) return;
    const d = new Date(`${l.data}T12:00:00`).getDay();
    const h = Number.parseInt((l.hora || "").slice(0, 2), 10);
    /* Sem hora vai para a coluna própria, e não para o meio da tarde. */
    const faixa =
      Number.isFinite(h) && h >= 0 && h <= 23
        ? Math.min(5, Math.floor(h / 4))
        : FAIXA_HORA_SEM_HORA;
    matriz[d][faixa] += l.videos;
  });
  /* A escala de calor é das HORAS. A coluna "s/ hora" fica de fora do máximo:
     ela mede dado faltante, não concentração de atividade, e se entrasse aqui
     um mês mal preenchido achataria o mapa inteiro. */
  const maxMatriz = Math.max(
    1,
    ...matriz.map((linha) => linha.slice(0, FAIXA_HORA_SEM_HORA)).flat()
  );

  // ---- Pareto de auditores -------------------------------------------------
  const pareto = (() => {
    const m = new Map<string, number>();
    dados.forEach((l) => {
      const k = l.nomeGuerra || l.re;
      if (k) m.set(k, (m.get(k) ?? 0) + l.videos);
    });
    const lista = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    const soma = lista.reduce((s, [, v]) => s + v, 0) || 1;
    let acc = 0;
    return lista.map(([nome, v]) => {
      acc += v;
      return { nome, v, acumulado: (acc / soma) * 100 };
    });
  })();

  // ---- funil ---------------------------------------------------------------
  /* A etapa dos IDs dizia "Com IDs de mídia informados" e contava qualquer
   * coisa digitada no campo — em agosto, 48,6% daquilo não era identificador de
   * nada. O funil anunciava cobertura que não existia. Agora a etapa mede o que
   * o nome dela promete, e a última fecha o funil com a verdade: nada foi
   * conferido contra a plataforma, porque não há integração com ela. Mostrar
   * zero é honesto — e é o argumento mais forte para conseguir o acesso. */
  /* A partir da segunda etapa a unidade é o TURNO (RE+data+turno), e não o
     envio de formulário: é a régua do mínimo. Misturar as duas fazia o funil
     estreitar por motivo errado — dois envios do mesmo turno "perdiam" um
     degrau que nunca existiu. A primeira etapa fica em lançamentos de
     propósito: é o que entrou pela porta. */
  const turnosComIdValido = [
    ...somarPorTurno(
      dados.filter((l) => separarIdentificadores(l.idsMidia).some(ehIdentificadorValido))
    ).keys(),
  ].length;
  const funil = [
    { etapa: "Lançamentos recebidos", v: dados.length },
    { etapa: "Turnos com auditoria lançada", v: turnosAuditados },
    { etapa: `Turnos com ≥ ${minimo} evidências`, v: turnosConformes },
    { etapa: "Turnos com identificador em formato válido", v: turnosComIdValido },
    { etapa: "Conferidos na plataforma", v: 0 },
  ];

  // ---- tabela analítica ----------------------------------------------------
  const auditoresLinhas: LinhaAuditor[] = (() => {
    /* Turnos por auditor, a partir da MESMA soma que o cartão do topo usa.
       Antes esta tabela contava `l.videos < minimo` por envio: o auditor que
       fez 2+2 no mesmo turno aparecia com dois desvios e selo vermelho,
       enquanto o cartão acima o dava como conforme. */
    const turnosDoAuditor = new Map<string, { total: number; abaixo: number }>();
    for (const [chave, soma] of somaPorTurno) {
      const l = primeiroDoTurno.get(chave);
      const quem = l ? l.re || l.nomeGuerra : "";
      if (!quem) continue;
      const a = turnosDoAuditor.get(quem) ?? { total: 0, abaixo: 0 };
      a.total += 1;
      if (soma < minimo) a.abaixo += 1;
      turnosDoAuditor.set(quem, a);
    }

    const m = new Map<string, LinhaAuditor>();
    dados.forEach((l) => {
      const k = l.re || l.nomeGuerra;
      if (!k) return;
      const a =
        m.get(k) ??
        ({
          chave: k,
          nome: l.nomeGuerra || l.re,
          posto: l.posto,
          fracao: ROTULO_SUBUNIDADE[l.subunidade] ?? "",
          lanc: 0,
          turnos: 0,
          videos: 0,
          media: 0,
          abaixo: 0,
          semIds: 0,
          naoAuditou: 0,
          nivel: "neutro",
        } as LinhaAuditor);
      a.lanc += 1;
      a.videos += l.videos;
      if (!l.auditou) a.naoAuditou += 1;
      if (l.auditou && !l.idsMidia.trim()) a.semIds += 1;
      m.set(k, a);
    });
    return [...m.values()].map((a) => {
      const t = turnosDoAuditor.get(a.chave);
      a.turnos = t?.total ?? 0;
      a.abaixo = t?.abaixo ?? 0;
      a.media = a.turnos ? a.videos / a.turnos : 0;
      /* Eventos = turnos auditados + declarações de "não auditei". É contra
         esse total que o desvio vira crítico, e não contra o nº de envios. */
      const eventos = a.turnos + a.naoAuditou;
      const desvios = a.abaixo + a.naoAuditou;
      a.nivel =
        desvios === 0 ? "conforme" : eventos > 0 && desvios >= eventos ? "critico" : "atencao";
      return a;
    });
  })();

  const nivelGeral = nivelPorCumprimento(pct, meta > 0 && dados.length > 0);

  return {
    minimo,
    /* Quantas respostas existem na planilha inteira, antes de qualquer filtro.
       É o que separa "seu recorte não pegou nada" de "ainda não há auditoria
       lançada" — dizer a primeira quando é a segunda manda o Comando mexer num
       filtro que ele não aplicou. */
    totalNaPlanilha: lancamentos.length,
    dados,
    metasRecorte,
    meta,
    auditores,
    total,
    pct,
    falta,
    /** Quem enviou formulário no recorte — inclui quem declarou "não auditei". */
    ativos,
    /** Destes, quem de fato auditou. É o número honesto de participação. */
    ativosAuditando,
    conformes,
    taxaConf,
    naoAuditou,
    abaixo,
    semIds,
    // Qualidade da evidência — indicador, não régua. O total oficial acima
    // continua sendo a quantidade declarada (ver comentário em `calcularPainel`).
    evidenciasRastreaveis,
    indiceRastreabilidade,
    comIdRastreavel,
    comIdInvalido,
    partes,
    mediana,
    p90,
    porDia,
    porDiaMes,
    mediaDia,
    sigma,
    lsc,
    lic,
    foraDeControle,
    metaDia,
    turnosPrevistos,
    turnosCumpridos,
    turnosRestantes,
    ritmoNecessario,
    /* Calendário do recorte — quem responde "quanto do mês já correu". */
    janela,
    janelaMes,
    diasComLancamento,
    /* Evidências que não pertencem a fração nenhuma (ver acima). */
    semFracao,
    semFracaoLista,
    /* Mesma mídia auditada duas vezes. */
    comIdDuplicado,
    idsDuplicadosNoRecorte,
    duplicadoLista,
    auditoresPorQuinzena,
    /* Unidade da conformidade agora é o TURNO — dois lançamentos do mesmo
     * auditor no mesmo turno somam contra o mínimo. */
    turnosAuditados,
    turnosConformes,
    turnosAbaixo,
    /* Ponto de atenção — recorte de tempo ver acima. */
    atencao,
    fracoes,
    /* Calculado AQUI, dentro do portão, e nunca no componente: é a superfície
       que se contradizia sozinha antes de 03/09/2026. Ver `excecoesPorFracao`. */
    excecoes: excecoesPorFracao(dados, fracoes, minimo),
    semanasBatalhao,
    porTurno,
    porFuncao,
    porPosto,
    naoAuditouLista,
    abaixoLista,
    idInvalidoLista,
    partesLista,
    semIdsLista,
    quantidadeInvalidaLista,
    histograma,
    dispersao,
    matriz,
    maxMatriz,
    pareto,
    funil,
    auditoresLinhas,
    nivelGeral,
  };
}

// ---------------------------------------------------------------------------
// Frases-conclusão — o painel dizendo o que ele mesmo está mostrando
// ---------------------------------------------------------------------------
export function veredito(p: Painel): { titulo: string; detalhe: string; nivel: Nivel } {
  if (!p.dados.length) {
    return p.totalNaPlanilha === 0
      ? {
          titulo: "Nenhuma auditoria lançada ainda.",
          detalhe:
            "A planilha de respostas está vazia. O painel passa a medir assim que o primeiro formulário for enviado.",
          nivel: "neutro",
        }
      : {
          titulo: "Sem lançamentos no recorte selecionado.",
          detalhe: `A planilha tem ${FMT.format(p.totalNaPlanilha)} resposta(s), mas nenhuma dentro deste filtro. Limpe o recorte para ver tudo.`,
          nivel: "neutro",
        };
  }
  /* O Batalhão se mede POR DIA — vocabulário fixado com o Maj PM em 31/08/2026.
     Esta frase dizia "faltam 873 evidências em 13 turnos — 68 por turno", que
     era o modelo antigo (15 turnos de 12x36 menos os dias com lançamento) e
     contradizia o próprio painel, que já falava em dias na mesma tela. */
  /* `diasRestantes` conta os dias DEPOIS de hoje — no dia 30 ele é zero com o
     mês inteiro ainda aberto, e a frase anunciava "o período já se encerrou" às
     08h. Quem responde por "acabou" é `janela.encerrado` (hoje > último dia). */
  const dias = p.janela.diasRestantes;
  const ritmo = p.janela.encerrado
    ? `Faltam ${FMT.format(p.falta)} evidências e o período de ${FMT.format(
        p.janela.dias
      )} dias já se encerrou.`
    : dias > 0
      ? `Faltam ${FMT.format(p.falta)} evidências em ${FMT.format(dias)} dia${
          dias === 1 ? "" : "s"
        } — ${FMT.format(Math.ceil(p.ritmoNecessario))} por dia para fechar a meta.`
      : `Faltam ${FMT.format(p.falta)} evidências e hoje é o último dia do período — ${FMT.format(
          Math.ceil(p.falta)
        )} precisam entrar até o fim do expediente.`;

  const TITULO_POR_NIVEL: Record<Nivel, string> = {
    superacao: "ACIMA da Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
    conforme: "CUMPRIDA a Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
    atencao: "FAIXA DE ATENÇÃO da Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
    critico: "ABAIXO da Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
    neutro: "Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
  };
  const titulo = TITULO_POR_NIVEL[p.nivelGeral];

  const detalhe =
    p.pct > 100
      ? `Auditoria em ${PCT.format(p.pct)}% da meta — superação quantitativa da referência no 16º BPM/M.`
      : p.falta > 0
        ? `Auditoria em ${PCT.format(p.pct)}% da meta. ${ritmo}`
        : `Auditoria em ${PCT.format(p.pct)}% da meta — meta do período já cumprida no 16º BPM/M.`;

  return { titulo, detalhe, nivel: p.nivelGeral };
}

export function conclusaoRitmo(p: Painel): string {
  if (p.porDia.length < 2) return "Ainda não há dias suficientes para descrever um ritmo.";
  const ultimo = p.porDia[p.porDia.length - 1];
  const comparativo =
    ultimo.v >= p.mediaDia
      ? `acima da média diária de ${FMT.format(Math.round(p.mediaDia))}`
      : `abaixo da média diária de ${FMT.format(Math.round(p.mediaDia))}`;
  const atipicos = p.foraDeControle.length
    ? ` ${p.foraDeControle.length} dia(s) ficaram fora da faixa normal e merecem verificação.`
    : " Nenhum dia saiu da faixa normal de variação.";
  return `Último dia (${ultimo.rotulo}): ${FMT.format(ultimo.v)} evidências, ${comparativo}.${atipicos}`;
}

export function conclusaoQualidade(p: Painel): string {
  const forte = p.histograma.filter((h) => h.conforme).reduce((s, h) => s + h.q, 0);
  const t = p.histograma.reduce((s, h) => s + h.q, 0) || 1;
  return `${PCT.format((forte / t) * 100)}% dos turnos de serviço trouxeram ${p.minimo} ou mais evidências. A mediana por turno é ${FMT.format(
    p.mediana
  )} e os 10% mais produtivos entregam ${FMT.format(p.p90)} ou mais.`;
}

export function conclusaoPareto(p: Painel): string {
  if (!p.pareto.length) return "Sem auditores no recorte.";
  const oitenta = p.pareto.findIndex((d) => d.acumulado >= 80);
  const n = oitenta === -1 ? p.pareto.length : oitenta + 1;
  return `${FMT.format(n)} auditor(es) respondem por ~80% de tudo que foi auditado no recorte — a carga está concentrada neles.`;
}

export function conclusaoDistribuicao(p: Painel): string {
  const comDados = p.dispersao.filter((d) => d.n > 0);
  if (!comDados.length) return "Sem dispersão a comparar no recorte.";
  const pior = [...comDados].sort((a, b) => a.med - b.med)[0];
  return `${pior.rotulo} tem a menor mediana do recorte (${FMT.format(pior.med)} evidências por turno de serviço, n=${FMT.format(pior.n)} turnos).`;
}

export function conclusaoFunil(p: Painel): string {
  /* Denominador é o TURNO desde 03/09/2026, como o resto do funil: comparar
     turnos com identificador contra lançamentos recebidos misturava réguas e
     dava percentual menor do que o real. */
  const auditados = p.funil[1]?.v || 1;
  const comIds = p.funil[3]?.v ?? 0;
  return `De ${FMT.format(auditados)} turno(s) com auditoria lançada, ${FMT.format(
    comIds
  )} (${PCT.format(
    (comIds / auditados) * 100
  )}%) trouxeram identificador em formato válido — sem o ID, a evidência não é rastreável na conferência.`;
}

export function conclusaoHorario(p: Painel): string {
  let melhorD = 0;
  let melhorF = 0;
  let melhor = 0;
  p.matriz.forEach((linha, d) =>
    linha.forEach((v, f) => {
      if (v > melhor) {
        melhor = v;
        melhorD = d;
        melhorF = f;
      }
    })
  );
  if (!melhor) return "Sem concentração identificável no recorte.";
  return `A auditoria se concentra em ${DIAS[melhorD]}, na faixa das ${FAIXAS_HORA[melhorF]}h (${FMT.format(melhor)} evidências).`;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export function auditoresParaCsv(linhas: LinhaAuditor[]): string {
  const cab = [
    "Auditor",
    "Posto",
    "Fração",
    "Lançamentos",
    "Turnos",
    "Evidências",
    "Média por turno",
    "Turnos abaixo do mínimo",
    "Sem IDs",
    "Não auditou",
  ];
  const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const corpo = linhas.map((r) =>
    [
      r.nome,
      r.posto,
      r.fracao,
      r.lanc,
      r.turnos,
      r.videos,
      r.media.toFixed(2),
      r.abaixo,
      r.semIds,
      r.naoAuditou,
    ]
      .map(escapar)
      .join(";")
  );
  // BOM: sem ele o Excel em pt-BR abre acentuação quebrada.
  return `﻿${[cab.map(escapar).join(";"), ...corpo].join("\r\n")}`;
}

/** O CSV da tabela analítica agrega por auditor. Este exporta a resposta como
 *  ela está na planilha — é o que instrui parte e vira anexo de processo. */
export function lancamentosParaCsv(dados: LancamentoCop[]): string {
  const cab = [
    "Data",
    "Hora",
    "Turno",
    "RE",
    "Nome de guerra",
    "Posto",
    "Função",
    "Fração",
    "Auditou",
    "Evidências",
    "IDs auditados",
    "Parte",
    "Justificativa",
  ];
  const escapar = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const corpo = dados.map((l) =>
    [
      l.data,
      l.hora,
      l.turno,
      l.re,
      l.nomeGuerra,
      l.posto,
      l.funcao,
      ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade,
      l.auditou ? "Sim" : "Não",
      l.videos,
      // Os três campos de texto livre passam pela redação de CPF: são os únicos
      // em que o auditor cola conteúdo copiado da plataforma. Os demais são
      // fechados (data, turno, fração) ou já institucionais (RE, posto).
      redigirCpf(l.idsMidia.replace(/\s+/g, " ")),
      redigirCpf(l.numeroParte),
      redigirCpf(l.justificativa),
    ]
      .map(escapar)
      .join(";")
  );
  return `\ufeff${[cab.map(escapar).join(";"), ...corpo].join("\r\n")}`;
}

export type Excecao = Painel["naoAuditouLista"][number];

export const ORDEM = ORDEM_SUBUNIDADES;
