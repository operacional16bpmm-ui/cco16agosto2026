import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GraduationCap,
  Landmark,
  Mail,
  MapPin,
  Medal,
  UserPlus,
} from "lucide-react";
import { Reveal } from "@/components/public/reveal";
import { BotaoCopiarEmail } from "@/components/publico16/botao-copiar-email";
import { CalendarioEventos } from "@/components/publico16/calendario-eventos";
import { ContagemRegressiva } from "@/components/publico16/contagem-regressiva";
import { COMPANHIAS } from "@/lib/dados-16bpmm";
import {
  AGENDA_PERMANENTE,
  CATEGORIAS,
  DESTAQUES,
  EVENTOS,
} from "@/lib/dados-calendario-16bpmm";
import { SECOES_DOCUMENTOS } from "@/lib/secoes-documentos";

/* ============================================================================
   CALENDÁRIO DE EVENTOS DO 16º BPM/M
   Agenda pública da Unidade numa página só: no topo, a Agenda Oficial — um
   Google Agenda de verdade (operacional16bpmm@gmail.com), alimentado por todas
   as Companhias e Seções — com o tutorial de como lançar um evento nela logo
   abaixo. Depois, os destaques fixos do Batalhão e a agenda permanente.
   Os eventos fixos (feriados, datas magnas, CONSEGs já confirmados) são
   lançados em lib/dados-calendario-16bpmm.ts; os compromissos de cada fração
   entram direto pelo Google Agenda, sem precisar mexer em código.
   ============================================================================ */

const HOST = "https://16bpmm-pmesp.vercel.app";
const TITULO = "Calendário de Eventos · 16º BPM/M";
const RESUMO =
  "A agenda oficial e colaborativa do 16º BPM/M, alimentada por todas as Companhias e Seções: reuniões de valorização, CONSEGs, datas comemorativas e feriados. Em evidência, os 63 anos do Batalhão em 06 de dezembro.";

// E-mail que recebe o convite de todo evento lançado por Companhias e Seções.
// É o "src" do Google Agenda incorporado logo abaixo — mudar aqui já troca o
// endereço em todo o embed, no link de inscrição e no texto exibido, porque
// URL_EMBED_AGENDA e URL_INSCREVER_AGENDA são derivados desta constante.
// Confirmado com compartilhamento público ativo em 04/08/2026.
const EMAIL_AGENDA_OFICIAL = "operacional16bpmm@gmail.com";
const SRC_GOOGLE_AGENDA = encodeURIComponent(EMAIL_AGENDA_OFICIAL);
const URL_EMBED_AGENDA = `https://calendar.google.com/calendar/embed?src=${SRC_GOOGLE_AGENDA}&ctz=America%2FSao_Paulo&mode=MONTH&showTitle=0&showPrint=0&showCalendars=0&showTz=0`;
const URL_INSCREVER_AGENDA = `https://calendar.google.com/calendar/render?cid=${SRC_GOOGLE_AGENDA}`;

export const metadata: Metadata = {
  title: TITULO,
  description: RESUMO,
  alternates: { canonical: `${HOST}/16bpmm/calendario` },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "16º BPM/M",
    url: `${HOST}/16bpmm/calendario`,
    title: TITULO,
    description: RESUMO,
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: RESUMO,
  },
};

const ICONES_DESTAQUE = {
  "aniversario-btl": CalendarDays,
  patrono: Medal,
  "aniversario-pmesp": Landmark,
  "ferias-escolares": GraduationCap,
} as const;

const PASSOS_TUTORIAL = [
  {
    icone: Mail,
    titulo: "Abra o Google Agenda da sua fração",
    texto:
      "Entre no Google Agenda com o e-mail institucional da sua Companhia ou Seção, o mesmo usado no dia a dia.",
  },
  {
    icone: CalendarPlus,
    titulo: "Crie o evento",
    texto:
      "Título, data, horário e local completos. Capriche na descrição — quem vai ler é o Comando inteiro do Batalhão.",
  },
  {
    icone: UserPlus,
    titulo: "Convide a Agenda Oficial",
    texto: `No campo “Convidados”, adicione ${EMAIL_AGENDA_OFICIAL} e clique em salvar/enviar convite.`,
  },
  {
    icone: CheckCircle2,
    titulo: "Pronto",
    texto:
      "Assim que o convite for aceito, o evento aparece sozinho aqui em cima, para todo o Comando acompanhar.",
  },
];

// Seções do Estado-Maior que lançam a própria agenda — mesma lista de
// lib/secoes-documentos.ts (fonte única), sem repetir aqui o rótulo à mão.
// Excluídas: "publico" (não é seção), e as Companhias/Cia FT, que têm e-mail
// institucional confirmado e já entram na lista de COMPANHIAS logo abaixo.
const VALORES_FORA_DO_TUTORIAL = new Set([
  "publico",
  "cia_1",
  "cia_2",
  "cia_3",
  "cia_4",
  "cia_ft",
  "forca_tatica",
]);
const SECOES_ESTADO_MAIOR = SECOES_DOCUMENTOS.filter(
  (s) => !VALORES_FORA_DO_TUTORIAL.has(s.valor)
);

export default function CalendarioPagina() {
  const [aniversario, ...demaisDestaques] = DESTAQUES;

  return (
    <>
      {/* ------------------------------------------------------- CABEÇALHO */}
      <header className="sticky top-0 z-50 border-b border-branco/10 bg-azul-noite/95 backdrop-blur">
        <div className="faixa-institucional h-1 w-full" />
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <Link href="/16bpmm" className="flex items-center gap-3.5">
            <Image
              src="/16bpmm/geral/brasao.png"
              alt="Brasão do 16º BPM/M"
              width={64}
              height={90}
              className="h-12 w-auto md:h-14"
              priority
            />
            <span className="leading-tight">
              <span className="block font-serif text-lg text-ouro md:text-xl">16º BPM/M</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-branco/70 md:text-xs">
                Calendário de Eventos
              </span>
            </span>
          </Link>

          <Link
            href="/16bpmm"
            className="inline-flex items-center gap-1.5 rounded-md border border-branco/25 px-3.5 py-2 text-xs font-semibold text-branco transition-colors hover:bg-branco/10"
          >
            <ArrowLeft size={14} /> Página oficial
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ------------------------------------------------------- ABERTURA */}
        <section className="bg-gradient-to-br from-azul-noite via-azul-noite to-azul-escuro py-16 text-branco md:py-20">
          <div className="mx-auto max-w-[1200px] px-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ouro">
              16º Batalhão de Polícia Militar Metropolitano
            </p>
            <h1 className="mt-4 font-serif text-4xl uppercase tracking-wide text-ouro md:text-5xl">
              Calendário de Eventos
            </h1>
            <div className="mx-auto mt-5 h-1 w-24 rounded-full bg-ouro-velho" />
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-branco/80">
              A agenda do Batalhão num lugar só, alimentada em conjunto por todas as Companhias e
              Seções: reuniões de valorização, CONSEGs da circunscrição, datas comemorativas,
              feriados e os compromissos de cada fração. O que está aqui é o que vale para o
              Comando inteiro.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------- AGENDA OFICIAL */}
        <section id="agenda-oficial" className="scroll-mt-20 bg-superficie py-16 md:py-20">
          <div className="mx-auto max-w-[1100px] px-5">
            <Reveal>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vermelho">
                  Ao vivo, direto do Google Agenda
                </p>
                <h2 className="mt-3 font-serif text-3xl uppercase tracking-wide text-azul-noite md:text-4xl">
                  Agenda Oficial do 16º BPM/M
                </h2>
                <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-ouro-velho" />
                <p className="mx-auto mt-6 max-w-2xl text-texto-suave">
                  Cada Companhia e cada Seção do Estado-Maior lança os próprios compromissos
                  direto na sua agenda. Não existe agenda paralela: o que entra aqui é o que o
                  Comando enxerga.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div className="mt-10 overflow-hidden rounded-2xl border border-borda bg-branco shadow-inst">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borda bg-superficie px-5 py-3.5">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-azul-noite">
                    <CalendarDays size={15} className="text-ouro-velho" /> {EMAIL_AGENDA_OFICIAL}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={URL_INSCREVER_AGENDA}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-xs font-semibold text-texto-suave transition-colors hover:border-azul/40 hover:text-azul"
                    >
                      <CalendarPlus size={13} /> Adicionar à minha agenda
                    </a>
                    <a
                      href={URL_EMBED_AGENDA}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-xs font-semibold text-texto-suave transition-colors hover:border-azul/40 hover:text-azul"
                    >
                      <ExternalLink size={13} /> Tela cheia
                    </a>
                  </div>
                </div>

                <iframe
                  src={URL_EMBED_AGENDA}
                  title="Agenda oficial do 16º BPM/M no Google Agenda"
                  width="100%"
                  height="680"
                  style={{ border: 0, display: "block" }}
                  loading="lazy"
                />
              </div>
            </Reveal>

            <Reveal>
              <p className="mt-4 text-center text-xs leading-relaxed text-texto-suave">
                Não está vendo nenhum evento? A agenda pode estar recém-criada ou fora do ar por
                instantes. Recarregue a página ou abra em{" "}
                <a
                  href={URL_EMBED_AGENDA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-azul hover:underline"
                >
                  tela cheia
                </a>
                .
              </p>
            </Reveal>

            <Reveal>
              <div className="mt-8 text-center">
                <a
                  href="#como-lancar"
                  className="inline-flex items-center gap-2 rounded-lg bg-azul-noite px-6 py-3 text-sm font-bold text-branco shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Veja como lançar um evento aqui <ArrowDown size={15} />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------- COMO LANÇAR */}
        <section id="como-lancar" className="scroll-mt-20 bg-branco py-16 md:py-20">
          <div className="mx-auto max-w-[1100px] px-5">
            <Reveal>
              <div className="text-center">
                <h2 className="font-serif text-3xl uppercase tracking-wide text-azul-noite md:text-4xl">
                  Como lançar um evento na Agenda Oficial
                </h2>
                <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-ouro-velho" />
                <p className="mx-auto mt-6 max-w-2xl text-texto-suave">
                  Sem planilha, sem pedir para terceiro lançar. Cada Companhia e cada Seção cria o
                  evento na própria agenda e convida a Agenda Oficial. Quatro passos.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PASSOS_TUTORIAL.map((passo, i) => {
                const Icone = passo.icone;
                return (
                  <Reveal key={passo.titulo} delay={i * 80}>
                    <div className="relative flex h-full flex-col rounded-2xl border border-borda bg-superficie p-6 shadow-inst">
                      <span className="dados-destaque text-3xl text-borda">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl bg-azul-noite text-ouro">
                        <Icone size={20} />
                      </span>
                      <h3 className="mt-4 text-sm font-bold leading-snug text-azul-noite">
                        {passo.titulo}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-texto-suave">
                        {passo.texto}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal>
              <div className="mt-8 overflow-hidden rounded-2xl bg-azul-noite p-7 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ouro">
                  E-mail para convidar no evento
                </p>
                <div className="mt-4">
                  <BotaoCopiarEmail email={EMAIL_AGENDA_OFICIAL} />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-branco/60">
                  Cole exatamente este endereço no campo “Convidados” do Google Agenda. Convite
                  aceito é evento publicado — sem isso, o evento fica só na agenda da sua fração.
                </p>
              </div>
            </Reveal>

            {/* --------------------------------------------- QUEM LANÇA O QUÊ */}
            <div className="mt-14 grid gap-10 md:grid-cols-2">
              <Reveal>
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-vermelho">
                    <Mail size={15} /> Companhias e Força Tática
                  </h3>
                  <p className="mt-2 text-xs text-texto-suave">
                    E-mail institucional de cada fração — o mesmo do cabeçalho e do rodapé desta
                    página.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {COMPANHIAS.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-0.5 rounded-lg border border-borda bg-superficie px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                      >
                        <span className="text-sm font-semibold text-azul-noite">
                          {c.nome}
                          <span className="ml-1.5 font-normal text-texto-suave">— {c.area}</span>
                        </span>
                        <span className="font-mono text-xs text-texto-suave">{c.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-vermelho">
                    <Mail size={15} /> Seções do Estado-Maior
                  </h3>
                  <p className="mt-2 text-xs text-texto-suave">
                    Use o e-mail institucional já cadastrado da própria Seção. Endereços não
                    publicados aqui de propósito: confirme o correto com cada chefia antes de
                    convidar.
                  </p>
                  <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SECOES_ESTADO_MAIOR.map((s) => (
                      <li
                        key={s.valor}
                        className="rounded-lg border border-borda bg-superficie px-4 py-2.5 text-sm font-semibold text-azul-noite"
                      >
                        {s.rotulo}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- EM EVIDÊNCIA */}
        <section className="bg-superficie py-16 md:py-20">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal>
              <div className="text-center">
                <h2 className="font-serif text-3xl uppercase tracking-wide text-azul-noite md:text-4xl">
                  Datas em evidência
                </h2>
                <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-ouro-velho" />
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {/* Aniversário do Batalhão: o destaque dos destaques, em cartão
                  escuro de largura dupla, com o brasão ao lado. */}
              <Reveal className="md:col-span-2 lg:col-span-3">
                <div className="overflow-hidden rounded-2xl bg-azul-noite shadow-inst">
                  <div className="faixa-institucional h-1 w-full" />
                  <div className="flex flex-col items-center gap-8 p-8 text-center md:flex-row md:p-10 md:text-left">
                    <Image
                      src="/16bpmm/geral/brasao.png"
                      alt="Brasão de armas do 16º BPM/M"
                      width={200}
                      height={280}
                      className="animar-brasao-destaque h-auto w-[120px] md:w-[150px]"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ouro">
                          {aniversario.titulo}
                        </p>
                        <ContagemRegressiva datas={aniversario.proximas} />
                      </div>
                      <p className="mt-3 font-serif text-4xl text-branco md:text-5xl">
                        {aniversario.dataRotulo}
                      </p>
                      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-branco/75 md:mx-0 md:text-[15px]">
                        {aniversario.detalhe}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>

              {demaisDestaques.map((d, i) => {
                const Icone = ICONES_DESTAQUE[d.id];
                return (
                  <Reveal key={d.id} delay={i * 80}>
                    <div className="flex h-full flex-col rounded-2xl border border-borda bg-branco p-7 shadow-inst">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-azul-noite text-ouro">
                          <Icone size={22} />
                        </span>
                        <ContagemRegressiva datas={d.proximas} />
                      </div>
                      <h3 className="mt-4 font-serif text-xl text-azul-noite">{d.titulo}</h3>
                      <p className="tempo mt-1 text-sm font-bold text-vermelho">{d.dataRotulo}</p>
                      <p className="mt-3 text-sm leading-relaxed text-texto-suave">{d.detalhe}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- CALENDÁRIO */}
        <section className="bg-branco py-16 md:py-20">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal>
              <div className="text-center">
                <h2 className="font-serif text-3xl uppercase tracking-wide text-azul-noite md:text-4xl">
                  Datas fixas do Batalhão
                </h2>
                <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-ouro-velho" />
                <p className="mx-auto mt-6 max-w-2xl text-texto-suave">
                  Feriados, datas magnas e os CONSEGs já confirmados, num quadro de referência
                  rápida. Compromissos específicos de cada fração entram pela Agenda Oficial, no
                  topo desta página.
                </p>
              </div>
            </Reveal>

            <div className="mt-12">
              <CalendarioEventos eventos={EVENTOS} />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------- AGENDA PERMANENTE */}
        <section className="bg-superficie py-16 md:py-20">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal>
              <div className="text-center">
                <h2 className="font-serif text-3xl uppercase tracking-wide text-azul-noite md:text-4xl">
                  Agenda permanente
                </h2>
                <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-ouro-velho" />
                <p className="mx-auto mt-6 max-w-2xl text-texto-suave">
                  Compromissos que se repetem todo mês. As reuniões dos CONSEGs são abertas à
                  população: participe e leve as demandas de segurança do seu bairro.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {AGENDA_PERMANENTE.map((item, i) => {
                const cat = CATEGORIAS[item.categoria];
                return (
                  <Reveal key={item.titulo} delay={i * 80}>
                    <div className="h-full rounded-2xl border border-borda bg-branco p-7 shadow-inst">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.selo}`}
                      >
                        {cat.rotulo}
                      </span>
                      <h3 className="mt-3 font-serif text-xl text-azul-noite">{item.titulo}</h3>
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-texto">
                        <Clock3 size={15} className="shrink-0 text-ouro-velho" /> {item.quando}
                      </p>
                      {item.onde && (
                        <p className="mt-2 flex items-start gap-2 text-sm leading-snug text-texto-suave">
                          <MapPin size={15} className="mt-0.5 shrink-0 text-ouro-velho" />{" "}
                          {item.onde}
                        </p>
                      )}
                      {item.observacao && (
                        <p className="mt-3 text-sm leading-relaxed text-texto-suave">
                          {item.observacao}
                        </p>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal>
              <div className="mt-10 rounded-2xl bg-azul-noite p-8 text-center md:p-10">
                <p className="font-serif text-2xl text-ouro">CONSEGs da circunscrição</p>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-branco/75">
                  A agenda completa dos Conselhos Comunitários de Segurança da área do Batalhão é
                  mantida pela P/5 (Comunicação Social) e pela Coordenadoria Estadual dos CONSEGs.
                  Datas e locais podem mudar: confirme antes de divulgar.
                </p>
                <a
                  href="https://www.policiamilitar.sp.gov.br/comunidade/conseg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ouro-velho px-6 py-3 text-sm font-bold text-azul-noite shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Portal dos CONSEGs <ExternalLink size={15} />
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- RODAPÉ */}
      <footer className="bg-azul-noite text-branco">
        <div className="faixa-institucional h-1 w-full" />
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-5 py-10 text-center">
          <Image
            src="/16bpmm/geral/brasao.png"
            alt="Brasão do 16º BPM/M"
            width={120}
            height={168}
            className="h-auto w-[70px]"
          />
          <p className="text-sm text-branco/70">
            16º Batalhão de Polícia Militar Metropolitano · 1º Ten PM Fernão Gomes Loureiro
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a href="#agenda-oficial" className="font-semibold text-ouro hover:underline">
              Agenda Oficial
            </a>
            <span className="text-branco/30">·</span>
            <a href="#como-lancar" className="font-semibold text-ouro hover:underline">
              Como lançar um evento
            </a>
            <span className="text-branco/30">·</span>
            <Link href="/16bpmm" className="font-semibold text-ouro hover:underline">
              Página oficial
            </Link>
          </div>
          <p className="mt-4 text-xs text-branco/40">
            © 2026 Polícia Militar do Estado de São Paulo · 16º BPM/M
          </p>
        </div>
      </footer>
    </>
  );
}
