import Link from "next/link";
import {
  Users,
  Truck,
  ShieldAlert,
  Bell,
  ClipboardList,
  Wrench,
  Swords,
  Scale,
  Megaphone,
  Package,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, Card } from "@/components/command/ui";
import { getOverviewCounts, getP2Overview, getComunicacao, getReservaArmas } from "@/lib/db";
import { getSecaoDashboard, totalIndicador } from "@/lib/db/secao";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Visão Geral · Sala de Comando CCO-16" };
export const dynamic = "force-dynamic";

/**
 * /overview = página do Estado-Maior. As pastas 16BPMM_EM\CMT, SUBCMT,
 * COORDOP e CFP estão confirmadas VAZIAS no inventário da rede (achado do
 * scout de arquitetura, 19/07/2026) — não existe fonte própria do comando, a
 * página já é por natureza um rollup das demais seções. Por isso não existe
 * uma rota /estado-maior separada.
 *
 * As 9 seções são buscadas em paralelo (Promise.all) — não com Suspense
 * individual por card: cada fetcher (getSecaoDashboard/getP2Overview/
 * getComunicacao/getReservaArmas) já passa pelo safe() de lib/db.ts, que
 * nunca deixa a promise rejeitar (erro vira log + fallback). Isolamento de
 * falha por seção já está garantido nessa camada; Suspense por card só
 * compraria revelação progressiva, e nesse projeto/ambiente de dev
 * apresentou um problema de streaming (swap de boundary não aplicado no
 * client) que não vale o risco para um ganho puramente cosmético.
 */
export default async function OverviewPage() {
  await exigirPagina("/overview");
  const [c, p1, p2, p3, p4, p5, motomec, reservaArmas, ft, spjmd] = await Promise.all([
    getOverviewCounts(),
    dadosSecaoFramework("p1", "efetivo_existente"),
    dadosP2(),
    dadosSecaoFramework("p3", "veiculos_recuperados"),
    dadosSecaoFramework("p4", "patrimonio_total"),
    dadosP5(),
    dadosSecaoFramework("motomec", "disponibilidade_frota"),
    dadosReservaArmas(),
    dadosSecaoFramework("ft", "flagrantes"),
    dadosSecaoFramework("spjmd", "ipm_instaurado"),
  ]);

  const kpisHoje = [
    { valor: c.setores, rotulo: "Setores CPP", fonte: "P3 · CPP", icon: Users },
    { valor: c.viaturasDisponiveis, rotulo: "Viaturas disponíveis", fonte: "MOTOMEC · P4", icon: Truck },
    { valor: c.alertasPendentes, rotulo: "Alertas de placa", fonte: "Fusão de fontes", icon: ShieldAlert },
    { valor: c.ocorrenciasAbertas, rotulo: "Ocorrências abertas", fonte: "Sala de Operações", icon: Bell },
  ];

  const secoes: { dados: DadosCard; rotulo: string; nota: string; icon: LucideIcon; href?: string }[] = [
    { dados: p1, rotulo: "P1 · Pessoal", nota: "QSE mensal · efetivo existente", icon: Users, href: "/p1" },
    { dados: p2, rotulo: "P2 · Inteligência", nota: "Capturas SSP · Nov/25–Jul/26", icon: ShieldAlert, href: "/p2" },
    { dados: p3, rotulo: "P3 · Operações", nota: "RAC mensal · veículos recuperados", icon: ClipboardList, href: "/p3" },
    { dados: p4, rotulo: "P4 · Logística", nota: "LCM / Mapa Bélico", icon: Package },
    { dados: p5, rotulo: "P5 · Comunicação", nota: "Seguidores @16bpmm_oficial", icon: Megaphone, href: "/comunicacao" },
    { dados: motomec, rotulo: "Motomec", nota: "Mapa diário", icon: Wrench },
    { dados: reservaArmas, rotulo: "Reserva de Armas", nota: "Disponível · P4 Material Bélico", icon: ShieldAlert, href: "/reserva-armas" },
    { dados: ft, rotulo: "Força Tática", nota: "Produtividade mensal", icon: Swords },
    { dados: spjmd, rotulo: "SPJMD", nota: "Só estatística agregada", icon: Scale },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Visão Geral"
        descricao="Painel de comando dos três comandantes — rollup mensal por seção do batalhão. Todo indicador exibe origem e estado; nada é preenchido sem homologação."
      />

      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-branco/40">
        Hoje
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpisHoje.map(({ valor, rotulo, fonte, icon: Icon }) => (
          <Card key={rotulo}>
            <div className="flex items-center justify-between">
              <Icon size={18} className="text-azul" strokeWidth={1.75} />
              {valor == null && (
                <span className="rounded bg-branco/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-branco/40">
                  aguardando
                </span>
              )}
            </div>
            <p className={`mt-4 text-3xl font-extrabold tracking-tight ${valor == null ? "text-branco/25" : "text-branco"}`}>
              {valor == null ? "—" : valor}
            </p>
            <p className="mt-1 text-sm font-semibold text-branco/80">{rotulo}</p>
            <p className="text-[11px] uppercase tracking-wide text-branco/40">{fonte}</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-wider text-ouro">
        Resultado do mês por seção
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {secoes.map((s) => (
          <CardConteudo key={s.rotulo} {...s} />
        ))}
      </div>

      <p className="mt-8 rounded-lg border border-branco/10 bg-tatico-super/20 px-5 py-4 text-xs leading-relaxed text-branco/45">
        <strong className="text-branco/70">Doutrina:</strong> a IA sugere, o humano valida e decide.
        Nenhum despacho ocorre sem operador. Toda ação de escrita e consulta a fonte restrita fica
        registrada em trilha de auditoria (LGPD · Decreto Est. 58.052/2012).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dados e card de seção
// ---------------------------------------------------------------------------

type DadosCard = { valor: number | string | null; badge: string };

function CardConteudo({
  rotulo,
  icon: Icon,
  dados,
  nota,
  href,
}: {
  rotulo: string;
  icon: LucideIcon;
  dados: DadosCard;
  nota: string;
  href?: string;
}) {
  const corpo = (
    <Card className={href ? "transition-colors hover:border-azul/30" : "opacity-70"}>
      <div className="flex items-center justify-between">
        <Icon size={18} className="text-azul" strokeWidth={1.75} />
        <span className="rounded bg-branco/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-branco/40">
          {dados.badge}
        </span>
      </div>
      <p className={`mt-4 text-2xl font-extrabold tracking-tight ${dados.valor != null ? "text-branco" : "text-branco/25"}`}>
        {dados.valor ?? "—"}
      </p>
      <p className="mt-1 text-sm font-semibold text-branco/80">{rotulo}</p>
      <p className="text-[11px] uppercase tracking-wide text-branco/40">
        {dados.valor != null ? nota : "em breve"}
      </p>
    </Card>
  );
  return href ? <Link href={href}>{corpo}</Link> : corpo;
}

/** Seções sem página própria ainda (Fases 4-6 do plano) — lê o framework
 * novo (fato_secao), hoje vazio para todas (nenhuma ingestão rodou ainda). */
async function dadosSecaoFramework(secao: string, indicador: string): Promise<DadosCard> {
  const { fatos, temDados } = await getSecaoDashboard(secao);
  const valor = temDados ? totalIndicador(fatos, indicador) : null;
  return { valor, badge: temDados ? "dados ingeridos" : "aguardando ingestão" };
}

async function dadosP2(): Promise<DadosCard> {
  const d = await getP2Overview();
  const valor = d.capturaSsp.total || null;
  return { valor, badge: valor != null ? "dados reais" : "aguardando" };
}

async function dadosP5(): Promise<DadosCard> {
  const c = await getComunicacao();
  const valor = c?.snapshot?.seguidores ?? null;
  return { valor: valor != null ? valor.toLocaleString("pt-BR") : null, badge: valor != null ? "dados reais" : "aguardando" };
}

async function dadosReservaArmas(): Promise<DadosCard> {
  const rows = await getReservaArmas();
  const totalDisponiveis = rows.length > 0 ? rows.reduce((s: number, r: any) => s + (r.disponiveis ?? 0), 0) : null;
  return { valor: totalDisponiveis, badge: totalDisponiveis != null ? "dados reais" : "aguardando" };
}
