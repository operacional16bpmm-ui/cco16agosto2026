import type { Metadata } from "next";
import { DashboardCop } from "@/components/publico16/cop/dashboard-cop";
import { NavegacaoCop } from "@/components/publico16/cop/navegacao-cop";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { identificarSemana, lerFiltros } from "@/lib/cop2026-metricas";
import { mesCorrente } from "@/lib/cop2026-relatorios";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";

/**
 * O mês vem de `mesCorrente()`, não de constante: em 1º de outubro este mesmo
 * link tem que dizer "Outubro" sozinho. Título cravado é título que mente no
 * mês seguinte — e quem lê o print é o Comando.
 */
function tituloDoCiclo(): string {
  const mes = mesCorrente();
  return mes ? `Painel de ${mes.rotulo} · Auditoria de COP 2026` : "Auditoria de COP 2026";
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: tituloDoCiclo(), robots: { index: false, follow: false } };
}

// A leitura da planilha estoura os 60s do prerender e derrubava o deploy; e o
// recorte chega por query string. As duas razões pedem render por requisição.
export const dynamic = "force-dynamic";

// Teto explícito da função. O `lerCsv` já corta cada rota em 6s, mas sem
// maxDuration a rota herda o default da plataforma e uma pane do Google podia
// segurar a função até o limite dela — página que abre e nunca fecha.
export const maxDuration = 20;

/**
 * PAINEL ÚNICO da Auditoria de COP — o painel do ciclo, com a CAIXA TENDÊNCIA
 * dentro do velocímetro no lugar do cartão "Ritmo necessário" (que exibia a
 * constante 73) e o detalhamento por fração entre a barra-resumo e a camada
 * semanal.
 *
 * Nasceu como V3, em avaliação, ao lado de um V1 nesta mesma rota e de um V2 de
 * prévia. O Comando encerrou a avaliação em 01/09/2026: ficou só este, e ficou
 * na URL limpa. `/cop2026/dashboard/v3` e `/cop2026/dashboard/v2` continuam
 * respondendo como redirect permanente em `next.config.ts`, preservando a query
 * — link salvo do Comando (`?excecao=`, `?semana=`, `?briefing=1`) segue
 * abrindo aqui.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lancamentos, metas, erro, lidoEm }, sp, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    searchParams,
    exigirAcessoCop("/cop2026/dashboard"),
  ]);

  /* Auditores DISTINTOS por quinzena e por fração — o Red Team pediu
     participação mínima do efetivo a cada quinzena, e esse recorte só existe
     nos lançamentos brutos: `LinhaFracao` guarda o total do mês. Semanas 1–2
     formam a 1ª quinzena; 3–4, a 2ª. */
  /* Só o RECORTE. Este laço varria a planilha inteira e carregava agosto para
     dentro da coluna QUINZENA de setembro — o mesmo bug das semanas que o
     Comando apontou em 02/09/2026, na última superfície onde ele tinha
     sobrado. Sintoma: "2% · 4%" de participação na 2ª quinzena no dia 2 do
     mês, quando a 2ª quinzena só abre no dia 15. */
  const filtros = lerFiltros(sp);
  const doRecorte = lancamentos.filter(
    (l) => (!filtros.de || l.data >= filtros.de) && (!filtros.ate || l.data <= filtros.ate)
  );

  const distintos = new Map<string, [Set<string>, Set<string>]>();
  for (const l of doRecorte) {
    if (!l.auditou) continue;
    const identidade = (l.re || l.nomeGuerra || "").trim();
    if (!identidade) continue;
    const quinzena = identificarSemana(l.data) <= 2 ? 0 : 1;
    if (!distintos.has(l.subunidade)) distintos.set(l.subunidade, [new Set(), new Set()]);
    distintos.get(l.subunidade)![quinzena].add(identidade);
  }
  const auditoresPorQuinzena: Record<string, [number, number]> = {};
  for (const [chave, [q1, q2]] of distintos) auditoresPorQuinzena[chave] = [q1.size, q2.size];

  /* `?briefing=1` é o modo em que o Chromium headless de
     /api/cop2026/briefing-png abre esta página. Ele não é uma segunda versão do
     painel: é a MESMA árvore, com a moldura de navegação fora do caminho. É o
     que garante que o PNG nunca fique desatualizado em relação à tela — toda
     mudança aqui aparece no arquivo, sem manutenção paralela. */
  const modoBriefing = sp.briefing === "1";

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      {!modoBriefing && (
        <NavegacaoCop
          lidoEm={lidoEm}
          email={acesso?.email}
          ehAdmin={ehAdminCop(acesso?.email)}
          tituloPagina={
            mesCorrente() ? `Painel de ${mesCorrente()!.rotulo}` : "Painel do ciclo"
          }
        />
      )}

      <main className={modoBriefing ? undefined : "pt-4 sm:pt-6"}>
        <DashboardCop
          lancamentos={lancamentos}
          metas={metas}
          lidoEm={lidoEm}
          erro={erro}
          filtrosIniciais={filtros}
          tendencia
          auditoresPorQuinzena={auditoresPorQuinzena}
          modoBriefing={modoBriefing}
        />
      </main>

      {!modoBriefing && (
        <RodapeCop
          nota={
            mesCorrente()
              ? `Painel de ${mesCorrente()!.rotulo}/${mesCorrente()!.ano} — documento operacional, não distribuir fora do Batalhão.`
              : "Documento operacional, não distribuir fora do Batalhão."
          }
        />
      )}
    </div>
  );
}
