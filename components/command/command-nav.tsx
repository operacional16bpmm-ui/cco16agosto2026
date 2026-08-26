"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  Send,
  ScanLine,
  CalendarClock,
  BarChart3,
  Users,
  Truck,
  ShieldAlert,
  Signal,
  Bell,
  Megaphone,
  ScrollText,
  Newspaper,
  ServerCog,
  Cctv,
  Video,
  ClipboardList,
  Package,
  Swords,
  Scale,
  FileSpreadsheet,
  Building2,
  Target,
  FolderCog,
  Building,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { UNIDADES, type Unidade } from "@/lib/unidades";
import { ROTAS_PUBLICAS_NA_NAV, rotaEstaPermitida } from "@/lib/paginas";

type Item = { href: string; label: string; icon: LucideIcon; ready: boolean };

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Operação",
    itens: [
      { href: "/overview", label: "Visão Geral", icon: LayoutDashboard, ready: true },
      { href: "/sala-operacoes", label: "Sala de Operações", icon: Radio, ready: true },
      { href: "/despacho", label: "Despacho (CAD)", icon: Send, ready: true },
      { href: "/alertas-placa", label: "Alertas de Placa", icon: ScanLine, ready: true },
      { href: "/operacoes-especiais", label: "Operação Especial", icon: CalendarClock, ready: true },
      { href: "/p2", label: "P2 · Inteligência", icon: ShieldAlert, ready: true },
    ],
  },
  {
    titulo: "Dados & Gestão",
    itens: [
      { href: "/kpis", label: "KPIs Operacionais", icon: BarChart3, ready: true },
      { href: "/boletins", label: "Boletins · BG e BI", icon: Newspaper, ready: true },
      { href: "/dejem", label: "DEJEM · Estudo", icon: CalendarClock, ready: true },
      { href: "/logistica", label: "Logística · MOTOMEC", icon: Truck, ready: true },
      { href: "/reserva-armas", label: "Reserva de Armas", icon: ShieldAlert, ready: true },
      { href: "/fontes", label: "Frescor das Fontes", icon: Signal, ready: true },
      { href: "/motor-alertas", label: "Motor de Alertas", icon: Bell, ready: true },
      { href: "/comunicacao", label: "Comunicação · Reconhecimento", icon: Megaphone, ready: true },
      { href: "/16bpmminventario", label: "Inventário 2026", icon: FileSpreadsheet, ready: true },
      { href: "/administrativo", label: "Setor Administrativo", icon: FileSpreadsheet, ready: true },
      { href: "/administrativo/documentos", label: "Documentos por Seção", icon: FolderCog, ready: true },
    ],
  },
  {
    titulo: "Governança",
    itens: [
      { href: "/lgpd-auditoria", label: "LGPD & Auditoria", icon: ScrollText, ready: true },
      { href: "/continuidade", label: "Continuidade", icon: ServerCog, ready: true },
      { href: "/cameras", label: "Câmeras do Território", icon: Cctv, ready: true },
      { href: "/cop2026", label: "Auditoria de COP", icon: Video, ready: true },
      { href: "/governanca", label: "Governança · Indicadores", icon: Target, ready: true },
      // Gestão de acessos: item exclusivo do perfil comando (filtro abaixo).
      { href: "/administrativo/usuarios", label: "Usuários e Acessos", icon: KeyRound, ready: true },
    ],
  },
  {
    // As seções sem página própria ainda (Fases 4-6 do plano de expansão).
    // P2, Comunicação (P5) e Reserva de Armas já têm rota real e continuam
    // nos grupos acima — mover essas 3 para cá seria reorganização sem
    // ganho funcional nesta fase.
    //
    // Motomec (Fase 4) NÃO tem item aqui: seu dado real já vive em
    // /logistica ("Dados & Gestão" acima), que lê a mesma tabela
    // public.viaturas populada por ingest/secoes/motomec_frota.py. Ter um
    // 2º item "/motomec" (rota inexistente, ready:false) violaria o
    // princípio de nunca ter duas páginas para o mesmo dado (mesmo espírito
    // do redirect /efetivo → /p1 em next.config.ts).
    titulo: "Seções do Batalhão (em construção)",
    itens: [
      { href: "/p1", label: "P1 · Pessoal", icon: Users, ready: true },
      { href: "/p3", label: "P3 · Operações", icon: ClipboardList, ready: true },
      { href: "/p4", label: "P4 · Logística", icon: Package, ready: true },
      { href: "/forca-tatica", label: "Força Tática", icon: Swords, ready: true },
      { href: "/spjmd", label: "SPJMD", icon: Scale, ready: true },
      { href: "/estado-maior", label: "Estado-Maior", icon: Building2, ready: true },
    ],
  },
];

/**
 * Grupo "Companhias" montado a partir das unidades que a sessão pode ver
 * (o layout server calcula com lib/autorizacao.ts e passa por prop): o Cmt
 * da 3ª Cia vê só a 3ª; Comando e Estado-Maior veem as 5 mais o comparativo.
 */
function grupoCompanhias(
  unidades: { valor: Unidade }[],
  mostrarComparativo: boolean
): { titulo: string; itens: Item[] } | null {
  if (unidades.length === 0) return null;
  const itens: Item[] = [];
  if (mostrarComparativo) {
    itens.push({ href: "/companhia", label: "Todas as Companhias", icon: Building, ready: true });
  }
  for (const { valor } of unidades) {
    const dados = UNIDADES.find((u) => u.valor === valor);
    if (!dados) continue;
    itens.push({ href: `/companhia/${valor}`, label: dados.rotulo, icon: Building2, ready: true });
  }
  return { titulo: "Companhias", itens };
}

export function CommandNav({
  unidades = [],
  mostrarComparativo = false,
  rotasPermitidas = null,
  ehComando = false,
}: {
  unidades?: { valor: Unidade }[];
  mostrarComparativo?: boolean;
  /**
   * Rotas liberadas para a sessão (migration 023); null significa acesso
   * irrestrito (perfil comando). O filtro aqui é só de EXIBIÇÃO: quem digitar
   * a URL de uma página não liberada esbarra no exigirPagina do servidor.
   */
  rotasPermitidas?: string[] | null;
  ehComando?: boolean;
}) {
  const pathname = usePathname();
  const setPermitidas = rotasPermitidas ? new Set(rotasPermitidas) : null;

  const itemVisivel = (href: string): boolean => {
    // Usuários e Acessos nunca é concedível: só o Comando enxerga o item.
    if (href === "/administrativo/usuarios") return ehComando;
    if (!setPermitidas) return true;
    // Páginas públicas por decisão registrada em proxy.ts: esconder o item
    // não protegeria nada, o link circula fora do portal.
    if (ROTAS_PUBLICAS_NA_NAV.includes(href)) return true;
    return rotaEstaPermitida(setPermitidas, href);
  };

  const companhias = grupoCompanhias(unidades, mostrarComparativo);
  const grupos = (companhias ? [companhias, ...GRUPOS] : GRUPOS)
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((i) => itemVisivel(i.href)) }))
    .filter((grupo) => grupo.itens.length > 0);

  return (
    <nav className="flex flex-col gap-4 p-3">
      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-branco/30">
            {grupo.titulo}
          </p>
          <div className="flex flex-col gap-0.5">
            {grupo.itens.map(({ href, label, icon: Icon, ready }) => {
              const active = pathname === href;
              const base =
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors";
              if (!ready) {
                return (
                  <span
                    key={href}
                    aria-disabled
                    className={`${base} cursor-default text-branco/25`}
                    title="Em construção"
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    <span className="flex-1">{label}</span>
                    <span className="text-[9px] uppercase tracking-wide text-branco/30">
                      em breve
                    </span>
                  </span>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${base} ${
                    active
                      ? "bg-azul/20 font-semibold text-branco"
                      : "text-branco/70 hover:bg-branco/5 hover:text-branco"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
