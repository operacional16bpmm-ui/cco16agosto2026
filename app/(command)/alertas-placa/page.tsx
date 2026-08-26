import { ScanLine, ShieldCheck, ShieldX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { getAlertasPlaca } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";
import { confirmarAlertaAction } from "./actions";

export const metadata = { title: "Alertas de Placa · CCO-16" };
export const dynamic = "force-dynamic";

const MOTIVO: Record<string, string> = {
  roubo_furto: "Roubo/furto",
  mandado: "Mandado",
  suspeita: "Suspeita",
  outros: "Outros",
};

export default async function AlertasPlacaPage() {
  await exigirPagina("/alertas-placa");
  const alertas = await getAlertasPlaca();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Alertas de Placa (OCR)"
        descricao="Placa quente lida por câmera é empurrada à equipe (Força Tática ou Rádio Patrulha) da área. Confirmação visual humana é obrigatória antes de qualquer abordagem."
        acao={<Badge tone="critical"><ScanLine size={12} /> {alertas.length} pendente(s)</Badge>}
      />

      <Card className="mb-4 border-vermelho/20 bg-vermelho/5">
        <p className="text-xs leading-relaxed text-branco/70">
          A leitura automática erra (placas dubês/clonadas). ≥26 inocentes já foram abordados sob
          mira por erro de OCR em outros sistemas. Aqui, o alerta só vira abordagem após um humano
          <strong className="text-vermelho"> confirmar visualmente a placa</strong> — e a decisão
          fica registrada em trilha de auditoria.
        </p>
      </Card>

      {alertas.length > 0 ? (
        <div className="space-y-3">
          {alertas.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="tempo rounded-md border border-branco/15 bg-tatico-fundo px-3 py-1.5 text-lg font-bold tracking-widest text-branco">
                  {a.placa}
                </span>
                <div>
                  <p className="text-sm font-semibold text-branco">{MOTIVO[a.motivo] ?? a.motivo}</p>
                  <p className="text-xs text-branco/45">
                    {formatDistanceToNow(new Date(a.detectado_em), { locale: ptBR, addSuffix: true })}
                    {a.confianca_ocr != null ? ` · OCR ${a.confianca_ocr}%` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <form action={confirmarAlertaAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="resultado" value="confirmado" />
                  <button className="flex items-center gap-1.5 rounded-md bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                    <ShieldCheck size={13} /> Confirmar
                  </button>
                </form>
                <form action={confirmarAlertaAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="resultado" value="falso_positivo" />
                  <button className="flex items-center gap-1.5 rounded-md border border-branco/15 px-3 py-1.5 text-xs font-medium text-branco/70 hover:bg-branco/5">
                    <ShieldX size={13} /> Falso positivo
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataState
          icon={<ScanLine size={28} />}
          titulo="Nenhum alerta de placa pendente"
          texto="Leituras de OCR do Muralha/câmeras do território aparecem aqui para confirmação humana."
        />
      )}
    </div>
  );
}
