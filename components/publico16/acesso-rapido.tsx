import Link from "next/link";
import Image from "next/image";
import {
  FileSpreadsheet,
  BarChart3,
  Presentation,
  FileCheck2,
  Lock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AjudaWhatsApp } from "@/components/publico16/ajuda-whatsapp";
import { cn } from "@/lib/utils";

type Atalho = {
  rotulo: string;
  subtitulo: string;
  nota: string;
  href: string;
  botaoTexto: string;
  foto?: string;
  video?: string;
  icone: React.ReactNode;
  externo?: boolean;
  restrito?: boolean;
  destaque?: boolean;
};

export function AcessoRapido({
  urlFormulario,
  urlPlanilha,
}: {
  urlFormulario: string;
  urlPlanilha: string;
}) {
  const atalhos: Atalho[] = [
    {
      rotulo: "Lançar Auditoria do Turno",
      subtitulo: "Registro obrigatório das mídias auditadas com mínimo de 3 IDs por turno.",
      nota: "Formulário da Auditoria",
      href: urlFormulario,
      botaoTexto: "Preencher Agora",
      video: "/media/clip_patrulha_noturna.mp4",
      foto: "/media/foto-viatura.jpg",
      icone: <FileCheck2 className="h-6 w-6 text-white" />,
      externo: true,
      destaque: true,
    },
    {
      rotulo: "Dashboard de Controle",
      subtitulo: "Metas por fração, evolução semanal, ranking de Cias e carta de controle ±3σ.",
      nota: "Painel em Tempo Real",
      href: "/cop2026/dashboard",
      botaoTexto: "Acessar Dashboard",
      foto: "/media/foto-viatura.jpg",
      icone: <BarChart3 className="h-6 w-6 text-white" />,
      restrito: true,
    },
    {
      rotulo: "Planilha de Controle",
      subtitulo: "Base oficial de respostas no Google Sheets com fórmulas e conferência.",
      nota: "Planilha de Respostas",
      href: urlPlanilha,
      botaoTexto: "Abrir no Sheets",
      foto: "/media/foto-rua.jpg",
      icone: <FileSpreadsheet className="h-6 w-6 text-white" />,
      externo: true,
      restrito: true,
    },
    {
      rotulo: "Briefing Executivo",
      subtitulo: "Apresentação executiva em slides com métricas e diagnóstico consolidado.",
      nota: "Relatório em Slides",
      href: "/cop2026/briefing",
      botaoTexto: "Abrir Apresentação",
      foto: "/media/foto-oficial.jpg",
      icone: <Presentation className="h-6 w-6 text-white" />,
    },
  ];

  return (
    <section className="border-b border-black/10 bg-[#f8fafc] py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        {/* Cabeçalho de Seção */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1.5 bg-vermelho rounded-full" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#ca0202]">
              Sistemas Oficiais · 16º BPM/M
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-black uppercase tracking-wider text-[#1d1d1d] mt-1.5">
            Acesso Rápido Operacional
          </h2>
          <div className="mt-2.5 flex items-center">
            <span className="h-1 w-20 bg-vermelho rounded-full" />
            <span className="h-0.5 w-48 bg-slate-300 rounded-full ml-1" />
          </div>
        </div>

        {/* Grid dos 4 Cards com Imagens em Degradê e Botões PMESP */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {atalhos.map((a) => {
            const isDestaque = a.destaque;

            const cardContent = (
              <div
                className={cn(
                  "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border-2 transition-all duration-500 hover:-translate-y-2",
                  isDestaque
                    ? "border-[#ca0202] shadow-[0_12px_32px_rgba(202,2,2,0.3)] hover:shadow-[0_20px_48px_rgba(202,2,2,0.45)]"
                    : "border-slate-300/85 shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:border-[#ca0202] hover:shadow-[0_16px_36px_rgba(202,2,2,0.22)]"
                )}
              >
                {/* 1. Mídia de Fundo: Vídeo de Viatura com Giroflex/Light Ligado ou Foto Real em Degradê */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  {a.video ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover scale-110 transition-transform duration-700 ease-out group-hover:scale-125"
                    >
                      <source src={a.video} type="video/mp4" />
                    </video>
                  ) : a.foto ? (
                    <Image
                      src={a.foto}
                      alt={a.rotulo}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  ) : null}

                  {/* 2. Degradê Tático Escuro para Contraste Absoluto dos Textos e Botões */}
                  <div
                    className={cn(
                      "absolute inset-0 transition-opacity duration-500",
                      isDestaque
                        ? "bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-[#09090b]/40 group-hover:via-[#09090b]/70"
                        : "bg-gradient-to-t from-[#090b10] via-[#0b1222]/90 to-[#0b1222]/70 group-hover:via-[#0b1222]/80"
                    )}
                  />
                  {/* Linha vermelha no topo */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-vermelho to-transparent opacity-80" />
                </div>

                {/* 3. Conteúdo Sobreposto */}
                <div className="relative z-10 p-6 flex flex-col justify-between h-full min-h-[340px]">
                  <div>
                    {/* Topo do Card: Ícone em Destaque + Badges */}
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl shadow-md transition-all duration-500 group-hover:scale-110 group-hover:rotate-2",
                          isDestaque
                            ? "bg-vermelho shadow-[0_4px_16px_rgba(202,2,2,0.5)] border border-red-400/40"
                            : "bg-white/10 backdrop-blur-md border border-white/20 group-hover:bg-vermelho group-hover:border-vermelho"
                        )}
                      >
                        {a.icone}
                      </div>

                      {a.restrito && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 border border-white/15 px-2.5 py-1 text-[11px] font-bold text-slate-200 backdrop-blur-md">
                          <Lock size={11} className="text-amber-400" /> Restrito
                        </span>
                      )}

                      {isDestaque && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-vermelho/30 border border-vermelho px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider text-white shadow-xs backdrop-blur-md animate-pulse">
                          <Sparkles size={11} className="text-amber-300" /> Obrigatório
                        </span>
                      )}
                    </div>

                    {/* Categoria / Nota */}
                    <span className="mt-5 block text-[11px] font-black uppercase tracking-[0.18em] text-red-400 drop-shadow">
                      {a.nota}
                    </span>

                    {/* Título Principal */}
                    <h3 className="mt-1 font-serif text-xl font-black uppercase leading-snug tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                      {a.rotulo}
                    </h3>

                    {/* Subtítulo / Descrição */}
                    <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-200 font-medium drop-shadow">
                      {a.subtitulo}
                    </p>
                  </div>

                  {/* 4. Botão Animado no Padrão Institucional PMESP (COPOM / CCOMSOC) */}
                  <div className="mt-6 pt-4 border-t border-white/15">
                    <div
                      className={cn(
                        "relative flex w-full items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-lg transition-all duration-300 group-hover:scale-102",
                        isDestaque
                          ? "bg-gradient-to-r from-[#ca0202] via-[#e40707] to-[#ca0202] shadow-[0_6px_20px_rgba(202,2,2,0.45)] group-hover:shadow-[0_8px_28px_rgba(202,2,2,0.65)]"
                          : "bg-gradient-to-r from-white/20 via-white/10 to-white/20 border border-white/30 backdrop-blur-md group-hover:bg-vermelho group-hover:border-vermelho group-hover:shadow-[0_6px_22px_rgba(202,2,2,0.5)]"
                      )}
                    >
                      {/* Efeito de brilho que corre no hover */}
                      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                        <span className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white/25 opacity-0 transition-all duration-700 group-hover:animate-shine group-hover:opacity-100" />
                      </span>

                      <span className="relative z-10">{a.botaoTexto}</span>
                      {a.externo ? (
                        <ExternalLink size={15} className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      ) : (
                        <ArrowRight size={15} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <div key={a.rotulo} className="relative h-full">
                {isDestaque && <AjudaWhatsApp />}
                {a.externo ? (
                  <a
                    href={a.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full"
                  >
                    {cardContent}
                  </a>
                ) : (
                  <Link href={a.href} className="block h-full">
                    {cardContent}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
