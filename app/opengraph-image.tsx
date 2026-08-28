import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "16º BPM/M — Portal CCO-16 · Centro de Controle Operacional";
export const runtime = "nodejs";

export default async function OpengraphImage() {
  const brasao = await readFile(path.join(process.cwd(), "public/brand/16bpmm.png"));
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
          padding: "48px 56px",
          background: "linear-gradient(135deg, #090e1a 0%, #0f192c 50%, #060a12 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(90deg, #ca0202 0%, #ded845 50%, #305388 100%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brasaoUri} alt="" width={88} height={124} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 16,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#ded845",
                  fontWeight: 700,
                }}
              >
                Polícia Militar do Estado de São Paulo
              </span>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>
                16º Batalhão de Polícia Militar Metropolitano
              </span>
              <span style={{ fontSize: 16, color: "#94a3b8", marginTop: 2 }}>
                Centro de Controle Operacional e Governança Integrada
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "28px 32px",
            background: "rgba(19, 29, 49, 0.75)",
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <span style={{ fontSize: 36, fontWeight: 900, color: "#ffffff" }}>
            Portal CCO-16 · Comando Operacional
          </span>
          <span style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.4 }}>
            Sistemas e painéis executivos: Auditoria COP 2026, DEJEM, Escalas, Câmeras e Boletins do 16º BPM/M.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: 16,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
            16º BPM/M · Zona Oeste de São Paulo
          </span>
          <span style={{ fontSize: 13, fontFamily: "monospace", color: "#ded845", fontWeight: 700 }}>
            portal-cco16.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
