/**
 * Estado do formulário de relato de problema do sistema.
 *
 * Mora fora de `actions.ts` pelo mesmo motivo do formulário de lançamento: em
 * módulo `"use server"` TODO export vira referência remota, e uma constante
 * exportada de lá chega ao cliente como referência — o `useActionState` inicia
 * com um estado sem `erros` e a página quebra no SSR. Ver a nota em
 * `app/(public)/cop2026/lancar/estado.ts`, que é a mesma armadilha.
 */

export type RelatoState = {
  ok: boolean;
  protocolo: string | null;
  erros: string[];
  avisos: string[];
  duplicado: boolean;
  /** O aviso automático saiu? `null` quando o canal nem está configurado.
   *  Isto vai para a TELA de propósito: relato gravado com aviso não enviado
   *  é o caso em que o relator precisa comunicar por outro meio — e ele só faz
   *  isso se souber. Alarme que falha calado é o defeito que este formulário
   *  inteiro existe para não repetir. */
  avisoEnviado: boolean | null;
};

export const ESTADO_INICIAL: RelatoState = {
  ok: false,
  protocolo: null,
  erros: [],
  avisos: [],
  duplicado: false,
  avisoEnviado: null,
};
