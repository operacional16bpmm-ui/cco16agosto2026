import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ExternalLink,
  FileCheck2,
  Presentation,
  RefreshCw,
} from "lucide-react";
import type { Metadata } from "next";
import { AcessoRapido } from "@/components/publico16/acesso-rapido";
import { DiretrizCop } from "@/components/publico16/diretriz-cop";
import { DiretrizEmFoco } from "@/components/publico16/diretriz-em-foco";
import { Instagram16 } from "@/components/publico16/instagram-16";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import {
  URL_FORMULARIO,
  URL_PLANILHA,
  lerAuditoriaCop2026,
} from "@/lib/cop2026";

// Nenhuma fonte é carregada aqui: Cinzel (títulos), Inter (corpo) e IBM Plex
// Mono (números) já vêm do layout raiz e valem para o portal inteiro. Esta
// página chegou a carregar Lora por conta própria — uma quarta fonte que não
// existia em nenhuma outra tela do Batalhão.

// A copy do cartão é a que a tropa lê no WhatsApp antes de decidir se abre o
// link, então fala no imperativo e diz o que a pessoa tem a fazer, não o que a
// página é. A imagem do cartão vem de opengraph-image.tsx, ao lado.
const CHAMADA =
  "Lance a sua auditoria do dia e acompanhe, ao vivo, a meta de cada companhia. Mínimo de 3 evidências auditadas por turno, com os IDs das mídias, conforme determinação do Batalhão sobre a Diretriz PM3-001/02/25.";

export const metadata: Metadata = {
  title: "Auditoria de COP 2026 · 16º BPM/M",
  description: CHAMADA,
  // Página de trabalho interno, aberta para a tropa lançar e o Comando
  // acompanhar sem login. Fora do índice dos buscadores de propósito: quem
  // chega é quem recebeu o endereço.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Auditoria de COP 2026 · 16º BPM/M",
    description: CHAMADA,
    siteName: "16º BPM/M",
    locale: "pt_BR",
    type: "website",
    url: "https://portal-cco16.vercel.app/cop2026",
  },
  twitter: {
    card: "summary_large_image",
    title: "Auditoria de COP 2026 · 16º BPM/M",
    description: CHAMADA,
  },
};

// A leitura da planilha já revalida a cada 60s; a rota acompanha para não
// servir HTML velho por cima de dado novo.
// Renderizada a cada requisicao: a leitura da planilha nao pode ser feita no
// build (o prerender estourava 60s e derrubava o deploy). O cache de dados do
// fetch continua com revalidate de 60s dentro de lib/cop2026.
export const dynamic = "force-dynamic";

export default async function Cop2026Page() {
  const { erro, lidoEm } = await lerAuditoriaCop2026();

  return (
    <div
      className={`tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco`}
    >
      <header className="border-b border-branco/10 bg-tatico-super">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/16bpmm.png"
              alt="Brasão do 16º BPM/M"
              // Proporção real do arquivo: declarar quadrado num brasão que não
              // é quadrado dispara o aviso de aspect ratio do next/image.
              width={168}
              height={240}
              className="h-14 w-auto drop-shadow-sm sm:h-16"
              priority
            />
            <div>
              <p className="font-serif text-xl font-bold uppercase leading-tight tracking-wide text-branco sm:text-2xl">
                Auditoria de COP 2026
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-[#ca0202] sm:text-sm">
                16º BPM/M · Câmeras Operacionais Corporais
              </p>
            </div>
          </div>
          {/* Sem links de saída: esta página trata só da auditoria de COP. */}
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end">
            {/* Botões de vitrine: mostram os destinos do Batalhão sem levar a
                lugar nenhum — esta página trata só da auditoria de COP. */}
            <span
              aria-disabled="true"
              className="inline-flex cursor-default items-center gap-2 rounded-md bg-[#ca0202] px-4 py-2.5 text-[14px] font-bold text-white shadow-sm"
            >
              <CalendarDays size={16} /> Calendário de eventos
            </span>
            <span
              aria-disabled="true"
              className="inline-flex cursor-default items-center gap-2 rounded-md border-2 border-[#1d1d1d]/25 px-4 py-2 text-[14px] font-bold text-[#1d1d1d]"
            >
              Página do 16º BPM/M <ArrowRight size={16} />
            </span>
          </div>
          <div className="w-full text-left sm:w-auto sm:text-right">
            <p className="font-serif text-base font-bold uppercase tracking-wide text-branco/80">
              Diretriz nº PM3-001/02/25
            </p>
            <p className="text-[13px] font-semibold text-branco/45">
              Preenchimento diário obrigatório
            </p>
          </div>
        </div>
      </header>

      {/* Hero institucional: o cabeçalho acima já nomeia a página, o Batalhão
          e a Diretriz — aqui não se repete nenhum dos três. O bloco é alinhado
          à esquerda porque é tela de trabalho, não peça de campanha: caixa
          alta centralizada com tracking largo lê como anúncio. A linha da
          Diretriz continua onde o Batalhão fixou, abaixo de AUDITORIA &
          GOVERNANÇA, em <DiretrizCop />. */}
      <section className="relative isolate w-full overflow-hidden border-b-4 border-[#ca0202] bg-[#070b14]">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/media/hero-poster.jpg"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.15]"
        >
          <source src="/media/cop-hero.mp4" type="video/mp4" />
        </video>

        {/* Foto da câmera operacional corporal no colete da PMESP: peça
            institucional (Sd PM Mancio, Força Patrulha) ao lado do título,
            escondida no mobile para o texto respirar. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] lg:block xl:w-[58%]"
        >
          <Image
            src="/media/cop-camera.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1280px) 58vw, 62vw"
            className="object-cover object-[35%_center]"
          />
          {/* Fade só na borda esquerda para casar com o texto e o fundo:
              o resto da foto fica limpo. */}
          <div className="absolute inset-y-0 left-0 w-[38%] bg-gradient-to-r from-[#070b14] via-[#070b14]/70 to-transparent" />
        </div>

        {/* No mobile a foto está escondida, então o gradiente cheio ajuda o
            texto no vídeo; no desktop ele para bem antes da foto. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/85 to-[#070b14]/30 lg:hidden" />

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
            <span className="h-px w-8 bg-[#ca0202]" />
            Câmeras Operacionais Corporais
          </p>

          <h2 className="mt-5 max-w-3xl font-serif text-[2rem] font-bold leading-[1.08] text-white sm:text-[3.25rem]">
            Controle e fiscalização
            <span className="block text-white/55">do uso das câmeras em serviço</span>
          </h2>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-300">
            Cada auditor lança a sua auditoria ao fim do turno, com no mínimo três
            evidências e os IDs das mídias. O acompanhamento da meta de cada
            companhia é atualizado a cada minuto.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={URL_FORMULARIO}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2.5 rounded-md bg-[#ca0202] px-7 py-3.5 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-[#e40707] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <FileCheck2 className="h-[18px] w-[18px]" />
              Preencher a auditoria do turno
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="/cop2026/dashboard"
              className="inline-flex items-center justify-center gap-2.5 rounded-md border border-white/25 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/[0.06]"
            >
              <BarChart3 className="h-[18px] w-[18px] text-white/60" />
              Dashboard de metas
            </a>
            <a
              href="/cop2026/briefing"
              className="inline-flex items-center justify-center gap-2 px-2 py-3.5 text-[15px] font-semibold text-slate-300 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              <Presentation className="h-[18px] w-[18px]" />
              Briefing executivo
            </a>
          </div>

          {/* Os parâmetros que a tropa mais pergunta, na altura do olho, em vez
              de enterrados na nota de rodapé da página. */}
          <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-6 border-t border-white/10 pt-7 sm:grid-cols-4">
            {[
              { rotulo: "Evidências por turno", valor: "3", nota: "mínimo obrigatório" },
              { rotulo: "Turnos no período", valor: "15", nota: "escala 12x36" },
              { rotulo: "Lançamento", valor: "Diário", nota: "ao fim do turno" },
              { rotulo: "Atualização", valor: "60s", nota: "leitura da planilha" },
            ].map((item) => (
              <div key={item.rotulo}>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {item.rotulo}
                </dt>
                <dd className="mt-1.5 font-mono text-2xl font-bold leading-none text-white">
                  {item.valor}
                </dd>
                <dd className="mt-1 text-[12px] text-white/45">{item.nota}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <DiretrizEmFoco />

      <AcessoRapido urlFormulario={URL_FORMULARIO} urlPlanilha={URL_PLANILHA} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="sr-only">Auditoria de COP 2026 · 16º BPM/M</h1>
        <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
          <div className="flex flex-col items-end gap-1.5">
            <a
              href={URL_PLANILHA}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-branco/15 px-3 py-1.5 text-sm font-semibold text-branco/60 transition-colors hover:border-vermelho/50 hover:text-vermelho"
            >
              <ExternalLink size={12} /> Abrir a planilha
            </a>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-branco/40">
              <RefreshCw size={10} /> leitura de {lidoEm}
            </span>
          </div>
        </div>

        {erro && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-vermelho/35 bg-vermelho/[0.07] p-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-vermelho" />
            <div>
              <p className="text-sm font-bold text-branco">A planilha não respondeu</p>
              <p className="mt-0.5 text-sm text-branco/60">
                {erro} Verifique se ela continua compartilhada por link para quem tem o endereço.
              </p>
            </div>
          </div>
        )}

        <div id="diretriz-pdf" className="scroll-mt-8">
          <DiretrizCop />
        </div>

        <p className="mt-8 border-t border-branco/10 pt-4 text-[13px] leading-relaxed text-branco/40">
          Leitura direta da planilha de respostas do formulário &quot;Auditoria COP Motorola · 16
          BPM/M&quot;, da conta institucional operacional16bpmm@gmail.com, atualizada a cada minuto.
          A fonte de verdade continua sendo a planilha: correção de lançamento e ajuste de auditores
          ou de meta são feitos lá, na aba Parametros, e esta página apenas reflete o que estiver
          preenchido. Meta do período = auditores designados × 3 evidências mínimas por turno × 15
          turnos de serviço no período (escala 12x36), conforme fixado pelo Batalhão na própria
          planilha. Os números do acompanhamento ficam no Dashboard de controle.
        </p>
      </main>

      <Instagram16 />

      <RodapeCop nota="Página aberta à tropa. Dashboard e Briefing são de acesso restrito." />
    </div>
  );
}
