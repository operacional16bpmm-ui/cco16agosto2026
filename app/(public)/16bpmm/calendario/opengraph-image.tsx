import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * Cartão de pré-visualização do link /16bpmm/calendario (WhatsApp, Telegram,
 * e-mail). Mesma identidade institucional da página oficial (azul-noite +
 * ouro + vermelho), para quem já viu o card do /16bpmm reconhecer de cara que
 * é a mesma Unidade — mas com selo próprio de "Agenda oficial e colaborativa",
 * porque é essa a novidade que o card precisa vender em um segundo de rolagem.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Calendário de Eventos do 16º BPM/M — agenda oficial e colaborativa do Batalhão, com destaque para o aniversário em 06 de dezembro";

// readFile do brasão exige Node, não o runtime edge.
export const runtime = "nodejs";

export default async function OpengraphImage() {
  const brasao = await readFile(path.join(process.cwd(), "public/16bpmm/geral/brasao.png"));
  const brasaoUri = `data:image/png;base64,${brasao.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          background: "linear-gradient(135deg, #16294a 0%, #16294a 55%, #22406b 100%)",
          color: "#fcfeff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brasaoUri} alt="" width={86} height={121} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 20,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#ded845",
                fontWeight: 700,
              }}
            >
              Polícia Militar do Estado de São Paulo
            </span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#fcfeff" }}>
              16º Batalhão de Polícia Militar Metropolitano
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 20px",
              borderRadius: 999,
              background: "#ab9142",
              color: "#16294a",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Agenda oficial e colaborativa
          </span>
          <span
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#ded845",
            }}
          >
            Calendário de Eventos
          </span>
          <span style={{ fontSize: 29, color: "#c9d3e2", lineHeight: 1.35, maxWidth: 980 }}>
            Reuniões de Valorização, CONSEGs, datas comemorativas e a agenda de todas as
            Companhias e Seções, num lugar só.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(222,216,69,0.35)",
            paddingTop: 24,
            fontSize: 25,
          }}
        >
          <span style={{ fontWeight: 700, color: "#fcfeff" }}>
            63 anos do 16º BPM/M · 06 de dezembro
          </span>
          <span style={{ color: "#9fb0cc" }}>16bpmm-pmesp.vercel.app</span>
        </div>
      </div>
    ),
    size
  );
}
