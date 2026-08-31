import type { MetadataRoute } from "next";

// O portal é ferramenta de trabalho interno: não deve ser indexado por
// buscadores. Barramos o Google/Bing aqui (que obedecem o robots.txt), mas
// NÃO usamos mais a meta `noindex` nas páginas — o crawler de preview de link
// do WhatsApp/Facebook respeita `noindex` e recusa gerar o cartão. Como esses
// crawlers ignoram o robots.txt, o preview volta a funcionar e o Google fica
// de fora do mesmo jeito.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
