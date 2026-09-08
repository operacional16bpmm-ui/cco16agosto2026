import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";
import { identificadoresCompartilhados, listarParaManejo } from "@/lib/db/cop2026-lancamentos";
import { cadeiaDasFracoes } from "@/lib/db/cop2026-unidade";
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
 * **O ACESSO MUDOU EM 08/09/2026.** Ela exigia `exigirAdminCop()` (404 para
 * todo mundo menos o administrador) e passou a exigir `exigirAcessoCop()`: a
 * mesma conta Google que abre o Dashboard e o Briefing. Determinação do
 * Fabricio — é dela que os superiores tiram a conferência detalhada, e o
 * administrador é um só.
 *
 * O que NÃO se afrouxou junto: a tela continua fora do alcance de quem não tem
 * sessão (carrega RE, nome de guerra e justificativa de policial), e **as ações
 * seguem sendo de administrador**. Excluir e reclassificar chamam
 * `exigirAdminCop()` na primeira linha da própria Server Action — esconder o
 * botão nunca foi controle de acesso, e por isso o `ehAdmin` daqui só decide o
 * que aparece.
 */
export default async function AdminLancamentosPage() {
  const sessao = await exigirAcessoCop("/cop2026/admin/lancamentos");
  const ehAdmin = ehAdminCop(sessao.email);

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
        email={sessao.email}
        largura="max-w-[1800px]"
      />

      <main>
        <PainelLancamentos
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
