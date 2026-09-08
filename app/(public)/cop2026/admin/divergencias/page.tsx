import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { FILTROS_VAZIOS, calcularPainel } from "@/lib/cop2026-metricas";
import { CabecalhoAdmin } from "../cabecalho-admin";
import { TabelaDivergencias } from "./tabela-divergencias";

export const metadata: Metadata = {
  title: "Divergências de identificador · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * DIVERGÊNCIAS DE IDENTIFICADOR — o único lugar do sistema onde o ID de mídia
 * é cobrado.
 *
 * Decisão de Comando de 07/09/2026, e é o ponto inteiro desta tela: o número
 * que vale para a meta é o que o auditor DECLAROU, qualquer que seja o que ele
 * tenha digitado no campo de identificador. Quem declarou 7 vídeos e não
 * informou ID nenhum entregou 7 evidências — e não aparece como desvio no
 * dashboard, no briefing, nos relatórios nem nas invariantes de saúde.
 *
 * O que se perde com isso é rastreabilidade, não produção. Por isso a apuração
 * continua existindo: ela vive aqui, numa tela de administração, para o Comando
 * cobrar correção de quem digitou errado — sem contaminar a tela de desempenho,
 * onde o mesmo dado virava reprovação de quem tinha feito o serviço.
 *
 * Sem recorte de mês de propósito: isto é fila de correção, não medição de
 * período. Agosto responde pela maior parte da fila (a migração do Google Forms
 * para o portal, em 01/09, é o que fez o número cair).
 */
export default async function AdminDivergenciasPage() {
  const admin = await exigirAdminCop();
  const { lancamentos, metas, lidoEm } = await lerAuditoriaCop2026();
  const p = calcularPainel(lancamentos, metas, FILTROS_VAZIOS);

  const total = p.semIdsLista.length + p.idInvalidoLista.length + p.duplicadoLista.length;

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Divergências" email={admin.email} />

      <main className="mx-auto max-w-[1100px] space-y-5 px-5 py-8">
        <section className="rounded-xl border border-borda bg-tatico-super p-5">
          <p className="text-[13px] leading-relaxed text-texto-suave">
            <strong className="text-branco">
              Nenhuma divergência desta tela reduz a produção de ninguém.
            </strong>{" "}
            A meta considera sempre a quantidade declarada pelo auditor. O que está listado aqui é
            o que impede <em>reconferir a gravação</em> depois — e por isso se cobra correção na
            origem, não desconto no número.
          </p>
          <p className="dados mt-3 text-[12.5px] text-texto-suave">
            {total === 0
              ? "Nenhuma divergência de identificador na base."
              : `${total} lançamento(s) com divergência de identificador em toda a base.`}
            {lidoEm ? ` · Leitura de ${lidoEm}` : ""}
          </p>
        </section>

        <TabelaDivergencias
          titulo="Sem identificador informado"
          explicacao="O auditor declarou a quantidade e deixou o campo de ID em branco. A evidência conta normalmente; o que não existe é o caminho para reabrir a gravação."
          vazio="Todos os lançamentos informaram algum identificador."
          itens={p.semIdsLista}
        />

        <TabelaDivergencias
          titulo="Identificador fora do formato da plataforma"
          explicacao="Foi informado algo que a plataforma não reconhece como ID de gravação — data com sequência colada (202608011985301), número da ocorrência, o próprio RE. Cobra-se correção do que foi digitado, não preenchimento."
          vazio="Nenhum identificador fora do formato."
          itens={p.idInvalidoLista}
        />

        <TabelaDivergencias
          titulo="Identificador já lançado por outro auditor"
          explicacao="A mesma gravação aparece em dois lançamentos. Os dois lados podem estar de boa-fé: a cobrança é sobre o identificador, para saber qual dos dois se refere a outra mídia."
          vazio="Nenhum identificador repetido entre auditores."
          itens={p.duplicadoLista}
          mostrarIds
        />
      </main>

      <RodapeCop
        nota="Fila de correção de identificadores. É o único lugar do portal onde o ID de mídia é apontado — por decisão de Comando, ele não reprova ninguém nas telas de desempenho."
        largura="max-w-[1100px]"
      />
    </div>
  );
}
