import { ServerCog, Users, ShieldAlert, Zap, Wifi } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/command/ui";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Continuidade · CCO-16" };

const DEGRADADO = [
  { icon: Wifi, gatilho: "Muralha/Detecta fora", acao: "Operar com COPOM + denúncias + rádio; marcar feed como offline no painel; não depender de OCR." },
  { icon: Zap, gatilho: "Energia/rede da sala fora", acao: "Nobreak + link redundante assumem; se persistir, comando passa ao COPOM e à cadeia normal do batalhão." },
  { icon: ServerCog, gatilho: "CCO indisponível", acao: "Batalhão opera normalmente pela doutrina padrão — o CCO qualifica, não é ponto único de falha." },
];

export default async function ContinuidadePage() {
  await exigirPagina("/continuidade");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Continuidade & Modo Degradado"
        descricao="A resposta à pergunta que mata o projeto: 'e se cair?'. O CCO qualifica a resposta — nunca vira o cérebro sem o qual o batalhão fica cego."
        acao={<Badge tone="ok"><ShieldAlert size={12} /> Bus factor &gt; 1</Badge>}
      />

      {/* Bus factor / escala */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-azul" />
            <h2 className="text-sm font-bold text-branco">Não depende de uma pessoa</h2>
          </div>
          <p className="mt-2 text-sm text-branco/60">
            Mínimo de <strong className="text-branco">2 operadores treinados por turno</strong> e
            10–12 cadastrados no total. POP escrito desde o piloto: quem valida, quem despacha, o que
            se registra, escalonamento. O projeto sobrevive à transferência do idealizador.
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <ServerCog size={18} className="text-azul" />
            <h2 className="text-sm font-bold text-branco">Amarrado a documentos, não a pessoas</h2>
          </div>
          <p className="mt-2 text-sm text-branco/60">
            Projeto formal, POP e portaria interna garantem que o CCO sobreviva a trocas de comando.
            Dimensionado para os horários de pico (dado do COPOM), não 24/7 no papel 1.
          </p>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
        Plano de modo degradado
      </h2>
      <div className="space-y-3">
        {DEGRADADO.map(({ icon: Icon, gatilho, acao }) => (
          <Card key={gatilho} className="flex gap-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-vermelho/15 text-vermelho">
              <Icon size={17} strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-branco">{gatilho}</h3>
              <p className="mt-0.5 text-sm text-branco/60">{acao}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
