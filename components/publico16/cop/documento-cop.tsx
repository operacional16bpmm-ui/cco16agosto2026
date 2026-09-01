/**
 * Casca comum dos documentos de relatório da Auditoria de COP 2026.
 *
 * Os três documentos (Executivo Analítico, Dados Consolidados e Briefing)
 * compartilham a mesma identidade: papel timbrado institucional que só aparece
 * na impressão (`.so-impressao`), cabeçalho de tela com as ações, faixas de
 * cor da regra do Comando e um rodapé de classificação. Marca a raiz com
 * `documento-cop`, que aciona o PDF colorido e a paginação por seção
 * (regras em app/globals.css).
 *
 * Componente de servidor: só compõe dados já calculados. A cor da faixa vem da
 * classificação de lib/cop2026-metricas.ts — aqui só se pinta o que ela decide.
 */
import Image from "next/image";
import { ShieldAlert } from "lucide-react";
import { ROTULO_NIVEL, type Nivel } from "@/lib/cop2026-metricas";
import type { RelatorioMes } from "@/lib/cop2026-relatorios";

/** Cores das faixas — §2 dos padrões do Comando. Hex explícito para sobreviver
 *  ao PDF e ao tema institucional. */
export const COR_FAIXA: Record<Nivel, string> = {
  superacao: "#2563eb",
  conforme: "#16a34a",
  atencao: "#d97706",
  critico: "#ca0202",
  neutro: "#94a3b8",
};

export function fmtData(iso: string | undefined): string {
  if (!iso || iso.length < 10) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function fmtDataHora(iso: string | undefined): string {
  if (!iso || iso.length < 16) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} · ${iso.slice(11, 13)}h${iso.slice(14, 16)}`;
}

export function FaixaBand({ nivel, pct }: { nivel: Nivel; pct: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(2, Math.min(100, pct))}%`,
          backgroundColor: COR_FAIXA[nivel],
        }}
      />
    </div>
  );
}

export function RotuloFaixa({ nivel, texto }: { nivel: Nivel; texto?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: COR_FAIXA[nivel] }}
    >
      {texto ?? ROTULO_NIVEL[nivel]}
    </span>
  );
}

export function SecaoDoc({
  n,
  titulo,
  nota,
  quebraAntes,
  children,
}: {
  n: string;
  titulo: string;
  nota?: string;
  /** Começa em nova página no PDF. */
  quebraAntes?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        "cartao-doc rounded-2xl border-2 border-slate-300/85 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)] sm:p-7 " +
        (quebraAntes ? "quebra-antes" : "")
      }
    >
      <header className="mb-5 flex items-start gap-3 border-b border-slate-200 pb-3">
        <span
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-black text-white"
          style={{ backgroundColor: "#07182d" }}
        >
          {n}
        </span>
        <div>
          <h2 className="font-serif text-lg font-black uppercase leading-tight tracking-wide text-[#07182d] sm:text-xl">
            {titulo}
          </h2>
          {nota && <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#15304c]/70">{nota}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

export function DocumentoCop({
  etiqueta,
  titulo,
  subtitulo,
  mes,
  encerrado,
  lidoEm,
  acoes,
  children,
}: {
  etiqueta: string;
  titulo: string;
  subtitulo: string;
  mes: RelatorioMes;
  encerrado: boolean;
  lidoEm?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
}) {
  const mesRotulo = `${mes.rotulo} de ${mes.ano}`;
  const selo = encerrado
    ? `Período encerrado · ${fmtDataHora(mes.encerraEm)}`
    : mes.encerraEm
      ? `Período encerra · ${fmtDataHora(mes.encerraEm)}`
      : `Período de ${mesRotulo}`;

  return (
    <div className="documento-cop mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      {/* Papel timbrado — só na impressão/PDF */}
      <div className="so-impressao mb-4 border-b-2 border-[#07182d] pb-3">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/brasao-16bpmm-hd.png"
            alt="16º BPM/M"
            width={2481}
            height={3508}
            className="h-12 w-auto"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ca0202]">
              Polícia Militar do Estado de São Paulo · 16º BPM/M
            </p>
            <p className="font-serif text-[15px] font-black uppercase text-[#07182d]">
              Auditoria e Governança das Câmeras Operacionais Corporais
            </p>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#15304c]/70">
              Diretriz PM3-001/02/25 · Ambiente Executivo de Gestão e Controle
            </p>
          </div>
          <span className="ml-auto rounded border border-[#ca0202] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#ca0202]">
            Uso restrito · Comando
          </span>
        </div>
      </div>

      {/* Cabeçalho do documento (tela + papel) */}
      <div className="cartao-doc rounded-2xl border-2 border-[#07182d]/15 bg-gradient-to-b from-white to-[#eef3f8] p-6 shadow-[0_6px_20px_rgba(7,24,45,0.08)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#ca0202]">
              {etiqueta}
            </span>
            <h1 className="mt-1 font-serif text-2xl font-black uppercase leading-tight tracking-wide text-[#07182d] sm:text-3xl">
              {titulo}
            </h1>
            <p className="mt-1 font-serif text-base italic text-[#15304c]/80">{subtitulo}</p>
            <p className="mt-2 text-[12.5px] font-semibold uppercase tracking-wide text-[#15304c]/60">
              Período de referência · {mesRotulo}
            </p>
          </div>
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide " +
              (encerrado
                ? "border-slate-400/40 bg-slate-500/10 text-[#15304c]/70"
                : "border-[#ca0202]/50 bg-[#ca0202]/10 text-[#ca0202]")
            }
          >
            {selo}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <span className="text-[12px] text-[#15304c]/60">
            Fonte: planilha oficial de respostas do 16º BPM/M
            {lidoEm ? ` · leitura de ${lidoEm}` : ""}
          </span>
          {acoes}
        </div>
      </div>

      {children}

      {/* Rodapé do documento */}
      <div className="cartao-doc flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#fafbfc] p-5 text-[12px] leading-relaxed text-[#15304c]/70">
        <p className="flex items-center gap-2 font-bold uppercase tracking-wide text-[#ca0202]">
          <ShieldAlert className="h-4 w-4" /> Documento operacional · uso restrito ao Comando
        </p>
        <p>
          Portal CCO-16 · Auditoria de COP {mes.ano} · Diretriz PM3-001/02/25 ·{" "}
          {encerrado ? "período encerrado" : "período em curso"}
        </p>
      </div>
    </div>
  );
}
