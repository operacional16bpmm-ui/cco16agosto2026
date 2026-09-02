"use client";

import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Bar,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { nivelPorCumprimento } from "@/lib/cop2026-metricas";
import { META_TOTAL_BATALHAO } from "@/lib/cop2026";
import { COR_FAIXA } from "@/components/publico16/cop/graficos";
import {
  COR_TRAJETORIA,
  ROTULO_TRAJETORIA,
  SUBTITULO_TRAJETORIA,
  TURNOS_POR_DIA,
  calcularTendencia,
  curvaPlanoRealizado,
  metaDeAmanha,
  type PontoCurva,
} from "@/lib/cop2026-tendencia";

/**
 * CURVA PLANO × REALIZADO — o gráfico que a Coordenadoria Operacional pediu em
 * 02/09/2026: "um gráfico para cada fração, por dia, com quanto fizeram, com a
 * linha do que deveria ser feito para comparar".
 *
 * Leituras do desenho, cada uma respondendo uma pergunta do despacho:
 *
 * - **linha azul tracejada** — o previsto acumulado, dia a dia. É "o que
 *   deveria ter sido feito até aqui";
 * - **linha grossa do feito acumulado, BICOLOR** — vermelha nos dias em que o
 *   acumulado estava abaixo do previsto, verde nos dias em que alcançou. Ela
 *   PARA no dia de hoje: dia que ainda não chegou não vale zero, vale nada;
 * - **barras** — as evidências de cada dia, no eixo da direita, coloridas pela
 *   régua de faixas. É o "dia a dia mensurado" que a coordenadoria cobrou;
 * - **linha pontilhada escura** — o ritmo-alvo do dia, sobre as barras. Duas
 *   perguntas diferentes moram no mesmo gráfico: a azul responde "estou no prazo
 *   do mês?" e esta responde "o dia de ontem fechou a cota?".
 *
 * BICOLOR POR SEGMENTO é o pedido do Fabricio em 02/09/2026 ("destacar o não
 * cumprido: uma linha vermelha quando mostra o acumulado e não cumprido, e se
 * cumpriu algo bem mais chamativo"). Não é régua nova: é o SINAL DA DÍVIDA, que
 * já é vermelha na faixa entre as duas linhas. Um dia está abaixo do previsto ou
 * não está — é binário, e por isso não usa as quatro faixas.
 *
 * O SELO do cartão, esse sim, usa régua oficial: `calcularTendencia().situacao`
 * com `COR_TRAJETORIA` e `ROTULO_TRAJETORIA` (ADIANTADA / EM TRAJETÓRIA /
 * ATRASADA / DÉFICIT SEVERO), a mesma da tabela Tendência por Fração. Nenhum
 * componente inventa classificação — docs/cop2026-padroes-comando.md §2.
 *
 * A BARRA DO DIA é colorida por `nivelPorCumprimento` + `COR_FAIXA` — pedido de
 * 02/09/2026: "a barra quando não cumprir a meta seja vermelha, quando cumprir
 * seja verde, quando superar seja azul". A régua tem uma faixa a mais que as três
 * pedidas (ÂMBAR, 50% a 79% da cota) e ela fica: é a mesma escala do ranking, do
 * quadro semanal e do velocímetro, e some do painel inteiro se for suprimida só
 * aqui.
 *
 * Por que acumulado, e não só a barra do dia: o desperdício que a coordenadoria
 * descreveu — "é sempre na terceira para a quarta semana que o pessoal olha, vê
 * que não vai atingir e aí começa a fazer" — não aparece em barra nenhuma
 * isolada. Aparece na linha do feito descolando da azul por vinte dias.
 *
 * Unidade: DIA. É a régua que a coordenadoria pediu para tudo ("dia a dia tudo
 * mensurado"), e o cartão carimba a equivalência em turno-fração ao lado, para
 * não abrir uma segunda conta de tempo — ver docs/cop2026-padroes-comando.md §4.
 */

const AZUL = "#2563eb";
const AMBAR = "#d97706";
const VERM = "#ca0202";
const VERDE = "#16a34a";
const NEUTRO = "#475569";
const EIXO = { fontSize: 10, fill: "#55535e" };
const GRID = "#1d1d1d1f";

const N2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const N0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const TOOLTIP = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #c4c8cc",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(22, 41, 74, 0.12)",
  },
  labelStyle: { color: "#1d1d1d", fontWeight: 700 },
} as const;

/**
 * Cor da barra do dia pela régua oficial: <50% da cota crítico (vermelho),
 * 50–79% atenção (âmbar), 80–100% conforme (verde), >100% superação (azul).
 * Dia que ainda não chegou não é classificado — não existe barra nele.
 */
function corDaBarra(ponto: PontoCurva, cota: number): string {
  if (!ponto.decorrido || cota <= 0) return COR_FAIXA.neutro;
  return COR_FAIXA[nivelPorCumprimento((ponto.feito / cota) * 100, true)];
}

/** Um dia está abaixo da linha do previsto? Binário, e é o sinal da dívida. */
const emAtraso = (p: PontoCurva) => p.acumulado !== null && p.acumulado < p.previsto;

export interface CurvaFracao {
  chave: string;
  rotulo: string;
  meta: number;
  porDia?: { data: string; v: number }[];
}

/** Traço/quadrado de amostra usado pelo quadro de regras. */
function Amostra({ cor, tracejado }: { cor: string; tracejado?: boolean }) {
  return tracejado ? (
    <span
      className="inline-block h-0 w-6 shrink-0 border-t-2 border-dashed"
      style={{ borderColor: cor }}
    />
  ) : (
    <span className="inline-block h-1 w-6 shrink-0 rounded-full" style={{ background: cor }} />
  );
}

function Regra({ children, amostra }: { children: React.ReactNode; amostra: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 flex shrink-0 items-center">{amostra}</span>
      <span className="leading-snug">{children}</span>
    </li>
  );
}

/**
 * QUADRO DE REGRAS — pedido de 02/09/2026: "deixe na parte superior um quadro
 * com as regras desses gráficos, qual é as regras, parâmetros, para ao
 * visualizar conseguir entender".
 *
 * Fica acima dos gráficos porque quem abre o painel no telão lê de cima para
 * baixo, e porque repetir isso sete vezes (uma por cartão) empurraria a curva do
 * Batalhão para fora da primeira tela. Debaixo de CADA cartão fica a leitura
 * daquele cartão, com os números dele — que é outra coisa.
 */
function QuadroDeRegras({ diasMes, diasDecorridos }: { diasMes: number; diasDecorridos: number }) {
  /* META_TOTAL_BATALHAO, e não a soma das frações da tela: com um filtro de
     fração ligado, `p.fracoes` tem uma linha só e o quadro anunciaria "meta do
     mês: 147 evidências no Batalhão". */
  const metaGlobal = META_TOTAL_BATALHAO;
  const cotaDia = diasMes > 0 ? metaGlobal / diasMes : 0;
  return (
    <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-4">
      <span className="dados text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
        Como ler estes gráficos
      </span>
      <div className="mt-2.5 grid grid-cols-1 gap-x-7 gap-y-4 sm:grid-cols-2">
        <div>
          <span className="dados text-[9.5px] font-black uppercase tracking-[0.1em] text-slate-500">
            O que cada traço quer dizer
          </span>
          <ul className="mt-1.5 flex flex-col gap-1.5 text-[11.5px] text-slate-700">
            <Regra amostra={<Amostra cor={AZUL} tracejado />}>
              <strong>Previsto acumulado</strong> — a meta do mês distribuída dia a dia. É a linha
              que a fração tem que perseguir.
            </Regra>
            <Regra
              amostra={
                <span className="flex shrink-0">
                  <span className="inline-block h-1 w-3 rounded-l-full" style={{ background: VERM }} />
                  <span className="inline-block h-1 w-3 rounded-r-full" style={{ background: VERDE }} />
                </span>
              }
            >
              <strong>Feito acumulado</strong> — o que já foi auditado.{" "}
              <strong style={{ color: VERM }}>Vermelha</strong> enquanto está abaixo do previsto,{" "}
              <strong style={{ color: VERDE }}>verde</strong> quando alcança. Ela para no dia de
              hoje.
            </Regra>
            <Regra
              amostra={
                <span
                  className="inline-block h-3 w-6 shrink-0 rounded-sm"
                  style={{ background: VERM, opacity: 0.18 }}
                />
              }
            >
              <strong>Faixa vermelha entre as duas linhas</strong> — a dívida: quanto falta para
              alcançar o previsto. Ela encolhe sozinha quando a fração produz acima da cota.
            </Regra>
            <Regra
              amostra={
                <span className="flex shrink-0 gap-px">
                  <span className="inline-block h-3 w-1.5" style={{ background: COR_FAIXA.critico }} />
                  <span className="inline-block h-3 w-1.5" style={{ background: COR_FAIXA.atencao }} />
                  <span className="inline-block h-3 w-1.5" style={{ background: COR_FAIXA.conforme }} />
                  <span
                    className="inline-block h-3 w-1.5"
                    style={{ background: COR_FAIXA.superacao }}
                  />
                </span>
              }
            >
              <strong>Barras (eixo da direita)</strong> — evidências lançadas naquele dia, medidas
              contra a cota do dia: <strong style={{ color: COR_FAIXA.critico }}>vermelho</strong>{" "}
              abaixo de 50%, <strong style={{ color: COR_FAIXA.atencao }}>âmbar</strong> de 50% a
              79%, <strong style={{ color: COR_FAIXA.conforme }}>verde</strong> de 80% a 100%,{" "}
              <strong style={{ color: COR_FAIXA.superacao }}>azul</strong> acima de 100%.
            </Regra>
            <Regra
              amostra={
                <span
                  className="inline-block h-4 w-2.5 shrink-0"
                  style={{ background: VERM, opacity: 0.16 }}
                />
              }
            >
              <strong>Coluna pálida de altura cheia</strong> — dia sem lançamento nenhum. Não gera
              barra, e é o dia que mais pesa na dívida.
            </Regra>
            <Regra amostra={<Amostra cor={NEUTRO} tracejado />}>
              <strong>Ritmo-alvo do dia</strong> — a cota diária. A barra tem que encostar nela.
            </Regra>
          </ul>
        </div>

        <div>
          <span className="dados text-[9.5px] font-black uppercase tracking-[0.1em] text-slate-500">
            Parâmetros e fórmulas
          </span>
          <ul className="mt-1.5 flex flex-col gap-1.5 text-[11.5px] leading-snug text-slate-700">
            <li>
              <strong>Meta do mês</strong> — {N0.format(metaGlobal)} evidências no Batalhão,
              rateadas por fração na Matriz Proporcional. Cada cartão mostra a cota da sua fração.
            </li>
            <li>
              <strong>Cota do dia</strong> = meta ÷ dias do mês. No Batalhão,{" "}
              {N0.format(metaGlobal)} ÷ {N0.format(diasMes)} ={" "}
              <span className="dados font-black">{N2.format(cotaDia)}</span>/dia.
            </li>
            <li>
              <strong>Cota do turno</strong> = cota do dia ÷ {N0.format(TURNOS_POR_DIA)}. Cada
              fração roda {N0.format(TURNOS_POR_DIA)} turnos por dia; o Batalhão se mede por dia, e
              nunca por turno.
            </li>
            <li>
              <strong>Dívida</strong> = previsto acumulado − feito acumulado. Nunca é negativa:
              quando sobra, vira <strong>crédito</strong>.
            </li>
            <li>
              <strong>Amanhã</strong> = cota do dia + dívida. Fração adiantada continua com a cota
              cheia: crédito é folga, não dispensa.
            </li>
            <li>
              <strong>Período</strong> — dia {N0.format(diasDecorridos)} de {N0.format(diasMes)}. O
              dia em curso conta; o mês zera na virada, e nada é fixo no sistema.
            </li>
            <li>
              <strong>Batalhão ≠ soma das frações</strong> — a curva do Batalhão inclui também as
              evidências lançadas <em>sem fração declarada</em>, que não têm cota e por isso não
              entram em curva nenhuma de fração.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Um cartão: selo de situação, números do dia, a curva e a leitura em texto. */
function Cartao({
  rotulo,
  meta,
  pontos,
  diasMes,
  diasDecorridos,
  porTurno,
}: {
  rotulo: string;
  meta: number;
  pontos: PontoCurva[];
  diasMes: number;
  diasDecorridos: number;
  /** Mostra a equivalência por turno-fração (2 turnos por dia). Só nas frações:
   *  o Batalhão se mede por dia e nunca por turno. */
  porTurno: boolean;
}) {
  const realizado = pontos.reduce((s, p) => s + p.feito, 0);
  const entrada = {
    meta,
    realizado,
    turnosMes: diasMes,
    turnosDecorridos: diasDecorridos,
  };
  const amanha = metaDeAmanha(entrada);
  const t = calcularTendencia(entrada);
  const semBase = diasDecorridos === 0;
  /** Cota de um dia — é o ritmo-alvo diário, e vira linha sobre as barras. */
  const amanhaCota = amanha.cota;
  const atrasado = amanha.divida > 0;
  const corStatus = atrasado ? VERM : VERDE;
  /* ARREDONDA, como o saldo da tabela Tendência por Fração — teto e piso
     divergiriam em 1 da mesma fração na mesma tela, que é a classe de erro que o
     Comando cobrou. O caso de 0,x vira "menos de 1", em vez do "dívida 0" que
     apareceria ao lado do selo ATRASADA. */
  const dividaInteira = Math.round(amanha.divida);
  const creditoInteiro = Math.round(amanha.agio);
  const dividaTexto = dividaInteira === 0 ? "menos de 1" : N0.format(dividaInteira);

  const hoje = [...pontos].reverse().find((p) => p.decorrido && p.acumulado !== null);
  const parados = pontos.filter((p) => p.decorrido && p.feito === 0).length;

  /* DIA PARADO é o caso que a barra colorida não alcança: produção zero não
     desenha barra nenhuma, então o dia em que ninguém auditou — justamente o
     que precisa saltar aos olhos — seria o único sem cor no gráfico. Vira uma
     coluna vermelha pálida de fundo, larga e clara o bastante para não ser
     confundida com um valor.

     A linha do feito vira DUAS séries, uma vermelha e uma verde, cada uma com
     buracos onde a outra desenha. O ponto de virada entra nas duas, senão o
     segmento entre um dia atrasado e um dia em dia não é desenhado por ninguém
     e a linha aparece partida. */
  const dados = pontos.map((pt, i) => {
    const anterior = i > 0 ? pontos[i - 1] : undefined;
    const agora = emAtraso(pt);
    const antes = anterior && anterior.acumulado !== null ? emAtraso(anterior) : agora;
    return {
      ...pt,
      /* Só dia FECHADO leva o carimbo: o dia em curso ainda pode receber
         lançamento, e às 08h da manhã a coluna diria "sem lançamento nenhum"
         sobre um dia que mal começou. A linha "hoje" já marca onde o mês está. */
      parado: pt.decorrido && pt.dia < diasDecorridos && pt.feito === 0 ? meta : 0,
      acumAtraso: pt.acumulado !== null && (agora || antes) ? pt.acumulado : null,
      acumEmDia: pt.acumulado !== null && (!agora || !antes) ? pt.acumulado : null,
    };
  });

  return (
    <div className="flex min-w-0 flex-col rounded-xl border-2 border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b-2 border-slate-200 pb-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-black text-slate-900">{rotulo}</span>
          {!semBase && (
            <span
              title={SUBTITULO_TRAJETORIA[t.situacao]}
              className="inline-block whitespace-nowrap rounded-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
              style={{ background: COR_TRAJETORIA[t.situacao] }}
            >
              {ROTULO_TRAJETORIA[t.situacao]}
            </span>
          )}
        </span>
        <span className="dados text-[10.5px] font-semibold text-slate-500">
          meta {N0.format(meta)} · cota{" "}
          <strong className="font-black text-slate-800">{N2.format(amanha.cota)}</strong>/dia
          {porTurno && (
            <>
              {" "}
              (<strong className="font-black text-slate-800">
                {N2.format(amanha.cota / TURNOS_POR_DIA)}
              </strong>
              /turno)
            </>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[11px]">
        {semBase ? (
          <span className="font-semibold text-slate-500">Mês ainda não começou.</span>
        ) : atrasado ? (
          <span className="font-semibold text-slate-700">
            Dívida acumulada{" "}
            <strong className="dados text-[13px] font-black" style={{ color: VERM }}>
              {dividaTexto}
            </strong>
          </span>
        ) : (
          <span className="font-semibold text-slate-700">
            Crédito acumulado{" "}
            <strong className="dados text-[13px] font-black" style={{ color: AZUL }}>
              +{N0.format(creditoInteiro)}
            </strong>
          </span>
        )}
        <span className="font-semibold text-slate-700">
          {amanha.ultimo ? (
            "Mês encerrado — não há dia seguinte."
          ) : (
            <>
              Amanhã{" "}
              <strong
                className="dados text-[13px] font-black"
                style={{ color: atrasado ? VERM : AMBAR }}
              >
                {N2.format(amanha.alvo)}
              </strong>{" "}
              <span className="text-slate-500">
                {atrasado
                  ? `= cota ${N2.format(amanha.cota)} + dívida ${N2.format(amanha.divida)}`
                  : "= a cota do dia"}
              </span>
            </>
          )}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={186}>
        <ComposedChart data={dados} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="rotulo" tick={EIXO} axisLine={false} tickLine={false} interval={4} />
          {/* Eixo X só para a coluna do dia parado. Recharts agrupa barras POR
              EIXO X: com as duas no mesmo eixo, elas ficam lado a lado dentro da
              banda do dia — a coluna deixava de ser fundo e ainda empurrava a
              barra do dia para fora do seu próprio tick. */}
          <XAxis xAxisId="fundo" dataKey="rotulo" hide />
          <YAxis yAxisId="acum" tick={EIXO} axisLine={false} tickLine={false} width={44} />
          <YAxis
            yAxisId="dia"
            orientation="right"
            tick={EIXO}
            axisLine={false}
            tickLine={false}
            width={26}
            allowDecimals={false}
          />

          <ReferenceLine
            yAxisId="acum"
            y={meta}
            stroke="#94a3b8"
            strokeDasharray="2 4"
            ifOverflow="extendDomain"
          />
          {diasDecorridos > 0 && diasDecorridos < diasMes && (
            <ReferenceLine
              yAxisId="acum"
              x={String(diasDecorridos).padStart(2, "0")}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{ value: "hoje", fill: "#64748b", fontSize: 9, position: "insideTopLeft" }}
            />
          )}

          <Bar
            yAxisId="acum"
            xAxisId="fundo"
            dataKey="parado"
            barSize={11}
            fill={VERM}
            fillOpacity={0.13}
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />
          <Bar yAxisId="dia" dataKey="feito" name="Evidências do dia" barSize={7}>
            {pontos.map((pt) => (
              <Cell key={pt.dia} fill={corDaBarra(pt, amanhaCota)} />
            ))}
          </Bar>
          {/* RITMO-ALVO por dia, na régua das barras. A azul tracejada é o alvo
              ACUMULADO — responde "estou no prazo?"; esta responde "o dia de
              hoje fechou?", que é outra pergunta e não tinha resposta na tela.
              Deliberadamente NEUTRA e pontilhada, no padrão da linha "meta/dia"
              do gráfico de produção diária: verde e vermelho aqui já significam
              cumprimento, e a mesma cor não pode dizer duas coisas na mesma
              figura. `extendDomain` porque em fração de cota baixa o alvo fica
              acima da maior barra do mês e a linha sairia do gráfico. */}
          <ReferenceLine
            yAxisId="dia"
            y={amanhaCota}
            stroke={NEUTRO}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            ifOverflow="extendDomain"
            label={{
              value: `alvo ${N2.format(amanhaCota)}/dia`,
              fill: NEUTRO,
              fontSize: 9,
              fontWeight: 700,
              position: "insideBottomRight",
            }}
          />
          {/* Empilhadas: feito + dívida = previsto, por construção. A faixa
              vermelha É o vão entre as duas linhas — o gráfico deixa de ter um
              buraco branco onde mora o indicador mais importante. */}
          <Area
            yAxisId="acum"
            type="monotone"
            dataKey="acumulado"
            stackId="acum"
            stroke="none"
            fill={AMBAR}
            fillOpacity={0.1}
            connectNulls={false}
            activeDot={false}
            legendType="none"
            tooltipType="none"
          />
          <Area
            yAxisId="acum"
            type="monotone"
            dataKey="divida"
            name="Dívida acumulada"
            stackId="acum"
            stroke="none"
            fill={VERM}
            fillOpacity={0.18}
            connectNulls={false}
            activeDot={false}
            legendType="none"
          />
          <Line
            yAxisId="acum"
            type="linear"
            dataKey="previsto"
            name="Previsto acumulado"
            stroke={AZUL}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
          />
          {/* Série invisível: existe só para o tooltip ter UMA entrada de "feito
              acumulado", em vez de duas meio-séries com buraco. */}
          <Line
            yAxisId="acum"
            dataKey="acumulado"
            name="Feito acumulado"
            stroke="none"
            dot={false}
            activeDot={false}
            legendType="none"
          />
          <Line
            yAxisId="acum"
            type="monotone"
            dataKey="acumAtraso"
            stroke={VERM}
            strokeWidth={3.5}
            dot={{ r: 2.5, fill: VERM, strokeWidth: 0 }}
            connectNulls={false}
            legendType="none"
            tooltipType="none"
          />
          <Line
            yAxisId="acum"
            type="monotone"
            dataKey="acumEmDia"
            stroke={VERDE}
            strokeWidth={3.5}
            dot={{ r: 2.5, fill: VERDE, strokeWidth: 0 }}
            connectNulls={false}
            legendType="none"
            tooltipType="none"
          />
          {/* Onde a linha parou hoje, com a cor da situação. É o ponto que o
              olho procura quando a curva ainda tem dois dias de vida. */}
          {hoje && hoje.acumulado !== null && (
            <ReferenceDot
              yAxisId="acum"
              x={hoje.rotulo}
              y={hoje.acumulado}
              r={5}
              fill={corStatus}
              stroke="#ffffff"
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          )}

          <Tooltip
            {...TOOLTIP}
            cursor={{ fill: "#1d1d1d0a" }}
            formatter={(v, n, item) => {
              const valor = Number(v ?? 0);
              const ponto = (item as { payload?: PontoCurva } | undefined)?.payload;
              if (ponto && !ponto.decorrido) return ["—", String(n)];
              if (n === "Evidências do dia" && amanhaCota > 0) {
                return [
                  `${N0.format(Math.round(valor))} · ${N0.format((valor / amanhaCota) * 100)}% da cota`,
                  String(n),
                ];
              }
              return [N0.format(Math.round(valor)), String(n)];
            }}
            labelFormatter={(l) => `Dia ${l}`}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* LEITURA DO CARTÃO — os parâmetros deste gráfico em uma frase, debaixo
          dele, como o Comando pediu. O quadro de cima explica o desenho; esta
          linha diz o que o desenho está dizendo HOJE, nesta fração. */}
      <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-snug text-slate-600">
        {semBase ? (
          "Sem dia decorrido: não há o que comparar ainda."
        ) : (
          <>
            Dia <strong className="dados">{N0.format(diasDecorridos)}</strong> de{" "}
            <strong className="dados">{N0.format(diasMes)}</strong> · previsto até aqui{" "}
            <strong className="dados">{N2.format(hoje?.previsto ?? 0)}</strong> · feito{" "}
            <strong className="dados">{N0.format(realizado)}</strong> ·{" "}
            {atrasado ? (
              <>
                {dividaInteira === 1 ? "falta" : "faltam"}{" "}
                <strong className="dados font-black" style={{ color: VERM }}>
                  {dividaTexto}
                </strong>{" "}
                para encostar na linha
              </>
            ) : (
              <>
                <strong className="dados font-black" style={{ color: VERDE }}>
                  na linha
                </strong>
                , com {N0.format(creditoInteiro)} de folga
              </>
            )}
            {parados > 0 && (
              <>
                {" · "}
                <strong className="dados font-black" style={{ color: VERM }}>
                  {N0.format(parados)}
                </strong>{" "}
                dia{parados === 1 ? "" : "s"} sem lançamento
              </>
            )}
            .
          </>
        )}
      </p>
    </div>
  );
}

export function CurvaPlanoRealizado({
  fracoes,
  metaGlobal,
  porDiaBatalhao,
  diasMes,
  diasDecorridos,
  prefixo,
  mostrarBatalhao = true,
}: {
  fracoes: CurvaFracao[];
  metaGlobal: number;
  porDiaBatalhao: { data: string; v: number }[];
  diasMes: number;
  diasDecorridos: number;
  /** "AAAA-MM" do recorte. */
  prefixo?: string;
  /** Com filtro de fração ligado, `fracoes` tem uma linha só e a série do
   *  Batalhão é a daquela fração: o cartão sairia rotulado "Batalhão" com a meta
   *  e a curva de uma Cia. Some, e a curva da fração fica na grade abaixo. */
  mostrarBatalhao?: boolean;
}) {
  const btl = curvaPlanoRealizado({
    meta: metaGlobal,
    diasMes,
    diasDecorridos,
    porDia: porDiaBatalhao,
    prefixo,
  });

  return (
    <div className="flex flex-col gap-3">
      <QuadroDeRegras diasMes={diasMes} diasDecorridos={diasDecorridos} />

      {mostrarBatalhao && (
        <Cartao
          rotulo="Batalhão"
          meta={metaGlobal}
          pontos={btl}
          diasMes={diasMes}
          diasDecorridos={diasDecorridos}
          porTurno={false}
        />
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {fracoes.map((f) => (
          <Cartao
            key={f.chave}
            rotulo={f.rotulo}
            meta={f.meta}
            pontos={curvaPlanoRealizado({
              meta: f.meta,
              diasMes,
              diasDecorridos,
              porDia: f.porDia ?? [],
              prefixo,
            })}
            diasMes={diasMes}
            diasDecorridos={diasDecorridos}
            porTurno
          />
        ))}
      </div>
    </div>
  );
}
