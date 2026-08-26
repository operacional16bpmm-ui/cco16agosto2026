import Image from "next/image";
import { Poppins } from "next/font/google";
import Link from "next/link";
import { Crosshair, Link2, Scale, ShieldAlert, Signal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getUltimaAtualizacao } from "@/lib/db";
import { logoutAction } from "@/app/(auth)/login/actions";
import { CommandNav } from "@/components/command/command-nav";
import { MapaDoSite } from "@/components/mapa-do-site";
import {
  contextoSessao,
  comparativoPermitido,
  unidadesDaAutorizacao,
} from "@/lib/db/permissoes";

const PERFIL_ROTULO: Record<string, string> = {
  comando: "Comando",
  estado_maior: "Estado-Maior",
  cmt_cia: "Cmt de Companhia",
  secao: "Seção",
};

// Tipografia do padrão visual das páginas de unidade da intranet PMESP
// (tema "template", ref. DEC): Poppins. Carregada só neste route group.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const MARCAS = [
  { Icon: Crosshair, label: "Segundos" },
  { Icon: Link2, label: "Flagrante" },
  { Icon: Scale, label: "Custódia" },
];

export default async function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ sessao, aut }, ultimaAtualizacao] = await Promise.all([
    contextoSessao(),
    getUltimaAtualizacao(),
  ]);

  const unidades = unidadesDaAutorizacao(aut).map((valor) => ({ valor }));

  // h-screen, e não min-h-screen: o <main> abaixo é overflow-y-auto e foi
  // desenhado para ser o scrollport, com cabeçalho, tarja de sigilo e rodapé
  // fixos em volta. Com altura MÍNIMA o wrapper crescia junto com o conteúdo,
  // o <main> nunca rolava de fato e quem rolava era o documento: a tarja de
  // uso restrito saía de vista e nenhum `sticky` interno tinha faixa onde
  // grudar, porque um scrollport que não rola não oferece deslocamento.
  return (
    <div
      className={`${poppins.variable} tema-institucional flex h-screen bg-tatico-fundo text-branco`}
    >
      {/* Barra lateral */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-branco/10 bg-tatico-super md:flex">
        <div className="flex items-center gap-3 border-b border-branco/10 px-4 py-4">
          <Image
            src="/brand/16bpmm.png"
            alt="Brasão do 16º BPM/M"
            width={40}
            height={57}
            className="h-14 w-auto drop-shadow-sm"
          />
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight">CCO-16</p>
            <p className="text-[10px] uppercase tracking-wider text-branco/45">
              Sala de Comando
            </p>
          </div>
        </div>
        <CommandNav
          unidades={unidades}
          mostrarComparativo={comparativoPermitido(aut)}
          rotasPermitidas={aut.irrestrito ? null : [...aut.rotas]}
          ehComando={sessao?.perfil === "comando"}
        />
        <div className="mt-auto border-t border-branco/10 p-3">
          <Image
            src="/brand/pmesp-logomarca.png"
            alt="Polícia Militar do Estado de São Paulo"
            width={180}
            height={40}
            className="mx-auto mb-2 h-8 w-auto opacity-90"
          />
          <p className="text-center text-[10px] leading-relaxed text-branco/35">
            Uso reservado · Trilha de auditoria ativa em todas as ações.
          </p>
        </div>
      </aside>

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="faixa-institucional h-1 shrink-0" />
        <header className="flex items-center justify-between gap-4 border-b border-branco/10 bg-tatico-super px-5 py-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                16º BPM/M · Centro de Controle Operacional
              </p>
              <p className="text-[11px] text-branco/45">
                1º Ten PM Fernão Gomes Loureiro
              </p>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              {MARCAS.map(({ Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-branco/10 bg-branco/5 px-2.5 py-1 text-[11px] font-medium text-branco/70"
                >
                  <Icon size={13} className="text-ouro" strokeWidth={2.25} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Image
              src="/brand/logotipo-pmesp.svg"
              alt="Polícia Militar do Estado de São Paulo"
              width={132}
              height={36}
              className="hidden h-9 w-auto sm:block"
            />
            <div className="text-right">
              <p className="text-sm font-medium">{sessao?.nome ?? sessao?.usuario ?? "—"}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ouro">
                {sessao ? (PERFIL_ROTULO[sessao.perfil] ?? sessao.perfil) : "—"}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-branco/15 px-3 py-1.5 text-xs font-medium text-branco/70 transition-colors hover:bg-branco/5 hover:text-branco"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        {/* Tarja de classificação: dado operacional e pessoal circula em toda
            a Sala de Comando, então a marcação de sigilo precisa estar visível
            em TODAS as páginas — não só no rodapé da barra lateral (que some
            no mobile, onde a sidebar é ocultada). */}
        <div className="flex items-center justify-center gap-2 bg-amber-950/60 px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-400/90">
          <ShieldAlert size={12} strokeWidth={2.5} />
          Uso restrito · 16º BPM/M · proibida a divulgação externa
        </div>

        {/* O mapa do site entra DENTRO do scrollport: o wrapper é h-screen e
            quem rola é o <main>, então um rodapé fora dele jamais apareceria.
            As margens negativas espelham o padding do main para o rodapé
            encostar nas bordas, como um pé de página de verdade. */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          {children}
          <div className="-mx-5 -mb-5 mt-8 md:-mx-7 md:-mb-7">
            <MapaDoSite />
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-branco/10 bg-tatico-super px-5 py-2 text-[11px] text-branco/40">
          <span>
            {ultimaAtualizacao
              ? `Dados atualizados há ${formatDistanceToNow(new Date(ultimaAtualizacao), { locale: ptBR })}`
              : "Sem registro de atualização das fontes"}
            {" · "}
            <Link href="/fontes" className="inline-flex items-center gap-1 text-branco/60 underline-offset-2 hover:underline">
              <Signal size={11} /> frescor por fonte
            </Link>
          </span>
          <span>Portal CCO-16 · 16º BPM/M · uso restrito</span>
        </footer>
      </div>
    </div>
  );
}
