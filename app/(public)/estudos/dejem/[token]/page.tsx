import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Estudo, lerFiltro } from "@/components/dejem/estudo";
import { tokenConfere } from "@/lib/dejem-link-publico";

/**
 * Estudo DEJEM em versão de link, para compartilhar com o escalão superior
 * sem exigir conta no portal.
 *
 * Duas travas, e elas são independentes uma da outra:
 *
 * 1. O token confere ou a rota devolve 404. Isso é discrição, não segurança:
 *    quem tiver o link entra, e quem repassar o link repassa o acesso.
 * 2. `nominal={false}` incondicional. Esta é a trava que importa: nome e RE de
 *    policial NUNCA são montados aqui, nem que o token esteja certo, nem que
 *    exista sessão de Comando no navegador. Não há caminho de código que ligue
 *    o nominal nesta rota.
 *
 * A rota fica sob /estudos, que o proxy já trata como pública por prefixo, e
 * não é listada no índice de /estudos — quem não recebeu o endereço não chega
 * nela navegando.
 */

export const dynamic = "force-dynamic";

const TITULO = "DEJEM · 16º BPM/M · 1º semestre de 2026";
const DESCRICAO =
  "667 vagas de DEJEM tinham candidato inscrito e mesmo assim ficaram vazias. O gargalo não é falta de voluntário: é a escala que não fecha, e ela tem dia, turno e Companhia identificados.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  // Fora de buscador: o link é para circular por envio direto, não por busca.
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    type: "article",
    locale: "pt_BR",
    siteName: "16º BPM/M · Centro de Controle Operacional",
    images: [
      {
        url: "/estudos/dejem-previa.png",
        width: 1200,
        height: 630,
        alt: "Estudo analítico do DEJEM no 16º BPM/M, 1º semestre de 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
    images: ["/estudos/dejem-previa.png"],
  },
};

export default async function EstudoDejemPublico({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  if (!tokenConfere(token)) notFound();

  return (
    <Estudo
      filtro={lerFiltro(await searchParams)}
      nominal={false}
      basePath={`/estudos/dejem/${token}`}
    />
  );
}
