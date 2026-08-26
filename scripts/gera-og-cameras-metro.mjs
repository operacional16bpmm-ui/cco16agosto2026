import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og.js";

/**
 * Gera o cartão de pré-visualização de /estudos/cameras-metro.html.
 *
 * Paleta própria de propósito: os outros links do Batalhão que circulam por
 * WhatsApp usam vermelho institucional (/16bpmm), azul-noite (/estudos) ou
 * verde-azulado com âmbar (/cop2026). Card parecido faz o destinatário achar
 * que já abriu aquele link. Aqui é grafite de sala de monitoramento com ciano
 * de sinal vivo e vermelho de ponto cego, que é a própria mensagem do estudo.
 *
 * Sem JSX: o script roda em node puro, fora do pipeline de build do Next.
 * Uso: node scripts/gera-og-cameras-metro.mjs
 */

const h = (tipo, props, ...filhos) => ({
  type: tipo,
  key: props && props.key != null ? props.key : null,
  props: { ...props, children: filhos.length === 0 ? undefined : filhos.length === 1 ? filhos[0] : filhos },
});

const RAIZ = process.cwd();
const SAIDA = path.join(RAIZ, "public/estudos/img/og-cameras-metro.png");

const CIANO = "#4fd6e8";
const VERMELHO = "#ff5a4d";
const VERDE = "#4bd07f";

const ESTACOES = [
  { nome: "Campo Limpo", coberta: true },
  { nome: "Capão Redondo", coberta: true },
  { nome: "São Paulo/Morumbi", coberta: false },
  { nome: "Vila Sônia", coberta: false },
  { nome: "Vila das Belezas", coberta: false },
];

const brasao = await readFile(path.join(RAIZ, "public/brand/16bpmm.png"));
const brasaoUri = `data:image/png;base64,${brasao.toString("base64")}`;

const cabecalho = h(
  "div",
  { style: { display: "flex", alignItems: "center", gap: 22 } },
  h("img", { src: brasaoUri, width: 84, height: 120 }),
  h(
    "div",
    { style: { display: "flex", flexDirection: "column" } },
    h(
      "span",
      {
        style: {
          fontSize: 21,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: CIANO,
          fontWeight: 700,
        },
      },
      "Núcleo de Análise Criminal"
    ),
    h(
      "span",
      { style: { fontSize: 28, fontWeight: 700, color: "#b9ccd6" } },
      "16º Batalhão de Polícia Militar Metropolitano"
    )
  )
);

const titulo = h(
  "div",
  { style: { display: "flex", flexDirection: "column", gap: 16 } },
  h(
    "span",
    {
      style: {
        display: "flex",
        alignSelf: "flex-start",
        padding: "7px 18px",
        borderRadius: 999,
        background: VERMELHO,
        color: "#1a0906",
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: "uppercase",
      },
    },
    "3 de 5 estações sem vídeo"
  ),
  h(
    "span",
    {
      style: {
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1.03,
        letterSpacing: -1.6,
        maxWidth: 1010,
      },
    },
    "Onde temos olhos no metrô da nossa área"
  ),
  h(
    "span",
    { style: { fontSize: 27, color: "#93aab6", lineHeight: 1.28, maxWidth: 980 } },
    "Cinco estações na nossa circunscrição. Veja o que há de câmera ao vivo e de leitura de placa em cada uma."
  )
);

const regua = h(
  "div",
  { style: { display: "flex", gap: 12 } },
  ...ESTACOES.map((e) =>
    h(
      "div",
      {
        key: e.nome,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "9px 15px",
          borderRadius: 8,
          background: e.coberta ? "rgba(75,208,127,0.13)" : "rgba(255,90,77,0.13)",
          border: `1px solid ${e.coberta ? "rgba(75,208,127,0.40)" : "rgba(255,90,77,0.45)"}`,
        },
      },
      h("div", {
        style: {
          width: 11,
          height: 11,
          borderRadius: 999,
          background: e.coberta ? VERDE : VERMELHO,
        },
      }),
      h(
        "span",
        {
          style: {
            fontSize: 21,
            fontWeight: 600,
            color: e.coberta ? "#c8f0d8" : "#ffd0cb",
          },
        },
        e.nome
      )
    )
  )
);

const rodape = h(
  "div",
  {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderTop: "2px solid rgba(79,214,232,0.28)",
      paddingTop: 18,
      fontSize: 23,
      color: "#7e97a4",
    },
  },
  h(
    "span",
    { style: { fontWeight: 700, color: "#eef4f7" } },
    "54 leitores de placa ativos cobrem as cinco estações"
  ),
  h("span", null, "Levantamento de 04 ago 2026")
);

const cartao = h(
  "div",
  {
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "46px 64px",
      background: "linear-gradient(140deg, #202a33 0%, #151d24 42%, #0b1116 100%)",
      color: "#eef4f7",
      fontFamily: "sans-serif",
    },
  },
  cabecalho,
  titulo,
  h("div", { style: { display: "flex", flexDirection: "column", gap: 18 } }, regua, rodape)
);

const resposta = new ImageResponse(cartao, { width: 1200, height: 630 });
const png = Buffer.from(await resposta.arrayBuffer());
await writeFile(SAIDA, png);
console.log(`OK ${SAIDA} (${png.length} bytes)`);
