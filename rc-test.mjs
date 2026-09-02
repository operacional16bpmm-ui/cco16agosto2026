import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, ReferenceLine, CartesianGrid, Cell,
} from "recharts";

const h = React.createElement;
const diasMes = 30, decorridos = 12, meta = 210;
const cota = meta / diasMes;
const producao = { 1: 3, 2: 0, 3: 7, 4: 12, 5: 0, 6: 2, 7: 9, 8: 0, 9: 5, 10: 8, 11: 0, 12: 4 };
let acc = 0;
const pontos = [];
for (let dia = 1; dia <= diasMes; dia++) {
  const decorrido = dia <= decorridos;
  const feito = decorrido ? (producao[dia] ?? 0) : 0;
  if (decorrido) acc += feito;
  const previsto = cota * dia;
  pontos.push({
    dia, rotulo: String(dia).padStart(2, "0"), feito,
    acumulado: decorrido ? acc : null, previsto,
    divida: decorrido ? Math.max(0, previsto - acc) : null, decorrido,
  });
}
const dados = pontos.map((pt) => ({ ...pt, parado: pt.decorrido && pt.feito === 0 ? meta : 0 }));

function chart(width, comParado) {
  const filhos = [
    h(CartesianGrid, { key: "g", stroke: "#eee", vertical: false }),
    h(XAxis, { key: "x", dataKey: "rotulo", interval: 4 }),
    h(YAxis, { key: "ya", yAxisId: "acum", width: 44 }),
    h(YAxis, { key: "yd", yAxisId: "dia", orientation: "right", width: 26, allowDecimals: false }),
    h(ReferenceLine, { key: "rm", yAxisId: "acum", y: meta, ifOverflow: "extendDomain" }),
  ];
  if (comParado)
    filhos.push(h(Bar, { key: "bp", yAxisId: "acum", dataKey: "parado", barSize: 11, fill: "#ca0202", fillOpacity: 0.07, isAnimationActive: false, className: "BAR-PARADO" }));
  filhos.push(
    h(Bar, { key: "bf", yAxisId: "dia", dataKey: "feito", name: "Evidências do dia", barSize: 7, isAnimationActive: false, className: "BAR-FEITO" },
      pontos.map((pt) => h(Cell, { key: pt.dia, fill: "#16a34a" }))),
    h(ReferenceLine, { key: "ra", yAxisId: "dia", y: cota, ifOverflow: "extendDomain" }),
    h(Area, { key: "a1", yAxisId: "acum", type: "monotone", dataKey: "acumulado", stackId: "acum", stroke: "none", fill: "#d97706", fillOpacity: 0.14, connectNulls: false, isAnimationActive: false, className: "AREA-ACUM" }),
    h(Area, { key: "a2", yAxisId: "acum", type: "monotone", dataKey: "divida", stackId: "acum", stroke: "none", fill: "#ca0202", fillOpacity: 0.16, connectNulls: false, isAnimationActive: false, className: "AREA-DIV" }),
    h(Line, { key: "l1", yAxisId: "acum", type: "linear", dataKey: "previsto", stroke: "#2563eb", dot: false, isAnimationActive: false, className: "LINE-PREV" }),
    h(Line, { key: "l2", yAxisId: "acum", type: "monotone", dataKey: "acumulado", stroke: "#d97706", connectNulls: false, isAnimationActive: false, className: "LINE-ACUM" }),
  );
  return h(ComposedChart, { width, height: 186, data: dados, margin: { top: 6, right: 4, left: -22, bottom: 0 } }, filhos);
}

for (const [rotulo, width, comParado] of [
  ["ANTES (1 barra) w=1148", 1148, false],
  ["DEPOIS (2 barras) w=1148", 1148, true],
  ["ANTES (1 barra) w=589", 589, false],
  ["DEPOIS (2 barras) w=589", 589, true],
  ["ANTES (1 barra) w=290", 290, false],
  ["DEPOIS (2 barras) w=290", 290, true],
]) {
  const html = renderToStaticMarkup(chart(width, comParado));
  const grupo = (cls) => {
    const i = html.indexOf(cls);
    if (i < 0) return "(ausente)";
    const trecho = html.slice(i, i + 4000);
    const rects = [...trecho.matchAll(/<path[^>]*d="M ?([-\d.]+),([-\d.]+) ?h ?([-\d.]+)/g)]
      .slice(0, 3).map((m) => `x=${(+m[1]).toFixed(1)} w=${(+m[3]).toFixed(1)}`);
    const rr = [...trecho.matchAll(/x="([-\d.]+)"[^>]*width="([-\d.]+)"/g)].slice(0, 3)
      .map((m) => `x=${(+m[1]).toFixed(1)} w=${(+m[2]).toFixed(1)}`);
    return (rects.length ? rects : rr).join(" | ");
  };
  console.log(`\n### ${rotulo}`);
  console.log("  parado:", grupo("BAR-PARADO"));
  console.log("  feito :", grupo("BAR-FEITO"));
  const linha = html.indexOf("LINE-ACUM");
  if (linha > 0) {
    const d = html.slice(linha, linha + 900).match(/d="M([^"]{0,120})/);
    console.log("  linha acum d=", d ? d[1].slice(0, 90) : "?");
  }
}
