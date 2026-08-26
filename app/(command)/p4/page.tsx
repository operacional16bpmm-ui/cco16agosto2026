import Link from "next/link";
import {
  Package, ShieldCheck, Radio, Boxes, FileStack, Users,
  TriangleAlert, CircleDollarSign, ArrowRight, Camera,
} from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { PlanilhasArmamento } from "@/components/command/planilhas-armamento";
import { RankingBar, SerieMensalChart } from "@/components/command/secao/charts";
import {
  getKpisP4, getEfetivoP4, getArquivosFonteP4, kpi, ranking, brl,
} from "@/lib/db/p4";
import { getSecaoDashboard } from "@/lib/db/secao";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "P4 · Logística · CCO-16" };
export const dynamic = "force-dynamic";

const MODULOS = [
  {
    href: "/p4/telematica",
    icon: Radio,
    titulo: "Telemática",
    texto: "HT, TPD, computadores, notebooks, celular funcional, impressoras contratadas e endereçamento de rede.",
  },
  {
    href: "/p4/material-belico",
    icon: ShieldCheck,
    titulo: "Material Bélico",
    texto: "Armas, coletes e algemas por Cia, com estado e detentor — mais o inventário fotográfico.",
  },
  {
    href: "/p4/inventario",
    icon: Boxes,
    titulo: "Inventário & LCM",
    texto: "Livro de Carga completo, inventário por seção e material controlado por lote.",
  },
  {
    href: "/p4/documentos",
    icon: FileStack,
    titulo: "Documentos",
    texto: "LCM mensal, CMEX, detentor executivo, ofícios, escalas e fardamento — indexados e rastreáveis.",
  },
];

export default async function P4Page() {
  await exigirPagina("/p4");

  const [kpis, efetivo, fontes, historico] = await Promise.all([
    getKpisP4(),
    getEfetivoP4(),
    getArquivosFonteP4(),
    getSecaoDashboard("p4"),
  ]);

  if (kpis.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader
          titulo="P4 · Logística"
          descricao="Patrimônio, material bélico, telemática e inventário do 16º BPM/M."
        />
        <PlanilhasArmamento />
        <DataState
          icon={<Package size={28} />}
          titulo="Sem dados ingeridos"
          texto="Rode scripts/ingest_p4.py para carregar a pasta Z:\16BPMM_EM\P4\P4 2026\ no portal."
        />
      </div>
    );
  }

  const itens = kpi(kpis, "lcm", "total", "ITENS_PATRIMONIADOS");
  const valor = kpi(kpis, "lcm", "total", "VALOR_TOTAL");
  const semColete = kpi(kpis, "coletes", "total", "PMS_SEM_COLETE");
  const noRomaneio = kpi(kpis, "coletes", "total", "PMS_NO_ROMANEIO");
  const vencemAno = kpi(kpis, "coletes", "total", "VENCEM_ESTE_ANO");
  const efetivoTotal = kpi(kpis, "efetivo", "total", "EFETIVO");
  const ativosTelem = kpi(kpis, "telematica", "total", "ATIVOS");
  const belicoTotal = kpi(kpis, "belico", "total", "REGISTROS");
  const fotos = kpi(kpis, "fotos", "total", "FOTOS");
  const arquivos = kpi(kpis, "documentos", "total", "ARQUIVOS");

  const porTipo = ranking(kpis, "lcm", "por_tipo");
  const porCia = ranking(kpis, "efetivo", "por_cia", 10);

  // Equipe do P4: quem tem a seção como função/lotação.
  const equipeP4 = efetivo.filter((m) =>
    [m.funcao, m.cia].some((c) => c && /P\s*[\/-]?\s*4|^P4$/i.test(c))
  );

  const pctSemColete =
    semColete != null && noRomaneio ? (semColete / noRomaneio) * 100 : null;

  const itensPorAno = historico.fatos
    .filter((f) => f.indicador === "itens_patrimoniados" && f.eh_anual)
    .map((f) => ({ chave: String(f.ano), valor: Number(f.valor) }))
    .sort((a, b) => Number(a.chave) - Number(b.chave));
  const valorPorAno = historico.fatos
    .filter((f) => f.indicador === "valor_total_carga" && f.eh_anual)
    .map((f) => ({ ano: f.ano, valor: Number(f.valor) }));
  const anoMaisRecente = itensPorAno.at(-1);
  const anoMaisAntigo = itensPorAno[0];
  const variacaoItensPct =
    anoMaisRecente && anoMaisAntigo && anoMaisAntigo.valor > 0
      ? Math.round(((anoMaisRecente.valor - anoMaisAntigo.valor) / anoMaisAntigo.valor) * 1000) / 10
      : null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="P4 · Logística"
        descricao="Patrimônio, material bélico, telemática e inventário do 16º BPM/M — dado real do Livro de Carga e das planilhas da seção."
        acao={
          <Badge tone="neutro">
            <Package size={12} /> {itens?.toLocaleString("pt-BR")} itens
          </Badge>
        }
      />

      <PlanilhasArmamento />

      {/* Capa: o número que o Comando pergunta primeiro. */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2">
          <CircleDollarSign size={18} className="text-ouro" strokeWidth={1.75} />
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-branco">{brl(valor)}</p>
          <p className="text-xs text-branco/55">
            Valor total sob carga · {itens?.toLocaleString("pt-BR")} itens patrimoniados
          </p>
        </Card>
        <Card>
          <Users size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">{efetivoTotal ?? "—"}</p>
          <p className="text-xs text-branco/55">Efetivo do batalhão</p>
        </Card>
        <Card>
          <Radio size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">{ativosTelem ?? "—"}</p>
          <p className="text-xs text-branco/55">Ativos de telemática</p>
        </Card>
      </div>

      {/* Alerta operacional: PM sem colete é risco de vida, vai no topo. */}
      {semColete != null && semColete > 0 && (
        <Card className="mb-5 border-vermelho/30 bg-vermelho/5">
          <div className="flex flex-wrap items-start gap-4">
            <TriangleAlert size={20} className="mt-0.5 shrink-0 text-vermelho" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-branco">
                {semColete} policiais sem colete balístico em carga
              </p>
              <p className="mt-1 text-xs text-branco/60">
                De {noRomaneio?.toLocaleString("pt-BR")} PMs no romaneio
                {pctSemColete != null && ` (${pctSemColete.toFixed(1)}%)`}
                {vencemAno != null && vencemAno > 0 &&
                  ` · outros ${vencemAno} têm colete vencendo em 2026`}
                . Fonte: COPIA ROMANEIO DE COLETES — aba Romaneio.
              </p>
            </div>
            <Link
              href="/p4/material-belico"
              className="inline-flex items-center gap-1.5 rounded-md border border-vermelho/40 px-3 py-1.5 text-xs font-medium text-vermelho transition-colors hover:bg-vermelho/10"
            >
              Ver detalhe <ArrowRight size={13} />
            </Link>
          </div>
        </Card>
      )}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Patrimônio por tipo de material
          </h2>
          <RankingBar data={porTipo} unidade="itens" />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Efetivo por Cia
          </h2>
          <RankingBar data={porCia} unidade="PMs" cor="#3b82f6" />
        </Card>
      </div>

      {itensPorAno.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Histórico plurianual (2019–2025)
          </h2>
          <Card>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs text-branco/55">
                Itens patrimoniados por ano — Livro de Carga / Inventário.
              </p>
              {variacaoItensPct != null && (
                <span
                  className={`text-xs font-semibold ${variacaoItensPct >= 0 ? "text-emerald-700" : "text-vermelho"}`}
                >
                  {variacaoItensPct >= 0 ? "+" : ""}
                  {variacaoItensPct}% desde {anoMaisAntigo?.chave}
                </span>
              )}
            </div>
            <SerieMensalChart
              data={itensPorAno.map((p) => ({ chave: p.chave, itens: p.valor }))}
              series={[{ key: "itens", nome: "Itens patrimoniados", cor: "#d53441" }]}
            />
            {valorPorAno.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {valorPorAno
                  .sort((a, b) => a.ano - b.ano)
                  .map((v) => (
                    <span
                      key={v.ano}
                      className="rounded-full border border-branco/15 bg-branco/5 px-3 py-1 text-xs font-medium text-branco/75"
                    >
                      {v.ano}: {brl(v.valor)}
                    </span>
                  ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Equipe do P4 — quem toca a seção. */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-ouro">
        Equipe da Seção
      </h2>
      {equipeP4.length > 0 ? (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                  <th className="px-4 py-3 font-semibold">Posto/Grad</th>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Função</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {equipeP4.map((m, i) => (
                  <tr key={`${m.re}-${i}`} className="border-b border-branco/5 last:border-0">
                    <td className="px-4 py-3 font-semibold text-branco">{m.posto_grad ?? "—"}</td>
                    <td className="px-4 py-3 text-branco/70">{m.nome}</td>
                    <td className="px-4 py-3 text-branco/60">{m.funcao ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={m.situacao === "APTO" ? "ok" : "attention"}>
                        {m.situacao ?? "—"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="mb-5">
          <p className="text-xs text-branco/50">
            Nenhum policial com lotação explícita em P/4 na planilha de efetivo — a coluna
            FUNÇÃO traz o cargo operacional, não a seção. O efetivo completo está em{" "}
            <Link href="/p1" className="text-azul hover:underline">P1 · Pessoal</Link>.
          </p>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-ouro">
        Módulos do P4
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {MODULOS.map(({ href, icon: Icon, titulo, texto }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-azul/40 group-hover:bg-tatico-super/60">
              <div className="flex items-start justify-between gap-3">
                <Icon size={18} className="text-azul" strokeWidth={1.75} />
                <ArrowRight
                  size={15}
                  className="text-branco/20 transition-colors group-hover:text-azul"
                />
              </div>
              <p className="mt-3 text-sm font-semibold text-branco">{titulo}</p>
              <p className="mt-1 text-xs text-branco/55">{texto}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <ShieldCheck size={16} className="text-branco/40" strokeWidth={1.75} />
          <p className="mt-2 text-xl font-bold text-branco">{belicoTotal?.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-branco/50">Registros de material bélico</p>
        </Card>
        <Card>
          <Camera size={16} className="text-branco/40" strokeWidth={1.75} />
          <p className="mt-2 text-xl font-bold text-branco">{fotos ?? "—"}</p>
          <p className="text-xs text-branco/50">Fotos do inventário</p>
        </Card>
        <Card>
          <FileStack size={16} className="text-branco/40" strokeWidth={1.75} />
          <p className="mt-2 text-xl font-bold text-branco">{arquivos?.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-branco/50">Documentos indexados</p>
        </Card>
      </div>

      {/* Proveniência — de onde veio cada número desta tela. */}
      {fontes.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-ouro">
            Fontes
          </h2>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                    <th className="px-4 py-3 font-semibold">Arquivo</th>
                    <th className="px-4 py-3 font-semibold">Linhas</th>
                    <th className="px-4 py-3 font-semibold">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {fontes.map((f) => (
                    <tr key={f.caminho_unc} className="border-b border-branco/5 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-branco/80">{f.nome_arquivo}</p>
                        <p className="tempo mt-0.5 text-[10px] text-branco/35">{f.caminho_unc}</p>
                      </td>
                      <td className="px-4 py-3 text-branco/60">{f.linhas_reais ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-branco/50">{f.observacao ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p className="mt-4 text-xs text-branco/35">
        Dado extraído de Z:\16BPMM_EM\P4\P4 2026\ · recarregue com{" "}
        <code className="tempo text-branco/50">python scripts/ingest_p4.py</code>
      </p>

      <ListaDocumentosSecao secao="p4" />
    </div>
  );
}
