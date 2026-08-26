import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * Cartão de pré-visualização do link /cop2026 (WhatsApp, Telegram, e-mail).
 *
 * Paleta própria, de propósito: os outros links do Batalhão que circulam por
 * WhatsApp (/16bpmm, /inventario-2026) usam o vermelho e o fundo escuro
 * institucionais, e um card igual ao outro faz o destinatário achar que já
 * abriu aquele link. Aqui é verde-azulado profundo com âmbar, que é a cor de
 * "gravando" da câmera operacional portátil e não aparece em nenhuma outra
 * página do portal.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Auditoria de COP 2026 do 16º BPM/M — painel de controle da auditoria de câmeras operacionais portáteis";

// readFile do brasão exige Node, não o runtime edge.
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
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0d5150 0%, #0b3b3f 45%, #06222a 100%)",
          color: "#f2fbfa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brasaoUri} alt="" width={92} height={131} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 22,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#f5b544",
                fontWeight: 700,
              }}
            >
              Polícia Militar do Estado de São Paulo
            </span>
            <span style={{ fontSize: 30, fontWeight: 700, color: "#c7ece8" }}>
              16º Batalhão de Polícia Militar Metropolitano
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 20px",
              borderRadius: 999,
              background: "#f5b544",
              color: "#06251f",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Preenchimento diário obrigatório
          </span>
          <span style={{ fontSize: 82, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Auditoria de COP 2026
          </span>
          <span style={{ fontSize: 34, color: "#9fd6cf", lineHeight: 1.3, maxWidth: 940 }}>
            Lance a sua auditoria de câmera operacional portátil e acompanhe, ao vivo, a meta de
            cada companhia.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(245,181,68,0.35)",
            paddingTop: 26,
            fontSize: 26,
            color: "#8fc5be",
          }}
        >
          <span style={{ fontWeight: 700, color: "#f2fbfa" }}>
            Mínimo de 3 evidências auditadas por turno
          </span>
          <span>Diretriz PM3-001/02/25</span>
        </div>
      </div>
    ),
    size
  );
}
