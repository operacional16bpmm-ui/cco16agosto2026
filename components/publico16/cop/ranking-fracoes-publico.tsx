import { nivelPorCumprimento, type LinhaFracao, type Nivel } from "@/lib/cop2026-metricas";

/**
 * Espelho público do progresso por fração, no hero de /cop2026.
 *
 * Existe para a tropa ver a própria posição no momento em que vai lançar — a
 * página é o destino do QR Code, e é ali que a comparação entre frações produz
 * efeito. Ordenado por cumprimento, e não pela ordem das companhias: o objetivo
 * declarado pelo Comando é senso de urgência e competição.
 *
 * A faixa de cor NÃO é reclassificada aqui: vem de `nivelPorCumprimento`, fonte
 * única, como manda docs/cop2026-padroes-comando.md §2.
 */

const COR_NIVEL: Record<Nivel, string> = {
  critico: "#ca0202",
  atencao: "#d97706",
  conforme: "#16a34a",
  superacao: "#2563eb",
  neutro: "#64748b",
};

const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const NUM = new Intl.NumberFormat("pt-BR");

export function RankingFracoesPublico({ fracoes }: { fracoes: LinhaFracao[] }) {
  const ordenadas = [...fracoes].sort((a, b) => b.pct - a.pct);
  if (ordenadas.length === 0) return null;

  const lider = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];
  const totalFeito = fracoes.reduce((s, f) => s + f.feito, 0);
  const totalMeta = fracoes.reduce((s, f) => s + f.meta, 0);
  const pctBtl = totalMeta > 0 ? (totalFeito / totalMeta) * 100 : 0;
  const nivelBtl = nivelPorCumprimento(pctBtl, totalMeta > 0);

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border-2 border-white/20 bg-white shadow-[0_18px_44px_rgba(0,0,0,0.32)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 bg-slate-50 px-5 py-3.5">
        <div className="flex flex-col">
          <span className="font-cinzel text-[14px] font-black uppercase tracking-[0.13em] text-slate-900 sm:text-[15px]">
            Companhias e Força Tática
          </span>
          <span className="text-[11.5px] font-semibold text-slate-500">
            Posição de cada fração na meta do mês · atualiza a cada minuto
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-mono text-2xl font-black leading-none tabular-nums"
            style={{ color: COR_NIVEL[nivelBtl] }}
          >
            {PCT.format(pctBtl)}%
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Batalhão
          </span>
        </div>
      </header>

      <ol className="divide-y divide-slate-200">
        {ordenadas.map((f, i) => {
          const nivel = nivelPorCumprimento(f.pct, f.meta > 0);
          const cor = COR_NIVEL[nivel];
          const largura = Math.max(1.5, Math.min(100, f.pct));
          const ehLider = i === 0;
          const ehUltima = i === ordenadas.length - 1 && ordenadas.length > 1;

          return (
            <li
              key={f.chave}
              className={`flex items-center gap-3 px-4 py-2.5 sm:px-5 ${
                ehUltima ? "bg-[#fdf0f0]" : ehLider ? "bg-[#eef3fe]" : "bg-white"
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-black text-white tabular-nums"
                style={{ background: cor }}
              >
                {i + 1}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13.5px] font-black uppercase tracking-wide text-slate-900">
                    {f.rotulo}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-1.5">
                    <span
                      className="font-mono text-[15px] font-black tabular-nums"
                      style={{ color: cor }}
                    >
                      {PCT.format(f.pct)}%
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums">
                      {NUM.format(f.feito)}/{NUM.format(f.meta)}
                    </span>
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${largura}%`, background: cor }}
                  />
                </div>
              </div>

              <span className="hidden w-[104px] shrink-0 text-right text-[11px] font-bold sm:block">
                {f.falta > 0 ? (
                  <span className="text-slate-500">
                    faltam{" "}
                    <span className="font-mono font-black text-slate-800 tabular-nums">
                      {NUM.format(f.falta)}
                    </span>
                  </span>
                ) : (
                  <span className="font-black uppercase tracking-wider" style={{ color: cor }}>
                    meta batida
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-slate-200 bg-slate-50 px-5 py-3 text-[12px] font-semibold text-slate-600">
        <span>
          <strong className="font-black text-slate-900">{lider.rotulo}</strong> lidera com{" "}
          <span className="font-mono font-black" style={{ color: COR_NIVEL[nivelPorCumprimento(lider.pct, true)] }}>
            {PCT.format(lider.pct)}%
          </span>
        </span>
        {ordenadas.length > 1 && ultima.falta > 0 && (
          <span>
            <strong className="font-black text-[#ca0202]">{ultima.rotulo}</strong> precisa de{" "}
            <span className="font-mono font-black text-[#ca0202]">{NUM.format(ultima.falta)}</span>{" "}
            evidências para alcançar a meta
          </span>
        )}
      </footer>
    </section>
  );
}
