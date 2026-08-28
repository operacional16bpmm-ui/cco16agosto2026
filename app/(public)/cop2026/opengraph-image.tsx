import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * Cartão de pré-visualização oficial do link /cop2026 para WhatsApp e redes sociais.
 * Padrão CComSoc / PMESP: Azul Noite (#0b1222), Vermelho PM (#ca0202), Ouro (#ded845).
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "16º BPM/M — Auditoria de COP 2026 · Controle e Fiscalização das Câmeras Operacionais Corporais";

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
        {/* Faixa superior de honra em vermelho e ouro */}
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

        {/* Cabeçalho Oficial com Brasão */}
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
                Diretriz nº PM3-001/02/25 · Preenchimento Diário Obrigatório
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 12,
              background: "rgba(202, 2, 2, 0.15)",
              border: "1px solid rgba(202, 2, 2, 0.4)",
              color: "#ff5a5a",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Portal CCO-16
          </div>
        </div>

        {/* Bloco Central com Destaque de Auditoria */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                display: "flex",
                padding: "6px 16px",
                borderRadius: 8,
                background: "#ca0202",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Auditoria de COP 2026
            </span>
            <span
              style={{
                display: "flex",
                padding: "6px 16px",
                borderRadius: 8,
                background: "rgba(222, 216, 69, 0.15)",
                border: "1px solid rgba(222, 216, 69, 0.4)",
                color: "#ded845",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Meta: 960 Evidências (240/semana)
            </span>
          </div>

          <span
            style={{
              fontSize: 34,
              fontWeight: 900,
              lineHeight: 1.2,
              color: "#ffffff",
            }}
          >
            Controle e Fiscalização das Câmeras Operacionais Corporais
          </span>

          <span style={{ fontSize: 17, color: "#cbd5e1", lineHeight: 1.4 }}>
            Acompanhamento ao vivo por fração (EM · 1ª Cia · 2ª Cia · 3ª Cia · 4ª Cia · Força Tática) e
            lançamento diário obrigatório pelo efetivo.
          </span>
        </div>

        {/* Rodapé de Navegação */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 6 }}>
              🔴 Lançar Auditoria (Forms)
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 6 }}>
              📊 Dashboard de Controle
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 6 }}>
              📋 Briefing Executivo
            </span>
          </div>

          <span
            style={{
              fontSize: 13,
              fontFamily: "monospace",
              color: "#ded845",
              fontWeight: 700,
            }}
          >
            portal-cco16.vercel.app/cop2026
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
