"use server";

import { revalidatePath } from "next/cache";

import {
  lerEvidencias,
  subunidadeValida,
  validarLancamento,
  type EntradaLancamento,
  type SubunidadeValida,
} from "@/lib/cop2026-lancamento";
import { MOTIVOS_ABAIXO_DO_MINIMO } from "@/lib/cop2026";
import { MINIMO_PADRAO } from "@/lib/cop2026-metricas";
import { ESTADO_INICIAL, type LancamentoState } from "./estado";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";
import { identificarPorRe, resolverVinculo } from "@/lib/db/cop2026-auditor";
import { gravarLancamento } from "@/lib/db/cop2026-lancamentos";
import { fracaoDaSubunidade, resolverUnidadeDeclarada } from "@/lib/db/cop2026-unidade";

/**
 * Envio do lançamento da Auditoria de COP.
 *
 * SERVER ACTION É ENDPOINT PÚBLICO (C-4). Quem souber o identificador da ação
 * chama por `curl` e nunca vê a tela: toda validação feita no componente é
 * decoração e é refeita aqui, contra o mesmo módulo puro
 * (`lib/cop2026-lancamento.ts`) — e depois ainda contra as constraints do
 * Postgres, que é a única camada que não se contorna.
 *
 * O vínculo conta↔RE continua não sendo aceito do cliente: é resolvido contra
 * `cop2026_auditor` (C-3).
 *
 * A UNIDADE, ESSA, PASSOU A VIR DO FORMULÁRIO — determinação do Fabricio em
 * 08/09/2026, que reverte a regra C-4. Até aqui a fração era DERIVADA do RE
 * contra `p4_efetivo`, congelada em 19/07: quem foi transferido depois lançava
 * e caía na Cia antiga, sem ver e sem poder corrigir. **Vale o que o policial
 * declara**, e o que a relação diz não desempata nada.
 *
 * O que sobra da C-4, e continua valendo: a fração declarada é conferida contra
 * a árvore de unidades (existe? está ativa? pende do batalhão, que pende do
 * comando?). O `curl` pode escolher a Cia errada — risco aceito, é o preço da
 * declaração — mas não inventa unidade nem despeja lançamento num código que
 * não é fração de ninguém. E a fração da relação do efetivo continua sendo
 * gravada em `payload_bruto.subunidadeRoster`, como trilha: serve para o
 * Comando cruzar depois, NUNCA para reclassificar o lançamento.
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

  /* A unidade declarada. `subunidadeDeclarada` é o vocabulário do painel
     ('em', '1cia', 'ft') e é o que decide onde o lançamento conta; os três
     códigos são a árvore de OPM e servem para conferência e para o
     `unidade_cod`. Recusar aqui e não só na tela porque Server Action é
     endpoint público (C-4). */
  const subunidadeDeclarada = texto("subunidadeDeclarada");
  if (!subunidadeValida(subunidadeDeclarada) || subunidadeDeclarada === "outros") {
    return falha(
      "Escolha a sua fração no passo 1 — Estado-Maior, Força Tática ou a sua Cia."
    );
  }

  const validacao = validarLancamento(entrada);
  if (!validacao.ok) return { ...ESTADO_INICIAL, erros: validacao.erros };

  const v = validacao.valor;

  try {
    const identidade = await identidadeCop();
    /* A fração da relação do efetivo NÃO decide mais nada — vai para a trilha
       e só. Mantida a busca pelo RE (e não pela conta) porque o mesmo PM pode
       estar logado na conta de outro no celular da viatura. */
    const roster = await identificarPorRe(v.re.base);
    const vinculo = await resolverVinculo(identidade?.email ?? null, v.re.base, v.nomeGuerra);

    /* Confere a fração declarada contra a árvore. Quando ela não casa — banco
       fora do ar, ou a página caiu na lista de emergência, onde o "código" é a
       própria chave do painel — o lançamento entra do mesmo jeito, pela
       subunidade declarada, e só fica sem `unidade_cod`. Travar aqui seria
       inventar um motivo novo para a tropa não lançar. */
    const naArvore = await resolverUnidadeDeclarada(
      texto("fracaoCod"),
      texto("batalhaoCod"),
      texto("comandoCod")
    );
    const subunidade: SubunidadeValida =
      naArvore?.subunidade && subunidadeValida(naArvore.subunidade)
        ? naArvore.subunidade
        : subunidadeDeclarada;

    const resultado = await gravarLancamento(v, {
      subunidade,
      unidadeCod: naArvore?.cod ?? (await fracaoDaSubunidade(subunidade)),
      subunidadeRoster: roster.subunidade,
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
