import { Radio, MapPin } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/command/ui";
import { OperationalMap } from "@/components/command/operational-map";
import { getViaturasMapa, getCamerasMapa, getOcorrenciasMapa, getOcorrenciasAbertas } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Sala de Operações · CCO-16" };
export const dynamic = "force-dynamic";

export default async function SalaOperacoesPage() {
  await exigirPagina("/sala-operacoes");

  const [viaturas, cameras, ocorrenciasMapa, fila] = await Promise.all([
    getViaturasMapa(),
    getCamerasMapa(),
    getOcorrenciasMapa(),
    getOcorrenciasAbertas(),
  ]);

  const ativo = viaturas.length + cameras.length + ocorrenciasMapa.length > 0;

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col">
      <PageHeader
        titulo="Sala de Operações"
        descricao="Fusão em tela única: Muralha + Mapa Força + CPP. A IA sugere a viatura mais próxima; o operador valida e decide."
        acao={
          <Badge tone={ativo ? "ok" : "neutro"}>
            <Radio size={12} /> {ativo ? `${viaturas.length} VTR · ${cameras.length} câmeras` : "Sem feed"}
          </Badge>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-h-[420px]">
          <OperationalMap viaturas={viaturas} cameras={cameras} ocorrencias={ocorrenciasMapa} />
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <Card className="flex-1 overflow-y-auto">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ouro">
                Fila de ocorrências
              </h2>
              <Badge tone="neutro">CFP → CGP → setor</Badge>
            </div>

            {fila.length > 0 ? (
              <ul className="space-y-3">
                {fila.map((o) => (
                  <li key={o.id} className="rounded-lg border border-branco/10 bg-tatico-fundo/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={o.status === "em_despacho" ? "urgent" : "critical"}>
                        {o.status === "em_despacho" ? "Em despacho" : "Aberta"}
                      </Badge>
                      {o.placa && <span className="tempo text-xs text-branco/50">{o.placa}</span>}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-branco">{o.titulo}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-branco/50">
                      <MapPin size={11} /> {o.endereco}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-branco/40">
                Nenhuma ocorrência aberta no momento.
              </p>
            )}
          </Card>

          <Card>
            <p className="text-[11px] leading-relaxed text-branco/45">
              <strong className="text-branco/70">Regra de ouro:</strong> nenhum despacho sai sem
              validação humana. Leitura de placa (OCR) exige confirmação visual antes de abordagem.
              Toda ação fica em trilha de auditoria.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
