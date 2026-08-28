import Link from "next/link";
import {
  Crosshair,
  Tags,
  Fingerprint,
  Radar,
  Video,
  ShieldCheck,
  Send,
} from "lucide-react";

/**
 * Painel de 7 pilares da Diretriz PM3-001/02/25 ("Diretriz em Foco").
 * Fixado na entrada da COP 2026 e replicado como primeiro slide do briefing
 * executivo — decidido em 27ago26 (o Major queria a diretriz visível antes
 * dos KPIs, para servir de índice, não de nota de rodapé).
 * Cada tile ancora no visor do PDF da diretriz (`#diretriz-pdf`) quando a
 * página o inclui; nas demais telas, o link cai direto no PDF.
 */
const PILARES = [
  { n: 1, icon: Crosshair,  titulo: "Fatos de interesse policial", desc: "Eventos e registros relevantes" },
  { n: 2, icon: Tags,       titulo: "Etiquetas digitais",          desc: "Classificação das evidências" },
  { n: 3, icon: Fingerprint,titulo: "Cadeia de custódia",          desc: "Integridade, registro e rastreabilidade" },
  { n: 4, icon: Radar,      titulo: "Monitoramento & controle",    desc: "Aferição, conformidade e auditoria" },
  { n: 5, icon: Video,      titulo: "Modos & transmissão",         desc: "Funcionalidades da COP" },
  { n: 6, icon: ShieldCheck,titulo: "Obrigações do operador",      desc: "Acionamento, uso e encerramento" },
  { n: 7, icon: Send,       titulo: "Entrega imediata",            desc: "Repercussão e indícios de desvios de conduta" },
] as const;

export function DiretrizEmFoco({
  hrefBase = "#diretriz-pdf",
  variante = "home",
}: {
  hrefBase?: string;
  variante?: "home" | "briefing";
}) {
  const espac = variante === "briefing" ? "my-0" : "my-10";
  return (
    <section aria-labelledby="diretriz-em-foco-titulo" className={espac}>
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-branco/55">
          Diretriz PM3-001/02/25 · Ambiente Executivo de Governança, Controle e Auditabilidade das COPs
        </p>
        <h2
          id="diretriz-em-foco-titulo"
          className="mt-3 font-serif text-[1.75rem] font-black leading-[1.05] text-branco sm:text-[2.6rem]"
        >
          Registro Operacional ·<br className="hidden sm:block" />
          <span className="text-branco"> Governança da Auditoria de COP</span>
        </h2>
        <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-branco/60">
          Pontos de relevância normativa para fiscalização, cadeia de custódia,
          monitoramento e gestão executiva.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-vermelho/40 bg-vermelho/[0.08] px-4 py-1.5 text-[12px] font-black uppercase tracking-wider text-vermelho">
          <Crosshair size={14} strokeWidth={2.5} /> Diretriz em Foco
        </span>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PILARES.map((p) => {
            const Icone = p.icon;
            return (
              <li key={p.n}>
                <Link
                  href={hrefBase}
                  aria-label={`${p.n}. ${p.titulo} — abrir a Diretriz`}
                  className="group relative flex h-full items-start gap-4 overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-br from-[#0b0f1a] via-[#101725] to-[#050810] p-5 shadow-md transition-all hover:-translate-y-0.5 hover:border-vermelho/60 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermelho"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-vermelho font-mono text-base font-black text-white shadow-sm">
                    {p.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icone size={18} className="text-vermelho/85" strokeWidth={2.2} />
                      <h3 className="font-serif text-[13.5px] font-black uppercase tracking-wide text-vermelho">
                        {p.titulo}
                      </h3>
                    </div>
                    <p className="mt-1.5 text-[13.5px] leading-snug text-branco/80">
                      {p.desc}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
