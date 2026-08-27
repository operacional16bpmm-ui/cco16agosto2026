import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  Boxes,
  FileSpreadsheet,
  CalendarDays,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Play,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";
import { Reveal } from "@/components/public/reveal";
import { DocumentosPublicos16BPMM } from "@/components/documentos/documentos-publicos-16bpmm";
import { Cabecalho } from "@/components/publico16/cabecalho";
import { Companhias } from "@/components/publico16/companhias";
import { Galeria, type ItemGaleria } from "@/components/publico16/galeria";
import {
  ATUALIDADE,
  BRASAO,
  COMANDANTE_BIO,
  COMANDANTE_CARREIRA,
  COMANDANTE_CONDECORACOES,
  COMANDANTE_FORMACAO,
  COMPANHIAS,
  FERNAO_BRAVURA,
  FERNAO_DADOS,
  FERNAO_LEGADO,
  FERNAO_TRAJETORIA,
  HEROIS,
  HISTORICO,
  NUMEROS,
  OCORRENCIA,
  POLICIAL,
  SERVICOS,
  SIMBOLOS,
} from "@/lib/dados-16bpmm";

/* ============================================================================
   PÁGINA OFICIAL DO 16º BPM/M — "1º Ten PM Fernão Gomes Loureiro"
   Reúne, em página única, todo o conteúdo que a Unidade mantém no site da
   intranet PMESP (histórico, brasão, patrono, comandante, companhias,
   ocorrência destaque, policial do mês, fotos históricas e Galeria de Heróis),
   acrescido dos Reels do Instagram oficial e do acesso à Sala de Operações.
   ============================================================================ */

export const dynamic = "force-dynamic";

// Esta rota é o que 16bpmm-pmesp.vercel.app serve na raiz (reescrita por host
// em proxy.ts), então o cartão de compartilhamento aponta para aquele domínio.
// URL absoluta de propósito: o metadataBase do layout raiz é portal-cco16, e
// quem recebe o link no WhatsApp precisa ver o domínio institucional.
const HOST = "https://16bpmm-pmesp.vercel.app";
const TITULO = "16º BPM/M · Página Oficial";
const RESUMO =
  "Desde 1963 na Zona Sul e Oeste de São Paulo. História do Batalhão, brasão de armas, o patrono 1º Ten PM Fernão Gomes Loureiro, as cinco companhias e a Galeria de Heróis.";

export const metadata: Metadata = {
  title: "16º BPM/M · 1º Ten PM Fernão Gomes Loureiro",
  description: RESUMO,
  alternates: { canonical: HOST },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "16º BPM/M",
    url: HOST,
    title: TITULO,
    description: RESUMO,
    images: [
      {
        url: `${HOST}/og/institucional.png`,
        width: 1200,
        height: 630,
        alt: "Brasão do 16º BPM/M sobre fundo azul institucional, com o título Página Oficial",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: RESUMO,
    images: [`${HOST}/og/institucional.png`],
  },
};

const SLIDES = Array.from({ length: 13 }, (_, i) => `/16bpmm/carrossel/slide-${i + 1}.jpg`);

const FOTOS_HISTORICAS: ItemGaleria[] = Array.from({ length: 54 }, (_, i) => ({
  src: `/16bpmm/historicas/foto-${i + 1}.jpg`,
  titulo: `Acervo histórico do 16º BPM/M — imagem ${i + 1}`,
}));

const GALERIA_HEROIS: ItemGaleria[] = HEROIS.map((h) => ({
  src: `/16bpmm/herois/heroi-${h.n}.jpg`,
  titulo: h.nome,
  legenda: h.ano,
  texto: h.texto,
}));

const REELS = [
  {
    src: "/media/reel-casas-bomba.mp4",
    poster: "/media/reel-casas-bomba.jpg",
    titulo: "Operação de combate ao tráfico",
  },
  {
    src: "/media/reel-operacao.mp4",
    poster: "/media/reel-operacao.jpg",
    titulo: "Operação Paraisópolis intensificada",
  },
  {
    src: "/media/reel-patrulha.mp4",
    poster: "/media/reel-patrulha.jpg",
    titulo: "Presença e patrulhamento no território",
  },
];

function IgIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TituloSecao({ children, claro = false }: { children: string; claro?: boolean }) {
  return (
    <div className="text-center">
      <h2
        className={`font-serif text-3xl uppercase tracking-wide md:text-4xl ${
          claro ? "text-ouro" : "text-azul-noite"
        }`}
      >
        {children}
      </h2>
      <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-ouro-velho" />
    </div>
  );
}

export default function PaginaOficial16() {
  return (
    <>
      <Cabecalho />

      <main id="inicio" className="flex-1">
        {/* ---------------------------------------------------------- ABERTURA */}
        <section className="relative overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="/media/hero-poster.jpg"
            aria-hidden
          >
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-azul-noite/95 via-azul-noite/88 to-azul-noite/70" />

          <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 py-24 md:grid-cols-[1.6fr_1fr] md:py-32">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ouro">
                Polícia Militar do Estado de São Paulo
              </p>
              <h1 className="mt-5 font-serif text-4xl leading-tight text-ouro md:text-6xl">
                16º Batalhão de Polícia
                <br />
                Militar Metropolitano
              </h1>
              <p className="mt-4 text-lg font-semibold text-branco/90 md:text-xl">
                1º Ten PM Fernão Gomes Loureiro
              </p>
              <p className="mt-7 max-w-3xl text-justify text-base leading-relaxed text-branco/80 md:text-lg">
                Criado pela Lei nº 8030, de 06 de dezembro de 1963, o 16º BPM/M nasceu da Guarda
                Militar da Cidade Universitária e hoje policia uma das áreas mais contrastantes da
                Capital: do Palácio dos Bandeirantes ao Campo Limpo, do Estádio do Morumbi à Rodovia
                Raposo Tavares. São cinco Companhias e mais de 550 policiais dedicados à defesa da
                vida, da integridade física e da dignidade da pessoa humana.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/16bpmm/calendario"
                  className="inline-flex items-center gap-2 rounded-lg bg-branco px-6 py-3 text-sm font-bold text-azul-noite shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  <CalendarDays size={16} /> Calendário de eventos
                </Link>
                <a
                  href="#historico"
                  className="rounded-lg bg-ouro-velho px-6 py-3 text-sm font-bold text-azul-noite shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Nossa história
                </a>
                <a
                  href="#herois"
                  className="rounded-lg border border-branco/30 px-6 py-3 text-sm font-semibold text-branco transition-colors hover:bg-branco/10"
                >
                  Galeria de Heróis
                </a>
                <a
                  href="#companhias"
                  className="rounded-lg border border-branco/30 px-6 py-3 text-sm font-semibold text-branco transition-colors hover:bg-branco/10"
                >
                  Companhias
                </a>
              </div>
            </div>

            <div className="hidden justify-self-center md:block">
              <Image
                src="/16bpmm/geral/brasao.png"
                alt="Brasão de armas do 16º BPM/M"
                width={320}
                height={450}
                className="animar-brasao-destaque h-auto w-[240px] lg:w-[300px]"
                priority
              />
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- CARROSSEL */}
        <section className="overflow-hidden border-y border-borda bg-branco py-6">
          <div className="faixa-corrida">
            {[...SLIDES, ...SLIDES].map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative mr-5 h-[200px] w-[340px] shrink-0 overflow-hidden rounded-2xl shadow-inst md:h-[240px] md:w-[400px]"
              >
                <Image
                  src={src}
                  alt="O 16º BPM/M em atividade"
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- HISTÓRICO */}
        <section id="historico" className="scroll-mt-28 bg-superficie py-20 md:py-24">
          <div className="mx-auto max-w-[1100px] px-5">
            <Reveal>
              <TituloSecao>Histórico</TituloSecao>
            </Reveal>

            <Reveal>
              <div className="mt-12 grid items-start gap-10 md:grid-cols-[1fr_1.6fr]">
                <Image
                  src="/16bpmm/geral/historico.jpg"
                  alt="Sede histórica do 16º BPM/M"
                  width={1000}
                  height={700}
                  className="w-full rounded-2xl border border-borda object-cover shadow-inst"
                  sizes="(max-width:768px) 100vw, 400px"
                />
                <div>
                  {HISTORICO.map((p) => (
                    <p
                      key={p.slice(0, 40)}
                      className="mb-4 text-justify text-[15px] leading-relaxed text-texto-suave"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="mt-12 rounded-2xl border border-borda bg-branco p-8 shadow-inst md:p-10">
                <h3 className="font-serif text-2xl text-azul-noite">Atualidade</h3>
                <p className="mt-4 text-justify text-[15px] leading-relaxed text-texto-suave">
                  {ATUALIDADE}
                </p>
                <div className="mt-8 grid grid-cols-2 gap-6 border-t border-borda pt-8 md:grid-cols-4">
                  {NUMEROS.map((n) => (
                    <div key={n.rotulo} className="text-center">
                      <p className="font-serif text-4xl text-ouro-velho">{n.valor}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-texto-suave">
                        {n.rotulo}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------- BRASÃO */}
        <section id="brasao" className="scroll-mt-28 bg-branco py-20 md:py-24">
          <div className="mx-auto max-w-[1100px] px-5">
            <Reveal>
              <TituloSecao>Brasão de armas</TituloSecao>
            </Reveal>

            <Reveal>
              <div className="mt-12 grid items-start gap-12 md:grid-cols-[300px_1fr]">
                <Image
                  src="/16bpmm/geral/brasao.png"
                  alt="Brasão de armas do 16º BPM/M"
                  width={500}
                  height={700}
                  className="mx-auto h-auto w-[240px] md:w-full"
                  sizes="300px"
                />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-vermelho">
                    BI G PM-132/2016, de 15JUL16
                  </p>
                  {BRASAO.map((p) => (
                    <p
                      key={p.slice(0, 40)}
                      className="mt-4 text-justify text-[15px] leading-relaxed text-texto-suave"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {SIMBOLOS.map((s, i) => (
                <Reveal key={s.titulo} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-borda bg-superficie p-7 shadow-inst">
                    <span className="text-3xl" aria-hidden>
                      {s.icone}
                    </span>
                    <h3 className="mt-3 font-serif text-xl text-azul-noite">{s.titulo}</h3>
                    <p className="mt-2.5 text-justify text-sm leading-relaxed text-texto-suave">
                      {s.texto}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ PATRONO */}
        <section id="patrono" className="scroll-mt-28 bg-azul-noite py-20 text-branco md:py-24">
          <div className="mx-auto max-w-[1100px] px-5">
            <Reveal>
              <TituloSecao claro>Patrono</TituloSecao>
            </Reveal>

            <Reveal>
              <p className="mt-6 text-center text-branco/70">
                1º Tenente PM Fernão Gomes Loureiro — patrono da Turma de Aspirantes de 1994 e do
                16º Batalhão de Polícia Militar Metropolitano.
              </p>
            </Reveal>

            <Reveal>
              <div className="mt-12 grid items-start gap-10 md:grid-cols-[320px_1fr]">
                <Image
                  src="/16bpmm/geral/fernao.jpg"
                  alt="1º Ten PM Fernão Gomes Loureiro"
                  width={900}
                  height={1200}
                  className="mx-auto w-[260px] rounded-2xl border border-branco/15 object-cover shadow-lg md:w-full"
                  sizes="(max-width:768px) 260px, 320px"
                />

                <div>
                  <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {FERNAO_DADOS.map(([rotulo, valor]) => (
                      <div key={rotulo}>
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-ouro">
                          {rotulo}
                        </dt>
                        <dd className="text-sm text-branco/85">{valor}</dd>
                      </div>
                    ))}
                  </dl>

                  <h3 className="mt-9 font-serif text-xl text-ouro">Trajetória militar</h3>
                  {FERNAO_TRAJETORIA.map((p) => (
                    <p
                      key={p.slice(0, 40)}
                      className="mt-3 text-justify text-[15px] leading-relaxed text-branco/75"
                    >
                      {p}
                    </p>
                  ))}

                  <h3 className="mt-8 font-serif text-xl text-ouro">O ato de bravura</h3>
                  {FERNAO_BRAVURA.map((p) => (
                    <p
                      key={p.slice(0, 40)}
                      className="mt-3 text-justify text-[15px] leading-relaxed text-branco/75"
                    >
                      {p}
                    </p>
                  ))}

                  <h3 className="mt-8 font-serif text-xl text-ouro">Legado e memória</h3>
                  <p className="mt-3 text-justify text-[15px] leading-relaxed text-branco/75">
                    {FERNAO_LEGADO}
                  </p>

                  <blockquote className="mt-8 border-l-4 border-ouro-velho bg-branco/5 px-6 py-5">
                    <p className="font-serif text-xl italic text-ouro">
                      “Morrer como herói é renascer para a eternidade”
                    </p>
                  </blockquote>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- COMANDANTE */}
        <section id="comandante" className="scroll-mt-28 bg-superficie py-20 md:py-24">
          <div className="mx-auto max-w-[1100px] px-5">
            <Reveal>
              <TituloSecao>Comandante</TituloSecao>
            </Reveal>

            <Reveal>
              <div className="mt-12 overflow-hidden rounded-2xl border border-borda bg-branco shadow-inst">
                <div className="grid md:grid-cols-[320px_1fr]">
                  <div className="bg-azul-noite p-8 text-center">
                    <Image
                      src="/16bpmm/geral/comandante.jpg"
                      alt="Ten Cel PM Ives Minosso de Almeida Ramos"
                      width={900}
                      height={1100}
                      className="mx-auto w-[200px] rounded-xl object-cover shadow-lg md:w-full"
                      sizes="(max-width:768px) 200px, 260px"
                    />
                    <h3 className="mt-5 font-serif text-xl text-ouro">Ten Cel PM Minosso</h3>
                    <p className="mt-1 text-sm text-branco/70">Comandante do 16º BPM/M</p>
                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-branco/50">
                      No comando desde
                    </p>
                    <p className="text-sm text-branco/85">Janeiro de 2026</p>
                  </div>

                  <div className="p-8 md:p-10">
                    {COMANDANTE_BIO.map((p) => (
                      <p
                        key={p.slice(0, 40)}
                        className="mb-4 text-justify text-[15px] leading-relaxed text-texto-suave"
                      >
                        {p}
                      </p>
                    ))}

                    <div className="mt-6 grid gap-6 border-t border-borda pt-7 sm:grid-cols-2">
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-azul-noite">
                          <Award size={16} className="text-ouro-velho" />
                          Formação acadêmica
                        </h4>
                        <ul className="mt-3 space-y-2">
                          {COMANDANTE_FORMACAO.map((f) => (
                            <li key={f} className="text-sm leading-snug text-texto-suave">
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-azul-noite">
                          <Star size={16} className="text-ouro-velho" />
                          Condecorações
                        </h4>
                        <ul className="mt-3 space-y-2">
                          {COMANDANTE_CONDECORACOES.map((c) => (
                            <li key={c} className="text-sm leading-snug text-texto-suave">
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <h4 className="mt-8 flex items-center gap-2 text-sm font-bold text-azul-noite">
                      <ShieldCheck size={16} className="text-ouro-velho" />
                      Trajetória na Corporação
                    </h4>
                    <ul className="mt-4 space-y-0">
                      {COMANDANTE_CARREIRA.map(([periodo, cargo]) => (
                        <li
                          key={`${periodo}-${cargo}`}
                          className="flex gap-4 border-l-2 border-borda py-2 pl-4 text-sm"
                        >
                          <span className="tempo w-28 shrink-0 font-semibold text-ouro-velho">
                            {periodo}
                          </span>
                          <span className="text-texto-suave">{cargo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- COMPANHIAS */}
        <section id="companhias" className="scroll-mt-28 bg-branco py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal>
              <TituloSecao>Companhias</TituloSecao>
            </Reveal>
            <Reveal>
              <p className="mx-auto mt-6 max-w-2xl text-center text-texto-suave">
                Cinco Companhias cobrem a circunscrição do Batalhão, do Portal do Morumbi ao
                Arpoador, somadas à Companhia de Força Tática “Subten PM Ruas”.
              </p>
            </Reveal>
            <Reveal>
              <div className="mt-10">
                <Companhias companhias={COMPANHIAS} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------- DESTAQUES */}
        <section id="destaques" className="scroll-mt-28 bg-superficie py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal>
              <TituloSecao>Destaques do mês</TituloSecao>
            </Reveal>

            <div className="mt-12 grid gap-7 lg:grid-cols-2">
              {/* Ocorrência destaque */}
              <Reveal>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-borda bg-branco shadow-inst">
                  <div className="relative aspect-[16/10]">
                    <Image
                      src="/16bpmm/destaque/ocorrencia.jpg"
                      alt="Ocorrência destaque do 16º BPM/M"
                      fill
                      className="object-cover"
                      sizes="(max-width:1024px) 100vw, 580px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-ouro-velho px-3 py-1 text-xs font-bold text-azul-noite">
                        Ocorrência destaque · {OCORRENCIA.periodo}
                      </span>
                      <span className="text-xs text-texto-suave">
                        Publicado em {OCORRENCIA.publicado}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold leading-snug text-azul-noite">
                      {OCORRENCIA.titulo}
                    </h3>

                    <dl className="mt-5 space-y-1.5 rounded-xl bg-superficie px-5 py-4 text-sm">
                      <div className="flex gap-2">
                        <dt className="font-semibold text-azul-noite">Data:</dt>
                        <dd className="text-texto-suave">{OCORRENCIA.data}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="font-semibold text-azul-noite">Local:</dt>
                        <dd className="text-texto-suave">{OCORRENCIA.local}</dd>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <dt className="font-semibold text-azul-noite">Natureza:</dt>
                        <dd className="text-texto-suave">{OCORRENCIA.natureza}</dd>
                      </div>
                    </dl>

                    <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-vermelho">
                      Equipe
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {OCORRENCIA.equipe.map((p) => (
                        <li key={p} className="text-sm text-texto-suave">
                          {p}
                        </li>
                      ))}
                    </ul>

                    <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-vermelho">
                      Resumo
                    </h4>
                    <ul className="mt-2 space-y-1.5">
                      {OCORRENCIA.resumo.map((r) => (
                        <li key={r} className="flex gap-2.5 text-sm leading-snug text-texto-suave">
                          <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ouro-velho" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>

              {/* Policial do mês */}
              <Reveal delay={100}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-borda bg-branco shadow-inst">
                  <div className="relative aspect-[16/10]">
                    <Image
                      src="/16bpmm/destaque/policial.jpg"
                      alt={`${POLICIAL.nome}, policial do mês do 16º BPM/M`}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width:1024px) 100vw, 580px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-vermelho px-3 py-1 text-xs font-bold text-white">
                        Policial do mês · {POLICIAL.periodo}
                      </span>
                      <span className="text-xs text-texto-suave">
                        Publicado em {POLICIAL.publicado}
                      </span>
                    </div>

                    <h3 className="mt-4 font-serif text-2xl text-azul-noite">{POLICIAL.nome}</h3>
                    <p className="text-sm font-semibold text-texto-suave">{POLICIAL.unidade}</p>

                    <p className="mt-5 text-justify text-sm leading-relaxed text-texto-suave">
                      {POLICIAL.texto}
                    </p>

                    <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-vermelho">
                      Critérios de escolha
                    </h4>
                    <ul className="mt-2 space-y-1.5">
                      {POLICIAL.criterios.map((c) => (
                        <li key={c} className="flex gap-2.5 text-sm leading-snug text-texto-suave">
                          <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ouro-velho" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- HERÓIS */}
        <section id="herois" className="scroll-mt-28 bg-azul-noite py-20 text-branco md:py-24">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal>
              <TituloSecao claro>Galeria de Heróis</TituloSecao>
            </Reveal>
            <Reveal>
              <p className="mx-auto mt-6 max-w-2xl text-center text-branco/70">
                Honrando aqueles que deram a vida para servir e proteger. São {HEROIS.length}{" "}
                policiais militares do 16º BPM/M tombados desde 1975 — clique em cada retrato para
                ler a história.
              </p>
            </Reveal>

            <Reveal>
              <div className="mt-12">
                <Galeria
                  itens={GALERIA_HEROIS}
                  colunas="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                  proporcao="aspect-[3/4]"
                  mostrarTitulo
                  limiteInicial={10}
                  tema="escuro"
                  encaixe="contain"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------ MEMÓRIA */}
        <section id="memoria" className="scroll-mt-28 bg-branco py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal>
              <TituloSecao>Fotos históricas</TituloSecao>
            </Reveal>
            <Reveal>
              <p className="mx-auto mt-6 max-w-2xl text-center text-texto-suave">
                Registros que contam a história do Batalhão desde a Guarda Militar da Cidade
                Universitária. {FOTOS_HISTORICAS.length} imagens do acervo da Unidade.
              </p>
            </Reveal>
            <Reveal>
              <div className="mt-12">
                <Galeria itens={FOTOS_HISTORICAS} limiteInicial={12} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------------- REDES */}
        <section id="redes" className="scroll-mt-28 bg-superficie py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal>
              <TituloSecao>O 16º em ação</TituloSecao>
            </Reveal>
            <Reveal>
              <p className="mx-auto mt-6 max-w-2xl text-center text-texto-suave">
                Operações, resultados e o dia a dia da tropa em primeira mão no Instagram oficial
                do Batalhão.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              {REELS.map((r, i) => (
                <Reveal key={r.src} delay={i * 90}>
                  <figure className="overflow-hidden rounded-2xl border border-borda bg-preto shadow-inst">
                    <video
                      className="aspect-[9/16] w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={r.poster}
                      aria-label={r.titulo}
                    >
                      <source src={r.src} type="video/mp4" />
                    </video>
                    <figcaption className="px-4 py-3 text-sm font-medium text-branco">
                      {r.titulo}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="mt-10 overflow-hidden rounded-2xl bg-azul-noite p-8 md:p-10">
                <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
                  <div>
                    <p className="font-serif text-2xl text-ouro">Acompanhe o 16º BPM/M</p>
                    <p className="mt-1 text-lg font-bold text-branco">@16bpmm_oficial</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <a
                      href="https://www.instagram.com/16bpmm_oficial/reels/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                      <Play size={16} /> Ver os Reels
                    </a>
                    <a
                      href="https://www.instagram.com/16bpmm_oficial/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-branco/30 px-6 py-3 text-sm font-semibold text-branco transition-colors hover:bg-branco/10"
                    >
                      <IgIcon size={16} /> Seguir no Instagram
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------- DOCUMENTOS */}
        <Reveal>
          <DocumentosPublicos16BPMM />
        </Reveal>

        {/* --------------------------------------------- Sala de Operações */}
        <section className="bg-branco py-16">
          <div className="mx-auto max-w-[1100px] px-5">
            <Reveal>
              <Link
                href="/"
                className="group relative flex flex-col items-start gap-6 overflow-hidden rounded-2xl border border-borda shadow-inst md:flex-row md:items-center"
              >
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/media/controle-bg-poster.jpg"
                  aria-hidden
                >
                  <source src="/media/controle-bg.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-r from-azul-noite via-azul-noite/92 to-azul-noite/60" />

                <div className="relative flex-1 p-8 md:p-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ouro">
                    Centro de Controle Operacional
                  </p>
                  <h3 className="mt-3 font-serif text-2xl text-branco md:text-3xl">
                    Sala de Operações do 16º BPM/M
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-branco/75">
                    Do flagrante na câmera à viatura certa, em segundos. Conheça a Sala de
                    Operações do 16º BPM/M, que reúne em tempo real, numa só tela, o que hoje chega
                    separado ao Batalhão.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-vermelho px-6 py-3 text-sm font-bold text-white transition-transform group-hover:-translate-y-0.5">
                    Acessar a Sala de Operações <ExternalLink size={15} />
                  </span>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------ CONTATO */}
        <section id="contato" className="scroll-mt-28 bg-superficie py-20 md:py-24">
          <div className="mx-auto max-w-[1100px] px-5">
            <Reveal>
              <TituloSecao>Fale com o 16º BPM/M</TituloSecao>
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-2xl border border-borda bg-branco p-8 shadow-inst">
                  <h3 className="font-serif text-xl text-azul-noite">Sede do Batalhão</h3>
                  <ul className="mt-5 space-y-3.5 text-sm">
                    <li className="flex items-start gap-3">
                      <MapPin size={17} className="mt-0.5 shrink-0 text-ouro-velho" />
                      <span className="text-texto-suave">
                        Av. Corifeu de Azevedo Marques, 4082
                        <br />
                        Rio Pequeno, São Paulo/SP — CEP 05340-002
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Phone size={17} className="shrink-0 text-ouro-velho" />
                      <span className="text-texto-suave">(11) 3769-2000</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <IgIcon size={17} />
                      <a
                        href="https://www.instagram.com/16bpmm_oficial"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-azul hover:underline"
                      >
                        @16bpmm_oficial
                      </a>
                    </li>
                  </ul>
                  <a
                    href="https://www.google.com/maps/place/16%C2%B0+BPM%2FM+-+SEDE+-+Pol%C3%ADcia+Militar+SP/@-23.5619081,-46.7466108,17z"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-7 inline-block rounded-lg bg-azul px-5 py-2.5 text-sm font-semibold text-branco transition-colors hover:bg-azul-escuro"
                  >
                    Ver no Google Maps
                  </a>
                </div>
              </Reveal>

              <Reveal delay={100}>
                <div className="h-full rounded-2xl border border-borda bg-branco p-8 shadow-inst">
                  <h3 className="font-serif text-xl text-azul-noite">Serviços</h3>
                  <p className="mt-2 text-sm text-texto-suave">
                    Sistemas internos da Corporação. Os endereços abaixo só abrem a partir da rede
                    da PMESP.
                  </p>
                  <ul className="mt-5 space-y-2">
                    {SERVICOS.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 rounded-lg border border-borda px-4 py-3 text-sm font-medium text-azul-noite transition-colors hover:border-azul/30 hover:bg-superficie"
                        >
                          {s.nome}
                          <ExternalLink size={14} className="shrink-0 text-texto-suave" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-5 space-y-2 border-t border-borda pt-5 text-sm">
                    {COMPANHIAS.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Mail size={14} className="shrink-0 text-ouro-velho" />
                        <span className="font-semibold text-azul-noite">{c.nome}:</span>
                        <span className="text-texto-suave">{c.telefone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------- RODAPÉ */}
      <footer className="bg-azul-noite text-branco">
        <div className="faixa-institucional h-1 w-full" />
        <div className="mx-auto max-w-[1200px] px-5 py-14">
          <div className="grid gap-10 md:grid-cols-[auto_1fr_1fr]">
            <Image
              src="/16bpmm/geral/brasao.png"
              alt="Brasão do 16º BPM/M"
              width={200}
              height={280}
              className="h-auto w-[110px]"
            />

            <div>
              <h3 className="font-serif text-lg text-ouro">16º BPM/M</h3>
              <p className="mt-3 text-sm leading-relaxed text-branco/70">
                16º Batalhão de Polícia Militar Metropolitano
                <br />
                1º Ten PM Fernão Gomes Loureiro
              </p>
              <p className="mt-3 text-sm leading-relaxed text-branco/70">
                Av. Corifeu de Azevedo Marques, 4082
                <br />
                Rio Pequeno, São Paulo/SP — CEP 05340-002
                <br />
                (11) 3769-2000
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg text-ouro">Navegação</h3>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-branco/70">
                <li>
                  <a href="#historico" className="hover:text-ouro">
                    Histórico
                  </a>
                </li>
                <li>
                  <a href="#brasao" className="hover:text-ouro">
                    Brasão
                  </a>
                </li>
                <li>
                  <a href="#patrono" className="hover:text-ouro">
                    Patrono
                  </a>
                </li>
                <li>
                  <a href="#comandante" className="hover:text-ouro">
                    Comandante
                  </a>
                </li>
                <li>
                  <a href="#companhias" className="hover:text-ouro">
                    Companhias
                  </a>
                </li>
                <li>
                  <a href="#herois" className="hover:text-ouro">
                    Galeria de Heróis
                  </a>
                </li>
                <li>
                  <a href="#memoria" className="hover:text-ouro">
                    Fotos históricas
                  </a>
                </li>
                <li>
                  <Link href="/16bpmm/calendario" className="hover:text-ouro">
                    Calendário de eventos
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-ouro">
                    Sala de Operações
                  </Link>
                </li>
              </ul>
              {/* O logotipo oficial "Rumo aos 200 Anos" é preto sobre fundo
                  transparente — desenhado para fundo claro. Sobre o azul-noite
                  ele sumia, então vai sobre um cartão branco, sem alterar a
                  marca. */}
              <a
                href="https://www.policiamilitar.sp.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-lg bg-white px-4 py-3 transition-transform hover:-translate-y-0.5"
              >
                <Image
                  src="/16bpmm/geral/logotipo.png"
                  alt="Polícia Militar do Estado de São Paulo — Rumo aos 200 Anos"
                  width={400}
                  height={120}
                  className="h-auto w-[170px]"
                />
              </a>
            </div>
          </div>

          <p className="mt-12 border-t border-branco/15 pt-8 text-center font-serif text-base italic leading-relaxed text-branco/75">
            “Nós, Policiais Militares, sob a proteção de Deus, estamos compromissados com a Defesa
            da Vida, da Integridade Física e da Dignidade da Pessoa Humana.”
          </p>

          <p className="mt-8 text-center text-xs text-branco/40">
            © 2026 Polícia Militar do Estado de São Paulo — 16º Batalhão de Polícia Militar
            Metropolitano
          </p>
        </div>
      </footer>

      {/* Botões de vitrine: a pilha de acesso rápido volta a aparecer, mas sem
          navegação — cada endereço é passado à tropa pelo canal próprio. */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <span className="animar-flutua flex cursor-default items-center gap-2.5 rounded-full border border-vermelho/40 bg-vermelho/95 px-5 py-3.5 text-sm font-semibold text-branco shadow-inst backdrop-blur">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-branco text-vermelho">
            <Video size={16} strokeWidth={2.25} />
          </span>
          <span className="hidden sm:block">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-branco/85">
              Auditoria de COP 2026
            </span>
            <span className="block leading-tight">Lançar e acompanhar</span>
          </span>
        </span>

        <span className="animar-flutua flex cursor-default items-center gap-2.5 rounded-full border border-branco/15 bg-azul-noite/95 px-5 py-3.5 text-sm font-semibold text-branco shadow-inst backdrop-blur">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ouro text-azul-noite">
            <Boxes size={16} strokeWidth={2.25} />
          </span>
          <span className="hidden sm:block">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-ouro">
              Inventário 2026 · com chave
            </span>
            <span className="block leading-tight">Todas as frações</span>
          </span>
        </span>

        <span className="animar-flutua flex cursor-default items-center gap-2.5 rounded-full border border-branco/15 bg-azul-noite/95 px-5 py-3.5 text-sm font-semibold text-branco shadow-inst backdrop-blur">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ouro text-azul-noite">
            <FileSpreadsheet size={16} strokeWidth={2.25} />
          </span>
          <span className="hidden sm:block">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-ouro">
              Setor Administrativo · restrito
            </span>
            <span className="block leading-tight">Entrar com credencial</span>
          </span>
        </span>
      </div>
    </>
  );
}
