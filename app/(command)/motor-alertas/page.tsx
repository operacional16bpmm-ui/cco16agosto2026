import { Bell, ShieldAlert } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { getAlertRules } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Motor de Alertas · CCO-16" };
export const dynamic = "force-dynamic";

const NIVEL_TOM = { critical: "critical", urgent: "urgent", attention: "attention", informative: "informative" } as const;
const NIVEL_LABEL = { critical: "Crítico", urgent: "Urgente", attention: "Atenção", informative: "Informativo" } as const;

export default async function MotorAlertasPage() {
  await exigirPagina("/motor-alertas");
  const regras = await getAlertRules();
  // Badge de contagem só conta regras de fato ativas — antes usava
  // regras.length puro, contando também as marcadas !ativo como "ativas".
  const regrasAtivas = regras.filter((r: any) => r.ativo);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Motor de Alertas"
        descricao="Menos alertas, melhores. Quatro níveis com limiar de confiança e teto de falso-positivo por regra — a regra que passar do teto é revista ou desligada. Combate o alarme-fadiga."
        acao={<Badge tone="neutro"><Bell size={12} /> {regrasAtivas.length} regras ativas</Badge>}
      />

      <Card className="mb-4 border-azul/20 bg-azul/5">
        <p className="text-xs leading-relaxed text-branco/70">
          A capacidade de detecção do operador cai <strong className="text-branco">mais de 90% após
          20 minutos</strong> de tela. Por isso o sistema chama o operador (não o contrário), e cada
          regra é medida: se o falso-positivo passa do teto, ela vira ruído e precisa de ajuste.
        </p>
      </Card>

      {regras.length === 0 ? (
        <DataState
          icon={<ShieldAlert size={28} />}
          titulo="Nenhuma regra de alerta cadastrada"
          texto="A tabela alert_rules ainda não foi populada para este ambiente."
        />
      ) : (
      <div className="space-y-3">
        {regras.map((r) => {
          const nivel = r.nivel as keyof typeof NIVEL_TOM;
          const fpPct = r.disparos > 0 ? Math.round((r.falsos_positivos / r.disparos) * 100) : null;
          return (
            <Card key={r.codigo} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={NIVEL_TOM[nivel]}>{NIVEL_LABEL[nivel]}</Badge>
                  <span className="text-[11px] uppercase tracking-wide text-branco/35">{r.codigo}</span>
                  {!r.ativo && <Badge tone="neutro">desativada</Badge>}
                </div>
                <p className="mt-2 text-sm font-medium text-branco">{r.descricao}</p>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-branco/40">Limiar OCR</p>
                  <p className="tempo text-sm font-semibold text-branco/80">
                    {r.limiar_confianca != null ? `≥ ${r.limiar_confianca}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-branco/40">Teto FP</p>
                  <p className="tempo text-sm font-semibold text-branco/80">{r.teto_falso_positivo_pct}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-branco/40">FP atual</p>
                  <p className={`tempo text-sm font-semibold ${fpPct != null && fpPct > r.teto_falso_positivo_pct ? "text-vermelho" : "text-branco/30"}`}>
                    {fpPct != null ? `${fpPct}%` : "—"}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
