/**
 * Entrega de arquivo — e por que o celular tem um caminho próprio.
 *
 * A ARMADILHA: `navigator.share` exige *transient activation*, a permissão que
 * o toque concede e que o Safari do iOS expira em poucos segundos. O PNG do
 * painel leva ~30s para o servidor desenhar, então o desenho "toca → espera o
 * fetch → compartilha" chega à folha de compartilhamento com a ativação já
 * vencida: `NotAllowedError`, e o clique programático de `<a download>` logo
 * depois é recusado pelo mesmo motivo. O celular fica 30 segundos girando e não
 * entrega nada.
 *
 * Por isso o celular NÃO passa por aqui. Ele navega direto para a rota, e o
 * `Content-Disposition: attachment` faz o sistema abrir o download nativo — sem
 * fetch, sem blob, sem Web Share, sem janela de ativação para expirar. Quem
 * decide isso é `suportaEntregaNativa()`, no `onClick` do botão em
 * dashboard-cop.tsx.
 *
 * O que sobra para esta função é o DESKTOP, onde `navigator.share` com arquivo
 * não existe e o `<a download>` com object URL sempre funcionou. Não há
 * tentativa de compartilhar aqui de propósito: nesta ponta ela seria código
 * morto, porque a mesma verificação de capacidade já mandou para a navegação
 * todo navegador capaz de compartilhar arquivo.
 */

export type ResultadoEntrega = "baixado";

/**
 * Verdadeiro onde o sistema entrega o arquivo por conta própria — iOS, Android
 * e o Safari do macOS. Detecção por CAPACIDADE, não por user agent:
 * `canShare({ files })` só responde `true` onde o compartilhamento de arquivo
 * existe de fato, e esse é exatamente o conjunto de plataformas em que a
 * navegação direta é o caminho mais confiável.
 *
 * A sonda é um PNG mínimo em vez do arquivo real porque a decisão precisa
 * acontecer DENTRO do `onClick`, antes de existir qualquer arquivo — esperar o
 * PNG para só então decidir é o próprio defeito que este módulo evita.
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
  nomeArquivo: string
): Promise<ResultadoEntrega> {
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
