import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { PageHeader, Badge, DataState } from "@/components/command/ui";
import { AbasCompanhia } from "@/components/command/companhia/abas";
import { exigirPagina } from "@/lib/db/permissoes";
import { podeLancar } from "@/lib/autorizacao";
import { listarDocumentosPorSecao } from "@/lib/db/documentos";
import { ehUnidadeValida, dadosUnidade, secaoDocumento, type Unidade } from "@/lib/unidades";
import type { SecaoDocumento } from "@/lib/secoes-documentos";
import { FormularioEscala } from "./formulario-escala";
import { CartaoEscala } from "./cartao-escala";

export async function generateMetadata({ params }: { params: Promise<{ cia: string }> }) {
  const { cia } = await params;
  if (!ehUnidadeValida(cia)) return { title: "Escala · CCO-16" };
  return { title: `Escala · ${dadosUnidade(cia).rotulo} · CCO-16` };
}
export const dynamic = "force-dynamic";

/**
 * Aba Escala: o comandante compartilha a escala do dia/semana em PDF ou
 * imagem, direto do painel da própria unidade — sem depender do Setor
 * Administrativo. Reusa o framework de documentos_secoes (migrations
 * 017/018/021/024), com categoria='escala' isolando esta lista da lista
 * geral de "Documentos" que já aparece na Visão Geral.
 */
export default async function EscalaCompanhiaPage({
  params,
}: {
  params: Promise<{ cia: string }>;
}) {
  const { cia: unidadeBruta } = await params;
  if (!ehUnidadeValida(unidadeBruta)) notFound();
  const unidade = unidadeBruta as Unidade;
  const sessao = await exigirPagina(`/companhia/${unidade}/escala`);

  const dados = dadosUnidade(unidade);
  const editar = podeLancar(sessao, unidade);

  const escalas = await listarDocumentosPorSecao(secaoDocumento(unidade) as SecaoDocumento, {
    categoria: "escala",
  });

  return (
    <div className="mx-auto max-w-6xl">
      <AbasCompanhia unidade={unidade} />

      <PageHeader
        titulo={`Escala · ${dados.rotulo}`}
        descricao="Escala do dia ou da semana da unidade, compartilhada pelo comandante em PDF ou imagem."
        acao={<Badge tone="neutro"><CalendarClock size={12} /> {escalas.length} publicada(s)</Badge>}
      />

      {editar && <FormularioEscala unidade={unidade} />}

      {escalas.length === 0 ? (
        <DataState
          icon={<CalendarClock size={28} />}
          titulo="Nenhuma escala publicada"
          texto={
            editar
              ? "Envie a escala do dia ou da semana no formulário acima."
              : "O comandante da unidade ainda não publicou a escala."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {escalas.map((doc) => (
            <CartaoEscala key={doc.id} documento={doc} unidade={unidade} podeExcluir={editar} />
          ))}
        </div>
      )}
    </div>
  );
}
