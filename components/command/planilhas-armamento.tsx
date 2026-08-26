import { Card } from "@/components/command/ui";

type Planilha = {
  titulo: string;
  id: string;
  gid?: string;
};

const PLANILHAS: Planilha[] = [
  { titulo: "Controle de Material Bélico", id: "1e6PTQDtnm2FIpcDxwt8ZuN5qTykR1f7q3O9cA9r8xu4" },
  {
    titulo: "Controle de Armamento Individual do Efetivo",
    id: "1x03nmSA4U3yGhxFovSXVNpMqP0bFaR4MhYNocK2QQRg",
    gid: "1180054129",
  },
  { titulo: "Reserva de Armas", id: "1x_uKOae-sYeBCjaItYa4CkXrcDDkWNPC_HqTa3uyWHU" },
  { titulo: "Liberação de Armas", id: "1gDE0KaSnTJfDc7JLsdo6QE4xsdhXbKS1GAOKCzcDi18" },
];

/** Grade 2x2 de pré-visualização das planilhas-fonte de armamento, embutida via link de leitura do Google Sheets. */
export function PlanilhasArmamento() {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      {PLANILHAS.map((p) => (
        <Card key={p.id} className="p-0">
          <h2 className="border-b border-branco/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ouro">
            {p.titulo}
          </h2>
          <iframe
            src={`https://docs.google.com/spreadsheets/d/${p.id}/preview${p.gid ? `?gid=${p.gid}` : ""}`}
            className="h-72 w-full rounded-b-xl bg-white"
            loading="lazy"
            title={p.titulo}
          />
        </Card>
      ))}
    </div>
  );
}
