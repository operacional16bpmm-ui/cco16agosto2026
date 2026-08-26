import { Cctv } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { getCameras } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";
import { CameraForm } from "./camera-form";

export const metadata = { title: "Câmeras do Território · CCO-16" };
export const dynamic = "force-dynamic";

const STATUS_TOM: Record<string, "ok" | "attention" | "neutro"> = {
  homologada: "ok",
  em_analise: "attention",
  proposta: "attention",
  recusada: "neutro",
  inativa: "neutro",
};
const ORIGEM: Record<string, string> = {
  muralha: "Muralha", smart_sampa: "Smart Sampa", comercio: "Comércio",
  condominio: "Condomínio", conseg: "CONSEG", vizinhanca_solidaria: "Vizinhança Solidária", outros: "Outros",
};

export default async function CamerasPage() {
  await exigirPagina("/cameras");
  const cameras = await getCameras();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Câmeras do Território"
        descricao="Multiplica a cobertura sem custo de instalação — câmeras de comércio e condomínio aderem via CONSEG / Vizinhança Solidária (modelo DF 360: adesão rápida)."
        acao={<Badge tone="neutro"><Cctv size={12} /> {cameras.length} cadastrada(s)</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ouro">Propor câmera</h2>
          <CameraForm />
          <p className="mt-3 text-[11px] leading-relaxed text-branco/40">
            A adesão é do proprietário; a base legal (convênio/termo) é registrada na homologação.
            Imagem bruta não é copiada — só o cadastro e o ponto.
          </p>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">Câmeras cadastradas</h2>
          {cameras.length > 0 ? (
            <div className="space-y-2">
              {cameras.map((c) => (
                <Card key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-branco">{c.identificacao}</p>
                    <p className="truncate text-xs text-branco/45">
                      {ORIGEM[c.origem] ?? c.origem} · {c.endereco}
                      {c.tem_ocr ? " · OCR" : ""}
                    </p>
                  </div>
                  <Badge tone={STATUS_TOM[c.status] ?? "neutro"}>{c.status.replace(/_/g, " ")}</Badge>
                </Card>
              ))}
            </div>
          ) : (
            <DataState
              icon={<Cctv size={26} />}
              titulo="Nenhuma câmera cadastrada ainda"
              texto="As câmeras propostas aparecem aqui com status proposta → em análise → homologada, e entram no mapa depois de aprovadas."
            />
          )}
        </div>
      </div>
    </div>
  );
}
