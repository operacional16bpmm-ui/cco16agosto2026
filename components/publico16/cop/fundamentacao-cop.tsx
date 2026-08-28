export function FundamentacaoCop() {
  return (
    <section className="border-b border-black/10 bg-[#f8fafc] py-12 sm:py-16" aria-label="Fundamentação e Diretriz">
      <div className="mx-auto max-w-6xl space-y-5 px-4">
      <div className="rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h3 className="font-serif text-base font-black uppercase tracking-wider text-[#1d1d1d] sm:text-lg">
            Por que Auditamos?
          </h3>
          <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-[#1d1d1d]">
            Diretriz PM3-001/02/25 · Item 6.1.6
          </span>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-slate-700">
          <strong>Cinco finalidades institucionais</strong> orientam toda a auditoria das evidências digitais obtidas por COP. A <strong>Auditoria das Evidências Digitais</strong> é o exame sistemático, independente e documentado dos registros captados por Câmeras Operacionais Corporais, realizada por meio de credencial pessoal no SiGCED:
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
            <div key={item.num} className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white/70 p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div>
                <span className="font-mono text-base font-black text-vermelho">{item.num}</span>
                <h4 className="mb-1 mt-1 font-serif text-xs font-bold uppercase tracking-wide text-[#1d1d1d]">
                  {item.rotulo}
                </h4>
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h3 className="font-serif text-base font-black uppercase tracking-wider text-[#1d1d1d] sm:text-lg">
            Critério de Classificação das Faixas de Desempenho
          </h3>
          <span className="text-xs font-semibold text-slate-500">Regra Sistêmica de Classificação</span>
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-sinal-critico/40 bg-sinal-critico-suave/50 p-3">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-sinal-critico">
              0 ≤ resultado &lt; 50%
            </span>
            <h4 className="font-serif text-xs font-bold uppercase text-slate-900">Faixa Crítica</h4>
            <p className="text-[11px] font-bold text-sinal-critico">Abaixo da Meta</p>
          </div>
          <div className="rounded-xl border border-sinal-atencao/40 bg-sinal-atencao-suave/50 p-3">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-sinal-atencao">
              50% ≤ resultado &lt; 80%
            </span>
            <h4 className="font-serif text-xs font-bold uppercase text-slate-900">Faixa de Atenção</h4>
            <p className="text-[11px] font-bold text-sinal-atencao">Cumprimento Insuficiente</p>
          </div>
          <div className="rounded-xl border border-sinal-conforme/40 bg-sinal-conforme-suave/50 p-3">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-sinal-conforme">
              80% ≤ resultado ≤ 100%
            </span>
            <h4 className="font-serif text-xs font-bold uppercase text-slate-900">Faixa de Conformidade</h4>
            <p className="text-[11px] font-bold text-sinal-conforme">Meta Cumprida</p>
          </div>
          <div className="rounded-xl border border-sinal-superacao/40 bg-sinal-superacao-suave/50 p-3">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-sinal-superacao">
              resultado &gt; 100%
            </span>
            <h4 className="font-serif text-xs font-bold uppercase text-slate-900">Faixa de Superação</h4>
            <p className="text-[11px] font-bold text-sinal-superacao">Meta Superada</p>
          </div>
        </div>

        <p className="text-[11.5px] italic text-slate-500">
          * 80% equivale ao atingimento do limiar institucional de conformidade; 100% equivale ao cumprimento integral da referência quantitativa; acima de 100% equivale à superação quantitativa.
        </p>
      </div>
      </div>
    </section>
  );
}
