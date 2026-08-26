import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Home,
  LogIn,
  Timer,
  TrendingDown,
  UserCheck,
  Users,
} from "lucide-react";
import { num, pctTexto } from "@/lib/dejem-calculo";

/**
 * Capa do relatório, no formato de portal institucional.
 *
 * Sobre a barra de navegação: o layout de referência trazia "Projetos" e
 * "Notícias", que não existem como rota neste portal. Publicar link morto num
 * documento que vai ao Comando é pior que adaptar, então esses dois itens
 * apontam para seções reais do próprio estudo. Home e Login vão para rotas que
 * existem de verdade.
 *
 * A barra aqui é ESTÁTICA de propósito: quem fixa no topo durante a leitura é
 * a BarraEstudo, logo abaixo. Duas barras grudadas disputariam o mesmo espaço.
 */

type Kpi = {
  rotulo: string;
  valor: number | null;
  nota?: string;
  icone: typeof Users;
  cor: string;
};

const NAV = [
  { rotulo: "Home", href: "/", icone: Home, ativo: false },
  { rotulo: "Relatórios", href: "#panorama", icone: FileText, ativo: true },
  { rotulo: "Indicadores", href: "#painel", icone: BarChart3, ativo: false },
  { rotulo: "Gargalos", href: "#ociosidade", icone: TrendingDown, ativo: false },
  { rotulo: "Método", href: "#metodo", icone: ClipboardCheck, ativo: false },
  { rotulo: "Login", href: "/login", icone: LogIn, ativo: false },
];

const SUMARIO_CAPA = [
  { n: 1, rotulo: "Contexto e panorama do semestre", href: "#panorama" },
  { n: 2, rotulo: "Demanda e conversão da vaga", href: "#conversao" },
  { n: 3, rotulo: "Desempenho mensal e por Companhia", href: "#serie" },
  { n: 4, rotulo: "Gargalos operacionais", href: "#ociosidade" },
  { n: 5, rotulo: "Conclusões e recomendações", href: "#recomendacoes" },
];

export function CapaRelatorio({
  vagas,
  jornadas,
  homensHora,
  pms,
  penetracao,
  preenchimento,
  ociosasComInscrito,
  ociosas,
}: {
  vagas: number;
  jornadas: number;
  homensHora: number;
  pms: number;
  penetracao: number | null;
  preenchimento: number | null;
  ociosasComInscrito: number;
  ociosas: number;
}) {
  const kpis: Kpi[] = [
    { rotulo: "Vagas ofertadas", valor: vagas, nota: "pelo CPA/M-5", icone: ClipboardCheck, cor: "#1d9a9a" },
    { rotulo: "Jornadas cumpridas", valor: jornadas, nota: "de 8 horas cada", icone: UserCheck, cor: "#16294a" },
    { rotulo: "Homens-hora", valor: homensHora, nota: "de reforço", icone: Timer, cor: "#2eb8d4" },
    { rotulo: "Policiais empregados", valor: pms, nota: `${pctTexto(penetracao)} do efetivo`, icone: Users, cor: "#d9b93c" },
  ];

  return (
    <header>
      {/* ─────────────────────────── navegação ─────────────────────────── */}
      <nav className="bg-azul-noite">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/16bpmm/geral/brasao.png"
              alt="Brasão do 16º BPM/M"
              width={40}
              height={40}
              className="h-9 w-auto"
            />
            <span className="font-serif text-base tracking-wide text-branco md:text-lg">
              16º BPM/M · CPA/M-5
            </span>
          </Link>

          <div className="ml-auto flex flex-wrap items-center gap-x-1 gap-y-1">
            {NAV.map((i) => {
              const Icone = i.icone;
              return (
                <Link
                  key={i.rotulo}
                  href={i.href}
                  className={`flex items-center gap-1.5 rounded px-3 py-2 text-[13px] font-medium transition-colors ${
                    i.ativo
                      ? "border-b-2 border-[#2eb8d4] text-branco"
                      : "text-branco/70 hover:bg-branco/10 hover:text-branco"
                  }`}
                >
                  <Icone className="h-3.5 w-3.5" aria-hidden />
                  {i.rotulo}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ──────────────────────────── hero ─────────────────────────────── */}
      <div className="relative overflow-hidden bg-azul-noite">
        {/* Brasão como marca d'água. Não há foto de sala de operações no
            acervo do projeto, e usar imagem sem relação com o tema seria pior
            que um fundo institucional limpo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 opacity-[0.07] md:block"
        >
          <Image src="/16bpmm/geral/brasao.png" alt="" width={420} height={420} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 80% at 50% 0%, rgba(48,83,136,0.55), transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-[1180px] px-5 pb-32 pt-14 text-center md:pb-36 md:pt-16">
          <h1 className="mx-auto max-w-[22ch] font-serif text-[30px] font-bold uppercase leading-[1.12] tracking-wide text-branco md:text-[46px]">
            Relatório de DEJEM · 1º semestre de 2026
          </h1>

          <div className="mx-auto mt-7 max-w-[62ch] space-y-1.5 text-left text-[14px] text-branco/85 md:text-[15px]">
            <p>
              <span className="font-semibold text-branco">Instituição:</span> 16º Batalhão de
              Polícia Militar Metropolitano · CPA/M-5
            </p>
            <p>
              <span className="font-semibold text-branco">Tema:</span> DEJEM · Estudo analítico do
              1º semestre de 2026
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────── indicadores sobrepondo o hero ────────────────── */}
      <div className="relative z-10 mx-auto -mt-24 max-w-[1180px] px-5 md:-mt-28">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icone = k.icone;
            return (
              <div
                key={k.rotulo}
                className="min-w-0 overflow-hidden rounded-xl border border-borda bg-branco shadow-inst"
              >
                <div className="px-5 py-6 text-center">
                  <Icone className="mx-auto h-9 w-9" style={{ color: k.cor }} aria-hidden />
                  <p className="rotulo-dado mt-4 text-texto-suave">{k.rotulo}</p>
                  <p className="dados-destaque mt-2 text-[34px] text-azul-noite">{num(k.valor)}</p>
                  {k.nota ? (
                    <p className="mt-1.5 text-[12px] text-texto-suave">{k.nota}</p>
                  ) : null}
                </div>
                <div className="h-1.5 w-full" style={{ background: k.cor }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ──────────── problema central e sumário do relatório ───────────── */}
      <div className="mx-auto max-w-[1180px] px-5 py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          <section>
            <div className="flex items-center gap-3 border-b border-borda pb-3">
              <TrendingDown className="h-5 w-5 shrink-0 text-vermelho" aria-hidden />
              <h2 className="font-serif text-lg uppercase tracking-wide text-azul-noite">
                Problema central e gargalo
              </h2>
            </div>
            <p className="mt-4 text-[14.5px] leading-relaxed text-texto-suave">
              Das <b className="font-semibold text-texto">{num(ociosas)}</b> vagas que ficaram
              ociosas no semestre, <b className="font-semibold text-vermelho">{num(ociosasComInscrito)}</b>{" "}
              tinham candidato inscrito e mesmo assim não foram preenchidas. O gargalo não é falta
              de voluntário, é a escala que não fecha, e ela tem dia, turno e Companhia
              identificados. O batalhão fechou o semestre com{" "}
              <b className="font-semibold text-texto">{pctTexto(preenchimento)}</b> de preenchimento.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 border-b border-borda pb-3">
              <FileText className="h-5 w-5 shrink-0 text-azul" aria-hidden />
              <h2 className="font-serif text-lg uppercase tracking-wide text-azul-noite">
                Sumário do relatório
              </h2>
            </div>
            <ol className="mt-4 space-y-2">
              {SUMARIO_CAPA.map((i) => (
                <li key={i.n}>
                  <a
                    href={i.href}
                    className="group flex items-baseline gap-2.5 text-[14.5px] text-texto-suave transition-colors hover:text-azul"
                  >
                    <span className="dados text-[13px] text-ouro-velho">{i.n}.</span>
                    <span className="group-hover:underline">{i.rotulo}</span>
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex justify-end">
              <a
                href="#painel"
                className="inline-flex items-center gap-2 rounded-md bg-azul px-4 py-2.5 text-[13px] font-semibold text-branco shadow-inst transition-colors hover:bg-azul-escuro"
              >
                Acessar relatório completo
                <FileText className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </section>
        </div>
      </div>
    </header>
  );
}
