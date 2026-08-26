import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /efetivo foi absorvida pela página de seção /p1 (dado real QSE
      // mensal, Fase 4 do plano de expansão) — regra "nunca duas páginas
      // para o mesmo dado".
      { source: "/efetivo", destination: "/p1", permanent: true },
      // A central de planilhas do inventário nasceu em /inventario-2026 e foi
      // publicada nesse endereço antes de ganhar o nome curto. O redirect
      // segura quem já tinha guardado o link antigo.
      { source: "/inventario-2026", destination: "/16bpmminventario", permanent: true },
      // O instalador do Painel Tempo Real é um arquivo estático em
      // public/painel/index.html, e arquivo em public/ só responde no caminho
      // exato. O redirect segura o endereço curto que se digita na tropa.
      { source: "/painel", destination: "/painel/index.html", permanent: false },
    ];
  },
};

export default nextConfig;
