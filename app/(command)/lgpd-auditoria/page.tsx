import { ScrollText, FileCheck2, Fingerprint, Timer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { getAuditEvents } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "LGPD & Auditoria · CCO-16" };
export const dynamic = "force-dynamic";

const PILARES = [
  { icon: FileCheck2, titulo: "RIPD / DPIA", texto: "Relatório de Impacto à Proteção de Dados feito antes de operar, acessível — não ocultado (como foi criticado no Muralha)." },
  { icon: Fingerprint, titulo: "Cadeia de custódia", texto: "Toda imagem que pode virar prova recebe hash SHA-256 e registro de etapa (CPP arts. 158-A a 158-F)." },
  { icon: Timer, titulo: "Retenção e descarte", texto: "Prazo definido por tipo de dado (placa, imagem, denúncia) com descarte automático ao vencer." },
  { icon: ScrollText, titulo: "Log de acesso", texto: "Quem consultou qual placa/pessoa, quando e por quê — para detectar uso indevido interno." },
];

const ACAO_LABEL: Record<string, string> = {
  insert: "Criou",
  update: "Atualizou",
  confirmar: "Confirmou",
  acknowledge: "Reconheceu",
};

export default async function LgpdAuditoriaPage() {
  await exigirPagina("/lgpd-auditoria");
  const eventos = await getAuditEvents(40);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="LGPD & Auditoria"
        descricao="A blindagem que salva o projeto na sala do Comando. Governança escrita antes da operação — o modelo do Reino Unido (ANPR) e o contrário do que derrubou outros sistemas."
        acao={<Badge tone="ok"><ScrollText size={12} /> {eventos.length} evento(s) recente(s)</Badge>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILARES.map(({ icon: Icon, titulo, texto }) => (
          <Card key={titulo}>
            <Icon size={18} className="text-azul" strokeWidth={1.75} />
            <h3 className="mt-3 text-sm font-bold text-branco">{titulo}</h3>
            <p className="mt-1 text-xs leading-relaxed text-branco/55">{texto}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 border-vermelho/20 bg-vermelho/5">
        <p className="text-xs leading-relaxed text-branco/70">
          <strong className="text-vermelho">Co-culpabilidade estatal:</strong> culpar &ldquo;a
          máquina&rdquo; por uma abordagem indevida <strong>não</strong> exime o agente. Por isso a
          doutrina &ldquo;IA sugere, humano decide&rdquo; é registrada em cada despacho — o log é a
          prova de que houve decisão humana fundamentada.
        </p>
      </Card>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ouro">
        Trilha de auditoria (audit_events)
      </h2>

      {eventos.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                <th className="px-4 py-3 font-semibold">Ação</th>
                <th className="px-4 py-3 font-semibold">Entidade</th>
                <th className="px-4 py-3 font-semibold">Detalhes</th>
                <th className="px-4 py-3 font-semibold">Quando</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="border-b border-branco/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-branco">
                    {ACAO_LABEL[e.action] ?? e.action}
                  </td>
                  <td className="px-4 py-3 text-branco/60">{e.entity_type}</td>
                  <td className="px-4 py-3 text-branco/45 text-xs">
                    {e.details && Object.keys(e.details).length > 0
                      ? JSON.stringify(e.details)
                      : "—"}
                  </td>
                  <td className="tempo px-4 py-3 text-branco/50">
                    {formatDistanceToNow(new Date(e.created_at), { locale: ptBR, addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <DataState
          icon={<ScrollText size={26} />}
          titulo="Nenhum evento registrado ainda"
          texto="Toda ação de escrita (câmera cadastrada, despacho validado, alerta confirmado) aparece aqui automaticamente, gravada por trigger no banco."
        />
      )}
    </div>
  );
}
