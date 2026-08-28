import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * Cartão de pré-visualização oficial do Portal CCO16 para WhatsApp e redes.
 * Padrão CComSoc / PMESP: Azul Noite (#16294a), Vermelho PM (#ca0202), Ouro (#ded845).
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Portal CCO16 — 16º Batalhão de Polícia Militar Metropolitano · PMESP";

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
          padding: "56px 64px",
          background: "linear-gradient(135deg, #16294a 0%, #0d1a33 50%, #080f1f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Faixa superior de honra em vermelho e ouro */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(90deg, #ca0202 0%, #ab9142 50%, #305388 100%)",
          }}
        />

        {/* Cabeçalho Oficial */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brasaoUri} alt="" width={96} height={136} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 20,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#ded845",
                fontWeight: 700,
              }}
            >
              Polícia Militar do Estado de São Paulo
            </span>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", marginTop: 4 }}>
              16º Batalhão de Polícia Militar Metropolitano
            </span>
            <span style={{ fontSize: 18, color: "#94a3b8", marginTop: 2 }}>
              Centro de Controle Operacional (CCO) e Sala de Operações
            </span>
          </div>
        </div>

        {/* Bloco Central */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                display: "flex",
                padding: "6px 18px",
                borderRadius: 8,
                background: "#ca0202",
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Portal Oficial
            </span>
            <span
              style={{
                display: "flex",
                padding: "6px 18px",
                borderRadius: 8,
                background: "rgba(222, 216, 69, 0.15)",
                border: "1px solid rgba(222, 216, 69, 0.4)",
                color: "#ded845",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Sistemas de Comando & Gestão Operacional
            </span>
          </div>

          <span
            style={{
              fontSize: 74,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: "#ffffff",
            }}
          >
            PORTAL CCO 16
          </span>

          <span style={{ fontSize: 26, color: "#cbd5e1", lineHeight: 1.35, maxWidth: 980 }}>
            Auditoria COP 2026, Escala DEJEM, Boletins de Ocorrência, Câmeras ao Vivo e Sala de Operações do 16º BPM/M.
          </span>
        </div>

        {/* Rodapé com Selos e Metadados */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(255,255,255,0.12)",
            paddingTop: 20,
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            <span style={{ fontWeight: 700, color: "#ffffff" }}>
              🏛️ 16º BPM/M — Zona Oeste / SP
            </span>
            <span>•</span>
            <span style={{ fontWeight: 700, color: "#ffffff" }}>
              ⚡ CCO em Tempo Real
            </span>
          </div>
          <span style={{ color: "#ded845", fontWeight: 700 }}>
            Diretriz nº PM3-001/02/23
          </span>
        </div>
      </div>
    ),
    size
  );
}
