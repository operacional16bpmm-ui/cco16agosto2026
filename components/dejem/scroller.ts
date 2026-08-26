/**
 * Descobre qual elemento realmente rola a partir de um nó.
 *
 * Por que não fixar em `closest("main")`: no grupo (command) o `<main>` é
 * `overflow-y-auto` e normalmente é ele o scrollport. Mas isso depende de o
 * layout conseguir limitar a altura, o que por sua vez depende de o `<html>`
 * ter altura resolvida. Em situações de layout degenerado — viewport zerado,
 * impressão, um ancestral que perca a restrição de altura — o `<main>` cresce
 * até o conteúdo inteiro e quem passa a rolar é o documento.
 *
 * Assumir o `<main>` nesses casos deixaria a barra de progresso travada em
 * zero e o botão de voltar ao topo invisível para sempre, sem erro nenhum no
 * console. Detectar é barato e elimina a classe inteira de falha.
 */
export type Scroller = { alvo: HTMLElement; ehDocumento: boolean };

export function acharScroller(no: HTMLElement | null): Scroller | null {
  if (!no) return null;

  for (let atual = no.parentElement; atual; atual = atual.parentElement) {
    const overflow = getComputedStyle(atual).overflowY;
    const podeRolar = overflow === "auto" || overflow === "scroll";
    if (podeRolar && atual.scrollHeight > atual.clientHeight + 1) {
      return { alvo: atual, ehDocumento: false };
    }
  }

  const doc = (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
  return { alvo: doc, ehDocumento: true };
}

/** Assina a rolagem no lugar certo: `window` quando quem rola é o documento. */
export function ouvirRolagem(s: Scroller, aoRolar: () => void): () => void {
  const alvo: EventTarget = s.ehDocumento ? window : s.alvo;
  alvo.addEventListener("scroll", aoRolar, { passive: true });
  return () => alvo.removeEventListener("scroll", aoRolar);
}

/** 0 a 100. Devolve 0 quando não há o que rolar, nunca NaN. */
export function progresso(s: Scroller): number {
  const total = s.alvo.scrollHeight - s.alvo.clientHeight;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (s.alvo.scrollTop / total) * 100));
}

/** `root` do IntersectionObserver: precisa ser null quando é o documento. */
export function raizObservador(s: Scroller): Element | null {
  return s.ehDocumento ? null : s.alvo;
}
