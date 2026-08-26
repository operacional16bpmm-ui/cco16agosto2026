import Link from "next/link";
import { Send, MapPin, Navigation, ListChecks } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { viaturaMaisProxima, osrmConfigurado } from "@/lib/routing";
import { getOcorrenciasAbertas, getViaturasMapa } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";
import { validarDespachoAction } from "./actions";

export const metadata = { title: "Despacho (CAD) · CCO-16" };
export const dynamic = "force-dynamic";

function fmtTempo(seg: number | null, distM: number) {
  if (seg != null) {
    const min = Math.round(seg / 60);
    return min <= 1 ? "~1 min" : `~${min} min`;
  }
  return `${(distM / 1000).toFixed(1)} km (linha reta)`;
}

export default async function DespachoPage({
  searchParams,
}: {
  searchParams: Promise<{ ocorrencia?: string }>;
}) {
  await exigirPagina("/despacho");
  const sp = await searchParams;
  const [ocorrencias, viaturas] = await Promise.all([
    getOcorrenciasAbertas(),
    getViaturasMapa(),
  ]);

  // Antes só a ocorrência mais recente com coordenadas era oferecida ao
  // despacho — ocorrências mais antigas (inclusive já "em_despacho" mas não
  // encerradas) ficavam presas sem forma de despachar. Agora a lista inteira
  // fica navegável e o operador escolhe qual atender via ?ocorrencia=ID.
  const comCoordenadas = ocorrencias.filter((o) => o.lat != null && o.lng != null);
  const alvo = comCoordenadas.find((o) => o.id === sp.ocorrencia) ?? comCoordenadas[0] ?? null;

  const disponiveis = viaturas.filter((v) => v.situacao === "disponivel");
  const ranking = alvo
    ? await viaturaMaisProxima({ lat: alvo.lat, lng: alvo.lng }, disponiveis)
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Despacho (CAD)"
        descricao="Cálculo da viatura mais próxima por tempo real de deslocamento. A IA ordena; o operador valida a cadeia CFP → CGP → equipe do setor."
        acao={
          <Badge tone={osrmConfigurado() ? "ok" : "attention"}>
            <Navigation size={12} />
            {osrmConfigurado() ? "OSRM ativo" : "OSRM não configurado (linha reta)"}
          </Badge>
        }
      />

      {comCoordenadas.length > 0 && alvo ? (
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1fr_1.15fr]">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ouro">
              <ListChecks size={15} /> Abertas ({comCoordenadas.length})
            </h2>
            <ul className="space-y-2">
              {comCoordenadas.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/despacho?ocorrencia=${o.id}`}
                    className={`block rounded-lg border px-3 py-2 text-xs transition-colors ${
                      o.id === alvo.id
                        ? "border-azul/40 bg-azul/10"
                        : "border-branco/10 hover:bg-branco/5"
                    }`}
                  >
                    <p className="truncate font-semibold text-branco">{o.titulo}</p>
                    <p className="truncate text-branco/45">{o.endereco}</p>
                    {o.status === "em_despacho" && (
                      <Badge tone="attention">em despacho</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-vermelho">
              Ocorrência selecionada
            </p>
            <h2 className="mt-2 text-lg font-bold text-branco">{alvo.titulo}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-branco/55">
              <MapPin size={13} /> {alvo.endereco}
            </p>
            {alvo.placa && (
              <p className="mt-4 rounded-md border border-vermelho/25 bg-vermelho/10 px-3 py-2 text-xs text-branco/70">
                Placa {alvo.placa} lida por OCR. <strong className="text-vermelho">Confirmação
                visual obrigatória</strong> antes da abordagem — o <em>match</em> não é causa suficiente.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
              Viaturas por proximidade
            </h2>
            {ranking.length > 0 ? (
              <ol className="space-y-2">
                {ranking.map((r, i) => (
                  <li
                    key={r.viatura.id}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      i === 0 ? "border-emerald-400/30 bg-emerald-400/5" : "border-branco/10 bg-tatico-fundo/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-branco/15 text-xs font-bold text-branco/70">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-branco">{r.viatura.prefixo}</p>
                        <p className="text-xs text-branco/45">{fmtTempo(r.tempoSeg, r.distanciaM)}</p>
                      </div>
                    </div>
                    {i === 0 ? (
                      <form action={validarDespachoAction}>
                        <input type="hidden" name="ocorrencia_id" value={alvo.id} />
                        <input type="hidden" name="viatura_id" value={r.viatura.id} />
                        {r.tempoSeg != null && <input type="hidden" name="tempo_seg" value={r.tempoSeg} />}
                        <input type="hidden" name="distancia_m" value={r.distanciaM} />
                        <button className="flex items-center gap-1.5 rounded-md bg-azul px-3 py-1.5 text-xs font-semibold text-branco hover:bg-azul-escuro">
                          <Send size={12} /> Validar despacho
                        </button>
                      </form>
                    ) : (
                      <Badge tone="neutro">alternativa</Badge>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-sm text-branco/40">Nenhuma viatura disponível.</p>
            )}
          </Card>
        </div>
      ) : (
        <DataState
          icon={<Send size={28} />}
          titulo="Nenhuma ocorrência aguardando despacho"
          texto="Ocorrências abertas na Sala de Operações aparecem aqui com a viatura mais próxima já calculada."
        />
      )}
    </div>
  );
}
