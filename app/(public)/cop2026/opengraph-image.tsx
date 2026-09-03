import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

import { META_TOTAL_BATALHAO } from "@/lib/cop2026";
import { mesCorrente } from "@/lib/cop2026-relatorios";

/**
 * Cartão de pré-visualização oficial do link /cop2026 para WhatsApp e redes sociais.
 * Padrão CComSoc / PMESP: Azul Noite (#0b1222), Vermelho PM (#ca0202), Ouro (#ded845).
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** O ciclo do cartão sai de `mesCorrente()`, não de constante: quem compartilha
 *  o link no grupo precisa que a prévia diga o mês de HOJE. Cravar "setembro"
 *  aqui seria mandar um cartão mentiroso no dia 1º de outubro. */
function cicloDoCartao(): string | null {
  const mes = mesCorrente();
  return mes ? `Ciclo de ${mes.rotulo}` : null;
}

export const alt =
  "16º BPM/M — Auditoria de COP 2026 · Controle e Fiscalização das Câmeras Operacionais Corporais";

export const runtime = "nodejs";

/** Sem isto a imagem é gerada UMA vez no build e congela o mês do deploy — o
 *  cartão continuaria dizendo "Agosto" em setembro inteiro. De hora em hora é
 *  de sobra para uma virada que acontece à meia-noite. */
export const revalidate = 3600;

export default async function OpengraphImage() {
  const ciclo = cicloDoCartao();
  /** Só o nome do mês, para o letreiro ("AUDITORIA SETEMBRO"). */
  const mesCartao = mesCorrente()?.rotulo.toUpperCase() ?? null;
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
          {/* Linha de cima: o letreiro vermelho à esquerda, as duas etiquetas
              douradas empilhadas à direita. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            {/* Letreiro em néon: o mês inteiro em caixa alta é o que a tropa lê
                de relance na miniatura do WhatsApp, antes de qualquer texto. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 34px",
                borderRadius: 16,
                background: "linear-gradient(180deg, #e00b0b 0%, #a80000 100%)",
                border: "3px solid #ff5a5a",
                boxShadow:
                  "0 0 0 3px rgba(202,2,2,0.35), 0 0 34px rgba(255,60,60,0.75), inset 0 2px 10px rgba(255,255,255,0.28)",
              }}
            >
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  letterSpacing: -0.5,
                  lineHeight: 1,
                  color: "#ffffff",
                  textTransform: "uppercase",
                }}
              >
                {mesCartao ? `Auditoria ${mesCartao}` : "Auditoria de COP"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ciclo && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 22px",
                    borderRadius: 12,
                    background: "#ded845",
                    color: "#0b1222",
                    fontSize: 21,
                    fontWeight: 900,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  🗓 {ciclo}
                </span>
              )}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 22px",
                  borderRadius: 12,
                  background: "rgba(222, 216, 69, 0.12)",
                  border: "1px solid rgba(222, 216, 69, 0.45)",
                  color: "#ded845",
                  fontSize: 19,
                  fontWeight: 700,
                }}
              >
                🎯 {`Meta: ${META_TOTAL_BATALHAO} Evidências no mês`}
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 1.15,
              color: "#ffffff",
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            Controle e Fiscalização das Câmeras Operacionais Corporais
          </span>

          {/* Divisor com o escudo ao centro. */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flex: 1, height: 1, background: "rgba(255,255,255,0.16)" }} />
            <span style={{ display: "flex", fontSize: 20 }}>🛡</span>
            <div style={{ display: "flex", flex: 1, height: 1, background: "rgba(255,255,255,0.16)" }} />
          </div>

          <span
            style={{
              fontSize: 19,
              color: "#cbd5e1",
              lineHeight: 1.45,
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
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
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 7 }}>
              🔴 Lançar Auditoria do Turno
            </span>
            <span style={{ display: "flex", width: 1, height: 18, background: "rgba(255,255,255,0.22)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 7 }}>
              📊 Dashboard de Controle
            </span>
            <span style={{ display: "flex", width: 1, height: 18, background: "rgba(255,255,255,0.22)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 7 }}>
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
