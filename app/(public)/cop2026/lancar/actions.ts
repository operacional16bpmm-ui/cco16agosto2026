"use server";

import { revalidatePath } from "next/cache";

import { lerEvidencias, validarLancamento, type EntradaLancamento } from "@/lib/cop2026-lancamento";
import { MOTIVOS_ABAIXO_DO_MINIMO } from "@/lib/cop2026";
import { MINIMO_PADRAO } from "@/lib/cop2026-metricas";
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

  const auditou = texto("auditou") === "sim";
  const quantidadeTexto = texto("quantidadeDeclarada");
  const quantidadeDeclarada = Number.parseInt(quantidadeTexto || "0", 10);
  const camposId = formData.getAll("identificador").map((v) => String(v));
  const detalhe = texto("justificativa");
  const motivo = texto("motivoAbaixoMinimo");

  /* Motivo é OBRIGATÓRIO quando o auditor não auditou OU auditou abaixo do
     mínimo, e precisa vir da lista fechada — refeito no servidor porque o UI
     bloqueia, mas server action é endpoint público (C-4). Envie um motivo fora
     da lista pelo curl e ele cai aqui. */
  /* Conta EVIDÊNCIA VÁLIDA, não campo preenchido: `lerEvidencias` é a mesma
     função que o formulário usa para decidir se exige o motivo. Contar campo
     bruto fazia o servidor achar "3" onde o cliente via "2" (um CPF colado
     entre dois IDs bons), concluir que não precisava de motivo e gravar a
     justificativa SEM o motivo que o auditor foi obrigado a escolher — com o
     comprovante na tela ainda exibindo o motivo como se tivesse sido salvo. */
  const evidenciasValidas = lerEvidencias(camposId).evidencias.length;
  const quantidadeEfetiva = quantidadeTexto ? quantidadeDeclarada : evidenciasValidas;
  const abaixoDoMinimo = auditou && quantidadeEfetiva < MINIMO_PADRAO;
  const precisaDeMotivo = !auditou || abaixoDoMinimo;
  const motivoValido = MOTIVOS_ABAIXO_DO_MINIMO.includes(
    motivo as (typeof MOTIVOS_ABAIXO_DO_MINIMO)[number]
  );
  if (precisaDeMotivo && !motivoValido) {
    return falha(
      auditou
        ? `Escolha um dos motivos padronizados para lançamento abaixo do mínimo de ${MINIMO_PADRAO}.`
        : "Escolha um dos motivos padronizados para não ter auditado neste turno."
    );
  }

  /* O motivo viaja na `justificativa` como prefixo `MOTIVO — detalhe`. Assim o
     campo do banco continua o mesmo (nenhuma migração, nenhum recorte
     histórico) e o painel agrupa pelo prefixo antes do travessão. */
  const justificativaFinal = precisaDeMotivo
    ? detalhe
      ? `${motivo} — ${detalhe}`
      : motivo
    : detalhe;

  const entrada: EntradaLancamento = {
    dataAuditoria: texto("dataAuditoria"),
    turno: texto("turno"),
    re: texto("re"),
    nomeGuerra: texto("nomeGuerra"),
    posto: texto("posto"),
    funcao: texto("funcao"),
    auditou,
    quantidadeDeclarada,
    // Todos os campos de identificador chegam sob o mesmo nome. Um campo pode
    // trazer vários identificadores colados de uma vez — quem separa é
    // `lerEvidencias`, no módulo puro.
    camposId,
    numeroParte: texto("numeroParte"),
    justificativa: justificativaFinal,
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
