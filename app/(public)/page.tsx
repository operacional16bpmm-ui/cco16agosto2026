import Image from "next/image";
import Link from "next/link";
import {
  Crosshair,
  Link2,
  Scale,
  Play,
  Boxes,
  KeyRound,
  Video,
  MapPin,
  Coins,
  Globe2,
} from "lucide-react";
import { Reveal } from "@/components/public/reveal";
import { Icone } from "@/components/public/icone";
import { TrafficCamGrid } from "@/components/public/traffic-cam-grid";
import { ProblemaChart } from "@/components/public/problema-chart";
import {
  DenunciasNaturezaChart,
  ImpactoMensalChart,
} from "@/components/public/territorio-chart";
import type { Metadata } from "next";
import { CicloFlow } from "@/components/public/ciclo-flow";
import { getComunicacao } from "@/lib/db";

// Raiz do portal, servida também em 16bpmmoperacao.vercel.app (mesmo deploy,
// sem reescrita: a raiz já é o painel operacional). O cartão de
// compartilhamento usa aquele domínio, que é o divulgado ao efetivo.
const HOST = "https://16bpmmoperacao.vercel.app";
const TITULO = "Sala de Operações do 16º BPM/M";
const RESUMO =
  "Câmeras e alertas numa tela só. Da câmera que vê à viatura que chega, em segundos.";

export const metadata: Metadata = {
  title: TITULO,
  description: RESUMO,
  alternates: { canonical: HOST },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Sala de Operações do 16º BPM/M",
    url: HOST,
    title: TITULO,
    description: RESUMO,
    images: [
      {
        url: `${HOST}/og/operacao.png`,
        width: 1200,
        height: 630,
        alt: "Brasão do 16º BPM/M sobre fundo azul institucional, com o título Sala de Operações",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: RESUMO,
    images: [`${HOST}/og/operacao.png`],
  },
};

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

/* ============================================================================
   PORTA 1 — VITRINE PÚBLICA da Sala de Operações
   Conteúdo institucional de vitrine. Sem fonte, método ou dado sensível.
   Público-alvo: tropa do 16º BPM/M e Comando (pré-lançamento).
   ============================================================================ */

const CICLO = [
  {
    hora: "14:32:00",
    titulo: "A câmera vê",
    texto:
      "Uma câmera reconhece a placa de um carro roubado circulando na nossa área.",
  },
  {
    hora: "14:32:01",
    titulo: "O alerta chega à Sala de Operações",
    texto:
      "Em um segundo o alerta aparece na tela: onde o carro está, para que lado segue e a foto dele.",
  },
  {
    hora: "14:32:03",
    titulo: "O sistema cruza os dados",
    texto:
      "Na mesma tela, o operador vê quem está de serviço agora e qual viatura cobre aquele setor.",
  },
  {
    hora: "14:32:15",
    titulo: "O operador decide",
    texto:
      "A tecnologia sugere, o policial decide. A ordem desce pela cadeia de comando até a equipe do setor.",
  },
  {
    hora: "14:32:40",
    titulo: "A equipe recebe tudo",
    texto:
      "A equipe mais próxima recebe tudo o que precisa para agir: foto, placa e o caminho que o carro fez.",
  },
  {
    hora: "14:3X",
    titulo: "Interceptação",
    texto:
      "As câmeras acompanham enquanto a equipe se aproxima. A Sala de Operações não substitui o 190: ela dá velocidade ao que já existe.",
  },
];

const INDICADORES = [
  { valor: "+231%", rotulo: "Abordagens de carros", nota: "esforço em alta", tom: "neutro" },
  { valor: "+546%", rotulo: "Apreensão de entorpecentes", nota: "esforço em alta", tom: "neutro" },
  { valor: "−37%", rotulo: "Veículos recuperados", nota: "resultado em queda", tom: "alerta" },
  { valor: "−27%", rotulo: "Flagrantes", nota: "resultado em queda", tom: "alerta" },
];

const CONTROLE_OPERACIONAL = {
  titulo: "Controle Operacional nas mãos dos Comandantes",
  texto:
    "Um sistema integrado coloca a tecnologia na palma da mão dos comandantes do 16º BPM/M. Em tempo real, é possível visualizar o efetivo disponível atendendo a população, o total de viaturas em operação e os motivos de indisponibilidade — uma viatura baixada ou um policial afastado por convalescença —, trazendo clareza imediata para a tomada de decisão. O mesmo vale para as condições de armamento, munição e demais insumos essenciais ao serviço. Como ensina a doutrina, o trinômio Homem, Equipamento e Treinamento chega agora, de forma imediata, aos gestores da nossa unidade.",
};

const RESULTADOS_COMUNIDADE = [
  { valor: "4.093", rotulo: "Denúncias atendidas", nota: "82,5% já verificadas e encerradas" },
  { valor: "292", rotulo: "Capturas e recapturas", nota: "Alvos retirados de circulação" },
  { valor: "272", rotulo: "Prisões — Operação Impacto", nota: "nov/2025 a jul/2026" },
];

// Resultado em linguagem de vitrine: o que a população percebe na rua, sem
// método, sem fonte e sem detalhe operacional.
const FOCO_REAL_PARQUE = [
  "Presença diária e policiamento reforçado nas áreas de maior demanda.",
  "Quadrilhas desarticuladas e bens recuperados e devolvidos às vítimas.",
  "Redução da criminalidade também nas áreas vizinhas, por efeito das operações.",
];

const FASES = [
  { fase: "Fase 0", nome: "Formalização", prazo: "30 dias", texto: "Ofício ao Comando, oficial responsável, cadastro dos operadores e medição do ponto de partida." },
  { fase: "Fase 1", nome: "Piloto 12h", prazo: "90 dias", texto: "Sala funcionando das 07h às 19h, com acompanhamento em tela e os primeiros casos registrados." },
  { fase: "Fase 2", nome: "Integração e App", prazo: "180 dias", texto: "Cruzamento automático dos dados, aplicativo de comando e relatórios prontos para a tropa." },
  { fase: "Fase 3", nome: "24 horas e parcerias", prazo: "12 meses", texto: "Funcionamento 24 horas, parcerias com o transporte público e integração com os batalhões vizinhos." },
];

export default async function VitrinePage() {
  const comunicacao = await getComunicacao();
  const s = comunicacao?.snapshot;
  const kpisReais = s
    ? [
        { v: s.seguidores.toLocaleString("pt-BR"), r: "Seguidores" },
        { v: s.visualizacoes_90d, r: "Visualizações · 90 dias" },
        { v: s.contas_alcancadas, r: "Contas alcançadas" },
        { v: s.interacoes, r: "Interações" },
        { v: s.visitas_perfil, r: "Visitas ao perfil" },
        { v: `${s.alcance_fora_base_pct}%`, r: "Alcance fora da base" },
      ]
    : [
        { v: "30.353", r: "Seguidores" },
        { v: "3,04 mi", r: "Visualizações · 90 dias" },
        { v: "796 mil", r: "Contas alcançadas" },
        { v: "184 mil", r: "Interações" },
        { v: "35 mil", r: "Visitas ao perfil" },
        { v: "70%", r: "Alcance fora da base" },
      ];
  const imprensaReal = comunicacao?.imprensa?.length
    ? comunicacao.imprensa.map((v: any) => v.veiculo)
    : ["CNN Brasil", "Agência Brasil", "Band", "Rádio Itatiaia", "Diário do Grande ABC", "Jornal de Brasília", "Guarulhos em Destaque", "Opina News"];
  const parceriasReal = comunicacao?.parcerias?.length
    ? comunicacao.parcerias.map((p: any) => ({ t: p.titulo, d: p.descricao }))
    : [
        { t: "Comunicação Social PMESP", d: "Mais de 9 matérias sobre o 16º no Portal de Notícias da PMESP no período." },
        { t: "SSP-SP · Polícia Civil · Interpol", d: "Amplificação do cartaz de procurado — recompensa de R$ 50 mil e lista vermelha da Interpol." },
        { t: "Prefeitura de São Paulo", d: "Apoio com máquinas e equipes na remoção de lombadas irregulares em Paraisópolis." },
      ];

  return (
    <>
      {/* Cabeçalho fixo */}
      <header className="sticky top-0 z-50 backdrop-blur bg-branco/85 border-b border-borda">
        <div className="faixa-institucional h-1 w-full" />
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <a href="#topo" className="flex items-center gap-5">
            <Image
              src="/brand/16bpmm.png"
              alt="Brasão do 16º BPM/M"
              width={100}
              height={141}
              className="animar-brasao-destaque h-28 w-auto md:h-32"
              priority
            />
            <span className="leading-none">
              <span className="block text-3xl font-black tracking-tight text-azul-noite md:text-4xl">
                SALA DE OPERAÇÕES
              </span>
              <span className="mt-2 block text-xs font-bold uppercase tracking-[0.24em] text-texto-suave md:text-sm">
                Diretriz nº PM3-001/02/23
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-5 text-sm font-medium text-texto-suave xl:flex">
            <a href="#acao" className="hover:text-azul">Em ação</a>
            <a href="#tecnologia" className="hover:text-azul">Tecnologia</a>
            <a href="#problema" className="hover:text-azul">O problema</a>
            <a href="#ciclo" className="hover:text-azul">O ciclo 14h32</a>
            <a href="#provas" className="hover:text-azul">Já existe</a>
            <a href="#territorio" className="hover:text-azul">Território</a>
            <a href="#reconhecimento" className="hover:text-azul">Números</a>
            <a href="#implantacao" className="hover:text-azul">Implantação</a>
            <a href="#redes" className="hover:text-azul">Redes</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <span
              aria-disabled="true"
              className="hidden cursor-default items-center gap-1.5 rounded-md border border-azul/25 bg-azul px-3.5 py-2 text-xs font-semibold text-branco shadow-inst md:inline-flex"
              title="Acesso pela credencial do Batalhão"
            >
              Sala de Comando →
            </span>
            <Link
              href="/16bpmm"
              className="hidden items-center gap-1.5 rounded-md border border-azul-noite/20 bg-azul-noite/5 px-3 py-2 text-xs font-semibold text-azul-noite transition-colors hover:bg-azul-noite/10 md:inline-flex"
            >
              <Image src="/brand/16bpmm.png" alt="" width={16} height={22} className="h-4 w-auto" aria-hidden />
              Página do 16º BPM/M →
            </Link>
          </div>
        </div>
      </header>

      <main id="topo" className="flex-1">
        {/* HERO — vídeo real do 16º em operação (mudo, em loop) */}
        <section className="relative overflow-hidden text-branco">
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
          {/* Camadas de legibilidade sobre o vídeo */}
          <div className="absolute inset-0 bg-gradient-to-br from-azul-noite/95 via-azul-noite/85 to-azul-noite/55" />
          <div className="absolute inset-0 bg-azul-noite/25" />

          <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 py-24 md:grid-cols-[1.5fr_1fr] md:py-32">
            <div>
              <Reveal>
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-branco/20 bg-branco/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-ouro backdrop-blur">
                  16º BPM/M · 1º Ten PM Fernão Gomes Loureiro
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="text-balance text-4xl font-extrabold leading-[1.03] tracking-tight drop-shadow-lg md:text-6xl lg:text-7xl">
                  SALA DE OPERAÇÕES
                </h1>
                <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-branco/70">
                  Diretriz nº PM3-001/02/23
                </p>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-branco/85 drop-shadow">
                  A <strong className="text-branco">Sala de Operações do 16º BPM/M</strong> reúne
                  numa tela só o que hoje chega em pedaços — e entrega pronto para a viatura mais
                  próxima, na hora certa.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <a
                    href="#ciclo"
                    className="rounded-md bg-vermelho px-6 py-3 text-sm font-semibold text-branco shadow-inst transition-transform hover:-translate-y-0.5"
                  >
                    Ver o ciclo em ação
                  </a>
                  <a
                    href="#problema"
                    className="rounded-md border border-branco/30 bg-branco/5 px-6 py-3 text-sm font-semibold text-branco backdrop-blur transition-colors hover:bg-branco/10"
                  >
                    Por que agora
                  </a>
                </div>
              </Reveal>

              <Reveal delay={320}>
                <div className="mt-10 flex flex-wrap items-center gap-2.5">
                  {[
                    { Icon: Crosshair, label: "Resposta em segundos" },
                    { Icon: Link2, label: "Flagrante qualificado" },
                    { Icon: Scale, label: "Prova com custódia" },
                  ].map(({ Icon, label }, i) => (
                    <span
                      key={label}
                      style={{ animationDelay: `${i * 0.35}s` }}
                      className="animar-flutua inline-flex items-center gap-2 rounded-full border border-branco/20 bg-branco/10 px-3.5 py-1.5 text-xs font-semibold text-branco backdrop-blur"
                    >
                      <Icon size={15} className="text-ouro" strokeWidth={2.25} />
                      {label}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={200} className="justify-self-center">
              <Image
                src="/brand/16bpmm.png"
                alt="Brasão do 16º BPM/M — 1º Ten PM Fernão Gomes Loureiro"
                width={340}
                height={481}
                className="h-auto w-48 drop-shadow-2xl md:w-56 lg:w-64"
                priority
              />
            </Reveal>
          </div>
          <div className="faixa-institucional h-1.5 w-full" />
        </section>

        {/* FAIXA DE FOTOS REAIS — o 16º em ação */}
        <section className="bg-preto">
          <div className="mx-auto max-w-[1440px] px-5 py-4">
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { src: "/media/foto-viatura.jpg", alt: "Viatura M-16005 do 16º BPM/M em operação" },
                { src: "/media/foto-oficial.jpg", alt: "Policial militar do 16º BPM/M em operação" },
                { src: "/media/foto-rua.jpg", alt: "Operação do 16º BPM/M em Paraisópolis" },
              ].map((f) => (
                <div key={f.src} className="relative aspect-video overflow-hidden rounded-lg">
                  <Image src={f.src} alt={f.alt} fill className="object-cover" sizes="(max-width:768px) 33vw, 380px" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] uppercase tracking-wider text-branco/35">
              Operação Paraisópolis · imagens reais do 16º BPM/M
            </p>
          </div>
        </section>

        {/* O 16º EM AÇÃO — reels reais */}
        <section id="acao" className="bg-branco py-20 md:py-24">
          <div className="mx-auto max-w-[1440px] px-5">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-vermelho">
                O 16º em ação
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
                Resultado que a tropa vê na rua.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-texto-suave">
                O trabalho do 16º BPM/M na rua, todo dia. A Sala de Operações existe para fazer esse trabalho chegar mais rápido.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {[
                { src: "/media/reel-casas-bomba.mp4", poster: "/media/reel-casas-bomba.jpg", titulo: "Operação de combate ao tráfico — R$ 10 mi em prejuízo ao crime" },
                { src: "/media/reel-operacao.mp4", poster: "/media/reel-operacao.jpg", titulo: "Operação Paraisópolis intensificada" },
                { src: "/media/reel-patrulha.mp4", poster: "/media/reel-patrulha.jpg", titulo: "Presença e patrulhamento no território" },
              ].map((r, i) => (
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
                    <figcaption className="bg-azul-noite px-4 py-3 text-sm font-semibold leading-snug text-branco">
                      {r.titulo}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <p className="mt-6 text-center text-xs uppercase tracking-wider text-texto-suave">
                Imagens reais · @16bpmm_oficial
              </p>
            </Reveal>
          </div>
        </section>

        {/* TECNOLOGIA EM TEMPO REAL — prévia do videomonitoramento inteligente */}
        <section id="tecnologia" className="bg-superficie-2 py-20 md:py-24">
          <div className="mx-auto max-w-[1440px] px-5">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-vermelho">
                Tecnologia em tempo real
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
                O que já está sendo implantado.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-texto-suave">
                Videomonitoramento ligado às câmeras públicas da região, para enxergar a nossa área em tempo real.
              </p>
            </Reveal>

            <Reveal delay={80}>
              <div className="mt-10 overflow-hidden rounded-3xl border border-branco/10 bg-gradient-to-br from-azul-noite via-azul-noite to-preto p-5 shadow-inst md:p-7">
                {/* Barra superior do painel */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animar-ao-vivo absolute inline-flex h-full w-full rounded-full bg-vermelho" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-vermelho">
                      Ao vivo
                    </span>
                    <span className="hidden text-xs text-branco/40 sm:inline">
                      · Videomonitoramento · Feeds públicos CET
                    </span>
                  </div>
                  <span className="rounded-full border border-branco/15 bg-branco/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-branco/60">
                    Prévia da tecnologia
                  </span>
                </div>

                <TrafficCamGrid />
              </div>
            </Reveal>
          </div>
        </section>

        {/* PROBLEMA */}
        <section id="problema" className="mx-auto max-w-[1440px] px-5 py-20 md:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-vermelho">
              A dor que justifica tudo
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
              Não falta esforço da tropa. Falta velocidade da informação.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-texto-suave">
              Junho de 2026 comparado a junho de 2025. Quando a informação demora, o criminoso já saiu da área antes de a viatura ficar sabendo.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-10 rounded-2xl border border-borda bg-superficie p-6 shadow-inst md:p-8">
              <ProblemaChart />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-8 rounded-xl border-l-4 border-ouro-velho bg-superficie-2 px-6 py-5">
              <p className="text-base text-texto md:text-lg">
                <strong className="text-azul-noite">Leitura estratégica:</strong> abordagens e
                apreensões subiram — mas veículos recuperados e flagrantes caíram. É exatamente aí que a Sala de Operações entra: no tempo entre ver e chegar.
              </p>
            </div>
          </Reveal>
        </section>

        {/* CICLO 14h32 — scroll storytelling */}
        <section id="ciclo" className="bg-branco py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-5">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-vermelho">
                O ciclo operacional
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
                Quarenta segundos entre a câmera ver e a equipe saber.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-texto-suave">
                Um exemplo do dia a dia da nossa área. Real, não hipotético.
              </p>
            </Reveal>

            <Reveal delay={80}>
              <div className="mt-12 rounded-3xl border border-branco/10 bg-gradient-to-br from-azul-noite via-azul-noite to-preto p-6 shadow-inst md:p-9">
                <CicloFlow />
              </div>
            </Reveal>

            <Reveal>
              <p className="mt-6 rounded-lg border-l-4 border-ouro-velho bg-superficie-2 px-5 py-4 text-sm text-texto">
                <strong className="text-azul-noite">Doutrina inegociável:</strong> a IA sugere, o
                humano valida e decide. Nada é despachado sem operador — e tudo fica em trilha de
                auditoria.
              </p>
            </Reveal>
          </div>
        </section>

        {/* PROVAS — tranquilidade e transparência */}
        <section id="provas" className="mx-auto max-w-[1440px] px-5 py-20 md:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-vermelho">
              Tecnologia a serviço da sua segurança
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
              Sua segurança, cada vez mais inteligente.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-texto-suave">
              Tecnologia, dados e policiamento de rua trabalhando juntos para que você e sua família sintam a diferença no dia a dia.
            </p>
          </Reveal>

          {/* Card 1 — Controle Operacional (visão do Comando), com vídeo real de fundo */}
          <Reveal delay={70}>
            <div className="relative mt-10 overflow-hidden rounded-2xl border border-branco/10 shadow-inst">
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
              <div className="absolute inset-0 bg-gradient-to-r from-azul-noite via-azul-noite/92 to-azul-noite/55" />

              <div className="relative flex gap-4 p-6 md:p-8">
                <span
                  aria-hidden
                  className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vermelho text-branco"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-lg font-bold text-branco md:text-xl">
                    {CONTROLE_OPERACIONAL.titulo}
                  </h3>
                  <p className="mt-2 max-w-2xl text-branco/80">{CONTROLE_OPERACIONAL.texto}</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2 — Segurança e Transparência (compromisso com a comunidade) */}
          <Reveal delay={130}>
            <div className="mt-6 overflow-hidden rounded-2xl border border-borda bg-azul-noite p-6 text-branco shadow-inst md:p-9">
              <h3 className="text-xl font-extrabold tracking-tight md:text-2xl">
                Segurança e Transparência: o compromisso do 16º BPM/M com a sua família
              </h3>
              <p className="mt-3 max-w-3xl text-branco/80">
                A segurança do seu bairro é a nossa maior missão. A Sala de Operações do 16º BPM/M funciona 24 horas por dia para transformar informação em ação rápida — e isso se traduz em tranquilidade para a sua família.
              </p>

              {/* Resultados em números */}
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {RESULTADOS_COMUNIDADE.map((r) => (
                  <div key={r.rotulo} className="rounded-xl border border-branco/10 bg-branco/5 p-4">
                    <p className="text-3xl font-extrabold tracking-tight text-ouro">{r.valor}</p>
                    <p className="mt-1 text-sm font-semibold text-branco">{r.rotulo}</p>
                    <p className="mt-0.5 text-xs text-branco/55">{r.nota}</p>
                  </div>
                ))}
              </div>

              {/* Foco de atuação, em linguagem de vitrine: sem nomear a fração
                  nem o bairro trabalhado. */}
              <div className="mt-7 rounded-xl border-l-4 border-ouro-velho bg-branco/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ouro">
                  Foco de atuação · áreas de maior demanda
                </p>
                <p className="mt-2 text-sm text-branco/75">
                  Desde o começo de 2026 reforçamos a presença onde a população mais pede, com policiamento diário e mais de 20 operações:
                </p>
                <ul className="mt-3 space-y-2">
                  {FOCO_REAL_PARQUE.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-branco/80">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ouro" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tecnologia + fechamento de confiança */}
              <p className="mt-7 text-sm text-branco/70">
                Tudo dentro da lei e com registro de tudo o que é consultado: seus dados são tratados com sigilo, conforme a LGPD.
              </p>
              <p className="mt-4 rounded-lg border-l-4 border-ouro-velho bg-branco/5 px-4 py-3 text-sm text-branco/85">
                Cada viatura na rua e cada policial de serviço têm um objetivo só: a sua tranquilidade. Continue denunciando — a sua identidade é sempre preservada.
              </p>
            </div>
          </Reveal>
        </section>

        {/* TERRITÓRIO EM NÚMEROS — agregados, sem geolocalização (página pública) */}
        <section id="territorio" className="bg-branco py-20 md:py-24">
          <div className="mx-auto max-w-[1440px] px-5">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-vermelho">
                O território em números
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
                O tráfico é o que a comunidade mais denuncia — e é onde o 16º concentra o esforço.
              </h2>
              <p className="mt-4 max-w-3xl text-lg text-texto-suave">
                O que a população mais denuncia e o que as operações do período entregaram. Por segurança de todos, não divulgamos endereços nem a localização das ocorrências.
              </p>
            </Reveal>

            {/* Número-manchete */}
            <Reveal delay={70}>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border-l-4 border-vermelho bg-superficie-2 p-6">
                  <p className="text-5xl font-extrabold tracking-tight text-vermelho">2.435</p>
                  <p className="mt-2 text-sm font-bold text-azul-noite">
                    Denúncias de tráfico de drogas
                  </p>
                  <p className="mt-1 text-xs text-texto-suave">
                    62% de todas as denúncias recebidas — mais que todas as outras naturezas somadas.
                  </p>
                </div>
                <div className="rounded-2xl border border-borda bg-superficie p-6">
                  <p className="text-5xl font-extrabold tracking-tight text-azul-noite">272</p>
                  <p className="mt-2 text-sm font-bold text-azul-noite">
                    Prisões na Operação Impacto
                  </p>
                  <p className="mt-1 text-xs text-texto-suave">
                    Novembro/2025 a julho/2026, com pico de 51 prisões em abril.
                  </p>
                </div>
                <div className="rounded-2xl border border-borda bg-superficie p-6">
                  <p className="text-5xl font-extrabold tracking-tight text-azul-noite">82,5%</p>
                  <p className="mt-2 text-sm font-bold text-azul-noite">
                    Das denúncias já encerradas
                  </p>
                  <p className="mt-1 text-xs text-texto-suave">
                    4.093 de 4.961 denúncias verificadas e concluídas.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Gráfico 1 — natureza das denúncias */}
            <Reveal delay={110}>
              <div className="mt-8 rounded-2xl border border-borda bg-superficie p-6 shadow-inst md:p-8">
                <h3 className="text-lg font-bold text-azul-noite">
                  O que a população denuncia
                </h3>
                <p className="mt-1 text-sm text-texto-suave">
                  Denúncias por natureza · 3.930 registros classificados
                </p>
                <div className="mt-6">
                  <DenunciasNaturezaChart />
                </div>
              </div>
            </Reveal>

            {/* Gráfico 2 — Operação Impacto no tempo */}
            <Reveal delay={150}>
              <div className="mt-6 rounded-2xl border border-borda bg-superficie p-6 shadow-inst md:p-8">
                <h3 className="text-lg font-bold text-azul-noite">
                  Operação Impacto — prisões por mês
                </h3>
                <p className="mt-1 text-sm text-texto-suave">
                  Novembro/2025 a julho/2026 · julho ainda em curso
                </p>
                <div className="mt-6">
                  <ImpactoMensalChart />
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="mt-8 rounded-xl border-l-4 border-ouro-velho bg-superficie-2 px-6 py-5">
                <p className="text-base text-texto md:text-lg">
                  <strong className="text-azul-noite">Leitura:</strong> a comunidade aponta o tráfico
                  como o problema central, e é exatamente sobre ele que recaem as ações do 16º BPM/M.
                  Denunciar funciona: cada informação recebida vira linha de trabalho do Batalhão.
                </p>
              </div>
            </Reveal>

            <p className="mt-4 text-xs text-texto-suave">
              Dados agregados do 16º BPM/M, sem identificação de pessoas, endereços ou locais ·
              atualizado em julho/2026.
            </p>
          </div>
        </section>

        {/* ESTUDOS / NÚCLEO DE ANÁLISE CRIMINAL */}

        {/* RECONHECIMENTO / NÚMEROS */}
        <section id="reconhecimento" className="bg-azul-noite py-20 text-branco md:py-24">
          <div className="mx-auto max-w-[1440px] px-5">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-ouro">
                Reconhecimento do batalhão
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">
                A sociedade vê o trabalho do 16º.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-branco/75">
                Alcance real do <strong className="text-branco">@16bpmm_oficial</strong> nos últimos
                90 dias — e a repercussão na imprensa e nas parcerias institucionais.
              </p>
            </Reveal>

            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {kpisReais.map((k, i) => (
                <Reveal key={k.r} delay={i * 60}>
                  <div className="h-full rounded-xl border border-branco/10 bg-branco/5 p-5">
                    <p className="text-3xl font-extrabold tracking-tight text-ouro md:text-4xl">
                      {k.v}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-branco/60">
                      {k.r}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="mt-8 rounded-xl border-l-4 border-ouro-velho bg-branco/5 px-6 py-4">
                <p className="text-sm text-branco/80">
                  <strong className="text-branco">7 em cada 10 visualizações são de não
                  seguidores</strong> — o trabalho do batalhão transborda a própria base e chega a
                  quem ainda não acompanha. O reel de maior audiência: <strong className="text-ouro">419
                  mil visualizações</strong> (operação em Paraisópolis, 10/jun).
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div className="mt-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-branco/50">
                  Repercussão na imprensa
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {imprensaReal.map((v: string) => (
                    <span
                      key={v}
                      className="rounded-full border border-branco/15 bg-branco/5 px-3 py-1 text-xs font-medium text-branco/75"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {parceriasReal.map((c: { t: string; d: string }, i: number) => (
                <Reveal key={c.t} delay={i * 80}>
                  <div className="h-full rounded-xl border border-branco/10 bg-branco/5 p-5">
                    <h3 className="text-sm font-bold text-branco">{c.t}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-branco/60">{c.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <p className="mt-8 text-xs text-branco/40">
              Fonte: Instagram Insights (últimos 90 dias, leitura de tela) + varredura de imprensa
              aberta · @16bpmm_oficial · jul/2026.
            </p>
          </div>
        </section>

        {/* IMPLANTAÇÃO */}
        <section id="implantacao" className="bg-superficie-2 py-20 md:py-24">
          <div className="mx-auto max-w-[1440px] px-5">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-azul">
                Linha do tempo
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
                Implantação em quatro fases.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-texto-suave">
                Sem alarde: primeiro o resultado na mão, depois o crescimento.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {FASES.map((f, i) => (
                <Reveal key={f.fase} delay={i * 80}>
                  <div className="flex h-full flex-col rounded-xl border border-borda bg-branco p-5 shadow-inst">
                    <span className="text-xs font-bold uppercase tracking-wider text-vermelho">
                      {f.fase}
                    </span>
                    <span className="mt-1 text-lg font-extrabold text-azul-noite">{f.nome}</span>
                    <span className="tempo mt-0.5 text-sm font-medium text-texto-suave">
                      {f.prazo}
                    </span>
                    <p className="mt-3 text-sm text-texto-suave">{f.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CHAMADA FINAL */}
        <section className="bg-superficie-2 py-20 text-center md:py-24">
          <div className="mx-auto max-w-3xl px-5">
            <Reveal>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
                Atrasar o lado do ladrão.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-texto-suave">
                Não é criar sistema novo. É usar bem o que já existe — e transformar segundos em prisões e carros recuperados.
              </p>
              {/* Botão de vitrine: mostra o caminho, mas não navega — a Sala de
                  Comando se abre pela credencial, não por link público. */}
              <span
                aria-disabled="true"
                className="mt-8 inline-block cursor-default rounded-md bg-vermelho px-6 py-3 text-sm font-semibold text-branco shadow-inst"
              >
                Acessar a Sala de Comando
              </span>
            </Reveal>
          </div>
        </section>

        {/* PÁGINAS DE TRABALHO — cartões de vitrine, sem navegação: o endereço
            de cada uma é passado à tropa pelo canal próprio. */}
        <section id="servicos" className="bg-branco py-20 md:py-24">
          <div className="mx-auto max-w-[1440px] px-5">
            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-vermelho">
                  Para o efetivo
                </span>
                <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-azul-noite md:text-4xl">
                  Páginas de trabalho do Batalhão
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-texto-suave">
                  Abertas sem a credencial da Sala de Comando, para a tropa lançar e conferir de
                  onde estiver.
                </p>
              </div>
            </Reveal>

            <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
              <Reveal>
                <div className="flex h-full cursor-default flex-col rounded-2xl border border-borda bg-superficie-2 p-7">
                  <span className="selo-icone inline-flex h-12 w-12 items-center justify-center rounded-xl bg-vermelho text-branco">
                    <Video size={22} strokeWidth={2.25} />
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold tracking-tight text-azul-noite">
                    Auditoria de COP 2026
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-texto-suave">
                    Lance a auditoria do dia e acompanhe, ao vivo, a meta de cada companhia. Mínimo
                    de 3 evidências auditadas por turno, com os IDs das mídias.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-vermelho">
                    Abrir o painel &rarr;
                  </span>
                </div>
              </Reveal>

              <Reveal>
                <div className="flex h-full cursor-default flex-col rounded-2xl border border-borda bg-superficie-2 p-7">
                  <span className="selo-icone inline-flex h-12 w-12 items-center justify-center rounded-xl bg-azul-noite text-ouro">
                    <Boxes size={22} strokeWidth={2.25} />
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold tracking-tight text-azul-noite">
                    Inventário 2026
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-texto-suave">
                    Central das planilhas do levantamento patrimonial: companhias, Força Tática e
                    seções do Estado-Maior numa página só, em leitura ao vivo.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-azul-noite">
                    <KeyRound size={15} strokeWidth={2.25} />
                    Requer chave de acesso &rarr;
                  </span>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* REDES SOCIAIS */}
        <section id="redes" className="bg-superficie-2 py-20 md:py-24">
          <div className="mx-auto max-w-[1440px] px-5">
            <Reveal>
              <div className="grid items-center gap-10 overflow-hidden rounded-3xl border border-borda bg-gradient-to-br from-azul-noite to-azul-escuro p-8 text-branco shadow-inst md:grid-cols-2 md:p-12">
                <div>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white shadow-lg">
                    <IgIcon size={28} />
                  </span>
                  <h2 className="mt-5 text-3xl font-extrabold tracking-tight md:text-4xl">
                    Acompanhe o 16º BPM/M
                  </h2>
                  <p className="mt-2 text-lg font-bold text-ouro">@16bpmm_oficial</p>
                  <p className="mt-4 max-w-md text-branco/80">
                    O dia a dia da tropa e os resultados em primeira mão. Os melhores
                    momentos estão nos Reels.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
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

                <div className="grid grid-cols-3 gap-3">
                  {[
                    "/media/reel-casas-bomba.jpg",
                    "/media/reel-operacao.jpg",
                    "/media/reel-patrulha.jpg",
                  ].map((src, i) => (
                    <a
                      key={src}
                      href="https://www.instagram.com/16bpmm_oficial/reels/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-branco/10"
                      style={{ transform: `translateY(${i === 1 ? "-12px" : "0"})` }}
                    >
                      <Image
                        src={src}
                        alt="Reel do 16º BPM/M"
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="140px"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-azul-noite/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <Play size={22} className="text-white drop-shadow" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Rodapé institucional */}
      <footer className="bg-preto text-branco/70">
        <div className="faixa-institucional h-1 w-full" />
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 md:grid-cols-[1.5fr_1fr] md:px-6">
          <div className="-ml-2 md:-ml-3">
            <Image
              src="/brand/wordmark-branca.png"
              alt="Polícia Militar do Estado de São Paulo — Rumo aos 200 anos"
              width={420}
              height={112}
              className="h-32 w-auto drop-shadow-[0_8px_24px_rgba(222,216,69,0.18)] md:h-44"
            />
            <p className="mt-6 max-w-md text-base font-medium leading-relaxed text-branco/85 md:text-lg">
              Protegendo vidas, garantindo a lei e promovendo a paz.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-branco/50">
              &ldquo;Nós, Policiais Militares, sob a proteção de Deus, estamos compromissados com a
              Defesa da Vida, da Integridade Física e da Dignidade da Pessoa Humana.&rdquo;
            </p>
          </div>
          <div className="text-sm md:text-right">
            <p className="font-semibold text-branco">
              16º Batalhão de Polícia Militar Metropolitano
            </p>
            <p className="mt-1 text-branco/60">1º Ten PM Fernão Gomes Loureiro</p>
            <p className="mt-4 text-xs uppercase tracking-wider text-ouro">Rumo aos 200 anos</p>
            <p className="mt-4 text-xs text-branco/40">
              Uso interno / Reservado · Página institucional de pré-lançamento
            </p>
          </div>
        </div>

        {/* Barra de créditos */}
        <div className="border-t border-branco/10">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-5 text-xs text-branco/40 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} 16º BPM/M — Polícia Militar do Estado de São Paulo.
            </p>
            <p>
              Desenvolvido por{" "}
              <span className="font-medium text-branco/60">Sd PM 231.936-5 Fabricio Pires</span>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
