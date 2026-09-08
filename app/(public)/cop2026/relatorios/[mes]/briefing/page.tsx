import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NavegacaoCop } from "@/components/publico16/cop/navegacao-cop";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { BriefingDocumento } from "@/components/publico16/cop/briefing-documento";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import {
  FILTROS_VAZIOS,
  calcularPainel,
  lancamentosParaCsv,
  auditoresParaCsv,
} from "@/lib/cop2026-metricas";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";
import { relatorioPorChave, periodoEncerrado } from "@/lib/cop2026-relatorios";

export const metadata: Metadata = {
  title: "Briefing executivo · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export default async function BriefingDocumentoPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes: chave } = await params;
  const mes = relatorioPorChave(chave);
  if (!mes || !mes.disponivel) notFound();

  const [{ lancamentos, metas, erro, lidoEm }, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    identidadeCop(),
  ]);

  const painel = calcularPainel(lancamentos, metas, {
    ...FILTROS_VAZIOS,
    de: mes.periodo.de,
    ate: mes.periodo.ate,
  });

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <NavegacaoCop
        lidoEm={lidoEm}
        email={acesso?.email}
        ehAdmin={ehAdminCop(acesso?.email)}
        tituloPagina={`Briefing · ${mes.rotulo}`}
      />

      <main className="pt-2">
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <Link
            href={`/cop2026/relatorios/${chave}`}
            className="nao-imprime inline-flex items-center gap-1.5 text-[13px] font-semibold text-texto-suave transition-colors hover:text-vermelho"
          >
            <ArrowLeft className="h-4 w-4" /> Relatórios de {mes.rotulo}
          </Link>
        </div>

        <BriefingDocumento
          mes={mes}
          painel={painel}
          lidoEm={lidoEm}
          erro={erro}
          encerrado={periodoEncerrado(mes)}
          csvRespostas={lancamentosParaCsv(painel.dados)}
          csvAuditores={auditoresParaCsv(painel.auditoresLinhas)}
        />
      </main>

      <RodapeCop nota="Documento operacional — não distribuir fora do Batalhão." />
    </div>
  );
}
