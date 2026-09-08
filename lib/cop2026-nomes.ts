/**
 * CORRETOR DE CAIXA — nome próprio, posto e função em caixa uniforme.
 *
 * Pedido do Fabrício em 08/09/2026 ("corretor de maiúsculo"), com a decisão de
 * normalizar também o histórico no banco.
 *
 * O PROBLEMA REAL: a mesma pessoa aparece como `FABRICIO BEIRA PIRES`,
 * `Fabricio Beira Pires` e `fabricio beira pires` conforme o teclado do
 * celular, o autocorretor e o humor de quem digitou. Numa tabela de comando
 * isso não é só feio — CAIXA ALTA no meio de uma coluna lê como ênfase, e o
 * leitor procura o motivo do destaque que não existe.
 *
 * ONDE ISTO É APLICADO: na PORTA DE ENTRADA da leitura da planilha
 * (`lib/cop2026.ts`), no mesmo ponto em que o CPF é redigido — e pela mesma
 * razão escrita lá: um campo alimenta ao mesmo tempo o painel, o briefing, o
 * relatório impresso, a planilha e o CSV. Normalizar num lugar só é o que
 * garante que uma superfície nova não nasça com a caixa errada.
 *
 * O QUE NUNCA É REBAIXADO — e é aqui que um Title Case ingênuo estraga
 * documento oficial:
 *
 * - siglas da Corporação: PM, BPM, CPA, COP, EM, FT, ADM, DEJEM, MDIP, LCDIP;
 * - o "º" das ordinais de graduação (3º Sgt PM), que não é letra;
 * - iniciais soltas ("J." continua "J.").
 *
 * E o que é REBAIXADO: as partículas portuguesas (de, da, do, das, dos, e),
 * exceto quando abrem o nome — "Da Silva" no começo é sobrenome, "da Silva" no
 * meio é partícula.
 *
 * O ORIGINAL NÃO SE PERDE. Aqui é apresentação — a leitura da planilha é
 * reconstruída a cada requisição, e a planilha do Google continua intacta. A
 * única coisa que reescreve dado é a migração 032, e ela guarda um retrato da
 * caixa anterior em `cop_caixa_backup_032` antes de tocar em qualquer linha
 * (o `payload_bruto` do lançamento NÃO carrega `nomeGuerra` — foi conferido).
 * Nunca o identificador, nunca o RE: chave não se embeleza.
 */

/** Siglas que ficam em caixa alta inteira. */
const SIGLAS = new Set([
  // Corporação e sistemas
  "PM", "BPM", "BPMM", "CPA", "CPAM", "OPM", "AISP", "COP", "DEJEM",
  "ADM", "MDIP", "LCDIP", "RE", "GCM", "ROTA", "TOR", "GAECO", "MP", "IPM", "SPJMD",
  // Funções da escala, conferidas contra os valores reais do banco em
  // 08/09/2026: CGP A, CGP B, CFP noturno, Cmt equipe FT, EM.
  "CGP", "CFP", "FT", "EM",
  // Romanos de pelotão/companhia
  "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII",
]);

/* NÃO entram aqui, e cada ausência tem motivo:
   - SGT, CAP, MAJ, TEN, SUBTEN, SD, CB → a I-7-PM escreve o posto em caixa
     mista ("2º Sgt PM", "Cap PM", "Sd PM 2ª Cl"), não em versal. Deixá-los
     como sigla devolveria "2º SGT PM" em documento assinado.
   - CIA e CL → são palavras no uso corrente do Batalhão ("Cmt cia",
     "2ª Cl"); tratá-las como sigla produzia "Cmt CIA". */

/** Partículas em minúscula quando NÃO abrem o texto. */
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "del", "van", "von"]);

/**
 * Separa o ordinal grudado na palavra seguinte.
 *
 * Os valores reais do banco trazem `3⁰Sgt PM` e `3°SGT PM` — o teclado do
 * celular emenda o indicador na graduação. Sem descolar, o token vira `3⁰Sgt`,
 * não casa com a regra de ordinal e sai capitalizado como `3⁰sgt`. Cobre os
 * três marcadores que aparecem na prática: º (ordinal), ° (grau) e ⁰
 * (sobrescrito zero), que são caracteres diferentes e indistinguíveis na tela.
 */
function descolarOrdinal(t: string): string {
  /* O GÊNERO DO ORDINAL É PRESERVADO: `2ª CL` é "segunda classe" e virar
     `2º Cl` erra o posto na tela. Só `o`, `°` e `⁰` viram `º`; `a` e `ª`
     continuam femininos. */
  return t.replace(/(\d)\s*([º°⁰ªoa])\s*(?=\p{L})/giu, (_m, d, marca) =>
    /[aª]/i.test(marca) ? `${d}ª ` : `${d}º `
  );
}

/** Uma palavra já em caixa mista intencional (McDonald, DiCaprio) não é
 *  reescrita: quem digitou assim quis assim. Só entra no corretor o que está
 *  TODO em maiúscula ou TODO em minúscula. */
function jaTemCaixaIntencional(p: string): boolean {
  const semPontuacao = p.replace(/[^\p{L}]/gu, "");
  if (semPontuacao.length < 2) return false;
  const temMaiuscula = /\p{Lu}/u.test(semPontuacao.slice(1));
  const temMinuscula = /\p{Ll}/u.test(semPontuacao);
  return temMaiuscula && temMinuscula;
}

function capitalizar(p: string): string {
  return p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR");
}

function palavra(p: string, primeira: boolean): string {
  if (!p) return p;

  const nu = p.replace(/[^\p{L}\p{N}]/gu, "");

  /* Ordinal de graduação. `3o` e `3a` digitados no teclado do celular viram
     `3º` e `3ª` — o indicador ordinal correto. Sem isto o posto sai como
     "3o Sgt PM" em documento que o Comando assina. */
  if (/^\d+[ºª°oa]?$/i.test(nu)) {
    return p.replace(/(\d)\s*[ºª°oa]?$/i, (_m, d) =>
      /a$/i.test(p) || /ª/.test(p) ? `${d}ª` : `${d}º`
    );
  }

  if (SIGLAS.has(nu.toLocaleUpperCase("pt-BR"))) {
    return p.replace(/\p{L}+/gu, (m) => m.toLocaleUpperCase("pt-BR"));
  }

  // Inicial solta: "J." continua "J."
  if (nu.length === 1) return p.toLocaleUpperCase("pt-BR");

  if (jaTemCaixaIntencional(p)) return p;

  if (!primeira && PARTICULAS.has(nu.toLocaleLowerCase("pt-BR"))) {
    return p.toLocaleLowerCase("pt-BR");
  }

  // Composto com hífen: cada metade recebe o mesmo tratamento (Jean-Pierre).
  if (p.includes("-")) {
    return p
      .split("-")
      .map((parte, i) => palavra(parte, primeira && i === 0))
      .join("-");
  }

  return capitalizar(p);
}

/**
 * Nome próprio em caixa uniforme.
 *
 * Idempotente: aplicar duas vezes dá o mesmo resultado — condição para poder
 * rodar na leitura E na migração sem medo de deformar o dado a cada passada.
 */
export function nomeProprio(bruto: string): string {
  const limpo = descolarOrdinal(String(bruto ?? ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo) return "";
  return limpo
    .split(" ")
    .map((p, i) => palavra(p, i === 0))
    .join(" ");
}

/**
 * Posto e graduação. Mesma régua do nome, com a sigla PM preservada:
 * `SOLDADO PM` → `Soldado PM`, `3o sgt pm` → `3º Sgt PM`.
 */
export function postoNormalizado(bruto: string): string {
  return nomeProprio(bruto);
}

/**
 * Função declarada. Frase curta, e não nome: só a primeira palavra sobe.
 * `PATRULHEIRO` → `Patrulheiro`; `COMANDANTE DE VIATURA` → `Comandante de
 * viatura` — em documento oficial, função é substantivo comum.
 */
export function funcaoNormalizada(bruto: string): string {
  const limpo = descolarOrdinal(String(bruto ?? ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo) return "";
  if (jaTemCaixaIntencional(limpo)) return limpo;
  return limpo
    .split(" ")
    .map((p, i) => {
      const nu = p.replace(/[^\p{L}\p{N}]/gu, "");
      if (SIGLAS.has(nu.toLocaleUpperCase("pt-BR"))) {
        return p.replace(/\p{L}+/gu, (m) => m.toLocaleUpperCase("pt-BR"));
      }
      /* Letra solta é designação de grupo, não palavra: "CGP A" e "CGP B" são
         equipes distintas e minusculá-las apaga a distinção na tabela. */
      if (nu.length === 1) return p.toLocaleUpperCase("pt-BR");
      return i === 0 ? capitalizar(p) : p.toLocaleLowerCase("pt-BR");
    })
    .join(" ");
}
