"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { ROTULO_SUBUNIDADE, type LancamentoCop, type MetaSubunidade } from "@/lib/cop2026";

const FMT = new Intl.NumberFormat("pt-BR");
const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Briefing executivo em slides: o Comando abre, passa com a seta e tem o
 * quadro do período sem precisar montar apresentação. Um slide por ideia,
 * número grande e leitura de longe — é material de reunião, não de leitura.
 */
export function BriefingSlides({
  lancamentos,
  metas,
  lidoEm,
  email,
  ehAdmin = false,
}: {
  lancamentos: LancamentoCop[];
  metas: MetaSubunidade[];
  lidoEm: string;
  email?: string;
  /** Liga o atalho para a tela de Autorizados; só o administrador da COP o vê. */
  ehAdmin?: boolean;
}) {
  const [i, setI] = useState(0);

  const videos = lancamentos.reduce((s, l) => s + l.videos, 0);
  const meta = metas.reduce((s, m) => s + m.meta, 0);
  const auditores = metas.reduce((s, m) => s + m.efetivo, 0);
  const pessoas = new Set(lancamentos.map((l) => l.re || l.nomeGuerra).filter(Boolean)).size;
  const abaixo = lancamentos.filter((l) => l.auditou && l.videos > 0 && l.videos < 3).length;
  const naoAuditou = lancamentos.filter((l) => !l.auditou).length;
  const pct = meta > 0 ? (videos / meta) * 100 : 0;

  const porSub = metas.map((m) => {
    const feito = lancamentos
      .filter((l) => l.subunidade === m.subunidade)
      .reduce((s, l) => s + l.videos, 0);
    return {
      rotulo: ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade,
      meta: m.meta,
      feito,
      pct: m.meta > 0 ? (feito / m.meta) * 100 : 0,
    };
  });

  const slides = [
    {
      selo: "Briefing executivo",
      titulo: "Auditoria de COP 2026",
      corpo: (
        <div className="space-y-4">
          <p className="text-lg text-white/75 sm:text-2xl">16º BPM/M · Diretriz nº PM3-001/02/25</p>
          <p className="text-lg text-white/50">Leitura da planilha em {lidoEm}</p>
        </div>
      ),
    },
    {
      selo: "Cumprimento da meta",
      titulo: `${PCT.format(pct)}%`,
      corpo: (
        <div className="space-y-6">
          <p className="text-xl text-white/80 sm:text-3xl">
            {FMT.format(videos)} de {FMT.format(meta)} evidências previstas no período
          </p>
          <div className="h-6 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#ca0202] transition-all duration-1000"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="text-xl text-white/55">
            Base: {auditores} auditores designados · 3 evidências por turno · 15 turnos
          </p>
        </div>
      ),
    },
    {
      selo: "Por fração",
      titulo: "Onde está cada companhia",
      corpo: (
        <div className="space-y-4">
          {porSub.map((s) => (
            <div key={s.rotulo}>
              <div className="flex items-baseline justify-between text-lg">
                <span className="font-bold text-white">{s.rotulo}</span>
                <span className="tabular-nums text-white/65">
                  {FMT.format(s.feito)} / {FMT.format(s.meta)} · {PCT.format(s.pct)}%
                </span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#ca0202] transition-all duration-1000"
                  style={{ width: `${Math.min(100, s.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      selo: "Pontos de atenção",
      titulo: "O que o Comando precisa olhar",
      corpo: (
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { v: naoAuditou, r: "lançaram NÃO auditei" },
            { v: abaixo, r: "ficaram abaixo de 3 por turno" },
            { v: pessoas, r: "policiais lançaram no período" },
          ].map((c) => (
            <div key={c.r} className="rounded-xl border border-white/15 bg-white/[0.06] p-6">
              <p className="dados-destaque text-4xl text-[#ff5a5a] sm:text-5xl">
                {FMT.format(c.v)}
              </p>
              <p className="mt-2 text-lg text-white/65">{c.r}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      selo: "Determinação",
      titulo: "Mínimo de 3 evidências por turno",
      corpo: (
        <p className="text-lg leading-relaxed text-white/75 sm:text-2xl">
          Com os IDs das mídias ou gravações informados no formulário, todos os dias, por todos os
          auditores designados. Quem fica abaixo do mínimo justifica com o número da Parte.
        </p>
      ),
    },
  ];

  const total = slides.length;
  const ir = useCallback((d: number) => setI((v) => Math.min(total - 1, Math.max(0, v + d))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") ir(1);
      if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir]);

  const s = slides[i];

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0e] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <p className="font-serif text-lg font-bold uppercase tracking-wide">
          Briefing · Auditoria de COP
        </p>
        {email && (
          <span className="ml-auto mr-3 hidden items-center gap-2 text-[12px] text-white/45 sm:inline-flex">
            {ehAdmin && (
              <a href="/cop2026/admin" className="font-bold hover:text-white">
                Autorizados
              </a>
            )}
            {email}
            <a href="/api/cop2026/acesso/sair" className="font-bold hover:text-white">
              Sair
            </a>
          </span>
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white/70 transition-colors hover:border-[#ca0202] hover:text-white"
        >
          <Printer size={17} /> Imprimir / PDF
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div key={i} className="w-full max-w-4xl animate-[fade_450ms_ease-out]">
          <p className="text-[13px] font-black uppercase tracking-[0.25em] text-[#ff5a5a]">{s.selo}</p>
          <h2 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {s.titulo}
          </h2>
          <div className="mt-8">{s.corpo}</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-6 py-5">
        <button
          onClick={() => ir(-1)}
          disabled={i === 0}
          className="inline-flex items-center gap-2 rounded-md bg-white/10 px-5 py-3 font-bold uppercase tracking-wide transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          <ArrowLeft size={19} /> <span className="hidden sm:inline">Anterior</span>
        </button>
        <div className="flex gap-2">
          {slides.map((_, k) => (
            <span
              key={k}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                k === i ? "w-8 bg-[#ca0202]" : "w-2.5 bg-white/25"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => ir(1)}
          disabled={i === total - 1}
          className="inline-flex items-center gap-2 rounded-md bg-[#ca0202] px-5 py-3 font-bold uppercase tracking-wide transition-colors hover:bg-[#e40707] disabled:opacity-30"
        >
          <span className="hidden sm:inline">Próximo</span> <ArrowRight size={19} />
        </button>
      </div>

      <style>{`@keyframes fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
