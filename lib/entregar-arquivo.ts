/**
 * Entrega de arquivo gerado no navegador — o passo que o iPhone trata
 * diferente de todo mundo.
 *
 * No desktop, `<a download>` com object URL salva na pasta de downloads e
 * acabou. No iOS o mesmo código ABRE a imagem numa aba: o Safari ignora o
 * atributo `download` para blob URL, e o que a pessoa vê é o painel na tela,
 * sem arquivo nenhum salvo. Quem resolve isso é a folha de compartilhamento
 * nativa (`navigator.share` com `files`), que oferece "Salvar em Fotos",
 * "Enviar no WhatsApp" e o resto — e é, na prática, o fluxo que o Comando usa.
 *
 * A escolha é por CAPACIDADE, não por user agent: `canShare({ files })` só
 * responde `true` onde o compartilhamento de arquivo existe de fato.
 */

export type ResultadoEntrega = "compartilhado" | "baixado" | "cancelado";

export async function entregarArquivo(
  blob: Blob,
  nomeArquivo: string,
  compartilhamento?: { title?: string; text?: string }
): Promise<ResultadoEntrega> {
  const arquivo = new File([blob], nomeArquivo, { type: blob.type || "application/octet-stream" });

  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ ...compartilhamento, files: [arquivo] });
      return "compartilhado";
    } catch (erro) {
      /* Fechar a folha de compartilhamento é uma decisão da pessoa, não um
         erro: cair no download aqui baixaria um arquivo que ela acabou de
         recusar. Qualquer outra falha segue para o plano B. */
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
