import { Scale, ShieldAlert, FileWarning, Archive } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { RankingBar } from "@/components/command/secao/charts";
import { TabelaDetalhe } from "@/components/command/secao/tabela-detalhe";
import { exigirPagina } from "@/lib/db/permissoes";
import {
  getSpjmdOverview,
  kpiProcessosVencidos,
  kpiIpmEmAndamento,
  acervoTotal,
  acervoPorSubarea,
} from "@/lib/db/spjmd";

export const metadata = { title: "SPJMD · CCO-16" };
export const dynamic = "force-dynamic";

export default async function SpjmdPage() {
  await exigirPagina("/spjmd");
  const { processos, ipm, acervo, arquivosFonte, temDados } = await getSpjmdOverview();

  if (!temDados) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader
          titulo="SPJMD"
          descricao="Processos disciplinares, IPM/IP/Sindicâncias e acervo do cartório — Seção de Justiça e Disciplina Militar."
        />
        <DataState
          icon={<Scale size={28} />}
          titulo="Sem dados ingeridos"
          texto="Rode a ingestão da SPJMD (fonte Y:\matrix\SPJMD, espelhada em Z:\16BPMM_EM\SPJMD\MATRIX) para carregar o portal."
        />
      </div>
    );
  }

  const vencidos = kpiProcessosVencidos(processos);
  const ipmAndamento = kpiIpmEmAndamento(ipm);
  const acervoQtd = acervoTotal(acervo);
  const porSubarea = acervoPorSubarea(acervo);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="SPJMD"
        descricao="Processos disciplinares, IPM/IP/Sindicâncias e acervo do cartório — Seção de Justiça e Disciplina Militar."
        acao={
          <Badge tone="ok">
            <Scale size={12} /> dados ingeridos
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <ShieldAlert size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-branco">{processos.length}</p>
          <p className="mt-1 text-sm font-semibold text-branco/80">Processos cadastrados</p>
        </Card>
        <Card className={vencidos > 0 ? "border-vermelho/30 bg-vermelho/5" : undefined}>
          <FileWarning size={18} className="text-vermelho" strokeWidth={1.75} />
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-branco">{vencidos}</p>
          <p className="mt-1 text-sm font-semibold text-branco/80">Com prazo vencido</p>
        </Card>
        <Card>
          <Scale size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-branco">{ipmAndamento}</p>
          <p className="mt-1 text-sm font-semibold text-branco/80">IPM/IP em andamento</p>
          <p className="text-[11px] uppercase tracking-wide text-branco/40">{ipm.length} no total</p>
        </Card>
        <Card>
          <Archive size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-branco">{acervoQtd.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-sm font-semibold text-branco/80">Documentos no acervo</p>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Acervo por subárea</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            Cartório, IPM, Sindicâncias, PD, IP, Apuração Preliminar, Registro de Fato, Evidência Digital
          </p>
          {porSubarea.length > 0 ? (
            <RankingBar data={porSubarea} cor="#305388" />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem contagem de acervo.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Processos com maior atraso</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">Top 15 · dias de prazo vencido</p>
          <TabelaDetalhe
            colunas={[
              { key: "numerador", rotulo: "Nº" },
              { key: "natureza", rotulo: "Natureza" },
              { key: "encaminhado_para", rotulo: "Encaminhado" },
              { key: "status", rotulo: "Status" },
              { key: "dias_prazo_vencido", rotulo: "Dias vencido", alinhamento: "direita" },
            ]}
            linhas={processos.slice(0, 15)}
            vazio="Sem processos cadastrados."
          />
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-branco">IPM / IP mais recentes</h2>
        <TabelaDetalhe
          colunas={[
            { key: "numero_ipm", rotulo: "Nº IPM" },
            { key: "ano", rotulo: "Ano" },
            { key: "tipo", rotulo: "Tipo" },
            { key: "encarregado", rotulo: "Encarregado" },
            { key: "situacao", rotulo: "Situação" },
            { key: "dias_atraso", rotulo: "Dias atraso", alinhamento: "direita" },
          ]}
          linhas={ipm.slice(0, 20)}
          vazio="Sem registros de IPM/IP."
        />
      </Card>

      {arquivosFonte.length > 0 && (
        <Card className="mt-5">
          <h2 className="mb-3 text-sm font-semibold text-branco">Proveniência dos dados</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {arquivosFonte.slice(0, 12).map((a, i) => (
              <div key={i} className="rounded border border-branco/10 p-2 text-[11px]">
                <p className="truncate font-medium text-branco/70" title={a.caminho_unc}>
                  {a.caminho_unc}
                </p>
                <p className="text-branco/40">
                  {a.linhas_reais != null ? `${a.linhas_reais} registro(s)` : "—"} · {a.dataset}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="mt-4 text-center text-[11px] text-branco/35">
        Dado disciplinar/correcional — acesso restrito a usuários autenticados do portal (RLS
        is_operational_member) e sujeito a auditoria (public.audit_events). Fonte: Y:\matrix\SPJMD, espelhada
        via Z:\16BPMM_EM\SPJMD\MATRIX.
      </p>

      <ListaDocumentosSecao secao="spjmd" />
    </div>
  );
}
