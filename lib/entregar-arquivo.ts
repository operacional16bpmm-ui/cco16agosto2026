/**
 * Entrega de arquivo — e por que o iPhone precisa de um caminho próprio.
 *
 * A ARMADILHA: `navigator.share` exige *transient activation*, a permissão que
 * o toque concede e que o Safari do iOS expira em poucos segundos. O PNG do
 * painel leva ~30s para o servidor desenhar, então qualquer desenho de
 * "toca → espera o fetch → compartilha" chega à folha de compartilhamento com a
 * ativação já vencida: `NotAllowedError`, e o clique programático de `<a
 * download>` logo depois é bloqueado pelo mesmo motivo. O celular fica 30
 * segundos girando e não entrega nada — exatamente o sintoma que a exportação
 * tinha antes, por outra causa.
 *
 * Por isso o celular NÃO passa por aqui: ele navega direto para a rota, e o
 * `Content-Disposition: attachment` faz o Safari abrir o download nativo. Ver
 * `suportaEntregaNativa()` e o botão em dashboard-cop.tsx.
 *
 * Esta função existe para o caminho do DESKTOP, onde a espera não custa
 * ativação nenhuma e o `<a download>` com object URL sempre funcionou.
 */

export type ResultadoEntrega = "compartilhado" | "baixado" | "cancelado";

/**
 * Verdadeiro onde o sistema entrega arquivo por conta própria — iOS e Android.
 * Detecção por CAPACIDADE, não por user agent: `canShare({ files })` só responde
 * `true` onde o compartilhamento de arquivo existe de fato, e é o mesmo conjunto
 * de aparelhos em que a navegação direta é o caminho certo.
 */
export function suportaEntregaNativa(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const sonda = new File([new Uint8Array([0])], "sonda.png", { type: "image/png" });
    return navigator.canShare({ files: [sonda] });
  } catch {
    return false;
  }
}

export async function entregarArquivo(
  blob: Blob,
  nomeArquivo: string,
  compartilhamento?: { title?: string; text?: string }
): Promise<ResultadoEntrega> {
  const arquivo = new File([blob], nomeArquivo, { type: blob.type || "application/octet-stream" });

  /* Tentativa de compartilhar mesmo assim: em máquina onde a ativação não
     expira — e num fetch que volte rápido, com o Chromium já quente — a folha
     nativa continua sendo a melhor entrega. Falhou, segue para o download. */
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ ...compartilhamento, files: [arquivo] });
      return "compartilhado";
    } catch (erro) {
      /* Fechar a folha de compartilhamento é decisão da pessoa, não erro: cair
         no download aqui baixaria um arquivo que ela acabou de recusar. */
      if ((erro as Error)?.name === "AbortError") return "cancelado";
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  /* A revogação não pode ser imediata: em Firefox e Safari o clique só começa a
     leitura do blob no próximo tick, e revogar antes disso baixa arquivo
     vazio. */
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
  return "baixado";
}
