import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Cartao } from "@/components/publico16/cop/primitivos";
import { ROTULO_ABRANGENCIA, ROTULO_EFEITO } from "@/lib/cop2026-inconsistencia";
import type { Relato, ResumoPorFracao } from "@/lib/db/cop2026-inconsistencia";

/**
 * INCONSISTÊNCIAS DAS FRAÇÕES — o quadro no painel.
 *
 * Existe porque um número de auditoria sem este contexto mente. Uma Cia que
 * ficou 40 horas sem sistema e uma que não auditou por desleixo aparecem
 * iguais no cumprimento da meta, e só uma delas tem o que explicar. Deixar o
 * relato de indisponibilidade fora do painel é o mesmo que não tê-lo colhido.
 *
 * Vazio NÃO é caixa vazia: é uma afirmação. "Nenhuma fração relatou
 * indisponibilidade neste período" é informação de comando — e é bem diferente
 * de "não houve indisponibilidade", que este quadro não tem como saber. A
 * distinção está escrita na tela de propósito.
 */

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const horas = (h: number) =>
  h < 1 ? "menos de 1h" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(h)}h`;

export function QuadroInconsistencias({
  relatos,
  resumo,
  rotuloPeriodo,
}: {
  relatos: Relato[];
  resumo: ResumoPorFracao[];
  rotuloPeriodo: string;
}) {
  const abertos = relatos.filter((r) => r.situacao === "aberto" || r.situacao === "em_analise");

  return (
    <Cartao
      titulo="Inconsistências do sistema · frações"
      nota={`indisponibilidade da COP relatada pelas frações em ${rotuloPeriodo}`}
      comoLer={
        <>
          Mostra <strong>quanto tempo cada companhia ficou sem a COP</strong>, segundo o que a
          própria fração relatou. Serve para ler o resto do painel com justiça: quem ficou sem
          sistema e <strong>avisou</strong> tem o atraso explicado; quem ficou sem sistema e não
          avisou, não tem.
        </>
      }
      ajuda={
        <ul className="list-disc space-y-1 pl-4">
          <li>
            As horas somam todos os relatos da fração no período. Relato que ninguém encerrou
            continua contando até agora — zerá-lo premiaria o esquecimento.
          </li>
          <li>
            Este quadro <strong>não detecta queda sozinho</strong>. Ele é o livro de avisos: só
            aparece aqui o que alguém registrou. Quadro vazio significa &quot;ninguém
            relatou&quot;, e não &quot;não houve problema&quot;.
          </li>
          <li>
            &quot;Avisou em&quot; é a distância entre a hora declarada do início e a hora em que o
            registro
            chegou ao portal. É a tempestividade do aviso — o número que responde se a fração
            comunicou na hora ou depois que o problema já tinha custado alguma coisa.
          </li>
        </ul>
      }
    >
      {relatos.length === 0 ? (
        <p className="flex items-start gap-2.5 rounded-lg border-2 border-dashed border-borda px-4 py-5 text-[13.5px] leading-relaxed text-texto-suave">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-sinal-conforme" aria-hidden />
          <span>
            <strong className="text-branco">Nenhuma fração relatou indisponibilidade</strong> em{" "}
            {rotuloPeriodo}. Isso quer dizer que ninguém registrou problema — não que não tenha
            havido. Se a COP caiu e não está aqui, o aviso não foi dado.
          </span>
        </p>
      ) : (
        <>
          {abertos.length > 0 && (
            <p className="mb-4 flex items-center gap-2 rounded-lg border-2 border-[#ca0202]/40 bg-[#fdf0f0] px-3 py-2 text-[13px] font-bold text-[#ca0202]">
              <AlertTriangle size={16} aria-hidden />
              {abertos.length} relato{abertos.length === 1 ? "" : "s"} ainda em aberto
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-[10.5px] font-black uppercase tracking-wider text-texto-suave">
                  <th className="py-2 pr-3">Fração</th>
                  <th className="py-2 pr-3 text-right">Relatos</th>
                  <th className="py-2 pr-3 text-right">Em aberto</th>
                  <th className="py-2 pr-3 text-right">Tempo sem sistema</th>
                  <th className="py-2">Último início</th>
                </tr>
              </thead>
              <tbody>
                {resumo.map((r) => (
                  <tr key={r.subunidade} className="border-b border-borda/60">
                    <td className="py-2 pr-3 font-bold text-branco">{r.subunidadeRotulo}</td>
                    <td className="dados py-2 pr-3 text-right tabular-nums">{r.relatos}</td>
                    <td className="dados py-2 pr-3 text-right tabular-nums">
                      {r.abertos > 0 ? (
                        <span className="font-black text-[#ca0202]">{r.abertos}</span>
                      ) : (
                        <span className="text-texto-suave">—</span>
                      )}
                    </td>
                    <td className="dados py-2 pr-3 text-right font-bold tabular-nums text-branco">
                      {horas(r.horasFora)}
                    </td>
                    <td className="dados py-2 text-texto-suave">
                      {r.ultimoInicio ? FMT_DATA.format(new Date(r.ultimoInicio)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-4 space-y-2 border-t border-borda/60 pt-3">
            {relatos.slice(0, 6).map((r) => (
              <li key={r.id} className="text-[13px] leading-relaxed text-texto-suave">
                <span className="font-bold text-branco">{r.subunidadeRotulo}</span> ·{" "}
                {ROTULO_ABRANGENCIA[r.abrangencia].toLowerCase()} ·{" "}
                {r.efeitos.map((e) => ROTULO_EFEITO[e].split(" (")[0]).join(" e ")} · desde{" "}
                {FMT_DATA.format(new Date(r.inicioEm))}
                {r.fimEm ? ` até ${FMT_DATA.format(new Date(r.fimEm))}` : " · ainda em curso"}
                <span className="text-texto-suave/70"> — avisou em {horas(r.horasAteAvisar)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Cartao>
  );
}
