import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  FileBarChart2,
  FileCheck2,
  RefreshCw,
} from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AcessoRapido } from "@/components/publico16/acesso-rapido";
import { FundamentacaoCop } from "@/components/publico16/cop/fundamentacao-cop";
import { DiretrizCop } from "@/components/publico16/diretriz-cop";
import { DiretrizEmFoco } from "@/components/publico16/diretriz-em-foco";
import { Instagram16 } from "@/components/publico16/instagram-16";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { MarcoCiclo } from "@/components/publico16/cop/marco-ciclo";
import { URL_FORMULARIO } from "@/lib/cop2026";
import { ehDataIso } from "@/lib/cop2026-ciclo";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { calcularPainel, filtrosDoMesCorrente } from "@/lib/cop2026-metricas";
import { mesCorrente } from "@/lib/cop2026-relatorios";
import { QuadroRankingCias } from "@/components/publico16/cop/quadro-ranking-cias";
import { BotaoAdmin } from "@/components/publico16/cop/botao-admin";
import { BotaoProblema } from "@/components/publico16/cop/botao-problema";
import { BotaoSair } from "@/components/publico16/cop/botao-sair";
import { CartaoAcao } from "@/components/publico16/cop/cartao-acao";
import {
  IconeBriefing,
  IconeLancar,
  IconePainel,
} from "@/components/publico16/cop/icones-cop";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";

// Nenhuma fonte é carregada aqui: Cinzel (títulos), Inter (corpo) e IBM Plex
// Mono (números) já vêm do layout raiz e valem para o portal inteiro. Esta
// página chegou a carregar Lora por conta própria — uma quarta fonte que não
// existia em nenhuma outra tela do Batalhão.

// A copy do cartão é a que a tropa lê no WhatsApp antes de decidir se abre o
// link, então fala no imperativo e diz o que a pessoa tem a fazer, não o que a
// página é. A imagem do cartão vem de opengraph-image.tsx, ao lado.
const CHAMADA =
  "Lance a sua auditoria do dia e acompanhe, ao vivo, a meta de cada companhia. Mínimo de 3 evidências auditadas por turno, conforme determinação do Batalhão sobre a Diretriz PM3-001/02/25.";

export const metadata: Metadata = {
  title: "Auditoria de COP 2026 · 16º BPM/M",
  description: CHAMADA,
  // Página de trabalho interno, aberta para a tropa lançar e o Comando
  // acompanhar sem login. Fora do índice dos buscadores de propósito: quem
  // chega é quem recebeu o endereço.
  // Preview de link precisa que o crawler do WhatsApp/Facebook leia a pagina;
  // o Google fica de fora pelo robots.txt (que esses crawlers ignoram).
  robots: { index: true, follow: true },
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
export const maxDuration = 20;

/** Classe do carimbo de leitura — repetida no fallback para que o esqueleto e o
 *  conteúdo real ocupem exatamente o mesmo espaço, sem salto de layout. */
const CLASSE_CARIMBO =
  "inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-branco/40";

function BlocoPlanilha({ lidoEm, erro }: { lidoEm?: string; erro?: string }) {
  return (
    <>
      {/* Só o carimbo de leitura. O atalho para a planilha saiu daqui em
          01/09/2026 por determinação do Comando: a base bruta não é peça de
          página aberta à tropa, e ela continua a um clique de quem tem acesso,
          dentro do Relatório de Dados do mês
          (/cop2026/relatorios/<mes>/dados). O horário fica: dizer "de quando é
          este número" é informação, não link. */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
        <span className={CLASSE_CARIMBO}>
          <RefreshCw size={10} /> {lidoEm ? `leitura de ${lidoEm}` : "lendo os dados…"}
        </span>
      </div>

      {erro && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-vermelho/35 bg-vermelho/[0.07] p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-vermelho" />
          <div>
            <p className="text-sm font-bold text-branco">A base não respondeu</p>
            <p className="mt-0.5 text-sm text-branco/60">
              {erro} Se persistir, confira se ela continua publicada na web para quem tem o
              endereço.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * A leitura ao vivo fica isolada aqui de propósito.
 *
 * Esta página não usa `lancamentos` nem `metas` — só o carimbo de horário e o
 * aviso de falha. Enquanto o `await` estava no corpo da página, uma pane do
 * Google segurava o HTML inteiro e a tropa, que só queria o link do formulário
 * e a diretriz, ficava sem página nenhuma. Dentro do <Suspense> o casco chega
 * na hora e só este pedaço espera.
 */
async function BlocoPlanilhaAoVivo() {
  const { erro, lidoEm } = await lerAuditoriaCop2026();
  return <BlocoPlanilha lidoEm={lidoEm} erro={erro} />;
}

/**
 * Posição das frações, ponto 08 da Diretriz em Foco — pedido
 * do Comando para que quem lê o bloco normativo veja, no mesmo fôlego, onde a
 * própria fração está. Os sete primeiros pontos são texto da Diretriz; este é
 * o único que fala do agora.
 *
 * Este é o único lugar da página onde a posição das frações aparece. Houve um
 * espelho branco do mesmo ranking dentro do hero (`ranking-fracoes-publico`);
 * saiu quando o quadro 08 entrou, porque o mesmo dado duas vezes na mesma tela
 * só divide a atenção de quem lê.
 *
 * Suspense próprio, como o bloco da planilha: os sete quadros normativos chegam
 * na hora e só este espera o Google. E a leitura não custa uma segunda ida ao
 * Google — `lerAuditoriaCop2026` serve do retrato em memória, compartilhado com
 * o bloco da planilha.
 */
async function QuadroRankingCiasAoVivo() {
  const { lancamentos, metas } = await lerAuditoriaCop2026();
  // MÊS CORRENTE, e não o acumulado: a meta de 960 é mensal. Sem este recorte o
  // quadro somava agosto + setembro contra a meta de um mês só — em 01/09/2026
  // ele anunciava os 627/960 de agosto como "posição na meta do mês", com a
  // Força Tática em 202%, no dia em que setembro ainda não tinha lançamento.
  const painel = calcularPainel(lancamentos, metas, filtrosDoMesCorrente());
  // Sem nenhum lançamento lido, o quadro fica no próprio esqueleto em vez de
  // anunciar 0% para as seis frações. `totalNaPlanilha` é PRÉ-filtro de
  // propósito: mês recém-aberto tem zero lançamentos e mesmo assim é dado bom —
  // seis frações em 0% no dia 1º é a verdade, não falha de leitura.
  if (painel.totalNaPlanilha === 0) return <QuadroRankingCias />;
  return (
    <QuadroRankingCias
      linhas={painel.fracoes}
      pctBatalhao={painel.pct}
      mes={mesCorrente()?.rotulo}
    />
  );
}

/**
 * `?dia=AAAA-MM-DD` finge a data só para a faixa de virada de ciclo, para que o
 * Comando confira a peça do mês seguinte antes de ele abrir. Nada mais na
 * página olha esse parâmetro — os números continuam vindo da planilha, do dia
 * de hoje. O formato é checado antes de passar adiante: lixo na query devolve a
 * data real, não uma tela quebrada.
 */
export default async function Cop2026Page({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const { dia } = await searchParams;
  const diaSimulado = ehDataIso(dia) ? dia : undefined;

  /* `identidadeCop` e não `sessaoCop`: esta página é ABERTA, e perguntar
     "quem é" não pode virar exigência de estar na lista de 22 autorizados.
     Sem cookie devolve null — e aí o botão de Administração aponta para a
     porta de login em vez de sumir (mudança de 09/09/2026), e o "Sair" não
     aparece, porque não há sessão para encerrar. */
  const identidade = await identidadeCop();
  const ehAdmin = ehAdminCop(identidade?.email);

  return (
    <div
      className={`tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco`}
    >
      {/* Créditos da equipe: faixa do topo, antes do cabeçalho. */}
      <FaixaCreditos />

      <header className="border-b border-slate-300/80 bg-[#edf2f6] text-[#07182d] shadow-[0_10px_30px_rgba(7,24,45,0.08)]">
        <div className="mx-auto max-w-6xl px-4 pb-5 pt-3 sm:pb-6 sm:pt-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex min-w-0 items-center gap-3 text-[9px] font-bold uppercase tracking-[0.28em] text-[#15304c]/65 sm:text-[10px]">
              <span className="h-0.5 w-7 shrink-0 bg-[#ca0202]" />
              <span className="truncate">Governo do Estado de São Paulo · Polícia Militar</span>
            </div>
            {/* Botão destacado dos Relatórios: topo-direito do cabeçalho, na
                mesma família de cor/tipografia do portal. Fica em fluxo (ml-auto)
                para não colidir com o brasão no mobile. */}
            {/* Admin ao lado de Relatórios: o botão tem que existir em TODA
                tela da COP, e esta é a única do conjunto que não usa a
                NavegacaoCop. Desde 09/09/2026 ele aparece para TODO MUNDO —
                quem não administra é levado à porta de login, não a um 404. */}
            <BotaoAdmin ehAdmin={ehAdmin} className="ml-auto shrink-0" />
            {identidade?.email && (
              <BotaoSair email={identidade.email} variante="claro" mostrarConta className="shrink-0" />
            )}
            <Link
              href="/cop2026/relatorios"
              className="group inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#ca0202] px-3.5 py-2 text-[12px] font-bold uppercase tracking-wide text-white shadow-[0_6px_16px_rgba(202,2,2,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#e40707] hover:shadow-[0_10px_22px_rgba(202,2,2,0.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07182d] sm:text-[13px]"
            >
              <FileBarChart2 className="h-4 w-4" />
              Relatórios
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mx-auto grid max-w-5xl items-center gap-y-5 md:grid-cols-[220px_minmax(0,1fr)_220px] md:gap-x-0">
            <div className="flex justify-center md:justify-end md:pr-0">
              <Image
                src="/brand/brasao-16bpmm-hd.png"
                alt="Brasão do 16º BPM/M"
                width={2481}
                height={3508}
                className="h-auto w-40 drop-shadow-[0_18px_34px_rgba(7,24,45,0.4)] sm:w-48 md:w-64"
                priority
              />
            </div>

            <div className="min-w-0 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ca0202] sm:text-xs">
                  16º Batalhão de Polícia Militar Metropolitano
                </p>
                <h1 className="mt-1 font-serif text-2xl font-bold uppercase leading-[1.02] tracking-tight text-[#07182d] sm:text-3xl md:text-4xl">
                  Auditoria e Governança
                </h1>
                <p className="mt-1 font-serif text-sm italic text-[#15304c]/80 sm:text-base md:text-lg">
                  das Câmeras Operacionais Corporais
                </p>
                <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#15304c]/70 sm:text-[10px]">
                  Diretriz PM3-001/02/25
                </div>
            </div>

            <div className="flex justify-center md:justify-start md:pl-0">
              <Image
                src="/brand/logo-auditoria-cop2026-transparent.png"
                alt="16º BPM/M · Auditoria COP 2026"
                width={1536}
                height={1536}
                className="h-auto w-48 drop-shadow-[0_16px_30px_rgba(7,24,45,0.34)] sm:w-64 md:w-80"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 border-t border-[#15304c]/15 pt-4">
            {/* Botões de vitrine: mostram os destinos do Batalhão sem levar a
                lugar nenhum — esta página trata só da auditoria de COP.
                Chegaram a virar link para /16bpmm e /16bpmm/calendario em
                01/09/2026 e o Fabrício mandou tirar no mesmo dia: quem entra
                pelo QR Code da tropa não pode ser desviado do lançamento.
                Decisão firme — não repor o href. */}
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
          <div className="mt-2 text-center">
            <p className="font-serif text-sm font-bold uppercase tracking-wide text-[#15304c]/80">
              Preenchimento diário obrigatório
            </p>
            <p className="text-[12px] font-semibold text-[#15304c]/55">
              Controle e fiscalização do uso das câmeras
            </p>
          </div>
        </div>
      </header>

      {/* Virada de ciclo: primeira coisa depois do cabeçalho de propósito. No
          dia 1º o contador de todo mundo volta a zero e nada no painel diz
          isso — o hero abaixo fala da regra permanente, esta faixa fala do
          agora. Leva junto a medalha e o botão do mês que fechou, que é o que
          o Comando procura assim que o período encerra. */}
      <MarcoCiclo urlFormulario={URL_FORMULARIO} hoje={diaSimulado} />

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
            evidências. O acompanhamento da meta de cada companhia é atualizado a
            cada minuto.
          </p>

          {/* AS QUATRO ENTRADAS DO SISTEMA, em cartões-visor.
              Reforma de 09/09/2026 a pedido do Major Zochio: eram quatro
              pílulas em fila, duas vermelhas cheias e duas escuras sobre fundo
              escuro — as duas escuras "passavam batido". Agora é uma grade de
              quatro cartões do mesmo tamanho, cada um com a sua cor de função:
              cinza bandeirante com trilho vermelho PMESP para o que a tropa
              EXECUTA, azul bandeirante para a consulta ao vivo, aço com trilho
              cromo para a leitura de período fechado. A regra de cor e o porquê
              estão em components/publico16/cop/cartao-acao.tsx — o vermelho saiu
              do corpo e virou traço em 09/09/2026, por determinação do Major.
              Em fila (`flex-row`) nunca mais: com quatro itens, ou o quarto
              sumia na dobra do celular ou os rótulos encolhiam até ilegíveis. */}
          <div className="mt-9 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
            <CartaoAcao
              href={URL_FORMULARIO}
              externo
              tom="acao"
              etiqueta="Turno · Registrar"
              titulo="Preencher a auditoria do turno"
              nota="Mínimo de 3 evidências por turno. Leva menos de dois minutos."
              Icone={IconeLancar}
              aoVivo
            />
            {/* Painel único desde 01/09/2026: o painel do ciclo (Caixa
                Tendência e título que se anuncia pelo mês corrente) assumiu a
                URL limpa. Os endereços versionados /v2 e /v3 seguem como
                redirect permanente em next.config.ts. */}
            <CartaoAcao
              href="/cop2026/dashboard"
              tom="azul"
              etiqueta="Metas · Ao vivo"
              titulo="Dashboard de metas"
              nota="A posição de cada fração na meta do mês, atualizada a cada minuto."
              Icone={IconePainel}
            />
            {/* O botão vermelho na altura do olho, ao lado das outras três
                ações da home. Ele também vive na BarraCop, que está em todas
                as telas do módulo — aqui ele aparece INTEIRO porque a home é
                onde alguém que acabou de descobrir a queda entra primeiro, e
                um ícone de 74px na barra não compete com o hero. */}
            <BotaoProblema variante="visor" />
            <CartaoAcao
              href="/cop2026/briefing"
              tom="aco"
              etiqueta="Comando · Síntese"
              titulo="Briefing executivo"
              nota="A leitura do período em slides, pronta para projetar na reunião."
              Icone={IconeBriefing}
            />
          </div>

          {/* Os parâmetros que a tropa mais pergunta, na altura do olho, em vez
              de enterrados na nota de rodapé da página. */}
          <dl className="mt-12 grid max-w-4xl grid-cols-2 gap-3 border-t border-white/15 pt-7 sm:grid-cols-4">
            {[
              { rotulo: "Evidências por turno", valor: "3", nota: "mínimo obrigatório", icon: FileCheck2 },
              { rotulo: "Turnos no período", valor: "15", nota: "escala 12x36", icon: CalendarDays },
              { rotulo: "Lançamento", valor: "Diário", nota: "ao fim do turno", icon: BarChart3 },
              { rotulo: "Atualização", valor: "60s", nota: "leitura da base", icon: RefreshCw },
            ].map((item) => (
              <div key={item.rotulo} className="rounded-xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                  <item.icon className="h-4 w-4 shrink-0 text-[#f04a4a]" />
                  {item.rotulo}
                </dt>
                <dd className="mt-1.5 font-mono text-2xl font-bold leading-none text-white">
                  {item.valor}
                </dd>
                <dd className="mt-1 text-[12px] font-medium text-white/55">{item.nota}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <DiretrizEmFoco
        quadro8={
          <Suspense fallback={<QuadroRankingCias />}>
            <QuadroRankingCiasAoVivo />
          </Suspense>
        }
      />

      <AcessoRapido urlFormulario={URL_FORMULARIO} />

      <FundamentacaoCop />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="sr-only">Auditoria de COP 2026 · 16º BPM/M</h1>
        <Suspense fallback={<BlocoPlanilha />}>
          <BlocoPlanilhaAoVivo />
        </Suspense>

        <div id="diretriz-pdf" className="scroll-mt-8">
          <DiretrizCop />
        </div>

        <p className="mt-8 border-t border-branco/10 pt-4 text-[13px] leading-relaxed text-branco/40">
          Leitura direta da base de respostas da &quot;Auditoria COP Motorola · 16 BPM/M&quot;, da
          conta institucional operacional16bpmm@gmail.com, atualizada a cada minuto. Correção de
          lançamento e ajuste de auditores ou de meta são feitos pelo Comando na área de
          administração do próprio portal, e esta página apenas reflete o que estiver registrado.
          Meta do período = auditores designados × 3 evidências mínimas por turno × 15 turnos de
          serviço no período (escala 12x36), conforme fixado pelo Batalhão. Os números do
          acompanhamento ficam no painel do mês, de acesso restrito.
        </p>
      </main>

      <Instagram16 />

      <RodapeCop nota="Página aberta à tropa. Painel, Briefing e Relatórios são de acesso restrito." />
    </div>
  );
}
