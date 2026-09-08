"use server";

import { revalidatePath } from "next/cache";

import { ORDEM_SUBUNIDADES, ROTULO_SUBUNIDADE } from "@/lib/cop2026";
import {
  ROTULO_ABRANGENCIA,
  ROTULO_EFEITO,
  bloqueia,
  conferirRelato,
  lerIdentificadores,
  type Abrangencia,
  type Efeito,
  type EntradaRelato,
} from "@/lib/cop2026-inconsistencia";
import { registrarRelato } from "@/lib/db/cop2026-inconsistencia";
import { avisar, telegramConfigurado, textoDoRelato } from "@/lib/cop2026-telegram";
import { ESTADO_INICIAL, type RelatoState } from "./estado";

/**
 * Envio do relato de problema do sistema.
 *
 * SERVER ACTION É ENDPOINT PÚBLICO: quem souber o identificador da ação chama
 * por `curl` sem nunca ver a tela. Toda conferência feita no componente é
 * decoração e é refeita aqui, contra o mesmo módulo puro
 * (`lib/cop2026-inconsistencia.ts`). Mesma regra do lançamento.
 *
 * A ORDEM DAS ETAPAS IMPORTA, e é deliberada:
 *
 *   1. grava   → o registro é o produto; ele não pode depender de mais nada
 *   2. avisa   → reforço. Se falhar, o relato continua valendo
 *   3. responde com o resultado das DUAS, sem esconder a segunda
 *
 * Inverter 1 e 2 — avisar antes de gravar — produziria o pior estado possível:
 * o grupo recebe a mensagem, o Batalhão se movimenta, e não existe registro
 * nenhum quando alguém for procurar a prova.
 */

const EFEITOS_VALIDOS = new Set<Efeito>(["carregamento", "download", "acesso", "outro"]);

function falha(...erros: string[]): RelatoState {
  return { ...ESTADO_INICIAL, erros };
}

/** Data civil de São Paulo — o servidor roda em UTC e viraria o dia 3h antes. */
function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Monta o instante em UTC a partir da data e hora civis declaradas.
 *
 * O fuso é fixado em −03:00 e não deduzido do servidor: o relator digita a
 * hora do relógio dele, em São Paulo, e o Node da Vercel roda em UTC. Sem esta
 * conversão explícita um problema declarado às 22h de domingo era gravado como
 * segunda-feira — e a data do fato é justamente o que este registro prova.
 */
function instante(dataIso: string, hora: string): string {
  return new Date(`${dataIso}T${hora}:00-03:00`).toISOString();
}

export async function enviarRelatoAction(
  _prev: RelatoState,
  formData: FormData
): Promise<RelatoState> {
  const texto = (c: string) => String(formData.get(c) ?? "").trim();

  const entrada: EntradaRelato = {
    subunidade: texto("subunidade"),
    dataInicio: texto("dataInicio"),
    horaInicio: texto("horaInicio"),
    dataFim: texto("dataFim") || undefined,
    horaFim: texto("horaFim") || undefined,
    emCurso: texto("emCurso") === "sim",
    abrangencia: (texto("abrangencia") || "total") as Abrangencia,
    efeitos: formData
      .getAll("efeitos")
      .map((v) => String(v) as Efeito)
      .filter((v) => EFEITOS_VALIDOS.has(v)),
    identificadores: texto("identificadores"),
    descricao: texto("descricao"),
    re: texto("re"),
    nome: texto("nome"),
  };

  /* Fração conferida contra a lista fechada do painel. O `curl` pode escolher a
     Cia errada — risco aceito, é o preço da declaração, e o mesmo que o
     lançamento assume desde 08/09/2026 — mas não inventa fração que não
     existe, o que faria o relato sumir de todo agrupamento. */
  if (!(ORDEM_SUBUNIDADES as readonly string[]).includes(entrada.subunidade)) {
    return falha("Fração inválida. Escolha uma das opções da lista.");
  }
  if (!["total", "parcial"].includes(entrada.abrangencia)) {
    return falha("Alcance inválido. Marque totalmente ou parcialmente inoperante.");
  }

  const problemas = conferirRelato(entrada, hojeSP());
  if (bloqueia(problemas)) {
    return falha(...problemas.filter((x) => x.bloqueia).map((x) => x.texto));
  }
  const avisos = problemas.filter((x) => !x.bloqueia).map((x) => x.texto);

  const lidos = lerIdentificadores(entrada.identificadores);

  const gravado = await registrarRelato({
    subunidade: entrada.subunidade,
    inicioEm: instante(entrada.dataInicio, entrada.horaInicio),
    fimEm:
      !entrada.emCurso && entrada.dataFim && entrada.horaFim
        ? instante(entrada.dataFim, entrada.horaFim)
        : null,
    abrangencia: entrada.abrangencia,
    efeitos: entrada.efeitos,
    identificadores: entrada.identificadores || null,
    identificadoresLidos: lidos,
    descricao: entrada.descricao || null,
    re: entrada.re,
    nome: entrada.nome,
    pendencias: problemas.filter((x) => !x.bloqueia),
    idSubmissao: texto("idSubmissao") || null,
  });

  if (!gravado.ok) return falha(gravado.erro);

  const r = gravado.relato;

  /* Reenvio da mesma submissão não dispara segundo aviso: o grupo receberia a
     mesma queda duas vezes e a terceira já seria ignorada por todo mundo. */
  let avisoEnviado: boolean | null = null;
  if (!gravado.repetido) {
    if (!telegramConfigurado()) {
      avisoEnviado = null;
    } else {
      const res = await avisar(
        textoDoRelato({
          subunidadeRotulo: ROTULO_SUBUNIDADE[r.subunidade] ?? r.subunidade,
          inicioEm: r.inicioEm,
          fimEm: r.fimEm,
          abrangenciaRotulo: ROTULO_ABRANGENCIA[r.abrangencia],
          efeitosRotulo: r.efeitos.map((e) => ROTULO_EFEITO[e]).join(", "),
          re: r.re,
          nome: r.nome,
          descricao: r.descricao,
          horasAteAvisar: r.horasAteAvisar,
          url: "https://portal-cco16.vercel.app/cop2026/admin/inconsistencias",
        })
      );
      avisoEnviado = res.configurado ? res.enviado : null;
      if (res.configurado && !res.enviado) {
        /* Vai para o log do servidor com o motivo do Telegram — sem ele, quem
           for depurar tem só "não chegou". */
        console.error("[cop2026] aviso de indisponibilidade não saiu:", res.motivo);
      }
    }
  }

  /* O painel e o admin leem esta lista; sem revalidar, o relato recém-gravado
     não aparece para quem abrir a tela em seguida. */
  revalidatePath("/cop2026/dashboard");
  revalidatePath("/cop2026/admin/inconsistencias");

  return {
    ok: true,
    /* Protocolo curto: é o que a pessoa anota no papel ou dita no rádio. O id
       inteiro tem 36 caracteres e ninguém repete isso em pé, na rua. */
    protocolo: r.id.slice(0, 8).toUpperCase(),
    erros: [],
    avisos,
    duplicado: gravado.repetido,
    avisoEnviado,
  };
}
