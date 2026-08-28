import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export function FundamentacaoCop() {
  return (
    <section className="border-b border-borda bg-superficie py-12 sm:py-16" aria-label="Fundamentação e Diretriz">
      <div className="mx-auto max-w-6xl space-y-5 px-4">
        <div className="group relative overflow-hidden rounded-2xl border-2 border-[#ca0202]/55 bg-[#0b1222] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.2)] sm:p-6">
          <Image src="/media/foto-oficial.jpg" alt="" fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover opacity-20 transition-transform duration-700 group-hover:scale-105" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-br from-[#07182d]/95 via-[#0b1222]/90 to-[#ca0202]/25" />
          <div className="relative">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-300/40 bg-[#ca0202] text-white shadow-[0_5px_16px_rgba(202,2,2,0.35)]">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">Fundamentação institucional</p>
                <h3 className="font-serif text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
                  Por que Auditamos?
                </h3>
              </div>
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-200 backdrop-blur-md">
              Diretriz PM3-001/02/25 · Item 6.1.6
            </span>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-slate-200">
            <strong className="font-semibold text-white">Cinco finalidades institucionais</strong>{" "}
            orientam toda a auditoria das evidências digitais obtidas por COP. A{" "}
            <strong className="font-semibold text-white">Auditoria das Evidências Digitais</strong>{" "}
            é o exame sistemático, independente e documentado dos registros captados por Câmeras
            Operacionais Corporais, realizada por meio de credencial pessoal no SiGCED:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                num: "01",
                rotulo: "Conformidade",
                desc: "Verificar se os registros e procedimentos atendem aos critérios técnicos estabelecidos.",
              },
              {
                num: "02",
                rotulo: "Fiscalização e Orientação",
                desc: "Subsidiar a fiscalização de natureza pedagógica, disciplinar e procedimental.",
              },
              {
                num: "03",
                rotulo: "Boas Práticas",
                desc: "Identificar condutas, procedimentos e soluções que possam ser reconhecidos e difundidos.",
              },
              {
                num: "04",
                rotulo: "Melhoria Contínua",
                desc: "Transformar os achados da auditoria em aperfeiçoamento dos processos operacionais.",
              },
              {
                num: "05",
                rotulo: "Inteligência Gerencial",
                desc: "Extrair indicadores institucionais capazes de subsidiar decisões de gestão.",
              },
            ].map((item) => (
              <div
                key={item.num}
                className="flex min-h-[170px] flex-col justify-between rounded-xl border border-white/15 bg-white/[0.08] p-3.5 shadow-[0_8px_18px_rgba(0,0,0,0.14)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-red-300/50 hover:bg-white/[0.13]"
              >
                <div>
                  <span className="font-mono text-base font-black text-vermelho">{item.num}</span>
                  <h4 className="mt-1 mb-2 font-serif text-[11px] font-black uppercase tracking-[0.12em] text-white">
                    {item.rotulo}
                  </h4>
                </div>
                <p className="text-[11.5px] leading-relaxed text-slate-300">{item.desc}</p>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-borda pb-3">
            <h3 className="font-serif text-base font-bold tracking-wide text-[#1d1d1d] sm:text-lg">
              Critério de Classificação das Faixas de Desempenho
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
              Regra Sistêmica de Classificação
            </span>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-sinal-critico/40 bg-sinal-critico-suave p-3">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-sinal-critico">
                0 ≤ resultado &lt; 50%
              </span>
              <h4 className="font-serif text-[11px] font-black uppercase tracking-[0.12em] text-[#1d1d1d]">
                Faixa Crítica
              </h4>
              <p className="mt-1 text-[11px] font-bold text-sinal-critico">Abaixo da Meta</p>
            </div>
            <div className="rounded-xl border border-sinal-atencao/40 bg-sinal-atencao-suave p-3">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-sinal-atencao">
                50% ≤ resultado &lt; 80%
              </span>
              <h4 className="font-serif text-[11px] font-black uppercase tracking-[0.12em] text-[#1d1d1d]">
                Faixa de Atenção
              </h4>
              <p className="mt-1 text-[11px] font-bold text-sinal-atencao">Cumprimento Insuficiente</p>
            </div>
            <div className="rounded-xl border border-sinal-conforme/40 bg-sinal-conforme-suave p-3">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-sinal-conforme">
                80% ≤ resultado ≤ 100%
              </span>
              <h4 className="font-serif text-[11px] font-black uppercase tracking-[0.12em] text-[#1d1d1d]">
                Faixa de Conformidade
              </h4>
              <p className="mt-1 text-[11px] font-bold text-sinal-conforme">Meta Cumprida</p>
            </div>
            <div className="rounded-xl border border-sinal-superacao/40 bg-sinal-superacao-suave p-3">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-sinal-superacao">
                resultado &gt; 100%
              </span>
              <h4 className="font-serif text-[11px] font-black uppercase tracking-[0.12em] text-[#1d1d1d]">
                Faixa de Superação
              </h4>
              <p className="mt-1 text-[11px] font-bold text-sinal-superacao">Meta Superada</p>
            </div>
          </div>

          <p className="text-[11.5px] italic text-texto-suave">
            * 80% equivale ao atingimento do limiar institucional de conformidade; 100% equivale ao
            cumprimento integral da referência quantitativa; acima de 100% equivale à superação
            quantitativa.
          </p>
        </div>
      </div>
    </section>
  );
}
