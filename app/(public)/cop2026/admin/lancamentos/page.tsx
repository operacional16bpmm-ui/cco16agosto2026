import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";
import { identificadoresCompartilhados, listarParaManejo } from "@/lib/db/cop2026-lancamentos";
import { cadeiaDasFracoes } from "@/lib/db/cop2026-unidade";
import { ORDEM_SUBUNIDADES } from "@/lib/cop2026";
import { CabecalhoAdmin } from "../cabecalho-admin";
import { PainelLancamentos, type LinhaLancamento } from "./painel-lancamentos";

export const metadata: Metadata = {
  title: "Planilha de Lançamentos · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Planilha de Lançamentos — a tela onde o Comando confere, registro a registro,
 * o que a tropa declarou.
 *
 * **O ACESSO MUDOU DUAS VEZES EM 08/09/2026.** Ela exigia `exigirAdminCop()`
 * (404 para todos menos o administrador), passou a exigir sessão Google e
 * terminou o dia ABERTA, junto com o Dashboard e o Briefing, por determinação
 * do Comando trazida pelo Fabricio: *"RE não é dado sigiloso; esses dados são
 * públicos e estão na internet em sites de publicações do governo"*.
 *
 * Ela mora sob `/admin` por herança do tempo em que era tela de manejo, e é a
 * ÚNICA exceção da lista `ABERTAS_SOB_ADMIN_COP` — o endereço já circulou e
 * mudá-lo quebraria link salvo do Comando.
 *
 * O que NÃO se afrouxou junto: **as ações seguem sendo de administrador**.
 * Excluir e reclassificar chamam `exigirAdminCop()` na primeira linha da
 * própria Server Action — esconder o botão nunca foi controle de acesso, e por
 * isso o `ehAdmin` daqui só decide o que aparece.
 */
export default async function AdminLancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ fracao?: string }>;
}) {
  /* `?fracao=1cia` — o atalho que cada Cia usa para "apresentar a planilha
     dela", pedido do Fabrício em 08/09/2026 ("primeira Cia planilha, segunda
     Cia planilha, terceira Cia planilha, só para ele apresentar a planilha").
     O link nasce no quadro Onde Agir do painel; aqui ele só semeia o filtro
     que a tela já tinha. Valor fora da lista é ignorado — query suja abre a
     planilha inteira, nunca uma tela vazia sem explicação. */
  const { fracao } = await searchParams;
  const fracaoInicial =
    fracao && (ORDEM_SUBUNIDADES as readonly string[]).includes(fracao) ? fracao : "todas";

  const sessao = await identidadeCop();
  const ehAdmin = ehAdminCop(sessao?.email);

  const [{ itens, erro }, compartilhados] = await Promise.all([
    listarParaManejo(),
    identificadoresCompartilhados(),
  ]);

  // Comando › Batalhão › Fração de cada lançamento, em três consultas para a
  // lista inteira — a fração declarada é o que o superior confere primeiro.
  const cadeias = await cadeiaDasFracoes(
    itens.map((l) => l.unidade_cod ?? "").filter(Boolean)
  );

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin
        secao="Planilha de Lançamentos"
        email={sessao?.email ?? ""}
        largura="max-w-[1800px]"
      />

      <main>
        <PainelLancamentos
        fracaoInicial={fracaoInicial}
          itens={itens as unknown as LinhaLancamento[]}
          erro={erro}
          compartilhados={compartilhados}
          cadeias={cadeias}
          ehAdmin={ehAdmin}
        />
      </main>

      <RodapeCop
        nota="Toda exclusão e reclassificação fica registrada na trilha, com valor anterior e posterior."
        largura="max-w-[1800px]"
      />
    </div>
  );
}
