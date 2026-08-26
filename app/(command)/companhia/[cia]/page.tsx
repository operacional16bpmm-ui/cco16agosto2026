import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Users2,
  ShieldCheck,
  HeartPulse,
  Ban,
  Gavel,
  Fingerprint,
  PackageCheck,
  Truck,
  Swords,
  CalendarCheck,
  Boxes,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import { Card, Badge } from "@/components/command/ui";
import { SecaoShell } from "@/components/command/secao/shell";
import { KpiStrip, type KpiItem } from "@/components/command/secao/kpi-strip";
import { SerieMensalChart } from "@/components/command/secao/charts";
import { Gauge } from "@/components/command/secao/gauge";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { AbasCompanhia } from "@/components/command/companhia/abas";
import {
  totalIndicador,
  serieMensal,
  deltaMesAnterior,
  anosDisponiveis,
  ultimoValorMensal,
  type LinhaFato,
} from "@/lib/db/secao";
import { getPainelCompanhia } from "@/lib/db/companhia";
import { getDejemDataset, porCompanhia } from "@/lib/db/dejem";
import { ROTULO_CIA, type CiaDejem } from "@/lib/dejem-calculo";
import { parseFiltroSecao, type SearchParamsCru } from "@/lib/filtros";
import { exigirPagina, contextoSessao } from "@/lib/db/permissoes";
import { podeLancar } from "@/lib/autorizacao";
import { rotaEstaPermitida } from "@/lib/paginas";
import { ehUnidadeValida, dadosUnidade, ciaNumerica, secaoDocumento, type Unidade } from "@/lib/unidades";
import type { SecaoDocumento } from "@/lib/secoes-documentos";
import { QuadroLancamentos } from "./quadro-lancamentos";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ cia: string }> }) {
  const { cia } = await params;
  if (!ehUnidadeValida(cia)) return { title: "Companhia · CCO-16" };
  return { title: `${dadosUnidade(cia).rotulo} · CCO-16` };
}

/** Recorte mais recente (ano/mês) disponível no nível da unidade. */
function recorteRecente(fatos: LinhaFato[], cia: number | null) {
  const meses = fatos
    .filter((f) => (cia == null ? f.cia == null : f.cia === cia) && !f.eh_anual && f.mes != null)
    .map((f) => ({ ano: f.ano, mes: f.mes as number }));
  return [...meses].sort((a, b) => (a.ano !== b.ano ? b.ano - a.ano : (b.mes as number) - (a.mes as number)))[0];
}

export default async function CompanhiaPage({
  params,
  searchParams,
}: {
  params: Promise<{ cia: string }>;
  searchParams: Promise<SearchParamsCru>;
}) {
  const { cia: unidadeBruta } = await params;
  if (!ehUnidadeValida(unidadeBruta)) notFound();
  const unidade = unidadeBruta as Unidade;

  // Autorização por unidade (migration 023): a página da Cia só abre para o
  // Comando, para o comandante da própria unidade ou para quem tem a rota
  // liberada em usuarios_paginas. Forçar /companhia/2 na URL segue dando 404.
  const sessao = await exigirPagina(`/companhia/${unidade}`);

  const dados = dadosUnidade(unidade);
  const cia = ciaNumerica(unidade);
  const ehFT = unidade === "ft";

  const sp = await searchParams;
  const filtro = parseFiltroSecao(sp);
  const [painel, dejemDs, { aut }] = await Promise.all([
    getPainelCompanhia(unidade),
    getDejemDataset(),
    contextoSessao(),
  ]);
  const { fatos, arquivosFonte, lancamentos } = painel;

  // Só ofereço o atalho para a página do Estado-Maior se a sessão puder de
  // fato abri-la (comando/estado_maior são irrestritos; o Cmt de Cia precisa
  // ter recebido a rota do Comando) — um link que sempre 404 é pior que
  // nenhum link. P1/P3/Logística não têm recorte da FT (ela é seção própria
  // em fato_secao, sem número de Cia), então essas três só entram para as
  // 4 Companhias numeradas; DEJEM tem recorte para as 5 unidades.
  const linkSeSePode = (rota: string) => (aut.irrestrito || rotaEstaPermitida(aut.rotas, rota) ? rota : null);
  const linksSecoes = [
    ...(!ehFT
      ? [
          { rota: linkSeSePode(`/p1?cia=${cia}`), label: "P1 · Pessoal", icon: Users2 },
          { rota: linkSeSePode(`/p3?cia=${cia}`), label: "P3 · Operações", icon: Gavel },
          { rota: linkSeSePode(`/logistica?cia=${cia}`), label: "Logística · MOTOMEC", icon: Truck },
        ]
      : []),
    { rota: linkSeSePode(`/dejem?cia=${unidade}`), label: "DEJEM", icon: CalendarClock },
  ].filter((l): l is { rota: string; label: string; icon: typeof Users2 } => l.rota != null);

  const dejemCia = porCompanhia(dejemDs.jornadas, dejemDs.escalados).find(
    (c) => c.cia === (unidade as CiaDejem)
  );

  const anos = anosDisponiveis(fatos);
  const recente = recorteRecente(fatos, cia);
  const anoRef = filtro.ano ?? recente?.ano;
  const mesRef = filtro.mes ?? recente?.mes;

  const editar = podeLancar(sessao, unidade);
  const notaRef =
    anoRef != null && mesRef != null ? `${String(mesRef).padStart(2, "0")}/${anoRef}` : anoRef ? String(anoRef) : undefined;

  /* ------------------------------------------------- blocos por tipo de unidade */

  const kpis: KpiItem[] = ehFT ? kpisFT(fatos, anoRef, mesRef, notaRef) : kpisCia(fatos, cia, filtro.ano, filtro.mes);

  // Bloco 1 — prontidão (só Companhias: P1 por Cia). Existente/apto vêm do
  // recorte mais recente; a série mensal mostra a evolução do efetivo apto.
  const existente = ehFT ? null : totalIndicador(fatos, "efetivo_existente", { ano: anoRef, mes: mesRef, cia: cia ?? undefined });
  const apto = ehFT ? null : totalIndicador(fatos, "efetivo_apto", { ano: anoRef, mes: mesRef, cia: cia ?? undefined });
  const prontidao = existente && apto != null && existente > 0 ? Math.round((apto / existente) * 100) : null;

  const serieProntidao = ehFT
    ? []
    : serieMensal(fatos, "efetivo_apto", cia ?? undefined).map((p) => ({ chave: p.chave, apto: p.valor }));

  // Bloco 2 — produtividade (Companhias: P3 por Cia). Série de presos como
  // proxy da atividade; os demais indicadores entram no strip de KPIs.
  const serieProdutividade = ehFT
    ? serieMensal(fatos, "dias_empregados").map((p) => ({ chave: p.chave, valor: p.valor }))
    : serieMensal(fatos, "presos", cia ?? undefined).map((p) => ({ chave: p.chave, valor: p.valor }));

  // Bloco 3 — frota (disponibilidade_frota; nas Companhias já vem por Cia).
  // MOTOMEC anda em ritmo próprio, então usa o último mês dela, não o de P1.
  const frotaFiltrada =
    filtro.ano != null && filtro.mes != null
      ? totalIndicador(fatos, "disponibilidade_frota", { ano: filtro.ano, mes: filtro.mes, cia: cia ?? undefined })
      : null;
  const frotaUltimo = ultimoValorMensal(fatos, "disponibilidade_frota", cia ?? undefined);
  const dispFrota = frotaFiltrada ?? frotaUltimo?.valor ?? null;
  const dispFrotaNota =
    filtro.ano != null && filtro.mes != null
      ? notaRef
      : frotaUltimo
        ? `${String(frotaUltimo.mes).padStart(2, "0")}/${frotaUltimo.ano}`
        : null;
  const serieFrota = serieMensal(fatos, "disponibilidade_frota", cia ?? undefined).map((p) => ({ chave: p.chave, frota: p.valor }));

  return (
    <>
    <div className="mx-auto max-w-6xl">
      <AbasCompanhia unidade={unidade} />
    </div>
    <SecaoShell
      titulo={dados.rotulo}
      descricao={`Painel de comando da unidade · ${dados.area}. Efetivo, produtividade, frota e pendências ${
        editar ? "com lançamento pelo comandante" : "em acompanhamento"
      }.`}
      basePath={`/companhia/${unidade}`}
      filtro={filtro}
      anosDisponiveis={anos}
      temDados={painel.temDados}
      arquivosFonte={arquivosFonte}
      mostrarFiltroCia={false}
      acaoCabecalho={
        <Badge tone={editar ? "informative" : "neutro"}>
          <ShieldCheck size={12} /> {editar ? "Comando da unidade" : "Acompanhamento"}
        </Badge>
      }
    >
      <KpiStrip items={kpis} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {!ehFT && (
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-branco">Prontidão da tropa</h2>
            <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
              Efetivo apto sobre existente · {notaRef ?? "recorte recente"}
            </p>
            {prontidao != null ? (
              <Gauge percentual={prontidao} rotulo="apto/existente" cor="#3f7d54" />
            ) : (
              <p className="py-10 text-center text-sm text-branco/40">Sem dado de prontidão para o recorte.</p>
            )}
          </Card>
        )}

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">
            {ehFT ? "Dias de emprego — série mensal" : "Presos — série mensal"}
          </h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">{dados.curto}</p>
          {serieProdutividade.length > 0 ? (
            <SerieMensalChart
              data={serieProdutividade}
              series={[{ key: "valor", nome: ehFT ? "Dias empregados" : "Presos", cor: "#d53441" }]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem série para esta unidade.</p>
          )}
        </Card>

        {!ehFT && serieProntidao.length > 0 && (
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-branco">Efetivo apto — série mensal</h2>
            <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">{dados.curto}</p>
            <SerieMensalChart data={serieProntidao} series={[{ key: "apto", nome: "Aptos", cor: "#305388" }]} />
          </Card>
        )}

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Disponibilidade de frota</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            MOTOMEC · {dispFrota != null ? `${dispFrota}${dispFrotaNota ? ` · ${dispFrotaNota}` : ""}` : "sem dado"}
          </p>
          {serieFrota.length > 0 ? (
            <SerieMensalChart data={serieFrota} series={[{ key: "frota", nome: "Frota disponível", cor: "#c98a1b" }]} />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem série de frota para esta unidade.</p>
          )}
        </Card>
      </div>

      <Card className="mt-5 border-azul/20 bg-azul/5">
        <div className="flex items-start gap-3">
          {ehFT ? (
            <Swords size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          ) : (
            <Truck size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          )}
          <p className="text-xs leading-relaxed text-branco/70">
            Os números vêm da mesma ingestão do batalhão (P1, P3 e MOTOMEC em fato_secao), recortados
            para {dados.rotulo}. O que não cabe em planilha — pendências, ocorrências relevantes,
            justificativas de meta — o comandante lança no quadro abaixo, e cada registro fica assinado.
          </p>
        </div>
      </Card>

      {(dejemCia || linksSecoes.length > 0) && (
        <Card className="mt-5">
          <h2 className="mb-1 text-sm font-semibold text-branco">Seções do Batalhão</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            Mesmas páginas do Estado-Maior, já filtradas para {dados.curto}
          </p>

          {dejemCia && (
            <div className="mb-3 grid grid-cols-3 gap-3 rounded-lg border border-branco/10 bg-tatico-fundo/40 p-3">
              <div className="text-center">
                <p className="text-lg font-extrabold text-branco">{dejemCia.jornadas}</p>
                <p className="text-[10px] uppercase tracking-wide text-branco/40">Jornadas DEJEM</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-branco">{dejemCia.pms}</p>
                <p className="text-[10px] uppercase tracking-wide text-branco/40">PMs distintos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-branco">{dejemCia.mediaPorPm ?? "—"}</p>
                <p className="text-[10px] uppercase tracking-wide text-branco/40">Média por PM</p>
              </div>
            </div>
          )}

          {linksSecoes.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {linksSecoes.map(({ rota, label, icon: Icon }) => (
                <Link
                  key={rota}
                  href={rota}
                  className="flex items-center gap-2.5 rounded-md border border-branco/10 px-3 py-2 text-xs font-medium text-branco/75 transition-colors hover:bg-branco/5 hover:text-branco"
                >
                  <Icon size={14} className="shrink-0 text-azul" strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  <ArrowRight size={12} className="shrink-0 text-branco/30" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <Boxes size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-branco">Inventário e escala</p>
            <p className="mt-1 text-xs leading-relaxed text-branco/60">
              Material bélico, coletes e efetivo em carga desta unidade, e o quadro de escala do
              dia/semana enviado pelo comandante — nas abas acima.
            </p>
          </div>
        </div>
      </Card>

      <QuadroLancamentos unidade={unidade} lancamentos={lancamentos} podeEditar={editar} />

      <ListaDocumentosSecao secao={secaoDocumento(unidade) as SecaoDocumento} excluirCategoria="escala" />
    </SecaoShell>
    </>
  );
}

/* ------------------------------------------------------------------ KPIs */

function nomeMes(ano: number, mes: number): string {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

/**
 * KPIs da Companhia. Cada indicador usa o SEU próprio mês mais recente quando
 * a página está sem filtro de mês (o efetivo de P1 anda à frente da
 * produtividade de P3, e fixar um único mês fazia o que está atrás sumir); com
 * filtro de ano/mês explícito, respeita o recorte pedido. A nota de cada card
 * mostra a que mês o número se refere, então meses diferentes na mesma faixa
 * ficam evidentes, não escondidos.
 */
function kpisCia(fatos: LinhaFato[], cia: number | null, filtroAno?: number, filtroMes?: number): KpiItem[] {
  const filtrado = filtroAno != null && filtroMes != null;

  const card = (
    icon: KpiItem["icon"],
    rotulo: string,
    ind: string,
    tone?: KpiItem["tone"]
  ): KpiItem => {
    if (filtrado) {
      const valor = totalIndicador(fatos, ind, { ano: filtroAno, mes: filtroMes, cia: cia ?? undefined });
      return {
        icon,
        rotulo,
        valor,
        deltaPct: deltaMesAnterior(fatos, ind, filtroAno, filtroMes, cia ?? undefined),
        nota: nomeMes(filtroAno, filtroMes),
        tone,
      };
    }
    const ultimo = ultimoValorMensal(fatos, ind, cia ?? undefined);
    return {
      icon,
      rotulo,
      valor: ultimo?.valor ?? null,
      deltaPct: ultimo ? deltaMesAnterior(fatos, ind, ultimo.ano, ultimo.mes, cia ?? undefined) : null,
      nota: ultimo ? nomeMes(ultimo.ano, ultimo.mes) : undefined,
      tone,
    };
  };

  return [
    card(Users2, "Efetivo existente", "efetivo_existente", "neutro"),
    card(HeartPulse, "Aptos ao serviço", "efetivo_apto", "ok"),
    card(Ban, "Restrição médica", "efetivo_restricao_medica", "attention"),
    card(Gavel, "Presos no mês", "presos", "informative"),
    card(ShieldCheck, "Armas apreendidas", "armas_apreendidas"),
    card(PackageCheck, "Flagrantes", "flagrantes"),
    card(Fingerprint, "Capturas de procurado", "capturas_procurado"),
    card(Truck, "Veículos recuperados", "veiculos_recuperados"),
  ];
}

function kpisFT(fatos: LinhaFato[], anoRef?: number, mesRef?: number, nota?: string): KpiItem[] {
  const anual = (ind: string) => totalIndicador(fatos, ind, anoRef ? { ano: anoRef } : undefined);
  const mensal = (ind: string) => totalIndicador(fatos, ind, { ano: anoRef, mes: mesRef });
  return [
    { icon: Users2, rotulo: "Efetivo na FT", valor: anual("efetivo_total"), nota: anoRef ? String(anoRef) : undefined, tone: "neutro" },
    { icon: CalendarCheck, rotulo: "Dias de emprego", valor: mensal("dias_empregados"), deltaPct: anoRef && mesRef ? deltaMesAnterior(fatos, "dias_empregados", anoRef, mesRef) : null, nota, tone: "informative" },
    { icon: CalendarCheck, rotulo: "Em férias", valor: anual("ferias_concedidas"), nota: anoRef ? String(anoRef) : undefined, tone: "attention" },
  ];
}
