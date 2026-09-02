"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TURNOS_POR_DIA,
  curvaPlanoRealizado,
  metaDeAmanha,
  type PontoCurva,
} from "@/lib/cop2026-tendencia";

/**
 * CURVA PLANO × REALIZADO — o gráfico que a Coordenadoria Operacional pediu em
 * 02/09/2026: "um gráfico para cada fração, por dia, com quanto fizeram, com a
 * linha do que deveria ser feito para comparar".
 *
 * São três leituras no mesmo desenho, e cada uma responde uma pergunta que veio
 * escrita no despacho:
 *
 * - **linha azul tracejada** — o previsto acumulado, dia a dia. É "o que
 *   deveria ter sido feito até aqui";
 * - **linha âmbar** — o realizado acumulado. Ela PARA no dia de hoje: dia que
 *   ainda não chegou não vale zero, vale nada;
 * - **barras cinza** — as evidências de cada dia, no eixo da direita. É o "dia
 *   a dia mensurado" que a coordenadoria cobrou;
 * - **linha verde** — o ritmo-alvo do dia, sobre as barras. Duas perguntas
 *   diferentes moram no mesmo gráfico: a azul responde "estou no prazo do mês?"
 *   e a verde responde "o dia de ontem fechou a cota?". Sem ela, a barra de um
 *   dia não tinha contra o que ser lida.
 *
 * O vão entre as duas linhas é a DÍVIDA — "a somatória do que se vai deixando
 * de fazer, que vai caindo à medida que começam a sanear". Ela tem número no
 * cabeçalho do cartão, porque vão em gráfico não se lê com régua.
 *
 * Por que acumulado, e não só a barra do dia: o desperdício que a coordenadoria
 * descreveu — "é sempre na terceira para a quarta semana que o pessoal olha, vê
 * que não vai atingir e aí começa a fazer" — não aparece em barra nenhuma
 * isolada. Aparece na linha âmbar descolando da azul por vinte dias.
 *
 * Unidade: DIA. É a régua que a coordenadoria pediu para tudo ("dia a dia tudo
 * mensurado"), e o cartão carimba a equivalência em turno-fração ao lado, para
 * não abrir uma segunda conta de tempo — ver docs/cop2026-padroes-comando.md §4.
 */

const AZUL = "#2563eb";
const AMBAR = "#d97706";
const VERM = "#ca0202";
const CINZA = "#cbd5e1";
const VERDE = "#16a34a";
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

export interface CurvaFracao {
  chave: string;
  rotulo: string;
  meta: number;
  porDia?: { data: string; v: number }[];
}

/** Um cartão: cabeçalho com dívida e alvo de amanhã + a curva do mês. */
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
  const amanha = metaDeAmanha({
    meta,
    realizado,
    turnosMes: diasMes,
    turnosDecorridos: diasDecorridos,
  });
  const semBase = diasDecorridos === 0;
  /** Cota de um dia — é o ritmo-alvo diário, e vira linha sobre as barras. */
  const amanhaCota = amanha.cota;

  return (
    <div className="flex min-w-0 flex-col rounded-xl border-2 border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-b-2 border-slate-200 pb-2">
        <span className="text-[13px] font-black text-slate-900">{rotulo}</span>
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
        ) : amanha.divida > 0 ? (
          <span className="font-semibold text-slate-700">
            Dívida acumulada{" "}
            <strong className="dados text-[13px] font-black" style={{ color: VERM }}>
              {N0.format(Math.round(amanha.divida))}
            </strong>
          </span>
        ) : (
          <span className="font-semibold text-slate-700">
            Crédito acumulado{" "}
            <strong className="dados text-[13px] font-black" style={{ color: AZUL }}>
              +{N0.format(Math.round(amanha.agio))}
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
                style={{ color: amanha.alvo > amanha.cota ? VERM : AMBAR }}
              >
                {N2.format(amanha.alvo)}
              </strong>{" "}
              <span className="text-slate-500">
                {amanha.divida > 0
                  ? `= cota ${N2.format(amanha.cota)} + dívida ${N0.format(Math.round(amanha.divida))}`
                  : "= a cota do dia"}
              </span>
            </>
          )}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={186}>
        <ComposedChart data={pontos} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="rotulo" tick={EIXO} axisLine={false} tickLine={false} interval={4} />
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

          <Bar yAxisId="dia" dataKey="feito" name="Evidências do dia" fill={CINZA} barSize={7} />
          {/* RITMO-ALVO por dia, na régua das barras. A azul tracejada é o alvo
              ACUMULADO — responde "estou no prazo?"; esta responde "o dia de
              hoje fechou?", que é outra pergunta e não tinha resposta na tela.
              Verde é a cor de EM TRAJETÓRIA na régua do Comando: a barra que
              encosta nela é o dia que cumpriu a cota. `extendDomain` porque em
              fração de cota baixa o alvo fica acima da maior barra do mês e a
              linha sairia do gráfico. */}
          <ReferenceLine
            yAxisId="dia"
            y={amanhaCota}
            stroke={VERDE}
            strokeWidth={1.5}
            ifOverflow="extendDomain"
            label={{
              value: `alvo ${N2.format(amanhaCota)}/dia`,
              fill: VERDE,
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
            fillOpacity={0.14}
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
            fillOpacity={0.16}
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
          <Line
            yAxisId="acum"
            type="monotone"
            dataKey="acumulado"
            name="Feito acumulado"
            stroke={AMBAR}
            strokeWidth={2.5}
            dot={{ r: 2, fill: AMBAR, strokeWidth: 0 }}
            connectNulls={false}
          />

          <Tooltip
            {...TOOLTIP}
            cursor={{ fill: "#1d1d1d0a" }}
            formatter={(v, n) => [N0.format(Math.round(Number(v ?? 0))), String(n)]}
            labelFormatter={(l) => `Dia ${l}`}
          />
        </ComposedChart>
      </ResponsiveContainer>
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
}: {
  fracoes: CurvaFracao[];
  metaGlobal: number;
  porDiaBatalhao: { data: string; v: number }[];
  diasMes: number;
  diasDecorridos: number;
  /** "AAAA-MM" do recorte. */
  prefixo?: string;
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6" style={{ background: AZUL }} />
          previsto acumulado — o que deveria estar feito
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6" style={{ background: AMBAR }} />
          feito acumulado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2" style={{ background: CINZA }} />
          evidências do dia (eixo da direita)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6" style={{ background: VERDE }} />
          ritmo-alvo do dia — a barra tem que encostar nela
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4" style={{ background: VERM, opacity: 0.16 }} />
          dívida acumulada
        </span>
      </div>

      <Cartao
        rotulo="Batalhão"
        meta={metaGlobal}
        pontos={btl}
        diasMes={diasMes}
        diasDecorridos={diasDecorridos}
        porTurno={false}
      />

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

      <p className="text-[11.5px] leading-snug text-slate-500">
        A dívida é a distância entre as duas linhas: cresce em dia sem lançamento e cai quando a
        fração produz acima da cota. O alvo de <strong>amanhã</strong> é a cota normal do dia mais
        essa dívida — não a média do que falta diluída pelos dias que sobram. Fração adiantada
        continua com a cota cheia amanhã: o ágio aparece como crédito, e crédito é folga, não
        dispensa.
      </p>
    </div>
  );
}
