import Image from "next/image";
import { AlertTriangle, ArrowRight, CalendarDays, ExternalLink, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { AcessoRapido } from "@/components/publico16/acesso-rapido";
import { DiretrizCop } from "@/components/publico16/diretriz-cop";
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
                16º BPM/M · Câmera operacional portátil
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

      {/* Arte da campanha, em faixa própria de ponta a ponta. O título e o
          resumo da diretriz já estão na própria imagem, então a página não os
          repete em texto: fica só o h1 para leitor de tela e buscador. */}
      <div className="relative h-[42vh] min-h-[260px] w-full overflow-hidden bg-[#07070a] sm:h-[430px]">
        {/* A arte é quase quadrada; o mesmo frame desfocado preenche as
            laterais no desktop em vez de deixar duas faixas pretas. */}
        <Image
          src="/cop2026/hero.webp"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="scale-110 object-cover opacity-35 blur-2xl"
        />
        <Image
          src="/cop2026/hero.webp"
          alt="Auditoria de COP 2026 do 16º BPM/M. Controle do cumprimento da Diretriz PM3-001/02/25, fiscalização e classificação das evidências digitais, mínimo de 3 evidências auditadas por turno, diariamente."
          fill
          sizes="100vw"
          className="object-contain"
          priority
        />
      </div>

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

        <DiretrizCop />

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
