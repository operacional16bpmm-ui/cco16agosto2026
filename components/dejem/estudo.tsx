import {
  aplicarFiltro,
  benchmarkEstadual,
  benchmarkUnidades,
  cargaIndividual,
  coberturaLog,
  elasticidadeOferta,
  faltasNominais,
  funil,
  getDejemDataset,
  heatmapDiaFaixa,
  ociosidadeComInscrito,
  penetracao,
  porAtividade,
  porCompanhia,
  porDiaSemana,
  porPosto,
  porTurno,
  pareto,
  serieMensal,
  trilhaAuditoria,
  type FiltroDejem,
} from "@/lib/db/dejem";
import {
  MESES_LONGO,
  ROTULO_CIA,
  SEM_DADO,
  num,
  pct,
  pctTexto,
  tomPreenchimento,
  type CiaDejem,
} from "@/lib/dejem-calculo";
import { ATOS, RECOMENDACOES, RESSALVAS, SUMARIO, VEREDITO } from "@/lib/dejem-conteudo";
import {
  Achado,
  AtoDivisor,
  BloqueioNominal,
  Card,
  EstadoVazio,
  Nota,
  NumeroDestaque,
  Pilula,
  ResumoQuadro,
  Secao,
  Tabela,
  TituloSecao,
} from "@/components/dejem/ui";
import {
  BlocoFunil,
  ComposicaoBarra,
  FiltroBar,
  Heatmap,
  MiniSerie,
  Sumario,
} from "@/components/dejem/blocos";
import { CapaRelatorio } from "@/components/dejem/capa-relatorio";
import { Fluxograma } from "@/components/dejem/fluxograma";
import { MatrizRisco, type ItemRisco } from "@/components/dejem/matriz-risco";
import { BarraEstudo } from "@/components/dejem/barra-estudo";
import { VoltarTopo } from "@/components/dejem/voltar-topo";
import { Revela } from "@/components/dejem/revela";
import {
  BarrasHorizontais,
  BarrasVerticais,
  CoberturaLog,
  CurvaConcentracao,
  DispersaoOferta,
  OfertaVersusPreenchimento,
} from "@/components/dejem/charts";
import { Simulador } from "@/components/dejem/simulador";


const CIAS_VALIDAS = new Set<CiaDejem>(["1", "2", "3", "4", "ft", "em", "sem"]);

/** Filtro tolerante: valor fora de faixa vira "sem filtro", nunca erro 500. */
export function lerFiltro(sp: Record<string, string | string[] | undefined>): FiltroDejem {
  const bruto = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";
  const mesNum = Number(bruto("mes"));
  const cia = bruto("cia") as CiaDejem;
  return {
    mes: Number.isInteger(mesNum) && mesNum >= 1 && mesNum <= 12 ? mesNum : undefined,
    cia: CIAS_VALIDAS.has(cia) ? cia : undefined,
  };
}

/**
 * Corpo do estudo DEJEM, compartilhado por duas rotas:
 *
 *   app/(command)/dejem            interna, com nominal para Comando e EM
 *   app/(public)/estudos/dejem/... pública por link, sempre sem nominal
 *
 * Existe como componente, e não duplicado nas duas páginas, porque são ~900
 * linhas: duplicar garantiria divergência silenciosa entre a versão que o
 * Comando lê e a que circula por link.
 *
 * `nominal` é decidido por QUEM CHAMA e nunca aqui dentro. A rota pública
 * passa false de forma incondicional, sem depender de sessão.
 */
export async function Estudo({
  filtro,
  nominal,
  basePath,
  cancelarPaddingDoMain = false,
}: {
  filtro: FiltroDejem;
  nominal: boolean;
  basePath: string;
  /** Só na rota interna: o <main> do grupo (command) tem p-5 md:p-7, e as
   *  seções deste estudo são full-bleed. Na rota pública não há esse padding,
   *  e a margem negativa estouraria o layout para a esquerda. */
  cancelarPaddingDoMain?: boolean;
}) {
  const margem = cancelarPaddingDoMain ? "-m-5 md:-m-7" : "";
  const bruto = await getDejemDataset();
  const ds = aplicarFiltro(bruto, filtro);

  const f = funil(ds.escalas, ds.jornadas);
  const serie = serieMensal(ds.escalas, ds.jornadas);
  const cias = porCompanhia(ds.jornadas, ds.escalados);
  const dias = porDiaSemana(ds.escalas, ds.jornadas);
  const turnos = porTurno(ds.escalas);
  const heat = heatmapDiaFaixa(ds.jornadas);
  const par = pareto(ds.jornadas);
  const postos = porPosto(ds.jornadas);
  const atividades = porAtividade(ds.jornadas);
  const pen = penetracao(ds.jornadas);
  const elast = elasticidadeOferta(bruto.escalas);
  const ocio = ociosidadeComInscrito(ds.escalas);
  const cobertura = coberturaLog(ds.log, ds.escalas);
  const trilha = trilhaAuditoria(ds.log.filter((l) => l.zerouPresenca));
  const faltas = faltasNominais(ds.log);
  const unidades = benchmarkUnidades(ds.escalasCpam5);
  const estado = benchmarkEstadual(bruto.benchmark);

  // O nominal é CONSTRUÍDO só quando o perfil permite. Filtrar no JSX não
  // bastaria: em RSC o payload das props viaja serializado para o navegador.
  const carga = cargaIndividual(ds.jornadas);
  const topCarga = nominal ? carga.nominal.slice(0, 20) : null;
  const topCargaAnon = carga.anonimo.slice(0, 20);
  const faltasLista = nominal ? faltas.consolidado : null;

  const mesesDisponiveis = [...new Set(bruto.escalas.map((e) => e.mes))].sort((a, b) => a - b);
  const recorte = [
    filtro.mes ? MESES_LONGO[filtro.mes] : "1º semestre de 2026",
    filtro.cia ? ROTULO_CIA[filtro.cia] : null,
  ].filter(Boolean).join(" · ");

  const nossaPosicao = unidades.filter((u) => u.ehDoBatalhao);
  const tomGeral = tomPreenchimento(f.taxaEscalacao);

  // Insumos dos cartões de achado do Ato I. Todos derivados dos mesmos
  // helpers que alimentam os quadros: nenhum número é escrito à mão.
  const serieHero = serieMensal(bruto.escalas, bruto.jornadas);
  const trendVagas = serieHero.map((s) => s.vagas ?? 0);
  const trendConfirmadas = serieHero.map((s) => s.confirmadas ?? 0);
  const piorPosicao = nossaPosicao.length ? Math.max(...nossaPosicao.map((u) => u.posicao)) : null;
  // A Companhia que mais sustenta escala do batalhão com a menor fatia em
  // DEJEM: é o caso que o cruzamento das duas fontes corrige.
  const ciaSobrecarregada = [...cias]
    .filter((c) => c.reconcilia && c.escalasTotais > 0)
    .sort((a, b) => (a.percentualDejem ?? 100) - (b.percentualDejem ?? 100))[0] ?? null;

  // Itens da matriz de risco: dias e turnos reais, com os dois eixos vindos
  // dos mesmos helpers dos quadros V e VII. Turnos de baixo volume ficam de
  // fora para não poluir a matriz com ruído estatístico.
  const itensRisco: ItemRisco[] = [
    ...dias.map((d) => ({
      rotulo: d.rotulo, tipo: "dia" as const,
      vagas: d.vagas, perdidas: d.vagas - d.presentes, preenchimento: d.preenchimento,
    })),
    ...turnos.filter((t) => t.vagas >= 100).map((t) => ({
      rotulo: t.periodo, tipo: "turno" as const,
      vagas: t.vagas, perdidas: t.vagas - t.presentes, preenchimento: t.preenchimento,
    })),
  ];

  if (!bruto.temDados) {
    return (
      <div className={`tema-vitrine min-h-full bg-branco text-texto ${margem}`}>
        <Secao>
          <TituloSecao quadro="Estudo analítico">DEJEM</TituloSecao>
          <EstadoVazio texto="Base do DEJEM ainda não ingerida. Rode `python -m ingest.secoes.dejem` na raiz do projeto." />
        </Secao>
      </div>
    );
  }

  return (
    // Na rota interna, a margem negativa espelha o padding do <main> em
    // app/(command)/layout.tsx (p-5 md:p-7) e permite seção full-bleed sem
    // alterar o layout. Na rota pública ela é omitida.
    <div className={`tema-vitrine bg-branco text-texto ${margem}`}>
      {/* ─────────────────────────────── CAPA ─────────────────────────────── */}
      <div className="faixa-institucional h-1 w-full" />
      <CapaRelatorio
        vagas={f.vagas}
        jornadas={f.confirmadas}
        homensHora={f.homensHora}
        pms={pen.pms}
        penetracao={pen.percentual}
        preenchimento={f.taxaEscalacao}
        ociosasComInscrito={f.ociosasComInscrito}
        ociosas={f.ociosas}
      />

      {/* O veredito e o sumário completo dos quinze quadros ficam logo abaixo
          da capa: a capa dá o resumo em cinco itens, este bloco dá o índice
          inteiro para quem vai percorrer o estudo. */}
      <div className="bg-azul-noite">
        <div className="mx-auto max-w-[1180px] px-5 py-14 md:py-16">
          <p className="max-w-[64ch] border-l-[3px] border-ouro-velho pl-6 font-serif text-[19px] leading-relaxed text-branco md:text-[21px]">
            {VEREDITO}
          </p>
          <div className="mt-12 grid gap-8 border-t border-branco/15 pt-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <NumeroDestaque claro valor={f.vagas} rotulo="Oferta mês a mês" nota="jan a jun de 2026" />
              <div className="mt-3 opacity-60"><MiniSerie valores={trendVagas} /></div>
            </div>
            <div>
              <NumeroDestaque claro valor={f.confirmadas} rotulo="Jornadas mês a mês" nota="jan a jun de 2026" />
              <div className="mt-3 opacity-60"><MiniSerie valores={trendConfirmadas} /></div>
            </div>
            <NumeroDestaque claro valor={f.ociosas} rotulo="Vagas ociosas" nota="não chegaram a ser escaladas" />
            <NumeroDestaque claro valor={f.inscricoesPorVaga} casas={2} sufixo="×" rotulo="Concorrência por vaga" nota={`${num(f.inscritos)} inscrições`} />
          </div>
          <div className="mt-14 border-t border-branco/15 pt-10">
            <p className="rotulo-dado mb-5 text-ouro-velho">Índice completo dos quadros</p>
            <Sumario itens={SUMARIO} />
          </div>
        </div>
      </div>

      {/* Filha direta do wrapper: `sticky` quebraria sob qualquer ancestral com
          overflow recortado, e o wrapper .tema-vitrine não tem nenhum. */}
      <BarraEstudo itens={SUMARIO}>
        <FiltroBar base={basePath} mes={filtro.mes} cia={filtro.cia} mesesDisponiveis={mesesDisponiveis} />
      </BarraEstudo>

      <AtoDivisor {...ATOS.panorama} />

      {/* Três achados antes de qualquer tabela: é o que o leitor leva se só
          olhar o topo da página. */}
      <Secao fundo="branco">
        <div className="grid gap-5 md:grid-cols-3">
          <Revela>
            <Achado
              numero={num(f.ociosasComInscrito)}
              titulo="Vagas que tinham candidato e ficaram vazias"
              texto={`De ${num(f.ociosas)} vagas ociosas no recorte, só ${num(f.ociosasSemInscrito)} ficaram sem nenhum interessado. O resto tinha inscrito e não foi escalado: é falha de fechamento, não de procura.`}
            />
          </Revela>
          <Revela delay={90}>
            <Achado
              tom="atencao"
              numero={piorPosicao ? `${piorPosicao}º` : SEM_DADO}
              unidade={`de ${num(unidades.length)}`}
              titulo="Posição entre as unidades do CPA/M-5"
              texto={`As unidades do topo atraem muito mais inscrição por vaga que o batalhão, e por isso têm margem para fechar a escala quando alguém desiste.`}
            />
          </Revela>
          <Revela delay={180}>
            <Achado
              tom="neutro"
              numero={ciaSobrecarregada ? pctTexto(ciaSobrecarregada.percentualDejem) : SEM_DADO}
              titulo={ciaSobrecarregada ? `Só isso do esforço da ${ciaSobrecarregada.rotulo} é DEJEM` : "Leitura por Companhia"}
              texto={
                ciaSobrecarregada
                  ? `Ela responde por ${num(ciaSobrecarregada.escalasTotais)} escalas de todas as modalidades. Parece desinteressada do DEJEM, mas é quem carrega a Atividade Delegada da unidade.`
                  : "O cruzamento entre DEJEM e o total de escalas corrige a leitura de qual Companhia está sobrecarregada."
              }
            />
          </Revela>
        </div>
      </Secao>

      {/* ══════════════════════ PAINEL EXECUTIVO ══════════════════════════ */}
      {/* Leitura visual antes de qualquer tabela: o ciclo da vaga, onde o
          risco pesa e como o batalhão se compara. O detalhamento vem depois. */}
      <Secao id="painel" fundo="superficie">
        <TituloSecao
          quadro="Leitura rápida"
          descricao="O ciclo da vaga, onde o risco se concentra e como o batalhão se compara às unidades vizinhas. Tudo o que vem abaixo destes blocos é o detalhamento de cada um destes pontos."
        >
          Painel executivo
        </TituloSecao>

        <Revela>
          <p className="rotulo-dado mb-3 text-texto-suave">Ciclo da vaga, da oferta ao policiamento</p>
          <Fluxograma
            vagas={f.vagas}
            inscritos={f.inscritos}
            escalados={f.escalados}
            presentes={f.presentes}
            confirmadas={f.confirmadas}
            ociosasComInscrito={f.ociosasComInscrito}
            ociosasSemInscrito={f.ociosasSemInscrito}
            faltas={f.faltas}
            taxaEscalacao={f.taxaEscalacao}
            taxaPresenca={f.taxaPresenca}
            inscricoesPorVaga={f.inscricoesPorVaga}
          />
        </Revela>

        <div className="mt-8">
          <Revela delay={80}>
            <MatrizRisco itens={itensRisco} totalVagas={f.vagas} />
          </Revela>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Revela delay={140}>
            <Card className="p-5">
              <p className="rotulo-dado mb-3 text-texto-suave">Oferta e preenchimento, mês a mês</p>
              <OfertaVersusPreenchimento
                altura={250}
                data={serie.map((s) => ({ mes: s.mes, vagas: s.vagas, escalados: s.escalados, preenchimento: s.preenchimento }))}
              />
            </Card>
          </Revela>
          <Revela delay={200}>
            <Card className="p-5">
              <p className="rotulo-dado mb-3 text-texto-suave">Preenchimento entre as unidades do CPA/M-5</p>
              <BarrasHorizontais
                altura={250}
                unidade="%"
                larguraRotulo={150}
                data={unidades.map((u) => ({
                  chave: u.aisp.replace(" BPM/M", "").replace("BPM/M ", ""),
                  valor: u.preenchimento ?? 0,
                  destaque: u.ehDoBatalhao,
                }))}
              />
            </Card>
          </Revela>
        </div>

        <Nota titulo="Como ler este painel">
          O fluxograma mostra <b>onde</b> a vaga se perde, a matriz mostra <b>quando</b> a perda
          pesa mais, e o comparativo mostra <b>quanto</b> disso é específico do batalhão. Os quadros
          abaixo detalham cada um desses pontos, com a tabela completa e a fonte declarada.
        </Nota>
      </Secao>

      {/* ───────────────────────── QUADRO I — PANORAMA ────────────────────── */}
      <Secao id="panorama" fundo="branco">
        <TituloSecao
          quadro="Quadro I"
          descricao={`Recorte em exibição: ${recorte}. Todos os números desta página são lidos do banco a cada carregamento, a partir dos relatórios do SIRH extraídos em 30 de julho de 2026.`}
        >
          Panorama do semestre
        </TituloSecao>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-borda bg-borda shadow-inst sm:grid-cols-2 lg:grid-cols-4">
          {[
            // casas: 1 nos percentuais. Arredondar a taxa de preenchimento
            // para inteiro apagaria a diferença entre 80,7% e 81%, que é
            // justamente a casa que o Comando cobra.
            { v: f.taxaEscalacao, r: "Taxa de preenchimento", n: `${num(f.escalados)} de ${num(f.vagas)} vagas`, t: tomGeral, s: "%", c: 1 },
            { v: f.perdaTotal, r: "Vagas perdidas", n: `${pctTexto(f.perdaPct)} do ofertado`, t: "critico" as const },
            { v: f.taxaPresenca, r: "Taxa de presença", n: "quem é escalado comparece", t: "ok" as const, s: "%", c: 1 },
            { v: f.inscricoesPorVaga, r: "Concorrência por vaga", n: `${num(f.inscritos)} inscrições`, t: "neutro" as const, s: "×", c: 2 },
          ].map((k) => (
            <div key={k.r} className="bg-branco px-5 py-6">
              <NumeroDestaque valor={k.v} rotulo={k.r} nota={k.n} tom={k.t} sufixo={k.s} casas={k.c ?? 0} />
            </div>
          ))}
        </div>

        <Nota titulo="Como ler a perda" tom="vermelho">
          Das <b>{num(f.ociosas)}</b> vagas que ficaram ociosas, <b>{num(f.ociosasComInscrito)}</b> tinham
          candidato inscrito e mesmo assim não foram preenchidas, contra apenas{" "}
          <b>{num(f.ociosasSemInscrito)}</b> sem nenhum interessado. Somadas as{" "}
          <b>{num(f.faltas)}</b> ausências de quem foi escalado, o batalhão deixou de empregar{" "}
          <b>{num(f.perdaTotal)}</b> vagas no recorte. O gargalo está no fechamento da escala, não na
          procura da tropa.
        </Nota>

        <Nota titulo="Duas bases, dois números">
          O relatório gerencial registra <b>{num(f.presentes)}</b> presenças confirmadas; o relatório
          analítico registra <b>{num(f.confirmadas)}</b> jornadas nominais. A diferença de{" "}
          <b>{num(Math.abs(f.gapDeBase))}</b> é de base, não de faltas: os dois relatórios têm grão
          diferente, um por bloco de escala e outro por jornada paga. Os quadros deste estudo nunca
          somam as duas fontes.
        </Nota>
      </Secao>

      {/* ──────────────────── QUADRO II — DEMANDA E CONVERSÃO ─────────────── */}
      <Secao id="conversao" fundo="superficie">
        <TituloSecao
          quadro="Quadro II"
          descricao="Inscrição não é etapa de funil: várias inscrições disputam a mesma vaga. Por isso a demanda e a conversão são medidas em blocos separados. Juntá-las num funil único inventaria perdas que não existem."
        >
          Demanda e conversão da vaga
        </TituloSecao>
        <BlocoFunil
          vagas={f.vagas}
          inscritos={f.inscritos}
          escalados={f.escalados}
          presentes={f.presentes}
          inscricoesPorVaga={f.inscricoesPorVaga}
          taxaEscalacao={f.taxaEscalacao}
          taxaPresenca={f.taxaPresenca}
        />
      </Secao>

      <AtoDivisor {...ATOS.analise} />

      {/* ─────────────────────── QUADRO III — SÉRIE MENSAL ────────────────── */}
      <Secao id="serie" fundo="branco">
        <TituloSecao quadro="Quadro III" descricao="Oferta e escalação lado a lado, com a taxa de preenchimento no eixo da direita.">
          Evolução mensal
        </TituloSecao>
        <ResumoQuadro
          itens={[
            { valor: f.vagas, rotulo: "Vagas no recorte", nota: "somadas no período" },
            { valor: f.escalados, rotulo: "Escaladas", tom: tomGeral },
            { valor: f.ociosas, rotulo: "Ociosas", tom: "critico" },
            { valor: f.taxaEscalacao, rotulo: "Preenchimento", sufixo: "%", casas: 1, tom: tomGeral },
          ]}
        />
        <Card className="p-5">
          <OfertaVersusPreenchimento data={serie.map((s) => ({ mes: s.mes, vagas: s.vagas, escalados: s.escalados, preenchimento: s.preenchimento }))} />
        </Card>
        <div className="mt-6">
          <Tabela
            colunas={[
              { chave: "mes", rotulo: "Mês" },
              { chave: "vagas", rotulo: "Ofertadas", alinhar: "direita" },
              { chave: "inscritos", rotulo: "Inscrições", alinhar: "direita" },
              { chave: "escalados", rotulo: "Escalados", alinhar: "direita" },
              { chave: "presentes", rotulo: "Presentes", alinhar: "direita" },
              { chave: "confirmadas", rotulo: "Jornadas", alinhar: "direita" },
              { chave: "ociosas", rotulo: "Ociosas", alinhar: "direita" },
              { chave: "conc", rotulo: "Concorr.", alinhar: "direita" },
              { chave: "preench", rotulo: "Preench.", alinhar: "direita" },
            ]}
            linhas={serie.map((s) => ({
              mes: <span className="font-medium">{MESES_LONGO[s.mes]}</span>,
              vagas: num(s.vagas), inscritos: num(s.inscritos), escalados: num(s.escalados),
              presentes: num(s.presentes), confirmadas: num(s.confirmadas), ociosas: num(s.ociosas),
              conc: `${num(s.concorrencia, 2)}×`,
              preench: <Pilula valor={s.preenchimento} tom={tomPreenchimento(s.preenchimento)} />,
            }))}
          />
        </div>
      </Secao>

      {/* ───────────────────── QUADRO IV — ELASTICIDADE ───────────────────── */}
      <Secao id="elasticidade" fundo="superficie">
        <TituloSecao
          quadro="Quadro IV"
          descricao="Cada ponto é um mês do semestre, sempre com a série completa, independente do filtro. A pergunta que este quadro responde é se o batalhão piorou ou se a oferta ultrapassou a capacidade de fechar escala."
        >
          Oferta contra capacidade de fechar
        </TituloSecao>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="p-5">
            <DispersaoOferta pontos={elast.pontos} reta={elast.reta} />
          </Card>
          <div className="flex flex-col justify-center gap-7 rounded-2xl border border-borda bg-branco p-7 shadow-inst">
            <NumeroDestaque
              valor={elast.correlacao}
              casas={2}
              rotulo="Correlação entre oferta e preenchimento"
              tom={elast.correlacao !== null && elast.correlacao < -0.5 ? "critico" : "neutro"}
              nota="Quanto mais próximo de −1, mais o preenchimento cai à medida que a oferta cresce."
            />
            <NumeroDestaque
              valor={elast.inclinacaoPor100}
              casas={1}
              sufixo=" p.p."
              rotulo="Efeito de cada 100 vagas a mais"
              tom="critico"
              nota="Variação estimada da taxa de preenchimento a cada 100 vagas acrescidas à oferta mensal."
            />
          </div>
        </div>
        <Nota titulo="O que este quadro muda na leitura">
          Se a correlação é fortemente negativa, a queda do indicador no segundo trimestre não
          descreve uma unidade que passou a trabalhar pior: descreve uma oferta que cresceu além da
          capacidade instalada de fechar escala. São diagnósticos opostos, e levam a medidas opostas.
        </Nota>
      </Secao>

      {/* ─────────────────── QUADRO V — OCIOSIDADE COM INSCRITO ───────────── */}
      <Secao id="ociosidade" fundo="branco">
        <TituloSecao
          quadro="Quadro V"
          descricao="A separação que torna o problema acionável: vaga sem procura é questão de atratividade; vaga com candidato e não preenchida é questão de gestão da escala."
        >
          A vaga que tinha candidato
        </TituloSecao>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-borda bg-borda shadow-inst">
            {[
              { v: ocio.comInscrito, r: "Ociosa com candidato inscrito", t: "critico" as const, n: pctTexto(pct(ocio.comInscrito, ocio.total)) + " da ociosidade" },
              { v: ocio.semInscrito, r: "Ociosa sem nenhum inscrito", t: "neutro" as const, n: pctTexto(pct(ocio.semInscrito, ocio.total)) + " da ociosidade" },
              { v: f.faltas, r: "Escalado que não compareceu", t: "atencao" as const, n: pctTexto(f.taxaPresenca ? 100 - f.taxaPresenca : null) + " dos escalados" },
            ].map((c) => (
              <div key={c.r} className="bg-branco px-5 py-5">
                <NumeroDestaque valor={c.v} rotulo={c.r} tom={c.t} nota={c.n} />
              </div>
            ))}
          </div>
          <Card className="p-5 lg:col-span-2">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
              Onde a vaga com candidato ficou vazia, por dia da semana
            </p>
            <BarrasHorizontais data={ocio.porDia.map((d) => ({ chave: d.chave, valor: d.valor }))} altura={240} cor="#d53441" larguraRotulo={80} />
          </Card>
        </div>
        {ocio.porTurno.length ? (
          <Card className="mt-6 p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
              Mesma perda, por turno
            </p>
            <BarrasHorizontais data={ocio.porTurno.slice(0, 8)} altura={260} cor="#ab9142" larguraRotulo={120} />
          </Card>
        ) : null}
      </Secao>

      {/* ───────────────────── QUADRO VI — COMPANHIAS ─────────────────────── */}
      <Secao id="companhias" fundo="superficie">
        <TituloSecao
          quadro="Quadro VI"
          descricao="A vaga de DEJEM não tem cota por Companhia: a oferta é do batalhão e a disputa é por inscrição individual. O que a tabela mostra é onde está o efetivo que efetivamente puxa, e quanto de cada Companhia já está comprometido com Atividade Delegada."
        >
          Distribuição por Companhia
        </TituloSecao>
        <ResumoQuadro
          itens={[
            { valor: cias.length, rotulo: "Companhias com efetivo no DEJEM" },
            { valor: Math.max(0, ...cias.map((c) => c.jornadas)), rotulo: "Maior volume de jornadas" },
            { valor: Math.max(0, ...cias.map((c) => c.mediaPorPm ?? 0)), rotulo: "Maior média por PM", casas: 1, tom: "atencao" },
            { valor: ciaSobrecarregada?.percentualDejem ?? null, rotulo: "Menor fatia em DEJEM", sufixo: "%", casas: 1, tom: "critico", nota: ciaSobrecarregada?.rotulo },
          ]}
        />
        <Card className="mb-6 p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">Jornadas DEJEM por Companhia</p>
          <BarrasVerticais data={cias.map((c) => ({ chave: c.rotulo.replace(" Cia", "ª").replace("Cia Força Tática", "F Tát").replace("Estado-Maior", "EM"), valor: c.jornadas }))} />
        </Card>
        <Tabela
          colunas={[
            { chave: "cia", rotulo: "Companhia" },
            { chave: "jornadas", rotulo: "Jornadas DEJEM", alinhar: "direita" },
            { chave: "pms", rotulo: "PMs", alinhar: "direita" },
            { chave: "media", rotulo: "Média/PM", alinhar: "direita" },
            { chave: "maior", rotulo: "Maior carga", alinhar: "direita" },
            { chave: "totais", rotulo: "Escalas totais", alinhar: "direita" },
            { chave: "delegada", rotulo: "Delegada (est.)", alinhar: "direita" },
            { chave: "pctd", rotulo: "% DEJEM", alinhar: "direita" },
            { chave: "comp", rotulo: "Composição", largura: "130px" },
            { chave: "serie", rotulo: "Ritmo mensal", largura: "90px" },
          ]}
          linhas={cias.map((c) => ({
            cia: <span className="font-medium">{c.rotulo}</span>,
            jornadas: num(c.jornadas), pms: num(c.pms), media: num(c.mediaPorPm, 1),
            maior: num(c.maiorCarga), totais: num(c.escalasTotais),
            delegada: num(c.delegadaEstimada),
            pctd: c.percentualDejem !== null
              ? <Pilula valor={c.percentualDejem} tom={c.percentualDejem < 15 ? "critico" : "ok"} />
              : <span className="text-texto-suave">{SEM_DADO}</span>,
            comp: <ComposicaoBarra dejem={c.jornadas} delegada={c.delegadaEstimada} />,
            serie: <MiniSerie valores={c.mensal} />,
          }))}
        />
        <div className="mt-4 flex flex-wrap gap-5 text-[11.5px] text-texto-suave">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-vermelho" />DEJEM</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ouro-velho" />Atividade Delegada (estimada)</span>
        </div>
        <Nota titulo="A leitura que o cruzamento corrige">
          Olhada só pelo DEJEM, a Companhia com menos jornadas parece desinteressada. O cruzamento com
          o total de escalas de todas as modalidades desfaz a impressão: ela responde por parcela
          desproporcional do esforço do batalhão, quase todo em Atividade Delegada. Cobrar dela mais
          DEJEM sem redistribuir a Delegada seria cobrar o impossível. A coluna de Delegada é
          estimada por diferença, conforme o anexo de método.
        </Nota>
      </Secao>

      {/* ───────────────────────── QUADRO VII — RITMO ─────────────────────── */}
      <Secao id="ritmo" fundo="branco">
        <TituloSecao quadro="Quadro VII" descricao="Quando o batalhão consegue fechar a escala, e quando não consegue.">
          Ritmo semanal e turnos
        </TituloSecao>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Tabela
              colunas={[
                { chave: "dia", rotulo: "Dia" },
                { chave: "vagas", rotulo: "Ofertadas", alinhar: "direita" },
                { chave: "ociosas", rotulo: "Ociosas", alinhar: "direita" },
                { chave: "preench", rotulo: "Preench.", alinhar: "direita" },
              ]}
              linhas={dias.map((d) => ({
                dia: <span className="font-medium">{d.rotulo}</span>,
                vagas: num(d.vagas), ociosas: num(d.ociosas),
                preench: <Pilula valor={d.preenchimento} tom={tomPreenchimento(d.preenchimento)} />,
              }))}
            />
          </div>
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
              Jornadas cumpridas por dia e faixa horária
            </p>
            <Heatmap linhas={heat.linhas} maximo={heat.maximo} />
          </div>
        </div>
        <div className="mt-6">
          <Tabela
            colunas={[
              { chave: "turno", rotulo: "Turno" },
              { chave: "vagas", rotulo: "Ofertadas", alinhar: "direita" },
              { chave: "inscritos", rotulo: "Inscrições", alinhar: "direita" },
              { chave: "escalados", rotulo: "Escalados", alinhar: "direita" },
              { chave: "ociosas", rotulo: "Ociosas", alinhar: "direita" },
              { chave: "conc", rotulo: "Concorr.", alinhar: "direita" },
              { chave: "preench", rotulo: "Preench.", alinhar: "direita" },
            ]}
            linhas={turnos.map((t) => ({
              turno: <span className="tabular font-medium">{t.periodo}</span>,
              vagas: num(t.vagas), inscritos: num(t.inscritos), escalados: num(t.escalados),
              ociosas: num(t.ociosas), conc: `${num(t.concorrencia, 2)}×`,
              preench: <Pilula valor={t.preenchimento} tom={tomPreenchimento(t.preenchimento)} />,
            }))}
            vazio="Nenhum turno com volume suficiente no recorte."
          />
        </div>
      </Secao>

      {/* ────────────────── QUADRO VIII — CONCENTRAÇÃO ────────────────────── */}
      <Secao id="concentracao" fundo="superficie">
        <TituloSecao
          quadro="Quadro VIII"
          descricao="A linha tracejada representa a distribuição perfeitamente igualitária. Quanto mais a curva se afasta dela, mais o esforço está concentrado em poucos policiais."
        >
          Concentração do esforço
        </TituloSecao>
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Card className="p-5">
            <CurvaConcentracao curva={par.curva} />
          </Card>
          <div className="space-y-6">
            <Tabela
              colunas={[
                { chave: "recorte", rotulo: "Recorte" },
                { chave: "efetivo", rotulo: "% do efetivo", alinhar: "direita" },
                { chave: "jornadas", rotulo: "% das jornadas", alinhar: "direita" },
              ]}
              linhas={par.marcos.map((m) => ({
                recorte: <span className="font-medium">{num(m.pms)} PMs que mais puxam</span>,
                efetivo: pctTexto(m.pmsPct),
                jornadas: <span className="font-semibold text-vermelho">{pctTexto(m.jornadasPct)}</span>,
              }))}
            />
            <Tabela
              colunas={[
                { chave: "faixa", rotulo: "Faixa de carga" },
                { chave: "pms", rotulo: "PMs", alinhar: "direita" },
              ]}
              linhas={par.faixas.map((x) => ({
                faixa: <span className="font-medium">{x.rotulo} jornadas</span>,
                pms: num(x.pms),
              }))}
            />
          </div>
        </div>
      </Secao>

      {/* ───────────────────── QUADRO IX — CARGA INDIVIDUAL ───────────────── */}
      <Secao id="carga" fundo="branco">
        <TituloSecao
          quadro="Quadro IX"
          descricao="Carga extra acumulada sobre a jornada ordinária. Serve a duas leituras: identificar quem está no limite e identificar a folga disponível para absorver a vaga hoje ociosa."
        >
          Carga individual
        </TituloSecao>
        {nominal && topCarga ? (
          <Tabela
            colunas={[
              { chave: "pos", rotulo: "#", alinhar: "direita" },
              { chave: "re", rotulo: "RE" },
              { chave: "posto", rotulo: "Posto" },
              { chave: "nome", rotulo: "Nome" },
              { chave: "cia", rotulo: "Companhia" },
              { chave: "j", rotulo: "Jornadas", alinhar: "direita" },
              { chave: "h", rotulo: "Horas", alinhar: "direita" },
              { chave: "hm", rotulo: "Horas/mês", alinhar: "direita" },
            ]}
            linhas={topCarga.map((p, i) => ({
              pos: i + 1, re: <span className="tabular">{p.re}</span>, posto: p.posto ?? SEM_DADO,
              nome: <span className="font-medium">{p.nome}</span>, cia: ROTULO_CIA[p.cia],
              j: <span className={p.jornadas >= 40 ? "font-semibold text-vermelho" : ""}>{num(p.jornadas)}</span>,
              h: num(p.horas), hm: num(p.horasMes, 1),
            }))}
          />
        ) : (
          <>
            <Tabela
              colunas={[
                { chave: "pos", rotulo: "#", alinhar: "direita" },
                { chave: "cia", rotulo: "Companhia" },
                { chave: "j", rotulo: "Jornadas", alinhar: "direita" },
                { chave: "h", rotulo: "Horas", alinhar: "direita" },
                { chave: "hm", rotulo: "Horas/mês", alinhar: "direita" },
              ]}
              linhas={topCargaAnon.map((p) => ({
                pos: p.posicao, cia: p.rotuloCia,
                j: <span className={p.jornadas >= 40 ? "font-semibold text-vermelho" : ""}>{num(p.jornadas)}</span>,
                h: num(p.horas), hm: num(p.horasMes, 1),
              }))}
            />
            <div className="mt-6">
              <BloqueioNominal totalAgregado="Os totais e as faixas acima refletem exatamente os mesmos policiais." />
            </div>
          </>
        )}
      </Secao>

      {/* ──────────────────── QUADRO X — EFETIVO E PERFIL ─────────────────── */}
      <Secao id="efetivo" fundo="superficie">
        <TituloSecao quadro="Quadro X" descricao="Quanto do batalhão participa do DEJEM, e com que composição.">
          Penetração e perfil do efetivo
        </TituloSecao>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-7">
            <NumeroDestaque
              valor={pen.percentual}
              sufixo="%"
              casas={1}
              rotulo="Penetração bruta no efetivo"
              nota={`${num(pen.pms)} policiais distintos puxaram DEJEM, sobre um efetivo institucional de aproximadamente ${num(pen.efetivo)}.`}
            />
            <p className="mt-5 border-t border-borda pt-4 text-[12.5px] leading-relaxed text-texto-suave">
              O denominador inclui férias, licença de saúde, restrição e agregados. O efetivo elegível
              é menor e não é conhecido por esta base, então o percentual serve como piso, não como
              medida de adesão.
            </p>
          </Card>
          <div className="lg:col-span-2">
            <Tabela
              colunas={[
                { chave: "posto", rotulo: "Posto ou graduação" },
                { chave: "pms", rotulo: "PMs", alinhar: "direita" },
                { chave: "j", rotulo: "Jornadas", alinhar: "direita" },
                { chave: "m", rotulo: "Média/PM", alinhar: "direita" },
                { chave: "p", rotulo: "Participação", alinhar: "direita" },
              ]}
              linhas={postos.map((p) => ({
                posto: <span className="font-medium">{p.posto}</span>,
                pms: num(p.pms), j: num(p.jornadas), m: num(p.mediaPorPm, 1), p: pctTexto(p.participacao),
              }))}
            />
          </div>
        </div>
        <div className="mt-6">
          <Tabela
            colunas={[
              { chave: "tipo", rotulo: "Modalidade" },
              { chave: "j", rotulo: "Jornadas", alinhar: "direita" },
              { chave: "p", rotulo: "Participação", alinhar: "direita" },
            ]}
            linhas={atividades.map((a) => ({
              tipo: <span className="font-medium">{a.tipoRotulo}</span>,
              j: num(a.jornadas), p: pctTexto(a.participacao),
            }))}
          />
        </div>
      </Secao>

      {/* ─────────────────── QUADRO XI — FALTAS E AUDITORIA ───────────────── */}
      <Secao id="faltas" fundo="branco">
        <TituloSecao
          quadro="Quadro XI"
          descricao="A identificação nominal das faltas vem do histórico de confirmação de presença, porque o Relatório de Faltas do SIRH não contempla o DEJEM. Esse histórico só registra alteração de lançamento: falta em que ninguém mexeu no registro não gera evento."
        >
          Faltas e trilha de auditoria
        </TituloSecao>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
              Faltas apuradas contra faltas nomeadas, por mês
            </p>
            <CoberturaLog data={cobertura} />
          </Card>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-borda bg-borda shadow-inst">
            <div className="bg-branco px-5 py-5">
              <NumeroDestaque valor={faltas.total} rotulo="Faltas nomeadas no recorte" tom="atencao" nota={`${num(faltas.pmsDistintos)} policiais distintos, ${num(faltas.reincidentes)} reincidentes`} />
            </div>
            <div className="bg-branco px-5 py-5">
              <NumeroDestaque valor={trilha.autores.length} rotulo="Pessoas que lançam a confirmação" tom={trilha.autores.length <= 2 ? "critico" : "neutro"} nota={`A mais ativa responde por ${pctTexto(trilha.concentracaoTop1)} dos lançamentos.`} />
            </div>
          </div>
        </div>

        <Nota titulo="O que a cobertura mede, e o que não mede" tom="vermelho">
          A proporção de faltas nomeadas oscila fortemente de mês para mês. Isso não descreve variação
          no comportamento da tropa: descreve a regularidade com que alguém zerou o lançamento de
          presença dos ausentes. É indicador de processo, e a irregularidade dele é, por si só, um
          achado do estudo.
        </Nota>

        {trilha.autores.length ? (
          <div className="mt-6">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">Trilha de auditoria</p>
            <Tabela
              colunas={[
                { chave: "re", rotulo: "RE" },
                { chave: "nome", rotulo: "Responsável pelo lançamento" },
                { chave: "ev", rotulo: "Alterações", alinhar: "direita" },
                { chave: "p", rotulo: "Participação", alinhar: "direita" },
              ]}
              linhas={trilha.autores.map((a) => ({
                re: <span className="tabular">{nominal ? a.re : "•••"}</span>,
                nome: nominal ? (a.nome ?? SEM_DADO) : <span className="text-texto-suave">Identificação restrita</span>,
                ev: num(a.eventos), p: pctTexto(a.participacao),
              }))}
              vazio="Nenhuma alteração de presença registrada no recorte."
            />
          </div>
        ) : null}

        <div className="mt-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">Quadro nominal das faltas</p>
          {nominal && faltasLista ? (
            <Tabela
              colunas={[
                { chave: "re", rotulo: "RE" },
                { chave: "posto", rotulo: "Posto" },
                { chave: "nome", rotulo: "Nome" },
                { chave: "oc", rotulo: "Ocorrências", alinhar: "direita" },
              ]}
              linhas={faltasLista.map((p) => ({
                re: <span className="tabular">{p.re}</span>, posto: p.posto ?? SEM_DADO,
                nome: <span className="font-medium">{p.nome}</span>,
                oc: <span className={p.ocorrencias > 1 ? "font-semibold text-vermelho" : ""}>{num(p.ocorrencias)}</span>,
              }))}
              vazio="Nenhuma falta nomeada no recorte."
            />
          ) : (
            <BloqueioNominal totalAgregado={`No recorte há ${num(faltas.total)} ocorrências, distribuídas por ${num(faltas.pmsDistintos)} policiais.`} />
          )}
        </div>
      </Secao>

      {/* ──────────────────────── QUADRO XII — BENCHMARK ──────────────────── */}
      <Secao id="benchmark" fundo="superficie">
        <TituloSecao
          quadro="Quadro XII"
          descricao="Mesmo critério, mesma fonte, mesma janela. A comparação interna usa as unidades do CPA/M-5; a externa usa os Grandes Comandos do Estado, com base no único mês de extração estadual completa."
        >
          Comparativo com o CPA/M-5 e o Estado
        </TituloSecao>
        <ResumoQuadro
          itens={[
            { valor: piorPosicao, rotulo: "Pior posição do batalhão", nota: `entre ${num(unidades.length)} unidades do CPA/M-5`, tom: "critico" },
            { valor: f.inscricoesPorVaga, rotulo: "Inscrições por vaga aqui", casas: 2, sufixo: "×" },
            { valor: Math.max(0, ...unidades.map((u) => u.concorrencia ?? 0)), rotulo: "Maior concorrência do CPA/M-5", casas: 2, sufixo: "×", tom: "ok" },
            { valor: estado.cpam5?.posicao ?? null, rotulo: "Posição do CPA/M-5 no Estado", nota: `entre ${num(estado.total)} Grandes Comandos`, tom: "atencao" },
          ]}
        />

        <Card className="p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
            Taxa de preenchimento entre as unidades do CPA/M-5
          </p>
          <BarrasHorizontais
            data={unidades.map((u) => ({ chave: u.aisp, valor: u.preenchimento ?? 0, destaque: u.ehDoBatalhao }))}
            altura={Math.max(280, unidades.length * 26)}
            unidade="%"
            larguraRotulo={210}
          />
        </Card>

        <div className="mt-6">
          <Tabela
            colunas={[
              { chave: "pos", rotulo: "#", alinhar: "direita" },
              { chave: "u", rotulo: "Unidade" },
              { chave: "v", rotulo: "Ofertadas", alinhar: "direita" },
              { chave: "i", rotulo: "Inscrições", alinhar: "direita" },
              { chave: "e", rotulo: "Escalados", alinhar: "direita" },
              { chave: "c", rotulo: "Concorr.", alinhar: "direita" },
              { chave: "perda", rotulo: "Perda", alinhar: "direita" },
              { chave: "p", rotulo: "Preench.", alinhar: "direita" },
            ]}
            destacar={(_l, i) => unidades[i]?.ehDoBatalhao}
            linhas={unidades.map((u) => ({
              pos: u.posicao,
              u: <span className={u.ehDoBatalhao ? "font-semibold text-vermelho" : "font-medium"}>{u.aisp}</span>,
              v: num(u.vagas), i: num(u.inscritos), e: num(u.escalados),
              c: `${num(u.concorrencia, 2)}×`, perda: pctTexto(u.perda),
              p: <Pilula valor={u.preenchimento} tom={tomPreenchimento(u.preenchimento)} />,
            }))}
          />
        </div>

        {nossaPosicao.length ? (
          <Nota titulo="O que separa o batalhão das primeiras colocadas" tom="vermelho">
            A diferença não está no volume de vagas recebidas, e sim na concorrência: as unidades do
            topo atraem muito mais inscrições por vaga. Menos candidato por vaga significa margem
            menor para fechar a escala quando alguém desiste. A pergunta a responder internamente é
            por que o DEJEM do 16º atrai proporcionalmente menos que o das unidades vizinhas.
          </Nota>
        ) : null}

        <div className="mt-10">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
            Posição do CPA/M-5 entre os Grandes Comandos do Estado
          </p>
          {estado.cpam5 ? (
            <div className="mb-5 grid gap-px overflow-hidden rounded-2xl border border-borda bg-borda shadow-inst sm:grid-cols-3">
              <div className="bg-branco px-5 py-5">
                <NumeroDestaque valor={estado.cpam5.posicao} rotulo="Posição do CPA/M-5" tom="critico" nota={`entre ${num(estado.total)} Grandes Comandos`} />
              </div>
              <div className="bg-branco px-5 py-5">
                <NumeroDestaque valor={estado.cpam5.preenchimento} sufixo="%" casas={1} rotulo="Preenchimento do CPA/M-5" tom={tomPreenchimento(estado.cpam5.preenchimento)} />
              </div>
              <div className="bg-branco px-5 py-5">
                <NumeroDestaque valor={estado.mediaEstado} sufixo="%" casas={1} rotulo="Média do Estado" tom="neutro" nota={`${num(estado.vagasEstado)} vagas ofertadas no mês`} />
              </div>
            </div>
          ) : null}
          <Card className="p-5">
            <BarrasHorizontais
              data={estado.linhas.map((b) => ({ chave: b.rotulo, valor: b.preenchimento ?? 0, destaque: b.ehCpam5 }))}
              altura={Math.max(300, estado.linhas.length * 20)}
              unidade="%"
              larguraRotulo={120}
              referencia={estado.mediaEstado !== null ? { valor: estado.mediaEstado, rotulo: "média do Estado" } : undefined}
            />
          </Card>
        </div>
      </Secao>

      <AtoDivisor {...ATOS.decisao} />

      {/* ───────────────────────── QUADRO XIII — CENÁRIO ──────────────────── */}
      <Secao id="cenario" fundo="branco">
        <TituloSecao
          quadro="Quadro XIII"
          descricao="Quanto policiamento a mais o batalhão colocaria na rua se fechasse a escala numa taxa-alvo, mantida exatamente a mesma oferta de vagas do recorte. Não projeta aumento de oferta nem mudança de comportamento: responde apenas o que já estava disponível e não foi aproveitado."
        >
          Cenário de recuperação
        </TituloSecao>
        <Card className="p-7">
          <Simulador base={{ vagas: f.vagas, escalados: f.escalados, horasPorJornada: 8 }} />
        </Card>
      </Secao>

      {/* ────────────────────── QUADRO XIV — RECOMENDAÇÕES ────────────────── */}
      <Secao id="recomendacoes" fundo="escuro">
        <TituloSecao quadro="Quadro XIV" claro descricao="Cada medida decorre de um quadro específico deste estudo. Nenhuma é genérica.">
          Recomendações
        </TituloSecao>
        <div className="grid gap-5 md:grid-cols-2">
          {RECOMENDACOES.map((r, i) => (
            <article key={r.titulo} className="rounded-2xl border border-branco/15 bg-branco/5 p-6">
              <div className="flex items-baseline gap-3">
                <span className="tabular font-serif text-2xl text-ouro-velho">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-serif text-lg leading-snug text-ouro">{r.titulo}</h3>
              </div>
              <dl className="mt-4 space-y-3 text-[13.5px] leading-relaxed">
                {[
                  ["Problema", r.problema],
                  ["Medida", r.medida],
                  ["Impacto esperado", r.impacto],
                  ["Responsável", r.responsavel],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-branco/45">{k}</dt>
                    <dd className="mt-0.5 text-branco/85">{v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </Secao>

      {/* ───────────────────────── ANEXO — MÉTODO ─────────────────────────── */}
      <Secao id="metodo" fundo="superficie">
        <TituloSecao
          quadro="Anexo"
          descricao="O que este estudo pode e o que não pode afirmar. Cada ressalva corresponde a um limite real do dado, verificado durante a extração."
        >
          Método, ressalvas e fontes
        </TituloSecao>

        <ol className="grid gap-5 md:grid-cols-2">
          {RESSALVAS.map((r, i) => (
            <li key={r.titulo} className="rounded-2xl border border-borda bg-branco p-6 shadow-inst">
              <div className="flex items-baseline gap-3">
                <span className="tabular font-serif text-xl text-ouro-velho">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-serif text-base leading-snug text-azul-noite">{r.titulo}</h3>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-texto-suave">{r.texto}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
            Exportar o dado bruto
          </p>
          <p className="mb-4 max-w-[74ch] text-[13.5px] leading-relaxed text-texto-suave">
            Arquivos em CSV com ponto e vírgula e BOM UTF-8, que o Excel em português abre direto.
            {nominal
              ? " Os três últimos contêm nome e RE: trate-os como documento restrito."
              : " Os conjuntos com nome e RE não aparecem aqui porque são restritos ao Comando e ao Estado-Maior."}
          </p>
          <div className="mb-8 flex flex-wrap gap-2">
            {[
              { id: "serie-mensal", r: "Série mensal" },
              { id: "companhias", r: "Companhias" },
              { id: "dia-turno", r: "Dia e turno" },
              { id: "escalas", r: "Escalas (bruto)" },
              { id: "benchmark", r: "Comparativos" },
              ...(nominal
                ? [
                    { id: "jornadas", r: "Jornadas nominais", restrito: true },
                    { id: "faltas", r: "Faltas nominais", restrito: true },
                    { id: "log", r: "Log de presença", restrito: true },
                  ]
                : []),
            ].map((d) => (
              <a
                key={d.id}
                href={`/api/dejem/export?dataset=${d.id}`}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  "restrito" in d
                    ? "border border-vermelho/40 bg-vermelho/5 text-vermelho hover:bg-vermelho/10"
                    : "border border-azul/25 text-azul hover:bg-azul/10"
                }`}
              >
                {d.r}
              </a>
            ))}
          </div>

          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
            Arquivos de origem carregados no banco
          </p>
          <Tabela
            colunas={[
              { chave: "arq", rotulo: "Arquivo" },
              { chave: "linhas", rotulo: "Linhas", alinhar: "direita" },
              { chave: "sha", rotulo: "SHA-256" },
              { chave: "quando", rotulo: "Ingerido em", alinhar: "direita" },
            ]}
            linhas={bruto.arquivos.map((a) => ({
              arq: <span className="font-medium">{a.caminho.split(/[\\/]/).pop()}</span>,
              linhas: num(a.linhas),
              sha: <span className="tabular text-[11px] text-texto-suave">{a.sha256?.slice(0, 16) ?? SEM_DADO}…</span>,
              quando: new Date(a.ingeridoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
            }))}
            vazio="Nenhum arquivo registrado."
          />
        </div>

        <div className="mt-10 border-t border-borda pt-6 text-[12.5px] leading-relaxed text-texto-suave">
          <p>
            <b className="font-semibold text-texto">Fonte primária:</b> SIRH · módulo Escala
            (sistemasadmin.intranet.policiamilitar.sp.gov.br, versão de 28 de julho de 2026).
            Relatórios utilizados: DEJEM Analítico, Atividade DEJEM · Relatório Gerencial, Relatório
            de Quantidade de PM Escalados e Relatório de Histórico de Confirmação de Presença.
          </p>
          <p className="mt-2">
            <b className="font-semibold text-texto">Janela de pesquisa:</b> escala e confirmação de
            01/01/2026 a 30/06/2026. <b className="font-semibold text-texto">Extração:</b> 30 de
            julho de 2026.
          </p>
          <p className="mt-4 text-[11.5px] text-texto-suave/80">
            Elaboração: Sd PM 231.936-5 Fabrício · 16º BPM/M
          </p>
        </div>
      </Secao>

      <div className="faixa-institucional h-1 w-full" />

      {/* Fora de qualquer <Revela>: aquele componente aplica transform, que
          cria bloco de contenção e faria este position:fixed colar na seção
          em vez do viewport. */}
      <VoltarTopo />
    </div>
  );
}
