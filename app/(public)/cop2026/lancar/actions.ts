"use server";

import { revalidatePath } from "next/cache";

import { validarLancamento, type EntradaLancamento } from "@/lib/cop2026-lancamento";
import { ESTADO_INICIAL, type LancamentoState } from "./estado";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";
import { identificarPorRe, resolverVinculo } from "@/lib/db/cop2026-auditor";
import { gravarLancamento } from "@/lib/db/cop2026-lancamentos";

/**
 * Envio do lançamento da Auditoria de COP.
 *
 * SERVER ACTION É ENDPOINT PÚBLICO (C-4). Quem souber o identificador da ação
 * chama por `curl` e nunca vê a tela: toda validação feita no componente é
 * decoração e é refeita aqui, contra o mesmo módulo puro
 * (`lib/cop2026-lancamento.ts`) — e depois ainda contra as constraints do
 * Postgres, que é a única camada que não se contorna.
 *
 * Dois campos NÃO são aceitos do cliente por decisão de segurança:
 *
 * - `subunidade`, derivada do RE no servidor. Se viesse do formulário, daria
 *   para despejar evidência no balde de outra Cia e distorcer o ranking que o
 *   Comando usa para cobrar as frações.
 * - o vínculo conta↔RE, resolvido contra `cop2026_auditor` (C-3).
 */

function falha(...erros: string[]): LancamentoState {
  return { ...ESTADO_INICIAL, erros };
}

export async function enviarLancamentoAction(
  _prev: LancamentoState,
  formData: FormData
): Promise<LancamentoState> {
  const texto = (campo: string) => String(formData.get(campo) ?? "").trim();

  const entrada: EntradaLancamento = {
    dataAuditoria: texto("dataAuditoria"),
    turno: texto("turno"),
    re: texto("re"),
    nomeGuerra: texto("nomeGuerra"),
    posto: texto("posto"),
    funcao: texto("funcao"),
    auditou: texto("auditou") === "sim",
    quantidadeDeclarada: Number.parseInt(texto("quantidadeDeclarada") || "0", 10),
    // Todos os campos de identificador chegam sob o mesmo nome. Um campo pode
    // trazer vários identificadores colados de uma vez — quem separa é
    // `lerEvidencias`, no módulo puro.
    camposId: formData.getAll("identificador").map((v) => String(v)),
    numeroParte: texto("numeroParte"),
    justificativa: texto("justificativa"),
    idSubmissao: texto("idSubmissao"),
  };

  const validacao = validarLancamento(entrada);
  if (!validacao.ok) return { ...ESTADO_INICIAL, erros: validacao.erros };

  const v = validacao.valor;

  try {
    const identidade = await identidadeCop();
    // A ordem importa: a subunidade sai do RE declarado, não da conta — o
    // mesmo PM pode estar logado na conta de outro no celular da viatura.
    const { subunidade } = await identificarPorRe(v.re.base);
    const vinculo = await resolverVinculo(identidade?.email ?? null, v.re.base, v.nomeGuerra);

    const resultado = await gravarLancamento(v, {
      subunidade,
      vinculoPendente: vinculo.pendente,
      email: identidade?.email ?? null,
      sub: null,
    });

    if (!resultado.ok) return falha(resultado.erro);

    // O painel público lê do banco quando COP2026_FONTE está em `banco` ou
    // `uniao`; sem isto o auditor confere logo depois e não se vê na tela.
    revalidatePath("/cop2026");
    revalidatePath("/cop2026/dashboard");

    return {
      ok: true,
      protocolo: resultado.protocolo,
      erros: [],
      avisos: validacao.avisos,
      duplicado: resultado.duplicado,
    };
  } catch (erro) {
    console.error("[cop2026-lancar] falha no envio:", erro);
    return falha(
      "Não foi possível registrar agora. Tente de novo em instantes — o rascunho fica guardado neste aparelho."
    );
  }
}
