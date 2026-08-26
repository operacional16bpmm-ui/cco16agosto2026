import { exigirPagina } from "@/lib/db/permissoes";
import { podeVerNominal } from "@/lib/autorizacao";
import { Estudo, lerFiltro } from "@/components/dejem/estudo";

/**
 * Estudo DEJEM, versão interna da Sala de Comando.
 *
 * O corpo vive em components/dejem/estudo.tsx, compartilhado com a rota
 * pública por link (/estudos/dejem/[token]). A única diferença entre as duas
 * é o `nominal`: aqui ele sai do perfil da sessão, lá é false incondicional.
 */

export const metadata = { title: "DEJEM · Estudo analítico · 16º BPM/M" };
export const dynamic = "force-dynamic";

export default async function DejemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessao = await exigirPagina("/dejem");
  return (
    <Estudo
      filtro={lerFiltro(await searchParams)}
      nominal={podeVerNominal(sessao)}
      basePath="/dejem"
      cancelarPaddingDoMain
    />
  );
}
