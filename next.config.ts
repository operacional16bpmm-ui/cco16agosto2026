import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* O Chromium do briefing não pode ser empacotado: o @sparticuz/chromium lê os
     próprios arquivos .br do disco, por caminho relativo ao pacote, e o
     puppeteer-core carrega binário nativo. Empacotados, os dois quebram em
     runtime — a rota /api/cop2026/briefing-png sobe e falha ao lançar o
     navegador. Fora do bundle, a função os resolve de node_modules. */
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

  /* ...e externalizar NÃO BASTA. O `serverExternalPackages` só impede que o
     pacote seja reescrito pelo bundler; quem decide o que é COPIADO para dentro
     da função na Vercel é o rastreador de arquivos, e ele segue o grafo de
     `import`/`require`. Os binários do Chromium (`chromium.br`, `fonts.tar.br`,
     `al2023.tar.br`, `swiftshader.tar.br`, ~70 MB) são lidos por caminho
     montado em tempo de execução — o rastreador não tem como enxergá-los, e a
     função subia sem eles:

       The input directory "/var/task/node_modules/@sparticuz/chromium/bin"
       does not exist.

     O sintoma era cruel porque o build passa, a rota responde e só o PNG falha.
     Esta lista é o que obriga a cópia. */
  outputFileTracingIncludes: {
    "/api/cop2026/briefing-png": ["./node_modules/@sparticuz/chromium/bin/**"],
  },

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
      // A Auditoria de COP teve três painéis no ar ao mesmo tempo: o V1 na URL
      // limpa, o V2 de prévia de layout e o V3 do ciclo. O Comando encerrou a
      // avaliação em 01/09/2026 — ficou o V3, e ficou em /cop2026/dashboard.
      // Os dois redirects seguram o link salvo de quem já tinha o endereço
      // versionado; o Next repassa a query string sozinho, então `?excecao=`,
      // `?semana=` e `?briefing=1` continuam chegando no painel.
      {
        source: "/cop2026/dashboard/v3",
        destination: "/cop2026/dashboard",
        permanent: true,
      },
      {
        source: "/cop2026/dashboard/v2",
        destination: "/cop2026/dashboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
